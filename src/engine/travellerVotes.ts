import type { GameSnapshot, TravellerState } from "../types";
import { voudonActive } from "./travellerMechanics";
import { bansheeAwakenedAt } from "./game";

export function travellerCanVote(traveller: TravellerState, g?: GameSnapshot, when?: string): boolean {
  if (g && when && voudonActive(g, when)) {
    if (traveller.exiled) return traveller.deadVoteAvailable;
    if (!traveller.active) return false;
    if (traveller.roleId === "voudon" && traveller.alive) return true;
    if (!traveller.alive) return true;
    return false;
  }
  if (traveller.exiled) return traveller.deadVoteAvailable;
  if (!traveller.active) return false;
  if (!traveller.alive) return traveller.deadVoteAvailable;
  if (traveller.roleId === "beggar") return traveller.voteTokens > 0;
  return true;
}

export function travellerVoteWeight(g: GameSnapshot, player: string, when: string): number {
  if (!when.startsWith("D")) return 1;
  const matchingNight = `N${when.slice(1)}`;
  const travellers = g.travellers ?? [];
  let magnitude = 1;
  let sign = 1;
  for (const action of g.travellerActionLog ?? []) {
    if (action.kind !== "vote_modifier" || action.when !== matchingNight || action.target !== player) continue;
    const source = travellers.find(t => t.id === action.travellerId);
    if (!source?.active || !source.alive) continue;
    if (action.roleId === "bureaucrat") magnitude = 3;
    if (action.roleId === "thief") sign = -1;
  }
  const bansheeMultiplier = bansheeAwakenedAt(g, player, when) ? 2 : 1;
  return magnitude * sign * bansheeMultiplier;
}

export function travellerVoteTally(g: GameSnapshot, voters: string[], when: string): { total: number; weights: Record<string, number> } {
  const weights = Object.fromEntries(voters.map(player => [player, travellerVoteWeight(g, player, when)]));
  return { total: Object.values(weights).reduce((sum, value) => sum + value, 0), weights };
}
