import { useMemo, useState } from "react";
import { ROLES, type RoleId } from "../roles";
import { getSnapshotScriptRoleIds } from "../scripts";
import type {
  DemonActionEvent,
  DeathEvent,
  GameSnapshot,
  KnownMinion,
  MinionActionEvent,
  MinionState,
} from "../types";
import type { SearchResult } from "../engine/model";
import { useSpyBluffAdvisor } from "../engine/useSpyBluffAdvisor";
import { useReasoning } from "../engine/useReasoning";
import { buildEvilOpponentProjection, type SpyFalseInfoSuggestion } from "../engine/spyBluff";
import { rankCerenovusSuggestions, rankPitHagSuggestions, twinWeakInformation } from "../engine/minionStrategy";
import { exactClaim, seats, setupCounts } from "../engine/game";
import { eventId } from "../storage";
import { person } from "./text";
import { DamselFinder } from "./DamselFinder";

type Props = {
  g: GameSnapshot;
  state: MinionState;
  actions: MinionActionEvent[];
  demonActions: DemonActionEvent[];
  result: SearchResult | null;
  onChange: (state: MinionState) => void;
  onChangeActions: (events: MinionActionEvent[]) => void;
  onChangeDemonActions: (events: DemonActionEvent[]) => void;
  onCreateDeath: (event: DeathEvent) => void;
  onDeleteAction: (id: number) => void;
  onBack: () => void;
};

type BluffStatus =
  | "shared"
  | "spy-safe"
  | "in-play"
  | "opponent"
  | "ally"
  | "unclaimed";

function latestExactClaim(g: GameSnapshot, player: string): RoleId | null {
  return exactClaim(g, player);
}

function roleLabel(roleId: RoleId | null | undefined) {
  if (!roleId) return "未確認";
  const role = ROLES[roleId];
  return `${role.symbol} ${role.name}`;
}

function spyFalseInfoLabel(g: GameSnapshot, info: SpyFalseInfoSuggestion) {
  const who = (player: string) => person(g, player);
  if (info.kind === "noOutsiders") return `${info.when}: アウトサイダーなし`;
  if (info.kind === "number") return `${info.when}: ${info.value ?? "?"}`;
  if (info.kind === "pairYesNo" && info.players?.length === 2) {
    return `${info.when}: ${who(info.players[0])} / ${who(info.players[1])} → ${info.result === "yes" ? "はい" : "いいえ"}`;
  }
  if (info.kind === "pairRole" && info.players?.length === 2 && info.shownRole) {
    return `${info.when}: ${who(info.players[0])} / ${who(info.players[1])} → ${roleLabel(info.shownRole)}`;
  }
  if (info.kind === "roleReveal" && info.players?.length === 1 && info.shownRole) {
    return `${info.when}: ${who(info.players[0])} → ${roleLabel(info.shownRole)}`;
  }
  if (info.kind === "pairNumber" && info.players?.length === 2) {
    return `${info.when}: ${who(info.players[0])} / ${who(info.players[1])} → ${info.value ?? "?"}`;
  }
  return `${info.when}: 偽情報案`;
}

function n1EmpathDemonNeighbourBonus(
  g: GameSnapshot,
  p: string,
  result: SearchResult | null,
  poisonNight: string,
  knownDemon: string | null,
): number {
  if (poisonNight !== "N1" || !knownDemon) return 0;
  if (!getSnapshotScriptRoleIds(g).includes("empath")) return 0;

  const order = seats(g.playerCount);
  const demonIndex = order.indexOf(knownDemon);
  if (demonIndex < 0) return 0;
  const left = order[(demonIndex - 1 + order.length) % order.length];
  const right = order[(demonIndex + 1) % order.length];
  if (p !== left && p !== right) return 0;

  // Poisoner does not know the hidden setup, so this uses only the selected
  // script and the public candidate sample. The bonus is intentionally small.
  const empathPresence = result?.presence.empath ?? 0.5;
  const localEmpathShare = result?.players[p]?.roles.empath ?? 0;
  return 0.4 + 0.35 * empathPresence + 0.5 * localEmpathShare;
}

function poisonScore(
  g: GameSnapshot,
  p: string,
  result: SearchResult | null,
  poisonNight: string,
  knownDemon: string | null,
): number {
  const claim = latestExactClaim(g, p);
  const role = claim ? ROLES[claim] : null;
  let score = 0;
  if (role?.tags.includes("CONTINUOUS_INFO")) score += 5;
  if (role?.tags.includes("HIGH_SURVIVAL_VALUE")) score += 2;
  if (role?.tags.includes("PREVENTS_DEATH") || role?.tags.includes("PREVENTS_EXECUTION_DEATH")) score += 4;
  if (claim === "slayer") score += 4;
  if (claim === "virgin") score += 3;
  if (claim === "soldier") score += 3;
  if (claim === "ravenkeeper") score += 2;
  if (claim === "mayor") score += 3;
  if (role?.tags.includes("FIRST_NIGHT_INFO") && g.night > 1) score -= 2;
  if (role && role.type === "outsider") score -= 1;
  const evil = result?.players[p]?.evil;
  if (evil !== undefined) score += (0.5 - evil) * 2;
  score += n1EmpathDemonNeighbourBonus(g, p, result, poisonNight, knownDemon);
  return score;
}

function poisonReasons(
  g: GameSnapshot,
  p: string,
  result: SearchResult | null,
  poisonNight: string,
  knownDemon: string | null,
): string[] {
  const claim = latestExactClaim(g, p);
  const role = claim ? ROLES[claim] : null;
  const reasons: string[] = [];
  if (role?.tags.includes("CONTINUOUS_INFO")) reasons.push("継続情報を止められる主張");
  if (role?.tags.includes("PREVENTS_DEATH")) reasons.push("死亡防止能力を止められる主張");
  if (role?.tags.includes("PREVENTS_EXECUTION_DEATH")) reasons.push("処刑死防止能力を止められる主張");
  if (claim === "slayer") reasons.push("処刑人の一回能力を失敗させ得る");
  if (claim === "virgin") reasons.push("処女の公開確認を止め得る");
  if (claim === "soldier") reasons.push("兵士の耐性を止め得る");
  if (claim === "ravenkeeper") reasons.push("死亡時情報を無効化できる可能性");
  if (claim === "mayor") reasons.push("市長の能力を止め得る");
  if (result?.players[p]?.evil !== undefined && result.players[p].evil < 0.2) {
    reasons.push("候補盤面では善側寄り");
  }
  if (n1EmpathDemonNeighbourBonus(g, p, result, poisonNight, knownDemon) > 0) {
    reasons.push("N1: 共感者警戒でデーモン隣接を少し優先");
  }
  if (!claim) reasons.push("役職主張未記録");
  return reasons;
}

function phaseNumber(when: string) {
  return Number(when.slice(1));
}

export function MinionModePanel({
  g,
  state,
  actions,
  demonActions,
  result,
  onChange,
  onChangeActions,
  onChangeDemonActions,
  onCreateDeath,
  onDeleteAction,
  onBack,
}: Props) {
  const spyBluffAdvisor = useSpyBluffAdvisor(g, g.selfRole.shownRole === "spy");
  const opponentProjection = useMemo(() => buildEvilOpponentProjection(g, true), [g]);
  const opponentReasoning = useReasoning(opponentProjection, g.selfRole.shownRole === "evil_twin" || g.selfRole.shownRole === "cerenovus");
  const selfRoleId = g.selfRole.shownRole;
  if (!selfRoleId || ROLES[selfRoleId].type !== "minion") {
    return <button className="menu-option" onClick={onBack}>戻る</button>;
  }

  const selfRole = ROLES[selfRoleId];
  const scriptRoles = getSnapshotScriptRoleIds(g).map(id => ROLES[id]);
  const GOOD_ROLES = scriptRoles.filter(role => role.type === "townsfolk" || role.type === "outsider");
  const MINION_ROLES = scriptRoles.filter(role => role.type === "minion");
  const getsStartingInfo = g.playerCount >= 7 && selfRoleId!=='summoner';
  const magicianPossible = scriptRoles.some(role => role.id === "magician");
  const poppyPossible=scriptRoles.some(role=>role.id==="poppy_grower");
  const demonCandidates = state.demonCandidates ?? [];
  const allPlayers = seats(g.playerCount);
  const others = allPlayers.filter((p) => p !== "self");
  const minionCount = setupCounts(g.playerCount).minion + (scriptRoles.some(role=>role.id==='lord_of_typhon')?1:0);
  const fellowMinionCount = Math.max(0, minionCount - 1);
  const knownDemon = state.knownDemon?.playerId ?? null;
  const knownMinionSet = new Set(state.knownMinions.map((m) => m.playerId));
  const knownEvilSet = new Set([
    "self",
    ...(knownDemon ? [knownDemon] : []),
    ...state.knownMinions.map((m) => m.playerId),
  ]);

  const [mezeWord,setMezeWord]=useState('');
  const [mezeTarget,setMezeTarget]=useState('');
  const [mezeDay,setMezeDay]=useState('D1');
  const [mezeTransformed,setMezeTransformed]=useState(true);
  const [psychTarget,setPsychTarget]=useState('');
  const [psychDay,setPsychDay]=useState('D1');
  const [psychKilled,setPsychKilled]=useState(true);
  const [summonTarget,setSummonTarget]=useState('');
  const [summonRole,setSummonRole]=useState<RoleId|null>(null);
  const [summonWhen,setSummonWhen]=useState<'N2'|'N3'>(state.summonedDemon?.when==='N2'?'N2':'N3');
  const [wizardWishText,setWizardWishText]=useState('');
  const [wizardPriceText,setWizardPriceText]=useState('');
  const [wizardClueText,setWizardClueText]=useState('');
  const [wizardGranted,setWizardGranted]=useState(true);
  const [wraithNote,setWraithNote]=useState('');
  const [fearNight,setFearNight]=useState(`N${Math.max(1,g.night)}`);
  const [fearTarget,setFearTarget]=useState<string|null>(null);
  const [harpyNight,setHarpyNight]=useState(`N${Math.max(1,g.night)}`);
  const [harpyTarget,setHarpyTarget]=useState<string|null>(null);
  const [harpyAccuse,setHarpyAccuse]=useState<string|null>(null);
  const [poisonNight, setPoisonNight] = useState(`N${Math.max(1, g.night)}`);
  const [poisonTarget, setPoisonTarget] = useState<string | null>(null);
  const [poisonNote, setPoisonNote] = useState("");
  const [spyNight, setSpyNight] = useState(`N${Math.max(1, g.night)}`);
  const [spyPoisonTarget, setSpyPoisonTarget] = useState<string | null>(null);
  const [spyNote, setSpyNote] = useState("");
  const [pitHagNight, setPitHagNight] = useState(`N${Math.max(2, g.night)}`);
  const [pitHagTarget, setPitHagTarget] = useState<string | null>(null);
  const [pitHagNewRole, setPitHagNewRole] = useState<RoleId | null>(null);
  const [pitHagNote, setPitHagNote] = useState("");
  const [witchNight, setWitchNight] = useState(`N${Math.max(1, g.night)}`);
  const [witchTarget, setWitchTarget] = useState<string | null>(null);
  const [witchNote, setWitchNote] = useState("");
  const [cereNight, setCereNight] = useState(`N${Math.max(1, g.night)}`);
  const [cereTarget, setCereTarget] = useState<string | null>(null);
  const [cereRole, setCereRole] = useState<RoleId | null>(null);
  const [cereNote, setCereNote] = useState("");
  const [twinTarget, setTwinTarget] = useState<string | null>(state.evilTwin?.playerId ?? null);
  const [twinRole, setTwinRole] = useState<RoleId | null>(state.evilTwin?.roleId ?? null);
  const [demonAttackNight, setDemonAttackNight] = useState(`N${Math.max(2, g.night)}`);
  const [demonAttackTarget, setDemonAttackTarget] = useState<string | null>(null);
  const [demonAttackNote, setDemonAttackNote] = useState("");

  const nightOptions = Array.from({ length: g.night }, (_, i) => `N${i + 1}`);
  const minionAbilityNightOptions = nightOptions.filter(
    (phase) => !state.becameDemonAt || phaseNumber(phase) <= phaseNumber(state.becameDemonAt)
  );
  const pitHagNightOptions = minionAbilityNightOptions.filter((phase) => phaseNumber(phase) >= 2);
  const attackNightOptions = Array.from({ length: Math.max(0, g.night - 1) }, (_, i) => `N${i + 2}`);
  const phaseOptions = Array.from({ length: g.night }, (_, i) => [`N${i + 1}`, `D${i + 1}`]).flat();

  function toggleDemonCandidate(playerId: string) {
    const next = demonCandidates.includes(playerId) ? demonCandidates.filter(p=>p!==playerId)
      : demonCandidates.length < 2 && playerId !== "self" && !knownMinionSet.has(playerId) ? [...demonCandidates,playerId] : demonCandidates;
    onChange({...state,demonCandidates:next,knownDemon:state.knownDemon&&next.length===2&&!next.includes(state.knownDemon.playerId)?null:state.knownDemon});
  }
  function setKnownDemon(playerId: string | null) {
    const nextMinions = state.knownMinions.filter((m) => m.playerId !== playerId);
    const bluffPlans = { ...state.bluffPlans };
    if (knownDemon && knownDemon !== playerId && !knownMinionSet.has(knownDemon)) delete bluffPlans[knownDemon];
    onChange({
      ...state,
      knownDemon: playerId
        ? { playerId, source: magicianPossible && demonCandidates.length === 2 ? "confirmed_later" : getsStartingInfo && state.evilTeamIntro!=="blocked" ? "minion_info" : "confirmed_later" }
        : null,
      knownMinions: nextMinions,
      bluffPlans,
    });
  }

  function toggleKnownMinion(playerId: string) {
    if (playerId === knownDemon) return;
    const existing = state.knownMinions.find((m) => m.playerId === playerId);
    if (existing) {
      const bluffPlans = { ...state.bluffPlans };
      delete bluffPlans[playerId];
      onChange({
        ...state,
        knownMinions: state.knownMinions.filter((m) => m.playerId !== playerId),
        bluffPlans,
      });
      return;
    }
    if (state.knownMinions.length >= fellowMinionCount) return;
    const item: KnownMinion = {
      playerId,
      source: getsStartingInfo && state.evilTeamIntro!=="blocked" ? "minion_info" : "confirmed_later",
      roleId: null,
    };
    onChange({ ...state, knownMinions: [...state.knownMinions, item] });
  }

  function setKnownMinionRole(playerId: string, roleId: RoleId | null) {
    onChange({
      ...state,
      knownMinions: state.knownMinions.map((m) =>
        m.playerId === playerId ? { ...m, roleId } : m
      ),
    });
  }

  function toggleSharedBluff(roleId: RoleId) {
    if (!getsStartingInfo) return;
    const current = state.sharedStorytellerBluffs;
    if (current.includes(roleId)) {
      onChange({ ...state, sharedStorytellerBluffs: current.filter((r) => r !== roleId) });
      return;
    }
    if (current.length >= 3) return;
    onChange({ ...state, sharedStorytellerBluffs: [...current, roleId] });
  }

  function setBluffPlan(playerId: string, roleId: RoleId | null) {
    onChange({
      ...state,
      bluffPlans: { ...state.bluffPlans, [playerId]: roleId },
    });
  }

  function setSpyInitialRole(playerId: string, roleId: RoleId | null) {
    const next = { ...state.spyInitialRoles };
    if (roleId) next[playerId] = roleId;
    else delete next[playerId];
    if (playerId === "self") next.self = "spy";
    onChange({ ...state, spyInitialRoles: next });
  }

  function savePoison() {
    if (!poisonTarget || !minionAbilityNightOptions.includes(poisonNight)) return;
    const old = actions.find((a) => a.roleId === "poisoner" && a.when === poisonNight);
    if (old && !window.confirm(`${poisonNight}の毒対象は既に記録されています。置き換えますか？`)) return;
    const next: MinionActionEvent = {
      id: eventId(),
      roleId: "poisoner",
      kind: "poison",
      when: poisonNight,
      target: poisonTarget,
      note: poisonNote.trim() || null,
    };
    onChangeActions([
      ...actions.filter((a) => !(a.roleId === "poisoner" && a.when === poisonNight)),
      next,
    ]);
    setPoisonTarget(null);
    setPoisonNote("");
  }

  function saveSpyNight() {
    if (!minionAbilityNightOptions.includes(spyNight)) return;
    const old = actions.find((a) => a.roleId === "spy" && a.when === spyNight);
    if (old && !window.confirm(`${spyNight}のグリモア記録は既にあります。置き換えますか？`)) return;
    const next: MinionActionEvent = {
      id: eventId(),
      roleId: "spy",
      kind: "grimoire",
      when: spyNight,
      poisonTarget: spyPoisonTarget,
      note: spyNote.trim() || null,
    };
    onChangeActions([
      ...actions.filter((a) => !(a.roleId === "spy" && a.when === spyNight)),
      next,
    ]);
    setSpyPoisonTarget(null);
    setSpyNote("");
  }

  function savePitHag() {
    if (!pitHagTarget || !pitHagNewRole || !pitHagNightOptions.includes(pitHagNight)) return;
    const old = actions.find((a) => a.roleId === "pit_hag" && a.when === pitHagNight);
    if (old && !window.confirm(`${pitHagNight}の変身先は既に記録されています。置き換えますか？`)) return;
    const next: MinionActionEvent = {
      id: eventId(),
      roleId: "pit_hag",
      kind: "transform",
      when: pitHagNight,
      target: pitHagTarget,
      newRole: pitHagNewRole,
      note: pitHagNote.trim() || null,
    };
    onChangeActions([
      ...actions.filter((a) => !(a.roleId === "pit_hag" && a.when === pitHagNight)),
      next,
    ]);
    setPitHagTarget(null);
    setPitHagNewRole(null);
    setPitHagNote("");
  }

  function saveTwin() {
    if (!twinTarget || !twinRole) return;
    onChange({ ...state, evilTwin: { playerId: twinTarget, roleId: twinRole } });
  }

  function saveFearmonger(){
    if(!fearTarget||!minionAbilityNightOptions.includes(fearNight))return;
    const old=actions.find(a=>a.roleId==='fearmonger'&&a.when===fearNight);
    if(old&&!window.confirm(`${fearNight}の標的を上書きしますか？`))return;
    onChangeActions([...actions.filter(a=>!(a.roleId==='fearmonger'&&a.when===fearNight)),{id:eventId(),roleId:'fearmonger',kind:'choose',when:fearNight,target:fearTarget,note:null}]);
  }
  function saveHarpy(){
    if(!harpyTarget||!harpyAccuse||harpyTarget===harpyAccuse||!minionAbilityNightOptions.includes(harpyNight))return;
    const old=actions.find(a=>a.roleId==='harpy'&&a.when===harpyNight);
    if(old&&!window.confirm(`${harpyNight}の指定を上書きしますか？`))return;
    onChangeActions([...actions.filter(a=>!(a.roleId==='harpy'&&a.when===harpyNight)),{id:eventId(),roleId:'harpy',kind:'madness_pair',when:harpyNight,target:harpyTarget,accuse:harpyAccuse,note:null}]);
  }
  function saveWitch() {
    if (!witchTarget || !minionAbilityNightOptions.includes(witchNight)) return;
    const old = actions.find((a) => a.roleId === "witch" && a.when === witchNight);
    if (old && !window.confirm(`${witchNight}の呪いは既に記録されています。置き換えますか？`)) return;
    const next: MinionActionEvent = {
      id: eventId(), roleId: "witch", kind: "curse", when: witchNight, target: witchTarget, triggered: null, note: witchNote.trim() || null,
    };
    onChangeActions([...actions.filter((a) => !(a.roleId === "witch" && a.when === witchNight)), next]);
    setWitchTarget(null); setWitchNote("");
  }

  function resolveWitch(action: Extract<MinionActionEvent, { roleId: "witch" }>, triggered: boolean) {
    onChangeActions(actions.map((a) => a.id === action.id && a.roleId === "witch" ? { ...a, triggered } : a));
    if (triggered) {
      const day = `D${phaseNumber(action.when)}`;
      const existing = g.deathLog.some((d) => d.when === day && d.playerId === action.target && d.sourceRoleId === "witch");
      if (!existing && g.playerStatus[action.target]?.alive !== false) {
        onCreateDeath({
          id: eventId(), playerId: action.target, when: day, reason: "ability", sourceRoleId: "witch", sourcePlayerId: "self", sourceEventId: action.id,
        });
      }
    }
  }

  function saveCerenovus() {
    if (!cereTarget || !cereRole || !minionAbilityNightOptions.includes(cereNight)) return;
    const old = actions.find((a) => a.roleId === "cerenovus" && a.when === cereNight);
    if (old && !window.confirm(`${cereNight}の狂気指定は既に記録されています。置き換えますか？`)) return;
    const next: MinionActionEvent = {
      id: eventId(), roleId: "cerenovus", kind: "madness", when: cereNight, target: cereTarget, madRole: cereRole, note: cereNote.trim() || null,
    };
    onChangeActions([...actions.filter((a) => !(a.roleId === "cerenovus" && a.when === cereNight)), next]);
    setCereTarget(null); setCereRole(null); setCereNote("");
  }

  function recordCerenovusExecution(action: Extract<MinionActionEvent, { roleId: "cerenovus" }>) {
    const day = `D${phaseNumber(action.when)}`;
    if (g.deathLog.some((d) => d.when === day && d.playerId === action.target && d.sourceRoleId === "cerenovus")) return;
    if (g.playerStatus[action.target]?.alive === false) return;
    onCreateDeath({
      id: eventId(), playerId: action.target, when: day, reason: "ability", isExecution: true, sourceRoleId: "cerenovus", sourcePlayerId: "self", sourceEventId: action.id,
    });
  }

  function undoLatestPitHag() {
    const latest = actions
      .filter((a): a is Extract<MinionActionEvent, { roleId: "pit_hag" }> => a.roleId === "pit_hag")
      .sort((a, b) => phaseNumber(b.when) - phaseNumber(a.when) || b.id - a.id)[0];
    if (!latest) return;
    if (window.confirm(`${latest.when}の変身記録を取り消しますか？`)) {
      onChangeActions(actions.filter((a) => a.id !== latest.id));
    }
  }

  function saveDemonAttack() {
    if (!demonAttackTarget || !attackNightOptions.includes(demonAttackNight)) return;
    const transition = state.becameDemonAt;
    // A Minion that becomes the Imp does not immediately act again in the same
    // night. Its first normal Demon attack is on the following night.
    if (!transition || phaseNumber(demonAttackNight) <= phaseNumber(transition)) return;
    const old = demonActions.find((a) => a.when === demonAttackNight);
    if (old && !window.confirm(`${demonAttackNight}の襲撃は既に記録されています。置き換えますか？`)) return;
    const next: DemonActionEvent = {
      id: eventId(),
      roleId: "imp",
      when: demonAttackNight,
      target: demonAttackTarget,
      note: demonAttackNote.trim() || null,
    };
    onChangeDemonActions([...demonActions.filter((a) => a.when !== demonAttackNight), next]);
    setDemonAttackTarget(null);
    setDemonAttackNote("");
  }

  function opponentClaimersFor(roleId: RoleId) {
    return others.filter((p) => !knownEvilSet.has(p) && latestExactClaim(g, p) === roleId);
  }

  const teamMembers = [
    "self",
    ...(knownDemon ? [knownDemon] : []),
    ...state.knownMinions.map((m) => m.playerId),
  ];
  const teamPlanUsers = new Map<RoleId, string[]>();
  for (const [player, role] of Object.entries(state.bluffPlans)) {
    if (!role) continue;
    const list = teamPlanUsers.get(role) ?? [];
    list.push(player);
    teamPlanUsers.set(role, list);
  }

  const spyEnteredRoles = {
    ...(selfRoleId === "spy" ? { self: "spy" as RoleId } : {}),
    ...Object.fromEntries(Object.entries(state.spyInitialRoles).filter(([, role]) => !!role)),
  } as Record<string, RoleId>;
  const spySetupComplete = selfRoleId === "spy" && Object.keys(spyEnteredRoles).length === g.playerCount;
  const spyInPlay = new Set(Object.values(spyEnteredRoles));

  const bluffRows = GOOD_ROLES.map((role) => {
    const claimers = opponentClaimersFor(role.id);
    const allyUsers = teamPlanUsers.get(role.id) ?? [];
    let status: BluffStatus = "unclaimed";
    if (state.sharedStorytellerBluffs.includes(role.id)) status = "shared";
    else if (selfRoleId === "spy" && spyInPlay.has(role.id)) status = "in-play";
    else if (selfRoleId === "spy" && spySetupComplete && !spyInPlay.has(role.id)) status = "spy-safe";
    else if (claimers.length) status = "opponent";
    else if (allyUsers.length) status = "ally";
    return { role, status, claimers, allyUsers };
  }).sort((a, b) => {
    const order: Record<BluffStatus, number> = {
      shared: 0,
      "spy-safe": 1,
      unclaimed: 2,
      ally: 3,
      opponent: 4,
      "in-play": 5,
    };
    return order[a.status] - order[b.status] || a.role.name.localeCompare(b.role.name, "ja");
  });

  const poisonSuggestions = useMemo(() => {
    if (selfRoleId !== "poisoner") return [];
    return others
      .filter((p) => !knownEvilSet.has(p) && g.playerStatus[p]?.alive !== false)
      .map((player) => ({
        player,
        score: poisonScore(g, player, result, poisonNight, knownDemon),
        reasons: poisonReasons(g, player, result, poisonNight, knownDemon),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [g, result, selfRoleId, state.knownDemon, state.knownMinions, poisonNight]);

  const poisonHint = (() => {
    if (!poisonTarget) return null;
    if (poisonTarget === "self") return "自分を選ぶ特殊ケースです。現在の推理エンジンでは有効な毒対象なしとして扱います。";
    if (poisonTarget === knownDemon) return "デーモンを毒にすると、その夜のデーモン能力が働かない可能性があります。味方と必ず連携してください。";
    if (knownMinionSet.has(poisonTarget)) return "味方の手下を毒にします。緋色の女などの能力も止まり得るため、作戦目的を確認してください。";
    const claim = latestExactClaim(g, poisonTarget);
    if (claim === "soldier") return "兵士が本物なら、その夜のデーモン襲撃への耐性を止められます。";
    if (claim === "monk") return "僧侶が本物なら、その夜の防御能力を止められます。";
    if (claim === "slayer") return "処刑人が本物なら、翌日の一回能力を失敗させ得ます。";
    if (claim === "virgin") return "処女が本物なら、翌日の最初の指名による公開確認を止め得ます。";
    if (claim === "ravenkeeper") return "鴉飼いが今夜死亡した場合、その情報能力を無効化できます。";
    if (claim === "mayor") return "市長が本物なら、襲撃転送や最終3人の能力を止め得ます。";
    return null;
  })();

  const cerenovusSuggestions = useMemo(
    () => selfRoleId === "cerenovus" ? rankCerenovusSuggestions(g, result, opponentReasoning.result) : [],
    [g, result, selfRoleId, opponentReasoning.result],
  );
  const pitHagSuggestions = useMemo(
    () => selfRoleId === "pit_hag" ? rankPitHagSuggestions(g, result) : [],
    [g, result, selfRoleId],
  );
  const twinPressure = useMemo(() => {
    const twin = state.evilTwin?.playerId;
    if (selfRoleId !== "evil_twin" || !twin) return [];
    return twinWeakInformation(g, opponentReasoning.result, twin);
  }, [g, opponentReasoning.result, selfRoleId, state.evilTwin]);
  const witchNominationHistory = useMemo(() => others.map((player) => {
    const events = g.nominationLog.filter((n) => n.nominator === player).sort((a,b) => b.id-a.id);
    return { player, count: events.length, last: events[0]?.when ?? null };
  }).sort((a,b) => b.count-a.count || (a.player > b.player ? 1 : -1)), [g.nominationLog, g.playerCount]);

  const adjusted = setupCounts(g.playerCount, selfRoleId === "baron");
  const base = setupCounts(g.playerCount, false);
  const outsiderClaimers = others.filter((p) => {
    const role = latestExactClaim(g, p);
    return role ? ROLES[role].type === "outsider" : false;
  });

  const currentDemonShare = result?.players.self?.demon;

  const spyBestFalseInfoCandidate = (() => {
    const advisor = spyBluffAdvisor.result;
    if (!advisor) return undefined;
    return advisor.candidates
      .filter((candidate) => !!candidate.falseInfo)
      .sort((a, b) => (b.falseInfo?.strategyScore ?? 0) - (a.falseInfo?.strategyScore ?? 0))[0];
  })();

  const spyBluffDisplay = (() => {
    const advisor = spyBluffAdvisor.result;
    if (!advisor) return [];
    const preferred = advisor.recommendedRoleId
      ? advisor.candidates.find((candidate) => candidate.roleId === advisor.recommendedRoleId)
      : undefined;
    const pinned = [preferred, spyBestFalseInfoCandidate].filter((candidate): candidate is NonNullable<typeof candidate> => !!candidate);
    return [
      ...pinned,
      ...advisor.candidates.filter((candidate) => !pinned.some((item) => item.roleId === candidate.roleId)),
    ].slice(0, 6);
  })();

  return (
    <>
      <h2>手下モード</h2>
      <DamselFinder g={g} result={result} viewer="minion"/>
      <div className="evil-mode-banner minion-mode-banner">
        <strong>{selfRole.symbol} {selfRole.name}</strong>
        <span>悪チーム情報・ブラフ・役職固有能力を記録</span>
      </div>

      {selfRoleId==='mezepheles' && <section className="evil-section">
       <h3>メゼフェレス — 秘密の言葉</h3>
       <p className="panel-note">善プレイヤーが秘密の言葉を発言すると次の夜に悪へ変化します。能力を使った扱いは一度だけです。毒・酔いで失敗した場合も消費するので、結果を正確に記録してください。</p>
       <label>発言した日</label><select value={mezeDay} onChange={e=>setMezeDay(e.target.value)}>{Array.from({length:g.night},(_,i)=>`D${i+1}`).map(t=><option key={t} value={t}>{t}</option>)}</select>
       <label>秘密の言葉</label><input value={mezeWord} onChange={e=>setMezeWord(e.target.value)} placeholder="受け取った言葉"/>
       <label>言葉を言った人</label><select value={mezeTarget} onChange={e=>setMezeTarget(e.target.value)}><option value="">選択</option>{others.map(p=><option key={p} value={p}>{person(g,p)}</option>)}</select>
       <label className="check-label"><input type="checkbox" checked={mezeTransformed} onChange={e=>setMezeTransformed(e.target.checked)}/>次の夜に悪へ変化した</label>
       <button className="menu-option" disabled={!mezeWord.trim()||!mezeTarget||actions.some(a=>a.roleId==='mezepheles')} onClick={()=>onChangeActions([...actions,{id:eventId(),roleId:'mezepheles',kind:'secret_word',when:mezeDay,target:mezeTarget,word:mezeWord.trim(),transformed:mezeTransformed}])}>発言と変化を記録</button>
       {actions.filter((a):a is Extract<MinionActionEvent,{roleId:'mezepheles'}>=>a.roleId==='mezepheles').map(a=><p key={a.id}>{a.when}：{person(g,a.target)} / {a.transformed?'悪へ変化':'変化なし'} <button className="mini-danger-button" onClick={()=>onDeleteAction(a.id)}>削除</button></p>)}
      </section>}
      {selfRoleId==='organ_grinder' && <section className="evil-section">
       <h3>オルガングラインダー — 投票と自分の酔い</h3>
       <p className="panel-note">目を閉じた投票が基本です。夜に自身を酔わせた場合は翌日の投票が普通に行われます。投票者情報がないときは無理に推定しないでください。</p>
       {nightOptions.map(when=><label className="check-label" key={when}><input type="checkbox" checked={(state.organGrinderDrunkNights??[]).includes(when)} onChange={e=>onChange({...state,organGrinderDrunkNights:e.target.checked?[...(state.organGrinderDrunkNights??[]),when]:(state.organGrinderDrunkNights??[]).filter(x=>x!==when)})}/>{when}：自分を酔わせた（翌日を公開投票にする）</label>)}
      </section>}
      {selfRoleId==='psychopath' && <section className="evil-section">
       <h3>サイコパス — 指名前の公開殺害</h3>
       <p className="panel-note">毎日、指名が始まる前に公開で対象を選ぶ能力です。最初の日に名乗らなくても使用はできます。処刑されると指名者とジャンケンし、負けた場合だけ死亡します。</p>
       <label>日</label><select value={psychDay} onChange={e=>setPsychDay(e.target.value)}>{Array.from({length:g.night},(_,i)=>`D${i+1}`).map(t=><option key={t} value={t}>{t}</option>)}</select>
       <label>対象</label><select value={psychTarget} onChange={e=>setPsychTarget(e.target.value)}><option value="">選択</option>{others.map(p=><option key={p} value={p}>{person(g,p)}</option>)}</select>
       <label className="check-label"><input type="checkbox" checked={psychKilled} onChange={e=>setPsychKilled(e.target.checked)}/>対象が死亡した</label>
       <button className="menu-option" disabled={!psychTarget||actions.some(a=>a.roleId==='psychopath'&&a.when===psychDay)} onClick={()=>{
        const id=eventId();onChangeActions([...actions,{id,roleId:'psychopath',kind:'public_kill',when:psychDay,target:psychTarget,killed:psychKilled}]);
        if(psychKilled)onCreateDeath({id:id+1,playerId:psychTarget,when:psychDay,reason:'psychopath',sourceRoleId:'psychopath',sourcePlayerId:'self',sourceEventId:id});
       }}>公開殺害を記録</button>
       {actions.filter((a):a is Extract<MinionActionEvent,{roleId:'psychopath'}>=>a.roleId==='psychopath').map(a=><p key={a.id}>{a.when}：{person(g,a.target)} / {a.killed?'死亡':'生存'} <button className="mini-danger-button" onClick={()=>onDeleteAction(a.id)}>関連記録を削除</button></p>)}
      </section>}
      {selfRoleId==='summoner' && <section className="evil-section">
       <h3>召喚者 — デーモンを創造</h3>
       <p className="panel-note">通常はN3にデーモンを創造します。プッカがスクリプトにいる場合、ジンクスによりN2にプッカを創造することもできます。既に使用した場合はもう一度創造しません。</p>
       {g.night<2?<p>まだN2になっていません。</p>:<>
        <label>召喚の夜</label><select value={summonWhen} onChange={e=>{const when=e.target.value==='N2'?'N2':'N3';setSummonWhen(when);if(when==='N2')setSummonRole('pukka');}}>
         {getSnapshotScriptRoleIds(g).includes('pukka')&&<option value="N2">N2：プッカだけ</option>}
         <option value="N3">N3：通常の召喚</option>
        </select>
        <label>新しいデーモン役職</label><select value={summonRole??''} onChange={e=>setSummonRole(e.target.value?e.target.value as RoleId:null)}><option value="">選択</option>{scriptRoles.filter(r=>r.type==='demon'&&(summonWhen==='N3'||r.id==='pukka')).map(r=><option key={r.id} value={r.id}>{r.symbol} {r.name}</option>)}</select>
        <label>新しいデーモンになる人</label><select value={summonTarget} onChange={e=>setSummonTarget(e.target.value)}><option value="">選択</option>{allPlayers.map(p=><option key={p} value={p}>{person(g,p)}</option>)}</select>
        <button className="menu-option" disabled={!summonTarget||!summonRole||g.night<Number(summonWhen.slice(1))||(summonWhen==='N2'&&summonRole!=='pukka')} onClick={()=>{if(summonRole)onChange({...state,summonedDemon:{when:summonWhen,playerId:summonTarget,demonRole:summonRole}});}}>{summonWhen}のデーモンを確定記録</button>
        {state.summonedDemon&&<p>記録：{state.summonedDemon.when} {person(g,state.summonedDemon.playerId)} → {roleLabel(state.summonedDemon.demonRole)} <button className="mini-danger-button" onClick={()=>onChange({...state,summonedDemon:null})}>削除</button></p>}
       </>}
      </section>}
      {selfRoleId==='widow' && <section className="evil-section">
       <h3>ウィドウ — 初夜の毒</h3>
       <p className="panel-note">初夜に魔導書を見て1人を毒にします。ウィドウの能力が有効な間、毒が続きます。1人の善プレイヤーにウィドウの存在が知らされます。</p>
       <select value={state.widowPoisonedPlayer??''} onChange={e=>onChange({...state,widowPoisonedPlayer:e.target.value||null})}><option value="">毒にした人を記録</option>{allPlayers.map(p=><option key={p} value={p}>{person(g,p)}</option>)}</select>
      </section>}
      {selfRoleId==='wizard' && <section className="evil-section">
       <h3>ウィザード — 願い（自由記録）</h3>
       <p className="panel-note">願いとその代償はストーリーテラーが判断します。アプリでは勝手にルールを生成せず、事実と代償を残すだけです。</p>
       <textarea rows={2} value={wizardWishText} placeholder="願い" onChange={e=>setWizardWishText(e.target.value)}/>
       <label className="check-label"><input type="checkbox" checked={wizardGranted} onChange={e=>setWizardGranted(e.target.checked)}/>認められた</label>
       <textarea rows={2} value={wizardPriceText} placeholder="代償・制約" onChange={e=>setWizardPriceText(e.target.value)}/>
       <textarea rows={2} value={wizardClueText} placeholder="公開の兆候や補足" onChange={e=>setWizardClueText(e.target.value)}/>
       <button className="menu-option" disabled={!wizardWishText.trim()} onClick={()=>onChange({...state,wizardWish:{when:`D${g.night}`,wish:wizardWishText.trim(),granted:wizardGranted,price:wizardPriceText,clue:wizardClueText}})}>願いを記録</button>
       {state.wizardWish&&<p>記録：{state.wizardWish.wish} / {state.wizardWish.granted?'承認':'未承認'} / {state.wizardWish.price} <button className="mini-danger-button" onClick={()=>onChange({...state,wizardWish:null})}>削除</button></p>}
      </section>}
      {selfRoleId==='wraith' && <section className="evil-section">
       <h3>レイス — 夜の観察</h3>
       <p className="panel-note">夜に目を開け、他の悪チームが起きる様子を見ることができます。実際に観察したことだけメモしてください。</p>
       <textarea rows={2} value={wraithNote} placeholder="見えたこと" onChange={e=>setWraithNote(e.target.value)}/>
       <button className="menu-option" disabled={!wraithNote.trim()} onClick={()=>{onChange({...state,wraithNotes:[...(state.wraithNotes??[]),{when:`N${g.night}`,note:wraithNote.trim()}]});setWraithNote('');}}>夜の観察を記録</button>
       {(state.wraithNotes??[]).map((entry,i)=><p key={i}>{entry.when}：{entry.note} <button className="mini-danger-button" onClick={()=>onChange({...state,wraithNotes:(state.wraithNotes??[]).filter((_,j)=>i!==j)})}>削除</button></p>)}
      </section>}
      {selfRoleId==='xaan'&&<section className="evil-section"><h3>ザーン — 夜Xと昼X</h3><p className="panel-note">Xはゲーム開始時のアウトサイダー人数。N{''}XからD{''}Xの終わりまで町人全員が毒になります。X=0 の場合は発動しません。ストーリーテラーがアウトサイダー人数を変える場合があります。</p></section>}
      {scriptRoles.some(role=>role.id==='snitch') && <section className="evil-section">
        <h3>密告者 — 初夜の不在役職3つ</h3>
        <p className="panel-note">密告者がいる場合、各手下はゲームに存在しない役職3つを教えられます。実際に語り手から聞いた役職だけ選択してください。</p>
        <div className="claim-option-grid">
         {GOOD_ROLES.map(role=><button type="button" key={role.id} className={(state.snitchBluffs??[]).includes(role.id)?'claim-option selected':'claim-option'} disabled={!(state.snitchBluffs??[]).includes(role.id)&&(state.snitchBluffs??[]).length>=3} onClick={()=>onChange({...state,snitchBluffs:(state.snitchBluffs??[]).includes(role.id)?(state.snitchBluffs??[]).filter(r=>r!==role.id):[...(state.snitchBluffs??[]),role.id]})}>{role.symbol} {role.name}</button>)}
        </div>
        <p>保存済み：{(state.snitchBluffs??[]).length}/3</p>
      </section>}
      <section className="evil-section">
        <h3>悪チーム</h3>
        {poppyPossible && (
          <div className="form-section">
            <label>ケシ栽培者による悪陣営の紹介状況</label>
            <select value={state.evilTeamIntro??""} onChange={e=>onChange({...state,evilTeamIntro:e.target.value?(e.target.value as "shown"|"blocked"):undefined,evilTeamLearnedWhen:null})}>
              <option value="">不明・記録なし</option>
              <option value="shown">初夜に紹介された</option>
              <option value="blocked">初夜に紹介されなかった</option>
            </select>
            {state.evilTeamIntro==="blocked" && <>
              <label>その後に悪陣営を知らされた夜（任意）</label>
              <select value={state.evilTeamLearnedWhen??""} onChange={e=>onChange({...state,evilTeamLearnedWhen:e.target.value||null})}>
                <option value="">まだ知らされていない・不明</option>
                {Array.from({length:g.night},(_,i)=>`N${i+1}`).filter(phase=>phase!=="N1").map(phase=><option key={phase} value={phase}>{phase}</option>)}
              </select>
              <p className="panel-note">生存中のケシ栽培者が悪陣営の紹介を妨げます。健康なケシ栽培者が死亡すると、その夜（昼死亡なら次の夜）に紹介されます。後から確認した味方は必ず後日確認として登録してください。</p>
            </>}
          </div>
        )}

        {getsStartingInfo ? (
          <p className="panel-note">
            7人以上では、初夜に手下はデーモンと他の手下のプレイヤーを知ります。手下同士の正確な役職は初夜情報では分かりません。
          </p>
        ) : (
          <p className="panel-note">
            通常は5〜6人では初夜の悪陣営紹介はありません。召喚者ゲームでは人数を問わず開始時にデーモンが存在しません。後から確認できた相手だけ登録してください。
          </p>
        )}

        {magicianPossible && getsStartingInfo && (
          <>
            <div className="claim-option-title">初夜にデーモンとして示された人（魔術師がいる場合は2人）</div>
            <div className="player-toggle-grid">
              {others.map(player=><button type="button" key={player} disabled={knownMinionSet.has(player) || (!demonCandidates.includes(player) && demonCandidates.length>=2)} className={demonCandidates.includes(player)?"player-toggle selected demon-known-selected":"player-toggle"} onClick={()=>toggleDemonCandidate(player)}>{person(g,player)}</button>)}
            </div>
            <p className="panel-note">2人示された場合、片方が本当のデーモン、片方が善陣営の魔術師です。判明するまではどちらもデーモンに固定しません。</p>
          </>
        )}
        <div className="claim-option-title">{magicianPossible && demonCandidates.length===2 ? "後から確定した本当のデーモン（任意）" : "デーモン"}</div>
        <div className="player-toggle-grid">
          {others.map((player) => (
            <button
              key={player}
              type="button"
              disabled={knownMinionSet.has(player) || (demonCandidates.length===2 && !demonCandidates.includes(player))}
              className={knownDemon === player ? "player-toggle selected demon-known-selected" : "player-toggle"}
              onClick={() => setKnownDemon(knownDemon === player ? null : player)}
            >
              {person(g, player)}
            </button>
          ))}
        </div>
        <p className="panel-note">
          {knownDemon
            ? `${person(g, knownDemon)} をデーモンとして固定します。`
            : demonCandidates.length===2
              ? "初夜に示された2人から推理だけで実際のデーモンを決めないでください。"
            : getsStartingInfo
              ? "初夜に示されたデーモンを選択してください。"
              : "未確認でも問題ありません。"}
        </p>

        {fellowMinionCount > 0 && (
          <>
            <div className="claim-option-title">他の手下 {state.knownMinions.length}/{fellowMinionCount}{scriptRoles.some(role=>role.id==='lord_of_typhon')?'（タイフォン卿の場合 +1 人）':''}</div>
            <div className="player-toggle-grid">
              {others.map((player) => (
                <button
                  key={player}
                  type="button"
                  disabled={player === knownDemon || demonCandidates.includes(player)}
                  className={knownMinionSet.has(player) ? "player-toggle selected evil-selected" : "player-toggle"}
                  onClick={() => toggleKnownMinion(player)}
                >
                  {person(g, player)}
                </button>
              ))}
            </div>
          </>
        )}

        {state.knownMinions.length > 0 && (
          <div className="evil-team-list">
            {state.knownMinions.map((m) => (
              <div key={m.playerId} className="evil-team-row">
                <strong>{person(g, m.playerId)}</strong>
                <span>{latestExactClaim(g, m.playerId) ? `現在の主張: ${roleLabel(latestExactClaim(g, m.playerId))}` : "現在の主張: 未記録"}</span>
                <small>{m.source === "minion_info" ? "初夜の手下情報" : "後から味方と確認"}</small>
                <label className="evil-team-role-label">
                  実役職を後から確認した場合
                  <select
                    value={m.roleId ?? ""}
                    onChange={(e) => setKnownMinionRole(m.playerId, e.target.value ? (e.target.value as RoleId) : null)}
                  >
                    <option value="">未確認</option>
                    {MINION_ROLES.map((role) => {
                      const used = role.id === selfRoleId || state.knownMinions.some((x) => x.playerId !== m.playerId && x.roleId === role.id);
                      return (
                        <option key={role.id} value={role.id} disabled={used}>
                          {role.symbol} {role.name}{used ? " — 使用済み" : ""}
                        </option>
                      );
                    })}
                  </select>
                </label>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="evil-section">
        <h3>デーモンから共有されたストーリーテラーのブラフ</h3>
        {getsStartingInfo ? (
          <>
            <p className="panel-note">
              デーモンがStorytellerから受け取った3つの不在役職を共有してくれた場合だけ登録します。登録した役職は候補盤面から除外します。 {state.sharedStorytellerBluffs.length}/3
            </p>
            <div className="role-grid">
              {GOOD_ROLES.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  className={state.sharedStorytellerBluffs.includes(role.id) ? "role-choice role-choice-selected evil-role-selected" : "role-choice"}
                  onClick={() => toggleSharedBluff(role.id)}
                >
                  <span className="role-choice-symbol">{role.symbol}</span>
                  <span className="role-choice-name">{role.name}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="panel-note">5〜6人では通常の開始時ストーリーテラーのブラフはありません。</p>
        )}
      </section>

      <section className="evil-section">
        <h3>味方のブラフ計画</h3>
        <p className="panel-note">作戦メモです。候補盤面の真偽には使いません。</p>
        {teamMembers.map((player) => (
          <div className="evil-plan-row" key={player}>
            <label>{person(g, player)}</label>
            <select
              value={state.bluffPlans[player] ?? ""}
              onChange={(e) => setBluffPlan(player, e.target.value ? (e.target.value as RoleId) : null)}
            >
              <option value="">未設定</option>
              {GOOD_ROLES.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.symbol} {role.name}
                  {state.sharedStorytellerBluffs.includes(role.id)
                    ? " — 共有ブラフで不在確認"
                    : selfRoleId === "spy" && spySetupComplete && !spyInPlay.has(role.id)
                      ? " — 密偵表示で不在"
                      : opponentClaimersFor(role.id).length
                        ? " — 相手主張"
                        : ""}
                </option>
              ))}
            </select>
          </div>
        ))}
      </section>

      <section className="evil-section">
        <h3>ブラフ候補 / 相手の主張</h3>
        <p className="panel-note">
          共有ブラフで不在確認は本当に不在と分かる役職です。全グリモア入力時の「密偵表示で不在」は密が健康なら強い情報ですが、自分が毒なら誤表示の可能性があります。未主張は安全確定ではありません。
        </p>
        <div className="bluff-board">
          {bluffRows.map(({ role, status, claimers, allyUsers }) => (
            <div className={`bluff-row bluff-${status}`} key={role.id}>
              <span className="bluff-role"><strong>{role.symbol}</strong> {role.name}</span>
              <span className="bluff-status">
                {status === "shared" && "共有ブラフで不在確認"}
                {status === "spy-safe" && "密偵表示で不在"}
                {status === "in-play" && "密偵表示：実在"}
                {status === "unclaimed" && "未主張 / 不明"}
                {claimers.length > 0 && `${status === "shared" || status === "spy-safe" ? " / " : ""}相手主張: ${claimers.map((p) => person(g, p)).join(" / ")}`}
                {allyUsers.length > 0 && `${status !== "unclaimed" || claimers.length > 0 ? " / " : ""}味方使用: ${allyUsers.map((p) => person(g, p)).join(" / ")}`}
              </span>
            </div>
          ))}
        </div>
      </section>

      {selfRoleId === "evil_twin" && (
        <section className="evil-section">
          <h3>悪の双子 — 相方を潰す</h3>
          <p className="panel-note">
            初夜に知った善の双子と、その実役職を直接記録します。この情報は候補盤面の強い制約ですが、下の攻撃案は町視点の候補盤面だけで評価します。
          </p>
          <div className="claim-option-title">善の双子</div>
          <div className="player-toggle-grid">
            {others.map((player) => (
              <button key={player} type="button" className={twinTarget === player ? "player-toggle selected evil-selected" : "player-toggle"}
                disabled={knownEvilSet.has(player)} onClick={() => setTwinTarget(twinTarget === player ? null : player)}>
                {person(g, player)}
              </button>
            ))}
          </div>
          <div className="form-section">
            <label>相方の実役職</label>
            <select value={twinRole ?? ""} onChange={(e) => setTwinRole(e.target.value ? e.target.value as RoleId : null)}>
              <option value="">選択してください</option>
              {GOOD_ROLES.map((role) => <option key={role.id} value={role.id}>{role.symbol} {role.name}</option>)}
            </select>
          </div>
          <button className="menu-option confirm-claim-button evil-confirm" disabled={!twinTarget || !twinRole} onClick={saveTwin}>双子情報を保存</button>

          {state.evilTwin && (
            <div className="target-suggestions">
              <h4>{person(g, state.evilTwin.playerId)} を処刑候補にする</h4>
              <p className="panel-note">
                町視点でこの席が悪に見える割合: <strong>{opponentReasoning.result ? `${Math.round((opponentReasoning.result.players[state.evilTwin.playerId]?.evil ?? 0) * 100)}%` : opponentReasoning.status === "running" ? "計算中…" : "—"}</strong>
              </p>
              <button className="target-suggestion" type="button" onClick={() => setBluffPlan("self", state.evilTwin!.roleId)}>
                <strong>同じ役職をブラフする — {roleLabel(state.evilTwin.roleId)}</strong>
                <span>相方の本物情報を利用して、二者択一を強制する。善の双子が処刑されれば即勝利。</span>
              </button>
              {twinPressure.slice(0, 5).map(({ event, suspicious, supported }) => (
                <div className="target-suggestion" key={event.id}>
                  <strong>{event.when} {roleLabel(event.roleId)} 情報 #{event.id}</strong>
                  <span>町視点で嘘/ブラフ説明 {Math.round(suspicious * 100)}% / 能力が通る説明 {Math.round(supported * 100)}%</span>
                </div>
              ))}
              {!twinPressure.length && <p className="panel-note">相方の構造化情報がまだありません。情報を出させてから、その結果と他人の情報の衝突を攻めるのが最優先です。</p>}
              <p className="panel-note warning-note">相方が死んでも「処刑」でなければ悪の双子の即勝利にはなりません。相方を夜殺ししないよう味方デーモンと共有してください。</p>
            </div>
          )}
        </section>
      )}

      {selfRoleId==='boffin' && <section className="evil-section"><h3>ボフィン — デーモンに与えた能力</h3><p className="panel-note">実際に配られていない善役職の能力を選択してください。デーモンが毒・酔いでも働きますが、ボフィン自身が毒・酔い・能力停止なら停止します。</p><select value={state.boffinGrantedAbility??''} onChange={e=>onChange({...state,boffinGrantedAbility:e.target.value?e.target.value as RoleId:null})}><option value="">未記録</option>{GOOD_ROLES.filter(role=>role.id!=='drunk').map(role=><option key={role.id} value={role.id}>{role.symbol} {role.name}</option>)}</select></section>}
      {selfRoleId==='fearmonger' && <section className="evil-section"><h3>フィアモンガー — 夜の標的</h3><p className="panel-note">この標的を自分が指名し、その人が処刑されたら標的の陣営が敗北します。新しい標的を選んだ時は全員に通知されます。初夜も通知されます。</p><select value={fearNight} onChange={e=>setFearNight(e.target.value)}>{minionAbilityNightOptions.map(x=><option key={x}>{x}</option>)}</select><div className="player-toggle-grid">{allPlayers.map(p=><button type="button" key={p} className={fearTarget===p?'player-toggle selected evil-selected':'player-toggle'} onClick={()=>setFearTarget(p)}>{person(g,p)}</button>)}</div><button type="button" className="menu-option confirm-claim-button evil-confirm" disabled={!fearTarget} onClick={saveFearmonger}>標的を保存</button>{actions.filter((a):a is Extract<MinionActionEvent,{roleId:'fearmonger'}>=>a.roleId==='fearmonger').map(a=><div className="demon-action-row" key={a.id}>{a.when} → {person(g,a.target)}<button className="mini-danger-button" onClick={()=>onDeleteAction(a.id)}>削除</button></div>)}</section>}
      {selfRoleId==='harpy' && <section className="evil-section"><h3>ハーピー — 狂気の対象</h3><p className="panel-note">最初の人が、二人目は悪だと信じているように振る舞う必要があります。守らなければ一方または両方が死亡する場合があります。処刑ではなくストーリーテラー判断の死亡です。</p><select value={harpyNight} onChange={e=>setHarpyNight(e.target.value)}>{minionAbilityNightOptions.map(x=><option key={x}>{x}</option>)}</select><label>狂気を与える人</label><div className="player-toggle-grid">{allPlayers.map(p=><button type="button" key={p} className={harpyTarget===p?'player-toggle selected evil-selected':'player-toggle'} onClick={()=>{setHarpyTarget(p);if(p===harpyAccuse)setHarpyAccuse(null);}}>{person(g,p)}</button>)}</div><label>悪だと思い込ませる相手</label><div className="player-toggle-grid">{allPlayers.filter(p=>p!==harpyTarget).map(p=><button type="button" key={p} className={harpyAccuse===p?'player-toggle selected evil-selected':'player-toggle'} onClick={()=>setHarpyAccuse(p)}>{person(g,p)}</button>)}</div><button type="button" className="menu-option confirm-claim-button evil-confirm" disabled={!harpyTarget||!harpyAccuse} onClick={saveHarpy}>二人組を保存</button>{actions.filter((a):a is Extract<MinionActionEvent,{roleId:'harpy'}>=>a.roleId==='harpy').map(a=><div className="demon-action-row" key={a.id}>{a.when}：{person(g,a.target)} → {person(g,a.accuse)}を悪だと信じる<button className="mini-danger-button" onClick={()=>onDeleteAction(a.id)}>削除</button></div>)}</section>}
      {selfRoleId === "witch" && (
        <section className="evil-section">
          <h3>魔女 — 呪い</h3>
          <p className="panel-note">対象予測はあなたに任せます。過去の指名回数だけ表示し、アプリは勝手に呪い先を決めません。生存3人になると魔女能力と呪いは消えます。</p>
          <div className="form-section"><label>いつ</label><select value={witchNight} onChange={(e) => setWitchNight(e.target.value)}>{minionAbilityNightOptions.map((phase) => <option key={phase}>{phase}</option>)}</select></div>
          <div className="claim-option-title">呪う人</div>
          <div className="player-toggle-grid">
            {allPlayers.map((player) => <button key={player} type="button" className={witchTarget === player ? "player-toggle selected evil-selected" : "player-toggle"} onClick={() => setWitchTarget(witchTarget === player ? null : player)}>{person(g, player)}{g.playerStatus[player]?.alive === false ? " †" : ""}</button>)}
          </div>
          <div className="target-suggestions">
            <h4>指名履歴 — 判断材料</h4>
            {witchNominationHistory.slice(0, 8).map((row) => <button key={row.player} type="button" className="target-suggestion" onClick={() => setWitchTarget(row.player)}>
              <strong>{person(g, row.player)} — {row.count}回</strong><span>{row.last ? `最後: ${row.last}` : "まだ指名なし"}</span>
            </button>)}
          </div>
          <div className="form-section"><label>メモ（任意）</label><textarea value={witchNote} maxLength={500} onChange={(e) => setWitchNote(e.target.value)} placeholder="例：今日この人が3Rを指名しそう" /></div>
          <button className="menu-option confirm-claim-button evil-confirm" disabled={!witchTarget} onClick={saveWitch}>呪いを記録</button>
          {actions.some((a) => a.roleId === "witch") && <div className="claim-history"><div className="claim-history-title">呪い履歴</div>
            {actions.filter((a): a is Extract<MinionActionEvent,{roleId:"witch"}> => a.roleId === "witch").sort((a,b) => phaseNumber(b.when)-phaseNumber(a.when)).map((a) => {
              const day = `D${phaseNumber(a.when)}`;
              const nominated = g.nominationLog.some((n) => n.when === day && n.nominator === a.target);
              return <div className="demon-action-row" key={a.id}>
                <div><strong>{a.when}</strong> → {person(g,a.target)} / {a.triggered === true ? "呪いで死亡" : a.triggered === false ? "指名したが生存" : nominated ? "指名済み・結果未入力" : "まだ指名なし"}</div>
                {a.note && <span>{a.note}</span>}
                {nominated && a.triggered === null && <div className="button-row compact-row"><button type="button" className="mini-action-button" onClick={() => resolveWitch(a,true)}>呪いで死亡</button><button type="button" className="secondary-button" onClick={() => resolveWitch(a,false)}>生存した</button></div>}
                <button type="button" className="mini-danger-button" onClick={() => { if (window.confirm(`${a.when}の呪いを削除しますか？\n連動した死亡記録も削除されます。`)) onDeleteAction(a.id); }}>削除</button>
              </div>;
            })}
          </div>}
        </section>
      )}

      {selfRoleId === "cerenovus" && (
        <section className="evil-section">
          <h3>セレノヴァス — 狂気</h3>
          <p className="panel-note">主目標は「この対象が町視点で悪に見える候補盤面」を最大化すること。対象は手動でも選べます。おすすめは町視点の推理と主張衝突を使います。</p>
          <div className="form-section"><label>いつ</label><select value={cereNight} onChange={(e) => setCereNight(e.target.value)}>{minionAbilityNightOptions.map((phase) => <option key={phase}>{phase}</option>)}</select></div>
          <div className="claim-option-title">狂気対象</div>
          <div className="player-toggle-grid">{allPlayers.map((player) => <button key={player} type="button" className={cereTarget === player ? "player-toggle selected evil-selected" : "player-toggle"} onClick={() => setCereTarget(cereTarget === player ? null : player)}>{person(g,player)}{g.playerStatus[player]?.alive === false ? " †" : ""}</button>)}</div>
          <div className="form-section"><label>名乗らせる善役職</label><select value={cereRole ?? ""} onChange={(e) => setCereRole(e.target.value ? e.target.value as RoleId : null)}><option value="">選択してください</option>{GOOD_ROLES.map((role) => <option key={role.id} value={role.id}>{role.symbol} {role.name}</option>)}</select></div>
          <div className="form-section"><label>メモ（任意）</label><textarea value={cereNote} maxLength={500} onChange={(e) => setCereNote(e.target.value)} /></div>
          <button className="menu-option confirm-claim-button evil-confirm" disabled={!cereTarget || !cereRole} onClick={saveCerenovus}>狂気を記録</button>
          {cerenovusSuggestions.length > 0 && <div className="target-suggestions"><h4>悪く見せる候補</h4>
            {cerenovusSuggestions.map((x) => <button key={`${x.target}:${x.madRole}`} type="button" className="target-suggestion" onClick={() => { setCereTarget(x.target); setCereRole(x.madRole); }}>
              <strong>{person(g,x.target)} → {roleLabel(x.madRole)} / 町視点悪 {Math.round(x.publicEvilShare*100)}%</strong><span>{x.reasons.join(" / ")}</span>
            </button>)}
          </div>}
          {actions.some((a) => a.roleId === "cerenovus") && <div className="claim-history"><div className="claim-history-title">狂気履歴</div>
            {actions.filter((a): a is Extract<MinionActionEvent,{roleId:"cerenovus"}> => a.roleId === "cerenovus").sort((a,b)=>phaseNumber(b.when)-phaseNumber(a.when)).map((a) => {
              const day=`D${phaseNumber(a.when)}`, executed=g.deathLog.some((d)=>d.when===day&&d.playerId===a.target&&d.sourceRoleId==="cerenovus");
              return <div className="demon-action-row" key={a.id}><div><strong>{a.when}</strong> {person(g,a.target)} → {roleLabel(a.madRole)}</div>{a.note&&<span>{a.note}</span>}{!executed&&g.playerStatus[a.target]?.alive!==false&&<button type="button" className="mini-action-button" onClick={()=>recordCerenovusExecution(a)}>狂気破り処刑を記録</button>}{executed&&<span>狂気破りで処刑済み</span>}<button type="button" className="mini-danger-button" onClick={()=>{if(window.confirm(`${a.when}の狂気指定を削除しますか？\n連動した処刑記録も削除されます。`))onDeleteAction(a.id);}}>削除</button></div>;
            })}
          </div>}
        </section>
      )}

      {selfRoleId === "poisoner" && (
        <section className="evil-section">
          <h3>毒対象</h3>
          <p className="panel-note">毎夜1人を記録します。記録した対象は候補盤面の毒スケジュールを直接固定します。</p>
          <div className="form-section">
            <label>いつ</label>
            <select value={poisonNight} onChange={(e) => setPoisonNight(e.target.value)}>
              {minionAbilityNightOptions.map((phase) => <option key={phase} value={phase}>{phase}</option>)}
            </select>
          </div>
          <div className="claim-option-title">選んだ人</div>
          <div className="player-toggle-grid">
            {allPlayers.map((player) => (
              <button
                key={player}
                type="button"
                className={poisonTarget === player ? "player-toggle selected poison-selected" : "player-toggle"}
                onClick={() => setPoisonTarget(poisonTarget === player ? null : player)}
              >
                {person(g, player)}{g.playerStatus[player]?.alive === false ? " †" : ""}
              </button>
            ))}
          </div>
          {poisonHint && <p className="panel-note poison-target-hint">{poisonHint}</p>}
          <div className="form-section">
            <label>作戦メモ（任意）</label>
            <textarea value={poisonNote} maxLength={500} onChange={(e) => setPoisonNote(e.target.value)} placeholder="例：占い師主張を止める / デーモンとノーキル連携" />
          </div>
          <button className="menu-option confirm-claim-button evil-confirm" disabled={!poisonTarget} onClick={savePoison}>毒を記録</button>

          {poisonSuggestions.length > 0 && (
            <div className="target-suggestions">
              <h4>毒候補</h4>
              <p className="panel-note">主張と現在の候補盤面を使った軽い優先候補です。味方は候補から外しています。</p>
              {poisonSuggestions.map((s) => (
                <button key={s.player} className="target-suggestion" onClick={() => setPoisonTarget(s.player)}>
                  <strong>{person(g, s.player)}</strong>
                  <span>{s.reasons.join(" / ") || "比較材料が少ない"}</span>
                </button>
              ))}
            </div>
          )}

          {actions.filter((a) => a.roleId === "poisoner").length > 0 && (
            <div className="claim-history">
              <div className="claim-history-title">毒履歴</div>
              {actions.filter((a): a is Extract<MinionActionEvent, { roleId: "poisoner" }> => a.roleId === "poisoner")
                .sort((a, b) => phaseNumber(b.when) - phaseNumber(a.when))
                .map((a) => (
                  <div className="demon-action-row" key={a.id}>
                    <div><strong>{a.when}</strong> → {person(g, a.target)}</div>
                    {a.note && <span>{a.note}</span>}
                    <button type="button" className="mini-danger-button" onClick={() => {
                      if (window.confirm(`${a.when}の毒記録を削除しますか？`)) onChangeActions(actions.filter((x) => x.id !== a.id));
                    }}>削除</button>
                  </div>
                ))}
            </div>
          )}
        </section>
      )}

      {selfRoleId === "pit_hag" && (
        <section className="evil-section">
          <h3>変身</h3>
          <p className="panel-note">
            毎夜（初夜を除く）1人と役職を選びます。その役職がその時点で不在なら対象の役職が変わります。陣営は変わりません。
            既にその役職がいる場合は何も起きません。
          </p>
          <div className="form-section">
            <label>いつ</label>
            <select value={pitHagNight} onChange={(e) => setPitHagNight(e.target.value)} disabled={pitHagNightOptions.length === 0}>
              {pitHagNightOptions.map((phase) => <option key={phase} value={phase}>{phase}</option>)}
            </select>
          </div>
          <div className="claim-option-title">選んだ人</div>
          <div className="player-toggle-grid">
            {allPlayers.map((player) => (
              <button
                key={player}
                type="button"
                className={pitHagTarget === player ? "player-toggle selected evil-selected" : "player-toggle"}
                onClick={() => setPitHagTarget(pitHagTarget === player ? null : player)}
              >
                {person(g, player)}{g.playerStatus[player]?.alive === false ? " †" : ""}
              </button>
            ))}
          </div>
          <div className="form-section">
            <label>新しい役職</label>
            <select value={pitHagNewRole ?? ""} onChange={(e) => setPitHagNewRole(e.target.value ? (e.target.value as RoleId) : null)}>
              <option value="">選択してください</option>
              {([
                ["townsfolk", "町人"],
                ["outsider", "外来者"],
                ["minion", "手下"],
                ["demon", "デーモン"],
              ] as const).map(([type, label]) => (
                <optgroup key={type} label={label}>
                  {scriptRoles.filter((role) => role.type === type).map((role) => (
                    <option key={role.id} value={role.id}>{role.symbol} {role.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          {pitHagNewRole && ROLES[pitHagNewRole].type === "demon" && (
            <p className="panel-note warning-note">
              デーモンを新しく作れた場合、この夜の死亡は穴の老婆由来の任意死亡として扱います。通常のデーモン襲撃数では絞り込みません。
            </p>
          )}
          <div className="form-section">
            <label>メモ（任意）</label>
            <textarea value={pitHagNote} maxLength={500} onChange={(e) => setPitHagNote(e.target.value)} placeholder="例：3Lを渦へ / デーモン変更を狙う" />
          </div>
          <button
            className="menu-option confirm-claim-button evil-confirm"
            disabled={!pitHagTarget || !pitHagNewRole || !pitHagNightOptions.includes(pitHagNight)}
            onClick={savePitHag}
          >
            変身を記録
          </button>

          {pitHagSuggestions.length > 0 && (
            <div className="target-suggestions">
              <h4>穴の老婆 作戦候補</h4>
              <p className="panel-note">現在の候補盤面から「その役職が今いない確率」と対象価値を比較します。成功率は探索サンプル上の目安です。</p>
              {pitHagSuggestions.map((x) => (
                <button key={`${x.kind}:${x.target}:${x.newRole}`} type="button" className="target-suggestion" onClick={() => { setPitHagTarget(x.target); setPitHagNewRole(x.newRole); }}>
                  <strong>{person(g,x.target)} → {roleLabel(x.newRole)} / 成功見込み {Math.round(x.successChance*100)}%</strong>
                  <span>{x.kind === "demon-pivot" ? "デーモン変更" : x.kind === "evil-upgrade" ? "味方強化" : "善側破壊"} / {x.reasons.join(" / ")}</span>
                </button>
              ))}
            </div>
          )}

          {actions.some((a) => a.roleId === "pit_hag") && (
            <div className="claim-history">
              <div className="claim-history-title">変身履歴</div>
              {actions
                .filter((a): a is Extract<MinionActionEvent, { roleId: "pit_hag" }> => a.roleId === "pit_hag")
                .sort((a, b) => phaseNumber(b.when) - phaseNumber(a.when) || b.id - a.id)
                .map((a) => (
                  <div className="demon-action-row" key={a.id}>
                    <div><strong>{a.when}</strong> {person(g, a.target)} → {ROLES[a.newRole].symbol} {ROLES[a.newRole].name}</div>
                    {ROLES[a.newRole].type === "demon" && <span>デーモン作成なら今夜の死亡は任意</span>}
                    {a.note && <span>{a.note}</span>}
                  </div>
                ))}
              <button type="button" className="menu-option" onClick={undoLatestPitHag}>取り消し</button>
            </div>
          )}
        </section>
      )}

      {selfRoleId === "spy" && (
        <>
          <section className="evil-section spy-bluff-advisor">
            <h3>自動ブラフ提案 — 2.1 密偵戦略</h3>
            <p className="panel-note">
              相手視点の候補盤面をできるだけ多く残しつつ、実際の味方デーモン席が相手の候補盤面では善側に置かれるように評価します。
              グリモアまたは公開主張で聖人／ゴブリン が見えている場合は、その席がデーモン候補になる世界も追加で優先します。
              情報役職には、その目的に合う偽情報案も自動生成します。数値は探索した候補の比較値で、実確率ではありません。
            </p>

            {spyBluffAdvisor.status === "running" && (
              <div className="spy-advisor-status">
                <strong>ブラフ候補を自動計算中…</strong>
                <span>検討 {spyBluffAdvisor.progress.checked} / 候補 {spyBluffAdvisor.progress.unique}</span>
              </div>
            )}

            {spyBluffAdvisor.status === "error" && (
              <div className="solver-error">
                ブラフ計算に失敗しました。もう一度計算してください。
              </div>
            )}

            {spyBluffAdvisor.result && (
              <>
                <div className="spy-advisor-summary">
                  <span>相手視点の元候補 <strong>{spyBluffAdvisor.result.baseUnique}</strong></span>
                  <span>有効候補 <strong>{spyBluffAdvisor.result.baseEffectiveWorlds.toFixed(1)}</strong></span>
                  <span>密偵表示入力 <strong>{Math.round(spyBluffAdvisor.result.spyDisplayCoverage * 100)}%</strong></span>
                  {spyBluffAdvisor.result.knownDemonPlayerId && (
                    <span>守るデーモン席 <strong>{person(g, spyBluffAdvisor.result.knownDemonPlayerId)}</strong></span>
                  )}
                </div>
                {spyBluffAdvisor.result.scapegoatPlayers.length > 0 && (
                  <p className="panel-note warning-note">
                    デーモンに見せたい危険役職: {spyBluffAdvisor.result.scapegoatPlayers.map((entry) => `${person(g, entry.playerId)} (${roleLabel(entry.roleId)})`).join(" / ")}
                  </p>
                )}
                <p className="panel-note">
                  「推奨」は実用上の衝突を避けた上で、候補盤面数・味方デーモンの善側世界・聖人／ゴブリンをデーモンにする世界を合わせて評価します。
                  「世界数1位」は従来どおり純粋な盤面数トップです。
                </p>

                {spyBestFalseInfoCandidate?.falseInfo && (
                  <div className="spy-false-info-box">
                    <strong>最優先の偽情報案 — {roleLabel(spyBestFalseInfoCandidate.roleId)}</strong>
                    <span>{spyFalseInfoLabel(g, spyBestFalseInfoCandidate.falseInfo)}</span>
                    <div className="spy-bluff-metrics">
                      <span>残る世界 <strong>{Math.round(spyBestFalseInfoCandidate.falseInfo.supportWeight * 100)}%</strong></span>
                      {spyBestFalseInfoCandidate.falseInfo.knownDemonGoodShare !== null && (
                        <span>味方デーモン席が善 <strong>{Math.round(spyBestFalseInfoCandidate.falseInfo.knownDemonGoodShare * 100)}%</strong></span>
                      )}
                      {spyBestFalseInfoCandidate.falseInfo.scapegoatDemonShare !== null && spyBestFalseInfoCandidate.falseInfo.scapegoatPlayerId && (
                        <span>{person(g, spyBestFalseInfoCandidate.falseInfo.scapegoatPlayerId)} がデーモン <strong>{Math.round(spyBestFalseInfoCandidate.falseInfo.scapegoatDemonShare * 100)}%</strong></span>
                      )}
                    </div>
                  </div>
                )}

                <div className="spy-bluff-list">
                  {spyBluffDisplay.map((candidate, index) => {
                    const role = ROLES[candidate.roleId];
                    const recommended = spyBluffAdvisor.result?.recommendedRoleId === candidate.roleId;
                    const rawWinner = spyBluffAdvisor.result?.rawWorldWinnerRoleId === candidate.roleId;
                    const currentPlan = state.bluffPlans.self === candidate.roleId;
                    return (
                      <div
                        key={candidate.roleId}
                        className={`spy-bluff-card${recommended ? " spy-bluff-recommended" : ""}`}
                      >
                        <div className="spy-bluff-card-head">
                          <span className="spy-bluff-rank">#{index + 1}</span>
                          <strong>{role.symbol} {role.name}</strong>
                          {recommended && <span className="spy-bluff-chip recommend">推奨</span>}
                          {rawWinner && <span className="spy-bluff-chip worlds">世界数1位</span>}
                          {currentPlan && <span className="spy-bluff-chip current">採用中</span>}
                        </div>

                        <div className="spy-bluff-metrics">
                          <span>成立配役 <strong>{candidate.supportedAssignments}</strong></span>
                          <span>有効世界 <strong>{candidate.effectiveWorlds.toFixed(1)}</strong></span>
                          <span>善側の顔で成立 <strong>{Math.round(candidate.goodFacadeWeight * 100)}%</strong></span>
                          {candidate.knownDemonGoodShare !== null && (
                            <span>味方デーモン席が善 <strong>{Math.round(candidate.knownDemonGoodShare * 100)}%</strong></span>
                          )}
                          {candidate.scapegoatDemonShare !== null && candidate.scapegoatPlayerId && (
                            <span>{person(g, candidate.scapegoatPlayerId)} がデーモン <strong>{Math.round(candidate.scapegoatDemonShare * 100)}%</strong></span>
                          )}
                        </div>

                        {candidate.falseInfo && (
                          <div className="spy-false-info-box">
                            <strong>偽情報案</strong>
                            <span>{spyFalseInfoLabel(g, candidate.falseInfo)}</span>
                            <div className="spy-bluff-metrics">
                              <span>この情報で残る世界 <strong>{Math.round(candidate.falseInfo.supportWeight * 100)}%</strong></span>
                              {candidate.falseInfo.knownDemonGoodShare !== null && (
                                <span>その中で味方デーモン席が善 <strong>{Math.round(candidate.falseInfo.knownDemonGoodShare * 100)}%</strong></span>
                              )}
                              {candidate.falseInfo.scapegoatDemonShare !== null && candidate.falseInfo.scapegoatPlayerId && (
                                <span>{person(g, candidate.falseInfo.scapegoatPlayerId)} がデーモン <strong>{Math.round(candidate.falseInfo.scapegoatDemonShare * 100)}%</strong></span>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="spy-bluff-flags">
                          {candidate.sharedStorytellerBluff && <span className="spy-bluff-chip safe">共有ブラフで不在確認</span>}
                          {candidate.spyShownAbsent && <span className="spy-bluff-chip safe">密偵表示で不在</span>}
                          {candidate.spyShownInPlayAt && (
                            <span className="spy-bluff-chip danger">
                              密偵表示で実在: {person(g, candidate.spyShownInPlayAt)}
                            </span>
                          )}
                          {candidate.opponentClaimers.length > 0 && (
                            <span className="spy-bluff-chip danger">
                              相手主張: {candidate.opponentClaimers.map((player) => person(g, player)).join(" / ")}
                            </span>
                          )}
                          {candidate.allyUsers.length > 0 && (
                            <span className="spy-bluff-chip warning">
                              味方使用: {candidate.allyUsers.map((player) => person(g, player)).join(" / ")}
                            </span>
                          )}
                          {!candidate.spyShownInPlayAt && !candidate.spyShownAbsent && !candidate.sharedStorytellerBluff && (
                            <span className="spy-bluff-chip neutral">実在未確認</span>
                          )}
                        </div>

                        <button
                          type="button"
                          className="mini-action-button"
                          disabled={currentPlan}
                          onClick={() => setBluffPlan("self", candidate.roleId)}
                        >
                          {currentPlan ? "このブラフを採用中" : "このブラフを採用"}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {spyBluffAdvisor.result.baseUnique < 40 && (
                  <p className="panel-note warning-note">
                    相手視点の候補が少ないため順位が不安定です。入力不足か強い公開情報がある場合があります。
                  </p>
                )}

                <div className="button-row compact-row">
                  <button type="button" className="secondary-button" onClick={() => spyBluffAdvisor.rerun(false)}>再計算</button>
                  <button type="button" className="secondary-button" onClick={() => spyBluffAdvisor.rerun(true)}>深く再計算</button>
                </div>
              </>
            )}
          </section>

          <section className="evil-section">
            <h3>N1 グリモア — 初期役職</h3>
            <p className="panel-note">
              入力した席は、密が健康な候補盤面ではその表示どおりに照合します。密自身が毒ならグリモアが誤情報の可能性も残します。全{g.playerCount}人を入力すると、入っていない善役職を「密偵表示で安全」としてブラフ表に表示できます。
              {` ${Object.keys(spyEnteredRoles).length}/${g.playerCount}`}
            </p>
            <div className="spy-grimoire-grid">
              {allPlayers.map((player) => {
                const fixedSelf = player === "self";
                const value = fixedSelf ? "spy" : state.spyInitialRoles[player] ?? "";
                return (
                  <label className="spy-role-row" key={player}>
                    <span>{person(g, player)}</span>
                    <select
                      value={value}
                      disabled={fixedSelf}
                      onChange={(e) => setSpyInitialRole(player, e.target.value ? (e.target.value as RoleId) : null)}
                    >
                      <option value="">未入力</option>
                      {scriptRoles.map((role) => {
                        const usedElsewhere = Object.entries(state.spyInitialRoles).some(([p, r]) => p !== player && r === role.id) || (player !== "self" && role.id === "spy");
                        return <option key={role.id} value={role.id} disabled={usedElsewhere}>{role.symbol} {role.name}{usedElsewhere ? " — 使用済み" : ""}</option>;
                      })}
                    </select>
                  </label>
                );
              })}
            </div>
            <div className="form-section">
              <label>占い師の赤い印</label>
              <select value={state.spyRedHerring ?? ""} onChange={(e) => onChange({ ...state, spyRedHerring: e.target.value || null })}>
                <option value="">未入力</option>
                {others.filter((p) => {
                  const role = state.spyInitialRoles[p];
                  return !role || (ROLES[role].type !== "minion" && ROLES[role].type !== "demon");
                }).map((player) => <option key={player} value={player}>{person(g, player)}</option>)}
              </select>
            </div>
          </section>

          <section className="evil-section">
            <h3>毎夜のグリモア</h3>
            <p className="panel-note">その夜に見えた毒対象だけ、分かる場合に記録します。空欄は「未記録」で、毒なしを意味しません。</p>
            <div className="form-section">
              <label>いつ</label>
              <select value={spyNight} onChange={(e) => setSpyNight(e.target.value)}>
                {minionAbilityNightOptions.map((phase) => <option key={phase} value={phase}>{phase}</option>)}
              </select>
            </div>
            <div className="form-section">
              <label>毒対象</label>
              <select value={spyPoisonTarget ?? ""} onChange={(e) => setSpyPoisonTarget(e.target.value || null)}>
                <option value="">未記録</option>
                {allPlayers.map((player) => <option key={player} value={player}>{person(g, player)}</option>)}
              </select>
            </div>
            <div className="form-section">
              <label>メモ（任意）</label>
              <textarea value={spyNote} maxLength={700} onChange={(e) => setSpyNote(e.target.value)} placeholder="例：洗の対象、死亡原因、デーモンに伝える優先標的" />
            </div>
            <button className="menu-option confirm-claim-button evil-confirm" onClick={saveSpyNight}>グリモア記録を保存</button>

            {actions.filter((a) => a.roleId === "spy").length > 0 && (
              <div className="claim-history">
                <div className="claim-history-title">グリモア履歴</div>
                {actions.filter((a): a is Extract<MinionActionEvent, { roleId: "spy" }> => a.roleId === "spy")
                  .sort((a, b) => phaseNumber(b.when) - phaseNumber(a.when))
                  .map((a) => (
                    <div className="demon-action-row" key={a.id}>
                      <div><strong>{a.when}</strong>{a.poisonTarget ? ` / 毒: ${person(g, a.poisonTarget)}` : " / 毒未記録"}</div>
                      {a.note && <span>{a.note}</span>}
                      <button type="button" className="mini-danger-button" onClick={() => {
                        if (window.confirm(`${a.when}のグリモア記録を削除しますか？`)) onChangeActions(actions.filter((x) => x.id !== a.id));
                      }}>削除</button>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </>
      )}

      {selfRoleId === "scarlet_woman" && (
        <section className="evil-section">
          <h3>緋色の女 — 継承状態</h3>
          <div className="status-detail">
            現在の生存人数: {allPlayers.filter((p) => g.playerStatus[p]?.alive !== false).length}人
          </div>
          <p className="panel-note">
            デーモン死亡時に能力が有効で、死亡直前に5人以上生存していればインプを継承します。候補盤面ではこの継承を通常の役職変化として追跡します。
          </p>
          <p className="metric-line">
            現在の探索で自分がデーモン: {currentDemonShare === undefined ? "—" : `${Math.round(currentDemonShare * 100)}%`}
          </p>
        </section>
      )}

      {selfRoleId === "baron" && (
        <section className="evil-section">
          <h3>男爵 — 配役効果</h3>
          <div className="baron-count-grid">
            <span>通常の町人<strong>{base.townsfolk}</strong></span>
            <span>男爵時の町人<strong>{adjusted.townsfolk}</strong></span>
            <span>通常のアウトサイダー<strong>{base.outsider}</strong></span>
            <span>男爵時のアウトサイダー<strong>{adjusted.outsider}</strong></span>
          </div>
          <p className="panel-note">自分が男爵なので候補盤面は最初から「町人 -2／アウトサイダー +2」で固定されます。</p>
          <div className="claim-option-title">現在のアウトサイダー主張</div>
          <p>{outsiderClaimers.length ? outsiderClaimers.map((p) => `${person(g, p)} (${roleLabel(latestExactClaim(g, p))})`).join(" / ") : "未記録"}</p>
        </section>
      )}

      <section className="evil-section">
        <h3>デーモン継承</h3>
        <p className="panel-note">
          スターパスや緋色の女で実際に自分がインプになった場合だけ記録します。これは自分が直接知っている情報なので候補盤面を固定します。
        </p>
        <div className="form-section">
          <label>インプになった時点</label>
          <select
            value={state.becameDemonAt ?? ""}
            onChange={(e) => onChange({ ...state, becameDemonAt: e.target.value || null })}
          >
            <option value="">まだ / 未記録</option>
            {phaseOptions.map((phase) => <option key={phase} value={phase}>{phase}</option>)}
          </select>
        </div>

        {state.becameDemonAt && (
          <div className="succession-attack-box">
            <div className="claim-option-title">継承後のインプ襲撃</div>
            <div className="form-section">
              <label>いつ</label>
              <select value={demonAttackNight} onChange={(e) => setDemonAttackNight(e.target.value)}>
                {attackNightOptions.filter((phase) => phaseNumber(phase) > phaseNumber(state.becameDemonAt!)).map((phase) => <option key={phase} value={phase}>{phase}</option>)}
              </select>
            </div>
            <div className="player-toggle-grid">
              {allPlayers.map((player) => (
                <button
                  key={player}
                  type="button"
                  className={demonAttackTarget === player ? "player-toggle selected evil-selected" : "player-toggle"}
                  onClick={() => setDemonAttackTarget(demonAttackTarget === player ? null : player)}
                >
                  {person(g, player)}{g.playerStatus[player]?.alive === false ? " †" : ""}
                </button>
              ))}
            </div>
            <div className="form-section">
              <label>作戦メモ（任意）</label>
              <textarea value={demonAttackNote} maxLength={500} onChange={(e) => setDemonAttackNote(e.target.value)} />
            </div>
            <button className="menu-option confirm-claim-button evil-confirm" disabled={!demonAttackTarget} onClick={saveDemonAttack}>襲撃を記録</button>
          </div>
        )}
      </section>

      <button className="menu-option" onClick={onBack}>戻る</button>
    </>
  );
}
