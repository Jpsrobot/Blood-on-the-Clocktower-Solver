import { ROLES, type RoleId } from "../roles";
import { getSnapshotScriptRoleIds } from "../scripts";
import type {
  ClaimVisibility,
  GameSnapshot,
  RoleClaimEvent,
  AbilityClaimEvent,
  StructuredInfo,
} from "../types";
import type { HistoryWorld, SearchOptions } from "./model";
import {
  cycle,
  diedByExecution,
  exactClaim,
  isAliveAt,
  phaseIndex,
  seats,
  seatingOrderAt,
} from "./game";
import {
  alignmentOptions,
  canRegisterRole,
  infoMatches,
  type RegistrationContext,
} from "./mechanics";
import { runSearch } from "./search";

export type SpyFalseInfoKind =
  | "pairRole"
  | "noOutsiders"
  | "number"
  | "pairYesNo"
  | "roleReveal"
  | "pairNumber";

export type SpyFalseInfoSuggestion = {
  roleId: RoleId;
  when: string;
  kind: SpyFalseInfoKind;
  players?: string[];
  shownRole?: RoleId;
  value?: number;
  result?: "yes" | "no";
  supportedAssignments: number;
  effectiveWorlds: number;
  supportWeight: number;
  knownDemonGoodShare: number | null;
  knownDemonGoodWeight: number | null;
  scapegoatDemonShare: number | null;
  scapegoatDemonWeight: number | null;
  scapegoatPlayerId: string | null;
  strategyScore: number;
};

export type SpyBluffCandidate = {
  roleId: RoleId;
  supportedAssignments: number;
  effectiveWorlds: number;
  supportWeight: number;
  goodFacadeWeight: number;
  actualRoleWeight: number;
  drunkWeight: number;
  evilBluffWeight: number;
  knownDemonGoodShare: number | null;
  knownDemonGoodWeight: number | null;
  scapegoatDemonShare: number | null;
  scapegoatDemonWeight: number | null;
  scapegoatPlayerId: string | null;
  strategyScore: number;
  falseInfo: SpyFalseInfoSuggestion | null;
  sharedStorytellerBluff: boolean;
  spyShownAbsent: boolean;
  spyShownInPlayAt: string | null;
  opponentClaimers: string[];
  allyUsers: string[];
  safeEligible: boolean;
};

export type SpyBluffAdvisorResult = {
  generatedAt: number;
  baseChecked: number;
  baseUnique: number;
  baseEffectiveWorlds: number;
  representedWorlds: number;
  representedWeight: number;
  truncated: boolean;
  deep: boolean;
  spyDisplayComplete: boolean;
  spyDisplayCoverage: number;
  knownDemonPlayerId: string | null;
  scapegoatPlayers: Array<{ playerId: string; roleId: RoleId; source: "grimoire" | "claim" }>;
  recommendedRoleId: RoleId | null;
  rawWorldWinnerRoleId: RoleId | null;
  candidates: SpyBluffCandidate[];
};

type WeightedSubset = {
  supportedAssignments: number;
  effectiveWorlds: number;
  supportWeight: number;
  knownDemonGoodShare: number | null;
  knownDemonGoodWeight: number | null;
  scapegoatDemonShare: number | null;
  scapegoatDemonWeight: number | null;
  scapegoatPlayerId: string | null;
};

type FalseInfoDraft = {
  roleId: RoleId;
  when: string;
  kind: SpyFalseInfoKind;
  players?: string[];
  shownRole?: RoleId;
  value?: number;
  result?: "yes" | "no";
};

function knownEvilPlayers(g: GameSnapshot): Set<string> {
  const result = new Set<string>(["self"]);
  const state = g.minionState;
  if (state?.knownDemon?.playerId) result.add(state.knownDemon.playerId);
  for (const minion of state?.knownMinions ?? []) result.add(minion.playerId);
  return result;
}

function collectiveGoodCanKnow(
  visibility: ClaimVisibility,
  recipients: string[],
  knownEvil: ReadonlySet<string>
): boolean {
  if (visibility === "public") return true;
  return recipients.some((player) => player !== "self" && !knownEvil.has(player));
}

/**
 * Build a counterfactual "good team" view of the current game.
 * Secret evil-role knowledge, Grimoire contents, evil actions, our private reads,
 * and our current planned bluff are deliberately removed. Public mechanical
 * events remain. Private claims are kept only if at least one known-good/unknown
 * player received them, approximating a fully cooperating good team.
 */
export function buildEvilOpponentProjection(g: GameSnapshot, keepSelfPublic = true): GameSnapshot {
  const knownEvil = knownEvilPlayers(g);

  const roleClaimLog: RoleClaimEvent[] = g.roleClaimLog
    .filter((claim) => keepSelfPublic || claim.playerId !== "self")
    .filter((claim) => collectiveGoodCanKnow(claim.visibility, claim.recipients, knownEvil))
    .map((claim) => ({ ...claim, claimType: "normal" as const }));

  const abilityClaimLog: AbilityClaimEvent[] = g.abilityClaimLog
    .filter((claim) => keepSelfPublic || (claim.playerId !== "self" && claim.sourcePlayerId !== "self"))
    .filter((claim) => collectiveGoodCanKnow(claim.visibility, claim.recipients, knownEvil));

  return {
    ...g,
    selfRole: { shownRole: null },
    selfInfoLog: [],
    selfActionLog: [],
    demonState: { knownMinions: [], storytellerBluffs: [], bluffPlans: {} },
    demonActionLog: [],
    minionState: {
      knownDemon: null,
      knownMinions: [],
      sharedStorytellerBluffs: [],
      bluffPlans: {},
      spyInitialRoles: {},
      spyRedHerring: null,
      becameDemonAt: null,
    },
    minionActionLog: [],
    manualReads: {},
    roleClaimLog,
    abilityClaimLog,
  };
}

export function buildSpyOpponentProjection(g: GameSnapshot): GameSnapshot {
  return buildEvilOpponentProjection(g, false);
}

function assignmentKey(world: HistoryWorld, order: string[]): string {
  return order.map((player) => world.initial[player]).join("|");
}

function supportKind(world: HistoryWorld, roleId: RoleId): "actual" | "drunk" | "evil" | null {
  const actual = world.current.self;
  if (actual === roleId) return "actual";
  if (
    actual === "drunk" &&
    ROLES[roleId].type === "townsfolk" &&
    !Object.values(world.current).includes(roleId)
  ) return "drunk";
  if (world.currentAlignment.self === "evil") return "evil";
  return null;
}

function latestCollectiveClaimers(g: GameSnapshot, roleId: RoleId): string[] {
  const projection = buildSpyOpponentProjection(g);
  const order = seats(g.playerCount);
  return order.filter((player) => player !== "self" && exactClaim(projection, player) === roleId);
}

function advisorFlags(g: GameSnapshot, roleId: RoleId) {
  const state = g.minionState;
  const entered = {
    self: "spy" as RoleId,
    ...Object.fromEntries(
      Object.entries(state?.spyInitialRoles ?? {}).filter(([, role]) => !!role)
    ),
  } as Record<string, RoleId>;
  const coverage = Object.keys(entered).filter((player) => seats(g.playerCount).includes(player)).length;
  const complete = coverage === g.playerCount;
  const inPlayAt = Object.entries(entered).find(([, role]) => role === roleId)?.[0] ?? null;
  const allyUsers = Object.entries(state?.bluffPlans ?? {})
    .filter(([player, role]) => player !== "self" && role === roleId)
    .map(([player]) => player);
  const opponentClaimers = latestCollectiveClaimers(g, roleId);
  const shared = (state?.sharedStorytellerBluffs ?? []).includes(roleId);
  const shownAbsent = complete && !inPlayAt;
  const safeEligible = allyUsers.length === 0 && opponentClaimers.length === 0 && !inPlayAt;
  return {
    coverage,
    complete,
    inPlayAt,
    allyUsers,
    opponentClaimers,
    shared,
    shownAbsent,
    safeEligible,
  };
}

function spyScapegoatPlayers(g: GameSnapshot): Array<{ playerId: string; roleId: RoleId; source: "grimoire" | "claim" }> {
  const knownDemon = g.minionState?.knownDemon?.playerId ?? null;
  const result: Array<{ playerId: string; roleId: RoleId; source: "grimoire" | "claim" }> = [];
  const targetRoles = new Set<string>(["saint", "goblin"]);
  for (const [playerId, roleId] of Object.entries(g.minionState?.spyInitialRoles ?? {})) {
    if (!roleId || playerId === knownDemon || !targetRoles.has(roleId)) continue;
    result.push({ playerId, roleId, source: "grimoire" });
  }
  const projection = buildSpyOpponentProjection(g);
  for (const playerId of seats(g.playerCount)) {
    if (playerId === "self" || playerId === knownDemon || result.some((entry) => entry.playerId === playerId)) continue;
    const roleId = exactClaim(projection, playerId);
    if (roleId && targetRoles.has(roleId)) result.push({ playerId, roleId, source: "claim" });
  }
  return result;
}

function roleStateAt(world: HistoryWorld, when: string): Record<string, RoleId> {
  const roles = { ...world.initial };
  const changes = [...world.changes].sort((a, b) => phaseIndex(a.when) - phaseIndex(b.when));
  for (const change of changes) {
    if (phaseIndex(change.when) > phaseIndex(when)) break;
    if (change.kind === "pit_hag" || change.kind === "cacklejack" || change.kind === "engineer" || change.kind === "farmer") roles[change.playerId] = change.toRole;
    else if (change.kind === "snake_charmer") { roles[change.snake] = change.demonRole; roles[change.demon] = "snake_charmer"; }
    else if (change.kind === "fang_gu") roles[change.newDemon] = "fang_gu";
    else if (change.kind === "scarlet" || change.kind === "starpass") roles[change.to] = "imp";
  }
  return roles;
}

function alignmentStateAt(world: HistoryWorld, when: string): HistoryWorld["currentAlignment"] {
  const alignment = { ...world.initialAlignment };
  for (const change of [...world.changes].sort((a,b)=>phaseIndex(a.when)-phaseIndex(b.when))) {
    if (phaseIndex(change.when) > phaseIndex(when)) break;
    if (change.kind === "snake_charmer") {
      const a = alignment[change.snake], b = alignment[change.demon];
      alignment[change.snake] = b; alignment[change.demon] = a;
    } else if (change.kind === "fang_gu") {
      alignment[change.newDemon] = "evil";
    }
  }
  return alignment;
}

function contextAt(world: HistoryWorld, g: GameSnapshot, when: string): RegistrationContext {
  const order = seatingOrderAt(g, when);
  const roles = when === "N1" ? { ...world.initial } : roleStateAt(world, when);
  const alignment = when === "N1" ? { ...world.initialAlignment } : alignmentStateAt(world, when);
  const alive = new Set(order.filter((player) => when === "N1" || isAliveAt(g, player, when, Infinity)));
  const n = cycle(when);
  return {
    roles,
    initial: world.initial,
    alignment,
    alive,
    poisonTarget: world.poison[n] ?? null,
    redHerring: world.redHerring,
    order,
  };
}

function pairCombinations(players: string[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) pairs.push([players[i], players[j]]);
  }
  return pairs;
}

function falseInfoDrafts(g: GameSnapshot, roleId: RoleId): FalseInfoDraft[] {
  if (!ROLES[roleId].tags.includes("INFO_SOURCE")) return [];
  const scriptIds = getSnapshotScriptRoleIds(g);
  const order = seats(g.playerCount);
  const others = order.filter((player) => player !== "self");
  const currentNight = Math.max(1, g.night);
  const currentWhen = `N${currentNight}`;
  const drafts: FalseInfoDraft[] = [];
  const rolesOfType = (type: "townsfolk" | "outsider" | "minion" | "demon") =>
    scriptIds.filter((id) => ROLES[id].type === type);

  if (roleId === "washerwoman" || roleId === "librarian" || roleId === "investigator") {
    const shownRoles = roleId === "washerwoman"
      ? rolesOfType("townsfolk")
      : roleId === "librarian"
        ? rolesOfType("outsider")
        : rolesOfType("minion");
    for (const pair of pairCombinations(others)) {
      for (const shownRole of shownRoles) drafts.push({ roleId, when: "N1", kind: "pairRole", players: pair, shownRole });
    }
    if (roleId === "librarian") drafts.push({ roleId, when: "N1", kind: "noOutsiders" });
    return drafts;
  }

  if (roleId === "chef") {
    const maxPairs = Math.min(4, Math.floor(g.playerCount / 2));
    for (let value = 0; value <= maxPairs; value++) drafts.push({ roleId, when: "N1", kind: "number", value });
    return drafts;
  }

  if (roleId === "empath") {
    for (let value = 0; value <= 2; value++) drafts.push({ roleId, when: currentWhen, kind: "number", value });
    return drafts;
  }

  if (roleId === "fortune_teller") {
    for (const pair of pairCombinations(others)) {
      drafts.push({ roleId, when: currentWhen, kind: "pairYesNo", players: pair, result: "yes" });
      drafts.push({ roleId, when: currentWhen, kind: "pairYesNo", players: pair, result: "no" });
    }
    return drafts;
  }

  if (roleId === "undertaker") {
    if (currentNight < 2) return [];
    const previousDay = `D${currentNight - 1}`;
    const executed = g.deathLog.filter((death) => death.when === previousDay && diedByExecution(death)).at(-1)?.playerId;
    if (!executed) return [];
    for (const shownRole of scriptIds) drafts.push({ roleId, when: currentWhen, kind: "roleReveal", players: [executed], shownRole });
    return drafts;
  }

  if (roleId === "ravenkeeper") {
    const death = [...g.deathLog]
      .filter((entry) => entry.playerId === "self" && entry.when.startsWith("N"))
      .sort((a, b) => phaseIndex(b.when) - phaseIndex(a.when))
      .at(0);
    if (!death) return [];
    for (const player of others) {
      for (const shownRole of scriptIds) drafts.push({ roleId, when: death.when, kind: "roleReveal", players: [player], shownRole });
    }
    return drafts;
  }

  if (roleId === "grandmother") {
    const goodRoles = scriptIds.filter((id) => ROLES[id].type === "townsfolk" || ROLES[id].type === "outsider");
    for (const player of others) {
      for (const shownRole of goodRoles) drafts.push({ roleId, when: "N1", kind: "roleReveal", players: [player], shownRole });
    }
    return drafts;
  }

  if (roleId === "chambermaid") {
    const aliveOthers = others.filter((player) => isAliveAt(g, player, currentWhen, Infinity));
    for (const pair of pairCombinations(aliveOthers)) {
      for (let value = 0; value <= 2; value++) drafts.push({ roleId, when: currentWhen, kind: "pairNumber", players: pair, value });
    }
    return drafts;
  }

  return drafts;
}

function draftStructuredInfo(draft: FalseInfoDraft): StructuredInfo | null {
  if (draft.kind === "pairRole" && draft.players?.length === 2 && draft.shownRole) {
    return { kind: "pairRole", players: [draft.players[0], draft.players[1]], shownRole: draft.shownRole };
  }
  if (draft.kind === "noOutsiders") return { kind: "noOutsiders" };
  if (draft.kind === "number" && draft.value !== undefined) return { kind: "number", value: draft.value };
  if (draft.kind === "pairYesNo" && draft.players?.length === 2 && draft.result) {
    return { kind: "pairYesNo", players: [draft.players[0], draft.players[1]], result: draft.result };
  }
  if (draft.kind === "roleReveal" && draft.players?.length === 1 && draft.shownRole) {
    return { kind: "roleReveal", player: draft.players[0], shownRole: draft.shownRole };
  }
  return null;
}

function chambermaidWakeCount(draft: FalseInfoDraft, world: HistoryWorld): number | null {
  if (draft.kind !== "pairNumber" || draft.players?.length !== 2 || draft.value === undefined) return null;
  const roles = roleStateAt(world, draft.when);
  const n = cycle(draft.when);
  let count = 0;
  for (const player of draft.players) {
    const role = ROLES[roles[player]];
    if (!role) continue;
    const wakes = n === 1 ? role.tags.includes("WAKES_FIRST_NIGHT") : role.tags.includes("WAKES_OTHER_NIGHTS");
    if (wakes) count++;
  }
  return count;
}

function falseInfoMatches(draft: FalseInfoDraft, world: HistoryWorld, g: GameSnapshot): boolean {
  const c = contextAt(world, g, draft.when);
  if (draft.roleId === "grandmother") {
    if (draft.kind !== "roleReveal" || !draft.players?.[0] || !draft.shownRole) return false;
    const player = draft.players[0];
    const actual = c.roles[player];
    if (!actual) return false;
    const canBeGood = alignmentOptions(player, c).includes(0);
    return canBeGood && canRegisterRole(actual, draft.shownRole, c.poisonTarget === player);
  }
  if (draft.roleId === "chambermaid") return chambermaidWakeCount(draft, world) === draft.value;
  const data = draftStructuredInfo(draft);
  return !!data && infoMatches(draft.roleId, "self", data, c);
}

function subsetStats(
  g: GameSnapshot,
  worlds: HistoryWorld[],
  rawWeights: number[],
  representedTotal: number,
  predicate: (world: HistoryWorld, index: number) => boolean,
  scapegoats: Array<{ playerId: string; roleId: RoleId; source: "grimoire" | "claim" }>,
): WeightedSubset {
  const order = seats(g.playerCount);
  const byAssignment = new Map<string, number>();
  let total = 0;
  let knownDemonGood = 0;
  const knownDemon = g.minionState?.knownDemon?.playerId ?? null;
  const scapegoatWeights = new Map<string, number>();

  worlds.forEach((world, index) => {
    if (!predicate(world, index)) return;
    const weight = rawWeights[index];
    total += weight;
    const key = assignmentKey(world, order);
    byAssignment.set(key, (byAssignment.get(key) ?? 0) + weight);
    if (knownDemon && world.currentAlignment[knownDemon] === "good") knownDemonGood += weight;
    for (const scapegoat of scapegoats) {
      if (ROLES[world.current[scapegoat.playerId]]?.type === "demon") {
        scapegoatWeights.set(scapegoat.playerId, (scapegoatWeights.get(scapegoat.playerId) ?? 0) + weight);
      }
    }
  });

  const assignmentWeights = [...byAssignment.values()];
  const square = assignmentWeights.reduce((sum, value) => sum + value * value, 0);
  let scapegoatPlayerId: string | null = null;
  let scapegoatDemon = 0;
  for (const [playerId, weight] of scapegoatWeights) {
    if (weight > scapegoatDemon) {
      scapegoatDemon = weight;
      scapegoatPlayerId = playerId;
    }
  }

  return {
    supportedAssignments: byAssignment.size,
    effectiveWorlds: square > 0 ? (total * total) / square : 0,
    supportWeight: total / representedTotal,
    knownDemonGoodShare: knownDemon && total > 0 ? knownDemonGood / total : null,
    knownDemonGoodWeight: knownDemon ? knownDemonGood / representedTotal : null,
    scapegoatDemonShare: scapegoatPlayerId && total > 0 ? scapegoatDemon / total : null,
    scapegoatDemonWeight: scapegoatPlayerId ? scapegoatDemon / representedTotal : null,
    scapegoatPlayerId,
  };
}

function strategyScore(stats: WeightedSubset, hasKnownDemon: boolean, hasScapegoat: boolean): number {
  const world = stats.supportWeight;
  const demon = stats.knownDemonGoodWeight ?? 0;
  const scapegoat = stats.scapegoatDemonWeight ?? 0;
  if (hasKnownDemon && hasScapegoat) return world * 0.45 + demon * 0.35 + scapegoat * 0.20;
  if (hasKnownDemon) return world * 0.55 + demon * 0.45;
  if (hasScapegoat) return world * 0.75 + scapegoat * 0.25;
  return world;
}

function bestFalseInfo(
  g: GameSnapshot,
  roleId: RoleId,
  worlds: HistoryWorld[],
  rawWeights: number[],
  representedTotal: number,
  scapegoats: Array<{ playerId: string; roleId: RoleId; source: "grimoire" | "claim" }>,
): SpyFalseInfoSuggestion | null {
  const drafts = falseInfoDrafts(g, roleId);
  if (!drafts.length) return null;
  const hasKnownDemon = !!g.minionState?.knownDemon?.playerId;
  const hasScapegoat = scapegoats.length > 0;
  let best: SpyFalseInfoSuggestion | null = null;

  for (const draft of drafts) {
    const stats = subsetStats(
      g,
      worlds,
      rawWeights,
      representedTotal,
      (world) => supportKind(world, roleId) !== null && falseInfoMatches(draft, world, g),
      scapegoats,
    );
    if (stats.supportWeight <= 0) continue;
    const score = strategyScore(stats, hasKnownDemon, hasScapegoat);
    const suggestion: SpyFalseInfoSuggestion = {
      ...draft,
      supportedAssignments: stats.supportedAssignments,
      effectiveWorlds: stats.effectiveWorlds,
      supportWeight: stats.supportWeight,
      knownDemonGoodShare: stats.knownDemonGoodShare,
      knownDemonGoodWeight: stats.knownDemonGoodWeight,
      scapegoatDemonShare: stats.scapegoatDemonShare,
      scapegoatDemonWeight: stats.scapegoatDemonWeight,
      scapegoatPlayerId: stats.scapegoatPlayerId,
      strategyScore: score,
    };
    if (
      !best ||
      suggestion.strategyScore > best.strategyScore ||
      (suggestion.strategyScore === best.strategyScore && suggestion.effectiveWorlds > best.effectiveWorlds) ||
      (suggestion.strategyScore === best.strategyScore && suggestion.effectiveWorlds === best.effectiveWorlds && suggestion.supportedAssignments > best.supportedAssignments)
    ) best = suggestion;
  }
  return best;
}

export function rankSpyBluffsFromSearch(
  g: GameSnapshot,
  worlds: HistoryWorld[],
  worldWeights?: number[]
): SpyBluffCandidate[] {
  const order = seats(g.playerCount);
  if (!worlds.length) return [];

  const rawWeights = worlds.map((world, index) => {
    const supplied = worldWeights?.[index];
    return supplied && supplied > 0 ? supplied : Math.exp(world.logScore);
  });
  const representedTotal = rawWeights.reduce((sum, value) => sum + value, 0) || 1;
  const scapegoats = spyScapegoatPlayers(g);
  const hasKnownDemon = !!g.minionState?.knownDemon?.playerId;
  const hasScapegoat = scapegoats.length > 0;

  const GOOD_ROLE_IDS = getSnapshotScriptRoleIds(g).filter(roleId => {
    const role = ROLES[roleId]; return role.type === "townsfolk" || role.type === "outsider";
  });

  const candidates = GOOD_ROLE_IDS.map((roleId) => {
    const byAssignment = new Map<string, { total: number; actual: number; drunk: number; evil: number }>();

    worlds.forEach((world, index) => {
      const kind = supportKind(world, roleId);
      if (!kind) return;
      const key = assignmentKey(world, order);
      const slot = byAssignment.get(key) ?? { total: 0, actual: 0, drunk: 0, evil: 0 };
      const weight = rawWeights[index];
      slot.total += weight;
      slot[kind] += weight;
      byAssignment.set(key, slot);
    });

    const assignmentWeights = [...byAssignment.values()].map((entry) => entry.total);
    const total = assignmentWeights.reduce((sum, value) => sum + value, 0);
    const square = assignmentWeights.reduce((sum, value) => sum + value * value, 0);
    const actual = [...byAssignment.values()].reduce((sum, entry) => sum + entry.actual, 0);
    const drunk = [...byAssignment.values()].reduce((sum, entry) => sum + entry.drunk, 0);
    const evil = [...byAssignment.values()].reduce((sum, entry) => sum + entry.evil, 0);
    const flags = advisorFlags(g, roleId);
    const roleStats = subsetStats(
      g,
      worlds,
      rawWeights,
      representedTotal,
      (world) => supportKind(world, roleId) !== null,
      scapegoats,
    );
    const falseInfo = ROLES[roleId].tags.includes("INFO_SOURCE")
      ? bestFalseInfo(g, roleId, worlds, rawWeights, representedTotal, scapegoats)
      : null;
    const strategic = falseInfo?.strategyScore ?? strategyScore(roleStats, hasKnownDemon, hasScapegoat);

    return {
      roleId,
      supportedAssignments: byAssignment.size,
      effectiveWorlds: square > 0 ? (total * total) / square : 0,
      supportWeight: total / representedTotal,
      goodFacadeWeight: total > 0 ? (actual + drunk) / total : 0,
      actualRoleWeight: total > 0 ? actual / total : 0,
      drunkWeight: total > 0 ? drunk / total : 0,
      evilBluffWeight: total > 0 ? evil / total : 0,
      knownDemonGoodShare: roleStats.knownDemonGoodShare,
      knownDemonGoodWeight: roleStats.knownDemonGoodWeight,
      scapegoatDemonShare: roleStats.scapegoatDemonShare,
      scapegoatDemonWeight: roleStats.scapegoatDemonWeight,
      scapegoatPlayerId: roleStats.scapegoatPlayerId,
      strategyScore: strategic,
      falseInfo,
      sharedStorytellerBluff: flags.shared,
      spyShownAbsent: flags.shownAbsent,
      spyShownInPlayAt: flags.inPlayAt,
      opponentClaimers: flags.opponentClaimers,
      allyUsers: flags.allyUsers,
      safeEligible: flags.safeEligible,
    };
  });

  return candidates.sort((a, b) =>
    b.strategyScore - a.strategyScore ||
    b.effectiveWorlds - a.effectiveWorlds ||
    b.supportedAssignments - a.supportedAssignments ||
    b.goodFacadeWeight - a.goodFacadeWeight ||
    ROLES[a.roleId].name.localeCompare(ROLES[b.roleId].name, "ja")
  );
}

export function runSpyBluffAdvisor(
  g: GameSnapshot,
  deep = false,
  progress?: (checked: number, unique: number) => void
): SpyBluffAdvisorResult {
  if (g.selfRole.shownRole !== "spy") {
    return {
      generatedAt: Date.now(),
      baseChecked: 0,
      baseUnique: 0,
      baseEffectiveWorlds: 0,
      representedWorlds: 0,
      representedWeight: 0,
      truncated: false,
      deep,
      spyDisplayComplete: false,
      spyDisplayCoverage: 0,
      knownDemonPlayerId: null,
      scapegoatPlayers: [],
      recommendedRoleId: null,
      rawWorldWinnerRoleId: null,
      candidates: [],
    };
  }

  const projected = buildSpyOpponentProjection(g);
  const options: Partial<SearchOptions> = deep
    ? { attempts: 12000, maxMillis: 11000, beamWidth: 4, seed: 81173, meta: false, worldLimit: 1800 }
    : { attempts: 4200, maxMillis: 4200, beamWidth: 3, seed: 81173, meta: false, worldLimit: 900 };
  const base = runSearch(projected, options, progress);
  const candidates = rankSpyBluffsFromSearch(g, base.worlds, base.worldWeights);
  const rawWinner = [...candidates].sort((a, b) =>
    b.effectiveWorlds - a.effectiveWorlds || b.supportedAssignments - a.supportedAssignments
  )[0]?.roleId ?? null;
  const safeWinner = candidates.find((candidate) => candidate.safeEligible)?.roleId ?? candidates[0]?.roleId ?? rawWinner;
  const state = g.minionState;
  const entered = {
    self: "spy" as RoleId,
    ...Object.fromEntries(
      Object.entries(state?.spyInitialRoles ?? {}).filter(([, role]) => !!role)
    ),
  } as Record<string, RoleId>;
  const coverage = Object.keys(entered).filter((player) => seats(g.playerCount).includes(player)).length;

  return {
    generatedAt: Date.now(),
    baseChecked: base.checked,
    baseUnique: base.unique,
    baseEffectiveWorlds: base.effectiveWorlds,
    representedWorlds: base.worlds.length,
    representedWeight: (base.worldWeights ?? []).reduce((sum, value) => sum + value, 0),
    truncated: base.truncated,
    deep,
    spyDisplayComplete: coverage === g.playerCount,
    spyDisplayCoverage: coverage / g.playerCount,
    knownDemonPlayerId: state?.knownDemon?.playerId ?? null,
    scapegoatPlayers: spyScapegoatPlayers(g),
    recommendedRoleId: safeWinner,
    rawWorldWinnerRoleId: rawWinner,
    candidates,
  };
}
