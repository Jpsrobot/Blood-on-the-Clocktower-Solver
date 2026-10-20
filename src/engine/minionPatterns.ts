import { ROLES } from '../roles';
import type { GameSnapshot } from '../types';
import type { HistoryWorld } from './model';
import { cycle } from './game';

/** Weak, explainable context, never facts about a seat's alignment. */
export function minionPatternSignals(g:GameSnapshot){
 const reportedWidow=(g.widowReports??[]).length;
 const changedBehavior=(g.evilBehaviorReports??[]).length;
 const revealedPsychopath=(g.psychopathEvents??[]).filter(e=>e.killed).length;
 const d1PsychopathClaim=g.roleClaimLog.some(c=>c.when==='D1'&&c.visibility==='public'&&c.subject.kind==='role'&&c.subject.roleId==='psychopath') || (g.psychopathEvents??[]).some(e=>e.when==='D1');
 const hiddenVotingDays=(g.organGrinderVotes??[]).filter(e=>e.hidden).length;
 const completedQuietNights=g.completedNights.filter(n=>n>=2&&n<3&&!g.deathLog.some(d=>d.when===`N${n}`)).length;
 return {reportedWidow,changedBehavior,revealedPsychopath,d1PsychopathClaim,hiddenVotingDays,completedQuietNights};
}
export function minionPatternLogBonus(g:GameSnapshot,w:HistoryWorld):number {
 const inPlay=new Set(Object.values(w.initial));const s=minionPatternSignals(g);let score=0;
 if(inPlay.has('widow'))score+=Math.min(2.6,s.reportedWidow*1.0);
 if(inPlay.has('mezepheles'))score+=Math.min(2,s.changedBehavior*.52);
 if(inPlay.has('organ_grinder'))score+=Math.min(2.2,s.hiddenVotingDays*.8);
 if(inPlay.has('psychopath')){
   score+=Math.min(2,s.revealedPsychopath*.9);
   if(g.night>=2 && !s.d1PsychopathClaim)score-=.52; // Delayed reveal remains legal.
 }
 // A suspicious good-looking player can also be a Politician. This is not
 // an alignment change or proof they are evil; it only changes sampling weight.
 if(inPlay.has('politician'))score+=Math.min(1.6,(g.outsiderEvents??[]).filter(e=>e.kind==='politician_suspicion' && w.initial[e.playerId]==='politician').length*.65);
 if(inPlay.has('summoner'))score+=Math.min(2,s.completedQuietNights*.9);
 if(inPlay.has('xaan')){
   const outsiders=Object.values(w.initial).filter(r=>ROLES[r].type==='outsider').length;
   // Multiple independent bad information records on Night X / Day X
   // strengthen Xaan; the engine still verifies poisoning in each world.
   if(outsiders>0 && w.xaanTriggered===outsiders){
     const observed=new Set(g.selfInfoLog.filter(o=>cycle(o.when)===outsiders).map(o=>o.id));
     for(const o of g.abilityClaimLog)if(cycle(o.when)===outsiders && o.structured)observed.add(o.id);
     const explained=[...observed].filter(id=>w.info[id]==='poison').length;
     score+=Math.min(2.7,Math.max(0,explained-1)*.9);
   }
 }
 return score;
}
