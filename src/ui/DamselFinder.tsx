import {useMemo} from 'react';
import {getSnapshotScriptRoleIds} from '../scripts';
import type {GameSnapshot} from '../types';
import type {SearchResult} from '../engine/model';
import {seats,exactClaim} from '../engine/game';
import {person} from './text';
export function DamselFinder({g,result,viewer}:{g:GameSnapshot;result:SearchResult|null;viewer:'minion'|'demon'}){
 const available=getSnapshotScriptRoleIds(g).includes('damsel');
 const known=new Set([...(g.minionState?.knownMinions??[]).map(x=>x.playerId),...(g.demonState?.knownMinions??[]).map(x=>x.playerId),g.minionState?.knownDemon?.playerId]);
 const knownClaimed=useMemo(()=>seats(g.playerCount).filter(p=>p!=='self'&&!known.has(p)&&g.playerStatus[p]?.alive!==false).map(player=>({
  player,prob:result?.players[player]?.roles.damsel??0,claim:exactClaim(g,player)
 })).sort((a,b)=>b.prob-a.prob),[g,result]);
 if(!available)return null;
 return <section className="analysis-card">
   <h3>乙女を探す（ダムゼル）</h3>
   <p className="panel-note">候補順位は公開情報とサンプルされた配役からの参考値です。乙女は正体を隠すため、役職を主張していない人も候補に残します。</p>
   {knownClaimed.slice(0,7).map((row,i)=><div key={row.player} className="demon-action-row"><strong>{i+1}. {person(g,row.player)}</strong><span>乙女の候補：{result&&result.unique>0?`${Math.round(row.prob*100)}%`:'推理前'} / {row.claim?'主張あり':'役職主張なし'}</span></div>)}
   <p className="panel-note">{viewer==='demon'?'デーモン自身の推理を味方の手下に伝えましょう。デーモンは乙女の公開指名で勝利できません。':'生存中の手下が、ゲーム中に一度だけ公開で乙女を当てると悪の勝利になる場合があります。誤った指名も権利を消費します。'}</p>
   <p className="panel-note">スパイ・ウィドウとのジンクスや酔い・毒、能力の喪失には注意してください。</p>
 </section>;
}
