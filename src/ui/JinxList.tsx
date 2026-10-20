import { type RoleId } from '../roles';
import { jinxLabel, scriptJinxes } from '../jinxes';

/** Public Djinn rules are determined by the script, not the secret starting roles. */
export function JinxList({roleIds,defaultOpen=false}:{roleIds:Iterable<RoleId>;defaultOpen?:boolean}) {
  const jinxes=scriptJinxes(roleIds);
  if(!jinxes.length)return null;
  return <details className="analysis-card" open={defaultOpen ? true : undefined}>
    <summary>ジンクス（特殊な組み合わせ） — {jinxes.length}件</summary>
    <p className="panel-note">このスクリプトで実際に推理や勝敗が変わる例外だけを表示します。役職が実際に参加している証拠ではありません。語り手の判断が必要な勝敗は確認記録から入力します。</p>
    <ul className="reason-list">{jinxes.map(j => <li key={j.id}>
      <strong>{jinxLabel(j)}</strong><span className="reason-kind">{j.support==='engine'?'一部自動判定':j.support==='victory'?'勝利条件':'語り手確認'}</span>
      <div>{j.description}</div>
    </li>)}</ul>
  </details>;
}
