import type { RoleId } from "./roles";
import type { TravellerRoleId } from "./travellers";
import type { DeathReasonDefinition, DeathReasonId, TravellerState } from "./types";

/** General causes are available in every script; special causes require their source. */
export const DEATH_REASONS: readonly DeathReasonDefinition[] = [
  { id: "storyteller", label: "ストーリーテラー", phase: "any" },
  { id: "execution", label: "処刑", phase: "day" },
  { id: "night_death", label: "夜死亡", phase: "night" },
  { id: "ability", label: "能力", phase: "any" },
  { id: "gnome", label: "ノーム", phase: "day" },
  { id: "gangster", label: "ギャングスター", phase: "day" },
  { id: "psychopath", label: "サイコパスの公開殺害", phase: "day" },
  { id: "other", label: "その他", phase: "any" },
];

const SCRIPT_SPECIFIC_DEATH_REASONS: Partial<Record<DeathReasonId, RoleId>> = {
  psychopath: "psychopath",
};

const TRAVELLER_SPECIFIC_DEATH_REASONS: Partial<Record<DeathReasonId, TravellerRoleId>> = {
  gnome: "gnome",
  gangster: "gangster",
};

/** Use the game's frozen script, not the full script-maker catalog or role claims. */
export function availableDeathReasons(
  scriptRoleIds: readonly RoleId[],
  travellers: readonly TravellerState[],
): DeathReasonDefinition[] {
  return DEATH_REASONS.filter((reason) => {
    const requiredRole = SCRIPT_SPECIFIC_DEATH_REASONS[reason.id];
    if (requiredRole && !scriptRoleIds.includes(requiredRole)) return false;
    const requiredTraveller = TRAVELLER_SPECIFIC_DEATH_REASONS[reason.id];
    if (requiredTraveller && !travellers.some((traveller) =>
      traveller.roleId === requiredTraveller && traveller.active && traveller.alive
    )) return false;
    return true;
  });
}
