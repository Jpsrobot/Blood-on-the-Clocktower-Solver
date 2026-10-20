import type { GameSnapshot } from "../types";
import type { SearchResult } from "./model";
import { TRAVELLERS } from "../travellers";
import { ROLES } from "../roles";

export type TravellerAlignmentEstimate = {
  evil: number;
  good: number;
  exact: boolean;
  reasons: string[];
};

function clamp01(n: number) { return Math.max(0.001, Math.min(0.999, n)); }
function logit(p: number) { const q = clamp01(p); return Math.log(q / (1 - q)); }
function logistic(x: number) { return 1 / (1 + Math.exp(-x)); }

function seatEvil(result: SearchResult | null, player: string): number | null {
  const value = result?.players[player]?.evil;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Traveller alignment is not part of the normal setup-world search: the
 * Storyteller chooses it when the Traveller enters. This is intentionally a
 * soft behavioural estimate, except for information that mechanically links
 * alignments (Scapegoat) or a user-entered known alignment.
 */
export function estimateTravellerAlignments(g: GameSnapshot, result: SearchResult | null): Record<string, TravellerAlignmentEstimate> {
  const travellers = g.travellers ?? [];
  const actions = g.travellerActionLog ?? [];
  const out: Record<string, TravellerAlignmentEstimate> = {};

  for (const t of travellers) {
    if (t.knownAlignment !== "unknown") {
      const evil = t.knownAlignment === "evil" ? 1 : 0;
      out[t.id] = { evil, good: 1 - evil, exact: true, reasons: ["陣営を確定入力"] };
      continue;
    }

    // Travellers are deliberately good-leaning as a starting heuristic. This
    // is not a mechanical probability and is displayed as an estimate in UI.
    let score = logit(0.20);
    const reasons = ["旅人は基本的に善寄りとして開始"];

    const ownActions = actions.filter(a => a.travellerId === t.id);
    const apprentice = ownActions.find((a): a is Extract<typeof a, { kind: "apprentice_ability" }> => a.kind === "apprentice_ability");
    if (apprentice) {
      const evil = ROLES[apprentice.abilityRoleId].type === "minion" ? 1 : 0;
      out[t.id] = { evil, good: 1 - evil, exact: true, reasons: [evil ? "見習いが手下能力を得たため悪確定" : "見習いが町人能力を得たため善確定"] };
      continue;
    }
    const replacement = [...ownActions].reverse().find(a => a.roleId === "scapegoat" && a.kind === "replacement");
    if (replacement && replacement.kind === "replacement") {
      const p = seatEvil(result, replacement.savedPlayer);
      if (p !== null) {
        // Same alignment is mechanical. Keep a tiny amount of prior smoothing
        // because the seated-player value itself is sampled, not certain.
        const evil = clamp01(p * 0.98 + 0.20 * 0.02);
        out[t.id] = { evil, good: 1 - evil, exact: false, reasons: [...reasons, "スケープゴートの身代わり対象と同陣営"] };
        continue;
      }
    }
    const gnomeFriend = ownActions.find((a): a is Extract<typeof a, { kind: "gnome_friend" }> => a.kind === "gnome_friend");
    if (gnomeFriend) {
      const friendTraveller = travellers.find(x => x.id === gnomeFriend.friend);
      if (friendTraveller?.knownAlignment && friendTraveller.knownAlignment !== "unknown") {
        const evil = friendTraveller.knownAlignment === "evil" ? 1 : 0;
        out[t.id] = { evil, good: 1 - evil, exact: true, reasons: ["ノームの公開された友人と開始時に同陣営"] };
        continue;
      }
      const p = seatEvil(result, gnomeFriend.friend);
      if (p !== null) {
        const evil = clamp01(p * 0.98 + 0.20 * 0.02);
        out[t.id] = { evil, good: 1 - evil, exact: false, reasons: [...reasons, "ノームの公開された友人と開始時に同陣営"] };
        continue;
      }
    }

    for (const action of ownActions) {
      if (action.kind === "vote_modifier") {
        const p = seatEvil(result, action.target);
        if (p === null) continue;
        if (action.roleId === "bureaucrat") {
          // Good Bureaucrats tend to empower good players; evil ones tend to
          // empower evil players. Keep this deliberately soft.
          score += (p - 0.5) * 1.7;
          reasons.push(`官僚の3票先: 悪${Math.round(p * 100)}%`);
        } else {
          // Good Thieves tend to hinder evil players; evil Thieves tend to
          // hinder good players.
          score += (0.5 - p) * 1.7;
          reasons.push(`泥棒のマイナス票先: 悪${Math.round(p * 100)}%`);
        }
      } else if (action.kind === "shot" && action.killed) {
        const p = seatEvil(result, action.target);
        if (p === null) continue;
        score += (0.5 - p) * 2.2;
        reasons.push(`ガンスリンガーの射殺先: 悪${Math.round(p * 100)}%`);
      } else if (action.kind === "gnome_kill" && action.killed) {
        const p = seatEvil(result, action.target);
        if (p === null) continue;
        score += (0.5 - p) * 1.8;
        reasons.push(`ノームの死亡対象: 悪${Math.round(p * 100)}%`);
      } else if (action.kind === "gangster_kill" && action.killed) {
        const p = seatEvil(result, action.target);
        if (p === null) continue;
        score += (0.5 - p) * 1.8;
        reasons.push(`ギャングスターの死亡対象: 悪${Math.round(p * 100)}%`);
      }
    }

    for (const action of ownActions) {
      if (action.kind === "judge_ruling") {
        const nomination = g.nominationLog.find(n => n.id === action.nominationId);
        const p = nomination ? seatEvil(result, nomination.nominee) : null;
        if (p !== null) {
          score += action.result === "pass" ? (0.5 - p) * 1.5 : (p - 0.5) * 1.5;
          reasons.push(`判事の${action.result === "pass" ? "処刑成功" : "処刑失敗"}対象: 悪${Math.round(p * 100)}%`);
        }
      } else if (action.kind === "butcher_nomination") {
        const nomination = g.nominationLog.find(n => n.id === action.nominationId);
        const p = nomination ? seatEvil(result, nomination.nominee) : null;
        if (p !== null) { score += (0.5 - p) * 1.0; reasons.push(`肉屋の追加指名先: 悪${Math.round(p * 100)}%`); }
      }
    }

    // Voting is useful but noisy, so it contributes much less than role
    // abilities. Travellers appear only in the voters array, never setup seats.
    for (const n of g.nominationLog) {
      if (!n.voters.includes(t.id)) continue;
      const p = seatEvil(result, n.nominee);
      if (p === null) continue;
      score += (0.5 - p) * 0.28;
    }

    const evil = clamp01(logistic(score));
    out[t.id] = { evil, good: 1 - evil, exact: false, reasons };
  }
  return out;
}

export function travellerShortLabel(g: GameSnapshot, id: string): string {
  const t = (g.travellers ?? []).find(x => x.id === id);
  if (!t) return id;
  return `${TRAVELLERS[t.roleId].symbol} ${t.name || TRAVELLERS[t.roleId].name}`;
}
