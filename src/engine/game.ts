import { ROLES, type RoleId } from "../roles";
import type { Alignment, GameSnapshot, RoleClaimEvent, SelfInfoEvent, SelfActionEvent, StructuredInfo, PlayerStatus } from "../types";
import type { Observation } from "./model";

export function cycle(when: string): number { return Number(when.slice(1)); }
export function phaseIndex(when: string): number { return (cycle(when) - 1) * 2 + (when.startsWith("D") ? 1 : 0); }
export function validPhase(when: string): boolean { return /^[ND][1-9]\d*$/.test(when); }
export function compareEvents(a: { when: string; id: number; order?: number }, b: { when: string; id: number; order?: number }): number {
  return phaseIndex(a.when) - phaseIndex(b.when) || (a.order ?? a.id) - (b.order ?? b.id);
}
export function seats(count: number): string[] {
  const left = Math.ceil((count - 1) / 2), right = Math.floor((count - 1) / 2);
  // Circular order, NOT the two columns concatenated. First and last are neighbours.
  return ["self", ...Array.from({ length: left }, (_, i) => `${i + 1}L`), ...Array.from({ length: right }, (_, i) => `${right - i}R`)];
}
export function seatingOrderAt(g: GameSnapshot, when: string, beforeId = Number.POSITIVE_INFINITY): string[] {
  const order = seats(g.playerCount);
  const swaps = (g.travellerActionLog ?? [])
    .filter((a): a is Extract<NonNullable<GameSnapshot["travellerActionLog"]>[number], { kind: "seat_swap" }> => a.kind === "seat_swap")
    .filter(a => phaseIndex(a.when) < phaseIndex(when) || (a.when === when && a.id < beforeId))
    .sort((a, b) => phaseIndex(a.when) - phaseIndex(b.when) || a.id - b.id);
  for (const swap of swaps) {
    const ai = order.indexOf(swap.playerA), bi = order.indexOf(swap.playerB);
    if (ai < 0 || bi < 0 || ai === bi) continue;
    [order[ai], order[bi]] = [order[bi], order[ai]];
  }
  return order;
}
export function setupCounts(count: number, baron = false) {
  const table: Record<number, [number, number, number]> = {5:[3,0,1],6:[3,1,1],7:[5,0,1],8:[5,1,1],9:[5,2,1],10:[7,0,2],11:[7,1,2],12:[7,2,2],13:[9,0,3],14:[9,1,3],15:[9,2,3]};
  const v = table[count];
  if (!v) throw new Error("標準の5〜15人ゲームのみ対応しています。");
  return { townsfolk: v[0] - (baron ? 2 : 0), outsider: v[1] + (baron ? 2 : 0), minion: v[2], demon: 1 };
}
export function setupCountsForRoles(count: number, roleIds: Iterable<RoleId>) {
  return setupCountOptionsForRoles(count, roleIds)[0];
}

/** Demon setup variants are mechanical possibilities, not role frequency priors. */
function demonSetupOptions(base: ReturnType<typeof setupCounts>, ids: RoleId[]): ReturnType<typeof setupCounts>[] | null {
  const total = base.townsfolk + base.outsider + base.minion + base.demon;
  // Lil' Monsta is not a player: one physical Minion is temporarily recorded
  // under its Demon-registration marker. Together these are normal Minions + 1.
  if (ids.includes("lil_monsta")) return [{...base}];
  if (ids.includes("summoner") && !ids.some(id => ROLES[id]?.type === "demon")) {
    // Summoner replaces the starting Demon with a Townsfolk. Other Minion
    // setup modifiers (notably Baron) still apply to those good slots.
    return setupCountOptionsForRoles(total,ids.filter(id=>id!=="summoner"))
      .map(count=>({...count,townsfolk:count.townsfolk+1,demon:0}));
  }
  if (ids.includes("xaan")) {
    // Xaan overrides Baron / other Outsider-count modifiers; X is the
    // starting Outsider count and can be zero.
    const slots=total-base.minion-base.demon;
    return Array.from({length:slots+1},(_,outsider)=>({townsfolk:slots-outsider,outsider,minion:base.minion,demon:base.demon}));
  }
  if (ids.includes("legion")) {
    const min = Math.floor(total/2)+1;
    const max = Math.max(min, Math.min(total-2, Math.ceil(total*.85)));
    return Array.from({length:max-min+1},(_,i)=>min+i).flatMap(demon =>
      Array.from({length:total-demon+1},(_,outsider)=>({townsfolk:total-demon-outsider,outsider,minion:0,demon})));
  }
  const extraMinion = ids.includes("lord_of_typhon") ? 1 : 0;
  if (ids.includes("lord_of_typhon") || ids.includes("kazali")) {
    const minion=base.minion+extraMinion;
    const goodSlots=total-1-minion;
    return Array.from({length:goodSlots+1},(_,outsider)=>({townsfolk:goodSlots-outsider,outsider,minion,demon:1}));
  }
  return null;
}

export function setupCountOptionsForRoles(count: number, roleIds: Iterable<RoleId>) {
  const base = setupCounts(count, false);
  const ids = [...new Set(roleIds)];
  const special=demonSetupOptions(base,ids);
  if(special)return special;
  const fixedDelta = ids.reduce((sum, id) => {
    const role = ROLES[id];
    if (!role?.tags.includes("OUTSIDER_COUNT_MODIFIER")) return sum;
    return sum + (role.outsiderCountDelta ?? 0);
  }, 0);
  let optionalDeltas = [0];
  for (const id of ids) {
    const role = ROLES[id];
    if (!role?.tags.includes("OUTSIDER_COUNT_MODIFIER") || !role.outsiderCountOptions?.length) continue;
    optionalDeltas = [...new Set(optionalDeltas.flatMap(a => role.outsiderCountOptions!.map(b => a + b)))];
  }
  return optionalDeltas.map(optionalDelta => {
    const requestedDelta = fixedDelta + optionalDelta;
    // Negative modifiers cannot remove Outsiders that do not exist. Townsfolk changes
    // by the actually-applied delta, preserving the standard total player count.
    const outsider = Math.max(0, base.outsider + requestedDelta);
    const appliedDelta = outsider - base.outsider;
    const townsfolk = base.townsfolk - appliedDelta;
    return { townsfolk, outsider, minion: base.minion, demon: base.demon };
  }).filter((value, index, values) => values.findIndex(other =>
    other.townsfolk === value.townsfolk && other.outsider === value.outsider && other.minion === value.minion && other.demon === value.demon
  ) === index);
}
export function alchemistAbilityRole(g: Pick<GameSnapshot, "selfRole" | "selfActionLog">): RoleId | null {
  if (g.selfRole.shownRole !== "alchemist") return null;
  return [...g.selfActionLog]
    .filter((a): a is Extract<SelfActionEvent, { roleId: "alchemist" }> => a.roleId === "alchemist" && a.kind === "minion_ability")
    .sort(compareEvents)
    .at(-1)?.minionRole ?? null;
}
export function amnesiacAbilityRole(g: Pick<GameSnapshot, "selfRole" | "selfActionLog">): RoleId | null {
  if (g.selfRole.shownRole !== "amnesiac") return null;
  return [...g.selfActionLog]
    .filter((a): a is Extract<SelfActionEvent, { roleId: "amnesiac"; kind: "lock_role" }> => a.roleId === "amnesiac" && a.kind === "lock_role")
    .sort(compareEvents)
    .at(-1)?.chosenRole ?? null;
}
export function setupCountsForGame(g: Pick<GameSnapshot, "playerCount" | "selfRole" | "selfActionLog">, roleIds: Iterable<RoleId>) {
  return setupCountOptionsForGame(g, roleIds)[0];
}

export function setupCountOptionsForGame(g: Pick<GameSnapshot, "playerCount" | "selfRole" | "selfActionLog">, roleIds: Iterable<RoleId>) {
  const base = setupCounts(g.playerCount, false);
  const ids = [...new Set(roleIds)];
  const special=demonSetupOptions(base,ids);
  if(special)return special;
  let fixedDelta = ids.reduce((sum, id) => {
    const role = ROLES[id];
    return sum + (role?.tags.includes("OUTSIDER_COUNT_MODIFIER") ? (role.outsiderCountDelta ?? 0) : 0);
  }, 0);
  let optionalDeltas = [0];
  for (const id of ids) {
    const role = ROLES[id];
    if (!role?.tags.includes("OUTSIDER_COUNT_MODIFIER") || !role.outsiderCountOptions?.length) continue;
    optionalDeltas = [...new Set(optionalDeltas.flatMap(a => role.outsiderCountOptions!.map(b => a + b)))];
  }
  // An Alchemist is still a Townsfolk, but a copied setup-changing Minion
  // ability happens in addition to the real characters in play. This extra
  // ability may duplicate an in-play Minion, so do not de-duplicate it.
  if (ids.includes("alchemist")) {
    const copied = alchemistAbilityRole(g);
    if (copied && ROLES[copied]?.type === "minion" && ROLES[copied].tags.includes("OUTSIDER_COUNT_MODIFIER")) {
      fixedDelta += ROLES[copied].outsiderCountDelta ?? 0;
      if (ROLES[copied].outsiderCountOptions?.length) {
        optionalDeltas = [...new Set(optionalDeltas.flatMap(a => ROLES[copied].outsiderCountOptions!.map(b => a + b)))];
      }
    }
  }
  return optionalDeltas.map(optionalDelta => {
    const outsider = Math.max(0, base.outsider + fixedDelta + optionalDelta);
    const appliedDelta = outsider - base.outsider;
    return { townsfolk: base.townsfolk - appliedDelta, outsider, minion: base.minion, demon: base.demon };
  }).filter((value, index, values) => values.findIndex(other =>
    other.townsfolk === value.townsfolk && other.outsider === value.outsider && other.minion === value.minion && other.demon === value.demon
  ) === index);
}
export function defaultAlignmentForRole(role: RoleId): Alignment { return ROLES[role].type === "minion" || ROLES[role].type === "demon" ? "evil" : "good"; }
export function evilRole(role: RoleId): boolean { return defaultAlignmentForRole(role) === "evil"; }
export function evilAlignment(alignment: Alignment): boolean { return alignment === "evil"; }
export function latestClaim(g: GameSnapshot, player: string, before?: string): RoleClaimEvent | null {
  return g.roleClaimLog.filter(c => c.playerId === player && (!before || phaseIndex(c.when) <= phaseIndex(before))).sort(compareEvents).at(-1) ?? null;
}
export function exactClaim(g: GameSnapshot, player: string, before?: string): RoleId | null {
  if (player === "self" && g.selfRole.shownRole) return g.selfRole.shownRole;
  const c = g.roleClaimLog.filter(c => c.playerId === player && c.subject.kind === "role" && (!before || phaseIndex(c.when) <= phaseIndex(before))).sort(compareEvents).at(-1);
  return c?.subject.kind === "role" ? c.subject.roleId : null;
}
export function priorRole(g: GameSnapshot, player: string): RoleId | null {
  if (player === "self" && g.selfRole.shownRole) return g.selfRole.shownRole;
  const c = g.roleClaimLog.filter(c => c.playerId === player && c.claimType !== "bluff" && c.subject.kind === "role").sort(compareEvents).at(-1);
  return c?.subject.kind === "role" ? c.subject.roleId : null;
}
export function bansheeAwakenedAt(g: GameSnapshot, player: string, when: string): boolean {
  const role = player === "self" ? g.selfRole.shownRole : priorRole(g, player);
  if (role !== "banshee") return false;
  const death = [...g.deathLog]
    .filter(d => d.playerId === player && d.when.startsWith("N") && phaseIndex(d.when) <= phaseIndex(when))
    .sort(compareEvents)
    .at(-1);
  if (!death) return false;
  if (death.sourceRoleId) return ROLES[death.sourceRoleId]?.type === "demon";
  // A generic night_death is the app's ordinary Demon-kill record. Non-Demon
  // night kills should be entered with their ability/source when known.
  return death.reason === "night_death";
}
export function diedByExecution(d: GameSnapshot["deathLog"][number]): boolean { return d.reason === "execution" || d.isExecution === true || d.sourceRoleId === "virgin"; }
export function isAliveAt(g: GameSnapshot, player: string, when: string, id = Infinity): boolean {
  let alive = true;
  const events = [
    ...g.deathLog.map(d => ({ ...d, kind: "death" as const })),
    ...(g.revivalLog ?? []).map(r => ({ ...r, kind: "revival" as const })),
  ].sort(compareEvents);
  for (const e of events) {
    if (e.playerId !== player) continue;
    const before = phaseIndex(e.when) < phaseIndex(when) || (e.when === when && (e.order ?? e.id) < id);
    if (!before) continue;
    alive = e.kind === "revival";
  }
  return alive;
}
export function livingNeighbours(order: string[], player: string, alive: ReadonlySet<string>): string[] {
  const i = order.indexOf(player); if (i < 0) return [];
  const result: string[] = [];
  for (const dir of [-1, 1]) for (let d = 1; d < order.length; d++) {
    const p = order[(i + dir * d + order.length) % order.length];
    if (alive.has(p)) { result.push(p); break; }
  }
  return [...new Set(result)];
}
export function rebuildStatus(g: GameSnapshot): Record<string, PlayerStatus> {
  const result = Object.fromEntries(seats(g.playerCount).map(p => [p, { alive: true, deadVoteAvailable: true }]));
  const events = [
    ...g.deathLog.map(d => ({ ...d, kind: "death" as const })),
    ...(g.revivalLog ?? []).map(r => ({ ...r, kind: "revival" as const })),
    ...g.nominationLog.map(n => ({ ...n, kind: "nomination" as const })),
    ...(g.travellerActionLog ?? []).filter(a => a.kind === "donation").map(a => ({ ...a, kind: "beggarDonation" as const })),
  ].sort(compareEvents);
  const voudonActiveAt = (when: string) => (g.travellers ?? []).some(t => {
    if (t.roleId !== "voudon" || phaseIndex(t.joinedWhen) > phaseIndex(when)) return false;
    if (t.exiledWhen && phaseIndex(t.exiledWhen) <= phaseIndex(when)) return false;
    if (t.exiled && t.exiledWhen && phaseIndex(when) < phaseIndex(t.exiledWhen)) return true;
    return t.active && t.alive;
  });
  for (const e of events) {
    if (e.kind === "death" && result[e.playerId]) result[e.playerId] = { alive: false, deadVoteAvailable: true };
    if (e.kind === "revival" && result[e.playerId]) result[e.playerId] = { alive: true, deadVoteAvailable: true };
    if (e.kind === "nomination" && e.votingOccurred !== false && !voudonActiveAt(e.when)) for (const p of e.voters) if (result[p] && !result[p].alive && !bansheeAwakenedAt(g, p, e.when)) result[p].deadVoteAvailable = false;
    if (e.kind === "beggarDonation" && result[e.donor] && !result[e.donor].alive) result[e.donor].deadVoteAvailable = false;
  }
  return result;
}
export function selfData(e: SelfInfoEvent): StructuredInfo | null {
  switch (e.roleId) {
    case "grandmother": return { kind: "grandmotherRead", player: e.player, shownRole: e.shownRole };
    case "chambermaid": return { kind: "chambermaidRead", players: e.players, number: e.number };
    case "godfather": return { kind: "godfatherOutsiders", roles: e.shownOutsiders };
    case "washerwoman": case "investigator": return { kind: "pairRole", players: e.players, shownRole: e.shownRole };
    case "librarian": return e.noOutsiders ? { kind: "noOutsiders" } : e.players && e.shownRole ? { kind: "pairRole", players: e.players, shownRole: e.shownRole } : null;
    case "chef": case "empath": case "clockmaker": case "oracle": case "mathematician": return { kind: "number", value: e.number };
    case "fortune_teller": return { kind: "pairYesNo", players: e.players, result: e.result };
    case "flowergirl": case "town_crier": return { kind: "singleYesNo", result: e.result };
    case "dreamer": return { kind: "dreamer", player: e.player, shownRoles: e.shownRoles };
    case "savant": return { kind: "savantPair", statements: e.statements };
    case "seamstress": return { kind: "pairAlignment", players: e.players, result: e.result };
    case "artist": return { kind: "artistAnswer", question: e.question, result: e.result };
    case "juggler": return { kind: "juggler", guessDay: e.guessDay, guesses: e.guesses, number: e.number };
    case "sage": return { kind: "sage", players: e.players };
    case "balloonist": case "bounty_hunter": case "high_priestess": case "choirboy": return { kind: "singlePlayer", player: e.player };
    case "king": return { kind: "singleRole", shownRole: e.shownRole };
    case "general": return { kind: "storytellerAssessment", result: e.result };
    case "fisherman": return { kind: "storytellerAdvice", advice: e.advice };
    case "knight": return { kind: "knight", players: e.players };
    case "noble": return { kind: "noble", players: e.players };
    case "pixie": return { kind: "singleRole", shownRole: e.shownRole };
    case "steward": return { kind: "singlePlayer", player: e.player };
    case "shugenja": return { kind: "shugenjaDirection", direction: e.direction };
    case "village_idiot": return { kind: "alignmentRead", player: e.player, result: e.result };
    case "undertaker": case "ravenkeeper": return { kind: "roleReveal", player: e.player, shownRole: e.shownRole };
  }
}
export function observations(g: GameSnapshot): Observation[] {
  const entries: Observation[] = [];
  for (const e of g.selfInfoLog) { const data = selfData(e); if (data) entries.push({ id: e.id, aliases: [e.id], source: "self", role: e.roleId, when: e.when, data, direct: true }); }
  for (const e of g.abilityClaimLog) if (e.structured && e.structured.kind !== "action") entries.push({ id: e.id, aliases: [e.id], source: e.sourcePlayerId || e.playerId, role: e.roleId, when: e.when, data: e.structured, direct: false });
  // Repeating the same report does NOT create additional evidence.
  const unique = new Map<string, Observation>();
  for (const e of entries) {
    const normalized = e.data.kind === "pairRole" || e.data.kind === "pairYesNo" || e.data.kind === "pairAlignment"
      ? {...e.data,players:[...e.data.players].sort()}
      : e.data.kind === "dreamer" ? {...e.data, shownRoles:[...e.data.shownRoles].sort()}
      : e.data.kind === "savantPair" ? {...e.data, statements:e.data.statements.map(s => s.kind === "roleAmong" ? {...s, players:[...s.players].sort()} : s)}
      : e.data.kind === "sage" ? {...e.data, players:[...e.data.players].sort()}
      : e.data.kind === "juggler" ? {...e.data, guesses:[...e.data.guesses].sort((a,b)=>`${a.player}:${a.roleId}`.localeCompare(`${b.player}:${b.roleId}`))}
      : e.data;
    const key = JSON.stringify([e.source, e.role, e.when, normalized]);
    const old = unique.get(key); if (old) { old.aliases.push(...e.aliases); old.direct ||= e.direct; } else unique.set(key, e);
  }
  return [...unique.values()].sort(compareEvents);
}

export type EmpathShiftSignal = {
  source: string;
  fromWhen: string;
  toWhen: string;
  fromValue: number;
  toValue: number;
  neighbours: string[];
  evidence: number[];
  direct: boolean;
  nights: number[];
};

/**
 * Finds consecutive Empath reads that changed even though the Empath had the
 * same two living neighbours and neither neighbour died between those reads.
 * This is only a heuristic signal: drunkenness/poison are strong explanations,
 * but custom scripts may contain alignment-changing effects or unimplemented
 * mechanics that can also explain the change.
 */
export function empathStableNeighbourShifts(g: GameSnapshot): EmpathShiftSignal[] {
  const baseOrder = seats(g.playerCount);
  const grouped = new Map<string, Map<string, Observation[]>>();
  for (const o of observations(g)) {
    if (o.role !== "empath" || o.data.kind !== "number") continue;
    const byWhen = grouped.get(o.source) ?? new Map<string, Observation[]>();
    byWhen.set(o.when, [...(byWhen.get(o.when) ?? []), o]);
    grouped.set(o.source, byWhen);
  }

  const aliveSetAt = (when: string) => new Set(baseOrder.filter(p => isAliveAt(g, p, when, Infinity)));
  const out: EmpathShiftSignal[] = [];
  for (const [source, byWhen] of grouped) {
    const records = [...byWhen.entries()].flatMap(([when, entries]) => {
      const values = [...new Set(entries.map(o => o.data.kind === "number" ? o.data.value : NaN))];
      if (values.length !== 1 || !Number.isFinite(values[0])) return [];
      return [{
        when,
        value: values[0],
        evidence: [...new Set(entries.flatMap(o => o.aliases))],
        direct: entries.some(o => o.direct),
      }];
    }).sort((a,b) => phaseIndex(a.when) - phaseIndex(b.when));

    for (let i = 1; i < records.length; i++) {
      const prev = records[i - 1], curr = records[i];
      if (prev.value === curr.value || phaseIndex(prev.when) === phaseIndex(curr.when)) continue;
      if (!isAliveAt(g, source, prev.when, Infinity) || !isAliveAt(g, source, curr.when, Infinity)) continue;
      const prevNeighbours = livingNeighbours(seatingOrderAt(g, prev.when), source, aliveSetAt(prev.when));
      const currNeighbours = livingNeighbours(seatingOrderAt(g, curr.when), source, aliveSetAt(curr.when));
      if (prevNeighbours.length !== 2 || currNeighbours.length !== 2) continue;
      const sameNeighbours = [...prevNeighbours].sort().join("|") === [...currNeighbours].sort().join("|");
      if (!sameNeighbours) continue;
      const start = phaseIndex(prev.when), end = phaseIndex(curr.when);
      const nearbyDeath = g.deathLog.some(d => prevNeighbours.includes(d.playerId) && phaseIndex(d.when) > start && phaseIndex(d.when) <= end);
      if (nearbyDeath) continue;
      out.push({
        source, fromWhen: prev.when, toWhen: curr.when,
        fromValue: prev.value, toValue: curr.value, neighbours: prevNeighbours,
        evidence: [...new Set([...prev.evidence, ...curr.evidence])],
        direct: prev.direct || curr.direct,
        nights: [...new Set([cycle(prev.when), cycle(curr.when)])],
      });
    }
  }
  return out;
}
export function dataValid(role: RoleId, data: StructuredInfo, playerCount: number): boolean {
  if (role === "grandmother") return data.kind === "grandmotherRead" && typeof data.player === "string" && !!ROLES[data.shownRole];
  if (role === "chambermaid") return data.kind === "chambermaidRead" && data.players.length === 2 && data.players[0] !== data.players[1] && Number.isInteger(data.number) && data.number >= 0 && data.number <= 2;
  if (role === "godfather") return data.kind === "godfatherOutsiders" && Array.isArray(data.roles) && new Set(data.roles).size === data.roles.length && data.roles.every(r => ROLES[r]?.type === 'outsider');
  if (role === "washerwoman" || role === "librarian" || role === "investigator") {
    if (role === "librarian" && data.kind === "noOutsiders") return true;
    return data.kind === "pairRole" && data.players[0] !== data.players[1] && ROLES[data.shownRole].type === (role === "washerwoman" ? "townsfolk" : role === "librarian" ? "outsider" : "minion");
  }
  if (role === "chef" || role === "empath" || role === "clockmaker" || role === "oracle" || role === "mathematician") {
    const max = role === "empath" ? 2 : role === "clockmaker" ? Math.floor(playerCount / 2) : role === "mathematician" ? Math.max(0, playerCount - 1) : playerCount;
    return data.kind === "number" && Number.isInteger(data.value) && data.value >= 0 && data.value <= max;
  }
  if (role === "fortune_teller") return data.kind === "pairYesNo" && data.players[0] !== data.players[1];
  if (role === "flowergirl" || role === "town_crier") return data.kind === "singleYesNo";
  if (role === "dreamer") {
    if (data.kind !== "dreamer" || data.shownRoles[0] === data.shownRoles[1]) return false;
    const groups = data.shownRoles.map(r => ROLES[r]?.type === "minion" || ROLES[r]?.type === "demon" ? "evil" : "good");
    return groups[0] !== groups[1];
  }
  if (role === "savant") return data.kind === "savantPair" && data.statements.length === 2 && data.statements.every(s => !!ROLES[s.roleId] && (s.kind === "roleInPlay" || (s.kind === "roleAmong" && s.players.length > 0 && new Set(s.players).size === s.players.length)));
  if (role === "seamstress") return data.kind === "pairAlignment" && data.players[0] !== data.players[1];
  if (role === "artist") return data.kind === "artistAnswer" && data.question.trim().length > 0 && ["yes","no","unknown"].includes(data.result);
  if (role === "juggler") {
    if (data.kind !== "juggler" || !/^D[1-9]\d*$/.test(data.guessDay) || data.guesses.length > 5 || !Number.isInteger(data.number) || data.number < 0 || data.number > data.guesses.length) return false;
    return new Set(data.guesses.map(g => `${g.player}:${g.roleId}`)).size === data.guesses.length && data.guesses.every(g => !!ROLES[g.roleId]);
  }
  if (role === "sage") return data.kind === "sage" && data.players[0] !== data.players[1];
  if (role === "knight") return data.kind === "knight" && data.players.length === 2 && new Set(data.players).size === 2;
  if (role === "noble") return data.kind === "noble" && data.players.length === 3 && new Set(data.players).size === 3;
  if (role === "pixie") return data.kind === "singleRole" && !!ROLES[data.shownRole] && ROLES[data.shownRole].type === "townsfolk";
  if (role === "steward") return data.kind === "singlePlayer" && typeof data.player === "string";
  if (role === "shugenja") return data.kind === "shugenjaDirection" && ["clockwise", "anticlockwise"].includes(data.direction);
  if (role === "village_idiot") return data.kind === "alignmentRead" && typeof data.player === "string" && ["good", "evil"].includes(data.result);
  if (["balloonist", "bounty_hunter", "high_priestess", "choirboy"].includes(role)) return data.kind === "singlePlayer" && typeof data.player === "string";
  if (role === "king") return data.kind === "singleRole" && !!ROLES[data.shownRole];
  if (role === "general") return data.kind === "storytellerAssessment" && ["good", "evil", "neither"].includes(data.result);
  if (role === "fisherman") return data.kind === "storytellerAdvice" && data.advice.trim().length > 0;
  if (role === "klutz") return data.kind === "klutzChoice" && typeof data.target === "string" && typeof data.teamLost === "boolean";
  if (role === "undertaker" || role === "ravenkeeper") return data.kind === "roleReveal";
  return data.kind === "action";
}
export function observationTimingValid(role: RoleId, when: string): boolean {
  if (!validPhase(when)) return false;
  if (role === "grandmother" || role === "godfather") return when === "N1";
  if (role === "chambermaid") return when.startsWith("N");
  if (role === "savant" || role === "artist" || role === "klutz" || role === "fisherman") return when.startsWith("D") || (role === "klutz" && when.startsWith("N"));
  if (!when.startsWith("N")) return false;
  if (role === "juggler" || role === "sage") return cycle(when) >= 2;
  if (["washerwoman","librarian","investigator","chef","clockmaker","knight","noble","pixie","shugenja","steward"].includes(role)) return when === "N1";
  if (["undertaker","flowergirl","town_crier","oracle","monk","imp"].includes(role)) return cycle(when) >= 2;
  return true;
}
export function observationTimingValidForGame(g: GameSnapshot, o: Observation): boolean {
  if (observationTimingValid(o.role, o.when)) return true;
  if (!o.direct || o.source !== "self" || g.selfRole.shownRole !== "philosopher") return false;
  const action = g.selfActionLog
    .filter((a): a is Extract<SelfActionEvent, { roleId: "philosopher" }> => a.roleId === "philosopher")
    .sort(compareEvents)
    .at(-1);
  if (!action || action.gainedRole !== o.role || action.when !== o.when) return false;
  return ["washerwoman","librarian","investigator","chef","clockmaker"].includes(o.role);
}
