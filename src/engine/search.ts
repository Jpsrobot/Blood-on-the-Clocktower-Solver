import { ROLES, type RoleId, type RoleTag } from "../roles";
import { getSnapshotScriptRoleIds } from "../scripts";
import type { GameSnapshot } from "../types";
import type { SearchResult, SearchOptions, HistoryWorld, PlayerShare, Reason } from "./model";
import { DEFAULT_SEARCH_OPTIONS } from "./model";
import { seats, setupCounts, setupCountsForRoles, setupCountOptionsForGame, alchemistAbilityRole, priorRole, empathStableNeighbourShifts, type EmpathShiftSignal } from "./game";
import { evaluateAssignment } from "./mechanics";
import { analyzeEvidence } from "./evidence";
import { outsiderModifierClaimFit } from "./outsiderClaims";
import { isLeviathanEnabled, isAlHadikhiaEnabled, isRiotConfirmed, demonPatternLogBonus } from "./demonVariants";
import { minionPatternLogBonus } from "./minionPatterns";
import { drawSpecialAssignment } from "./specialDemons";
export function rng(seed: number) { return () => {seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;}; }

export function empathShiftLogBonus(w: HistoryWorld, signals: EmpathShiftSignal[], g: GameSnapshot): number {
  if (!signals.length) return 0;
  const allowed = new Set(getSnapshotScriptRoleIds(g));
  const rolesInWorld = new Set<RoleId>([...Object.values(w.initial), ...Object.values(w.current)]);
  const hasImpairmentRole = [...rolesInWorld].some(id => allowed.has(id) && ROLES[id].tags.includes("POISON_DRUNK_ABILITY"));
  const hasAlignmentChanger = [...rolesInWorld].some(id => allowed.has(id) && ROLES[id].tags.includes("ALIGNMENT_CHANGING"));
  let bonus = 0;
  for (const signal of signals) {
    const drunkExplanation = w.initial[signal.source] === "drunk" || w.current[signal.source] === "drunk";
    const exactPoisonExplanation = signal.nights.some(n => w.requiredPoison[n] === signal.source);
    const base = signal.direct ? 0.9 : 0.55;
    const explanation = drunkExplanation || exactPoisonExplanation ? 1 : hasImpairmentRole ? 0.35 : hasAlignmentChanger ? 0.12 : 0;
    bonus += base * explanation;
  }
  return Math.min(bonus, 1.8);
}
function shuffle<T>(a: T[], random:()=>number): T[] {const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
function combinations<T>(a:T[],n:number):T[][] {if(n===0)return[[]];return a.flatMap((v,i)=>combinations(a.slice(i+1),n-1).map(rest=>[v,...rest]));}
function selfIsMinion(g:GameSnapshot):boolean {
  const shown=g.selfRole.shownRole;
  return !!shown && ROLES[shown].type==='minion';
}
function knownMinionPlayers(g:GameSnapshot):string[]{
  if(g.selfRole.shownRole && ROLES[g.selfRole.shownRole].type==='demon') return (g.demonState?.knownMinions??[]).map(m=>m.playerId);
  if(selfIsMinion(g)) {
    return (g.minionState?.knownMinions??[]).map(m=>m.playerId);
  }
  return [];
}
function knownDemonPlayer(g:GameSnapshot):string|null {
  if(!selfIsMinion(g)) return null;
  const state=g.minionState;
  if(state?.knownDemon?.playerId) return state.knownDemon.playerId;
  return null;
}
function knownDemonBluffs(g:GameSnapshot):Set<RoleId>{
  if(g.playerCount<=6) return new Set();
  if(g.selfRole.shownRole && ROLES[g.selfRole.shownRole].type==='demon') return new Set(g.demonState?.storytellerBluffs??[]);
  if(selfIsMinion(g)) return new Set(g.minionState?.sharedStorytellerBluffs??[]);
  return new Set();
}
function hiddenTagForShown(roleId:RoleId):RoleTag {
  const type=ROLES[roleId].type;
  return type==='townsfolk'?'THINKS_TOWNSFOLK':type==='outsider'?'THINKS_OUTSIDER':type==='minion'?'THINKS_MINION':'THINKS_DEMON';
}
function hiddenSelfRoles(g:GameSnapshot, shown:RoleId):RoleId[]{
  const tag=hiddenTagForShown(shown), allowed=new Set(getSnapshotScriptRoleIds(g));
  return [...allowed].filter(id=>ROLES[id].tags.includes(tag));
}
export function hardLocks(g:GameSnapshot): {locks:Record<string,RoleId>;issues:Reason[]} {
  const locks:Record<string,RoleId>={},issues:Reason[]=[];
  // Boffin can grant these abilities to the Demon, so triggered is not proof of good.
  const boffinPossible = getSnapshotScriptRoleIds(g).includes('boffin');
  for(const t of g.abilityTriggerLog.filter(t=>t.triggered)) {
    if(boffinPossible) continue;
    if(locks[t.rolePlayerId]&&locks[t.rolePlayerId]!==t.roleId) issues.push({code:'incompatiblePublicEvents',players:[t.rolePlayerId],evidence:[t.id],strength:'input'});
    locks[t.rolePlayerId]=t.roleId;
  }
  const shown=g.selfRole.shownRole;
  if(shown&&ROLES[shown].type==='minion'){
    if(locks.self&&locks.self!==shown) issues.push({code:'selfRoleConflict',players:['self'],evidence:[],strength:'input'});
    locks.self=shown;
  }
  if(shown&&ROLES[shown].type==='demon'&&hiddenSelfRoles(g,shown).length===0){
    if(locks.self&&locks.self!==shown) issues.push({code:'selfRoleConflict',players:['self'],evidence:[],strength:'input'});
    locks.self=shown;
  }
  if(shown && ROLES[shown].type === 'demon' && g.demonState?.knownKing){
    const king = g.demonState.knownKing;
    if(locks[king] && locks[king] !== 'king') issues.push({code:'knownKingConflict',players:[king],roles:['king'],evidence:[],strength:'input'});
    locks[king] = 'king';
  }
  if (shown && ROLES[shown].type === 'demon' && g.demonState?.knownMarionette){
    const seat=g.demonState.knownMarionette;
    if(locks[seat] && locks[seat]!=="marionette")issues.push({code:'knownMarionetteConflict',players:[seat],evidence:[],strength:'input'});
    locks[seat]='marionette';
  }
  for(const m of g.demonState?.knownMinions ?? []){
    if(!g.selfRole.shownRole || ROLES[g.selfRole.shownRole].type!=='demon') break;
    const p=m.playerId;
    if(locks[p]&&ROLES[locks[p]].type!=='minion' && !(m.source==='demon_info' && locks[p]==='magician')) issues.push({code:'knownMinionConflict',players:[p],evidence:[],strength:'input'});
    if(m.roleId){
      if(locks[p]&&locks[p]!==m.roleId) issues.push({code:'knownMinionConflict',players:[p],evidence:[],strength:'input'});
      locks[p]=m.roleId;
    }
  }
  if(selfIsMinion(g)){
    const state=g.minionState;
    const demon=state?.knownDemon?.playerId;
    if(demon&&locks[demon]&&ROLES[locks[demon]].type!=='demon') issues.push({code:'knownDemonConflict',players:[demon],evidence:[],strength:'input'});
    for(const m of state?.knownMinions ?? []){
      const p=m.playerId;
      if(locks[p]&&ROLES[locks[p]].type!=='minion') issues.push({code:'knownMinionConflict',players:[p],evidence:[],strength:'input'});
      if(m.roleId){
        if(locks[p]&&locks[p]!==m.roleId) issues.push({code:'knownMinionConflict',players:[p],roles:[m.roleId],evidence:[],strength:'input'});
        locks[p]=m.roleId;
      }
    }
    if(shown==='evil_twin'&&state?.evilTwin){
      const p=state.evilTwin.playerId, r=state.evilTwin.roleId;
      if(locks[p]&&locks[p]!==r) issues.push({code:'evilTwinConflict',players:[p],roles:[r],evidence:[],strength:'input'});
      locks[p]=r;
    }
  }
  const values=Object.values(locks);
  if (new Set(values.filter(r=>r!=="village_idiot")).size!==values.filter(r=>r!=="village_idiot").length || values.filter(r=>r==="village_idiot").length>3)
    issues.push({code:'duplicatePublicRole',players:Object.keys(locks),evidence:[],strength:'input'});
  if(shown&&locks.self&&locks.self!==shown&&!hiddenSelfRoles(g,shown).includes(locks.self)) issues.push({code:'selfRoleConflict',players:['self'],evidence:[],strength:'input'});
  return {locks,issues};
}
/** Summoner setup is a separate initial assignment: no Demon, +1 Townsfolk.
 * No guess about a Night 3 Demon is allowed to become a starting role. */
function drawSummonerAssignment(g: GameSnapshot, random:()=>number, locks:Record<string,RoleId>, copied=false):Record<string,RoleId>|null {
  const ps=seats(g.playerCount), ids=getSnapshotScriptRoleIds(g), fixed={...locks};
  if(!ids.includes('summoner') || Object.values(fixed).some(r=>ROLES[r].type==='demon'))return null;
  if(copied && (g.selfRole.shownRole!=='alchemist' || alchemistAbilityRole(g)!=='summoner'))return null;
  if(copied)fixed.self='alchemist';
  const minionCount=setupCounts(g.playerCount).minion;
  if(minionCount===0)return null;
  if(!copied && g.selfRole.shownRole==='summoner')fixed.self='summoner';
  const fixedMinions=Object.values(fixed).filter(r=>ROLES[r].type==='minion');
  if(!copied && !fixedMinions.includes('summoner'))fixedMinions.push('summoner');
  if(fixedMinions.length>minionCount)return null;
  const minionPool=ids.filter(r=>ROLES[r].type==='minion'&&r!=='marionette' && r!=='summoner' && !fixedMinions.includes(r));
  const rest=shuffle(minionPool,random).slice(0,minionCount-fixedMinions.length);
  if(rest.length!==minionCount-fixedMinions.length)return null;
  const minions=[...fixedMinions,...rest];
  const countOptions=setupCountOptionsForGame(g,[...minions,...Object.values(fixed)])
    .map(x=>copied?{...x,townsfolk:x.townsfolk+1,demon:0}:x).filter(x=>x.demon===0);
  if(!countOptions.length)return null;
  const counts=countOptions[Math.floor(random()*countOptions.length)];
  const required=Object.values(fixed);
  const outsiderRequired=required.filter(r=>ROLES[r].type==='outsider');
  const outsiderPool=ids.filter(r=>ROLES[r].type==='outsider'&&!outsiderRequired.includes(r));
  if(outsiderRequired.length>counts.outsider)return null;
  const outs=[...outsiderRequired,...shuffle(outsiderPool,random).slice(0,counts.outsider-outsiderRequired.length)];
  if(outs.length!==counts.outsider)return null;
  const tfRequired=required.filter(r=>ROLES[r].type==='townsfolk');
  if(tfRequired.includes('choirboy')&&!tfRequired.includes('king'))tfRequired.push('king');
  if(tfRequired.includes('huntsman')&&!outs.includes('damsel'))return null;
  if(tfRequired.length>counts.townsfolk)return null;
  const exclusion=new Set([...minions,...outs,...tfRequired]);
  const tfs=[...tfRequired];
  const pool=shuffle(ids.filter(r=>ROLES[r].type==='townsfolk'&&!exclusion.has(r)),random);
  for(const r of pool){if(tfs.length===counts.townsfolk)break;if(r==='choirboy'&&!tfs.includes('king')){if(tfs.length+2>counts.townsfolk||!pool.includes('king'))continue;tfs.push('king');}if(!tfs.includes(r))tfs.push(r);}
  if(tfs.length!==counts.townsfolk)return null;
  let roles:RoleId[]=[...minions,...outs,...tfs];
  for(const r of Object.values(fixed)){const i=roles.indexOf(r);if(i<0)return null;roles.splice(i,1);}
  const available=ps.filter(p=>!fixed[p]);
  // Keep the Summoner identifiable while allowing ordinary claims to guide the remaining seats.
  if(!copied && !Object.values(fixed).includes('summoner')){
    const target=shuffle(available,random)[0];if(!target)return null;fixed[target]='summoner';
    const at=roles.indexOf('summoner');if(at<0)return null;roles.splice(at,1);
  }
  const result={...fixed};
  for(const seat of shuffle(ps.filter(p=>!fixed[p]),random)){
    const claim=priorRole(g,seat);
    const matches=roles.map(r=>r===claim?8:1);
    let cursor=random()*matches.reduce((a,b)=>a+b,0),index=0;
    for(let i=0;i<roles.length;i++){cursor-=matches[i];if(cursor<=0){index=i;break;}}
    result[seat]=roles.splice(index,1)[0];
  }
  const knownMinions=knownMinionPlayers(g);
  if(knownMinions.some(p=>ROLES[result[p]]?.type!=='minion'))return null;
  return result;
}

export function drawAssignment(g:GameSnapshot,random:()=>number,locks:Record<string,RoleId>):Record<string,RoleId>|null {
  const ps=seats(g.playerCount), fixed={...locks};
  const scriptIds=getSnapshotScriptRoleIds(g), all=scriptIds.map(id=>ROLES[id]);
  const forcedDemon=Object.values(fixed).find(r=>ROLES[r]?.type==="demon");
  const forcedPublic = g.leviathanConfirmed ? "leviathan" : g.alHadikhiaConfirmed ? "al_hadikhia" : g.riotConfirmed ? "riot" : null;
  const allowedDemons=all.filter(r=>r.type==="demon" && (!forcedPublic || r.id===forcedPublic) &&
    (r.id!=="leviathan" || isLeviathanEnabled(g)) &&
    (r.id!=="al_hadikhia" || isAlHadikhiaEnabled(g)) &&
    (r.id!=="riot" || isRiotConfirmed(g) || g.night<=2)).map(r=>r.id);
  // Alchemist copying Summoner has a separate no-Demon setup, without
  // forcing a second, real Summoner into a Minion slot.
  if(g.selfRole.shownRole==='alchemist' && alchemistAbilityRole(g)==='summoner' &&
    !forcedDemon && !forcedPublic && !knownDemonPlayer(g))
    return drawSummonerAssignment(g,random,fixed,true);
  // Summoner-only initial worlds are sampled alongside ordinary Demon worlds.
  if(scriptIds.includes('summoner') && !forcedDemon && !forcedPublic && !knownDemonPlayer(g) &&
    (g.selfRole.shownRole==='summoner' || (!Object.values(fixed).some(r=>ROLES[r].type==='demon') && random()<.32)))
    return drawSummonerAssignment(g,random,fixed);
  const selectedDemon=forcedDemon??allowedDemons[Math.floor(random()*allowedDemons.length)];
  if(!selectedDemon || !allowedDemons.includes(selectedDemon))return null;
  if(selectedDemon==="legion"||selectedDemon==="kazali"||selectedDemon==="lord_of_typhon")
    return drawSpecialAssignment(g,random,fixed,selectedDemon);
  const knownMinions=knownMinionPlayers(g);
  const selfMinion=selfIsMinion(g);
  // Lil' Monsta replaces its Demon player token with an extra Minion.
  // In the model the current holder is marked as a Demon, but its underlying
  // Minion role is sampled separately during world evaluation.
  const m=setupCounts(g.playerCount).minion;
  const demonShown = g.selfRole.shownRole && ROLES[g.selfRole.shownRole].type==='demon'
    ? (g.demonState?.knownMinions ?? []).filter(x=>x.source==='demon_info').map(x=>x.playerId) : [];
  const magicianExtra = demonShown.length===m+1 && scriptIds.includes('magician');
  const knownMinionTotal=knownMinions.length+(selfMinion?1:0)-(magicianExtra?1:0);
  if(knownMinionTotal>m||knownMinions.some(p=>p==='self'||!ps.includes(p)))return null;
  const knownDemon=knownDemonPlayer(g);
  if(knownDemon&&(knownDemon==='self'||!ps.includes(knownDemon)||knownMinions.includes(knownDemon)))return null;

  const fixedMinionRoles=new Set(Object.values(fixed).filter(r=>ROLES[r]?.type==='minion'));
  const minionPool=all.filter(r=>r.type==='minion'&&r.id!=='summoner').map(r=>r.id);
  const minions=shuffle(combinations(minionPool,m).filter(set=>[...fixedMinionRoles].every(r=>set.includes(r))),random)[0];
  if(!minions)return null;

  const shown=g.selfRole.shownRole;
  if(shown&&!fixed.self){
    const hidden=hiddenSelfRoles(g,shown).filter(id=>scriptIds.includes(id));
    const pickHidden=hidden.length>0&&random()<.2;
    fixed.self=pickHidden?hidden[Math.floor(random()*hidden.length)]:shown;
  }

  // A healthy Spy's Grimoire is extremely informative, so most samples are
  // guided toward the entered display. It is NOT a hard lock when the Spy may be poisoned.
  if(shown==='spy' && g.minionState && random()<.82){
    for(const [p,r] of Object.entries(g.minionState.spyInitialRoles)){
      if(!r || !ps.includes(p) || !scriptIds.includes(r)) continue;
      if(fixed[p] && fixed[p]!==r) return null;
      fixed[p]=r;
    }
  }

  const occupiedMinionRoles=new Set(Object.values(fixed).filter(r=>ROLES[r]?.type==='minion'));
  const remainingMinionRoles=shuffle(minions.filter(r=>!occupiedMinionRoles.has(r)),random);
  const magicianSeat=magicianExtra ? shuffle(demonShown,random)[0] : null;
  if(magicianSeat){
    if(fixed[magicianSeat]&&fixed[magicianSeat]!=='magician')return null;
    fixed[magicianSeat]='magician';
  }
  for(const p of shuffle(knownMinions.filter(p=>p!==magicianSeat),random)){
    if(fixed[p]){if(ROLES[fixed[p]].type!=='minion')return null;continue;}
    const role=remainingMinionRoles.shift();if(!role)return null;fixed[p]=role;
  }
  const knownSet=new Set(knownMinions.filter(p=>p!==magicianSeat));if(selfMinion)knownSet.add('self');
  for(const [p,r] of Object.entries(fixed)) if(ROLES[r]?.type==='minion'&&!knownSet.has(p)&&knownMinionTotal===m)return null;

  // Minions shown two possible Demons must retain the true Demon/Magician
  // ambiguity. Neither seat is a hard Demon lock until later confirmed.
  const suspects = selfMinion ? [...new Set(g.minionState?.demonCandidates ?? [])] : [];
  if(suspects.length===2){
    const actualDemon = knownDemon && suspects.includes(knownDemon) ? knownDemon : shuffle(suspects,random)[0];
    const fakeDemon = suspects.find(p=>p!==actualDemon)!;
    if(fixed[actualDemon] && ROLES[fixed[actualDemon]].type!=='demon')return null;
    if(fixed[fakeDemon] && fixed[fakeDemon]!=='magician')return null;
    // Demon role is assigned after the appropriate Demon is sampled.
    fixed[fakeDemon]='magician';
  }
  const required=Object.values(fixed);
  if(required.some(r=>!scriptIds.includes(r))||new Set(required.filter(r=>r!=="village_idiot")).size!==required.filter(r=>r!=="village_idiot").length||required.filter(r=>r==="village_idiot").length>3)return null;
  const demonBluffs=knownDemonBluffs(g);
  const demonRequired=required.filter(r=>ROLES[r].type==='demon');
  if(demonRequired.length>1)return null;
  const demonPool=[selectedDemon];
  if(!demonPool.length)return null;
  const demon=demonRequired[0]??demonPool[Math.floor(random()*demonPool.length)];
  if(suspects.length===2){
    const fake = suspects.find(p=>fixed[p]==='magician');
    const real = suspects.find(p=>p!==fake);
    if(!real || (fixed[real]&&fixed[real]!==demon))return null;
    fixed[real]=demon;
  } else if(suspects.length===1){
    const real = suspects[0];
    if(fixed[real]&&fixed[real]!==demon)return null;
    fixed[real]=demon;
  }
  const countRoles=[...minions,demon,...Object.values(fixed)];
  const allCountOptions=setupCountOptionsForGame(g,countRoles);
  const extraHuntsmanCount = scriptIds.includes('huntsman') && !countRoles.includes('huntsman')
    ? setupCountOptionsForGame(g,[...countRoles,'huntsman']) : [];
  const extraBalloonistCount = scriptIds.includes('balloonist') && scriptIds.includes('marionette') && !countRoles.includes('balloonist')
    ? setupCountOptionsForGame(g,[...countRoles,'balloonist']) : [];
  const countOptions=[...allCountOptions, ...extraHuntsmanCount, ...extraBalloonistCount]
    .filter((c,i,items)=>items.findIndex(a=>a.townsfolk===c.townsfolk && a.outsider===c.outsider && a.minion===c.minion && a.demon===c.demon)===i);
  const counts=countOptions[Math.floor(random()*countOptions.length)];
  if(counts.townsfolk<0||counts.outsider<0)return null;

  const outPool=all.filter(r=>r.type==='outsider'&&!demonBluffs.has(r.id)).map(r=>r.id);
  const outSets=combinations(outPool,counts.outsider).filter(set=>required.filter(r=>ROLES[r].type==='outsider').every(r=>set.includes(r)) && (!required.includes('huntsman') || set.includes('damsel')));
  if(!outSets.length)return null;
  const outs=outSets[Math.floor(random()*outSets.length)];

  const tfRequired=required.filter(r=>ROLES[r].type==='townsfolk');
  // [+the King] reserves a separate Townsfolk slot even when only Choirboy
  // was locked by the user's token or an observed public interaction.
  if(tfRequired.includes('choirboy') && !tfRequired.includes('king')) tfRequired.push('king');
  if(tfRequired.includes('huntsman') && !outs.includes('damsel')) return null;
  if(tfRequired.length>counts.townsfolk)return null;
  const excluded=shown&&fixed.self==='drunk'?shown:null;
  const pool=all.filter(r=>r.type==='townsfolk'&&!tfRequired.includes(r.id)&&r.id!==excluded&&!demonBluffs.has(r.id)).map(r=>r.id);
  if(pool.length<counts.townsfolk-tfRequired.length)return null;
  const tfs=[...tfRequired];
  while(tfs.length<counts.townsfolk){
    const slots = counts.townsfolk - tfs.length;
    const available=pool.filter(r=>!tfs.includes(r) &&
      (r !== 'choirboy' || tfs.includes('king') || (slots >= 2 && pool.includes('king'))) &&
      (r !== 'huntsman' || outs.includes('damsel')));
    if (!available.length) return null;
    const weights=available.map(r=>1+ps.filter(p=>priorRole(g,p)===r).length*2);
    let x=random()*weights.reduce((a,b)=>a+b,0),pick=available[0];
    for(let i=0;i<available.length;i++){x-=weights[i];if(x<=0){pick=available[i];break;}}
    tfs.push(pick);
    if (pick === 'choirboy' && !tfs.includes('king')) tfs.push('king');
  }

  // The Village Idiot is the single exception to character-token uniqueness.
  // Up to two Townsfolk slots can become extra Village Idiots at setup.
  if (tfs.includes("village_idiot")) {
    const maxExtras = Math.min(3-tfs.filter(r=>r==="village_idiot").length,
      tfs.filter(r=>r!=="village_idiot" && !tfRequired.includes(r)).length);
    const extras = Math.floor(random()*(maxExtras+1));
    for (let i=0;i<extras;i++) {
      const replaceable=tfs.map((r,idx)=>({r,idx})).filter(x=>x.r!=="village_idiot" && !tfRequired.includes(x.r) && x.r!=="king");
      if (!replaceable.length) break;
      const chosen=replaceable[Math.floor(random()*replaceable.length)];
      tfs[chosen.idx]="village_idiot";
    }
  }
  let roles:RoleId[]=[...minions,...outs,...tfs,demon];
  if(Object.values(fixed).some(r=>!roles.includes(r)))return null;
  for(const r of Object.values(fixed)){const i=roles.indexOf(r);if(i<0)return null;roles.splice(i,1);}
  const result={...fixed};
  for(const p of shuffle(ps.filter(p=>!fixed[p]),random)) {
    const claim=priorRole(g,p);
    const weights=roles.map(r=>r===claim?12:r==='drunk'&&claim&&ROLES[claim].type==='townsfolk'&&!Object.values({...fixed}).includes(claim)?3:1);
    let x=random()*weights.reduce((a,b)=>a+b,0),index=0;
    for(let i=0;i<roles.length;i++){x-=weights[i];if(x<=0){index=i;break;}}
    result[p]=roles[index];roles.splice(index,1);
  }
  if(knownMinionTotal===m&&ps.some(p=>!knownSet.has(p)&&ROLES[result[p]].type==='minion'))return null;
  if(knownDemon&&ROLES[result[knownDemon]].type!=='demon')return null;
  // The Marionette is a real evil Minion, sitting immediately next to the
  // Demon in the starting seating circle (not the nearest living neighbor).
  const marionetteSeat=ps.find(p=>result[p]==='marionette');
  if(marionetteSeat){
    const demonSeat=ps.find(p=>ROLES[result[p]]?.type==='demon');
    if(!demonSeat)return null;
    const index=ps.indexOf(demonSeat);
    if(![ps[(index+1)%ps.length],ps[(index-1+ps.length)%ps.length]].includes(marionetteSeat))return null;
  }
  const totalIdiots=ps.filter(p=>result[p]==="village_idiot").length;
  if(totalIdiots>3)return null;
  if(suspects.length && (!suspects.some(p=>ROLES[result[p]]?.type==='demon') || suspects.some(p=>ROLES[result[p]]?.type!=='demon' && result[p]!=='magician')))return null;
  return result;
}
export function runSearch(g:GameSnapshot, options:Partial<SearchOptions>={},progress?:(checked:number,unique:number)=>void):SearchResult {
  const opts={...DEFAULT_SEARCH_OPTIONS,...options},start=Date.now(),random=rng(opts.seed),ps=seats(g.playerCount);
  const {locks,issues}=hardLocks(g);
  const evidence=analyzeEvidence(g);
  const empathShifts=empathStableNeighbourShifts(g);
  const candidates=new Map<string,HistoryWorld[]>(); let checked=0,accepted=0;
  if(!issues.length)for(;checked<opts.attempts;checked++) {
    if(Date.now()-start>opts.maxMillis)break;
    const assignment=drawAssignment(g,random,locks); if(!assignment)continue;
    const key=ps.map(p=>assignment[p]).join('|');if(candidates.has(key))continue;
    const worlds=evaluateAssignment(assignment,g,opts.beamWidth);
    if(worlds.length){accepted++;candidates.set(key,worlds);}
    if(progress&&checked%100===0)progress(checked,candidates.size);
  }
  const shares:Record<string,PlayerShare>=Object.fromEntries(ps.map(p=>[p,{evil:0,minion:0,demon:0,drunk:0,roles:{},poison:{}}]));
  const result:SearchResult={kind:'sample',checked,accepted,unique:candidates.size,elapsedMs:Date.now()-start,exhaustive:false,beamWidth:opts.beamWidth,seed:opts.seed,meta:opts.meta,effectiveWorlds:0,truncated:checked<opts.attempts,players:shares,presence:{},info:{},worlds:[],examples:{},issues:[...issues,...evidence.issues]};
  const weighted:{w:HistoryWorld;log:number}[]=[];
  for(const histories of candidates.values())for(const w of histories){
    let log=w.logScore-Math.log(histories.length);
    log += empathShiftLogBonus(w, empathShifts, g);
    log += demonPatternLogBonus(g,w.initial);
    log += minionPatternLogBonus(g,w);
    const initialRoleSet = new Set(Object.values(w.initial));
    const actualOutsiders = Object.values(w.initial).filter(role => ROLES[role]?.type === 'outsider').length;
    for (const roleId of initialRoleSet) {
      const role = ROLES[roleId];
      if (!role?.tags.includes('OUTSIDER_COUNT_MODIFIER')) continue;
      let delta: number | undefined;
      if (role.outsiderCountOptions?.length) {
        const without = [...initialRoleSet].filter(id => id !== roleId);
        const baseline = setupCountsForRoles(g.playerCount, without).outsider;
        delta = actualOutsiders - baseline;
        if (!role.outsiderCountOptions.includes(delta)) continue;
      }
      const fit = outsiderModifierClaimFit(g, roleId, delta);
      if (fit) log += fit.logAdjustment;
    }
    if(opts.meta)for(const [r,e]of Object.entries(evidence.global))if(Object.values(w.initial).includes(r as RoleId))log+=Math.min(e.points,2)*.15;
    weighted.push({w,log});
  }
  if(!weighted.length)return result;
  const max=weighted.reduce((m,x)=>Math.max(m,x.log),-Infinity);let total=0,sq=0;
  const assignWeights=new Map<string,number>();
  let legionTotal=0; const legionSeats:Record<string,number>=Object.fromEntries(ps.map(p=>[p,0]));
  let lleechTotal=0; const lleechHosts:Record<string,number>=Object.fromEntries(ps.map(p=>[p,0]));
  let riotTotal=0; const riotSeats:Record<string,number>=Object.fromEntries(ps.map(p=>[p,0]));
  let puzzlemasterTotal=0; const puzzleSeats:Record<string,number>=Object.fromEntries(ps.map(p=>[p,0]));
  for(const {w,log}of weighted){
    const weight=Math.exp(log-max);total+=weight;
    if(Object.values(w.initial).includes("legion")){legionTotal+=weight;for(const p of ps)if(w.initial[p]==="legion")legionSeats[p]+=weight;}
    if(Object.values(w.initial).includes("lleech") && w.lleechHost){lleechTotal+=weight;lleechHosts[w.lleechHost]+=weight;}
    if(w.puzzlemasterDrunk){puzzlemasterTotal+=weight;puzzleSeats[w.puzzlemasterDrunk]+=weight;}
    if(Object.values(w.initial).includes("riot")){riotTotal+=weight;for(const p of ps)if(w.current[p]==="riot")riotSeats[p]+=weight;}
    const key=ps.map(p=>w.initial[p]).join('|');assignWeights.set(key,(assignWeights.get(key)??0)+weight);
    for(const p of ps){
      const s=shares[p],r=w.current[p];
      if(w.currentAlignment[p] === "evil")s.evil+=weight;
      if(ROLES[r].type==='minion')s.minion+=weight;
      if(ROLES[r].type==='demon')s.demon+=weight;
      if(w.lleechHost===p)for(let night=1;night<=g.night;night++)s.poison[night]=(s.poison[night]??0)+weight;
      if(w.current[p]==='drunk'||w.villageIdiotDrunk===p||w.puzzlemasterDrunk===p)s.drunk+=weight;
      s.roles[r]=(s.roles[r]??0)+weight;
      for(const [n,who]of Object.entries(w.requiredPoison))if(who===p)s.poison[Number(n)]=(s.poison[Number(n)]??0)+weight;
    }
    for(const role of new Set(Object.values(w.initial)))result.presence[role]=(result.presence[role]??0)+weight;
    for(const [id,state]of Object.entries(w.info)){
      const slot=result.info[Number(id)]??{works:0,registration:0,poison:0,drunk:0,vortox:0,bluff:0,lie:0,missing:0};slot[state]+=weight;result.info[Number(id)]=slot;
    }
  }
  for(const w of assignWeights.values())sq+=w*w;
  result.effectiveWorlds=total*total/sq;
  for(const s of Object.values(shares)){s.evil/=total;s.minion/=total;s.demon/=total;s.drunk/=total;for(const r of Object.keys(s.roles)as RoleId[])s.roles[r]!/=total;for(const n of Object.keys(s.poison))s.poison[Number(n)]/=total;}
  for(const r of Object.keys(result.presence)as RoleId[])result.presence[r]!/=total;
  result.legionConditionalSeats=legionTotal>0?Object.fromEntries(ps.map(p=>[p,legionSeats[p]/legionTotal])):undefined;
  result.lleechHostConditionalSeats=lleechTotal>0?Object.fromEntries(ps.map(p=>[p,lleechHosts[p]/lleechTotal])):undefined;
  result.puzzlemasterDrunkConditionalSeats=puzzlemasterTotal>0?Object.fromEntries(ps.map(p=>[p,puzzleSeats[p]/puzzlemasterTotal])):undefined;
  result.riotConditionalSeats=riotTotal>0?Object.fromEntries(ps.map(p=>[p,riotSeats[p]/riotTotal])):undefined;
  for(const v of Object.values(result.info)){const sum=Object.values(v).reduce((a,b)=>a+b,0);for(const k of Object.keys(v)as(keyof typeof v)[])v[k]/=sum;}
  weighted.sort((a,b)=>b.log-a.log);
  const topWorlds=weighted.slice(0,opts.worldLimit);
  result.worlds=topWorlds.map(x=>x.w);
  result.worldWeights=topWorlds.map(x=>Math.exp(x.log-max)/total);
  for(const p of ps){
    const good=weighted.find(x=>x.w.currentAlignment[p] === "good")?.w;
    const evil=weighted.find(x=>x.w.currentAlignment[p] === "evil")?.w;
    result.examples[p]={...(good?{good}:{}),...(evil?{evil}:{})};
  }
  result.elapsedMs=Date.now()-start;
  return result;
}
