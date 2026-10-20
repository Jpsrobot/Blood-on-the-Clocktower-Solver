import { ROLES, type RoleId } from "../roles";
import { getSnapshotScriptRoleIds } from "../scripts";
import type { GameSnapshot } from "../types";
import type { SearchResult } from "./model";
import { exactClaim, seats } from "./game";

export type CerenovusSuggestion = {
  target: string;
  madRole: RoleId;
  publicEvilShare: number;
  privateEvilShare: number;
  score: number;
  reasons: string[];
};

export type PitHagSuggestion = {
  target: string;
  newRole: RoleId;
  successChance: number;
  score: number;
  kind: "cripple" | "demon-pivot" | "evil-upgrade";
  reasons: string[];
};

function knownEvil(g: GameSnapshot): Set<string> {
  const out = new Set<string>(["self"]);
  const state = g.minionState;
  if (state?.knownDemon?.playerId) out.add(state.knownDemon.playerId);
  for (const m of state?.knownMinions ?? []) out.add(m.playerId);
  return out;
}

function publicClaimers(g: GameSnapshot, roleId: RoleId, except?: string): string[] {
  return seats(g.playerCount).filter((p) => p !== except && exactClaim(g, p) === roleId);
}

function cerenovusRolePressure(g: GameSnapshot, target: string, roleId: RoleId): { value: number; reasons: string[] } {
  const role = ROLES[roleId];
  const prior = exactClaim(g, target);
  const duplicates = publicClaimers(g, roleId, target).length;
  let value = 0;
  const reasons: string[] = [];
  if (prior && prior !== roleId) {
    value += 3.2;
    reasons.push(`現在の${ROLES[prior].name}主張から話を変えさせる`);
  } else if (prior === roleId) {
    value -= 3;
    reasons.push("現在の主張と同じなので圧力が弱い");
  }
  if (duplicates) {
    value += Math.min(5, duplicates * 2.4);
    reasons.push(`既存の${role.name}主張と衝突`);
  }
  if (g.night >= 2 && role.tags.includes("FIRST_NIGHT_INFO")) {
    value += 1.7;
    reasons.push("後付けの初夜情報を作らせる");
  }
  if (g.night >= 3 && (roleId === "savant" || roleId === "juggler")) {
    value += 2.3;
    reasons.push("過去日の情報を即興で作らせやすい");
  }
  if (roleId === "artist" && g.night >= 2) {
    value += 1.1;
    reasons.push("一回能力の使用時点を説明させる");
  }
  if (role.type === "outsider" && getSnapshotScriptRoleIds(g).includes("fang_gu")) {
    value += 0.7;
    reasons.push("ファン・グー世界のアウトサイダー疑惑も作れる");
  }
  return { value, reasons };
}

export function rankCerenovusSuggestions(
  g: GameSnapshot,
  privateResult: SearchResult | null,
  opponentResult: SearchResult | null,
): CerenovusSuggestion[] {
  const allies = knownEvil(g);
  const goodRoles = getSnapshotScriptRoleIds(g).filter((id) => {
    const type = ROLES[id].type;
    return type === "townsfolk" || type === "outsider";
  });
  const suggestions: CerenovusSuggestion[] = [];
  for (const target of seats(g.playerCount)) {
    if (allies.has(target)) continue;
    const publicEvilShare = opponentResult?.players[target]?.evil ?? 0.5;
    const privateEvilShare = privateResult?.players[target]?.evil ?? 0.35;
    for (const madRole of goodRoles) {
      const pressure = cerenovusRolePressure(g, target, madRole);
      const deadPenalty = g.playerStatus[target]?.alive === false ? 2.5 : 0;
      const score = publicEvilShare * 8 + (1 - privateEvilShare) * 2.5 + pressure.value - deadPenalty;
      suggestions.push({
        target,
        madRole,
        publicEvilShare,
        privateEvilShare,
        score,
        reasons: [
          `町視点で悪の候補盤面 ${Math.round(publicEvilShare * 100)}%`,
          ...pressure.reasons,
          ...(deadPenalty ? ["死亡済みなので優先度を下げる"] : []),
        ],
      });
    }
  }
  return suggestions.sort((a, b) => b.score - a.score).slice(0, 8);
}

function currentRolePresence(result: SearchResult | null, roleId: RoleId): number {
  if (!result) return 0.5;
  const worlds = result.worlds ?? [];
  const weights = result.worldWeights ?? [];
  if (!worlds.length || weights.length !== worlds.length) return result.presence[roleId] ?? 0.5;
  let total = 0, present = 0;
  for (let i = 0; i < worlds.length; i++) {
    const weight = weights[i] ?? 0;
    total += weight;
    if (Object.values(worlds[i].current).includes(roleId)) present += weight;
  }
  return total > 0 ? present / total : (result.presence[roleId] ?? 0.5);
}

function targetValue(g: GameSnapshot, result: SearchResult | null, target: string): { value: number; reasons: string[] } {
  const claim = exactClaim(g, target);
  const role = claim ? ROLES[claim] : null;
  const evil = result?.players[target]?.evil ?? 0.35;
  let value = (1 - evil) * 3;
  const reasons: string[] = [];
  if (evil < 0.25) reasons.push("候補盤面で善寄り");
  if (role?.tags.includes("CONTINUOUS_INFO")) { value += 4; reasons.push("継続情報を止められる"); }
  if (role?.tags.includes("INFO_SOURCE")) { value += 2; reasons.push("情報役主張"); }
  if (role?.tags.includes("HIGH_SURVIVAL_VALUE")) { value += 1.5; reasons.push("生存価値が高い主張"); }
  if (claim === "sage" || claim === "snake_charmer" || claim === "philosopher") { value += 2.5; reasons.push("悪チームに危険な役職主張"); }
  return { value, reasons };
}

function replacementImpact(roleId: RoleId, targetIsKnownEvil: boolean, night: number): { value: number; reason: string } {
  if (targetIsKnownEvil) {
    if (ROLES[roleId].type === "demon") return { value: 4.2, reason: "悪陣営のままデーモンへ移せる" };
    if (ROLES[roleId].type === "minion") return { value: 1.2, reason: "悪陣営のまま別の手下能力へ" };
    return { value: 0.2, reason: "悪陣営の善役職ブラフへ変換" };
  }
  const values: Partial<Record<RoleId, number>> = { sweetheart: 7, klutz: 6.5, mutant: 5.7, barber: 3.4 };
  if (values[roleId] !== undefined) return { value: values[roleId]!, reason: "善プレイヤーを危険なアウトサイダーへ" };
  if (ROLES[roleId].type === "outsider") return { value: 3.2, reason: "善プレイヤーをアウトサイダーへ" };
  if (ROLES[roleId].type === "minion") return { value: -3.5, reason: "善の手下を作るので逆利用され得る" };
  if (ROLES[roleId].type === "demon") return { value: -5, reason: "善のデーモンを作る危険が大きい" };
  if (night >= 2 && ROLES[roleId].tags.includes("FIRST_NIGHT_INFO")) return { value: 1.6, reason: "役割を変えて情報履歴を崩せる" };
  if (["sage", "snake_charmer", "philosopher", "savant", "dreamer"].includes(roleId)) return { value: -2.5, reason: "善側に強い能力を渡す危険" };
  return { value: 0.4, reason: "役職変更で既存情報を切る" };
}

export function rankPitHagSuggestions(g: GameSnapshot, result: SearchResult | null): PitHagSuggestion[] {
  const allies = knownEvil(g);
  const scriptRoles = getSnapshotScriptRoleIds(g);
  const suggestions: PitHagSuggestion[] = [];
  const targets = seats(g.playerCount);
  for (const target of targets) {
    const targetKnownEvil = allies.has(target);
    const tv = targetValue(g, result, target);
    for (const newRole of scriptRoles) {
      const currentClaim = exactClaim(g, target);
      if (currentClaim === newRole) continue;
      const absence = 1 - currentRolePresence(result, newRole);
      if (absence < 0.08) continue;
      const impact = replacementImpact(newRole, targetKnownEvil, g.night);
      let score = absence * 5 + impact.value + (targetKnownEvil ? 0 : tv.value);
      let kind: PitHagSuggestion["kind"] = targetKnownEvil ? "evil-upgrade" : "cripple";
      const reasons = [`成功見込み 約${Math.round(absence * 100)}%`, impact.reason];
      if (target === g.minionState?.knownDemon?.playerId && ROLES[newRole].type !== "demon") {
        score -= 20;
        reasons.push("既知の唯一デーモンを消して善勝利を招く危険が高い");
      }
      if (!targetKnownEvil) reasons.push(...tv.reasons);
      if ((g.minionState?.sharedStorytellerBluffs ?? []).includes(newRole)) {
        score += 2.4;
        reasons.push("開始時ストーリーテラーのブラフなので初期不在を直接確認済み");
      }
      if (target === g.minionState?.knownDemon?.playerId && ROLES[newRole].type === "demon") {
        kind = "demon-pivot";
        score += 4.5;
        reasons.push("既知デーモンの種類を直接変更");
        if (newRole === "vortox") reasons.push("情報盤面を一気に反転できる");
        if (newRole === "fang_gu") reasons.push("アウトサイダーの逃げ道を作れる可能性");
      }
      suggestions.push({ target, newRole, successChance: absence, score, kind, reasons });
    }
  }
  const bestByKey = new Map<string, PitHagSuggestion>();
  for (const item of suggestions.sort((a,b)=>b.score-a.score)) {
    const key = `${item.kind}:${item.target}`;
    if (!bestByKey.has(key)) bestByKey.set(key, item);
  }
  return [...bestByKey.values()].sort((a,b)=>b.score-a.score).slice(0, 8);
}

export function twinWeakInformation(g: GameSnapshot, opponentResult: SearchResult | null, twin: string) {
  return g.abilityClaimLog
    .filter((event) => (event.sourcePlayerId || event.playerId) === twin && !!event.structured)
    .map((event) => {
      const info = opponentResult?.info[event.id];
      const suspicious = info ? (info.bluff + info.lie) : 0;
      const supported = info ? (info.works + info.registration + info.poison + info.drunk + info.vortox) : 0;
      return { event, suspicious, supported };
    })
    .sort((a,b)=>b.suspicious-a.suspicious);
}
