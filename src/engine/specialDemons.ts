import { ROLES, type RoleId } from "../roles";
import { getSnapshotScriptRoleIds } from "../scripts";
import type { GameSnapshot } from "../types";
import { seats, priorRole, setupCountOptionsForGame, setupCounts } from "./game";
import { typhonLayouts } from "./demonVariants";

type Random=()=>number;
const shuffled=<T>(arr:T[],random:Random):T[]=>{
  const v=[...arr];for(let i=v.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[v[i],v[j]]=[v[j],v[i]];}return v;
};
const select=<T>(arr:T[],random:Random):T|undefined=>arr[Math.floor(random()*arr.length)];
/** Exact starting role layouts for special Demons. No guesses are used as locks. */
export function drawSpecialAssignment(g:GameSnapshot, random:Random, locks:Record<string,RoleId>, demon: "lord_of_typhon"|"kazali"|"legion"):Record<string,RoleId>|null {
  const order=seats(g.playerCount), allowed=getSnapshotScriptRoleIds(g), all=allowed.map(r=>ROLES[r]);
  const fixed:Record<string,RoleId>={...locks};
  const shown=g.selfRole.shownRole;
  if(shown && !fixed.self) {
    const hiddenTag=ROLES[shown].type==="townsfolk"?"THINKS_TOWNSFOLK":ROLES[shown].type==="outsider"?"THINKS_OUTSIDER":ROLES[shown].type==="minion"?"THINKS_MINION":"THINKS_DEMON";
    const hidden=allowed.filter(r=>ROLES[r].tags.includes(hiddenTag));
    fixed.self=hidden.length && random()<.2?select(hidden,random)!:shown;
  }
  if(Object.entries(fixed).some(([p,r])=>!order.includes(p)||!allowed.includes(r)))return null;
  const otherDemons=Object.values(fixed).filter(r=>ROLES[r].type==="demon"&&r!==demon);
  if(otherDemons.length)return null;
  const numMinions=setupCounts(g.playerCount).minion+(demon==="lord_of_typhon"?1:0);
  const confirmedMinions=g.selfRole.shownRole && ROLES[g.selfRole.shownRole].type==="demon"
    ? g.demonState?.knownMinions??[] : g.minionState?.knownMinions??[];
  if(demon==="legion") {
    if(Object.values(fixed).some(r=>ROLES[r].type==="minion"))return null;
    if(shown && ROLES[shown].type==="minion")return null;
    if(shown && ROLES[shown].type==="demon"&&shown!=="legion")return null;
    if(g.minionState?.knownDemon || confirmedMinions.length)return null;
    const options=shuffled(setupCountOptionsForGame(g,["legion"]),random);
    for(const setup of options){
      if(setup.townsfolk+setup.outsider<2)continue;
      const goodRequired=Object.entries(fixed).filter(([,r])=>r!=="legion");
      if(goodRequired.length>setup.townsfolk+setup.outsider)continue;
      const forcedLegion=Object.keys(fixed).filter(p=>fixed[p]==="legion");
      if(forcedLegion.length>setup.demon)continue;
      if(g.demonState?.legionAllies?.some(p=>!order.includes(p)||fixed[p]&&fixed[p]!=="legion"))continue;
      const known=[...new Set([...forcedLegion,...(g.demonState?.legionAllies??[])])];
      if(known.length>setup.demon)continue;
      const legionSeats=[...known,...shuffled(order.filter(p=>!known.includes(p)&&!fixed[p]),random).slice(0,setup.demon-known.length)];
      if(legionSeats.length!==setup.demon)continue;
      const result=fillGoodSeats(g,random,{...fixed,...Object.fromEntries(legionSeats.map(p=>[p,"legion" as RoleId]))},setup.townsfolk,setup.outsider);
      if(result)return result;
    }
    return null;
  }
  const demonSeats=Object.keys(fixed).filter(p=>fixed[p]===demon);
  const knownDemon=shown&&ROLES[shown].type==="minion"?g.minionState?.knownDemon?.playerId:null;
  if(knownDemon && (fixed[knownDemon] && fixed[knownDemon]!==demon))return null;
  const demonCandidateSeats=knownDemon?[knownDemon]:(demonSeats.length?demonSeats:shuffled(order.filter(p=>!fixed[p]),random));
  const minionPool=all.filter(r=>r.type==="minion"&&r.id!=="summoner").map(r=>r.id);
  for(const demonSeat of demonCandidateSeats){
    const base:Record<string,RoleId>={...fixed,[demonSeat]:demon};
    const known=confirmedMinions.map(m=>m.playerId);
    if(known.includes(demonSeat)||known.some(p=>!order.includes(p)))continue;
    if(confirmedMinions.some(m=>m.roleId && (!minionPool.includes(m.roleId)||base[m.playerId]&&base[m.playerId]!==m.roleId)))continue;
    for(const m of confirmedMinions)if(m.roleId)base[m.playerId]=m.roleId;
    const requiredSeatSet=[...new Set([...known,...Object.keys(base).filter(p=>ROLES[base[p]].type==="minion")])];
    if(requiredSeatSet.length>numMinions)continue;
    const layouts=demon==="lord_of_typhon" ? shuffled(typhonLayouts(order,demonSeat,numMinions),random) : [
      [...requiredSeatSet,...shuffled(order.filter(p=>p!==demonSeat&&!requiredSeatSet.includes(p)&&!base[p]),random).slice(0,numMinions-requiredSeatSet.length)]
    ];
    for(const minionSeats of layouts){
      if(minionSeats.length!==numMinions||requiredSeatSet.some(p=>!minionSeats.includes(p))||minionSeats.some(p=>base[p]&&ROLES[base[p]].type!=="minion"))continue;
      const variant:Record<string,RoleId>={...base};
      const occupied=new Set(Object.values(variant).filter(r=>ROLES[r].type==="minion"));
      if(occupied.size!==Object.values(variant).filter(r=>ROLES[r].type==="minion").length)continue;
      const remaining=shuffled(minionPool.filter(r=>!occupied.has(r)),random);
      if(remaining.length<numMinions-occupied.size)continue;
      // A randomly chosen Marionette must be placed immediately beside its Demon.
      // In Lord of Typhon layouts this also preserves the contiguous Minion line.
      const unsetMinionSeats=shuffled(minionSeats.filter(p=>!variant[p]),random);
      const marionetteIndex=remaining.indexOf('marionette');
      if(marionetteIndex>=0 && marionetteIndex<unsetMinionSeats.length){
        const idx=order.indexOf(demonSeat);
        const neighbors=[order[(idx+1)%order.length],order[(idx+order.length-1)%order.length]];
        const seat=unsetMinionSeats.find(p=>neighbors.includes(p));
        if(!seat)continue;
        variant[seat]='marionette';
        unsetMinionSeats.splice(unsetMinionSeats.indexOf(seat),1);
        remaining.splice(marionetteIndex,1);
      }
      for(const p of unsetMinionSeats)variant[p]=remaining.shift()!;
      const baseOptions=setupCountOptionsForGame(g,[...Object.values(variant)]);
      const hiddenHuntsman=variant && Object.values(variant).includes('marionette') && allowed.includes('huntsman') && !Object.values(variant).includes('huntsman');
      const hiddenBalloonist=Object.values(variant).includes('marionette') && allowed.includes('balloonist') && !Object.values(variant).includes('balloonist');
      const extraOptions = [
        ...(hiddenHuntsman?setupCountOptionsForGame(g,[...Object.values(variant),'huntsman']):[]),
        ...(hiddenBalloonist?setupCountOptionsForGame(g,[...Object.values(variant),'balloonist']):[]),
      ];
      const options=[...baseOptions,...extraOptions].filter((x,i,arr)=>arr.findIndex(y=>x.townsfolk===y.townsfolk && x.outsider===y.outsider && x.minion===y.minion && x.demon===y.demon)===i);
      for(const option of shuffled(options,random)){
        const result=fillGoodSeats(g,random,variant,option.townsfolk,option.outsider);
        if(result)return result;
      }
    }
  }
  return null;
}
function fillGoodSeats(g:GameSnapshot,random:Random, fixed:Record<string,RoleId>,tfCount:number,outCount:number):Record<string,RoleId>|null {
  const order=seats(g.playerCount), allowed=getSnapshotScriptRoleIds(g);
  const bluffSet=new Set(g.selfRole.shownRole && ROLES[g.selfRole.shownRole].type==="demon"?g.demonState?.storytellerBluffs??[]:[]);
  const fixedTF=Object.values(fixed).filter(r=>ROLES[r].type==="townsfolk");
  const fixedOut=Object.values(fixed).filter(r=>ROLES[r].type==="outsider");
  if(fixedTF.length>tfCount||fixedOut.length>outCount)return null;
  if(new Set(fixedOut).size!==fixedOut.length || new Set(fixedTF.filter(r=>r!=="village_idiot")).size!==fixedTF.filter(r=>r!=="village_idiot").length)return null;
  const outs=[...fixedOut],tfs=[...fixedTF];
  if(tfs.includes("choirboy")&&!tfs.includes("king"))tfs.push("king");
  if(tfs.includes("huntsman")&&!outs.includes("damsel"))outs.push("damsel");
  const outsiderPool=allowed.filter(r=>ROLES[r].type==="outsider"&&!bluffSet.has(r));
  const tfPool=allowed.filter(r=>ROLES[r].type==="townsfolk"&&!bluffSet.has(r));
  if(outs.some(r=>!outsiderPool.includes(r))||tfs.some(r=>!tfPool.includes(r)))return null;
  while(outs.length<outCount){const opts=outsiderPool.filter(r=>!outs.includes(r));const chosen=select(opts,random);if(!chosen)return null;outs.push(chosen);}
  if(outs.length!==outCount)return null;
  while(tfs.length<tfCount){
    const spaces=tfCount-tfs.length;
    const opts=tfPool.filter(r=>!tfs.includes(r) && (r!=="huntsman"||outs.includes("damsel")) &&
      (r!=="choirboy"||tfs.includes("king")||(spaces>=2&&tfPool.includes("king"))));
    const chosen=select(opts,random);if(!chosen)return null;tfs.push(chosen);
    if(chosen==="choirboy"&&!tfs.includes("king"))tfs.push("king");
  }
  if(tfs.length!==tfCount)return null;
  if(tfs.includes("village_idiot")){
    const replaceable=tfs.map((r,index)=>({r,index})).filter(v=>v.r!=="village_idiot"&&v.r!=="king"&&!fixedTF.includes(v.r));
    const number=Math.min(2,replaceable.length,Math.floor(random()*3));
    for(const target of shuffled(replaceable,random).slice(0,number))tfs[target.index]="village_idiot";
  }
  const fixedValues=Object.values(fixed);
  const rest:RoleId[]=[...outs,...tfs];
  for(const role of fixedValues.filter(r=>ROLES[r].type==="townsfolk"||ROLES[r].type==="outsider")){
    const idx=rest.indexOf(role);if(idx<0)return null;rest.splice(idx,1);
  }
  const result:Record<string,RoleId>={...fixed};
  const available=shuffled(order.filter(p=>!fixed[p]),random);
  if(rest.length!==available.length)return null;
  for(const seat of available){
    const claim=priorRole(g,seat);
    const weights=rest.map(r=>r===claim?8:1);
    let x=random()*weights.reduce((a,b)=>a+b,0),picked=0;
    for(let i=0;i<weights.length;i++){x-=weights[i];if(x<=0){picked=i;break;}}
    result[seat]=rest.splice(picked,1)[0];
  }
  // Heretic excludes six actual character pairings under the official Djinn.
  // Refuse these sampled assignments before returning, rather than allowing
  // otherwise-valid Lord of Typhon / Kazali / Legion layouts to leak through.
  const chosen=Object.values(result);
  if(chosen.includes('heretic') && ['baron','godfather','lleech','pit_hag','spy','widow'].some(r=>chosen.includes(r as RoleId)))return null;
  const counts=setupCountOptionsForGame(g,chosen);
  if(!counts.some(c=>c.townsfolk===chosen.filter(r=>ROLES[r].type==='townsfolk').length && c.outsider===chosen.filter(r=>ROLES[r].type==='outsider').length && c.minion===chosen.filter(r=>ROLES[r].type==='minion').length && c.demon===chosen.filter(r=>ROLES[r].type==='demon').length))return null;
  return result;
}
