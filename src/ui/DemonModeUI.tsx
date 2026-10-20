import { useMemo, useState } from "react";
import { ROLES, type RoleId } from "../roles";
import { getSnapshotScriptRoleIds } from "../scripts";
import type { DemonActionEvent, DemonState, GameSnapshot, KnownMinion } from "../types";
import type { SearchResult } from "../engine/model";
import { exactClaim, seats, setupCounts } from "../engine/game";
import { eventId } from "../storage";
import { typhonLayouts } from "../engine/demonVariants";
import { person } from "./text";
import { DamselFinder } from "./DamselFinder";

type Props = {
  g: GameSnapshot;
  state: DemonState;
  actions: DemonActionEvent[];
  result: SearchResult | null;
  onChange: (state: DemonState) => void;
  onChangeActions: (events: DemonActionEvent[]) => void;
  onBack: () => void;
};

type BluffStatus = "storyteller" | "opponent" | "ally" | "unclaimed";

const ATTACK_DEMON_IDS: DemonActionEvent["roleId"][] = ["imp", "fang_gu", "vigormortis", "no_dashii", "vortox", "lord_of_typhon", "kazali", "lleech", "ojo"];

function latestExactClaim(g: GameSnapshot, player: string): RoleId | null {
  return exactClaim(g, player);
}

function targetReasons(g: GameSnapshot, p: string, result: SearchResult | null): string[] {
  const roleId = latestExactClaim(g, p);
  const role = roleId ? ROLES[roleId] : null;
  const reasons: string[] = [];
  if (role?.tags.includes("HIGH_SURVIVAL_VALUE")) reasons.push("生存価値の高い主張");
  if (role?.tags.includes("CONTINUOUS_INFO")) reasons.push("継続情報役の主張");
  if (role?.tags.includes("WANTS_DEMON_TARGET")) reasons.push("攻撃を受けたい役職主張");
  const evil = result?.players[p]?.evil;
  if (evil !== undefined && evil < 0.2) reasons.push("候補盤面では善側に寄る");
  if (!role) reasons.push("役職主張未記録");
  return reasons;
}

function targetScore(g: GameSnapshot, p: string, result: SearchResult | null): number {
  const roleId = latestExactClaim(g, p);
  const role = roleId ? ROLES[roleId] : null;
  let score = 0;
  if (role?.tags.includes("HIGH_SURVIVAL_VALUE")) score += 4;
  if (role?.tags.includes("CONTINUOUS_INFO")) score += 2;
  if (role?.tags.includes("FIRST_NIGHT_INFO")) score -= 0.5;
  if (role?.tags.includes("WANTS_DEMON_TARGET")) score -= 5;
  if (roleId === "soldier" || roleId === "ravenkeeper") score -= 3;
  const evil = result?.players[p]?.evil;
  if (evil !== undefined) score += (0.5 - evil) * 3;
  if (!role) score -= 0.25;
  return score;
}

function publicNightResult(g: GameSnapshot, action: DemonActionEvent): string {
  const deaths = g.deathLog.filter((d) => d.when === action.when);
  if(action.roleId==='ojo')return deaths.length ? `夜死亡: ${deaths.map(d=>person(g,d.playerId)).join(' / ')}` : `指定役職: ${action.targetRole?ROLES[action.targetRole].name:'不明'} / 結果未確定`;
  const targetDeath = deaths.find((d) => d.playerId === action.target);
  if (targetDeath) return `対象死亡: ${person(g, action.target)}`;
  if (deaths.length > 0) return `別の死亡: ${deaths.map((d) => person(g, d.playerId)).join(" / ")}`;
  const n = Number(action.when.slice(1));
  if (g.completedNights.includes(n)) return "死亡なし";
  return "結果未確定";
}

export function DemonModePanel({ g, state, actions, result, onChange, onChangeActions, onBack }: Props) {
  const selfDemonId = g.selfRole.shownRole;
  if (!selfDemonId || ROLES[selfDemonId].type !== "demon") return <button className="menu-option" onClick={onBack}>戻る</button>;
  const selfDemon = ROLES[selfDemonId];
  const impMode = selfDemonId === "imp";
  const attackMode = ATTACK_DEMON_IDS.includes(selfDemonId as DemonActionEvent["roleId"]);
  const selfAlive = g.playerStatus.self?.alive !== false;
  const scriptRoles = getSnapshotScriptRoleIds(g).map(id => ROLES[id]);
  const GOOD_ROLES = scriptRoles.filter(role => role.type === "townsfolk" || role.type === "outsider");
  const MINION_ROLES = scriptRoles.filter(role => role.type === "minion");
  const marionettePossible=scriptRoles.some(role=>role.id==='marionette');
  const boffinPossible=scriptRoles.some(role=>role.id==='boffin');
  const clockwise=seats(g.playerCount);
  const adjacentToSelf=[clockwise[1],clockwise[clockwise.length-1]].filter(Boolean);
  const [attackNight, setAttackNight] = useState(`N${Math.max(2, g.night)}`);
  const [attackTarget, setAttackTarget] = useState<string | null>(null);
  const [ojoRole,setOjoRole]=useState<RoleId|null>(null);
  const [attackNote, setAttackNote] = useState("");
  const minionCount = setupCounts(g.playerCount).minion + (selfDemonId === "lord_of_typhon" ? 1 : 0);
  const magicianPossible = scriptRoles.some(role => role.id === "magician");
  const poppyPossible=scriptRoles.some(role=>role.id==="poppy_grower");
  const displayedMinionCap = minionCount + (magicianPossible && g.playerCount >= 7 ? 1 : 0);
  const getsStartingInfo = g.playerCount >= 7 || selfDemonId === "kazali";
  const extraSeatShown = getsStartingInfo && state.knownMinions.filter(m=>m.source === "demon_info").length > minionCount;
  const allPlayers = seats(g.playerCount);
  const others = allPlayers.filter((p) => p !== "self");
  const known = new Set(selfDemonId === "legion" ? (state.legionAllies??[]) : state.knownMinions.map((m) => m.playerId));
  const livingOpponents = others.filter((p) => !known.has(p) && g.playerStatus[p]?.alive !== false);
  const nightOptions = Array.from({ length: Math.max(0, g.night - 1) }, (_, i) => `N${i + 2}`);

  const suggestions = useMemo(
    () =>
      livingOpponents
        .map((player) => ({
          player,
          score: targetScore(g, player, result),
          reasons: targetReasons(g, player, result),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3),
    [g, result, state.knownMinions]
  );

  function toggleKnownMinion(playerId: string) {
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
    if (state.knownMinions.length >= displayedMinionCap) return;
    const item: KnownMinion = {
      playerId,
      source: getsStartingInfo && state.evilTeamIntro!=="blocked" ? "demon_info" : "confirmed_later",
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

  function toggleStorytellerBluff(roleId: RoleId) {
    if (!getsStartingInfo) return;
    const current = state.storytellerBluffs;
    if (current.includes(roleId)) {
      onChange({ ...state, storytellerBluffs: current.filter((r) => r !== roleId) });
      return;
    }
    if (current.length >= 3) return;
    onChange({ ...state, storytellerBluffs: [...current, roleId] });
  }

  function setBluffPlan(playerId: string, roleId: RoleId | null) {
    onChange({
      ...state,
      bluffPlans: { ...state.bluffPlans, [playerId]: roleId },
    });
  }

  function saveAttack() {
    if (!attackMode || !selfAlive || (selfDemonId!=="ojo" && !attackTarget) || (selfDemonId==="ojo" && !ojoRole) || !nightOptions.includes(attackNight)) return;
    const old = actions.find((a) => a.when === attackNight);
    if (old && !window.confirm(`${attackNight}の襲撃対象は既に記録されています。置き換えますか？`)) return;
    const next: DemonActionEvent = {
      id: eventId(),
      roleId: selfDemonId as DemonActionEvent["roleId"],
      when: attackNight,
      target: attackTarget ?? "self",
      ...(selfDemonId==="ojo" && ojoRole ? {targetRole:ojoRole}:{}),
      note: attackNote.trim() || null,
    };
    onChangeActions([...actions.filter((a) => a.when !== attackNight), next]);
    setAttackTarget(null); setOjoRole(null);
    setAttackNote("");
  }

  function opponentClaimersFor(roleId: RoleId) {
    return others.filter((p) => !known.has(p) && latestExactClaim(g, p) === roleId);
  }

  const teamPlanUsers = new Map<RoleId, string[]>();
  for (const [player, role] of Object.entries(state.bluffPlans)) {
    if (!role) continue;
    const list = teamPlanUsers.get(role) ?? [];
    list.push(player);
    teamPlanUsers.set(role, list);
  }

  const bluffRows = GOOD_ROLES.map((role) => {
    const claimers = opponentClaimersFor(role.id);
    const allyUsers = teamPlanUsers.get(role.id) ?? [];
    let status: BluffStatus = "unclaimed";
    if (state.storytellerBluffs.includes(role.id)) status = "storyteller";
    else if (claimers.length) status = "opponent";
    else if (allyUsers.length) status = "ally";
    return { role, status, claimers, allyUsers };
  }).sort((a, b) => {
    const order: Record<BluffStatus, number> = { storyteller: 0, unclaimed: 1, ally: 2, opponent: 3 };
    return order[a.status] - order[b.status] || a.role.name.localeCompare(b.role.name, "ja");
  });

  const teamMembers = ["self", ...(selfDemonId === "legion" ? (state.legionAllies??[]) : state.knownMinions.map((m) => m.playerId))];

  const attackHint = (() => {
    if (!attackTarget) return null;
    if (attackTarget === "self") {
      if (!impMode) return `${selfDemon.name} が自分を選ぶと、通常は自分が死亡します。`;
      const livingKnown = state.knownMinions.filter((m) => g.playerStatus[m.playerId]?.alive !== false);
      const knownScarlet = livingKnown.find((m) => m.roleId === "scarlet_woman");
      if (knownScarlet) return `自分への襲撃 = スターパス。緋色の女が能力を使える状態で5人以上生存なら、${person(g, knownScarlet.playerId)} が先にインプになります。`;
      return livingKnown.length
        ? `自分への襲撃 = スターパス。記録上の生存中の手下候補: ${livingKnown.map((m) => person(g, m.playerId)).join(" / ")}`
        : "自分への襲撃 = スターパス。生存中の手下がいない場合は継承できません。";
    }
    if (g.playerStatus[attackTarget]?.alive === false) return "死亡済みプレイヤーへの襲撃です。新しい死亡は発生せず、キルを沈める記録として扱います。";
    const claim = latestExactClaim(g, attackTarget);
    if (selfDemonId === "fang_gu" && claim && ROLES[claim].type === "outsider") return "アウトサイダー主張への襲撃です。このゲームでまだファン・グー移動が起きていなければ、死亡時に相手が悪のファン・グーになり、自分が代わりに死亡します。";
    if (selfDemonId === "vigormortis" && known.has(attackTarget)) return "味方の手下への襲撃です。本物のヴィゴモルティスなら、その手下は死亡後も能力を持ち、隣接する町人1人を毒にします。";
    if (known.has(attackTarget)) return "登録済みの味方の手下を襲撃します。作戦上必要か確認してください。";
    if (claim === "soldier") return "兵士主張への襲撃です。健康な本物なら死亡しません。";
    if (claim === "ravenkeeper") return "鴉飼い主張への襲撃です。本物なら死亡時に情報を得る可能性があります。";
    if (claim === "mayor") return "市長主張への襲撃です。本物なら別のプレイヤーが死亡する可能性があります。";
    return null;
  })();

  return (
    <>
      <h2>デーモンモード</h2>
      <DamselFinder g={g} result={result} viewer="demon"/>
      <div className="evil-mode-banner">
        <strong>{selfDemon.symbol} {selfDemon.name}</strong>
        <span>{attackMode ? "悪チーム用の秘密情報・ブラフ・襲撃記録" : "悪チーム用の秘密情報・ブラフ計画"}</span>
      </div>

      <section className="evil-section">
        <h3>{selfDemonId === 'legion' ? '仲間のレギオン' : '悪チーム'}</h3>
        {selfDemonId === 'legion' ? <>
          <p className="panel-note">レギオンはプレイヤーの大半が悪のデーモンです。手下を選ぶ通常の画面ではなく、把握した仲間を記録してください。自分の知識だけを記録し、推理上のメモと区別します。</p>
          <div className="player-toggle-grid">{others.map(player=><button type="button" key={player} className={known.has(player)?'player-toggle selected evil-selected':'player-toggle'} onClick={()=>onChange({...state,legionAllies:known.has(player)?(state.legionAllies??[]).filter(p=>p!==player):[...(state.legionAllies??[]),player]})}>{person(g,player)}</button>)}</div>
          <p className="panel-note">ほかの悪陣営だけが挙手した処刑投票では処刑が成立しません。票数・役職主張を使って誰を疑わせるか検討できます。</p>
        </> : <>
        {marionettePossible && <section className="evil-section">
          <h3>マリオネットを知っている場合</h3>
          <p className="panel-note">マリオネットは自分の左右どちらかの隣席にいる悪の手下ですが、本人には善の役職が配られています。デーモンとして実際に教わった場合のみ記録してください。</p>
          <div className="player-toggle-grid">{adjacentToSelf.map(p=><button type="button" key={p} className={state.knownMarionette===p?'player-toggle selected evil-selected':'player-toggle'} onClick={()=>onChange({...state,knownMarionette:state.knownMarionette===p?null:p})}>{person(g,p)}</button>)}</div>
          {state.knownMarionette&&<p>記録済み：{person(g,state.knownMarionette)}</p>}
        </section>}
        {boffinPossible && <section className="evil-section">
          <h3>ボフィンから借りた善役職の能力</h3>
          <p className="panel-note">ボフィンが生きて能力を使える間、デーモンは未登場の善役職の能力を持ちます。デーモン本人が毒・酔いでもこの追加能力は働きます。</p>
          <select value={state.boffinGrantedAbility??''} onChange={e=>onChange({...state,boffinGrantedAbility:e.target.value?e.target.value as RoleId:null})}><option value="">未確認・なし</option>{GOOD_ROLES.map(r=><option key={r.id} value={r.id}>{r.symbol} {r.name}</option>)}</select>
        </section>}
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
            {selfDemonId === "kazali" ? "カザリは初夜に手下にするプレイヤーと役職を選びます。" : "7人以上では、初夜にデーモンが手下のプレイヤーを知ります。役職そのものはここでは確定しません。"}
            {` ${state.knownMinions.length}/${magicianPossible ? `${minionCount}〜${displayedMinionCap}` : minionCount}人登録`}
            {magicianPossible ? " 魔術師が混じっている場合、追加の1人は善陣営です。誰が本物の手下か、この表示だけでは分かりません。" : ""}
          </p>
        ) : (
          <p className="panel-note">
            5〜6人では開始時にデーモンと手下は互いを知りません。ここには後から確定した味方だけ登録します。
          </p>
        )}
        <div className="player-toggle-grid">
          {others.map((player) => (
            <button
              key={player}
              type="button"
              className={known.has(player) ? "player-toggle selected evil-selected" : "player-toggle"}
              onClick={() => toggleKnownMinion(player)}
            >
              {person(g, player)}
            </button>
          ))}
        </div>
        {state.knownMinions.length > 0 && (
          <div className="evil-team-list">
            {state.knownMinions.map((m) => {
              const claim = latestExactClaim(g, m.playerId);
              return (
                <div key={m.playerId} className="evil-team-row">
                  <strong>{person(g, m.playerId)}</strong>
                  <span>{claim ? `現在の主張: ${ROLES[claim].symbol} ${ROLES[claim].name}` : "現在の主張: 未記録"}</span>
                  <small>{m.source === "demon_info" ? (extraSeatShown ? "初夜の候補（魔術師の可能性）" : "初夜のデーモン情報") : "後から味方と確認"}</small>
                  <label className="evil-team-role-label">
                    味方から実役職を確認した場合
                    <select
                      value={m.roleId ?? ""}
                      onChange={(e) => setKnownMinionRole(m.playerId, e.target.value ? (e.target.value as RoleId) : null)}
                    >
                      <option value="">未確認</option>
                      {MINION_ROLES.map((role) => {
                        const usedByOther = state.knownMinions.some((x) => x.playerId !== m.playerId && x.roleId === role.id);
                        return (
                          <option key={role.id} value={role.id} disabled={usedByOther}>
                            {role.symbol} {role.name}{usedByOther ? " — 他の味方で確認済み" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                </div>
              );
            })}
          </div>
        )}
        </>}
      </section>

      {selfDemonId === 'lord_of_typhon' && <section className="evil-section">
        <h3>手下の役職予想</h3>
        <p className="panel-note">タイフォン卿は開始時に手下が左右に並んだ連続した線の真ん中です（手下は通常より1人多い）。表示される座席は配置上の候補です。役職の割当は予想であり、推理の確定条件にしません。</p>
        <p className="panel-note">位置の候補: {typhonLayouts(allPlayers,'self',minionCount).map(xs=>xs.map(p=>person(g,p)).join('・')).join(' / ')}</p>
        {Array.from(new Set(typhonLayouts(allPlayers,'self',minionCount).flat())).map(player=><div className="evil-plan-row" key={player}>
          <label>{person(g,player)}</label>
          <select value={state.typhonPredictions?.[player]??''} onChange={e=>onChange({...state,typhonPredictions:{...(state.typhonPredictions??{}),[player]:e.target.value as RoleId||null}})}>
            <option value="">未推理</option>
            {MINION_ROLES.map(role=><option key={role.id} value={role.id}>{role.symbol} {role.name}</option>)}
          </select>
        </div>)}
      </section>}
      {selfDemonId === 'kazali' && <section className="evil-section"><h3>傀儡の作戦</h3><p className="panel-note">初夜に選んだ手下プレイヤーと役職は上の「悪チーム」から記録できます。手下人数は通常どおりで、アウトサイダー人数だけが不定です。選択は確定情報として扱います。</p></section>}

      {selfDemonId==='lleech' && <section className="evil-section">
        <h3>蛭（リーチ）：毒の宿主</h3>
        <p className="panel-note">最初の夜に1人を選び、相手はあなたが死亡するまで毒です。その人が生存する限り、健康なあなたは死亡できません。その人が死亡するとあなたも死亡します。実際に選んだ宿主のみ確定入力してください。</p>
        <div className="player-toggle-grid">{others.map(player=><button type="button" key={player} className={state.lleechHost===player?'player-toggle selected evil-selected':'player-toggle'} onClick={()=>onChange({...state,lleechHost:state.lleechHost===player?null:player})}>{person(g,player)}</button>)}</div>
      </section>}
      {selfDemonId==='lil_monsta' && <section className="evil-section">
        <h3>リルモンスター：抱き手の履歴</h3>
        <p className="panel-note">あなたの役職は手下です。リルモンスター自身はプレイヤーではなく、毎夜手下たちが抱き手を選びます。その人がデーモンとして登録されます。これは仲間用のメモであり、他陣営の推理に確定事実として公開しません。</p>
        {Array.from({length:g.night},(_,i)=>`N${i+1}`).map(when=><div className="form-section" key={when}><label>{when} の抱き手</label><select value={(state.lilMonstaBabysitters??[]).find(x=>x.when===when)?.playerId??''} onChange={e=>onChange({...state,lilMonstaBabysitters:[...(state.lilMonstaBabysitters??[]).filter(x=>x.when!==when),...(e.target.value?[{when,playerId:e.target.value}]:[])]})}><option value="">未確認</option>{allPlayers.map(p=><option key={p} value={p}>{person(g,p)}</option>)}</select></div>)}
      </section>}
      {selfDemonId==='al_hadikhia' && <section className="evil-section"><h3>アルハディキア</h3><p className="panel-note">毎夜3人を選び、生死の選択を公開で処理します。全員が生存を選ぶと全員死亡します。実際の死亡・復活は通常の履歴に記録してください。</p></section>}
      {selfDemonId==='riot' && <section className="evil-section"><h3>ライオット</h3><p className="panel-note">3日目に手下がライオットに変わります。指名による連続死亡と、その日だけの推理に集中してください。ライオットゲーム確認は推理画面にあります。</p></section>}
      {selfDemonId==='yaggababble' && <section className="evil-section"><h3>ヤガバブル</h3><p className="panel-note">この役職の秘密の台詞・発動回数はアプリには記録しません。一晩のデーモン死亡数が多い場合のみ弱い手掛かりとして扱います。</p></section>}
      {getSnapshotScriptRoleIds(g).includes("king") && (
        <section className="evil-section">
          <h3>王の正体</h3>
          <p className="panel-note">開始時から王がいる場合、デーモンには王のプレイヤーが知らされます。ここには開始時の王だけを登録してください。</p>
          <div className="player-toggle-grid">{others.map(player => (
            <button type="button" key={player} className={state.knownKing === player ? "player-toggle selected evil-selected" : "player-toggle"} onClick={() => onChange({...state, knownKing: state.knownKing === player ? null : player})}>{person(g,player)}</button>
          ))}</div>
        </section>
      )}

      <section className="evil-section">
        <h3>ストーリーテラーからのブラフ</h3>
        {getsStartingInfo ? (
          <>
            <p className="panel-note">
              7人以上では3つの「ゲームに入っていない善側役職」を登録できます。ここは候補盤面の機械的制約として使います。
              {` ${state.storytellerBluffs.length}/3`}
            </p>
            <div className="role-grid">
              {GOOD_ROLES.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  className={state.storytellerBluffs.includes(role.id) ? "role-choice role-choice-selected evil-role-selected" : "role-choice"}
                  onClick={() => toggleStorytellerBluff(role.id)}
                >
                  <span className="role-choice-symbol">{role.symbol}</span>
                  <span className="role-choice-name">{role.name}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="panel-note">5〜6人の通常ルールでは開始時のデーモンブラフはありません。</p>
        )}
      </section>

      <section className="evil-section">
        <h3>味方のブラフ計画</h3>
        <p className="panel-note">これは作戦メモです。候補盤面を機械的に固定しません。</p>
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
                  {state.storytellerBluffs.includes(role.id)
                    ? " — ストーリーテラー確認済み"
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
          「ストーリーテラー確認済み」は確定で不在。「未主張」はまだ安全とは限りません。相手の現在の役職主張との衝突だけを見ています。
        </p>
        <div className="bluff-board">
          {bluffRows.map(({ role, status, claimers, allyUsers }) => (
            <div className={`bluff-row bluff-${status}`} key={role.id}>
              <span className="bluff-role"><strong>{role.symbol}</strong> {role.name}</span>
              <span className="bluff-status">
                {status === "unclaimed" && "未主張 / 不明"}
                {status === "storyteller" && "ストーリーテラー確認済み"}
                {claimers.length > 0 && `${status === "storyteller" ? " / " : ""}相手主張: ${claimers.map((p) => person(g, p)).join(" / ")}`}
                {allyUsers.length > 0 && `${status !== "unclaimed" || claimers.length > 0 ? " / " : ""}味方使用: ${allyUsers.map((p) => person(g, p)).join(" / ")}`}
              </span>
            </div>
          ))}
        </div>
      </section>

      {attackMode ? (
      <section className="evil-section">
        <h3>襲撃対象</h3>
        {selfDemonId === "fang_gu" && <p className="panel-note">ファン・グー：セットアップはアウトサイダー+1。最初に能力でアウトサイダーを死亡させた時だけ、その相手が悪のファン・グーになり、自分が代わりに死亡します。</p>}
        {selfDemonId === "vigormortis" && <p className="panel-note">ヴィゴモルティス：可能ならアウトサイダー-1。能力で死亡した手下は能力を保持し、その手下に最も近い町人の片側1人を毒にします。</p>}
        {selfDemonId === "no_dashii" && <p className="panel-note">ノー・ダッシ：自分から時計回り・反時計回りで最も近い町人が毒になります。死亡した町人も「最も近い」判定に含まれます。</p>}
        {selfDemonId === "lord_of_typhon" && <p className="panel-note">タイフォン卿は2夜目以降、毎夜1人を選んで殺します。</p>}
        {selfDemonId === "kazali" && <p className="panel-note">カザリは2夜目以降、毎夜1人を選んで殺します。</p>}
        {selfDemonId === "vortox" && <p className="panel-note">ヴォートックス：町人の能力情報は必ず偽になります。さらに各日、誰も処刑されなければ夕暮れに悪が勝利します。</p>}
        {!selfAlive ? (
          <p className="panel-note">現在死亡しているため、新しい襲撃は記録できません。</p>
        ) : nightOptions.length === 0 ? (
          <p className="panel-note">デーモンは初夜には襲撃しません。N2以降に記録できます。</p>
        ) : (
          <>
            <div className="form-section">
              <label>いつ</label>
              <select value={attackNight} onChange={(e) => setAttackNight(e.target.value)}>
                {nightOptions.map((phase) => <option key={phase} value={phase}>{phase}</option>)}
              </select>
            </div>
            {selfDemonId==='ojo' ? <div className="form-section"><label>指定した役職（プレイヤーではありません）</label><select value={ojoRole??''} onChange={e=>setOjoRole((e.target.value||null) as RoleId|null)}><option value="">役職を選んでください</option>{scriptRoles.map(role=><option key={role.id} value={role.id}>{role.symbol} {role.name}</option>)}</select><p className="panel-note">指定役職が不在ならストーリーテラーが死亡対象を自由に選べます。プレイヤーを選ぶ欄は使いません。</p></div> : <><div className="claim-option-title">選んだ相手</div>
            <div className="player-toggle-grid">
              {allPlayers.map((player) => (
                <button
                  key={player}
                  type="button"
                  className={attackTarget === player ? "player-toggle selected evil-selected" : "player-toggle"}
                  onClick={() => setAttackTarget(attackTarget === player ? null : player)}
                >
                  {person(g, player)}{g.playerStatus[player]?.alive === false ? " †" : ""}
                </button>
              ))}
            </div>
            {attackHint && <p className="panel-note demon-target-hint">{attackHint}</p>}</>}
            <div className="form-section">
              <label>作戦メモ（任意）</label>
              <textarea value={attackNote} maxLength={500} onChange={(e) => setAttackNote(e.target.value)} placeholder="例：兵士ブラフ用に死者を選択、N3でスターパス予定" />
            </div>
            <button className="menu-option confirm-claim-button evil-confirm" disabled={!selfAlive || (selfDemonId==='ojo'?!ojoRole:!attackTarget) || !nightOptions.includes(attackNight)} onClick={saveAttack}>
              襲撃を記録
            </button>
          </>
        )}

        {selfDemonId!=="ojo" && suggestions.length > 0 && (
          <div className="target-suggestions">
            <h4>標的候補</h4>
            <p className="panel-note">役職主張と現在の候補盤面から作る軽い優先候補です。兵士・鴉飼い系の餌主張は下げています。</p>
            {suggestions.map((s) => (
              <button key={s.player} className="target-suggestion" onClick={() => setAttackTarget(s.player)}>
                <strong>{person(g, s.player)}</strong>
                <span>{s.reasons.join(" / ") || "比較材料が少ない"}</span>
              </button>
            ))}
          </div>
        )}

        {actions.length > 0 && (
          <div className="claim-history">
            <div className="claim-history-title">襲撃履歴</div>
            {[...actions].sort((a, b) => Number(b.when.slice(1)) - Number(a.when.slice(1))).map((a) => (
              <div className="demon-action-row" key={a.id}>
                <div><strong>{a.when}</strong> → {person(g, a.target)}</div>
                <small>{publicNightResult(g, a)}</small>
                {a.note && <span>{a.note}</span>}
                <button
                  type="button"
                  className="mini-danger-button"
                  onClick={() => {
                    if (window.confirm(`${a.when}の襲撃記録を削除しますか？`)) onChangeActions(actions.filter((x) => x.id !== a.id));
                  }}
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      ) : (
        <section className="evil-section">
          <h3>専用能力</h3>
          {selfDemonId==='legion' ? <p className="panel-note">レギオンの夜死亡はストーリーテラーが決めます。あなたは襲撃対象を選びません。挙手・情報・役職主張を観察し、誰を処刑候補にするか、善陣営が互いを疑う構図を分析してください。</p>
          : selfDemonId==='leviathan' ? <p className="panel-note">リヴァイアサンは夜に殺しません。善陣営を2人処刑するか、5日目を超えると悪の勝利です。開始時の公式宣言によって推理にも反映されます。</p>
          : <p className="panel-note">{selfDemon.name} の専用能力は現在「汎用推理」で扱います。</p>}
        </section>
      )}

      <button className="menu-option" onClick={onBack}>戻る</button>
    </>
  );
}
