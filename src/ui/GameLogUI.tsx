import type { GameLogEntry, GameLogOutcome } from "../types";
import { LOG_KEYS } from "../storage";
import { Sheet } from "./ReasoningUI";

function formatDate(ms: number) {
  try {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toLocaleString();
  }
}

function eventCount(log: GameLogEntry) {
  return LOG_KEYS.reduce((sum, key) => sum + (log.game[key] ?? []).length, 0);
}

const OUTCOME_LABELS: Record<GameLogOutcome, string> = {
  unknown: "結果不明",
  good: "町勝利",
  evil: "デーモン勝利",
  special: "特殊条件勝利",
};

type Patch = Partial<Pick<GameLogEntry, "label" | "note" | "outcome" | "status">>;

type Props = {
  logs: GameLogEntry[];
  onClose: () => void;
  onLoad: (log: GameLogEntry, openWorlds: boolean) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Patch) => void;
  onExportOne: (log: GameLogEntry) => void;
  onExportAll: () => void;
};

export function GameLogPanel({
  logs,
  onClose,
  onLoad,
  onDelete,
  onUpdate,
  onExportOne,
  onExportAll,
}: Props) {
  return (
    <Sheet title="ゲームログ" onClose={onClose}>
      <p className="panel-note">
        各ログにはその時点の入力一式と、保存時の推理サマリーを残します。後から読み込むと、現在の推理エンジンでもう一度候補盤面を調べ直せます。
      </p>

      {logs.length > 0 && (
        <button className="menu-option" onClick={onExportAll}>
          全ログを書き出す
        </button>
      )}

      {logs.length === 0 ? (
        <p className="panel-note">まだ保存されたゲームログはありません。</p>
      ) : (
        logs.map((log) => (
          <details className="analysis-card game-log-card" key={log.id}>
            <summary>
              <strong>{log.label}</strong>
              <span className="game-log-summary-meta">
                {formatDate(log.savedAt)} / {log.status === "finished" ? "終了" : "途中保存"} / {OUTCOME_LABELS[log.outcome]}
              </span>
            </summary>

            <div className="form-section">
              <label>ログ名</label>
              <input
                defaultValue={log.label}
                maxLength={80}
                onBlur={(event) => {
                  const label = event.target.value.trim();
                  if (label && label !== log.label) onUpdate(log.id, { label });
                }}
              />
            </div>

            <div className="status-detail">
              {log.game.playerCount}人 / N{log.game.night} / 記録 {eventCount(log)}件
            </div>

            <div className="claim-option-title">勝敗</div>
            <div className="visibility-switch">
              {(Object.keys(OUTCOME_LABELS) as GameLogOutcome[]).map((outcome) => (
                <button
                  type="button"
                  key={outcome}
                  className={`visibility-button ${log.outcome === outcome ? "visibility-selected" : ""}`}
                  onClick={() => onUpdate(log.id, { outcome })}
                >
                  {OUTCOME_LABELS[outcome]}
                </button>
              ))}
            </div>

            <div className="form-section">
              <label>振り返りメモ</label>
              <textarea
                defaultValue={log.note}
                maxLength={3000}
                placeholder="後で見返したいこと、最終配役、判断ミスなど"
                onBlur={(event) => {
                  if (event.target.value !== log.note) {
                    onUpdate(log.id, { note: event.target.value });
                  }
                }}
              />
            </div>

            {log.reasoning ? (
              <section className="game-log-reasoning">
                <h4>保存時の推理</h4>
                <p className="metric-line">
                  候補 {log.reasoning.unique} / 検討 {log.reasoning.checked} / 有効候補 {log.reasoning.effectiveWorlds.toFixed(1)}
                </p>
                <p className="panel-note">
                  これは保存当時のサマリーです。下の「候補盤面を再確認」では現在のエンジンで再計算します。
                </p>
              </section>
            ) : (
              <p className="panel-note">保存時には推理結果がまだありませんでした。</p>
            )}

            <div className="compact-row">
              <button className="menu-option" onClick={() => onLoad(log, true)}>
                候補盤面を再確認
              </button>
              <button className="menu-option" onClick={() => onLoad(log, false)}>
                ゲームを読み込む
              </button>
            </div>

            <button className="menu-option" onClick={() => onExportOne(log)}>
              このログを書き出す
            </button>
            <button
              className="menu-option danger-button"
              onClick={() => {
                if (window.confirm("このゲームログを削除しますか？")) onDelete(log.id);
              }}
            >
              ログを削除
            </button>
          </details>
        ))
      )}
    </Sheet>
  );
}
