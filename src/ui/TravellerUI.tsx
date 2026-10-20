import type { GameSnapshot } from "../types";
import type { SearchResult } from "../engine/model";
import type { TravellerAlignmentEstimate } from "../engine/travellerAlignment";
import { TRAVELLERS } from "../travellers";
import { seats } from "../engine/game";
import { Sheet } from "./ReasoningUI";

function pct(n: number | undefined) { return n === undefined ? "—" : `${Math.round(n * 100)}%`; }

export function TravellerStrip({
  g, estimates, onOpen,
}: {
  g: GameSnapshot;
  estimates: Record<string, TravellerAlignmentEstimate>;
  onOpen: (id: string) => void;
}) {
  const active = (g.travellers ?? []).filter(t => t.active);
  if (!active.length) return null;
  return <div className="traveller-center" aria-label="旅人">
    <div className="traveller-center-title">旅人</div>
    {active.map(t => {
      const role = TRAVELLERS[t.roleId];
      const estimate = estimates[t.id];
      return <button key={t.id} type="button" className={`traveller-chip${t.alive ? "" : " traveller-chip-dead"}`} onClick={() => onOpen(t.id)}>
        <strong>{role.symbol}</strong>
        <span>{t.name || role.name}</span>
        <small>{t.alive ? "生存" : "死亡"} / 悪 {pct(estimate?.evil)}</small>
      </button>;
    })}
  </div>;
}

export function AlignmentLikelihoodSheet({
  g, r, travellerEstimates, onClose,
}: {
  g: GameSnapshot;
  r: SearchResult | null;
  travellerEstimates: Record<string, TravellerAlignmentEstimate>;
  onClose: () => void;
}) {
  const regular = seats(g.playerCount);
  const travellers = (g.travellers ?? []).filter(t => t.active);
  const display = (p: string) => p === "self" ? "自分" : (g.playerNames[p] ? `${g.playerNames[p]} (${p})` : p);
  return <Sheet title="善悪推定" onClose={onClose}>
    <p className="panel-note">通常プレイヤーは推理ワールドの比率、旅人は公開行動からの別推定です。旅人の数値は機械的な確定確率ではありません。</p>
    <section className="analysis-card">
      <h3>通常プレイヤー</h3>
      <div className="alignment-list">
        {regular.map(p => {
          const evil = r?.players[p]?.evil;
          return <div className="alignment-row" key={p}>
            <strong>{display(p)}</strong>
            <span>善 {evil === undefined ? "—" : pct(1 - evil)}</span>
            <span>悪 {pct(evil)}</span>
          </div>;
        })}
      </div>
    </section>
    {travellers.length > 0 && <section className="analysis-card">
      <h3>旅人</h3>
      <div className="alignment-list">
        {travellers.map(t => {
          const role = TRAVELLERS[t.roleId];
          const e = travellerEstimates[t.id];
          return <details className="alignment-traveller" key={t.id}>
            <summary><strong>{role.symbol} {t.name || role.name}</strong><span>善 {pct(e?.good)} / 悪 {pct(e?.evil)}</span></summary>
            <p>{e?.exact ? "確定入力" : "行動ベースの推定"}</p>
            <ul className="reason-list">{e?.reasons.map((reason, i) => <li key={i}>{reason}</li>)}</ul>
          </details>;
        })}
      </div>
    </section>}
  </Sheet>;
}
