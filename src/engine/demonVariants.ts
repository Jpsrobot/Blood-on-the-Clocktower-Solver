import type { GameSnapshot } from "../types";
import type { RoleId } from "../roles";
import { ROLES } from "../roles";
import { seats, setupCounts, exactClaim } from "./game";

/** Lord of Typhon starts in the middle of one continuous line of Minions. */
export function typhonLayouts(order: string[], demon: string, minionCount: number): string[][] {
  const at=order.indexOf(demon);
  if(at<0 || minionCount<1 || minionCount>=order.length)return [];
  const left=Math.floor(minionCount/2),right=Math.ceil(minionCount/2);
  return [ [left,right], [right,left] ].map(([before,after])=>[
    ...Array.from({length:before},(_,i)=>order[(at-i-1+order.length)%order.length]),
    ...Array.from({length:after},(_,i)=>order[(at+i+1)%order.length]),
  ]).filter((set,index,all)=>all.findIndex(other=>other.slice().sort().join('|')===set.slice().sort().join('|'))===index);
}
export function isTyphonLayout(assign:Record<string,RoleId>, order:string[]):boolean {
  const lord=order.find(p=>assign[p]==="lord_of_typhon");
  if(!lord)return false;
  const minions=order.filter(p=>ROLES[assign[p]]?.type==="minion").sort();
  return typhonLayouts(order,lord,minions.length).some(layout=>layout.slice().sort().join('|')===minions.join('|'));
}
export function isAlHadikhiaEnabled(g:GameSnapshot):boolean {
  return g.alHadikhiaConfirmed===true || g.selfRole.shownRole==="al_hadikhia";
}
export function isRiotConfirmed(g:GameSnapshot):boolean {
  return g.riotConfirmed===true || g.selfRole.shownRole==="riot";
}
export function isLeviathanEnabled(g:GameSnapshot):boolean {
  return g.leviathanConfirmed===true || g.selfRole.shownRole==="leviathan";
}

/** Heuristics are intentionally modest: a missing claim or a voting pattern isn't proof. */
export function demonPatternSignals(g:GameSnapshot){
  const standardMinions=setupCounts(g.playerCount).minion;
  const minionClaimers=new Set(seats(g.playerCount).filter(p=>{const role=exactClaim(g,p);return role!==null && ROLES[role].type==="minion";}));
  const minionActions=new Set(g.abilityClaimLog.filter(a=>ROLES[a.roleId]?.type==="minion").map(a=>a.playerId));
  const knownMinions=new Set([...minionClaimers,...minionActions]);
  const excessMinions=Math.max(0,knownMinions.size-standardMinions);
  const publicClaims=new Set(g.roleClaimLog.filter(c=>c.visibility==="public"&&c.subject.kind==="role").map(c=>c.playerId));
  const publicInfo=new Set(g.abilityClaimLog.filter(c=>c.visibility==="public").map(c=>c.playerId));
  // A supposedly information-rich game with a large number of public role claims
  // but very little public information is a WEAK behavioural signal only.
  const sparseInfo=g.night>=2 && publicClaims.size>=Math.max(3,Math.ceil(g.playerCount*.35)) &&
    publicInfo.size<=Math.floor(publicClaims.size*.25);
  const suspiciousZeroVotes=g.nominationLog.filter(n=>n.votingOccurred!==false && n.voters.length>=Math.ceil(g.playerCount*.4) &&
    n.voteTotal===0).length;
  const repeatedVoteBlocks=g.nominationLog.filter(n=>n.votingOccurred!==false && n.voters.length>=Math.ceil(g.playerCount*.55) && g.noExecutionDays.includes(Number(n.when.slice(1)))).length;
  // Consecutive/early Demon-detection results can reflect the babysitter
  // changing. These are noisy reports and never become a solver lock.
  const demonPings=g.abilityClaimLog.filter(a=>["fortune_teller","flowergirl"].includes(a.roleId) &&
    a.structured && ["pairYesNo","singleYesNo"].includes(a.structured.kind) && a.visibility==="public")
    .sort((a,b)=>Number(a.when.slice(1))-Number(b.when.slice(1)));
  const changingPings=demonPings.slice(1).filter((ev,i)=>{
    const prev=demonPings[i],a=ev.structured,b=prev.structured;
    return a?.kind===b?.kind && a?.kind==="singleYesNo" && b?.kind==="singleYesNo" && a.result!==b.result ||
      a?.kind===b?.kind && a?.kind==="pairYesNo" && b?.kind==="pairYesNo" && a.players.join("|")===b.players.join("|") && a.result!==b.result;
  }).length;
  const earlyContinuousDeaths=g.deathLog.filter(d=>d.when.startsWith("N")&&Number(d.when.slice(1))>=2&&Number(d.when.slice(1))<=3 &&
    (d.reason==="night_death" || d.sourceRoleId && ROLES[d.sourceRoleId]?.type==="demon") &&
    (()=>{const role=exactClaim(g,d.playerId);if(!role||!ROLES[role].tags.includes("CONTINUOUS_INFO"))return false;
      return !g.roleClaimLog.some(c=>c.playerId===d.playerId&&c.subject.kind==="role"&&c.visibility==="public"&&Number(c.when.slice(1))<Number(d.when.slice(1)));})()).length;
  const multikillNights=new Set(g.deathLog.filter(d=>d.when.startsWith("N") && (d.reason==="night_death" || d.sourceRoleId && ROLES[d.sourceRoleId]?.type==="demon")).map(d=>d.when));
  const unusualKills=[...multikillNights].filter(n=>g.deathLog.filter(d=>d.when===n && (d.reason==="night_death" || d.sourceRoleId && ROLES[d.sourceRoleId]?.type==="demon")).length>=2).length;
  const survivedExecutions=g.nominationLog.filter(n=>n.executed===true && !g.deathLog.some(d=>d.when===n.when && d.playerId===n.nominee)).length;
  return {standardMinions,minionClaims:knownMinions.size,excessMinions,publicClaims:publicClaims.size,publicInfo:publicInfo.size,sparseInfo,suspiciousZeroVotes,repeatedVoteBlocks,changingPings,earlyContinuousDeaths,unusualKills,survivedExecutions};
}
export function demonPatternLogBonus(g:GameSnapshot, initial:Record<string,RoleId>):number {
  const ids=Object.values(initial);
  const s=demonPatternSignals(g);
  if(ids.includes("lord_of_typhon")) return Math.min(3,s.excessMinions*1.25);
  if(ids.includes("lil_monsta")) return Math.min(3,s.excessMinions*1.2)+Math.min(1.5,s.changingPings*.6);
  if(ids.includes("lleech")) return Math.min(2,s.survivedExecutions*.75);
  if(ids.includes("ojo")) return Math.min(2.4,s.earlyContinuousDeaths*.75);
  if(ids.includes("yaggababble")) return Math.min(2.1,s.unusualKills*.8);
  if(ids.includes("al_hadikhia")) return 0; // Public confirmation, never speculative
  if(ids.includes("riot")) return 0; // Separate Day-3 conditional display
  if(ids.includes("legion")) return (s.sparseInfo ? .65 : 0) + Math.min(2.4,s.suspiciousZeroVotes*1.2) + Math.min(.6,s.repeatedVoteBlocks*.25);
  if(ids.includes("kazali")) {
    // In Kazali games outsiders may vary widely. Claimed surplus is only
    // weak evidence; never exclude a normal game due to contested claims.
    const outsiderClaims=new Set(g.roleClaimLog.filter(c=>c.subject.kind==="role"&&ROLES[c.subject.roleId].type==="outsider").map(c=>c.playerId)).size;
    const base=setupCounts(g.playerCount).outsider;
    return Math.min(1.5,Math.max(0,outsiderClaims-base)*.3);
  }
  // Others do not receive a penalty from lack of claims: silence is ambiguous.
  return 0;
}
export function legionAccusationNotes(g:GameSnapshot,player:string):string[]{
  const notes:string[]=[];
  const role=exactClaim(g,player);
  if(!role) notes.push("具体的な役職主張なし（弱い手掛かり）");
  else if(ROLES[role].tags.includes("INFO_SOURCE") && g.night>=2 && !g.abilityClaimLog.some(a=>a.playerId===player))
    notes.push("情報役を主張・情報の記録なし（弱い手掛かり）");
  const zeroNoms=g.nominationLog.filter(n=>n.votingOccurred!==false && n.voteTotal===0 && n.voters.includes(player) && n.voters.length>=Math.ceil(g.playerCount*.4));
  if(zeroNoms.length)notes.push("大人数で挙手したのに0票の投票に参加（要確認）");
  return notes;
}
export function legionWorldsExpected(g:GameSnapshot):boolean {
  return seats(g.playerCount).length >= 5;
}
