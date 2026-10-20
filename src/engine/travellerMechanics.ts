import type { GameSnapshot, TravellerState } from "../types";
import type { TravellerRoleId } from "../travellers";
import { phaseIndex } from "./game";

export function travellerActiveAt(traveller: TravellerState, when: string): boolean {
  if (phaseIndex(traveller.joinedWhen) > phaseIndex(when)) return false;
  if (traveller.exiledWhen && phaseIndex(traveller.exiledWhen) <= phaseIndex(when)) return false;
  // Old saves do not contain a Traveller death timeline. Current alive state is
  // therefore authoritative unless an exile timestamp proves they were active earlier.
  if (!traveller.active && !traveller.exiled) return false;
  if (!traveller.alive && !traveller.exiled) return false;
  return true;
}

export function activeTravellerByRole(g: GameSnapshot, roleId: TravellerRoleId, when: string): TravellerState | null {
  return (g.travellers ?? []).find(t => t.roleId === roleId && travellerActiveAt(t, when)) ?? null;
}

export function voudonActive(g: GameSnapshot, when: string): boolean {
  return !!activeTravellerByRole(g, "voudon", when);
}

export function bishopActive(g: GameSnapshot, when: string): boolean {
  return !!activeTravellerByRole(g, "bishop", when);
}

export function boneCollectorRestored(g: GameSnapshot, player: string, when: string): boolean {
  const event = (g.travellerActionLog ?? [])
    .filter((a): a is Extract<NonNullable<GameSnapshot["travellerActionLog"]>[number], { kind: "restore_ability" }> => a.kind === "restore_ability")
    .filter(a => a.target === player)
    .sort((a, b) => b.id - a.id)[0];
  if (!event) return false;
  const n = Number(event.when.slice(1));
  if (event.when !== `N${n}`) return false;
  if (when !== `N${n}` && when !== `D${n}`) return false;
  return !!activeTravellerByRole(g, "bone_collector", when);
}

export function baristaEffectFor(g: GameSnapshot, player: string, when: string): "sober_healthy" | "acts_twice" | null {
  const n = Number(when.slice(1));
  const event = (g.travellerActionLog ?? [])
    .filter((a): a is Extract<NonNullable<GameSnapshot["travellerActionLog"]>[number], { kind: "barista_effect" }> => a.kind === "barista_effect")
    .filter(a => a.when === `N${n}` && a.target === player)
    .sort((a, b) => b.id - a.id)[0];
  if (!event) return null;
  return activeTravellerByRole(g, "barista", when) ? event.effect : null;
}

export function deviantsFunnyToday(g: GameSnapshot, travellerId: string, day: number): boolean {
  return (g.travellerActionLog ?? []).some(a => a.kind === "deviant_funny" && a.travellerId === travellerId && a.when === `D${day}` && a.funny);
}

export function matronSwapCount(g: GameSnapshot, travellerId: string, day: number): number {
  return (g.travellerActionLog ?? []).filter(a => a.kind === "seat_swap" && a.travellerId === travellerId && a.when === `D${day}`).length;
}

export function apprenticeAbility(g: GameSnapshot, travellerId: string) {
  return (g.travellerActionLog ?? [])
    .filter((a): a is Extract<NonNullable<GameSnapshot["travellerActionLog"]>[number], { kind: "apprentice_ability" }> => a.kind === "apprentice_ability")
    .find(a => a.travellerId === travellerId)?.abilityRoleId ?? null;
}
