import { ROLES, type RoleId } from "../roles";
import type { GameSnapshot } from "../types";
import { getSnapshotScriptRoleIds } from "../scripts";
import { priorRole, seats, setupCounts } from "./game";

export type OutsiderClaimStyle = "early" | "hidden" | "neutral";

export type OutsiderModifierClaimFit = {
  roleId: RoleId;
  delta: number;
  coverage: number;
  confidence: number;
  normalOutsiders: number;
  modifiedOutsiders: number;
  earlyPoolCount: number;
  nonEarlyPoolCount: number;
  claimedEarlyCount: number;
  minEarlyNormal: number;
  minEarlyModified: number;
  positiveShortage: number;
  negativeSupport: number;
  logAdjustment: number;
};

export function outsiderClaimStyle(roleId: RoleId): OutsiderClaimStyle {
  const role = ROLES[roleId];
  if (role.type !== "outsider") return "neutral";
  if (role.tags.includes("OUTSIDER_EARLY_CLAIM")) return "early";
  if (role.tags.includes("OUTSIDER_HIDDEN_CLAIM")) return "hidden";
  return "neutral";
}

export function outsiderModifierClaimFit(g: GameSnapshot, roleId: RoleId, appliedDeltaOverride?: number): OutsiderModifierClaimFit | null {
  const modifier = ROLES[roleId];
  if (!modifier?.tags.includes("OUTSIDER_COUNT_MODIFIER")) return null;
  const configuredDelta = modifier.outsiderCountDelta ?? (modifier.outsiderCountOptions?.length ? Math.max(...modifier.outsiderCountOptions) : 0);
  if (appliedDeltaOverride === undefined && configuredDelta === 0) return null;

  const scriptOutsiders = getSnapshotScriptRoleIds(g)
    .filter(id => ROLES[id].type === "outsider");
  const earlyPool = scriptOutsiders.filter(id => outsiderClaimStyle(id) === "early");
  const nonEarlyPool = scriptOutsiders.filter(id => outsiderClaimStyle(id) !== "early");

  const claimedRoles = seats(g.playerCount)
    .map(player => priorRole(g, player))
    .filter((id): id is RoleId => !!id);
  const claimedEarly = new Set(
    claimedRoles.filter(id => ROLES[id].type === "outsider" && outsiderClaimStyle(id) === "early")
  );

  const coveredPlayers = seats(g.playerCount).filter(player => priorRole(g, player) !== null).length;
  const coverage = coveredPlayers / g.playerCount;
  // Missing claims are weak evidence until a reasonable portion of the table has
  // actually given an exact role claim. Full strength is reached near 85% coverage.
  const confidence = Math.max(0, Math.min(1, (coverage - 0.35) / 0.5));

  const normalOutsiders = setupCounts(g.playerCount).outsider;
  const requested = appliedDeltaOverride ?? configuredDelta;
  const modifiedOutsiders = Math.max(0, normalOutsiders + requested);
  const appliedDelta = modifiedOutsiders - normalOutsiders;

  // Any Outsider slot beyond the number of hidden/neutral Outsiders available on
  // the script must be occupied by an early-claim Outsider.
  const minEarlyNormal = Math.max(0, normalOutsiders - nonEarlyPool.length);
  const minEarlyModified = Math.max(0, modifiedOutsiders - nonEarlyPool.length);
  const claimedEarlyCount = claimedEarly.size;

  // Positive modifiers are penalized only for the extra early claims that the
  // modifier itself forces beyond an ordinary setup. This avoids penalizing the
  // base game for normal Outsider bluffing or incomplete records.
  const normalShortage = Math.max(0, minEarlyNormal - claimedEarlyCount);
  const modifiedShortage = Math.max(0, minEarlyModified - claimedEarlyCount);
  const positiveShortage = appliedDelta > 0 ? Math.max(0, modifiedShortage - normalShortage) : 0;

  // Negative modifiers get a smaller bonus when they specifically explain an
  // early-claim Outsider that an ordinary setup would force but the reduced setup
  // no longer requires. Hidden/neutral Outsiders do not create this signal.
  const removedEarlyRequirement = appliedDelta < 0 ? Math.max(0, minEarlyNormal - minEarlyModified) : 0;
  const missingNormalEarly = Math.max(0, minEarlyNormal - claimedEarlyCount);
  const negativeSupport = Math.min(removedEarlyRequirement, missingNormalEarly);

  const logAdjustment = (-3.5 * positiveShortage + 1.1 * negativeSupport) * confidence;

  return {
    roleId,
    delta: appliedDelta,
    coverage,
    confidence,
    normalOutsiders,
    modifiedOutsiders,
    earlyPoolCount: earlyPool.length,
    nonEarlyPoolCount: nonEarlyPool.length,
    claimedEarlyCount,
    minEarlyNormal,
    minEarlyModified,
    positiveShortage,
    negativeSupport,
    logAdjustment,
  };
}

export function outsiderModifierWorldLogAdjustment(g: GameSnapshot, initialRoles: Iterable<RoleId>): number {
  let adjustment = 0;
  for (const roleId of new Set(initialRoles)) {
    const fit = outsiderModifierClaimFit(g, roleId);
    if (fit) adjustment += fit.logAdjustment;
  }
  return Math.max(-12, Math.min(4, adjustment));
}
