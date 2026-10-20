import {useState} from 'react';
import {ROLES, type RoleId} from '../roles';
import {getSnapshotScriptRoleIds} from '../scripts';
import type {GameSnapshot, OutsiderEvent} from '../types';
import type {SearchResult} from '../engine/model';
import {seats} from '../engine/game';
import {eventId} from '../storage';
import {person} from './text';

type Kind=OutsiderEvent['kind'];
const LABELS:Record<Kind,string>={
 puzzlemaster_guess:'パズルマスター：酔った人の推理',
 golem_nomination:'ゴーレム：能力による指名',
 ogre_choice:'オーガ：初夜に選んだ人',
 hatter_change:'帽子屋：死亡後の悪役職変更',
 plague_grant:'疫病医師：語り手が得た手下能力',
 politician_reward:'政治家：語り手による勝利認定',
 politician_suspicion:'政治家：怪しい言動（弱い手掛かり）',
};
const NEED:Record<Kind,RoleId>={puzzlemaster_guess:'puzzlemaster',golem_nomination:'golem',ogre_choice:'ogre',hatter_change:'hatter',plague_grant:'plague_doctor',politician_reward:'politician',politician_suspicion:'politician'};
export function OutsiderAnalysis({g,result,onRecord,onRemove}:{g:GameSnapshot;result:SearchResult|null;onRecord:(e:OutsiderEvent)=>void;onRemove:(id:number)=>void}){
 const roles=new Set(getSnapshotScriptRoleIds(g));
 const kinds=(Object.keys(LABELS) as Kind[]).filter(k=>roles.has(NEED[k]));
 const [kind,setKind]=useState<Kind>(kinds[0]??'puzzlemaster_guess');
 const [day,setDay]=useState(g.night);
 const [partOfDay,setPartOfDay]=useState<'N'|'D'>('D');
 const [actor,setActor]=useState('');
 const [target,setTarget]=useState('');
 const [shownDemon,setShownDemon]=useState('');
 const [newRole,setNewRole]=useState<RoleId|null>(null);
 const [killed,setKilled]=useState(true);
 const choice:Kind=kinds.includes(kind)?kind:kinds[0]??kind;
 const phase=choice==='ogre_choice'?'N1':`${choice==='hatter_change'||choice==='plague_grant'?partOfDay:'D'}${day}`;
 const hasTarget=['puzzlemaster_guess','golem_nomination','ogre_choice','hatter_change'].includes(choice);
 const villainRoles=getSnapshotScriptRoleIds(g).filter(r=>['minion','demon'].includes(ROLES[r].type));
 const abilityRoles=(Object.keys(ROLES) as RoleId[]).filter(r=>ROLES[r].type==='minion');
 const roleOptions=choice==='plague_grant'?abilityRoles:villainRoles;
 const scores=Object.entries(result?.puzzlemasterDrunkConditionalSeats??{}).sort((a,b)=>b[1]-a[1]).slice(0,7);
 if(!kinds.length && !roles.has('zealot') && !roles.has('heretic') && !roles.has('hermit') && !roles.has('snitch'))return null;
 return <section className="analysis-card">
  <h3>よそ者の能力と検証</h3>
  <p className="panel-note">下の入力は、実際に確認した能力結果だけを記録してください。役職主張や噂だけでは役職を確定しません。</p>
  {roles.has('puzzlemaster')&&<div className="form-section">
   <h4>酔った人を探す（パズルマスター）</h4>
   <p className="panel-note">通常の酔い・毒とは別に、最初から1人が永続的に酔っています。順位は候補盤面内の条件付き比率であり、確定情報ではありません。</p>
   {scores.length>0?<ol>{scores.map(([p,ratio])=><li key={p}>{person(g,p)}：{Math.round(ratio*100)}%</li>)}</ol>:<p className="panel-note">候補の比較は推理を実行すると表示されます。</p>}
   <p className="panel-note">正しい人を当てると本当のデーモン、間違えるとデーモンではない人を教えられます。答えだけで正誤は断定できません。</p>
  </div>}
  {roles.has('zealot')&&<p className="panel-note">狂信者：生存者が5人以上のとき、健康な狂信者はすべての指名で投票します。投票記録が完全でない場合は断定しません。</p>}
  {roles.has('politician')&&<p className="panel-note">政治家：悪側に協力したという疑いだけで悪陣営には変えません。ゲーム終了時に語り手が認めた場合だけ悪の勝利を共有します。</p>}
  {roles.has('heretic')&&<p className="panel-note">異端者：能力が有効なときは勝敗が逆になります。語り手による勝利結果を確認してください。</p>}
  {roles.has('hermit')&&<p className="panel-note">隠者：台本中にある他のすべてのよそ者の能力を持ちます。複数能力の重複は語り手の判断が必要です。</p>}
  {!!kinds.length && <div className="form-section">
   <h4>能力の結果を記録</h4>
   <label>能力の種類</label><select value={choice} onChange={e=>{setKind(e.target.value as Kind);setTarget('');setNewRole(null);}}>{kinds.map(k=><option key={k} value={k}>{LABELS[k]}</option>)}</select>
   {choice!=='ogre_choice'&&<><label>日</label><select value={day} onChange={e=>setDay(Number(e.target.value))}>{Array.from({length:g.night},(_,i)=>i+1).map(d=><option value={d} key={d}>{d}</option>)}</select></>}
   {(choice==='hatter_change'||choice==='plague_grant')&&<><label>時間帯</label><select value={partOfDay} onChange={e=>setPartOfDay(e.target.value as 'N'|'D')}><option value="N">夜</option><option value="D">昼</option></select></>}
   <label>{choice==='hatter_change'?'死亡した帽子屋':choice==='politician_reward'?'認定された政治家':choice==='politician_suspicion'?'疑わしい言動の人':'能力を持つ人'}</label>
   <select value={actor} onChange={e=>setActor(e.target.value)}><option value="">選択</option>{seats(g.playerCount).map(p=><option key={p} value={p}>{person(g,p)}</option>)}</select>
   {hasTarget&&<><label>{choice==='hatter_change'?'役職を変更した悪の人':'対象の人'}</label><select value={target} onChange={e=>setTarget(e.target.value)}><option value="">選択</option>{seats(g.playerCount).filter(p=>choice==='puzzlemaster_guess'||p!==actor).map(p=><option key={p} value={p}>{person(g,p)}</option>)}</select></>}
   {choice==='puzzlemaster_guess'&&<><label>語り手が示したデーモン候補</label><select value={shownDemon} onChange={e=>setShownDemon(e.target.value)}><option value="">選択</option>{seats(g.playerCount).map(p=><option key={p} value={p}>{person(g,p)}</option>)}</select></>}
   {choice==='golem_nomination'&&<label className="check-label"><input type="checkbox" checked={killed} onChange={e=>setKilled(e.target.checked)}/>指名された人が死亡した</label>}
   {(choice==='hatter_change'||choice==='plague_grant')&&<><label>{choice==='plague_grant'?'語り手が得た手下能力':'変更後の手下またはデーモン役職'}</label><select value={newRole??''} onChange={e=>setNewRole(e.target.value as RoleId||null)}><option value="">選択</option>{roleOptions.map(r=><option value={r} key={r}>{ROLES[r].symbol} {ROLES[r].name}</option>)}</select></>}
   <button type="button" className="menu-option" disabled={!actor||(hasTarget&&!target)||(choice==='puzzlemaster_guess'&&!shownDemon)||(['plague_grant','hatter_change'].includes(choice)&&!newRole)} onClick={()=>{
    if(!actor)return;
    const base={id:eventId(),when:phase,playerId:actor};
    if(choice==='puzzlemaster_guess' && shownDemon && target)onRecord({...base,kind:choice,target,shownDemon});
    if(choice==='golem_nomination' && target)onRecord({...base,kind:choice,target,killed});
    if(choice==='ogre_choice' && target)onRecord({...base,kind:choice,target});
    if(choice==='hatter_change' && target && newRole)onRecord({...base,kind:choice,target,newRole});
    if(choice==='plague_grant' && newRole)onRecord({...base,kind:choice,abilityRole:newRole});
    if(choice==='politician_reward'||choice==='politician_suspicion')onRecord({...base,kind:choice});
   }}>確認済みの結果を保存</button>
  </div>}
  {(g.outsiderEvents??[]).map(e=><div key={e.id} className="demon-action-row">
   <strong>{e.when}：{LABELS[e.kind]}</strong>
   <span>{person(g,e.playerId)}{'target' in e?` → ${person(g,e.target)}`:''}{'newRole' in e?` → ${ROLES[e.newRole].name}`:''}{'abilityRole' in e?`：${ROLES[e.abilityRole].name}`:''}</span>
   <button type="button" className="mini-danger-button" onClick={()=>onRemove(e.id)}>削除</button>
  </div>)}
 </section>;
}
