/** Explicit Djinn victory exceptions. IDs and rules stay in English internally. */
import type { GameSnapshot, JinxVictoryEvent } from '../types';
import type { HistoryWorld } from './model';
import { diedByExecution } from './game';
import { ROLES } from '../roles';

export const JINX_VICTORY_PAIRS = [
  'alchemist:summoner', 'al_hadikhia:mastermind',
  'exorcist:leviathan', 'grandmother:leviathan', 'innkeeper:leviathan',
  'leviathan:mayor', 'leviathan:monk', 'leviathan:soldier',
  'exorcist:riot', 'grandmother:riot', 'innkeeper:riot',
  'mayor:riot', 'monk:riot', 'riot:soldier',
] as const;
export type JinxVictoryPair = typeof JINX_VICTORY_PAIRS[number];
export const JINX_VICTORY_PAIR_SET: ReadonlySet<string> = new Set(JINX_VICTORY_PAIRS);
export const JINX_VICTORY_RECORDED_PAIRS = JINX_VICTORY_PAIRS.filter(
  k => k !== 'alchemist:summoner' && k !== 'leviathan:mayor'
);

export type ResolvedJinxVictory = { pair: JinxVictoryPair; winner: 'good' | 'evil' };
function hasCurrent(w: HistoryWorld, role: string): boolean {
  return Object.values(w.current).includes(role as keyof typeof ROLES);
}
function executed(g: GameSnapshot, day: string, target: string): boolean {
  return g.nominationLog.some(e => e.when === day && e.nominee === target && e.executed === true) ||
    g.deathLog.some(e => e.when === day && e.playerId === target && diedByExecution(e));
}
function validExecutedNomination(g: GameSnapshot, day: string, actor: string, target: string): boolean {
  return g.nominationLog.some(e => e.when === day && e.nominator === actor && e.nominee === target) &&
    executed(g, day, target);
}
/** A fact recorded by the player is checked against the candidate, never inferred from script presence. */
export function resolveRecordedJinxVictory(
  g: GameSnapshot, w: HistoryWorld, event: JinxVictoryEvent
): ResolvedJinxVictory | null {
  const [left, right] = event.pair.split(':');
  if (!hasCurrent(w, left) || !hasCurrent(w, right)) return null;
  const day = event.when;
  if (event.pair === 'al_hadikhia:mastermind') {
    const had = g.deathLog.find(e => e.when === day && diedByExecution(e) && w.current[e.playerId] === 'al_hadikhia');
    if (!had || !w.alive.some(p => w.current[p] === 'mastermind')) return null;
    if (typeof event.allLive !== 'boolean') return null;
    return { pair: event.pair, winner: event.allLive ? 'evil' : 'good' };
  }
  if (event.pair === 'mayor:riot') {
    if (!event.actor || w.current[event.actor] !== 'mayor' || !w.alive.includes(event.actor)) return null;
    const riotCount = w.alive.filter(p => w.current[p] === 'riot').length;
    if (riotCount < 1) return null;
    return { pair: event.pair, winner: riotCount === 1 ? 'good' : 'evil' };
  }
  if (event.pair === 'grandmother:leviathan' || event.pair === 'grandmother:riot') {
    if (!event.target || !g.deathLog.some(e => e.when === day && e.playerId === event.target && diedByExecution(e))) return null;
    // The grandchild is selected secretly by the Storyteller, not inferred from a claim.
    return { pair: event.pair, winner: 'evil' };
  }
  if (!event.actor || !event.target || !w.current[event.actor] || !w.current[event.target]) return null;
  const demon = event.pair.includes('leviathan') ? 'leviathan' : 'riot';
  if (w.current[event.actor] !== demon || !validExecutedNomination(g, day, event.actor, event.target)) return null;
  const protectedRole = event.pair.split(':').find(r => r !== demon)!;
  if (protectedRole === 'soldier') {
    if (w.current[event.target] !== 'soldier') return null;
  } else if (!hasCurrent(w, protectedRole)) return null;
  return { pair: event.pair, winner: 'good' };
}

/** No manual entry is needed for these fully observable victory triggers. */
export function automaticallyResolvedJinxVictory(g: GameSnapshot, w: HistoryWorld, day: string): ResolvedJinxVictory | null {
  const cycle = Number(day.slice(1));
  if (cycle === 5 && g.noExecutionDays.includes(5) &&
      !g.nominationLog.some(e=>e.when==='D5' && e.executed===true) &&
      !g.deathLog.some(e=>e.when==='D5' && diedByExecution(e)) &&
      w.alive.some(p => w.current[p] === 'leviathan') &&
      w.alive.some(p => w.current[p] === 'mayor')) {
    return { pair: 'leviathan:mayor', winner: 'good' };
  }
  for (const demon of ['leviathan', 'riot'] as const) {
    if (!hasCurrent(w, demon)) continue;
    for (const e of g.nominationLog.filter(x => x.when === day && w.current[x.nominator] === demon && executed(g, day, x.nominee))) {
      if (w.current[e.nominee] === 'soldier') {
        const pair = (demon === 'riot' ? 'riot:soldier' : 'leviathan:soldier') as JinxVictoryPair;
        return { pair, winner: 'good' };
      }
      for (const protectionRole of ['monk', 'exorcist'] as const) {
        if (w.current.self !== protectionRole || !w.alive.includes('self')) continue;
        const protectedBySelf = g.selfActionLog.some(a => a.roleId === protectionRole &&
          a.when === `N${cycle}` && a.target === e.nominee);
        if (!protectedBySelf) continue;
        const pair = [demon, protectionRole].sort().join(':') as JinxVictoryPair;
        return { pair, winner: 'good' };
      }
    }
  }
  return null;
}
