import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { GameSnapshot, ManualRead, SelfInfoEvent, BoomdandyEvent, JinxVictoryEvent, WidowReport, EvilBehaviorReport, PsychopathPublicEvent, OrganGrinderVoteEvent, OutsiderEvent } from '../types';
import { ROLES, type RoleId } from '../roles';
import { getSnapshotScriptRoleIds } from '../scripts';
import type { SearchResult, EvidenceAnalysis, Reason, Warning, HistoryWorld } from '../engine/model';
import { observations, setupCounts, seats, compareEvents, isAliveAt } from '../engine/game';
import { demonPatternSignals, legionAccusationNotes } from '../engine/demonVariants';
import { minionPatternSignals } from '../engine/minionPatterns';
import { recommendations, nominationAdvice } from '../engine/advice';
import type { LogKey } from '../storage';
import { LOG_KEYS, eventId } from '../storage';
import { L, person, explain, worldReasons, DISPOSITION_LABELS } from './text';
import { JinxList } from './JinxList';
import { OutsiderAnalysis } from './OutsiderUI';
import { scriptJinxes, jinxLabel } from '../jinxes';
import { JINX_VICTORY_RECORDED_PAIRS, type JinxVictoryPair } from '../engine/jinxVictory';
const AMNESIAC_TAG_LABELS: Record<string,string> = {
 INFO_SOURCE:'情報を得る',FIRST_NIGHT_INFO:'初夜に情報を得る',CONTINUOUS_INFO:'継続して情報を得る',NIGHT_INFORMATION:'夜に情報を得る',NIGHT_ABILITY:'夜に能力を使う',DAY_INFORMATION:'昼に情報を得る',LACK_OF_INFO:'情報を直接得ない',
 WAKES_FIRST_NIGHT:'初夜に起きる',WAKES_OTHER_NIGHTS:'2夜目以降に起きる',CONDITIONAL_NIGHT_WAKE:'条件付きで夜に起きる',ONE_TIME_ABILITY:'一度きりの能力',DAY_ABILITY:'昼に使う能力',PASSIVE:'常時能力',
 ON_NIGHT_DEATH:'夜死亡で発動',ON_EXECUTION:'処刑で発動',ON_NOMINATION:'指名で発動',ON_DEATH:'死亡で発動',TARGETS_PLAYER:'プレイヤーを選ぶ',TARGETS_CHARACTER:'役職を選ぶ',
 PREVENTS_DEATH:'死亡を防ぐ',PREVENTS_EXECUTION_DEATH:'処刑死を防ぐ',KILLS:'死亡させる',CAUSES_OWN_DEATH:'自分が死亡しうる',REVIVES:'復活させる',POISON_DRUNK_ABILITY:'酔い・毒に関係する',
 HIGH_SURVIVAL_VALUE:'生存価値が高い',WANTS_DEMON_TARGET:'デーモンに狙われたい',AVOIDS_DEMON_TARGET:'デーモンに狙われたくない',HIGH_CONFIRMABILITY:'強く確認されやすい',CONDITIONAL_CONFIRMABILITY:'条件付きで確認されやすい',
 ROLE_CHANGING:'役職を変える',ALIGNMENT_CHANGING:'陣営を変える',ALTERNATE_WIN_CONDITION:'特殊勝利条件がある',
};
function pct(n:number|undefined){return n===undefined?'\u2014':`${Math.round(n*100)}%`;}
/** Strong display contrast within confirmed Riot worlds; not a calibrated posterior. */
function riotContrast(n:number){const p=Math.min(.999,Math.max(.001,n));const odds=Math.pow(p,2.5);return odds/(odds+Math.pow(1-p,2.5));}
const priority:Warning['color'][]=['red','orange','yellow','blue'];
const warningLabel={red:'\u60aa\u306e\u7591\u3044',orange:'\u4e0d\u6574\u5408',yellow:'\u898b\u7acb\u3066\u3092\u518d\u78ba\u8a8d',blue:'\u9152\u306e\u53ef\u80fd\u6027',green:'\u6bd2\u306e\u7591\u3044'};
export function WarningBadges({warnings,onOpen}:{warnings:Warning[];onOpen:()=>void}){
 const main=priority.map(c=>warnings.find(w=>w.color===c)).find(Boolean);
 const poison=warnings.filter(w=>w.color==='green').sort((a,b)=>(b.cycle??0)-(a.cycle??0))[0];
 return <>{main&&<button type="button" className={`warning-badge warning-${main.color}`} aria-label={warningLabel[main.color]} onClick={onOpen}><span>!</span></button>}{poison&&<button type="button" className="warning-badge warning-green" aria-label={`${warningLabel.green} N${poison.cycle}`} onClick={onOpen}><span>{poison.cycle}</span></button>}</>;
}
export function ReasonList({reasons,g}:{reasons:Reason[];g:GameSnapshot}){
 const unique=reasons.filter((r,i)=>reasons.findIndex(x=>x.code===r.code&&x.players.join()===r.players.join()&&x.phase===r.phase)===i);
 return unique.length?<ul className="reason-list">{unique.map((r,i)=><li key={`${r.code}-${i}`}><span className="reason-kind">{{mechanical:'\u516c\u958b\u4e8b\u8c61',conditional:'\u6761\u4ef6\u4ed8\u304d',heuristic:'\u50be\u5411',input:'\u5165\u529b\u78ba\u8a8d'}[r.strength]}</span>{explain(r,g)}{r.evidence.length>0&&<small>{'\u5bfe\u5fdc\u8a18\u9332'}: {r.evidence.map(id=>String(id).slice(-6)).join(', ')}</small>}</li>)}</ul>:<p className="panel-note">{L.noReasons}</p>;
}
export function Sheet({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){
 const ref=useRef<HTMLDivElement>(null);const closeRef=useRef(onClose);closeRef.current=onClose;
 useEffect(()=>{const prev=document.activeElement as HTMLElement|null;ref.current?.focus();const old=document.body.style.overflow;document.body.style.overflow='hidden';const key=(e:KeyboardEvent)=>{if(e.key==='Escape')closeRef.current();if(e.key==='Tab'){const items=ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input,select,textarea,[tabindex="0"]');if(!items?.length)return;const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};document.addEventListener('keydown',key);return()=>{document.body.style.overflow=old;document.removeEventListener('keydown',key);prev?.focus();};},[]);
 return <div className="analysis-overlay" onClick={onClose}><div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="analysis-sheet" onClick={e=>e.stopPropagation()}><header className="sheet-header"><h2>{title}</h2><button type="button" onClick={onClose} aria-label={L.close}>{'\u00d7'}</button></header>{children}</div></div>;
}
export function PlayerSummary({g,p,r,e,onOpen}:{g:GameSnapshot;p:string;r:SearchResult|null;e:EvidenceAnalysis;onOpen:()=>void}){
 const s=r?.unique?r.players[p]:undefined,ev=e.players[p];
 return <button className="player-summary" onClick={onOpen}><span>{L.sampleLabel}</span><strong>悪陣営 {pct(s?.evil)} / 手下 {pct(s?.minion)} / デーモン {pct(s?.demon)} / 酔い {pct(s?.drunk)}</strong><small>{L.goodPoints} {ev?.good.toFixed(1)??'0'} / {L.evilPoints} {ev?.evil.toFixed(1)??'0'} / {L.inconsistent} {ev?.inconsistency??0}</small><span>{person(g,p)} {'\u2014'} {L.reasons}</span></button>;
}
export function NominationCard({g,r,p,nominator='self',compact=false}:{g:GameSnapshot;r:SearchResult|null;p:string;nominator?:string;compact?:boolean}){
 const a=nominationAdvice(g,r,p,nominator);
 return <section className={`analysis-card verdict-${a.verdict}`}><h3>{person(g,p)} {'\u2014'} {L[a.verdict]}</h3>{r?.unique!==0&&r&&<p className="metric-line">悪陣営: {pct(r.players[p]?.evil)} / 手下: {pct(r.players[p]?.minion)} / デーモン: {pct(r.players[p]?.demon)} / 酔い: {pct(r.players[p]?.drunk)}</p>}<details open={!compact}><summary>{L.reasons}</summary><ReasonList reasons={a.reasons} g={g}/>{a.risks.length>0&&<><h4>{L.risk}</h4><ReasonList reasons={a.risks} g={g}/></>}</details></section>;
}
export function AdvicePanel({g,r}:{g:GameSnapshot;r:SearchResult|null}){
 const a=recommendations(g,r);
 return <><p className="panel-note">{'\u4ee5\u4e0b\u306f\u6bd4\u8f03\u7528\u306e\u884c\u52d5\u5019\u88dc\u3067\u3059\u3002\u6700\u9069\u89e3\u3084\u52dd\u5229\u306e\u4fdd\u8a3c\u3067\u306f\u3042\u308a\u307e\u305b\u3093\u3002'}</p>{a.nominations.map(x=><NominationCard key={x.player} g={g} r={r} p={x.player}/>)}{a.talks.length>0&&<section className="analysis-card"><h3>{L.talk}</h3><ul className="reason-list">{a.talks.map(p=><li key={p}>{person(g,p)}: {'\u5177\u4f53\u7684\u306a\u5f79\u8077\u4e3b\u5f35\u304c\u672a\u8a18\u9332\u3067\u3059\u3002\u591c\u306e\u60c5\u5831\u306e\u6709\u7121\u3092\u805e\u304f\u3068\u6bd4\u8f03\u306e\u6750\u6599\u306b\u306a\u308a\u307e\u3059\u3002'}</li>)}</ul></section>}{a.targets.length>0&&<section className="analysis-card"><h3>{L.targets}</h3><p>{a.targets.map(p=>person(g,p)).join(' / ')}</p><p className="panel-note">{g.selfRole.shownRole==='monk'?'\u751f\u5b58\u4fa1\u5024\u306e\u9ad8\u3044\u4e3b\u5f35\u8005\u3092\u91cd\u8996\u3057\u305f\u5019\u88dc\u3067\u3059\u3002\u60aa\u306e\u653b\u6483\u5148\u306f\u4e0d\u660e\u3067\u3059\u3002':'\u4e0a\u4f4d\u306e\u4ee3\u8868\u5019\u88dc\u3092\u5206\u3051\u3084\u3059\u3044\u7d44\u5408\u305b\u3067\u3059\u3002\u7bed\u3084\u9152\u30fb\u6bd2\u306e\u5f71\u97ff\u3092\u542b\u3080\u6700\u9069\u5316\u3067\u306f\u3042\u308a\u307e\u305b\u3093\u3002'}</p></section>}</>;
}
function seatNumber(player:string){return Number.parseInt(player,10)||0;}
function WorldSeat({g,w,p}:{g:GameSnapshot;w:HistoryWorld;p:string}){
 const initial=w.initial[p],current=w.current[p],alive=w.alive.includes(p);
 return <div className={`world-seat${p==='self'?' world-seat-self':''}${alive?'':' world-seat-dead'}`}>
  <span className="world-seat-person">{person(g,p)}</span>
  <span className="world-seat-role"><strong>{ROLES[initial].symbol}{initial!==current?` → ${ROLES[current].symbol}`:''}</strong><small>{L[w.currentAlignment[p]]}</small></span>
 </div>;
}
function WorldBoard({g,w}:{g:GameSnapshot;w:HistoryWorld}){
 const order=seats(g.playerCount);
 const left=order.filter(p=>p.endsWith('L')).sort((a,b)=>seatNumber(b)-seatNumber(a));
 const right=order.filter(p=>p.endsWith('R')).sort((a,b)=>seatNumber(b)-seatNumber(a));
 return <div className="world-board">
  <div className="world-board-top">上</div>
  <div className="world-board-columns">
   <div className="world-board-column">{left.map(p=><WorldSeat key={p} g={g} w={w} p={p}/>)}</div>
   <div className="world-board-column">{right.map(p=><WorldSeat key={p} g={g} w={w} p={p}/>)}</div>
  </div>
  <div className="world-board-self"><WorldSeat g={g} w={w} p="self"/></div>
  <p className="world-clockwise-hint">時計回り: 自分 → 左側を上へ → 右側を下へ → 自分</p>
 </div>;
}
type Query={result:SearchResult|null;status:string;progress:{checked:number;unique:number};error:string;meta:boolean;rerun:(deep?:boolean)=>void;setMeta:(v:boolean)=>void};
export type AnalysisTab='overview'|'info'|'worlds'|'history'|'advice';
type Props={g:GameSnapshot;e:EvidenceAnalysis;query:Query;player:string|null;initialTab?:AnalysisTab;onClose:()=>void;onCompleteness:(n:number,kind:'night'|'day',value:boolean)=>void;onDelete:(key:LogKey,id:number)=>void;onLeviathanConfirmed:(enabled:boolean)=>void;onAlHadikhiaConfirmed:(enabled:boolean)=>void;onRiotConfirmed:(enabled:boolean)=>void;onFearmongerActive:(enabled:boolean)=>void;onBoomdandyRecord:(event:BoomdandyEvent)=>void;onBoomdandyDelete:(id:number)=>void;onJinxVictoryRecord:(e:JinxVictoryEvent)=>void;onJinxVictoryDelete:(id:number)=>void;
  onOutsiderEvent:(event:OutsiderEvent)=>void;
  onRemoveOutsiderEvent:(id:number)=>void;
  onWidowReport:(report:WidowReport)=>void;
  onEvilBehaviorReport:(report:EvilBehaviorReport)=>void;
  onPsychopathEvent:(event:PsychopathPublicEvent)=>void;
  onOrganGrinderVote:(event:OrganGrinderVoteEvent)=>void;
  onRemoveExperimental:(kind:'widow'|'mezepheles'|'psychopath'|'organ_grinder',id:number)=>void;
};
export function AnalysisPanel({g,e,query:q,player,initialTab='overview',onClose,onCompleteness,onDelete,onLeviathanConfirmed,onAlHadikhiaConfirmed,onRiotConfirmed,onFearmongerActive,onBoomdandyRecord,onBoomdandyDelete,onJinxVictoryRecord,onJinxVictoryDelete,onWidowReport,onEvilBehaviorReport,onPsychopathEvent,onOrganGrinderVote,onRemoveExperimental,onOutsiderEvent,onRemoveOutsiderEvent}:Props){
 const [tab,setTab]=useState<AnalysisTab>(initialTab);
 useEffect(()=>setTab(initialTab),[initialTab]);
 const [n,setN]=useState(g.night);const r=q.result,p=player;
 const obs=observations(g).filter(o=>!p||o.source===p);const ev=p?e.players[p]:null;
 const titles={overview:L.analysis,info:L.info,worlds:L.worlds,history:L.history,advice:L.advice};
 const [detail,setDetail]=useState<number|null>(null);
 const [boomDay,setBoomDay]=useState(1);
 const [boomExecuted,setBoomExecuted]=useState<string|null>(null);
 const [boomSurvivors,setBoomSurvivors]=useState<string[]>([]);
 const [boomPointed,setBoomPointed]=useState<string|null>(null);
 const [boomTie,setBoomTie]=useState(true);
 const [experimentalDay,setExperimentalDay]=useState(g.night);
 const [widowWho,setWidowWho]=useState<string>('');
 const [behaviorWho,setBehaviorWho]=useState<string>('');
 const [behaviorNote,setBehaviorNote]=useState('');
 const [psychopathWho,setPsychopathWho]=useState<string>('');
 const [psychopathVictim,setPsychopathVictim]=useState<string>('');
 const [psychopathKilled,setPsychopathKilled]=useState(true);
 const [jinxDay,setJinxDay]=useState(g.night);
 const [jinxPair,setJinxPair]=useState<JinxVictoryPair|null>(null);
 const [jinxActor,setJinxActor]=useState('');
 const [jinxTarget,setJinxTarget]=useState('');
 const [jinxAllLive,setJinxAllLive]=useState(true);
 const availableVictoryJinxes=scriptJinxes(getSnapshotScriptRoleIds(g))
   .filter(j=>(JINX_VICTORY_RECORDED_PAIRS as readonly string[]).includes(j.id));
 const jinxActorRequired=!!jinxPair && jinxPair!=='al_hadikhia:mastermind' && !jinxPair.includes('grandmother');
 const jinxTargetRequired=!!jinxPair && jinxPair!=='al_hadikhia:mastermind' && jinxPair!=='mayor:riot';

 const boomCandidates=seats(g.playerCount).filter(p=>isAliveAt(g,p,`D${boomDay}`));
 const events=LOG_KEYS.flatMap(key=>(g[key]??[]).map(ev=>({key,event:ev}))).sort((a,b)=>compareEvents(b.event,a.event));
 return <Sheet title={p?`${person(g,p)} / ${L.analysis}`:L.analysis} onClose={onClose}>
  <p className="sample-caution">{L.sampleCaution}</p>
  <p className="panel-note">悪陣営は現在の陣営、手下・デーモンは生死を問わない現在の役職の割合です。初期配役は開始時にその役職がいた割合です。</p>
  <div className="analysis-tabs">{(Object.keys(titles)as(keyof typeof titles)[]).map(t=><button key={t} className={tab===t?'selected':''} onClick={()=>setTab(t)}>{titles[t]}</button>)}</div>
  {q.status==='running'&&<p role="status" className="panel-note">{L.searching} {q.progress.checked} {'\u691c\u8a0e'} / {q.progress.unique} {'\u5019\u88dc'}</p>}
  {q.error&&<p role="alert" className="error-banner">探索中にエラーが発生しました。もう一度実行してください。</p>}
  {r&&r.unique===0&&<p className="error-banner">{L.noWorlds}</p>}
  {r&&r.unique>0&&(r.unique<80||r.effectiveWorlds<20)&&<p className="panel-note">{L.weakSample}</p>}
  {tab==='overview'&&<>
   {r&&<p className="metric-line">{r.unique} {'\u914d\u5f79\u5019\u88dc'} / {r.checked} {'\u691c\u8a0e'} / {(r.elapsedMs/1000).toFixed(1)}s</p>}
   <div className="compact-row"><button className="menu-option" onClick={()=>q.rerun(false)}>{L.explore}</button><button className="menu-option" onClick={()=>q.rerun(true)}>{L.deep}</button></div>
   <label className="check-label"><input type="checkbox" checked={q.meta} onChange={a=>q.setMeta(a.target.checked)}/>{L.meta}</label>
   {!p && <JinxList roleIds={getSnapshotScriptRoleIds(g)}/>}
   {!p && <OutsiderAnalysis g={g} result={r} onRecord={onOutsiderEvent} onRemove={onRemoveOutsiderEvent}/>}
   {!p && availableVictoryJinxes.length>0 && <section className="analysis-card">
     <h3>{'\u7279\u6b8a\u52dd\u5229\u306e\u78ba\u8a8d\u8a18\u9332'}</h3>
     <p className="panel-note">{'\u5b9f\u969b\u306b\u767a\u751f\u3057\u3001\u8a9e\u308a\u624b\u304b\u3089\u78ba\u8a8d\u3055\u308c\u305f\u52dd\u5229\u6761\u4ef6\u3060\u3051\u8a18\u9332\u3057\u3066\u304f\u3060\u3055\u3044\u3002\u30b9\u30af\u30ea\u30d7\u30c8\u306b\u3042\u308b\u3060\u3051\u3067\u306f\u767a\u52d5\u3057\u307e\u305b\u3093\u3002'}</p>
     <label>{'\u767a\u751f\u3057\u305f\u65e5'}</label>
     <select value={jinxDay} onChange={e=>setJinxDay(Number(e.target.value))}>
       {Array.from({length:g.night},(_,i)=>i+1).map(d=><option key={d} value={d}>D{d}</option>)}
     </select>
     <label>{'\u30b8\u30f3\u30af\u30b9'}</label>
     <select value={jinxPair??''} onChange={e=>setJinxPair((e.target.value||null) as JinxVictoryPair|null)}>
       <option value="">{'\u7d44\u307f\u5408\u308f\u305b\u3092\u9078\u629e'}</option>
       {availableVictoryJinxes.map(j=><option value={j.id} key={j.id}>{jinxLabel(j)}</option>)}
     </select>
     {jinxActorRequired && <><label>{jinxPair==='mayor:riot'?'\u7d42\u4e86\u3092\u9078\u3093\u3060\u5e02\u9577':'\u6307\u540d\u3057\u305f\u30c7\u30fc\u30e2\u30f3'}</label>
       <select value={jinxActor} onChange={e=>setJinxActor(e.target.value)}><option value="">{'\u9078\u629e'}</option>{seats(g.playerCount).map(p=><option key={p} value={p}>{person(g,p)}</option>)}</select></>}
     {jinxTargetRequired && <><label>{jinxPair?.includes('grandmother')?'\u51e6\u5211\u3055\u308c\u305f\u5b6b':'\u51e6\u5211\u3055\u308c\u305f\u5bfe\u8c61'}</label>
       <select value={jinxTarget} onChange={e=>setJinxTarget(e.target.value)}><option value="">{'\u9078\u629e'}</option>{seats(g.playerCount).map(p=><option key={p} value={p}>{person(g,p)}</option>)}</select></>}
     {jinxPair==='al_hadikhia:mastermind' && <label className="check-label"><input type="checkbox" checked={jinxAllLive} onChange={e=>setJinxAllLive(e.target.checked)}/>{'\u9078\u3070\u308c\u305f\u5584\u306e3\u4eba\u5168\u54e1\u304c\u300c\u751f\u304d\u308b\u300d\u3092\u9078\u3093\u3060'}</label>}
     <button className="menu-option" disabled={!jinxPair || (jinxActorRequired&&!jinxActor) || (jinxTargetRequired&&!jinxTarget) || (jinxActorRequired&&jinxTargetRequired&&jinxActor===jinxTarget)}
       onClick={()=>{if(!jinxPair)return;onJinxVictoryRecord({id:eventId(),when:`D${jinxDay}`,pair:jinxPair,
         ...(jinxActorRequired?{actor:jinxActor}:{}),...(jinxTargetRequired?{target:jinxTarget}:{}),
         ...(jinxPair==='al_hadikhia:mastermind'?{allLive:jinxAllLive}:{})});}}>
       {'\u78ba\u8a8d\u3057\u305f\u7d42\u4e86\u6761\u4ef6\u3092\u8a18\u9332'}
     </button>
     {(g.jinxVictoryLog??[]).map(e=><p key={e.id}>{e.when} / {e.pair.split(':').map(k=>ROLES[k as RoleId]?.name??k).join(' × ')}
       <button className="mini-danger-button" onClick={()=>onJinxVictoryDelete(e.id)}>{'\u524a\u9664'}</button></p>)}
     <p className="panel-note">{'\u5e02\u9577\u30fb\u30ea\u30f4\u30a1\u30a4\u30a2\u30b5\u30f3\u306e5\u65e5\u76ee\u306e\u52dd\u5229\u3068\u3001\u30c7\u30fc\u30e2\u30f3\u306b\u51e6\u5211\u3055\u308c\u308b\u5175\u58eb\u306f\u65e2\u5b58\u306e\u8a18\u9332\u304b\u3089\u81ea\u52d5\u5224\u5b9a\u3057\u307e\u3059\u3002'}</p>
   </section>}
   {getSnapshotScriptRoleIds(g).some(r=>['widow','mezepheles','psychopath','organ_grinder','summoner','xaan','wizard','wraith'].includes(r)) && <section className="analysis-card">
    <h3>実験的手下の手掛かり</h3>
    <label>記録する日</label>
    <select value={experimentalDay} onChange={e=>setExperimentalDay(Number(e.target.value))}>{Array.from({length:g.night},(_,i)=>i+1).map(d=><option key={d} value={d}>D{d}</option>)}</select>
    {getSnapshotScriptRoleIds(g).includes('widow')&&<div className="form-section">
     <h4>ウィドウの通知</h4>
     <p className="panel-note">誰かが「ウィドウがいると知らされた」と話した記録です。伝聞や嘘の可能性があるので強制確定しません。</p>
     <select value={widowWho} onChange={e=>setWidowWho(e.target.value)}><option value="">発言者を選択</option>{seats(g.playerCount).map(p=><option key={p} value={p}>{person(g,p)}</option>)}</select>
     <button className="menu-option" disabled={!widowWho} onClick={()=>{if(widowWho)onWidowReport({id:eventId(),when:`D${experimentalDay}`,playerId:widowWho});}}>通知の主張を記録</button>
     {(g.widowReports??[]).map(e=><p key={e.id}>{e.when}：{person(g,e.playerId)} <button className="mini-danger-button" onClick={()=>onRemoveExperimental('widow',e.id)}>削除</button></p>)}
    </div>}
    {getSnapshotScriptRoleIds(g).includes('mezepheles')&&<div className="form-section">
     <h4>メゼフェレス：善から悪への言動変化</h4>
     <p className="panel-note">行動の変化は陣営が変わった証明ではありません。変化した人への疑念とメゼフェレス想定に弱く加点します。</p>
     <select value={behaviorWho} onChange={e=>setBehaviorWho(e.target.value)}><option value="">対象の人を選択</option>{seats(g.playerCount).map(p=><option key={p} value={p}>{person(g,p)}</option>)}</select>
     <textarea rows={2} value={behaviorNote} onChange={e=>setBehaviorNote(e.target.value)} placeholder="変化の内容（任意）" />
     <button className="menu-option" disabled={!behaviorWho} onClick={()=>{if(behaviorWho)onEvilBehaviorReport({id:eventId(),when:`D${experimentalDay}`,playerId:behaviorWho,note:behaviorNote.trim()});}}>言動の変化を記録</button>
     {(g.evilBehaviorReports??[]).map(e=><p key={e.id}>{e.when}：{person(g,e.playerId)} {e.note} <button className="mini-danger-button" onClick={()=>onRemoveExperimental('mezepheles',e.id)}>削除</button></p>)}
    </div>}
    {getSnapshotScriptRoleIds(g).includes('organ_grinder')&&<div className="form-section">
     <h4>オルガングラインダー：投票方法</h4>
     <p className="panel-note">目を閉じた投票では誰が投票したか・正確な票数は不明です。先に投票モードを保存すると、その日の通常の指名記録は投票者不明として保存されます。</p>
     <select value={(g.organGrinderVotes??[]).find(e=>e.when===`D${experimentalDay}`)?.hidden===true?'hidden':(g.organGrinderVotes??[]).some(e=>e.when===`D${experimentalDay}`)?'open':''} onChange={e=>{if(e.target.value)onOrganGrinderVote({id:eventId(),when:`D${experimentalDay}`,hidden:e.target.value==='hidden'});}}><option value="">未記録</option><option value="hidden">目を閉じた秘密投票</option><option value="open">通常の公開投票</option></select>
     {(g.organGrinderVotes??[]).map(e=><p key={e.id}>{e.when}：{e.hidden?'秘密投票':'公開投票'} <button className="mini-danger-button" onClick={()=>onRemoveExperimental('organ_grinder',e.id)}>削除</button></p>)}
    </div>}
    {getSnapshotScriptRoleIds(g).includes('psychopath')&&<div className="form-section">
     <h4>サイコパス：指名前の公開殺害</h4>
     <p className="panel-note">確認済みの公開能力だけ記録してください。殺害に成功した場合、専用の死亡理由で死亡履歴も自動登録します。初日に名乗らない人もサイコパス候補から除外はしません。</p>
     <label>殺害を宣言した人</label><select value={psychopathWho} onChange={e=>setPsychopathWho(e.target.value)}><option value="">選択</option>{seats(g.playerCount).map(p=><option key={p} value={p}>{person(g,p)}</option>)}</select>
     <label>対象</label><select value={psychopathVictim} onChange={e=>setPsychopathVictim(e.target.value)}><option value="">選択</option>{seats(g.playerCount).filter(p=>p!==psychopathWho).map(p=><option key={p} value={p}>{person(g,p)}</option>)}</select>
     <label className="check-label"><input type="checkbox" checked={psychopathKilled} onChange={e=>setPsychopathKilled(e.target.checked)}/>対象が死亡した</label>
     <button className="menu-option" disabled={!psychopathWho||!psychopathVictim||psychopathWho===psychopathVictim} onClick={()=>{if(psychopathWho&&psychopathVictim)onPsychopathEvent({id:eventId(),when:`D${experimentalDay}`,playerId:psychopathWho,target:psychopathVictim,killed:psychopathKilled});}}>公開殺害を記録</button>
     {(g.psychopathEvents??[]).map(e=><p key={e.id}>{e.when}：{person(g,e.playerId)} → {person(g,e.target)}（{e.killed?'死亡':'生存'}） <button className="mini-danger-button" onClick={()=>onRemoveExperimental('psychopath',e.id)}>関連記録を削除</button></p>)}
    </div>}
    {getSnapshotScriptRoleIds(g).includes('summoner')&&<p className="panel-note">召喚者：最初の2夜はデーモンが存在しません。3夜目に新しい悪デーモンが誕生する盤面を別探索します。殺害がない夜だけで確定はしません。</p>}
    {getSnapshotScriptRoleIds(g).includes('xaan')&&<p className="panel-note">ザーン：初期アウトサイダー人数が X 人なら N{''}X から D{''}X の終了まで、町人全員が毒になります。複数の情報がその夜だけ矛盾したら、毒による説明が可能な盤面を優先します。X=0 のときは発動しません。</p>}
    {getSnapshotScriptRoleIds(g).includes('wizard')&&<p className="panel-note">ウィザードの願いの効果はストーリーテラー次第です。内容と代償は本人の手下モードで記録し、未確認の願いをハードな制約には使いません。</p>}
    {getSnapshotScriptRoleIds(g).includes('wraith')&&<p className="panel-note">レイスは夜に目を開けて他の悪が起きる様子を観察できます。記録された役職の狙い撃ちなどは参考にとどめ、レイスの存在を証明しません。</p>}
    {(()=>{const s=minionPatternSignals(g);return <p className="panel-note">現在の弱い兆候：ウィドウ通知 {s.reportedWidow} 件 / 言動の変化 {s.changedBehavior} 件 / 秘密投票 {s.hiddenVotingDays} 日 / 公開殺害 {s.revealedPsychopath} 件</p>;})()}
   </section>}
   {getSnapshotScriptRoleIds(g).includes('fearmonger') && <section className="analysis-card">
    <h3>フィアモンガー警戒</h3>
    <label className="check-label"><input type="checkbox" checked={g.fearmongerActive===true} onChange={e=>onFearmongerActive(e.target.checked)}/>フィアモンガーの能力を警戒する</label>
    <p className="panel-note">オンの間は通常の処刑支持を抑え、ゴブリンの危険も併せて確認します。標的が誰かの証明ではなく、行動上の注意としてのみ扱います。</p>
   </section>}
   {getSnapshotScriptRoleIds(g).includes('boomdandy') && <section className="analysis-card">
    <h3>ブームダンディ処刑後の爆発</h3>
    <p className="panel-note">最初に通常の指名・処刑を記録してください。処刑で能力が発動した場合、語り手が残した3人と、10→1の指差しの結果を登録できます。死亡記録は自動追加し、まとめて取り消せます。</p>
    <label>処刑された人</label>
    <select value={boomExecuted??''} onChange={e=>setBoomExecuted(e.target.value||null)}><option value="">選択</option>{seats(g.playerCount).map(p=><option key={p} value={p}>{person(g,p)}</option>)}</select>
    <label>日付</label>
    <select value={boomDay} onChange={e=>setBoomDay(Number(e.target.value))}>{Array.from({length:g.night},(_,i)=>i+1).map(d=><option key={d} value={d}>D{d}</option>)}</select>
    <p>爆発直後に生き残った3人（{boomSurvivors.length}/3）</p>
    <div className="player-toggle-grid">{boomCandidates.map(p=><button type="button" key={p} className={boomSurvivors.includes(p)?'player-toggle selected':'player-toggle'} onClick={()=>{setBoomSurvivors(old=>old.includes(p)?old.filter(x=>x!==p):old.length<3?[...old,p]:old);if(boomPointed===p)setBoomPointed(null);}}>{person(g,p)}</button>)}</div>
    <label className="check-label"><input type="checkbox" checked={boomTie} onChange={e=>{setBoomTie(e.target.checked);setBoomPointed(null);}}/>指差しは同数（追加死亡なし）</label>
    {!boomTie&&<><label>最も指差された人</label><select value={boomPointed??''} onChange={e=>setBoomPointed(e.target.value||null)}><option value="">選択</option>{boomSurvivors.map(p=><option key={p} value={p}>{person(g,p)}</option>)}</select></>}
    <button className="menu-option" type="button" disabled={!boomExecuted||boomSurvivors.length!==3||(!boomTie&&!boomPointed)} onClick={()=>{if(boomExecuted)onBoomdandyRecord({id:Date.now()*16,when:`D${boomDay}`,executedPlayer:boomExecuted,survivors:boomSurvivors,pointedPlayer:boomTie?null:boomPointed,tied:boomTie});}}>爆発の結果を記録</button>
    {(g.boomdandyLog??[]).map(ev=><div className="demon-action-row" key={ev.id}><strong>{ev.when}：{person(g,ev.executedPlayer)}</strong><p>爆発後：{ev.survivors.map(p=>person(g,p)).join(' / ')}　指差し：{ev.tied?'同数':ev.pointedPlayer?person(g,ev.pointedPlayer):'不明'}</p><button type="button" className="mini-danger-button" onClick={()=>onBoomdandyDelete(ev.id)}>一括削除</button></div>)}
   </section>}
   {getSnapshotScriptRoleIds(g).includes('leviathan') && <section className="analysis-card">
    <h3>リヴァイアサン確認</h3>
    <label className="check-label"><input type="checkbox" checked={g.leviathanConfirmed===true || g.selfRole.shownRole==='leviathan'} disabled={g.selfRole.shownRole==='leviathan'} onChange={event=>onLeviathanConfirmed(event.target.checked)}/>リヴァイアサンがゲーム開始時に公式に宣言された</label>
    <p className="panel-note">宣言がない場合、リヴァイアサンの候補確率は0%に固定します。普通の夜死亡・噂だけで自動的に有効になりません。</p>
   </section>}
   {getSnapshotScriptRoleIds(g).includes('al_hadikhia') && <section className="analysis-card">
    <h3>アルハディキアゲーム</h3>
    <label className="check-label"><input type="checkbox" checked={g.alHadikhiaConfirmed===true || g.selfRole.shownRole==='al_hadikhia'} disabled={g.selfRole.shownRole==='al_hadikhia'} onChange={e=>onAlHadikhiaConfirmed(e.target.checked)}/>アルハディキアゲームと公式に判明した</label>
    <p className="panel-note">公開で3人が選ばれ、選択・復活の処理がある特殊デーモンです。宣言・明確な確認がない限り通常盤面の推理に混ぜません。</p>
   </section>}
   {getSnapshotScriptRoleIds(g).includes('riot') && <section className="analysis-card">
    <h3>ライオットゲーム</h3>
    <label className="check-label"><input type="checkbox" checked={g.riotConfirmed===true || g.selfRole.shownRole==='riot'} disabled={g.selfRole.shownRole==='riot'} onChange={e=>onRiotConfirmed(e.target.checked)}/>ライオットゲームと公式に判明した</label>
    <p className="panel-note">3日目に手下がライオットへ変わり、指名された相手が死亡し、その相手が連続で指名します。3日目以降に確認されている場合、推理を自動で開き、専用の陣営対比を表示します。</p>
   </section>}
   {p&&ev?<>
    <div className="metrics-grid"><span>悪陣営<strong>{pct(r?.unique?r.players[p]?.evil:undefined)}</strong></span><span>手下<strong>{pct(r?.unique?r.players[p]?.minion:undefined)}</strong></span><span>デーモン<strong>{pct(r?.unique?r.players[p]?.demon:undefined)}</strong></span><span>酔い<strong>{pct(r?.unique?r.players[p]?.drunk:undefined)}</strong></span></div>
    <p className="metric-line">{L.goodPoints}: {ev.good.toFixed(1)} / {L.evilPoints}: {ev.evil.toFixed(1)}</p><p className="panel-note">{L.countsHelp}</p>
    {ev.warnings.map((w,i)=><section className={`analysis-card border-${w.color}`} key={i}><h3>{warningLabel[w.color]} {w.cycle?`N${w.cycle}`:''}</h3><ReasonList reasons={w.reasons} g={g}/></section>)}
    <h3>{L.reasons}</h3><ReasonList reasons={ev.reasons} g={g}/>
    {r?.examples[p]&&(['good','evil'] as const).map(alignment=>{const w=r.examples[p][alignment];return <details className="analysis-card" key={alignment}><summary>{L[alignment]}{'\u3068\u3057\u3066\u306e\u8aac\u660e\u4f8b'}</summary>{w?<><p>{person(g,p)}: {ROLES[w.current[p]].symbol} / {L[w.currentAlignment[p]]}</p><ul className="reason-list">{worldReasons(w,g).map((text,i)=><li key={i}>{text}</li>)}</ul></>:<p className="panel-note">{'\u3053\u306e\u63a2\u7d22\u3067\u306f\u4f8b\u3092\u898b\u3064\u3051\u3089\u308c\u307e\u305b\u3093\u3067\u3057\u305f\u3002\u5168\u5019\u88dc\u306b\u3064\u3044\u3066\u306e\u4e0d\u53ef\u80fd\u8a3c\u660e\u3067\u306f\u3042\u308a\u307e\u305b\u3093\u3002'}</p>}</details>;})}
    {r&&r.unique>0&&<section className="analysis-card"><h3>現在の役職 / {L.sampleLabel}</h3><div className="role-shares">{Object.entries(r.players[p]?.roles??{}).sort((a,b)=>(b[1]??0)-(a[1]??0)).slice(0,8).map(([role,x])=><span key={role}>{ROLES[role as RoleId].symbol} {pct(x)}</span>)}</div></section>}
   </>:<>
    <section className="analysis-card"><h3>{'\u914d\u5f79'}</h3><p>{Object.entries(setupCounts(g.playerCount)).map(([_t,num],i)=>`${L.nominalTypes[i]} ${num}`).join(' / ')}</p><p className="panel-note">{'\u7235\u304c\u3044\u308b\u914d\u5f79\u306f\u753a\u4eba\u3092\u4e8c\u4eba\u6e1b\u3089\u3057\u3001\u30a2\u30a6\u30c8\u30b5\u30a4\u30c0\u30fc\u3092\u4e8c\u4eba\u5897\u3084\u3057\u307e\u3059\u3002'}</p></section>
    {getSnapshotScriptRoleIds(g).filter(role=>ROLES[role].type==='minion'||ROLES[role].type==='demon'||role==='drunk').map(role=><section className="analysis-card" key={role}><h3>{ROLES[role].symbol} {ROLES[role].name} <span className="metric-inline">初期配役: {pct(r?.unique?(r.presence[role]??0):undefined)}</span></h3><p className="panel-note">{'\u50be\u5411\u70b9'}: {(e.global[role]?.points??0).toFixed(1)}</p><ReasonList reasons={e.global[role]?.reasons??[]} g={g}/></section>)}
    {getSnapshotScriptRoleIds(g).some(id=>['lord_of_typhon','kazali','legion','lil_monsta','lleech','ojo','yaggababble'].includes(id)) && <section className="analysis-card">
     <h3>特殊デーモンの傾向（弱い手掛かり）</h3>
     {(()=>{const s=demonPatternSignals(g);return <>
      <p>手下の役職主張者: {s.minionClaims}人 / 通常の手下人数: {s.standardMinions}人</p>
      {s.excessMinions>0&&<p>通常を超える手下の主張 {s.excessMinions}人：タイフォン卿・リルモンスターの相対評価に加点。ただし偽主張の可能性もあります。</p>}
      {s.changingPings>0&&<p>同じ占い対象のデーモン判定が変化：{s.changingPings}件。リルモンスターが毎夜移動した可能性。ただし毒・嘘・能力変化でも起こります。</p>}
      {s.earlyContinuousDeaths>0&&<p>序盤に継続情報役の未公開情報保持者が死亡：{s.earlyContinuousDeaths}件。密（スパイ）とオジョの狙い撃ちを両方検討します。</p>}
      {s.survivedExecutions>0&&<p>処刑されたのに死亡しなかった記録：{s.survivedExecutions}件。蛭（リーチ）・防御・毒などを確認します。単独では確定しません。</p>}
      {getSnapshotScriptRoleIds(g).includes('yaggababble')&&s.unusualKills>0&&<p>一晩に複数のデーモンらしい死亡：{s.unusualKills}夜。ヤガバブルの弱い兆候です。台詞や発動回数はアプリで記録しません。</p>}
      {s.sparseInfo&&<p>公表される能力情報が少なめ：レギオンの弱い状況証拠として参考にします。</p>}
      {s.suspiciousZeroVotes>0&&<p>記録された挙手人数と0票の食い違い: {s.suspiciousZeroVotes}件。入力ミス・投票の特殊効果も確認してください。</p>}
      <p className="panel-note">陣営・役職の主張や投票の癖は確定情報ではありません。相対的な探索重みにのみ反映します。</p>
     </>;})()}
    </section>}
    {getSnapshotScriptRoleIds(g).includes('legion') && r?.legionConditionalSeats && <section className="analysis-card">
     <h3>レギオン想定：疑う相手</h3>
     <p className="panel-note">レギオンの盤面だけを条件とした暫定候補。普通の悪陣営の確率とは別です。票や発言の傾向は補助資料で、証拠ではありません。</p>
     <ul className="reason-list">{Object.entries(r.legionConditionalSeats).filter(([seat])=>seat!=='self').sort((a,b)=>b[1]-a[1]).slice(0,10).map(([seat,prob])=><li key={seat}><strong>{person(g,seat)}：{pct(prob)}</strong> {legionAccusationNotes(g,seat).join(' / ')||'特別な行動記録なし'}</li>)}</ul>
    </section>}
   </>}
   {getSnapshotScriptRoleIds(g).includes('lleech') && r?.lleechHostConditionalSeats && <section className="analysis-card">
    <h3>蛭（リーチ）想定：毒の宿主候補</h3>
    <p className="panel-note">リーチの盤面だけを条件とした「最初の夜から毒を受け続ける宿主」の割合です。リーチ本人が処刑を耐えたなら宿主の特定が特に重要です。防御能力や毒による不死失効もあるため、候補を確定とは扱いません。</p>
    <ul className="reason-list">{Object.entries(r.lleechHostConditionalSeats).filter(([seat])=>seat!=='self').sort((a,b)=>b[1]-a[1]).slice(0,10).map(([seat,prob])=><li key={seat}><strong>{person(g,seat)}：{pct(prob)}</strong> / 宿主としての毒持続候補</li>)}</ul>
   </section>}
   {(g.riotConfirmed || g.selfRole.shownRole==='riot') && g.night>=3 && <section className="analysis-card">
     <h3>ライオット3日目：悪陣営と善陣営を強調表示</h3>
     <p className="panel-note">ライオット盤面内の陣営比率だけを使い、表示上の差を約2.5乗で強調しています。数値は「勝率」や確定確率ではありません。普通の探索の悪確率と混ぜません。</p>
     {r?.riotConditionalSeats ? <ul className="reason-list">{Object.entries(r.riotConditionalSeats).sort((a,b)=>b[1]-a[1]).map(([seat,value])=><li key={seat}><strong>{person(g,seat)}</strong>：悪 {pct(riotContrast(value))} / 善 {pct(1-riotContrast(value))} <small>素のライオット条件付き：悪 {pct(value)}</small></li>)}</ul> : <p className="panel-note">現在の探索ではライオット盤面が見つかっていません。記録を確認し、再探索してください。</p>}
     <p className="panel-note">指名連鎖は実際の指名・死亡記録で判断します。記録不足だけで善を悪へ決め打ちしません。</p>
   </section>}
   {e.issues.length>0&&<section className="analysis-card border-orange"><h3>{'\u5165\u529b\u78ba\u8a8d'}</h3><ReasonList reasons={e.issues} g={g}/></section>}
   <section className="analysis-card"><h3>{'\u65e5\u3068\u591c\u306e\u8a18\u9332\u78ba\u8a8d'}</h3><select aria-label={'\u56de'} value={n} onChange={a=>setN(Number(a.target.value))}>{Array.from({length:g.night},(_,i)=>i+1).map(k=><option key={k} value={k}>N{k} / D{k}</option>)}</select><label className="check-label"><input type="checkbox" checked={g.completedNights.includes(n)} onChange={a=>onCompleteness(n,'night',a.target.checked)}/>{L.completeNight}</label><label className="check-label"><input type="checkbox" checked={g.noExecutionDays.includes(n)} onChange={a=>onCompleteness(n,'day',a.target.checked)}/>{L.noExecution}</label><p className="panel-note">{L.completenessHelp}</p></section>
  </>}
  {tab==='info'&&<>{obs.length===0&&<p>{L.none}</p>}{obs.map(o=>{const s=r?.info[o.id];return <section className="analysis-card" key={o.id}><h3>{o.when} / {person(g,o.source)} / {ROLES[o.role].symbol}</h3><p>{o.direct?L.directObserved:L.reported}</p><p>{formatInfo(o.data,g)}</p>{s&&<div className="role-shares">{Object.entries(s).filter(([,x])=>x>.005).map(([key,x])=><span key={key}>{DISPOSITION_LABELS[key as keyof typeof DISPOSITION_LABELS]} {pct(x)}</span>)}</div>}<button className="menu-option" onClick={()=>setDetail(detail===o.id?null:o.id)}>{L.reasons}</button>{detail===o.id&&<><p className="panel-note">{'\u91cd\u8907\u3057\u305f\u4f1d\u805e\u306f\u72ec\u7acb\u3057\u305f\u78ba\u8a8d\u3068\u3057\u3066\u52a0\u7b97\u3057\u307e\u305b\u3093\u3002\u6bd2\u3084\u9152\u306e\u7d50\u679c\u3082\u3001\u5076\u7136\u6b63\u3057\u3044\u3053\u3068\u304c\u3042\u308a\u307e\u3059\u3002'}</p><ReasonList reasons={e.players[o.source]?.reasons.filter(x=>x.evidence.some(id=>o.aliases.includes(id)))??[]} g={g}/></>}</section>;})}</>}
  {tab==='worlds'&&<><div className="compact-row"><button className="menu-option" onClick={()=>q.rerun(false)}>{L.explore}</button><button className="menu-option" onClick={()=>q.rerun(true)}>{L.deep}</button></div>{r&&<p className="metric-line">{r.unique} {'候補'} / {r.checked} {'検討'} / {'有効候補'} {r.effectiveWorlds.toFixed(1)}</p>}<p className="panel-note">{'\u30b9\u30b3\u30a2\u4e0a\u4f4d\u306e\u4ee3\u8868\u4eee\u8aac\u3067\u3059\u3002\u63a2\u7d22\u6f0f\u308c\u306e\u5019\u88dc\u3082\u3042\u308a\u5f97\u307e\u3059\u3002'}</p>{r?.worlds.slice(0,12).map((w,i)=><details className="analysis-card" key={i} open={i===0}><summary>{'\u4eee\u8aac'} {i+1} / {L.demon}: {w.alive.filter(x=>ROLES[w.current[x]].type==='demon').map(x=>person(g,x)).join(' / ')||L.none}</summary><WorldBoard g={g} w={w}/><h4>{L.requires}</h4><ul className="reason-list">{worldReasons(w,g).map((s,j)=><li key={j}>{s}</li>)}</ul></details>)}</>}
  {tab==='advice'&&<AdvicePanel g={g} r={r}/>}
  {tab==='history'&&<>{events.length===0&&<p>{L.none}</p>}<p className="panel-note">{'\u8aa4\u5165\u529b\u306f\u524a\u9664\u3057\u3001\u6b63\u3057\u3044\u5185\u5bb9\u3092\u518d\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002\u9023\u52d5\u3059\u308b\u767a\u52d5\u3068\u6b7b\u4ea1\u306f\u4e00\u7dd2\u306b\u524a\u9664\u3055\u308c\u307e\u3059\u3002'}</p>{events.slice(0,250).map(({key,event})=><section key={`${key}-${event.id}`} className="analysis-card"><h3>{event.when} / {logLabel[key]}</h3><p>{formatEvent(key,event,g)}</p><small>#{String(event.id).slice(-6)}</small><button className="menu-option danger-button" onClick={()=>{if(window.confirm(L.deleteConfirm))onDelete(key,event.id);}}>{L.remove}</button></section>)}</>}
 </Sheet>;
}
const logLabel:Record<LogKey,string>={roleClaimLog:'役職主張',abilityClaimLog:'情報記録',deathLog:'死亡',revivalLog:'復活',nominationLog:'指名',abilityTriggerLog:'発動',talkLog:'会話',selfInfoLog:'自分の情報',selfActionLog:'自分の行動',demonActionLog:'デーモン襲撃',minionActionLog:'手下の行動'};
function formatInfo(d:import('../types').StructuredInfo,g:GameSnapshot):string{
 switch(d.kind){
  case'grandmotherRead':return `${person(g,d.player)} → ${ROLES[d.shownRole].symbol} ${ROLES[d.shownRole].name}（善）`;
  case'chambermaidRead':return `${d.players.map(x=>person(g,x)).join(' / ')} → 夜起床${d.number}人`;
  case'godfatherOutsiders':return `ゲーム内のよそ者: ${d.roles.map(r=>ROLES[r].symbol+ROLES[r].name).join('・')||'なし'}`;
  case'pairRole':return `${d.players.map(x=>person(g,x)).join(' / ')} → ${ROLES[d.shownRole].symbol}`;
  case'noOutsiders':return L.noOutsiders;
  case'number':return String(d.value);
  case'pairYesNo':return `${d.players.map(x=>person(g,x)).join(' / ')} → ${d.result==='yes'?L.yes:L.no}`;
  case'singleYesNo':return d.result==='yes'?L.yes:L.no;
  case'dreamer':return `${person(g,d.player)} → ${d.shownRoles.map(r=>`${ROLES[r].symbol} ${ROLES[r].name}`).join(' / ')}`;
  case'pairAlignment':return `${d.players.map(x=>person(g,x)).join(' / ')} → ${d.result==='same'?'同陣営':'別陣営'}`;
  case'savantPair':return d.statements.map(st=>st.kind==='roleInPlay'
    ? `${ROLES[st.roleId].symbol} ${ROLES[st.roleId].name} がゲーム内にいる`
    : `${st.players.map(x=>person(g,x)).join('・')} の中に ${ROLES[st.roleId].symbol} ${ROLES[st.roleId].name} がいる`).join(' / ');
  case'artistAnswer':return `「${d.question}」 → ${d.result==='yes'?'はい':d.result==='no'?'いいえ':'不明'}`;
  case'juggler':return `${d.guessDay}: ${d.guesses.map(x=>`${person(g,x.player)}=${ROLES[x.roleId].symbol}`).join(' / ')} → ${d.number}正解`;
  case'sage':return `デーモン候補: ${d.players.map(x=>person(g,x)).join(' / ')}`;
  case'knight':return `デーモンではない2人: ${d.players.map(x=>person(g,x)).join(' / ')}`;
  case'noble':return `1人が悪陣営: ${d.players.map(x=>person(g,x)).join(' / ')}`;
  case'singlePlayer':return person(g,d.player);
  case'singleRole':return `${ROLES[d.shownRole].symbol} ${ROLES[d.shownRole].name}`;
  case'storytellerAdvice':return d.advice;
  case'storytellerAssessment':return {good:'善が優勢',evil:'悪が優勢',neither:'互角'}[d.result];
  case'klutzChoice':return `${person(g,d.target)} を選択 → ${d.teamLost?'チーム敗北':'継続'}`;
  case'shugenjaDirection':return d.direction==='clockwise'?'時計回り':'反時計回り';
  case'alignmentRead':return `${person(g,d.player)} → ${d.result==='good'?'善陣営':'悪陣営'}`;
  case'roleReveal':return `${person(g,d.player)} → ${ROLES[d.shownRole].symbol}`;
  case'action':return person(g,d.target);
 }
}
function formatSelfInfo(e:SelfInfoEvent,g:GameSnapshot):string{
 if(e.roleId==='grandmother')return `${person(g,e.player)} → ${ROLES[e.shownRole].name}（善）`;
 if(e.roleId==='chambermaid')return `${e.players.map(p=>person(g,p)).join(' / ')} → 起床${e.number}人`;
 if(e.roleId==='godfather')return `よそ者: ${e.shownOutsiders.map(r=>ROLES[r].symbol+ROLES[r].name).join('・')||'なし'}`;
 if(e.roleId==='artist')return `「${e.question}」 → ${e.result==='yes'?'はい':e.result==='no'?'いいえ':'不明'}`;
 if(e.roleId==='juggler')return `${e.guessDay}: ${e.guesses.map(x=>`${person(g,x.player)}=${ROLES[x.roleId].symbol}`).join(' / ')} → ${e.number}正解`;
 if(e.roleId==='sage')return `デーモン候補: ${e.players.map(x=>person(g,x)).join(' / ')}`;
 if(e.roleId==='knight')return `デーモンではない2人: ${e.players.map(x=>person(g,x)).join(' / ')}`;
 if(e.roleId==='noble')return `1人が悪陣営: ${e.players.map(x=>person(g,x)).join(' / ')}`;
 if(e.roleId==='pixie')return `最初に知らされた町人: ${ROLES[e.shownRole].symbol} ${ROLES[e.shownRole].name}`;
 if(e.roleId==='balloonist')return `${person(g,e.player)} を知らされた`;
 if(e.roleId==='bounty_hunter')return `${person(g,e.player)} を悪陣営として知らされた`;
 if(e.roleId==='choirboy')return `デーモン: ${person(g,e.player)}`;
 if(e.roleId==='high_priestess')return `会話推奨: ${person(g,e.player)}`;
 if(e.roleId==='king')return `生存役職: ${ROLES[e.shownRole].symbol} ${ROLES[e.shownRole].name}`;
 if(e.roleId==='general')return {good:'善が優勢',evil:'悪が優勢',neither:'互角'}[e.result];
 if(e.roleId==='fisherman')return e.advice;
 if(e.roleId==='steward')return `善陣営: ${person(g,e.player)}`;
 if(e.roleId==='shugenja')return e.direction==='clockwise'?'時計回り':'反時計回り';
 if(e.roleId==='village_idiot')return `${person(g,e.player)} → ${e.result==='good'?'善陣営':'悪陣営'}`;
 if(e.roleId==='savant')return e.statements.map(st=>st.kind==='roleInPlay'?`${ROLES[st.roleId].symbol} ${ROLES[st.roleId].name} がゲーム内にいる`:`${st.players.map(x=>person(g,x)).join('・')} の中に ${ROLES[st.roleId].symbol} ${ROLES[st.roleId].name} がいる`).join(' / ');
 if(e.roleId==='seamstress')return `${e.players.map(x=>person(g,x)).join(' / ')} → ${e.result==='same'?'同陣営':'別陣営'}`;
 if(e.roleId==='dreamer')return `${person(g,e.player)} → ${e.shownRoles.map(r=>`${ROLES[r].symbol} ${ROLES[r].name}`).join(' / ')}`;
 if(e.roleId==='flowergirl'||e.roleId==='town_crier')return e.result==='yes'?'はい':'いいえ';
 if(e.roleId==='clockmaker'||e.roleId==='chef'||e.roleId==='empath'||e.roleId==='oracle'||e.roleId==='mathematician')return String(e.number);
 if(e.roleId==='fortune_teller')return `${e.players.map(x=>person(g,x)).join(' / ')} → ${e.result==='yes'?'はい':'いいえ'}`;
 if(e.roleId==='librarian'&&e.noOutsiders)return L.noOutsiders;
 if('players'in e&&Array.isArray(e.players)&&'shownRole'in e&&e.shownRole)return `${e.players.map(x=>person(g,x)).join(' / ')} → ${ROLES[e.shownRole].symbol}`;
 if('player'in e&&'shownRole'in e)return `${person(g,e.player)} → ${ROLES[e.shownRole].symbol}`;
 return ROLES[e.roleId].name;
}
function formatEvent(key:LogKey,event:NonNullable<GameSnapshot[LogKey]>[number],g:GameSnapshot){
 if(key==='minionActionLog'){
  const e=event as import('../types').MinionActionEvent;
  if(e.roleId==='mezepheles')return `言（メゼフェレス）: ${person(g,e.target)}に秘密の言葉 / ${e.transformed?'翌夜に悪へ変化':'変化なし'}`;
  if(e.roleId==='psychopath')return `${ROLES.psychopath.symbol}（サイコパス）: ${person(g,e.target)} / ${e.killed?'死亡':'生存'}`;
  if(e.roleId==='fearmonger')return `${L.self} ${ROLES.fearmonger.symbol}: ${person(g,e.target)}を標的に選択`;
  if(e.roleId==='harpy')return `${L.self} ${ROLES.harpy.symbol}: ${person(g,e.target)} → ${person(g,e.accuse)}を悪と思う狂気`;
  if(e.roleId==='poisoner')return `${L.self} ${ROLES.poisoner.symbol} → ${person(g,e.target)}${e.note?` / ${e.note}`:''}`;
  if(e.roleId==='spy')return `${L.self} ${ROLES.spy.symbol}${e.poisonTarget?` / 毒: ${person(g,e.poisonTarget)}`:' / 毒未記録'}${e.note?` / ${e.note}`:''}`;
  if(e.roleId==='witch')return `${L.self} ${ROLES.witch.symbol}: ${person(g,e.target)}${e.triggered===true?' / 呪いで死亡':e.triggered===false?' / 指名したが生存':''}${e.note?` / ${e.note}`:''}`;
  if(e.roleId==='cerenovus')return `${L.self} ${ROLES.cerenovus.symbol}: ${person(g,e.target)} → ${ROLES[e.madRole].symbol} ${ROLES[e.madRole].name}${e.note?` / ${e.note}`:''}`;
  return `${L.self} ${ROLES.pit_hag.symbol}: ${person(g,e.target)} → ${ROLES[e.newRole].symbol} ${ROLES[e.newRole].name}${e.note?` / ${e.note}`:''}`;
 }
 if('subject'in event){const s=event.subject;const subject=s.kind==='role'?ROLES[s.roleId].symbol:s.kind==='tag'?({FIRST_NIGHT_INFO:'\u521d\u591c\u60c5\u5831',CONTINUOUS_INFO:'\u7d99\u7d9a\u60c5\u5831',LACK_OF_INFO:'\u60c5\u5831\u306a\u3057',WANTS_DEMON_TARGET:'\u72d9\u308f\u308c\u305f\u3044',HIGH_SURVIVAL_VALUE:'\u751f\u5b58\u4fa1\u5024'}[s.tag]):s.kind==='type'?L.nominalTypes[['townsfolk','outsider','minion','demon'].indexOf(s.roleType)]:L[s.alignment];return `${person(g,event.playerId)}: ${subject}${event.claimType==='bluff'?' / \u30d6\u30e9\u30d5':''}`;}
 if('participants'in event)return event.participants.map(x=>person(g,x)).join(' \u2194 ')+(event.details?` / ${event.details}`:' / '+L.unknown);
 if('nominator'in event && (g.organGrinderVotes??[]).some(v=>v.hidden && v.when===event.when))return `${person(g,event.nominator)} → ${person(g,event.nominee)} / 秘密投票（票数・投票者不明）`;
 if('nominator'in event)return `${person(g,event.nominator)} \u2192 ${person(g,event.nominee)}${event.executed?' / 処刑成立・生存':''} / ${event.votingOccurred===false?'\u6295\u7968\u306a\u3057':`${event.voteTotal??event.voters.length}\u7968（\u6319\u624b${event.voters.length}\u4eba）`}`;
 if('rolePlayerId'in event)return `${person(g,event.rolePlayerId)} ${ROLES[event.roleId].symbol} \u2192 ${person(g,event.targetPlayerId)} / ${event.triggered?L.yes:L.no}`;
 if('reason'in event)return `${person(g,event.playerId)} / ${{execution:'\u51e6\u5211',night_death:'\u591c\u6b7b\u4ea1',ability:'\u80fd\u529b',storyteller:'\u30b9\u30c8\u30fc\u30ea\u30fc\u30c6\u30e9\u30fc',gnome:'\u30ce\u30fc\u30e0',gangster:'\u30ae\u30e3\u30f3\u30b0\u30b9\u30bf\u30fc',psychopath:'サイコパスの公開殺害',other:'\u305d\u306e\u4ed6'}[event.reason]}`;
 if(key==='revivalLog'&&'playerId'in event)return `${person(g,event.playerId)} / 復活`;
 if('structured'in event&&event.structured)return `${person(g,event.playerId)}: ${formatInfo(event.structured,g)}`;
 if(key==='selfActionLog'){
  const e=event as import('../types').SelfActionEvent;
  if('kind' in e && e.kind==='bmr_action')return `${ROLES[e.roleId].symbol} ${e.targets.map(p=>person(g,p)).join('・')} ${e.chosenRole?ROLES[e.chosenRole].name:''} ${e.note??''}`;
  if(e.roleId==='philosopher')return `${L.self} ${ROLES.philosopher.symbol} → ${ROLES[e.gainedRole].symbol} ${ROLES[e.gainedRole].name} の能力`;
  if(e.roleId==='snake_charmer')return `${L.self} ${ROLES.snake_charmer.symbol} → ${person(g,e.target)} / ${e.swapped?`交換${e.newDemonRole?` → ${ROLES[e.newDemonRole].symbol} ${ROLES[e.newDemonRole].name}`:''}`:'交換なし'}`;
  if(e.roleId==='slayer')return `${L.self} ${ROLES.slayer.symbol} → ${person(g,e.target)} / ${e.killed?'死亡':'死亡なし'}`;
  if(e.roleId==='klutz')return `${L.self} ${ROLES.klutz.symbol} → ${person(g,e.target)} / ${e.teamLost?'敗北':'継続'}`;
  if(e.roleId==='acrobat')return `${L.self} ${ROLES.acrobat.symbol} → ${person(g,e.target)} / ${e.died?'死亡':'生存'}`;
  if(e.roleId==='alchemist')return `${L.self} ${ROLES.alchemist.symbol} → ${ROLES[e.minionRole].symbol} ${ROLES[e.minionRole].name} の能力`;
  if(e.roleId==='alsaahir')return `${L.self} ${ROLES.alsaahir.symbol} / 手下: ${e.minions.map(x=>person(g,x)).join('・')||'なし'} / デーモン: ${e.demons.map(x=>person(g,x)).join('・')||'なし'} / ${e.won?'正解':'不正解'}`;
  if(e.roleId==='amnesiac'&&e.kind==='tag_answer')return `${L.self} ${ROLES.amnesiac.symbol} / ${AMNESIAC_TAG_LABELS[e.tag]??'能力タグ'}: ${e.matches?'当てはまる':'当てはまらない'}`;
  if(e.roleId==='amnesiac'&&e.kind==='lock_role')return `${L.self} ${ROLES.amnesiac.symbol} → ${ROLES[e.chosenRole].symbol} ${ROLES[e.chosenRole].name} と推定`;
  if(e.roleId==='preacher')return `説教師: ${person(g,e.target)} を選択`;
  if(e.roleId==='princess')return `姫: ${person(g,e.nominee)} を指名・処刑`;
  if(e.roleId==='engineer')return e.kind==='demon' ? `技師: デーモンを ${ROLES[e.demonRole].symbol} ${ROLES[e.demonRole].name} に変更` : `技師: 手下を ${e.minionRoles.map(r=>ROLES[r].symbol+ROLES[r].name).join('・')} に変更`;
  if(e.roleId==='farmer')return `${person(g,e.deceasedFarmer)} の夜死亡により自分が農夫へ変身`;
  if(e.roleId==='huntsman')return `猟師: ${person(g,e.target)}${e.rescuedRole ? ` → ${ROLES[e.rescuedRole].name}` : ''}`;
  if(e.roleId==='nightwatchman')return `夜警: ${person(g,e.target)} に知らせた`;
  if(e.roleId==='lycanthrope')return `人狼: ${person(g,e.target)} → ${e.killed ? '死亡':'生存'}`;
  if(e.roleId==='pixie')return `ピクシー: ${ROLES[e.shownRole].name} の能力を獲得`;
  if(e.roleId==='damsel')return `乙女: ${person(g,e.minion)} が ${person(g,e.target)} を推理 → ${e.won ? '悪勝利' : '継続'}`;
  if('target'in e)return `${L.self} ${ROLES[e.roleId].symbol} → ${person(g,e.target)}`;
  return L.self;
 }
 if(key==='abilityClaimLog' && 'affectedByHarpy' in event && event.affectedByHarpy===true) return `${person(g,event.playerId)}: ハーピーに選ばれたと報告 / ${Array.isArray(event.targets)&&event.targets.length?person(g,event.targets[0]):'相手不明'}を悪陣営だと思うよう求められた`;
 if('playerId'in event)return `${person(g,event.playerId)} ${'roleId'in event?ROLES[event.roleId].symbol:''} ${'result'in event?event.result??'':''}`;
 if('target'in event)return `${L.self} ${ROLES[event.roleId].symbol} \u2192 ${person(g,event.target)}`;
 if(key==='selfInfoLog')return `${ROLES[event.roleId].symbol} / ${formatSelfInfo(event as SelfInfoEvent,g)}`;
 return logLabel[key];
}
export function ManualReadForm({g,player,onSave,onClear,onBack}:{g:GameSnapshot;player:string;onSave:(r:ManualRead)=>void;onClear:()=>void;onBack:()=>void}){
 const old=g.manualReads[player];const[role,setRole]=useState<RoleId|null>(old?.roleId??null);const[align,setAlign]=useState<ManualRead['alignment']>(old?.alignment??'unknown');const[note,setNote]=useState(old?.note??'');
 return <><h2>{person(g,player)} / {L.read}</h2><p className="panel-note">{L.readHelp}</p><div className="form-section"><label>{L.role}</label><select value={role??''} onChange={e=>setRole(e.target.value as RoleId||null)}><option value="">{L.unknown}</option>{getSnapshotScriptRoleIds(g).map(id=>ROLES[id]).map(r=><option key={r.id} value={r.id}>{r.symbol} {r.name}</option>)}</select></div><div className="visibility-switch">{(['unknown','good','evil']as const).map(a=><button key={a} className={`visibility-button ${align===a?'visibility-selected':''}`} onClick={()=>setAlign(a)}>{L[a]}</button>)}</div><div className="form-section"><label>{L.note}</label><textarea value={note} maxLength={1000} onChange={e=>setNote(e.target.value)}/></div><button className="menu-option" onClick={()=>onSave({playerId:player,roleId:role,alignment:align,note,updatedAt:Date.now()})}>{L.confirm}</button>{old&&<button className="menu-option" onClick={onClear}>取り消し</button>}<button className="menu-option" onClick={onBack}>{L.back}</button></>;
}
