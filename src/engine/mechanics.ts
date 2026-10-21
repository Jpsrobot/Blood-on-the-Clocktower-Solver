/**
 * Timeline mechanics. Trouble Brewing has the deepest coverage; later scripts
 * add exact mechanics incrementally. Tags alone never resolve an ability.
 * References and explicit model limits are in docs/RULES_AND_LIMITS.md.
 */
import { ROLES, type RoleId } from "../roles";
import { getSnapshotScriptRoleIds } from "../scripts";
import type { Alignment, GameSnapshot, StructuredInfo, DeathEvent, RevivalEvent, MinionActionEvent, SelfActionEvent } from "../types";
import type { HistoryWorld, InfoDisposition, Observation } from "./model";
import { baristaEffectFor, boneCollectorRestored } from "./travellerMechanics";
import { chambermaidWakeCountRange } from "../abilityTiming";
import { seats, seatingOrderAt, cycle, phaseIndex, compareEvents, defaultAlignmentForRole, setupCountOptionsForGame, amnesiacAbilityRole, alchemistAbilityRole, diedByExecution, livingNeighbours, observations, observationTimingValidForGame, dataValid, } from "./game";
import { isTyphonLayout, isLeviathanEnabled, isAlHadikhiaEnabled } from "./demonVariants";
import { resolveRecordedJinxVictory, automaticallyResolvedJinxVictory } from "./jinxVictory";

export type RegistrationContext = {
  when?: string;
  choirboyDemonInfo?: Record<string, string>;
  /** Holder registers as Demon without changing their role or alignment. */
  lilMonstaHolder?: string | null;
  /** Faux Paw: good player registered as evil while a healthy Lycanthrope lives. */
  registersEvil?: ReadonlySet<string>;
  roles: Record<string, RoleId>;
  initial: Record<string, RoleId>;
  /** Actual team alignment, independent of character. Optional only for legacy/test contexts. */
  alignment?: Record<string, Alignment>;
  alive: ReadonlySet<string>;
  poisonTarget: string | null;
  /** Additional persistent poison sources, such as the old Demon after a Snake Charmer swap. */
  poisoned?: ReadonlySet<string>;
  /** Drunken players from persistent effects such as Sweetheart / Philosopher. */
  drunk?: ReadonlySet<string>;
  /** Historical role view for events referenced by a later information ability. */
  eventRoles?: Record<string, RoleId>;
  redHerring: string | null;
  order: string[];
  /** Barista sober/healthy targets must receive literal true information, even under Vortox. */
  trueInfo?: ReadonlySet<string>;
};
function contextPoisoned(c: RegistrationContext, player: string): boolean {
  return c.poisonTarget === player || !!c.poisoned?.has(player);
}
function contextDrunk(c: RegistrationContext, player: string): boolean { return !!c.drunk?.has(player); }
function contextImpaired(c: RegistrationContext, player: string): boolean { return contextPoisoned(c, player) || contextDrunk(c, player); }
export function canRegisterRole(actual: RoleId, seen: RoleId, impaired = false): boolean {
  if (actual === seen) return true;
  if (impaired) return false;
  const type = ROLES[seen].type;
  return actual === "spy" ? type === "townsfolk" || type === "outsider" : actual === "recluse" ? type === "minion" || type === "demon" : actual === "legion" && type === "minion";
}
function registersAsDemon(p: string, c: RegistrationContext): boolean {
  // Lil' Monsta is a non-player token. Its present holder registers as Demon,
  // while the previous holder must not continue to register as Demon.
  if (c.lilMonstaHolder) return c.lilMonstaHolder === p;
  return ROLES[c.roles[p]]?.type === "demon";
}
function registeredAlignment(p: string, c: RegistrationContext): Alignment {
  if (c.registersEvil?.has(p)) return "evil";
  return c.alignment?.[p] ?? defaultAlignmentForRole(c.roles[p] ?? c.initial[p]);
}
export function alignmentOptions(p: string, c: RegistrationContext): number[] {
  const literalAlignment = registeredAlignment(p, c);
  const literal = literalAlignment === "evil" ? 1 : 0;
  if (!contextImpaired(c, p) && (c.roles[p] === "spy" || c.roles[p] === "recluse")) return [0, 1];
  return [literal];
}
export function chefRange(c: RegistrationContext): [number, number] {
  let min = 0, max = 0;
  for (let i = 0; i < c.order.length; i++) {
    const a = alignmentOptions(c.order[i], c), b = alignmentOptions(c.order[(i + 1) % c.order.length], c);
    // Registration may differ per PAIR. Do not give Recluse one global nightly alignment.
    const values = a.flatMap(x => b.map(y => x * y));
    min += Math.min(...values); max += Math.max(...values);
  }
  return [min, max];
}
function characterSide(role: RoleId): "good" | "evil" {
  const type = ROLES[role]?.type;
  return type === "minion" || type === "demon" ? "evil" : "good";
}
function circularDistance(order: string[], a: string, b: string): number {
  const ai = order.indexOf(a), bi = order.indexOf(b);
  if (ai < 0 || bi < 0) return Number.POSITIVE_INFINITY;
  const raw = Math.abs(ai - bi);
  return Math.min(raw, order.length - raw);
}
function clockmakerValue(c: RegistrationContext): number {
  const demons = c.order.filter(p => registersAsDemon(p,c));
  const minions = c.order.filter(p => ROLES[c.roles[p]]?.type === "minion");
  if (demons.length>1 && demons.every(p=>c.roles[p]==="legion") && !minions.length) return 1;
  if (!demons.length || !minions.length) return 0;
  return Math.min(...demons.flatMap(d => minions.map(m => circularDistance(c.order, d, m))));
}
/** Shugenja follows seated clockwise order, not the app's two-column visual layout.
 * A tie is arbitrary. Spy/Recluse can register either way, per observation. */
function shugenjaCanLearn(source: string, direction: "clockwise" | "anticlockwise", c: RegistrationContext, registration: boolean): boolean {
  const at=c.order.indexOf(source),size=c.order.length;
  if(at<0)return false;
  const flexible=c.order.filter(p=>p!==source && registration && alignmentOptions(p,c).length>1);
  const masks=Math.pow(2,Math.min(flexible.length,10));
  for(let mask=0;mask<masks;mask++) {
    const evil=new Set(c.order.filter(p=>p!==source && (
      flexible.includes(p) ? !!(mask & (1<<flexible.indexOf(p))) :
      (registration ? alignmentOptions(p,c)[0]===1 : registeredAlignment(p,c)==="evil")
    )));
    if(!evil.size)continue;
    let clockwise=Infinity,anticlockwise=Infinity;
    for(let step=1;step<size;step++) {
      if(evil.has(c.order[(at+step)%size]))clockwise=Math.min(clockwise,step);
      if(evil.has(c.order[(at-step+size)%size]))anticlockwise=Math.min(anticlockwise,step);
    }
    if(direction==="clockwise" ? clockwise<=anticlockwise : anticlockwise<=clockwise) return true;
  }
  return false;
}
function savantStatementTrue(statement: Extract<StructuredInfo, {kind:"savantPair"}>["statements"][number], c: RegistrationContext): boolean {
  if (statement.kind === "roleInPlay") return Object.values(c.roles).includes(statement.roleId);
  return statement.players.some(player => c.roles[player] === statement.roleId);
}
function savantPairMatches(data: Extract<StructuredInfo, {kind:"savantPair"}>, c: RegistrationContext): boolean {
  const values = data.statements.map(statement => savantStatementTrue(statement, c));
  return Number(values[0]) + Number(values[1]) === 1;
}
export function infoMatches(role: RoleId, source: string, data: StructuredInfo, c: RegistrationContext, g?: GameSnapshot, when?: string): boolean {
  if (role === "grandmother" && data.kind === "grandmotherRead") {
    return data.player !== source && !!c.roles[data.player] &&
      alignmentOptions(data.player, c).includes(0) &&
      canRegisterRole(c.roles[data.player], data.shownRole, contextImpaired(c, data.player));
  }
  if (role === "godfather" && data.kind === "godfatherOutsiders") {
    const inPlay = Object.values(c.roles).filter(r => ROLES[r].type === 'outsider').sort();
    return inPlay.length === data.roles.length && inPlay.every((r,i) => r === [...data.roles].sort()[i]);
  }
  if (role === "chambermaid" && data.kind === "chambermaidRead") {
    if (data.players.includes(source) || data.players[0] === data.players[1] ||
        data.players.some(p => !c.alive.has(p))) return false;
    // Definite passive/no-wake characters count zero. Compulsory night wakes
    // count one. Conditional or once-used wakes are left as a range.
    // Exorcist may stop a Demon waking, so a Demon wake is then not guaranteed.
    const night=when?.startsWith('N') ? Number(when.slice(1)) : 0;
    if (!night || !c.roles[data.players[0]] || !c.roles[data.players[1]]) return true;
    const [min,max]=chambermaidWakeCountRange(
      [c.roles[data.players[0]],c.roles[data.players[1]]],night,
      !!g && getSnapshotScriptRoleIds(g).includes('exorcist'));
    return data.number >= min && data.number <= max;
  }
  if (data.kind === "pairRole") return data.players.some(p => !!c.roles[p] && canRegisterRole(c.roles[p], data.shownRole, contextImpaired(c, p)));
  if (data.kind === "noOutsiders") return Object.entries(c.roles).every(([p, r]) => ROLES[r].type !== "outsider" || (r === "recluse" && !contextImpaired(c, p)));
  if (data.kind === "number" && role === "chef") { const [lo, hi] = chefRange(c); return data.value >= lo && data.value <= hi; }
  if (data.kind === "number" && role === "empath") {
    const ns = livingNeighbours(c.order, source, c.alive);
    if (ns.length === 0) return false;
    const opts = ns.map(p => alignmentOptions(p, c));
    return data.value >= opts.reduce((a, b) => a + Math.min(...b), 0) && data.value <= opts.reduce((a, b) => a + Math.max(...b), 0);
  }
  if (data.kind === "pairYesNo") {
    const definitelyYes = data.players.some(p => registersAsDemon(p,c) || p === c.redHerring);
    const optionallyYes = data.players.some(p => c.roles[p] === "recluse" && !contextImpaired(c, p));
    // A dead Imp remains the Imp. Death does not remove Demon registration.
    return data.result === "yes" ? definitelyYes || optionallyYes : !definitelyYes;
  }
  if (data.kind === "number" && role === "clockmaker") return Object.values(c.roles).includes("legion")
    ? data.value>=1 && data.value<=Math.floor(c.order.length/2) : data.value === clockmakerValue(c);
  if (data.kind === "number" && role === "oracle") {
    const options = c.order.filter(p => !c.alive.has(p)).map(p => alignmentOptions(p, c));
    return data.value >= options.reduce((sum, arr) => sum + Math.min(...arr), 0) &&
           data.value <= options.reduce((sum, arr) => sum + Math.max(...arr), 0);
  }
  if (data.kind === "dreamer" && role === "dreamer") {
    const actual = c.roles[data.player];
    if (!actual || !data.shownRoles.includes(actual)) return false;
    const other = data.shownRoles.find(r => r !== actual);
    return !!other && characterSide(other) !== characterSide(actual);
  }
  if (data.kind === "pairAlignment" && role === "seamstress") {
    const [a,b] = data.players;
    return alignmentOptions(a, c).some(aa => alignmentOptions(b, c).some(bb =>
      (data.result === "same") === (aa === bb)
    ));
  }
  if (data.kind === "singleYesNo" && (role === "flowergirl" || role === "town_crier")) {
    if (!g || !when || cycle(when) < 2) return false;
    const day = `D${cycle(when) - 1}`;
    // Organ Grinder makes voter identities unobservable, not equivalent to
    // nobody voting. Do not turn unknown votes into false Flowergirl reads.
    if (role === "flowergirl" && (g.organGrinderVotes??[]).some(e=>e.when===day&&e.hidden)) return true;
    const eventRoles = c.eventRoles ?? c.roles;
    if (role === "flowergirl") {
      const occurred = g.nominationLog.some(n => n.when === day && n.votingOccurred !== false && n.voters.some(p => c.lilMonstaHolder ? p===c.lilMonstaHolder : ROLES[eventRoles[p]]?.type === "demon"));
      return (data.result === "yes") === occurred;
    }
    const occurred = g.nominationLog.some(n => n.when === day && (ROLES[eventRoles[n.nominator]]?.type === "minion" || eventRoles[n.nominator] === "legion"));
    return (data.result === "yes") === occurred;
  }
  if (data.kind === "savantPair" && role === "savant") return savantPairMatches(data, c);
  if (data.kind === "artistAnswer" && role === "artist") return true; // arbitrary natural-language question is recorded, not silently parsed
  if (data.kind === "juggler" && role === "juggler") {
    const roles = c.eventRoles ?? c.roles;
    const correct = data.guesses.filter(guess => roles[guess.player] === guess.roleId).length;
    return data.number === correct;
  }
  if (data.kind === "sage" && role === "sage") {
    return data.players.some(player => ROLES[c.roles[player]]?.type === "demon" || (c.roles[player] === "recluse" && !contextImpaired(c, player)));
  }
  if (data.kind === "knight" && role === "knight") {
    return data.players.every(p => !!c.roles[p] && ROLES[c.roles[p]]?.type !== "demon");
  }
  if (data.kind === "noble" && role === "noble") {
    const possibilities = data.players.map(p => alignmentOptions(p, c));
    return possibilities[0].some(a => possibilities[1].some(b => possibilities[2].some(d => a + b + d === 1)));
  }
  if (data.kind === "singleRole" && role === "pixie") {
    return c.order.some(p => p !== source && canRegisterRole(c.roles[p], data.shownRole, contextImpaired(c, p)));
  }
  if (data.kind === "shugenjaDirection" && role === "shugenja")
    return shugenjaCanLearn(source,data.direction,c,true);
  if (data.kind === "singlePlayer" && role === "steward") return alignmentOptions(data.player,c).includes(0);
  if (data.kind === "alignmentRead" && role === "village_idiot") return alignmentOptions(data.player,c).includes(data.result==="evil"?1:0);
  if (data.kind === "singlePlayer" && role === "choirboy") {
    return c.choirboyDemonInfo?.[`${source}:${when}`] === data.player;
  }
  if (data.kind === "singleRole" && role === "king") {
    if (!c.alive.has(source) || !kingInformationAvailable(Object.values(c.roles), c.alive.size, c.order.length)) return false;
    return [...c.alive].some(p => canRegisterRole(c.roles[p], data.shownRole, contextImpaired(c, p)));
  }
  if (data.kind === "singlePlayer" && role === "bounty_hunter") {
    return alignmentOptions(data.player, c).includes(1);
  }
  if (data.kind === "klutzChoice" && role === "klutz") {
    return alignmentOptions(data.target, c).includes(data.teamLost ? 1 : 0);
  }
  if (data.kind === "roleReveal") return !!c.roles[data.player] && canRegisterRole(c.roles[data.player], data.shownRole, contextImpaired(c, data.player));
  return true;
}
function literalMatches(role: RoleId, source: string, data: StructuredInfo, c: RegistrationContext): boolean {
  if (role === "grandmother" && data.kind === "grandmotherRead")
    return data.player !== source && c.roles[data.player] === data.shownRole && registeredAlignment(data.player,c)==="good";
  if (role === "godfather" && data.kind === "godfatherOutsiders") {
    const inPlay=Object.values(c.roles).filter(r=>ROLES[r].type==='outsider').sort(), seen=[...data.roles].sort();
    return inPlay.length===seen.length && inPlay.every((r,i)=>r===seen[i]);
  }
  if (role === "chambermaid" && data.kind === "chambermaidRead")
    return data.players[0] !== data.players[1] && !data.players.includes(source) && data.players.every(p=>c.alive.has(p)) && data.number>=0 && data.number<=2;
  if (data.kind === "shugenjaDirection" && role === "shugenja") return shugenjaCanLearn(source,data.direction,c,false);
  if (data.kind === "singlePlayer" && role === "steward") return registeredAlignment(data.player,c)==="good";
  if (data.kind === "alignmentRead" && role === "village_idiot") return registeredAlignment(data.player,c)===data.result;
  if (data.kind === "singlePlayer" && role === "choirboy") return c.choirboyDemonInfo?.[`${source}:${c.when ?? ""}`] === data.player;
  if (data.kind === "singleRole" && role === "king") return kingInformationAvailable(Object.values(c.roles), c.alive.size, c.order.length) && [...c.alive].some(p => c.roles[p] === data.shownRole);
  if (data.kind === "singleRole" && role === "pixie") return c.order.some(p => p !== source && c.roles[p] === data.shownRole);
  if (data.kind === "knight" && role === "knight") return data.players.every(p => !registersAsDemon(p,c));
  if (data.kind === "noble" && role === "noble") return data.players.filter(p => registeredAlignment(p, c) === "evil").length === 1;
  if (data.kind === "pairRole") return data.players.some(p => c.roles[p] === data.shownRole);
  if (data.kind === "noOutsiders") return !Object.values(c.roles).some(r => ROLES[r].type === "outsider");
  if (data.kind === "roleReveal") return c.roles[data.player] === data.shownRole;
  if (data.kind === "pairYesNo") return (data.result === "yes") === data.players.some(p => registersAsDemon(p,c) || p === c.redHerring);
  if (data.kind === "number" && role === "chef") return data.value === c.order.reduce((n, p, i) => {
    const a = registeredAlignment(p, c);
    const q = c.order[(i+1)%c.order.length];
    const b = registeredAlignment(q, c);
    return n + Number(a === "evil" && b === "evil");
  }, 0);
  if (data.kind === "number" && role === "empath") return data.value === livingNeighbours(c.order, source, c.alive).filter(p => registeredAlignment(p, c) === "evil").length;
  if (data.kind === "number" && role === "clockmaker") return data.value === clockmakerValue(c);
  if (data.kind === "number" && role === "oracle") return data.value === c.order.filter(p => !c.alive.has(p) && registeredAlignment(p, c) === "evil").length;
  if (data.kind === "dreamer" && role === "dreamer") {
    const actual = c.roles[data.player];
    if (!actual || !data.shownRoles.includes(actual)) return false;
    const other = data.shownRoles.find(r => r !== actual);
    return !!other && characterSide(other) !== characterSide(actual);
  }
  if (data.kind === "pairAlignment" && role === "seamstress") {
    const [a,b] = data.players;
    const aa = registeredAlignment(a, c);
    const bb = registeredAlignment(b, c);
    return (data.result === "same") === (aa === bb);
  }
  if (data.kind === "savantPair" && role === "savant") return savantPairMatches(data, c);
  if (data.kind === "artistAnswer" && role === "artist") return true;
  if (data.kind === "juggler" && role === "juggler") { const roles=c.eventRoles ?? c.roles; return data.number === data.guesses.filter(guess => roles[guess.player] === guess.roleId).length; }
  if (data.kind === "sage" && role === "sage") return data.players.some(player => registersAsDemon(player,c));
  if (data.kind === "singlePlayer" && role === "bounty_hunter") return registeredAlignment(data.player, c) === "evil";
  if (data.kind === "klutzChoice" && role === "klutz") { const a=registeredAlignment(data.target, c); return data.teamLost === (a === "evil"); }
  return true;
}
/** Riot and Leviathan give the King information once *any* player has died. */
export function kingInformationAvailable(roles: Iterable<RoleId>, aliveCount: number, playerCount: number): boolean {
  const special = [...roles].some(role => role === "leviathan" || role === "riot");
  return special ? aliveCount < playerCount : aliveCount * 2 <= playerCount;
}
export function validSetup(initial: Record<string, RoleId>, g: GameSnapshot): boolean {
  const ps = seats(g.playerCount), values = ps.map(p => initial[p]);
  const scriptRoles = new Set(getSnapshotScriptRoleIds(g));
  if (values.some(v => !ROLES[v] || !scriptRoles.has(v)) ||
      new Set(values.filter(r=>r!=="village_idiot" && r!=="legion")).size !== values.filter(r=>r!=="village_idiot" && r!=="legion").length ||
      values.filter(r=>r==="village_idiot").length>3) return false;
  if (values.includes("leviathan") && !isLeviathanEnabled(g)) return false;
  if (values.includes("al_hadikhia") && !isAlHadikhiaEnabled(g)) return false;
  if (g.alHadikhiaConfirmed && !values.includes("al_hadikhia")) return false;
  if (g.riotConfirmed && !values.includes("riot")) return false;
  if (g.leviathanConfirmed===true && !values.includes("leviathan")) return false;
  if (values.includes('summoner') && values.some(r=>ROLES[r]?.type==='demon'))return false;
  if (values.includes("legion") && values.some(r=>ROLES[r]?.type === "demon" && r!=="legion")) return false;
  if (values.includes("lord_of_typhon") && !isTyphonLayout(initial,ps)) return false;
  // Alchemist/Djinn setup exceptions: some copied Minion abilities
  // require an *actual* copy of that Minion, not a second borrowed effect.
  const copiedAlchemist=initial.self==='alchemist' ? alchemistAbilityRole(g) : null;
  if (copiedAlchemist && ['marionette','organ_grinder','spy','widow','wraith'].includes(copiedAlchemist) && !values.includes(copiedAlchemist)) return false;
  if (copiedAlchemist==='mastermind' && values.includes('mastermind')) return false;
  if (values.includes("choirboy") && !values.includes("king")) return false;
  if (values.includes("huntsman") && !values.includes("damsel")) return false;
  // Heretic's official Djinn: none of these character pairs may actually
  // share a setup, even though they are selectable on the same script.
  if(values.includes('heretic') && ['baron','godfather','lleech','pit_hag','spy','widow'].some(id=>values.includes(id as RoleId)))return false;
  const marionetteSeat=ps.find(p=>initial[p]==="marionette");
  if(marionetteSeat){
    const demonSeat=ps.find(p=>ROLES[initial[p]]?.type==='demon');
    if(!demonSeat)return false;
    const i=ps.indexOf(demonSeat);
    if(![ps[(i+1)%ps.length],ps[(i-1+ps.length)%ps.length]].includes(marionetteSeat))return false;
  }
  const actual = Object.fromEntries((["townsfolk","outsider","minion","demon"] as const).map(type => [type, values.filter(r => ROLES[r].type === type).length])) as Record<"townsfolk"|"outsider"|"minion"|"demon",number>;
  // The Marionette may be shown the Huntsman/Balloonist, triggering their
  // Outsider setup options even though neither is a real starting Townsfolk.
  const hiddenOutsiderModifiers: RoleId[] = [];
  if (values.includes("marionette") && !values.includes("huntsman") && scriptRoles.has("huntsman")) hiddenOutsiderModifiers.push("huntsman");
  if (values.includes("marionette") && !values.includes("balloonist") && scriptRoles.has("balloonist")) hiddenOutsiderModifiers.push("balloonist");
  const standardCounts = [
    ...setupCountOptionsForGame(g, values),
    ...hiddenOutsiderModifiers.flatMap(id => setupCountOptionsForGame(g, [...values,id])),
    ...(!values.includes('hermit') && scriptRoles.has('hermit') ? (()=>{
      const normal=setupCountOptionsForGame(g,values);
      return normal.filter(c=>c.outsider>0).map(c=>({...c,townsfolk:c.townsfolk+1,outsider:c.outsider-1}));
    })() : []),
  ];
  // Alchemist/Summoner Djinn: the Alchemist is a good Townsfolk but the
  // starting distribution has no Demon, and one additional Townsfolk.
  const legalCounts = copiedAlchemist === 'summoner'
    ? standardCounts.map(c => ({...c, townsfolk:c.townsfolk+1, demon:0}))
    : standardCounts;
  if (!legalCounts.some(expected => (["townsfolk","outsider","minion","demon"] as const).every(type => actual[type] === expected[type]))) return false;
  const shown = g.selfRole.shownRole;
  if (shown) {
    const shownType = ROLES[shown].type;
    const hiddenTag = shownType === "townsfolk" ? "THINKS_TOWNSFOLK" : shownType === "outsider" ? "THINKS_OUTSIDER" : shownType === "minion" ? "THINKS_MINION" : "THINKS_DEMON";
    if (initial.self !== shown && !ROLES[initial.self].tags.includes(hiddenTag)) return false;
    if ((initial.self === "drunk" || initial.self === "marionette") && values.includes(shown)) return false;
  }
  if (shown && ROLES[shown].type === "demon" && initial.self === shown) {
    const shownMinions = g.demonState?.knownMinions ?? [];
    for (const m of shownMinions) {
      if (m.source === "demon_info") {
        if (ROLES[initial[m.playerId]]?.type !== "minion" && initial[m.playerId] !== "magician") return false;
      } else if (ROLES[initial[m.playerId]]?.type !== "minion") return false;
      if (m.roleId && initial[m.playerId] !== m.roleId) return false;
    }
    if (shownMinions.some(m => m.source === "demon_info") && shownMinions.filter(m => m.source === "demon_info").length === g.playerCount /* impossible overfull display */) return false;
    if (g.demonState?.knownKing && initial[g.demonState.knownKing] !== "king") return false;
    if (g.demonState?.knownMarionette && initial[g.demonState.knownMarionette] !== "marionette") return false;
    if (g.playerCount >= 7) {
      const bluffs = new Set(g.demonState?.storytellerBluffs ?? []);
      for (const role of values) if (bluffs.has(role)) return false;
    }
  }
  if (shown && ROLES[shown].type === "minion") {
    const state = g.minionState;
    if (initial.self !== shown) return false;
    if (state?.knownDemon && ROLES[initial[state.knownDemon.playerId]]?.type !== "demon" && shown!=="summoner") return false;
    if (state?.demonCandidates?.length) {
      if (!state.demonCandidates.some(p => ROLES[initial[p]]?.type === "demon")) return false;
      if (state.demonCandidates.length === 2 && state.demonCandidates.filter(p => initial[p] === "magician").length !== 1) return false;
      if (state.demonCandidates.some(p => ROLES[initial[p]]?.type !== "demon" && initial[p] !== "magician")) return false;
    }
    for (const m of state?.knownMinions ?? []) {
      if (ROLES[initial[m.playerId]]?.type !== "minion") return false;
      if (m.roleId && initial[m.playerId] !== m.roleId) return false;
    }
    if (shown === "evil_twin" && state?.evilTwin) {
      if (initial[state.evilTwin.playerId] !== state.evilTwin.roleId) return false;
      if (!(["townsfolk", "outsider"] as const).includes(ROLES[state.evilTwin.roleId].type as "townsfolk" | "outsider")) return false;
    }
    if (g.playerCount >= 7) {
      const bluffs = new Set(state?.sharedStorytellerBluffs ?? []);
      for (const role of values) if (bluffs.has(role)) return false;
    }
  }
  // Snitch informs each Minion of three truly out-of-play characters.
  // Unlike ordinary bluff plans, these are Storyteller-provided starting facts.
  if(g.minionState?.snitchBluffs?.length){
    if(!values.includes('snitch') || g.minionState.snitchBluffs.some(r=>values.includes(r)))return false;
  }
  if (initial.self==='boffin' && g.minionState?.boffinGrantedAbility) {
    const goodRole=g.minionState.boffinGrantedAbility;
    if ((values.includes(goodRole) && !(goodRole==='village_idiot' && values.filter(r=>r==='village_idiot').length<3)) || ROLES[goodRole]?.type==='demon' || ROLES[goodRole]?.type==='minion' || goodRole==='drunk') return false;
  }
  return true;
}
function copyWorld(w: HistoryWorld): HistoryWorld { return { ...w, current: { ...w.current }, initialAlignment: { ...w.initialAlignment }, currentAlignment: { ...w.currentAlignment }, believedRoles: { ...w.believedRoles }, alive: [...w.alive], poison: { ...w.poison }, permanentPoison: [...w.permanentPoison], permanentDrunk: [...w.permanentDrunk], storytellerMinionAbilities: w.storytellerMinionAbilities.map(x=>({...x})), mezephelesUsed:w.mezephelesUsed, widowTarget:w.widowTarget, xaanTriggered:w.xaanTriggered, vigormortisPoisonDirections: { ...w.vigormortisPoisonDirections }, cannibalAbilities: { ...w.cannibalAbilities }, cannibalPoisoned: [...w.cannibalPoisoned], bansheeActive: [...w.bansheeActive], choirboyDemonInfo: { ...w.choirboyDemonInfo }, fauxPaw: w.fauxPaw, pixieAbilities: { ...w.pixieAbilities }, villageIdiotDrunk: w.villageIdiotDrunk, preachedMinions: [...w.preachedMinions], poppyRevealNight: w.poppyRevealNight, damselGuessed: w.damselGuessed, huntsmanUsed: [...w.huntsmanUsed], nightwatchmanUsed: [...w.nightwatchmanUsed], engineerUsed: [...w.engineerUsed], unresolvedBarberFrom: [...w.unresolvedBarberFrom], requiredPoison: { ...w.requiredPoison }, info: { ...w.info }, changes: [...w.changes], arbitraryDeathNights: [...w.arbitraryDeathNights], assumptions: [...w.assumptions] }; }
function activePoison(w: HistoryWorld, choice: string | null): string | null {
  if (!choice) return null;
  const p = Object.keys(w.current).find(p => w.current[p] === "poisoner" && w.alive.includes(p) && !w.permanentDrunk.includes(p));
  return p && p !== choice ? choice : null;
}
function basePoisoned(w: HistoryWorld, player: string, choice: string | null): boolean {
  return activePoison(w, choice) === player || w.permanentPoison.includes(player);
}
function demonBaseImpaired(w: HistoryWorld, player: string, choice: string | null): boolean {
  return basePoisoned(w, player, choice) || w.permanentDrunk.includes(player) || w.puzzlemasterDrunk===player;
}
function nearestTownsfolkInDirection(order: string[], center: string, roles: Record<string, RoleId>, direction: -1 | 1): string | null {
  const i = order.indexOf(center); if (i < 0) return null;
  for (let d = 1; d < order.length; d++) {
    const p = order[(i + direction * d + order.length * 2) % order.length];
    if (ROLES[roles[p]]?.type === "townsfolk") return p;
  }
  return null;
}
function dynamicDemonPoison(w: HistoryWorld, choice: string | null, g: GameSnapshot, when = `N${g.night}`): Set<string> {
  const poisoned = new Set<string>();
  const order = seatingOrderAt(g, when);
  for (const demon of w.alive) {
    if (w.current[demon] !== "no_dashii" || demonBaseImpaired(w, demon, choice)) continue;
    for (const direction of [-1, 1] as const) {
      const target = nearestTownsfolkInDirection(order, demon, w.current, direction);
      if (target) poisoned.add(target);
    }
  }
  const activeVigor = w.alive.some(p => w.current[p] === "vigormortis" && !demonBaseImpaired(w, p, choice));
  if (activeVigor) {
    for (const [minion, direction] of Object.entries(w.vigormortisPoisonDirections)) {
      if (w.alive.includes(minion) || ROLES[w.current[minion]]?.type !== "minion") continue;
      const target = nearestTownsfolkInDirection(order, minion, w.current, direction);
      if (target) poisoned.add(target);
    }
  }
  // A Widow's target stays poisoned as long as her ability functions.
  const activeWidow=w.alive.find(p=>w.current[p]==='widow' && !demonBaseImpaired(w,p,choice) &&
    !(w.preachedMinions.includes(p) && w.alive.some(q=>w.current[q]==='preacher' && !demonBaseImpaired(w,q,choice))));
  if(activeWidow && w.widowTarget)poisoned.add(w.widowTarget);
  // Xaan's Night X has been recorded as having triggered when the Minion
  // was alive and able to act. All Townsfolk are poisoned through Dusk X.
  if(w.xaanTriggered && cycle(when)===w.xaanTriggered){
    for(const [p,r] of Object.entries(w.current))if(ROLES[r]?.type==='townsfolk')poisoned.add(p);
  }
  return poisoned;
}
function philosopherDrunkTarget(w: HistoryWorld, choice: string | null, g?: GameSnapshot, when?: string): string | null {
  if (!w.philosopherAbility || !w.alive.includes("self") || w.current.self !== "philosopher") return null;
  if (w.permanentDrunk.includes("self") || basePoisoned(w, "self", choice) || (g && dynamicDemonPoison(w, choice, g, when).has("self"))) return null;
  return Object.keys(w.current).find(p => p !== "self" && w.current[p] === w.philosopherAbility) ?? null;
}
function worldPoisoned(w: HistoryWorld, player: string, choice: string | null, g?: GameSnapshot, when?: string): boolean {
  if (g && when && baristaEffectFor(g, player, when) === "sober_healthy") return false;
  return basePoisoned(w, player, choice) || w.cannibalPoisoned.includes(player) || !!g && dynamicDemonPoison(w, choice, g, when).has(player);
}
function worldDrunk(w: HistoryWorld, player: string, choice: string | null, g?: GameSnapshot, when?: string): boolean {
  if (g && when && baristaEffectFor(g, player, when) === "sober_healthy") return false;
  return (player === w.villageIdiotDrunk && w.current[player] === "village_idiot") || (w.permanentDrunk.includes(player) || w.puzzlemasterDrunk === player) || philosopherDrunkTarget(w, choice, g, when) === player;
}
function worldImpaired(w: HistoryWorld, player: string, choice: string | null, g?: GameSnapshot, when?: string): boolean { return worldPoisoned(w, player, choice, g, when) || worldDrunk(w, player, choice, g, when); }
function vigormortisAbilityActive(w: HistoryWorld, choice: string | null): boolean {
  return w.alive.some(p => w.current[p] === "vigormortis" && !demonBaseImpaired(w, p, choice));
}
function minionAbilityAvailable(w: HistoryWorld, player: string, roleId: RoleId, choice: string | null, g?: GameSnapshot,when?:string): boolean {
  // Holding Lil' Monsta doesn't remove a Minion's ordinary ability.
  if (w.current[player] !== roleId && !(w.current[player] === "lil_monsta" && w.lilMonstaUnderlyingRole === roleId)) return false;
  if (preacherSuppresses(w,player,choice,g,when)) return false;
  if (w.alive.includes(player)) return true;
  return w.vigormortisPoisonDirections[player] !== undefined && vigormortisAbilityActive(w, choice);
}
/** Boffin's gift works even if the Demon is poisoned, but not when the
 * Boffin is impaired, suppressed, or dead. */
function boffinActive(w:HistoryWorld, choice:string|null, g:GameSnapshot, when:string):boolean {
  return w.alive.some(p=>w.current[p]==='boffin' &&
    minionAbilityAvailable(w,p,'boffin',choice,g,when) &&
    !worldImpaired(w,p,choice,g,when));
}

function activeEvilTwin(w: HistoryWorld, poisonChoice: string | null, g: GameSnapshot): { twin: string } | null {
  if (g.selfRole.shownRole !== "evil_twin" || !g.minionState?.evilTwin) return null;
  const twin = g.minionState.evilTwin.playerId;
  if (!minionAbilityAvailable(w, "self", "evil_twin", poisonChoice) || worldImpaired(w, "self", poisonChoice, g)) return null;
  if (!w.alive.includes(twin) || w.currentAlignment[twin] !== "good") return null;
  return { twin };
}
function evilTwinBlocksGood(w: HistoryWorld, poisonChoice: string | null, g: GameSnapshot): boolean {
  return w.alive.includes("self") && !!activeEvilTwin(w, poisonChoice, g);
}
function context(w: HistoryWorld, choice: string | null, g: GameSnapshot, when = `N${g.night}`): RegistrationContext {
  const poisonTarget = activePoison(w, choice);
  const poisoned = new Set([...w.permanentPoison, ...dynamicDemonPoison(w, choice, g, when)]);
  for (const player of w.cannibalPoisoned) poisoned.add(player);
  const drunk = new Set(w.permanentDrunk); if(w.puzzlemasterDrunk)drunk.add(w.puzzlemasterDrunk); if(w.villageIdiotDrunk)drunk.add(w.villageIdiotDrunk); const philoTarget = philosopherDrunkTarget(w, choice, g, when); if (philoTarget) drunk.add(philoTarget);
  const trueInfo = new Set<string>();
  for (const player of seats(g.playerCount)) {
    if (baristaEffectFor(g, player, when) !== "sober_healthy") continue;
    poisoned.delete(player); drunk.delete(player); trueInfo.add(player);
  }
  // Preacher does not make a Minion drunk, but strips its registration and
  // other ongoing ability effects just as completely. This cannot be bypassed
  // by Barista sobriety, which only counteracts actual drunk/poison states.
  for (const player of w.preachedMinions) if (preacherSuppresses(w, player, choice, g, when)) {
    drunk.add(player); trueInfo.delete(player);
  }
  const lycan = w.alive.find(p => w.current[p] === "lycanthrope" && !worldImpaired(w, p, choice, g, when));
  const registersEvil = new Set<string>();
  if (lycan && w.fauxPaw && w.currentAlignment[w.fauxPaw] === "good") registersEvil.add(w.fauxPaw);
  return { roles: w.current, initial: w.initial, alignment: w.currentAlignment, alive: new Set(w.alive), poisonTarget, poisoned, drunk, redHerring: w.redHerring, order: seatingOrderAt(g, when), trueInfo, when, choirboyDemonInfo: w.choirboyDemonInfo, registersEvil, lilMonstaHolder:w.lilMonstaHolder };
}
function barberUnresolvedAt(w: HistoryWorld, when: string): boolean { return w.unresolvedBarberFrom.some(phase => phaseIndex(phase) <= phaseIndex(when)); }
function rolesAtPhase(w: HistoryWorld, when: string): Record<string, RoleId> {
  const roles = { ...w.initial };
  const cutoff = phaseIndex(when);
  for (const change of w.changes) {
    if (phaseIndex(change.when) > cutoff) continue;
    if (change.kind === "pit_hag" || change.kind === "cacklejack" || change.kind === "engineer" || change.kind === "farmer" || change.kind === "huntsman" || change.kind === "summoner" || change.kind === "hatter") roles[change.playerId] = change.toRole;
    else if (change.kind === "snake_charmer") {
      // Swap characters, not ability names: a Philosopher stays a Philosopher
      // until this swap. Derive its character from the preceding history so
      // existing saved events need no additional field or migration.
      const snakeRole = roles[change.snake];
      roles[change.snake] = change.demonRole;
      roles[change.demon] = snakeRole;
    }
    else if (change.kind === "fang_gu") roles[change.newDemon] = "fang_gu";
    else if (change.kind === "scarlet" || change.kind === "starpass") roles[change.to] = "imp";
  }
  return roles;
}

function processCacklejackChange(
  w: HistoryWorld,
  action: Extract<NonNullable<GameSnapshot["travellerActionLog"]>[number], { kind: "cacklejack_change" }>,
): HistoryWorld[] {
  const next = copyWorld(w);
  const fromRole = next.current[action.target];
  // Traveller targets are valid in the physical game, but Travellers are kept
  // outside the seated RoleId world model. The public event is still recorded
  // in the snapshot/UI; only seated targets alter a solver world here.
  if (!fromRole) return [next];
  next.current[action.target] = action.newRole;
  next.changes.push({ when: action.when, playerId: action.target, fromRole, toRole: action.newRole, kind: "cacklejack" });
  return [next];
}
function observationContext(w: HistoryWorld, choice: string | null, g: GameSnapshot, o: Observation): RegistrationContext {
  const base = context(w, choice, g, o.when);
  if ((o.role === "flowergirl" || o.role === "town_crier") && cycle(o.when) >= 2) {
    return { ...base, eventRoles: rolesAtPhase(w, `D${cycle(o.when)-1}`) };
  }
  if (o.role === "juggler" && o.data.kind === "juggler") return { ...base, eventRoles: rolesAtPhase(w, o.data.guessDay) };
  return base;
}
function characterTypeOptions(roleId: RoleId | undefined, impaired: boolean): Set<"townsfolk" | "outsider" | "minion" | "demon"> {
  const actual = roleId ? ROLES[roleId]?.type : undefined;
  const out = new Set<"townsfolk" | "outsider" | "minion" | "demon">();
  if (actual) out.add(actual);
  if (!impaired && roleId === "recluse") { out.add("minion"); out.add("demon"); }
  if (!impaired && roleId === "spy") { out.add("townsfolk"); out.add("outsider"); }
  if (!impaired && roleId === "legion") out.add("minion");
  return out;
}
function priorRoleObservation(g: GameSnapshot, o: Observation): Observation | null {
  return observations(g)
    .filter(previous => previous.role === o.role && previous.source === o.source && phaseIndex(previous.when) < phaseIndex(o.when))
    .sort(compareEvents)
    .at(-1) ?? null;
}
function balloonistRelationPossible(w: HistoryWorld, o: Observation, c: RegistrationContext, g: GameSnapshot, different: boolean, allowRegistration: boolean): boolean {
  if (o.data.kind !== "singlePlayer") return false;
  const previous = priorRoleObservation(g, o);
  if (!previous || previous.data.kind !== "singlePlayer") return true;
  const previousRoles = rolesAtPhase(w, previous.when);
  const previousRole = previousRoles[previous.data.player];
  const currentRole = c.roles[o.data.player];
  if (!previousRole || !currentRole) return false;
  const previousImpaired = allowRegistration ? worldImpaired(w, previous.data.player, w.poison[cycle(previous.when)] ?? null, g, previous.when) : true;
  const currentImpaired = allowRegistration ? contextImpaired(c, o.data.player) : true;
  const previousTypes = characterTypeOptions(previousRole, previousImpaired);
  const currentTypes = characterTypeOptions(currentRole, currentImpaired);
  for (const a of previousTypes) for (const b of currentTypes) if ((a !== b) === different) return true;
  return false;
}
function bountyHunterSequenceValid(g: GameSnapshot, o: Observation): boolean {
  if (o.data.kind !== "singlePlayer") return false;
  const shownPlayer = o.data.player;
  const prior = observations(g)
    .filter(previous => previous.role === "bounty_hunter" && previous.source === o.source && phaseIndex(previous.when) < phaseIndex(o.when))
    .filter((previous): previous is Observation & { data: Extract<StructuredInfo, { kind: "singlePlayer" }> } => previous.data.kind === "singlePlayer")
    .sort(compareEvents);
  const previous = prior.at(-1);
  if (!previous) return o.when === "N1";
  if (prior.some(item => item.data.player === shownPlayer)) return false;
  return g.deathLog.some(death => death.playerId === previous.data.player && phaseIndex(death.when) <= phaseIndex(o.when));
}
function requirePoison(w: HistoryWorld, n: number, target: string) { w.requiredPoison[n] = target; }
function addAssumption(w: HistoryWorld, key: string, cost: number) { if (!w.assumptions.includes(key)) { w.assumptions.push(key); w.logScore -= cost; } }

function processPreacherChoice(w: HistoryWorld, action: Extract<SelfActionEvent,{roleId:"preacher"}>, choice:string|null,g:GameSnapshot): HistoryWorld[] {
  if(w.current.self!=="preacher" || !w.alive.includes("self") || !w.current[action.target])return [];
  const next=copyWorld(w);
  if(!worldImpaired(w,"self",choice,g,action.when) && ROLES[w.current[action.target]].type==="minion" && !next.preachedMinions.includes(action.target)) {
    next.preachedMinions.push(action.target);
  }
  return [next];
}
function preacherSuppresses(w:HistoryWorld, player:string, choice:string|null,g?:GameSnapshot,when?:string):boolean {
  if(!w.preachedMinions.includes(player) || ROLES[w.current[player]]?.type!=="minion")return false;
  return w.alive.some(p=>w.current[p]==="preacher" && !worldImpaired(w,p,choice,g,when));
}
function processPitHagAction(
  w: HistoryWorld,
  action: Extract<MinionActionEvent, { roleId: "pit_hag" }>,
  n: number,
  poisonChoice: string | null,
  g: GameSnapshot,
): HistoryWorld[] {
  if (n < 2 || action.when !== `N${n}`) return [w];
  if (!minionAbilityAvailable(w, "self", "pit_hag", poisonChoice)) return [];
  const next = copyWorld(w);
  if (worldImpaired(next, "self", poisonChoice, g)) {
    addAssumption(next, `pitHagImpaired:N${n}:${action.target}:${action.newRole}`, .15);
    return [next];
  }
  // Pit-Hag can only create a character that is not currently in play.
  if (Object.values(next.current).includes(action.newRole)) {
    addAssumption(next, `pitHagInPlay:N${n}:${action.target}:${action.newRole}`, 0);
    return [next];
  }
  const fromRole = next.current[action.target];
  next.current[action.target] = action.newRole;
  next.changes.push({ when: action.when, playerId: action.target, fromRole, toRole: action.newRole, kind: "pit_hag" });
  // Character changes do not change alignment. If a Demon is created, deaths
  // for this night are arbitrary rather than being validated as normal attacks.
  if (ROLES[action.newRole].type === "demon" && !next.arbitraryDeathNights.includes(n)) {
    next.arbitraryDeathNights.push(n);
  }
  return [next];
}
/** Engineer changes evil characters, never their alignment or the setup counts. */
function processHuntsmanAction(w: HistoryWorld, action: Extract<SelfActionEvent, {roleId:"huntsman"}>, poisonChoice: string | null, g: GameSnapshot): HistoryWorld[] {
  if (!w.alive.includes("self") || w.huntsmanUsed.includes("self") || !w.alive.includes(action.target)) return [];
  if (w.current.self !== "huntsman" && !(w.current.self === "philosopher" && w.philosopherAbility === "huntsman") && !(w.current.self === "cannibal" && w.cannibalAbilities.self === "huntsman")) return [];
  const base = copyWorld(w); base.huntsmanUsed.push("self");
  const success = w.current[action.target] === "damsel" && !worldImpaired(w, "self", poisonChoice, g, action.when);
  if (!success) return action.rescuedRole ? [] : [base];
  const available = getSnapshotScriptRoleIds(g).filter(r => ROLES[r].type === "townsfolk" && !Object.values(w.current).includes(r));
  const chosen = action.rescuedRole ? available.filter(r => r === action.rescuedRole) : available;
  return chosen.map(toRole => {
    const branch = copyWorld(base);
    branch.current[action.target] = toRole;
    branch.changes.push({when:action.when,kind:"huntsman",playerId:action.target,fromRole:"damsel",toRole});
    return branch;
  });
}

function processNightwatchmanAction(w: HistoryWorld, action: Extract<SelfActionEvent, {roleId:"nightwatchman"}>, poisonChoice: string | null, g: GameSnapshot): HistoryWorld[] {
  if (!w.alive.includes("self") || w.nightwatchmanUsed.includes("self") || !w.current[action.target]) return [];
  if (w.current.self !== "nightwatchman" && !(w.current.self === "philosopher" && w.philosopherAbility === "nightwatchman") && !(w.current.self === "cannibal" && w.cannibalAbilities.self === "nightwatchman")) return [];
  const next = copyWorld(w); next.nightwatchmanUsed.push("self");
  if (worldImpaired(w, "self", poisonChoice, g, action.when)) addAssumption(next, `nightwatchmanImpaired:${action.when}`, .05);
  return [next];
}

function processPixieMadness(w: HistoryWorld, action: Extract<SelfActionEvent, {roleId:"pixie"}>, poisonChoice: string | null, g: GameSnapshot): HistoryWorld[] {
  if (w.current.self !== "pixie" || !w.alive.includes("self") || w.pixieAbilities.self) return [];
  const shown = g.selfInfoLog.find(e => e.roleId === "pixie" && e.when === "N1");
  if (!shown || shown.roleId !== "pixie" || shown.shownRole !== action.shownRole || ROLES[action.shownRole]?.type !== "townsfolk") return [];
  if (worldImpaired(w, "self", poisonChoice, g, action.when)) return [];
  const initialHolder = Object.keys(w.initial).find(p => p !== "self" && w.initial[p] === action.shownRole);
  if (!initialHolder || w.alive.includes(initialHolder)) return [];
  const death = g.deathLog.find(d => d.playerId === initialHolder && phaseIndex(d.when) <= phaseIndex(action.when));
  if (!death) return [];
  const branch = copyWorld(w); branch.pixieAbilities.self = action.shownRole;
  addAssumption(branch, `pixieMadnessApproved:${action.when}:${action.shownRole}`, .01);
  return [branch];
}

function processEngineerAction(
  w: HistoryWorld,
  action: Extract<SelfActionEvent, {roleId: "engineer"}>,
  poisonChoice: string | null,
  g: GameSnapshot,
): HistoryWorld[] {
  if (!w.alive.includes("self") || w.engineerUsed.includes("self")) return [];
  const usingEngineer = w.current.self === "engineer" ||
    (w.current.self === "philosopher" && w.philosopherAbility === "engineer") ||
    (w.current.self === "cannibal" && w.cannibalAbilities.self === "engineer");
  if (!usingEngineer) return [];
  const next = copyWorld(w);
  next.engineerUsed.push("self");
  if (worldImpaired(next, "self", poisonChoice, g, action.when)) {
    addAssumption(next, `engineerImpaired:${action.when}`, .12);
    return [next];
  }
  const allowed = new Set(getSnapshotScriptRoleIds(g));
  const chosen: RoleId[] = action.kind === "demon" ? [action.demonRole] : action.minionRoles;
  const type = action.kind === "demon" ? "demon" : "minion";
  if (!chosen.length || chosen.some(role => !allowed.has(role) || ROLES[role]?.type !== type) || new Set(chosen).size !== chosen.length) return [];
  const players = Object.keys(next.current).filter(p => ROLES[next.current[p]].type === type);
  if (players.length !== chosen.length) return [];
  // Keep unchanged characters on their current owners where possible. The
  // Storyteller selects the remaining mapping, so explore each possibility.
  const kept = players.filter(p => chosen.includes(next.current[p]));
  const changePlayers = players.filter(p => !kept.includes(p));
  const changeRoles = chosen.filter(role => !kept.some(p => next.current[p] === role));
  const permutations = (roles: RoleId[]): RoleId[][] => roles.length <= 1 ? [roles] :
    roles.flatMap((r,i) => permutations(roles.filter((_,j) => j !== i)).map(tail => [r, ...tail]));
  return permutations(changeRoles).map(permutation => {
    const branch = copyWorld(next);
    changePlayers.forEach((p, i) => {
      const fromRole = branch.current[p], toRole = permutation[i];
      if (fromRole === toRole) return;
      branch.current[p] = toRole;
      branch.changes.push({when: action.when, kind: "engineer", playerId: p, fromRole, toRole});
    });
    return branch;
  });
}

function processWitchAction(
  w: HistoryWorld,
  action: Extract<MinionActionEvent, { roleId: "witch" }>,
  n: number,
  poisonChoice: string | null,
  g: GameSnapshot,
): HistoryWorld[] {
  if (action.when !== `N${n}`) return [w];
  if (!minionAbilityAvailable(w, "self", "witch", poisonChoice)) return [];
  // At three living players the Witch stops waking and all curses are lost.
  if (w.alive.length <= 3) return [];
  if (worldImpaired(w, "self", poisonChoice, g)) {
    const next = copyWorld(w);
    addAssumption(next, `witchImpaired:N${n}:${action.target}`, .12);
    return [next];
  }
  return [copyWorld(w)];
}

function processCerenovusAction(
  w: HistoryWorld,
  action: Extract<MinionActionEvent, { roleId: "cerenovus" }>,
  n: number,
  poisonChoice: string | null,
  g: GameSnapshot,
): HistoryWorld[] {
  if (action.when !== `N${n}`) return [w];
  if (!minionAbilityAvailable(w, "self", "cerenovus", poisonChoice)) return [];
  if (!["townsfolk", "outsider"].includes(ROLES[action.madRole]?.type)) return [];
  if (worldImpaired(w, "self", poisonChoice, g)) {
    const next = copyWorld(w);
    addAssumption(next, `cerenovusImpaired:N${n}:${action.target}:${action.madRole}`, .12);
    return [next];
  }
  return [copyWorld(w)];
}

function processSnakeCharmerAction(
  w: HistoryWorld,
  action: Extract<SelfActionEvent, { roleId: "snake_charmer" }>,
  n: number,
  poisonChoice: string | null,
  g: GameSnapshot,
): HistoryWorld[] {
  if (action.when !== `N${n}`) return [w];
  if (!w.alive.includes("self") || (w.current.self !== "snake_charmer" && !(w.current.self === "philosopher" && w.philosopherAbility === "snake_charmer")) || !w.alive.includes(action.target)) return [];
  const targetRole = w.current[action.target];
  const targetIsDemon = action.target !== "self" && ROLES[targetRole]?.type === "demon";
  const impaired = worldImpaired(w, "self", poisonChoice, g);
  if (!action.swapped) {
    // A healthy Snake Charmer must swap when choosing a living Demon.
    if (targetIsDemon && !impaired) return [];
    return [copyWorld(w)];
  }
  if (impaired || !targetIsDemon || !action.newDemonRole || action.newDemonRole !== targetRole) return [];
  const next = copyWorld(w);
  const snakeAlignment = next.currentAlignment.self;
  const demonAlignment = next.currentAlignment[action.target];
  next.current.self = targetRole;
  next.current[action.target] = w.current.self;
  next.currentAlignment.self = demonAlignment;
  next.currentAlignment[action.target] = snakeAlignment;
  if (!next.permanentPoison.includes(action.target)) next.permanentPoison.push(action.target);
  next.changes.push({ when: action.when, kind: "snake_charmer", snake: "self", demon: action.target, demonRole: targetRole });
  next.philosopherAbility = null;
  return [next];
}
function processPhilosopherAction(
  w: HistoryWorld,
  action: Extract<SelfActionEvent, { roleId: "philosopher" }>,
  poisonChoice: string | null,
  g: GameSnapshot,
): HistoryWorld[] {
  if (!w.alive.includes("self") || w.current.self !== "philosopher" || w.philosopherAbility) return [];
  if (!ROLES[action.gainedRole] || (ROLES[action.gainedRole].type !== "townsfolk" && ROLES[action.gainedRole].type !== "outsider") || action.gainedRole === "philosopher") return [];
  const next = copyWorld(w);
  if (worldImpaired(next, "self", poisonChoice, g)) {
    addAssumption(next, `philosopherImpaired:${action.when}:${action.gainedRole}`, .18);
    return [next];
  }
  next.philosopherAbility = action.gainedRole;
  return [next];
}
function processKlutzAction(
  w: HistoryWorld,
  action: Extract<SelfActionEvent, { roleId: "klutz" }>,
  poisonChoice: string | null,
  g: GameSnapshot,
): HistoryWorld[] {
  if (w.alive.includes("self") || (w.current.self !== "klutz" && !(w.current.self === "philosopher" && w.philosopherAbility === "klutz")) || !w.alive.includes(action.target)) return [];
  const next = copyWorld(w);
  const impaired = worldImpaired(next, "self", poisonChoice, g);
  const targetEvil = next.currentAlignment[action.target] === "evil";
  if (impaired) {
    if (action.teamLost) return [];
    addAssumption(next, `klutzImpaired:${action.when}:${action.target}`, .12);
    return [next];
  }
  if (action.teamLost !== targetEvil) return [];
  if (action.teamLost) { next.ended = true; next.endReason = "klutz"; }
  return [next];
}
function applyFangGuJump(w: HistoryWorld, demon: string, target: string, when: string): HistoryWorld | null {
  if (w.fangGuJumped || !w.alive.includes(demon) || !w.alive.includes(target) || w.current[demon] !== "fang_gu" || ROLES[w.current[target]]?.type !== "outsider") return null;
  const next = copyWorld(w);
  const fromRole = next.current[target];
  next.current[target] = "fang_gu";
  next.currentAlignment[target] = "evil";
  next.fangGuJumped = true;
  next.changes.push({ when, kind: "fang_gu", oldDemon: demon, newDemon: target, fromRole });
  return next;
}
function permanentPoisonAt(w: HistoryWorld, player: string, when: string): boolean {
  const cutoff = phaseIndex(when);
  return w.changes.some(change => change.kind === "snake_charmer" && change.demon === player && phaseIndex(change.when) <= cutoff);
}
function observationAbnormalForMathematician(w: HistoryWorld, o: Observation, g: GameSnapshot, mathWhen: string, currentPoisonChoice: string | null): boolean {
  if (o.role === "mathematician" || !dataValid(o.role, o.data, g.playerCount) || !observationTimingValidForGame(g, o)) return false;
  const mathIndex = phaseIndex(mathWhen);
  const earlier = phaseIndex(o.when) < mathIndex;
  const roles = earlier ? rolesAtPhase(w, o.when) : w.current;
  const c = context(w, currentPoisonChoice, g, o.when);
  c.roles = roles;
  if ((o.role === "flowergirl" || o.role === "town_crier") && cycle(o.when) >= 2) c.eventRoles = rolesAtPhase(w, `D${cycle(o.when)-1}`);
  const actual = roles[o.source];
  const pretending = (actual === "drunk" || actual === "marionette") && w.believedRoles[o.source] === o.role;
  if (actual !== o.role && !pretending) return false;
  const poisonCycle = o.when.startsWith("D") ? cycle(o.when) : cycle(o.when);
  const poisonChoice = earlier ? (w.poison[poisonCycle] ?? null) : currentPoisonChoice;
  const poisoned = permanentPoisonAt(w, o.source, o.when) || activePoison(w, poisonChoice) === o.source || !!c.poisoned?.has(o.source);
  const drunkPlayers = new Set(w.permanentDrunk); if(w.villageIdiotDrunk)drunkPlayers.add(w.villageIdiotDrunk); if(w.puzzlemasterDrunk)drunkPlayers.add(w.puzzlemasterDrunk); const philoTarget = philosopherDrunkTarget(w, poisonChoice, g, o.when); if (philoTarget) drunkPlayers.add(philoTarget);
  const drunk = drunkPlayers.has(o.source);
  const local = { ...c, poisonTarget: activePoison(w, poisonChoice), poisoned: new Set([
    ...(c.poisoned ?? []),
    ...Object.keys(roles).filter(player => permanentPoisonAt(w, player, o.when)),
  ]), drunk: drunkPlayers };
  const literal = literalMatches(o.role, o.source, o.data, local);
  if (ROLES[actual]?.type === "townsfolk" && vortoxActive(w, local)) return true;
  if (pretending || poisoned || drunk) return !literal;
  // Registration abilities can make otherwise healthy information differ from the literal world.
  return infoMatches(o.role, o.source, o.data, local, g, o.when) && !literal;
}
function mathematicianAbnormalPlayers(w: HistoryWorld, g: GameSnapshot, when: string, currentPoisonChoice: string | null): Set<string> {
  const n = cycle(when);
  const abnormal = new Set<string>();
  const relevantPhases = new Set<string>([when]);
  if (n >= 2) relevantPhases.add(`D${n-1}`);
  for (const o of observations(g)) {
    if (!relevantPhases.has(o.when)) continue;
    if (observationAbnormalForMathematician(w, o, g, when, currentPoisonChoice)) abnormal.add(o.source);
  }
  // A poisoned Snake Charmer choosing a Demon and failing to swap is abnormal.
  const snakeAction = g.selfActionLog.find((a): a is Extract<SelfActionEvent,{roleId:"snake_charmer"}> => a.roleId === "snake_charmer" && a.when === when);
  if (snakeAction && !snakeAction.swapped) {
    const beforeRoles = rolesAtPhase(w, when);
    const targetRole = beforeRoles[snakeAction.target];
    if (snakeAction.target !== "self" && ROLES[targetRole]?.type === "demon" && worldImpaired(w, "self", currentPoisonChoice, g, when)) abnormal.add("self");
  }
  // Day abilities that fail because their owner was poisoned/drunk.
  if (n >= 2) {
    const day = `D${n-1}`;
    const dayPoison = w.poison[n-1] ?? null;
    for (const trigger of g.abilityTriggerLog.filter(t => t.when === day && !t.triggered)) {
      const roles = rolesAtPhase(w, day);
      if (trigger.roleId === "virgin" && roles[trigger.rolePlayerId] === "virgin" && worldImpaired(w, trigger.rolePlayerId, dayPoison, g, day)) abnormal.add(trigger.rolePlayerId);
      if (trigger.roleId === "slayer" && roles[trigger.rolePlayerId] === "slayer" && ROLES[roles[trigger.targetPlayerId]]?.type === "demon" && worldImpaired(w, trigger.rolePlayerId, dayPoison, g, day)) abnormal.add(trigger.rolePlayerId);
    }
    for (const death of g.deathLog.filter(d => d.when === day && diedByExecution(d))) {
      const roles = rolesAtPhase(w, day);
      if (roles[death.playerId] === "saint" && worldImpaired(w, death.playerId, dayPoison, g, day)) abnormal.add(death.playerId);
    }
  }
  // Night death-prevention abilities that demonstrably failed.
  const currentDeaths = g.deathLog.filter(d => d.when === when && (d.reason === "night_death" || (!!d.sourceRoleId && ROLES[d.sourceRoleId]?.type === "demon")));
  for (const death of currentDeaths) {
    if (w.current[death.playerId] === "soldier" && worldImpaired(w, death.playerId, currentPoisonChoice, g, when)) abnormal.add(death.playerId);
    const monkAction = g.selfActionLog.find(a => a.roleId === "monk" && a.when === when && a.target === death.playerId);
    const selfHasMonk = w.current.self === "monk" || (w.current.self === "cannibal" && w.cannibalAbilities.self === "monk");
    if (monkAction && selfHasMonk && worldImpaired(w, "self", currentPoisonChoice, g, when)) abnormal.add("self");
  }
  return abnormal;
}
function vortoxActive(w: HistoryWorld, c: RegistrationContext): boolean {
  return w.alive.some(player => w.current[player] === "vortox" && !contextImpaired(c, player));
}
function vortoxResultIsFalse(w: HistoryWorld, o: Observation, c: RegistrationContext, g: GameSnapshot): boolean {
  if (o.role === "choirboy" && o.data.kind === "singlePlayer") {
    const actual = w.choirboyDemonInfo[`${o.source}:${o.when}`];
    return !!actual && o.data.player !== actual;
  }
  if (o.role === "artist" && o.data.kind === "artistAnswer") return true; // free-text question semantics are intentionally not parsed
  if (o.role === "savant" && o.data.kind === "savantPair") return o.data.statements.every(statement => !savantStatementTrue(statement, c));
  if (o.role === "mathematician" && o.data.kind === "number") return o.data.value !== mathematicianAbnormalPlayers(w, g, o.when, c.poisonTarget).size;
  if ((o.role === "flowergirl" || o.role === "town_crier") && o.data.kind === "singleYesNo") return !infoMatches(o.role, o.source, o.data, c, g, o.when);
  return !literalMatches(o.role, o.source, o.data, c);
}
function informationStatus(w: HistoryWorld, o: Observation, c0: RegistrationContext, g: GameSnapshot): InfoDisposition | null {
  const c = observationContext(w, c0.poisonTarget, g, o);
  if (!dataValid(o.role, o.data, g.playerCount) || !observationTimingValidForGame(g, o)) return o.direct ? null : "lie";
  const actual = w.current[o.source];
  const pretending = (actual === "drunk" || actual === "marionette") && w.believedRoles[o.source] === o.role;
  const boffinUsing = ROLES[actual]?.type === "demon" && w.boffinGrantedAbility === o.role && boffinActive(w,c0.poisonTarget,g,o.when);
  const philosopherUsing = o.source === "self" && actual === "philosopher" && w.philosopherAbility === o.role;
  const amnesiacUsing = o.source === "self" && actual === "amnesiac" && amnesiacAbilityRole(g) === o.role;
  const cannibalUsing = actual === "cannibal" && w.cannibalAbilities[o.source] === o.role;
  const pixieUsing = actual === "pixie" && w.pixieAbilities[o.source] === o.role;
  const unresolvedBarber = barberUnresolvedAt(w, o.when);
  if (actual !== o.role && !pretending && !philosopherUsing && !amnesiacUsing && !cannibalUsing && !pixieUsing && !boffinUsing) return unresolvedBarber && !o.direct ? "registration" : o.direct ? null : "bluff";
  if (o.role === "ravenkeeper" || o.role === "sage") {
    if (!g.deathLog.some(d => d.playerId === o.source && d.when === o.when)) return o.direct ? (g.completedNights.includes(cycle(o.when)) ? null : "missing") : "lie";
    if (o.role === "sage") {
      const death = g.deathLog.find(d => d.playerId === o.source && d.when === o.when);
      if (!death || (death.reason !== "night_death" && !(death.sourceRoleId && ROLES[death.sourceRoleId]?.type === "demon"))) return o.direct ? null : "lie";
    }
  } else if (o.role === "klutz") {
    if (!g.deathLog.some(d => d.playerId === o.source && phaseIndex(d.when) <= phaseIndex(o.when))) return o.direct ? null : "lie";
  } else if (!c.alive.has(o.source) && !boneCollectorRestored(g, o.source, o.when)) return o.direct ? null : "lie";
  if (o.role === "undertaker") {
    const d = g.deathLog.find(d => diedByExecution(d) && d.when === `D${cycle(o.when)-1}`);
    if (d && o.data.kind === "roleReveal" && d.playerId !== o.data.player) return o.direct ? null : "lie";
    if (!d && g.noExecutionDays.includes(cycle(o.when)-1)) return o.direct ? null : "lie";
  }
  if (o.role === "bounty_hunter" && !bountyHunterSequenceValid(g, o)) return o.direct ? null : "lie";
  // Vortox changes the content of information, not when an ability wakes.
  // King's character information cannot appear before at least half of the
  // seated players are dead, even if King is poisoned or Vortox is active.
  if (o.role === "king" && !kingInformationAvailable(Object.values(c.roles), c.alive.size, c.order.length)) return o.direct ? null : "lie";
  if (o.role === "choirboy" && !w.choirboyDemonInfo[`${o.source}:${o.when}`]) return o.direct ? null : "lie";
  // These answers are the Storyteller's subjective judgement, not factual
  // statements about a candidate world's team/roles. Never run Vortox
  // truth inversion or turn the judgement into a solver constraint.
  if (o.role === "fisherman" || o.role === "general" || o.role === "high_priestess") {
    if (o.role === "fisherman") {
      const earlier = observations(g).filter(x => x.role === "fisherman" && x.source === o.source && compareEvents(x, o) < 0);
      if (earlier.length) return o.direct ? null : "lie";
    }
    if (contextDrunk(c, o.source)) return "drunk";
    if (contextPoisoned(c, o.source)) return "poison";
    return "works";
  }
  // The Demon retains the Boffin-granted good ability while themselves
  // drunk/poisoned. Evaluate its information with the Demon's own impairment
  // removed, while retaining poisoning/registration on every other player.
  if (boffinUsing) {
    const borrowedContext: RegistrationContext = {
      ...c,
      poisonTarget: c.poisonTarget===o.source ? null : c.poisonTarget,
      poisoned: new Set([...(c.poisoned??[])].filter(player=>player!==o.source)),
      drunk: new Set([...(c.drunk??[])].filter(player=>player!==o.source)),
    };
    if (!infoMatches(o.role,o.source,o.data,borrowedContext,g,o.when)) return o.direct ? null : "lie";
    return literalMatches(o.role,o.source,o.data,borrowedContext) ? "works" : "registration";
  }
  if (c.trueInfo?.has(o.source)) {
    if (o.role === "balloonist") return balloonistRelationPossible(w, o, c, g, true, false) ? "works" : o.direct ? null : "lie";
    return literalMatches(o.role, o.source, o.data, c) ? "works" : o.direct ? null : "lie";
  }
  if (ROLES[actual]?.type === "townsfolk" && vortoxActive(w, c)) {
    if (o.role === "balloonist") return balloonistRelationPossible(w, o, c, g, false, true) ? "vortox" : o.direct ? null : "lie";
    return vortoxResultIsFalse(w, o, c, g) ? "vortox" : o.direct ? null : "lie";
  }
  if (pretending || contextDrunk(c, o.source)) return "drunk";
  if (contextPoisoned(c, o.source)) return "poison";
  if (o.role === "mathematician" && o.data.kind === "number") {
    const expected = mathematicianAbnormalPlayers(w, g, o.when, c.poisonTarget).size;
    if (o.data.value !== expected) return unresolvedBarber ? "registration" : o.direct ? null : "lie";
    return "works";
  }
  if (o.role === "balloonist") {
    if (!balloonistRelationPossible(w, o, c, g, true, true)) return unresolvedBarber ? "registration" : o.direct ? null : "lie";
    return balloonistRelationPossible(w, o, c, g, true, false) ? "works" : "registration";
  }
  if (!infoMatches(o.role, o.source, o.data, c, g, o.when)) return unresolvedBarber ? "registration" : o.direct ? null : "lie";
  return literalMatches(o.role, o.source, o.data, c) ? "works" : "registration";
}

function processRevival(w: HistoryWorld, e: RevivalEvent): HistoryWorld[] {
  if (w.alive.includes(e.playerId)) return [];
  const reviver = w.alive.find(p => ROLES[w.current[p]]?.tags.includes("REVIVES"));
  if (!reviver) return [];
  const next = copyWorld(w);
  next.alive = [...next.alive, e.playerId];
  addAssumption(next, `genericRevival:${e.when}:${e.playerId}`, .08);
  return [next];
}

function roleIsLleech(w:HistoryWorld,p:string):boolean {return w.current[p]==="lleech";}

function processDeath(
  w: HistoryWorld,
  d: DeathEvent,
  n: number,
  poisonChoice: string | null,
  selfKill: boolean,
  g: GameSnapshot,
  demonAttackRole: RoleId | null = null,
): HistoryWorld[] {
  if (!w.alive.includes(d.playerId)) {
    const lleech = Object.keys(w.initial).find(p => w.initial[p] === "lleech");
    return lleech===d.playerId && w.lleechDiedAt===d.when ? [w] : [];
  }
  if (roleIsLleech(w,d.playerId) && !w.lleechAbilityLost && w.lleechHost && w.alive.includes(w.lleechHost) && !worldImpaired(w,d.playerId,poisonChoice,g,d.when)) return [];
  const before = w.alive.length, role = w.current[d.playerId], impaired = worldImpaired(w, d.playerId, poisonChoice, g, d.when);
  const inheritedCannibalRole = role === "cannibal" ? (w.cannibalAbilities[d.playerId] ?? null) : null;
  const deathAbilityRole = d.playerId === "self" && role === "philosopher" && w.philosopherAbility ? w.philosopherAbility : inheritedCannibalRole ?? role;
  if (d.sourceRoleId === "mutant") {
    if (deathAbilityRole !== "mutant" || impaired || !diedByExecution(d)) return [];
  }
  if (d.sourceRoleId === "witch") {
    const action = (g.minionActionLog ?? []).find((a): a is Extract<MinionActionEvent,{roleId:"witch"}> => a.roleId === "witch" && a.when === `N${n}` && a.target === d.playerId);
    const nomination = g.nominationLog.find(e => e.when === `D${n}` && e.nominator === d.playerId && compareEvents(e, d) < 0);
    if (d.when !== `D${n}` || !action || action.triggered !== true || !nomination || !minionAbilityAvailable(w, "self", "witch", poisonChoice) || worldImpaired(w, "self", poisonChoice, g)) return [];
  }
  if (d.sourceRoleId === 'golem'){
    const record=(g.outsiderEvents??[]).find(e=>e.kind==='golem_nomination' && e.killed && e.when===d.when && e.target===d.playerId);
    if(!record || record.kind!=='golem_nomination')return [];
    const actor=d.sourcePlayerId ?? record.playerId;
    if(actor!==record.playerId || !w.alive.includes(actor))return [];
    const ability=(w.current[actor]==='golem' || (w.current[actor]==='hermit' && getSnapshotScriptRoleIds(g).includes('golem')) ||
      (ROLES[w.current[actor]]?.type==='demon' && w.boffinGrantedAbility==='golem' && boffinActive(w,poisonChoice,g,d.when)));
    if(!ability || worldImpaired(w,actor,poisonChoice,g,d.when) || ROLES[w.current[d.playerId]]?.type==='demon')return [];
    if(!g.nominationLog.some(e=>e.when===d.when&&e.nominator===actor&&e.nominee===d.playerId))return [];
  }
  if (d.sourceRoleId === "psychopath" || d.reason === "psychopath") {
    // A witnessed Psychopath kill identifies an active Psychopath; ordinary
    // unexplained deaths do not. The actor is recorded for public kills.
    if (!d.when.startsWith("D")) return [];
    const documented = (g.psychopathEvents ?? []).find(e => e.when === d.when && e.target === d.playerId && e.killed);
    const actor = d.sourcePlayerId ?? documented?.playerId ?? null;
    const actors = Object.keys(w.current).filter(p => p !== d.playerId &&
      minionAbilityAvailable(w,p,"psychopath",poisonChoice,g,d.when) &&
      !worldImpaired(w,p,poisonChoice,g,d.when));
    if ((actor && !actors.includes(actor)) || (!actor && !actors.length)) return [];
  }
  if (d.sourceRoleId === "harpy") {
    const actors=Object.keys(w.current).filter(p=>minionAbilityAvailable(w,p,'harpy',poisonChoice,g,d.when) && !worldImpaired(w,p,poisonChoice,g,d.when));
    const selfHarpy=actors.includes('self');
    const actions=(g.minionActionLog??[]).filter((a):a is Extract<MinionActionEvent,{roleId:"harpy"}> => a.roleId==='harpy' && a.when===`N${n}`);
    // In a public game the Harpy's private choices may be unknown. Do not
    // require self-mode action entries when a different player is the Harpy.
    if (!d.when.startsWith('D') || !actors.length ||
      (selfHarpy && actions.length>0 && !actions.some(a=>[a.target,a.accuse].includes(d.playerId))))return [];
  }
  if (d.sourceRoleId === "cerenovus") {
    const action = (g.minionActionLog ?? []).find((a): a is Extract<MinionActionEvent,{roleId:"cerenovus"}> => a.roleId === "cerenovus" && a.when === `N${n}` && a.target === d.playerId);
    if (d.when !== `D${n}` || !action || !diedByExecution(d) || !minionAbilityAvailable(w, "self", "cerenovus", poisonChoice) || worldImpaired(w, "self", poisonChoice, g)) return [];
  }
  const next = copyWorld(w); next.alive = next.alive.filter(p => p !== d.playerId);
  if (w.lleechHost === d.playerId && !w.lleechAbilityLost) {
    // Lleech/Mastermind: an EXECUTED host dies but the Lleech lives, loses
    // immortality, and stops poisoning the former host. Other host deaths
    // continue to kill the Lleech as normal.
    const activeMastermind = w.alive.some(p => w.current[p] === 'mastermind');
    const lleech = w.alive.find(p => w.current[p] === 'lleech');
    if (lleech && activeMastermind && diedByExecution(d)) {
      next.lleechAbilityLost=true;
      next.permanentPoison=next.permanentPoison.filter(p=>p!==d.playerId);
    } else if (lleech) {
      next.alive=next.alive.filter(p=>p!==lleech);
      next.lleechDiedAt=d.when;
      next.ended=true;next.endReason='demonDeath';
    }
  }
  if (w.lilMonstaHolder === d.playerId && !next.ended) {next.ended=true;next.endReason="demonDeath";}
  if (diedByExecution(d) && Object.values(w.current).includes("leviathan") && w.currentAlignment[d.playerId]==="good") {
    next.leviathanGoodExecutions++;
    if(next.leviathanGoodExecutions>=2){next.ended=true;next.endReason="leviathan";}
  }
  if (role === "boomdandy" && diedByExecution(d) && !impaired &&
      !preacherSuppresses(w,d.playerId,poisonChoice,g,d.when)) {
    addAssumption(next, `boomdandyExplosion:${d.when}:${d.playerId}`, .02);
  }
  if (role === "poppy_grower" && !impaired) {
    const revealNumber = n + (d.when.startsWith("D") ? 1 : 0);
    next.poppyRevealNight = `N${revealNumber}`;
  }
  if (diedByExecution(d)) {
    for (const cannibal of next.alive.filter(p => next.current[p] === "cannibal")) {
      next.cannibalAbilities[cannibal] = role;
      if (w.currentAlignment[d.playerId] === "evil") {
        if (!next.cannibalPoisoned.includes(cannibal)) next.cannibalPoisoned.push(cannibal);
      } else {
        next.cannibalPoisoned = next.cannibalPoisoned.filter(p => p !== cannibal);
      }
      addAssumption(next, `cannibalEat:${d.when}:${cannibal}:${d.playerId}:${role}:${w.currentAlignment[d.playerId]}`, .02);
    }
  }
  if (role === 'alchemist' && d.playerId === 'self' && alchemistAbilityRole(g) === 'summoner' &&
      n < 3 && !Object.values(w.current).some(r => ROLES[r]?.type === 'demon')) {
    next.ended=true;next.endReason='jinx';next.jinxWinner='evil';next.jinxPair='alchemist:summoner';
  } else if (role === "summoner" && n < 3 && !Object.values(w.current).some(r => ROLES[r]?.type === "demon")) {
    next.ended=true;
    next.endReason="summoner";
  }
  if (role === "king" && demonAttackRole && d.when.startsWith("N")) {
    const demon = Object.keys(w.current).find(p => ROLES[w.current[p]]?.type === "demon" && w.alive.includes(p));
    if (demon) for (const choirboy of next.alive.filter(p => next.current[p] === "choirboy")) {
      next.choirboyDemonInfo[`${choirboy}:${d.when}`] = demon;
    }
  }
  if (deathAbilityRole === "banshee" && demonAttackRole && !impaired && !next.bansheeActive.includes(d.playerId)) {
    next.bansheeActive.push(d.playerId);
  }
  const twin = activeEvilTwin(w, poisonChoice, g);
  if (twin && d.playerId === twin.twin && diedByExecution(d)) { next.ended = true; next.endReason = "evilTwin"; }
  if (role === "saint" && diedByExecution(d) && !impaired) {next.ended = true; next.endReason = "saint";}
  if (deathAbilityRole === "sweetheart" && !impaired) {
    const targets = Object.keys(next.current);
    return targets.flatMap(target => {
      const branch = copyWorld(next);
      if (!branch.permanentDrunk.includes(target)) branch.permanentDrunk.push(target);
      addAssumption(branch, `sweetheartDrunk:${d.when}:${d.playerId}:${target}`, .04);
      if (ROLES[role].type !== "demon") {
        const livingDemon = branch.alive.find(p => ROLES[branch.current[p]].type === "demon");
        if (!branch.ended && branch.alive.length <= 2 && livingDemon && ROLES[branch.current[livingDemon]].solverSupport === "full") { branch.ended = true; branch.endReason = "twoAlive"; }
      }
      return [branch];
    });
  }
  if (deathAbilityRole === "barber" && !impaired && !next.unresolvedBarberFrom.includes(d.when)) {
    next.unresolvedBarberFrom.push(d.when);
    addAssumption(next, `barberSwapUnknown:${d.when}:${d.playerId}`, .02);
  }
  if (demonAttackRole === "vigormortis" && ROLES[role]?.type === "minion") {
    return ([-1, 1] as const).map(direction => {
      const branch = copyWorld(next);
      branch.vigormortisPoisonDirections[d.playerId] = direction;
      addAssumption(branch, `vigormortisPoison:${d.when}:${d.playerId}:${direction}`, .02);
      const livingDemon = branch.alive.find(p => ROLES[branch.current[p]].type === "demon");
      if (!branch.ended && branch.alive.length <= 2 && livingDemon && ROLES[branch.current[livingDemon]].solverSupport === "full") { branch.ended = true; branch.endReason = "twoAlive"; }
      return branch;
    });
  }
  if (ROLES[role].type !== "demon") {
    // Each healthy Farmer night-death turns exactly one other living good
    // player into Farmer, even if they are an Outsider or an evil-looking role.
    // An evil Townsfolk from Bounty Hunter is never a valid recipient.
    const farmerBranches: HistoryWorld[] = (deathAbilityRole === "farmer" && d.when.startsWith("N") && !impaired)
      ? (() => {
          const targets = next.alive.filter(p => next.currentAlignment[p] === "good" && next.current[p] !== "farmer");
          if (!targets.length) return [next];
          return targets.map(playerId => {
            const branch = copyWorld(next), fromRole = branch.current[playerId];
            branch.current[playerId] = "farmer";
            branch.changes.push({when: d.when, kind: "farmer", playerId, fromRole, toRole: "farmer"});
            return branch;
          });
        })()
      : [next];
    for (const branch of farmerBranches) {
      const livingDemon = branch.alive.find(p => ROLES[branch.current[p]].type === "demon");
      if (!branch.ended && branch.alive.length <= 2 && livingDemon && ROLES[branch.current[livingDemon]].solverSupport === "full") {branch.ended = true; branch.endReason = "twoAlive";}
    }
    const livingDemon = next.alive.find(p => ROLES[next.current[p]].type === "demon");
    if (!next.ended && twin && (d.playerId === "self" || d.playerId === twin.twin) && !livingDemon) { next.ended = true; next.endReason = "demonDeath"; }
    return farmerBranches;
  }
  // A Lil' Monsta placeholder is a Minion even when it is not babysitting.
  if (role === "lil_monsta" && w.lilMonstaHolder !== d.playerId) return [next];
  const anotherLivingDemon = next.alive.find(p => ROLES[next.current[p]].type === "demon");
  if (anotherLivingDemon) return [next];
  if (role !== "imp") {
    if (ROLES[role].solverSupport === "full") {
      if (!evilTwinBlocksGood(next, poisonChoice, g)) { next.ended = true; next.endReason = "demonDeath"; }
      return [next];
    }
    addAssumption(next, `genericDemonDeath:${d.when}:${role}`, .05);
    return [next];
  }
  const sw = next.alive.find(p => next.current[p] === "scarlet_woman" && !worldImpaired(next, p, poisonChoice, g, d.when) && !preacherSuppresses(next,p,poisonChoice,g,d.when));
  if (sw && before >= 5) {
    next.current[sw] = "imp"; next.changes.push({ when: d.when, from: d.playerId, to: sw, kind: "scarlet" });
    return [next];
  }
  if (selfKill) {
    const successors = next.alive.filter(p => ROLES[next.current[p]].type === "minion");
    if (successors.length) return successors.map(to => { const branch = copyWorld(next); branch.current[to] = "imp"; branch.changes.push({ when: d.when, from: d.playerId, to, kind: "starpass" }); if(branch.alive.length <= 2){branch.ended=true;branch.endReason="twoAlive";} return branch; });
  }
  if (!evilTwinBlocksGood(next, poisonChoice, g)) { next.ended = true; next.endReason = "demonDeath"; }
  void n;
  return [next];
}

function scoreClaims(w: HistoryWorld, g: GameSnapshot) {
  for (const p of seats(g.playerCount)) {
    if (p === "self" && g.selfRole.shownRole) continue;
    const entries = g.roleClaimLog.filter(c => c.playerId === p && c.claimType !== "bluff").sort(compareEvents);
    const c = entries.at(-1); if (!c) continue;
    const role = w.initial[p];
    if (c.subject.kind === "role") {
      if (role === c.subject.roleId) w.logScore += 1.5;
      else if (w.believedRoles[p] === c.subject.roleId) w.logScore += 1.1;
      else if(ROLES[role]?.type==='demon' && w.boffinGrantedAbility===c.subject.roleId) w.logScore += 1.2;
    } else if (c.subject.kind === "tag") { if (ROLES[role].tags.includes(c.subject.tag)) w.logScore += .6; }
    else if (c.subject.kind === "type") { if (ROLES[role].type === c.subject.roleType) w.logScore += .6; }
    else if (c.subject.alignment === w.initialAlignment[p]) w.logScore += .3;
  }
}

/** Returns representative compatible histories, not an exhaustive world set. */
/** Apply only recorded and explicitly confirmed Outsider events at the end of a phase.
 * Claims and suspects are never inserted here as mechanical facts. */
function applyConfirmedOutsiderResults(world:HistoryWorld, g:GameSnapshot, when:string, poisonChoice:string|null):HistoryWorld|null{
 const events=(g.outsiderEvents??[]).filter(e=>e.when===when);
 if(!events.length)return world;
 const w=copyWorld(world);
 for(const ev of events){
   const effective=w.current[ev.playerId];
   const canCopy=(role:RoleId)=>effective==='hermit' && getSnapshotScriptRoleIds(g).includes(role);
   if(ev.kind==='puzzlemaster_guess'){
     if(effective!=='puzzlemaster'&&!canCopy('puzzlemaster'))return null;
     // The ability to guess is lost on death. A same-day death may happen
     // *after* their guess, so check for a death in a prior phase only.
     const priorDeaths=g.deathLog.filter(d=>d.playerId===ev.playerId&&phaseIndex(d.when)<phaseIndex(when));
     const priorRevives=(g.revivalLog??[]).filter(r=>r.playerId===ev.playerId&&phaseIndex(r.when)<phaseIndex(when));
     if(priorDeaths.length>priorRevives.length)return null;
     const sober=!worldImpaired(w,ev.playerId,poisonChoice,g,when);
     if(sober && w.puzzlemasterDrunk){
       const correct=w.puzzlemasterDrunk===ev.target;
       const isActualDemon=ROLES[w.current[ev.shownDemon]]?.type==='demon';
       if(correct!==isActualDemon)return null;
     }
   }else if(ev.kind==='golem_nomination'){
     if(effective!=='golem'&&!canCopy('golem') && !(ROLES[effective]?.type==='demon' && w.boffinGrantedAbility==='golem' && boffinActive(w,poisonChoice,g,when)))return null;
     if(!g.nominationLog.some(e=>e.when===when&&e.nominator===ev.playerId&&e.nominee===ev.target))return null;
     if(ev.killed!==g.deathLog.some(e=>e.when===when&&e.playerId===ev.target&&e.sourceRoleId==='golem'))return null;
     if(ev.killed && ROLES[w.current[ev.target]]?.type==='demon')return null;
   }else if(ev.kind==='hatter_change'){
     const actualDeath=g.deathLog.some(e=>e.playerId===ev.playerId && phaseIndex(e.when)<=phaseIndex(when));
     if((effective!=='hatter'&&!canCopy('hatter'))||!actualDeath || w.currentAlignment[ev.target]!=='evil')return null;
     const former=w.current[ev.target], oldType=ROLES[former]?.type;
     if(oldType!=='minion'&&oldType!=='demon')return null;
     if(ROLES[ev.newRole]?.type!==oldType)return null;
     if(w.current[ev.target]!==ev.newRole){
       if(Object.entries(w.current).some(([p,r])=>p!==ev.target&&r===ev.newRole&&r!=='legion'))return null;
       w.current[ev.target]=ev.newRole;
       w.changes.push({when,kind:'hatter',playerId:ev.target,fromRole:former,toRole:ev.newRole});
     }
   }else if(ev.kind==='plague_grant'){
     if(effective!=='plague_doctor'&&!canCopy('plague_doctor'))return null;
     if(!g.deathLog.some(d=>d.playerId===ev.playerId&&phaseIndex(d.when)<=phaseIndex(when)))return null;
     if(ROLES[ev.abilityRole]?.type!=='minion')return null;
     w.storytellerMinionAbilities.push({when,role:ev.abilityRole});
   }else if(ev.kind==='politician_suspicion'){
     // Suspicious conduct is a soft clue only, never a hard alignment lock.
     continue;
   }else if(ev.kind==='politician_reward'){
     if(effective!=='politician'&&!canCopy('politician'))return null;
     w.politicianRewarded=true;
   }
 }
 return w;
}
function endWinner(world:HistoryWorld):Alignment|null{
 if(!world.ended)return null;
 if(world.endReason==='jinx')return world.jinxWinner??null;
 if(world.endReason==='fearmonger')return world.fearmongerWinner??null;
 if(world.endReason==='mayor'||world.endReason==='demonDeath'||world.endReason==='alsaahir')return 'good';
 return 'evil';
}
/** Heretic reverses the eventual winning team, even while dead. */
function applyHereticWinner(world:HistoryWorld,g:GameSnapshot):HistoryWorld{
 const winner=endWinner(world);if(!winner)return world;
 const heretics=Object.entries(world.current).filter(([,role])=>role==='heretic').map(([p])=>p);
 // Poisoned or drunk Heretics lose their ability; do not invert those worlds.
 const active=heretics.some(p=>!worldImpaired(world,p,world.poison[g.night]??null,g,`D${g.night}`));
 const w=copyWorld(world);w.effectiveWinner=active?(winner==='good'?'evil':'good'):winner;
 return w;
}
export function evaluateAssignment(initial: Record<string, RoleId>, g: GameSnapshot, beamWidth = 3): HistoryWorld[] {
  if (!validSetup(initial, g)) return [];
  // Action history is trusted only after validating once-per-game and once-per-night
  // limits: do not silently consume the first of multiple recorded actions.
  for (const roleId of ["huntsman", "nightwatchman", "engineer", "pixie"] as const) {
    if (g.selfActionLog.filter(a => a.roleId === roleId).length > 1) return [];
  }
  const lycanNights = g.selfActionLog.filter(a => a.roleId === "lycanthrope").map(a => a.when);
  if (new Set(lycanNights).size !== lycanNights.length || lycanNights.includes("N1")) return [];
  if (g.selfActionLog.filter(a => a.roleId === "damsel").length > 1) return [];
  if ((g.minionActionLog??[]).filter(a=>a.roleId==='mezepheles').length>1) return [];
  const psychActions=(g.minionActionLog??[]).filter(a=>a.roleId==='psychopath');
  if(new Set(psychActions.map(a=>a.when)).size!==psychActions.length)return [];
  for (const ev of g.psychopathEvents ?? []) {
    if (ev.killed && !g.deathLog.some(d => d.when === ev.when && d.playerId === ev.target &&
      (d.sourceEventId === ev.id || (d.sourceRoleId === "psychopath" && d.sourcePlayerId === ev.playerId)))) return [];
  }

  const obs = observations(g), order = seats(g.playerCount);
  const baseInitialAlignment = Object.fromEntries(order.map(p => [p, defaultAlignmentForRole(initial[p])])) as Record<string, Alignment>;
  const bountyHunterInPlay = Object.values(initial).includes("bounty_hunter");
  const bountyHunterAlignmentOptions: Record<string, Alignment>[] = bountyHunterInPlay
    ? order
        .filter(p => ROLES[initial[p]]?.type === "townsfolk")
        .map(p => ({ ...baseInitialAlignment, [p]: "evil" as Alignment }))
    : [{ ...baseInitialAlignment }];
  const hasFT = Object.values(initial).includes("fortune_teller");
  const drunk = order.find(p => initial[p] === "drunk");
  const scriptRoles = getSnapshotScriptRoleIds(g).map(id => ROLES[id]);
  const unselectedTownsfolk = scriptRoles.filter(r => r.type === "townsfolk" && !Object.values(initial).includes(r.id)).map(r => r.id);
  const relevantBeliefs = drunk ? [...new Set([
    ...obs.filter(o => o.source === drunk).map(o => o.role),
    ...g.roleClaimLog.filter(c => c.playerId === drunk && c.subject.kind === "role").flatMap(c => c.subject.kind === "role" ? [c.subject.roleId] : []),
  ])].filter(r => unselectedTownsfolk.includes(r)) : [];
  const beliefs: (RoleId | null)[] = drunk === "self" && g.selfRole.shownRole ? [g.selfRole.shownRole] : drunk ? (relevantBeliefs.length ? relevantBeliefs : unselectedTownsfolk.slice(0,1)) : [null];
  const selfBelief = g.selfRole.shownRole && initial.self !== g.selfRole.shownRole ? g.selfRole.shownRole : null;
  const marionette=order.find(p=>initial[p]==='marionette');
  const marionetteClaimed=marionette ? [...new Set([
    ...(marionette==='self' && selfBelief ? [selfBelief] : []),
    ...g.roleClaimLog.filter(c=>c.playerId===marionette && c.subject.kind==='role')
      .flatMap(c=>c.subject.kind==='role'?[c.subject.roleId]:[]),
    ...obs.filter(o=>o.source===marionette).map(o=>o.role)
  ])].filter(id=>ROLES[id]?.type==='townsfolk'||ROLES[id]?.type==='outsider') : [];
  // Like the Drunk, the Marionette is shown a good token that is not
  // genuinely in play. An ordinary role claim can be a deliberate bluff,
  // so conflicting claims must not force an impossible token.
  const availableMarionetteBeliefs = [...new Set([
    ...marionetteClaimed.filter(id=>!Object.values(initial).includes(id)),
    ...unselectedTownsfolk,
    ...scriptRoles.filter(r=>r.type==='outsider'&&r.id!=='drunk'&&!Object.values(initial).includes(r.id)).map(r=>r.id)
  ])];
  // A setup whose Outsider count is only legal due to a *believed* role
  // needs that exact Marionette belief. Do not accept a free Outsider merely
  // because the names Huntsman/Balloonist appear together on the script.
  const actualOutsiders = Object.values(initial).filter(id=>ROLES[id]?.type==='outsider').length;
  const actualTownsfolk = Object.values(initial).filter(id=>ROLES[id]?.type==='townsfolk').length;
  const ordinaryCount = setupCountOptionsForGame(g, Object.values(initial)).some(c=>
    c.outsider===actualOutsiders && c.townsfolk===actualTownsfolk);
  const marionetteBeliefs: (RoleId|null)[]=marionette
    ? availableMarionetteBeliefs.filter(id => {
        if(id==='huntsman' && !Object.values(initial).includes('damsel')) return false;
        if(ordinaryCount) return true;
        if(id!=='huntsman' && id!=='balloonist') return false;
        const variant=setupCountOptionsForGame(g,[...Object.values(initial),id]);
        return variant.some(c=>c.outsider===actualOutsiders && c.townsfolk===actualTownsfolk);
      }).slice(0,4) : [null];
  if (marionette && !marionetteBeliefs.length) return [];
  let worlds: HistoryWorld[] = bountyHunterAlignmentOptions.flatMap(initialAlignment => {
    const herrings: (string | null)[] = hasFT ? order.filter(p => initialAlignment[p] === "good") : [null];
    return herrings.flatMap(redHerring => beliefs.flatMap(belief => marionetteBeliefs.map(mBelief => ({ initial, current: { ...initial }, initialAlignment: { ...initialAlignment }, currentAlignment: { ...initialAlignment }, believedRoles: { ...(drunk && belief ? {[drunk]:belief} : {}), ...(selfBelief ? {self:selfBelief} : {}), ...(marionette&&mBelief?{[marionette]:mBelief}:{}) }, alive: order, redHerring, poison: {}, permanentPoison: [], permanentDrunk: [], puzzlemasterDrunk:null, ogreFriend:null, storytellerMinionAbilities:[], politicianRewarded:false, fangGuJumped: false, mezephelesUsed:false, widowTarget:null, xaanTriggered:null, leviathanGoodExecutions: 0, boffinGrantedAbility:null, lleechHost:null,lleechDiedAt:null,lleechAbilityLost:false,lilMonstaHolder: order.find(p=>initial[p]==="lil_monsta")??null,lilMonstaUnderlyingRole:null, vigormortisPoisonDirections: {}, philosopherAbility: null, cannibalAbilities: {}, cannibalPoisoned: [], bansheeActive: [], choirboyDemonInfo: {}, fauxPaw: null, pixieAbilities: {}, villageIdiotDrunk: null, preachedMinions: [], poppyRevealNight: null, damselGuessed: false, huntsmanUsed: [], nightwatchmanUsed: [], engineerUsed: [], unresolvedBarberFrom: [], requiredPoison: {}, info: {}, changes: [], arbitraryDeathNights: [], logScore: 0, assumptions: [], ended: false }))));
  });
  // The Puzzlemaster fixes ONE unique drunk from setup. The effect persists
  // after their death; it is not the Drunk character and not an arbitrary
  // per-night Poisoner target. Other players can be chosen, even evil.
  worlds=worlds.flatMap(w=>{
    const pm=order.find(p=>w.initial[p]==='puzzlemaster');
    // Full Hermit duplication would require a separate drunk target for every
    // in-play Puzzlemaster/Hermit and can explode the candidate-world search.
    // Preserve the standalone Puzzlemaster effect without asserting a false
    // constraint for the Storyteller-controlled compound case.
    if(!pm)return [w];
    // The Storyteller may select the Puzzlemaster themself. Even in that
    // case the permanent drunkenness persists, but their own guess can fail.
    const pool=order;
    return pool.map(target=>({...copyWorld(w),puzzlemasterDrunk:target}));
  });
  // The Ogre's first-night choice changes alignment even when Ogre is drunk
  // or poisoned. Public suspicions about the friend are not hard evidence.
  worlds=worlds.flatMap(w=>{
    const ogre=order.find(p=>w.initial[p]==='ogre');
    if(!ogre)return [w];
    const known=(g.outsiderEvents??[]).find(e=>e.kind==='ogre_choice'&&e.playerId===ogre);
    const pool=known&&known.kind==='ogre_choice'?[known.target]:order.filter(p=>p!==ogre);
    return pool.filter(target=>target!==ogre && !!w.currentAlignment[target]).map(target=>{
      const next=copyWorld(w);next.ogreFriend=target;
      next.initialAlignment[ogre]=w.initialAlignment[target];
      next.currentAlignment[ogre]=w.initialAlignment[target];
      return next;
    });
  });
  // Choose the Boffin gift from good characters not actually in play.
  // Focus on recorded ability events first, retaining other possibilities.
  worlds=worlds.flatMap(w=>{
    if(!Object.values(w.initial).includes('boffin'))return [w];
    const direct=(g.selfRole.shownRole && ROLES[g.selfRole.shownRole].type==='demon'
      ? g.demonState?.boffinGrantedAbility : g.selfRole.shownRole==='boffin' ? g.minionState?.boffinGrantedAbility : null);
    const eligible=getSnapshotScriptRoleIds(g).filter(id=>
      ['townsfolk','outsider'].includes(ROLES[id]?.type) && (!Object.values(w.initial).includes(id) || (id==='village_idiot' && Object.values(w.initial).filter(r=>r===id).length<3)) && id!=='drunk');
    if(direct && !eligible.includes(direct))return [];
    const demonSeats=order.filter(p=>ROLES[w.initial[p]]?.type==='demon');
    const triggered:RoleId[]=g.abilityTriggerLog.filter(t=>t.triggered && demonSeats.includes(t.rolePlayerId)).map(t=>t.roleId);
    const reported=g.abilityClaimLog.filter(a=>demonSeats.includes(a.playerId)).map(a=>a.roleId);
    const options=direct?[direct]:triggered.length?eligible.filter(id=>triggered.includes(id)):
      [...new Set([...eligible.filter(id=>reported.includes(id)),...eligible])].slice(0,4);
    return options.map(role=>({...copyWorld(w),boffinGrantedAbility:role}));
  });
  // The Lleech chooses one host on N1. Its target is poisoned permanently,
  // and the Demon cannot die while that target is alive. A recorded self-mode
  // target is a hard lock; otherwise these are competing hidden histories.
  worlds=worlds.flatMap(w=>{
    const lleech=order.find(p=>w.initial[p]==="lleech");
    if(!lleech)return [w];
    const targets=(lleech==="self" && g.demonState?.lleechHost) ? [g.demonState.lleechHost] : order.filter(p=>p!==lleech);
    return targets.map(host=>({...copyWorld(w),lleechHost:host,permanentPoison:[...w.permanentPoison,host]}));
  });
  // Widow picks one player on N1. Keep alternative hidden poison hosts.
  worlds=worlds.flatMap(w=>{
    const widow=order.find(p=>w.initial[p]==='widow');
    if(!widow)return [w];
    const chosen=widow==='self'?g.minionState?.widowPoisonedPlayer:null;
    const candidates=chosen?[chosen]:[...new Set([
      ...g.abilityClaimLog.filter(a=>a.structured&&a.visibility==='public').map(a=>a.playerId),
      ...order.filter(p=>p!==widow)
    ])].slice(0,Math.min(order.length,6));
    return candidates.map(target=>({...copyWorld(w),widowTarget:target}));
  });
  // Lil' Monsta's physical holder has an underlying Minion ability, not the
  // Lil' Monsta character. Sample the unseen role without double-using one.
  worlds=worlds.flatMap(w=>{
    if(!w.lilMonstaHolder)return [w];
    const pool=getSnapshotScriptRoleIds(g).filter(role=>ROLES[role].type==="minion" && !Object.values(initial).includes(role));
    return pool.slice(0,Math.min(3,pool.length)).map(role=>({...copyWorld(w),lilMonstaUnderlyingRole:role}));
  });
  // Plague Doctor gives the Storyteller an ability, not an extra Minion
  // character. Recorded grants are replayed after the Doctor's death below.
  // One of the EXTRA Village Idiots is drunk, fixed for the entire game.
  // With only one Village Idiot in play, that lone player is always sober.
  worlds = worlds.flatMap(w => {
    const players=order.filter(p=>w.initial[p]==="village_idiot");
    return players.length>=2 ? players.map(p=>({...copyWorld(w),villageIdiotDrunk:p})) : [w];
  });
  // A living Lycanthrope makes one good player register as evil to its attacks.
  // Preserve that hidden starting choice across nights and across different
  // alternative histories; it does not change true team alignment.
  worlds = worlds.flatMap(w => Object.values(w.initial).includes("lycanthrope")
    ? Object.keys(w.initial).filter(p => w.initialAlignment[p] === "good").map(p => ({ ...copyWorld(w), fauxPaw: p }))
    : [w]);
  for (const w of worlds) scoreClaims(w, g);
  // The Puzzlemaster and Ogre records are Storyteller-confirmed setup facts,
  // so a separate player cannot impersonate the source when those are entered.
  for(const ev of g.outsiderEvents??[]){
    if(ev.kind==='ogre_choice' && (!initial[ev.playerId] || initial[ev.playerId]!=='ogre'))return [];
  }
  const recordedEndPhase = Math.max(-1,...[...(g.jinxVictoryLog??[]),...(g.outsiderEvents??[]),...g.roleClaimLog, ...g.abilityClaimLog, ...g.deathLog, ...(g.revivalLog ?? []), ...g.nominationLog, ...g.abilityTriggerLog, ...g.selfInfoLog, ...g.selfActionLog, ...(g.demonActionLog ?? []), ...(g.minionActionLog ?? []), ...g.talkLog].map(e => phaseIndex(e.when)), ...g.noExecutionDays.map(n => phaseIndex(`D${n}`)));
  const lastPhase = Math.max((g.night-1)*2, recordedEndPhase);
  for (let n = 1; n <= g.night; n++) {
    const nextWorlds: HistoryWorld[] = [];
    const nw = `N${n}`, dw = `D${n}`;
    const nightDeaths = g.deathLog.filter(d => d.when === nw).sort(compareEvents);
    const nightLifeEvents = [
      ...nightDeaths.map(e => ({ ...e, kind: "death" as const })),
      ...(g.revivalLog ?? []).filter(e => e.when === nw).map(e => ({ ...e, kind: "revival" as const })),
    ].sort(compareEvents);
    const normalDeaths = nightDeaths.filter(d => (!!d.sourceRoleId && ROLES[d.sourceRoleId]?.type === "demon") || (d.reason === "night_death" && (!d.sourceRoleId || ROLES[d.sourceRoleId]?.type === "demon")));
    const princessPrevious = g.selfActionLog.find((a):a is Extract<SelfActionEvent,{roleId:"princess"}>=>a.roleId==="princess" && a.when===`D${n-1}`);
    const demonActions = (g.demonActionLog ?? []).filter(a => a.when === nw).sort(compareEvents);
    const demonAction = demonActions.at(-1);
    const pitHagAction = (g.minionActionLog ?? []).find(
      (a): a is Extract<NonNullable<GameSnapshot["minionActionLog"]>[number], { roleId: "pit_hag" }> =>
        a.roleId === "pit_hag" && a.when === nw
    );
    const cacklejackChange = (g.travellerActionLog ?? []).find(
      (a): a is Extract<NonNullable<GameSnapshot["travellerActionLog"]>[number], { kind: "cacklejack_change" }> =>
        a.kind === "cacklejack_change" && a.when === nw
    );
    const witchAction = (g.minionActionLog ?? []).find(
      (a): a is Extract<NonNullable<GameSnapshot["minionActionLog"]>[number], { roleId: "witch" }> =>
        a.roleId === "witch" && a.when === nw
    );
    const cerenovusAction = (g.minionActionLog ?? []).find(
      (a): a is Extract<NonNullable<GameSnapshot["minionActionLog"]>[number], { roleId: "cerenovus" }> =>
        a.roleId === "cerenovus" && a.when === nw
    );
    const snakeCharmerAction = g.selfActionLog.find(
      (a): a is Extract<SelfActionEvent, { roleId: "snake_charmer" }> => a.roleId === "snake_charmer" && a.when === nw
    );
    const philosopherAction = g.selfActionLog.find(
      (a): a is Extract<SelfActionEvent, { roleId: "philosopher" }> => a.roleId === "philosopher" && a.when === nw
    );
    const nightKlutzAction = g.selfActionLog.find(
      (a): a is Extract<SelfActionEvent, { roleId: "klutz" }> => a.roleId === "klutz" && a.when === nw
    );
    const dayKlutzAction = g.selfActionLog.find(
      (a): a is Extract<SelfActionEvent, { roleId: "klutz" }> => a.roleId === "klutz" && a.when === dw
    );
    const huntsmanAction = g.selfActionLog.find((a): a is Extract<SelfActionEvent,{roleId:"huntsman"}> => a.roleId === "huntsman" && a.when === nw);
    const nightwatchmanAction = g.selfActionLog.find((a): a is Extract<SelfActionEvent,{roleId:"nightwatchman"}> => a.roleId === "nightwatchman" && a.when === nw);
    const pixieAction = g.selfActionLog.find((a): a is Extract<SelfActionEvent,{roleId:"pixie"}> => a.roleId === "pixie" && a.when === nw);
    const lycanAction = g.selfActionLog.find((a): a is Extract<SelfActionEvent,{roleId:"lycanthrope"}> => a.roleId === "lycanthrope" && a.when === nw);
    const engineerAction = g.selfActionLog.find(
      (a): a is Extract<SelfActionEvent, {roleId: "engineer"}> => a.roleId === "engineer" && a.when === nw
    );
    const farmerSelfActions = g.selfActionLog.filter(
      (a): a is Extract<SelfActionEvent, {roleId: "farmer"}> => a.roleId === "farmer" && a.when === nw
    );
    const preacherAction = g.selfActionLog.find((a):a is Extract<SelfActionEvent,{roleId:"preacher"}>=>a.roleId==="preacher"&&a.when===nw);
    const acrobatAction = g.selfActionLog.find(
      (a): a is Extract<SelfActionEvent, { roleId: "acrobat" }> => a.roleId === "acrobat" && a.when === nw
    );
    const alsaahirAction = g.selfActionLog.find(
      (a): a is Extract<SelfActionEvent, { roleId: "alsaahir" }> => a.roleId === "alsaahir" && a.when === dw
    );
    const initialDemonRole = Object.values(initial).find(role => ROLES[role]?.type === "demon");
    const initialSupportedDemonRules = !!initialDemonRole && ROLES[initialDemonRole].solverSupport === "full";
    if (initialSupportedDemonRules && (demonActions.length > 1 || (n === 1 && (normalDeaths.length || demonActions.length)))) return [];
    const dayEvents = [
      ...g.nominationLog.filter(e => e.when === dw).map(e => ({ ...e, kind: "nomination" as const })),
      ...g.abilityTriggerLog.filter(e => e.when === dw).map(e => ({ ...e, kind: "trigger" as const })),
      ...g.selfActionLog.filter((e): e is Extract<SelfActionEvent,{roleId:"damsel"}> => e.roleId === "damsel" && e.when === dw).map(e => ({ ...e, kind:"damsel_guess" as const })),
      ...g.deathLog.filter(e => e.when === dw).map(e => ({ ...e, kind: "death" as const })),
    ].sort(compareEvents);
    for (const previous of worlds) {
      if (previous.ended) {
        const jinxTrigger=(g.jinxVictoryLog??[]).find(e=>e.pair===previous.jinxPair);
        const victoryDay = jinxTrigger ? cycle(jinxTrigger.when) : previous.jinxPair==='leviathan:mayor' ? 5 : null;
        if(previous.endReason==='jinx' && victoryDay!==null && n===victoryDay+1 &&
           g.night===n && recordedEndPhase<=phaseIndex(`D${victoryDay}`)) nextWorlds.push(previous);
        else if(previous.endReason==='leviathan' && n===6 && g.night===6 && recordedEndPhase<=phaseIndex('D5')) nextWorlds.push(previous);
        continue;
      }
      if (g.selfActionLog.some(a => a.roleId === "monk" && a.when === nw) && (!previous.alive.includes("self") || n === 1)) continue;
      // The evil-team introduction normally happens before Poisoner's N1 action.
      // A Poppy Grower present at setup hides it; it is restored on the night
      // the healthy Grower dies (or the night immediately following a day death).
      const intro=(ROLES[g.selfRole.shownRole ?? "washerwoman"].type==="minion" ? g.minionState : g.demonState);
      if(n===1 && intro?.evilTeamIntro && (intro.evilTeamIntro==="blocked") !== Object.values(initial).includes("poppy_grower"))continue;
      if(intro?.evilTeamLearnedWhen && n===cycle(intro.evilTeamLearnedWhen) && previous.poppyRevealNight!==nw) {
        // A death DURING this night can still legitimately reveal the team.
        if(!g.deathLog.some(d=>d.when===nw && previous.current[d.playerId]==="poppy_grower"))continue;
      }
      const pk = previous.alive.find(p => previous.current[p] === "poisoner");
      const recordedPoison = (g.minionActionLog ?? []).find(
        (a): a is Extract<NonNullable<GameSnapshot["minionActionLog"]>[number], { roleId: "poisoner" }> =>
          a.roleId === "poisoner" && a.when === nw
      );
      const spyRecord = (g.minionActionLog ?? []).find(
        (a): a is Extract<NonNullable<GameSnapshot["minionActionLog"]>[number], { roleId: "spy" }> =>
          a.roleId === "spy" && a.when === nw
      );
      const forcedPoison = recordedPoison?.target ?? null;
      if (recordedPoison && (pk !== "self" || !previous.alive.includes("self"))) continue;
      if (spyRecord && (previous.current.self !== "spy" || !previous.alive.includes("self"))) continue;
      if (forcedPoison && !pk) continue;
      const choices: (string | null)[] = forcedPoison ? [forcedPoison] : pk ? [null, ...order.filter(p => p !== pk)] : [null];
      for (const poisonChoice of choices) {
        // Spy information is an ability result. A healthy Spy's N1 Grimoire
        // must match the entered display, but a Spy poisoned by a teammate may
        // have been shown arbitrary information instead.
        if (g.selfRole.shownRole === "spy" && n === 1 && poisonChoice !== "self") {
          const mismatch = Object.entries(g.minionState?.spyInitialRoles ?? {}).some(
            ([p, role]) => !!role && initial[p] !== role
          );
          if (mismatch) continue;
          const shownHerring = g.minionState?.spyRedHerring ?? null;
          if (shownHerring && previous.redHerring !== shownHerring) continue;
        }

        // The same applies to a poison reminder seen on later Grimoire views.
        // If the Spy is healthy, the displayed poison target must be the real
        // target. If the Spy itself is the real poison target, the display may
        // be misinformation and therefore does not constrain the target.
        if (
          g.selfRole.shownRole === "spy" &&
          spyRecord?.poisonTarget &&
          poisonChoice !== "self" &&
          poisonChoice !== spyRecord.poisonTarget
        ) continue;
        let branches = [copyWorld(previous)];
        if(n>=2) branches=branches.flatMap(branch=>{
          if(!branch.lilMonstaHolder)return [branch];
          const known=g.demonState?.lilMonstaBabysitters?.find(x=>x.when===nw)?.playerId;
          const minionSeats=order.filter(p=>branch.alive.includes(p) && (ROLES[branch.current[p]]?.type==="minion"||branch.current[p]==="lil_monsta"));
          const available=known ? minionSeats.filter(p=>p===known) : minionSeats;
          return available.map(playerId=>({...copyWorld(branch),lilMonstaHolder:playerId}));
        });
        for (const b of branches) b.poison[n] = poisonChoice;
        // Preacher chooses before the Poisoner can make tonight's new choice.
        if (preacherAction) branches = branches.flatMap(b=>processPreacherChoice(b,preacherAction,null,g));
        if (philosopherAction) branches = branches.flatMap(b => processPhilosopherAction(b, philosopherAction, poisonChoice, g));
        if (engineerAction) branches = branches.flatMap(b => processEngineerAction(b, engineerAction, poisonChoice, g));
        if (huntsmanAction) branches = branches.flatMap(b => processHuntsmanAction(b, huntsmanAction, poisonChoice, g));
        if (nightwatchmanAction) branches = branches.flatMap(b => processNightwatchmanAction(b, nightwatchmanAction, poisonChoice, g));
        if (snakeCharmerAction) branches = branches.flatMap(b => processSnakeCharmerAction(b, snakeCharmerAction, n, poisonChoice, g));
        if (pitHagAction) branches = branches.flatMap(b => processPitHagAction(b, pitHagAction, n, poisonChoice, g));
        if (cacklejackChange) branches = branches.flatMap(b => processCacklejackChange(b, cacklejackChange));
        if (witchAction) branches = branches.flatMap(b => processWitchAction(b, witchAction, n, poisonChoice, g));
        if (cerenovusAction) branches = branches.flatMap(b => processCerenovusAction(b, cerenovusAction, n, poisonChoice, g));
        if (!branches.length) continue;

        if(n===2 || n===3){
          // Normally the Summoner creates the Demon on N3. The official
          // Summoner/Pukka jinx permits an *early Pukka only* on N2.
          branches=branches.flatMap(w=>{
            const alchemistSummoner=w.initial.self==='alchemist' && alchemistAbilityRole(g)==='summoner';
            if(!Object.values(w.initial).includes('summoner') && !alchemistSummoner)return [w];
            const existingDemon=Object.values(w.current).some(r=>ROLES[r]?.type==='demon');
            const summoner=order.find(p=>w.current[p]==='summoner') ?? (alchemistSummoner?'self':undefined);
            const observed=w.initial.self==='summoner'?g.minionState?.summonedDemon:null;
            if(existingDemon) return observed?.when==='N3' ? [] : [w];
            if(n===2 && observed?.when!=='N2' && !getSnapshotScriptRoleIds(g).includes('pukka'))return [w];
            if(n===2 && observed?.when==='N3')return [w];
            if(n===3 && observed?.when==='N2')return [];
            if(!summoner || !w.alive.includes(summoner) || (worldImpaired(w,summoner,poisonChoice,g,nw) && !preacherSuppresses(w,summoner,poisonChoice,g,nw))){
              if(n===2 && !observed)return [w];
              const ended=copyWorld(w);ended.ended=true;ended.endReason='summoner';return [ended];
            }
            if(observed && observed.when!==nw)return [];
            const candidateSeats=observed?[observed.playerId]:[...new Set([
              ...order.filter(p=>p!==summoner && w.alive.includes(p) && g.deathLog.some(d=>d.when===nw&&d.playerId===p)),
              ...order.filter(p=>p!==summoner && w.alive.includes(p)),summoner
            ])].slice(0,4);
            const demonRoles=observed?[observed.demonRole]:n===2?['pukka' as RoleId]:getSnapshotScriptRoleIds(g).filter(r=>ROLES[r]?.type==='demon'&&r!=='legion'&&r!=='lil_monsta'&&!['leviathan','riot','al_hadikhia'].includes(r)).slice(0,4);
            const created=candidateSeats.flatMap(playerId=>demonRoles.map(roleId=>{
              if(!w.alive.includes(playerId) || n===2 && roleId!=='pukka')return null;
              const b=copyWorld(w),prior=b.current[playerId];
              b.current[playerId]=roleId;b.currentAlignment[playerId]='evil';
              b.changes.push({when:nw,playerId,fromRole:prior,toRole:roleId,kind:'summoner'});
              b.logScore-=observed?0:.75;
              return b;
            }).filter((x):x is HistoryWorld=>!!x));
            return n===2 && !observed ? [w, ...created] : created;
          });
        }
        // Mezepheles's word is spoken during the day and changes a good
        // player to evil the following night. Its use is spent if impaired.
        const mezeAction=(g.minionActionLog??[]).find((a):a is Extract<MinionActionEvent,{roleId:'mezepheles'}>=>a.roleId==='mezepheles'&&a.kind==='secret_word'&&cycle(a.when)===n-1);
        if(mezeAction){
          branches=branches.flatMap(w=>{
            if(w.current.self!=='mezepheles'||w.mezephelesUsed||!w.current[mezeAction.target])return [];
            const b=copyWorld(w);b.mezephelesUsed=true;
            const previousDay=`D${n-1}`;
            const works=b.alive.includes('self') && b.currentAlignment[mezeAction.target]==='good' &&
              !worldImpaired(b,'self',b.poison[n-1]??null,g,previousDay);
            if(mezeAction.transformed!==works)return [];
            if(works){b.currentAlignment[mezeAction.target]='evil';b.changes.push({when:nw,kind:'mezepheles',playerId:mezeAction.target});}
            return [b];
          });
        }
        // The poison is a one-night/global day effect; it does not roll on
        // to N(X+1) even if the Xaan remains alive.
        branches=branches.map(w=>{
          const count=Object.values(w.initial).filter(r=>ROLES[r]?.type==='outsider').length;
          if(n!==count || n===0)return w;
          const p=order.find(q=>minionAbilityAvailable(w,q,'xaan',poisonChoice,g,nw) &&
            w.alive.includes(q) && !worldImpaired(w,q,poisonChoice,g,nw));
          if(!p)return w;
          const b=copyWorld(w);b.xaanTriggered=n;return b;
        });
        // Poisoner cannot choose a target while a healthy Preacher suppresses them.
        if(pk && poisonChoice && branches.some(b=>preacherSuppresses(b,pk,null,g,nw)))continue;
        const demonValidated: HistoryWorld[] = [];
        for (const baseBranch of branches) {
          if(baseBranch.ended){demonValidated.push(baseBranch);continue;}
          const c = context(baseBranch, poisonChoice, g, nw);
          const livingDemons = baseBranch.alive.filter(p => ROLES[baseBranch.current[p]]?.type === "demon");
          const demon = livingDemons.length === 1 ? livingDemons[0] : undefined;
          const demonRole = demon ? baseBranch.current[demon] : null;
          const supportedDemonRules = livingDemons.length === 1 && !!demon && !!demonRole && ROLES[demonRole].solverSupport === "full";
          const arbitraryDeaths = baseBranch.arbitraryDeathNights.includes(n);
          // Summoner cannot produce a Demon kill on N1 or N2; other on-night
          // kill abilities can still explain a death if that script has them.
          if(n<3 && Object.values(baseBranch.initial).includes('summoner') && normalDeaths.length &&
            !baseBranch.alive.some(p=>ROLES[baseBranch.current[p]]?.type!=='demon' &&
              !['summoner','slayer','psychopath','witch','harpy','cerenovus'].includes(baseBranch.current[p]) &&
              ROLES[baseBranch.current[p]]?.tags.includes('KILLS')))continue;
          const scriptAllowsExtraDeaths = getSnapshotScriptRoleIds(g).some(id => id !== "slayer" && id !== "witch" && id !== "lycanthrope" && ROLES[id].type !== "demon" && ROLES[id].tags.includes("KILLS"));
          const unknownLycanthrope = baseBranch.alive.some(p => p !== "self" && baseBranch.current[p] === "lycanthrope");
          const strictDemonDeathCount = supportedDemonRules && !arbitraryDeaths && !scriptAllowsExtraDeaths && !unknownLycanthrope && !["lil_monsta","al_hadikhia","riot"].includes(demonRole??"");
          const legionGame = livingDemons.length>1 && livingDemons.every(p=>baseBranch.current[p]==="legion");
          const princessSuppression = !!princessPrevious && n>=2 && baseBranch.current.self==="princess" && baseBranch.alive.includes("self") && !contextImpaired(c,"self");
          if(princessSuppression && normalDeaths.length)continue;
          const activeLycan = !!lycanAction && baseBranch.current.self === "lycanthrope" && baseBranch.alive.includes("self") && n >= 2;
          if (lycanAction && !activeLycan) continue;
          if (lycanAction && !baseBranch.alive.includes(lycanAction.target)) continue;
          const canLycanKill = activeLycan && !!lycanAction && !contextImpaired(c, "self") &&
            baseBranch.currentAlignment[lycanAction.target] === "good" && lycanAction.target !== baseBranch.fauxPaw;
          const lycanDeath = lycanAction ? nightDeaths.find(d => d.playerId === lycanAction.target && (d.reason === "night_death" || d.sourceRoleId === "lycanthrope")) : undefined;
          if (lycanAction && lycanAction.killed && (!canLycanKill || !lycanDeath)) continue;
          if (lycanAction && !lycanAction.killed && lycanDeath?.sourceRoleId === "lycanthrope") continue;
          const lycanSuppression = !!(lycanAction?.killed && canLycanKill);
          // The Lleech dies in the same phase as its host; that automatic second
          // death is not a second Demon attack for one-kill consistency checks.
          const lleechHostDeath = demonRole==="lleech" && !!baseBranch.lleechHost && nightDeaths.some(d=>d.playerId===baseBranch.lleechHost);
          const effectiveDemonDeaths = normalDeaths.filter(d => !(lycanSuppression && d.id === lycanDeath?.id) && !(lleechHostDeath && d.playerId===demon));
          if (lycanSuppression && effectiveDemonDeaths.length && strictDemonDeathCount) continue;
          const monk = baseBranch.alive.find(p =>
            (baseBranch.current[p] === "monk" || (baseBranch.current[p] === "cannibal" && baseBranch.cannibalAbilities[p] === "monk")) && !contextImpaired(c, p)
          );
          const monkAction = monk === "self" ? g.selfActionLog.find((a): a is Extract<SelfActionEvent,{roleId:"monk"}> => a.roleId === "monk" && a.when === nw) : undefined;
          if (demonAction && (!supportedDemonRules || demon !== "self" || !baseBranch.alive.includes("self") || demonAction.roleId !== demonRole)) continue;
          if (demonRole==="riot" && normalDeaths.length)continue;
          if (demonRole==="al_hadikhia" && normalDeaths.length>3 && !scriptAllowsExtraDeaths && !arbitraryDeaths)continue;
          if (demonRole==="lil_monsta" && normalDeaths.length>1 && !scriptAllowsExtraDeaths && !arbitraryDeaths)continue;
          if (demonRole==="ojo" && demonAction?.targetRole && effectiveDemonDeaths.length) {
            const targets=baseBranch.alive.filter(p=>baseBranch.current[p]===demonAction.targetRole);
            if(targets.length && !effectiveDemonDeaths.some(d=>targets.includes(d.playerId)))continue;
          }
          if (strictDemonDeathCount && effectiveDemonDeaths.length > 1) continue;
          if (strictDemonDeathCount && demonRole==="leviathan" && effectiveDemonDeaths.length) continue;
          if (legionGame && !arbitraryDeaths && !scriptAllowsExtraDeaths && !unknownLycanthrope && effectiveDemonDeaths.length>1) continue;

          let attackBranches: HistoryWorld[] = [baseBranch];
          if (strictDemonDeathCount && demon && demonRole === "fang_gu" && !contextImpaired(c, demon) && !baseBranch.fangGuJumped && effectiveDemonDeaths.length === 1 && effectiveDemonDeaths[0].playerId === demon) {
            if (demonAction) {
              const target = demonAction.target;
              if (baseBranch.alive.includes(target) && ROLES[baseBranch.current[target]]?.type === "outsider") {
                const jumped = applyFangGuJump(baseBranch, demon, target, nw);
                if (!jumped) continue;
                attackBranches = [jumped];
              }
            } else {
              const jumps = baseBranch.alive
                .filter(target => target !== demon && ROLES[baseBranch.current[target]]?.type === "outsider")
                .map(target => applyFangGuJump(baseBranch, demon, target, nw))
                .filter((x): x is HistoryWorld => !!x);
              attackBranches = [baseBranch, ...jumps];
            }
          }

          for (let attackBranch of attackBranches) {
            const attackContext = context(attackBranch, poisonChoice, g, nw);
            const fangJumpThisNight = !!demon && attackBranch.changes.some(change => change.kind === "fang_gu" && change.when === nw && change.oldDemon === demon);
            if (strictDemonDeathCount && effectiveDemonDeaths.length) {
              const victim = effectiveDemonDeaths[0].playerId;
              if (!demon || !demonRole || contextImpaired(attackContext, demon)) continue;
              if (demonRole === "fang_gu" && !attackBranch.fangGuJumped && victim !== demon && ROLES[attackBranch.current[victim]]?.type === "outsider") continue;
              let mayorRedirect = false;
              if (demonAction) {
                const target = demonAction.target;
                if (demonRole==="ojo") {
                  // Ojo targets a character: the selected character must die if
                  // present, but an absent one gives the ST free choice.
                  if (!demonAction.targetRole) continue;
                } else if (!baseBranch.alive.includes(target)) continue;
                if (demonRole!=="ojo" && victim !== target && !fangJumpThisNight) {
                  if (baseBranch.current[target] !== "mayor" || contextImpaired(attackContext, target) || !baseBranch.alive.includes(victim)) continue;
                  mayorRedirect = true;
                  addAssumption(attackBranch, `mayorRedirect:${nw}:${target}:${victim}`, .12);
                }
                if (demonRole === "fang_gu" && !baseBranch.fangGuJumped && ROLES[baseBranch.current[target]]?.type === "outsider" && victim === target) continue;
              }
              if (!mayorRedirect && !fangJumpThisNight) {
                if (attackBranch.current[victim] === "soldier" && !contextImpaired(attackContext, victim)) continue;
                if (monkAction?.target === victim) continue;
                if (attackBranch.current[victim] === "soldier" && contextPoisoned(attackContext, victim)) requirePoison(attackBranch, n, victim);
                const selfHasMonk = attackBranch.current.self === "monk" || (attackBranch.current.self === "cannibal" && attackBranch.cannibalAbilities.self === "monk");
                if (selfHasMonk && g.selfActionLog.some((a): a is Extract<SelfActionEvent,{roleId:"monk"}> => a.roleId === "monk" && a.when === nw && a.target === victim) && contextPoisoned(attackContext, "self")) requirePoison(attackBranch, n, "self");
              }
            } else if (strictDemonDeathCount && demonRole!=="leviathan" && !lycanSuppression && !princessSuppression && n >= 2 && g.completedNights.includes(n)) {
              if (!demon || !demonRole) continue;
              if (demonAction) {
                const target = demonAction.target;
                if (!baseBranch.alive.includes(target)) {
                  // Deliberately attacking a dead player causes no new death.
                } else if (contextImpaired(attackContext, demon)) {
                  if (contextPoisoned(attackContext, demon)) requirePoison(attackBranch, n, demon);
                } else if (target === demon) {
                  // A healthy Demon targeting themself must die (and an Imp may starpass).
                  continue;
                } else if (attackBranch.current[target] === "soldier" && !contextImpaired(attackContext, target)) {
                  // Soldier survives a healthy Demon attack.
                } else if (monkAction?.target === target) {
                  // Direct self-Monk protection explains the no-death night.
                } else if (monk && monk !== target) {
                  addAssumption(attackBranch, `monkProtect:${nw}:${target}`, .2);
                } else {
                  continue;
                }
              } else {
                const alreadyDead = baseBranch.alive.length < order.length;
                const soldier = baseBranch.alive.some(p => baseBranch.current[p] === "soldier" && !contextImpaired(attackContext, p));
                const canProtect = !!monk;
                if (!alreadyDead && !soldier && !canProtect && !contextImpaired(attackContext, demon)) continue;
                if (!alreadyDead && !soldier && !canProtect && contextPoisoned(attackContext, demon)) requirePoison(attackBranch, n, demon);
              }
            }

            let lifeBranches: HistoryWorld[] = [attackBranch];
            for (const e of nightLifeEvents) {
              if (e.kind === "death") {
                const isDemonAttackDeath = strictDemonDeathCount && effectiveDemonDeaths.some(d => d.id === e.id);
                const impSelfKill = !arbitraryDeaths && demonRole === "imp" && !!demon && e.playerId === demon && isDemonAttackDeath;
                const attackRole = !arbitraryDeaths && isDemonAttackDeath ? demonRole : null;
                lifeBranches = lifeBranches.flatMap(b => processDeath(b, e, n, poisonChoice, impSelfKill, g, attackRole));
              } else {
                lifeBranches = lifeBranches.flatMap(b => {
                  if(b.current[e.playerId] && Object.values(b.initial).includes("al_hadikhia") && (e.sourceRoleId==="al_hadikhia" || g.alHadikhiaConfirmed)){
                    if(b.alive.includes(e.playerId))return [];
                    const revive=copyWorld(b);revive.alive.push(e.playerId);return [revive];
                  }
                  return processRevival(b,e);
                });
              }
              if (!lifeBranches.length) break;
            }
            if (pixieAction) lifeBranches = lifeBranches.flatMap(branch => processPixieMadness(branch, pixieAction, poisonChoice, g));
            if (intro?.evilTeamLearnedWhen === nw) lifeBranches=lifeBranches.filter(b=>b.poppyRevealNight===nw);
            if (farmerSelfActions.length) lifeBranches = lifeBranches.filter(branch => farmerSelfActions.every(action =>
              branch.changes.some(change => change.kind === "farmer" && change.when === action.when && change.playerId === "self" &&
                g.deathLog.some(death => death.playerId === action.deceasedFarmer && death.when === action.when && branch.current[action.deceasedFarmer] === "farmer"))
            ));
            if (acrobatAction) {
              const recordedAcrobatDeath = nightDeaths.some(d => d.playerId === "self" && d.sourceRoleId === "acrobat");
              lifeBranches = lifeBranches.filter(branch => {
                const isAcrobat = branch.current.self === "acrobat";
                const selfImpaired = worldImpaired(branch, "self", poisonChoice, g, nw);
                const targetImpaired = branch.current[acrobatAction.target] === "drunk" || worldImpaired(branch, acrobatAction.target, poisonChoice, g, nw);
                const shouldDie = isAcrobat && !selfImpaired && targetImpaired;
                return acrobatAction.died ? shouldDie && recordedAcrobatDeath : !shouldDie && !recordedAcrobatDeath;
              });
            }
            demonValidated.push(...lifeBranches);
          }
        }
        branches = demonValidated;
        branches=branches.map(b=>applyConfirmedOutsiderResults(b,g,nw,poisonChoice)).filter((w):w is HistoryWorld=>!!w);
        if (nightKlutzAction) branches = branches.flatMap(b => processKlutzAction(b, nightKlutzAction, poisonChoice, g));
        for (const b of branches) {
          if (b.ended && (lastPhase > phaseIndex(nw) || obs.some(o => o.when === nw && o.direct))) continue;
          let valid = true;
          for (const o of obs.filter(o => o.when === nw)) {
            const now = context(b, poisonChoice, g, nw);
            const disposition = informationStatus(b, o, now, g);
            if (!disposition) { valid = false; break; }
            for (const id of o.aliases) b.info[id] = disposition;
            if (disposition === "lie") addAssumption(b, `lie:${o.source}`, 3.3);
            if (disposition === "bluff") addAssumption(b, `cover:${o.source}`, .6);
            if (disposition === "works") b.logScore += o.direct ? 0 : .22;
            if (disposition === "poison") {
              const unpoisoned = { ...now, poisonTarget: now.poisonTarget === o.source ? null : now.poisonTarget, poisoned: new Set([...(now.poisoned ?? [])].filter(p => p !== o.source)) };
              if (!infoMatches(o.role, o.source, o.data, unpoisoned, g, o.when) && activePoison(b, poisonChoice) === o.source) { requirePoison(b, n, o.source); addAssumption(b, `poison:${n}:${o.source}`, .3); }
            }
          }
          if (!valid) continue;
          let days = [b];
          if(n===3 && Object.values(b.initial).includes("riot"))days=days.map(world=>{
            const changed=copyWorld(world);
            for(const p of order)if(changed.current[p] && ROLES[changed.current[p]]?.type==="minion"){
              changed.current[p]="riot";
              changed.changes.push({kind:"riot",when:dw,playerId:p,fromRole:world.current[p],toRole:"riot"});
            }
            return changed;
          });
          for (const e of dayEvents) {
            const progressed: HistoryWorld[] = [];
            for (const d of days) {
              if (d.ended) continue;
              const ctx = context(d, poisonChoice, g, dw);
              if (e.kind === "damsel_guess") {
                if (d.damselGuessed || !d.alive.includes(e.minion) || ROLES[d.current[e.minion]]?.type !== "minion") continue;
                const actualDamsel = d.current[e.target] === "damsel" && d.alive.includes(e.target);
                // Spy or Widow jinx applies if the character is or has ever been in play.
                const spyJinx = [...Object.values(d.initial), ...Object.values(d.current), ...d.changes.map(change => "toRole" in change ? change.toRole : "")]
                  .some((role: string) => role === "spy" || role === "widow");
                const works = actualDamsel && !spyJinx && !worldImpaired(d, e.target, poisonChoice, g, dw);
                if (works !== e.won) continue;
                const next = copyWorld(d); next.damselGuessed = true;
                if (works) { next.ended = true; next.endReason = "damsel"; }
                progressed.push(next);
              } else if (e.kind === "trigger") {
                const actor = e.rolePlayerId, target = e.targetPlayerId;
                const role = d.current[actor];
                const earlier = g.abilityTriggerLog.filter(t => t.roleId === e.roleId && t.rolePlayerId === actor && compareEvents(t,e)<0);
                let possible = true;
                if (e.roleId === "virgin") {
                  const nominations = g.nominationLog.filter(t => t.nominee === actor).sort(compareEvents);
                  const isFirst = !nominations.length || nominations[0].id === e.sourceEventId;
                  const borrowed = ROLES[role]?.type==='demon' && d.boffinGrantedAbility==='virgin' && boffinActive(d,poisonChoice,g,dw);
                  const functional = (role === "virgin" && !contextImpaired(ctx, actor) || borrowed) && d.alive.includes(actor) && isFirst && earlier.length === 0;
                  const targetTF = ROLES[d.current[target]]?.type === "townsfolk";
                  const spy = d.current[target] === "spy" && !contextImpaired(ctx, target);
                  possible = e.triggered ? functional && (targetTF || spy) : !functional || !targetTF;
                  if (!e.triggered && role === "virgin" && isFirst && targetTF && contextPoisoned(ctx, actor)) requirePoison(d,n,actor);
                } else {
                  const borrowed = ROLES[role]?.type==='demon' && d.boffinGrantedAbility==='slayer' && boffinActive(d,poisonChoice,g,dw);
                  const functional = (role === "slayer" && !contextImpaired(ctx, actor) || borrowed) && d.alive.includes(actor) && earlier.length === 0;
                  const targetDemon = ROLES[d.current[target]]?.type === "demon";
                  const targetRecluse = d.current[target] === "recluse" && !contextImpaired(ctx, target);
                  // Lleech/Slayer Djinn jinx: slaying the poisoned host kills
                  // the host, even though the host is not a Demon character.
                  const lleech = d.alive.find(p=>d.current[p]==='lleech');
                  const targetLleechHost = !!lleech && d.lleechHost === target && !contextImpaired(ctx, lleech);
                  possible = e.triggered ? functional && d.alive.includes(target) && (targetDemon || targetRecluse || targetLleechHost) : !functional || !d.alive.includes(target) || !(targetDemon || targetLleechHost);
                  if (!e.triggered && role === "slayer" && targetDemon && earlier.length === 0 && contextPoisoned(ctx, actor)) requirePoison(d,n,actor);
                }
                if (possible) progressed.push(d);
              } else if (e.kind === "death") {
                if (d.current[e.playerId] === "saint" && diedByExecution(e) && contextPoisoned(ctx, e.playerId)) requirePoison(d,n,e.playerId);
                progressed.push(...processDeath(d, e, n, poisonChoice, false, g));
              } else {
                // If the recorded tally is complete, a healthy living Zealot
                // must vote whenever at least five people remain alive.
                const hiddenVote=(g.organGrinderVotes??[]).some(v=>v.when===dw&&v.hidden);
                if(e.votingOccurred!==false && !hiddenVote && e.voters.length>0 && d.alive.length>=5 &&
                   d.alive.some(p=>d.current[p]==='zealot' && !worldImpaired(d,p,poisonChoice,g,dw) && !e.voters.includes(p)))continue;
                if (witchAction && e.nominator === witchAction.target) {
                  const healthy = minionAbilityAvailable(d, "self", "witch", poisonChoice) && !worldImpaired(d, "self", poisonChoice, g);
                  const active = d.alive.length > 3 && healthy;
                  if (witchAction.triggered === true && !active) continue;
                  if (witchAction.triggered === false && active) continue;
                  if (witchAction.triggered === false && worldPoisoned(d, "self", poisonChoice, g)) requirePoison(d, n, "self");
                }
                progressed.push(d);
              }
            }
            days = progressed;
            if (!days.length) break;
          }
          days=days.filter(d=>{
            // The explosion is a public fact only when its aftermath is
            // recorded. The 3 survivors must contain an actual living Demon.
            for(const explosion of g.boomdandyLog??[]){
              if(explosion.when!==dw)continue;
              if(d.initial[explosion.executedPlayer]!=='boomdandy' && d.current[explosion.executedPlayer]!=='boomdandy')return false;
              // Boomdandy is normally already dead when the explosion is
              // evaluated; an alive-only check would reject every valid blast.
              if(preacherSuppresses(d,explosion.executedPlayer,poisonChoice,g,dw)
                || worldImpaired(d, explosion.executedPlayer, poisonChoice, g, dw))return false;
              const source=g.deathLog.find(x=>x.when===dw&&x.playerId===explosion.executedPlayer&&diedByExecution(x));
              if(!source && !g.nominationLog.some(x=>x.when===dw&&x.nominee===explosion.executedPlayer&&x.executed===true))return false;
              const after=explosion.survivors.filter(p=>p!==explosion.pointedPlayer || explosion.tied);
              if(after.length!==d.alive.length || after.some(p=>!d.alive.includes(p)))return false;
              if(!explosion.survivors.some(p=>ROLES[d.current[p]]?.type==='demon'))return false;
            }
            if(Object.values(d.initial).includes("riot") && n===3){
              const nominations=g.nominationLog.filter(ev=>ev.when===dw);
              for(const nomination of nominations){
                if(!g.deathLog.some(x=>x.playerId===nomination.nominee && x.when===dw)){
                  // Pending or unrecorded deaths are not treated as proof.
                  if(g.night>3) return false;
                }
              }
            }
            if(!Object.values(d.initial).includes("legion"))return true;
            for(const death of g.deathLog.filter(ev=>ev.when===dw && diedByExecution(ev))){
              const matching=g.nominationLog.filter(ev=>ev.when===dw && ev.nominee===death.playerId && ev.votingOccurred!==false);
              if(matching.length && matching.every(ev=>ev.voters.length>0 && ev.voters.every(p=>d.currentAlignment[p]==="evil")))return false;
            }
            return true;
          });
          if (witchAction) {
            const nominated = g.nominationLog.some(e => e.when === dw && e.nominator === witchAction.target);
            const witchDeath = g.deathLog.some(e => e.when === dw && e.playerId === witchAction.target && e.sourceRoleId === "witch");
            days = days.filter(() => {
              if (!nominated) return witchAction.triggered !== true && !witchDeath;
              if (witchAction.triggered === true) return witchDeath;
              return !witchDeath;
            });
          }
          const princessAction=g.selfActionLog.find((a):a is Extract<SelfActionEvent,{roleId:"princess"}>=>a.roleId==="princess" && a.when===dw);
          if(princessAction) days=days.filter(d=>{
            if(d.current.self!=="princess" || !d.alive.includes("self"))return false;
            // First day as this character, including after a mid-game transformation.
            const became=d.changes.filter(ch=>"toRole" in ch && ch.playerId==="self" && ch.toRole==="princess").at(-1);
            const firstDay=became?cycle(became.when):1;
            if(n!==firstDay)return false;
            const nomination=g.nominationLog.some(e=>e.when===dw && e.nominator==="self" && e.nominee===princessAction.nominee);
            const conflictingDeath=g.deathLog.some(e=>e.when===dw && diedByExecution(e) && e.playerId!==princessAction.nominee);
            return nomination && !conflictingDeath && !g.noExecutionDays.includes(n);
          });
          // Some executed players survive (Pacifist, Fool, etc.). These still
          // count towards Leviathan's 2-good-executions loss condition.
          const survivedExecutions=g.nominationLog.filter(ev=>ev.when===dw && ev.executed===true &&
            !g.deathLog.some(death=>death.when===dw&&death.playerId===ev.nominee&&diedByExecution(death)));
          if(survivedExecutions.length) days=days.map(day=>{
            if(!Object.values(day.current).includes('leviathan'))return day;
            const updated=copyWorld(day);
            for(const ev of survivedExecutions)if(updated.currentAlignment[ev.nominee]==='good') updated.leviathanGoodExecutions++;
            if(updated.leviathanGoodExecutions>=2){updated.ended=true;updated.endReason='leviathan';}
            return updated;
          });
          // A directly recorded Fearmonger night choice can decide the game.
          const fearChoice=(g.minionActionLog??[]).filter((a):a is Extract<MinionActionEvent,{roleId:'fearmonger'}> => a.roleId==='fearmonger' && phaseIndex(a.when)<=phaseIndex(`N${n}`)).sort(compareEvents).at(-1);
          if(fearChoice) days=days.map(d=>{
            if(d.current.self!=='fearmonger' || !minionAbilityAvailable(d,'self','fearmonger',poisonChoice,g,dw) || worldImpaired(d,'self',poisonChoice,g,dw))return d;
            const chosen=g.nominationLog.some(ev=>ev.when===dw && ev.nominator==='self' && ev.nominee===fearChoice.target &&
              (ev.executed===true || g.deathLog.some(x=>x.playerId===ev.nominee&&x.when===dw&&diedByExecution(x))));
            if(!chosen)return d;
            const updated=copyWorld(d);
            updated.ended=true; updated.endReason='fearmonger'; updated.fearmongerWinner=d.currentAlignment[fearChoice.target]==='good'?'evil':'good';
            return updated;
          });
          // Completed Golem nominations, Hatter changes, Puzzlemaster's
          // information and Storyteller grants apply to the replayed day.
          days=days.map(d=>applyConfirmedOutsiderResults(d,g,dw,poisonChoice)).filter((w):w is HistoryWorld=>!!w);
          if (dayKlutzAction) days = days.flatMap(d => processKlutzAction(d, dayKlutzAction, poisonChoice, g));
          if (alsaahirAction) {
            days = days.filter(d => {
              const ctx = context(d, poisonChoice, g, dw);
              const active = d.current.self === "alsaahir" && d.alive.includes("self") && !worldImpaired(d, "self", poisonChoice, g, dw);
              const actualMinions = new Set(order.filter(p => ROLES[d.current[p]]?.type === "minion"));
              const actualDemons = new Set(order.filter(p => ROLES[d.current[p]]?.type === "demon"));
              const guessedMinions = new Set(alsaahirAction.minions);
              const guessedDemons = new Set(alsaahirAction.demons);
              const same = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every(x => b.has(x));
              const correct = same(actualMinions, guessedMinions) && same(actualDemons, guessedDemons);
              if (alsaahirAction.won) {
                if (!active || !correct) return false;
                d.ended = true; d.endReason = "alsaahir";
                return true;
              }
              if (active && correct) return false;
              if (correct && contextPoisoned(ctx, "self") && activePoison(d, poisonChoice) === "self") requirePoison(d, n, "self");
              return true;
            });
          }
          for (const d of days) {
            let validDayInfo = true;
            for (const o of obs.filter(o => o.when === dw)) {
              const now = context(d, poisonChoice, g, dw);
              const disposition = informationStatus(d, o, now, g);
              if (!disposition) { validDayInfo = false; break; }
              for (const id of o.aliases) d.info[id] = disposition;
              if (disposition === "lie") addAssumption(d, `lie:${o.source}`, 3.3);
              if (disposition === "bluff") addAssumption(d, `cover:${o.source}`, .6);
              if (disposition === "works") d.logScore += o.direct ? 0 : .22;
              if (disposition === "poison") {
                const unpoisoned = { ...now, poisonTarget: now.poisonTarget === o.source ? null : now.poisonTarget, poisoned: new Set([...(now.poisoned ?? [])].filter(p => p !== o.source)) };
                if (!infoMatches(o.role, o.source, o.data, unpoisoned, g, o.when) && activePoison(d, poisonChoice) === o.source) { requirePoison(d, n, o.source); addAssumption(d, `poison:${n}:${o.source}`, .3); }
              }
            }
            if (!validDayInfo) continue;
            if (intro?.evilTeamLearnedWhen===`N${n+1}` && g.deathLog.some(e=>e.when===dw && d.current[e.playerId]==="poppy_grower") && d.poppyRevealNight!==`N${n+1}`)continue;
            const duskContext = context(d, poisonChoice, g, dw);
            // Public Djinn victory outcomes are checked only when their
            // triggering facts are recorded. They override the ordinary
            // Demon-death / fifth-day result for that same occurrence.
            const confirmedJinx = (g.jinxVictoryLog ?? []).find(e => e.when === dw);
            const jinxResult = confirmedJinx
              ? resolveRecordedJinxVictory(g, d, confirmedJinx)
              : automaticallyResolvedJinxVictory(g, d, dw);
            if (confirmedJinx && !jinxResult) continue;
            if (jinxResult) {
              d.ended = true; d.endReason = 'jinx';
              d.jinxWinner = jinxResult.winner; d.jinxPair = jinxResult.pair;
            }
            if (!jinxResult && Object.values(d.current).includes("leviathan") && n>=5 && g.night>5) { d.ended = true; d.endReason = "leviathan"; }
            if (!jinxResult && g.noExecutionDays.includes(n) && vortoxActive(d, duskContext)) { d.ended = true; d.endReason = "vortox"; }
            else if (!jinxResult && g.noExecutionDays.includes(n) && d.alive.length === 3 && d.alive.some(p => d.current[p] === "mayor" && !worldImpaired(d, p, poisonChoice, g, dw))) {d.ended = true;d.endReason="mayor";}
            const advanceAfterLeviathanDeadline = (d.endReason==='leviathan' || (d.endReason==='jinx' && d.jinxPair==='leviathan:mayor')) && n===5 && g.night===6 && recordedEndPhase<=phaseIndex('D5');
            if (d.ended && lastPhase > phaseIndex(dw) && !advanceAfterLeviathanDeadline) continue;
            nextWorlds.push(d);
          }
        }
      }
    }
    // Keep a bounded representative beam PER red herring / role-transition history.
    // This is search pruning, not a mechanical impossibility proof.
    const groups = new Map<string, HistoryWorld[]>();
    for (const w of nextWorlds) {
      const key = JSON.stringify([w.redHerring, w.believedRoles, w.current, w.currentAlignment, w.permanentPoison, w.permanentDrunk, w.puzzlemasterDrunk, w.ogreFriend, w.storytellerMinionAbilities, w.politicianRewarded, w.effectiveWinner, w.villageIdiotDrunk, w.boffinGrantedAbility, w.fearmongerWinner, w.preachedMinions, w.poppyRevealNight, w.fangGuJumped, w.vigormortisPoisonDirections, w.philosopherAbility, w.cannibalAbilities, w.cannibalPoisoned, w.bansheeActive, w.fauxPaw, w.pixieAbilities, w.huntsmanUsed, w.nightwatchmanUsed, w.damselGuessed, w.unresolvedBarberFrom, w.leviathanGoodExecutions, w.lleechHost, w.lleechDiedAt, w.lleechAbilityLost, w.lilMonstaHolder, w.lilMonstaUnderlyingRole, w.mezephelesUsed, w.widowTarget, w.xaanTriggered, w.ended, w.endReason, w.jinxPair, w.jinxWinner]);
      const a = groups.get(key) ?? []; a.push(w); groups.set(key,a);
    }
    worlds = [];
    for (const group of groups.values()) {
      group.sort((a,b) => b.logScore-a.logScore || Object.keys(a.requiredPoison).length-Object.keys(b.requiredPoison).length);
      const seen = new Set<string>();
      for (const w of group) {
        const k = JSON.stringify([w.info, w.requiredPoison, w.permanentPoison, w.permanentDrunk, w.puzzlemasterDrunk, w.ogreFriend, w.storytellerMinionAbilities, w.fangGuJumped, w.vigormortisPoisonDirections, w.philosopherAbility, w.unresolvedBarberFrom]);
        if (seen.has(k)) continue; seen.add(k); worlds.push(w); if (seen.size >= beamWidth) break;
      }
    }
    if (!worlds.length) return [];
    worlds.sort((a,b)=>b.logScore-a.logScore);
    worlds = worlds.slice(0, Math.max(12, beamWidth * 12));
  }
  // If the Minion player explicitly recorded becoming the Imp, keep only histories
  // with that direct self-observed transition at the recorded phase.
  const becameDemonAt = g.minionState?.becameDemonAt ?? null;
  if (becameDemonAt && g.selfRole.shownRole && ROLES[g.selfRole.shownRole].type === "minion") {
    worlds = worlds.filter((w) => w.changes.some((c) => (c.kind === "scarlet" || c.kind === "starpass") && c.to === "self" && c.when === becameDemonAt));
  }
  // Avoid returning multiple redundant poison guesses as separate worlds.
  return worlds.map(w=>applyHereticWinner(w,g));
}
