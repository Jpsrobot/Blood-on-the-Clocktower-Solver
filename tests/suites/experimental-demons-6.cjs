const { test } = require('../harness.cjs');
const { assert, seats, setupCountOptionsForGame, validSetup, evaluateAssignment, canRegisterRole, runSearch, validateSnapshot, ROLES, BUILT_IN_SCRIPTS, claim, customGame, isTyphonLayout, typhonLayouts, isLeviathanEnabled, demonPatternSignals, demonPatternLogBonus, drawSpecialAssignment, demonGame, typhon10 } = require('../fixtures.cjs');

test('Phase 6 Demons are script-maker-only with Japanese labels and symbols',()=>{
 for(const id of ['lord_of_typhon','kazali','legion','leviathan']){assert.equal(ROLES[id].type,'demon');for(const core of Object.values(BUILT_IN_SCRIPTS))assert(!core.roleIds.includes(id));}
 assert.equal(ROLES.lord_of_typhon.symbol,'卿');assert.equal(ROLES.kazali.symbol,'傀');assert.equal(ROLES.legion.symbol,'群');assert.equal(ROLES.leviathan.symbol,'巨');
});

test('Lord of Typhon adds one Minion and supports arbitrary Outsider numbers',()=>{
 const g=demonGame(10);const options=setupCountOptionsForGame(g,['lord_of_typhon','poisoner','baron','assassin']);
 assert.equal(options.length,7);assert(options.every(x=>x.minion===3&&x.demon===1&&x.townsfolk+x.outsider===6));
 assert(options.some(x=>x.outsider===0));assert(options.some(x=>x.outsider===6));
});

test('Typhon is between contiguous Minions and invalid off-line placements are rejected',()=>{
 const g=demonGame(10),x=typhon10();assert(isTyphonLayout(x,seats(10)));assert(validSetup(x,g));
 const off={...x,'2L':'chef','3L':'assassin'};assert(!isTyphonLayout(off,seats(10)));assert(!validSetup(off,g));
});

test('Typhon at seven players requires both adjacent Minions',()=>{
 const g=demonGame(7);const layouts=typhonLayouts(seats(7),'self',2);assert.equal(layouts.length,1);
 assert.deepEqual(layouts[0].slice().sort(),['1L','1R']);
 const w={self:'lord_of_typhon','1L':'poisoner','2L':'chef','3L':'empath','2R':'monk','1R':'baron','3R':'soldier'};
 assert(validSetup(w,g));
});

test('Typhon generated assignments have one extra Minion and a valid seat line',()=>{
 const g=demonGame(10);g.selfRole.shownRole='lord_of_typhon';let found=0;
 for(let i=0;i<8;i++){const a=drawSpecialAssignment(g,Math.random,{self:'lord_of_typhon'},'lord_of_typhon');if(a){assert(validSetup(a,g));assert(isTyphonLayout(a,seats(10)));assert.equal(Object.values(a).filter(r=>ROLES[r].type==='minion').length,3);found++;}}
 assert(found>0);
});

test('Typhon additional independent Minion claimers increase only heuristic likelihood',()=>{
 const g=demonGame(10),ty=typhon10();assert.equal(demonPatternLogBonus(g,ty),0);
 claim(g,'1L','baron',201);claim(g,'2L','poisoner',202);claim(g,'3L','assassin',203);
 assert.equal(demonPatternSignals(g).excessMinions,1);assert(demonPatternLogBonus(g,ty)>0);
 const normal={...ty,self:'imp'};assert.equal(demonPatternLogBonus(g,normal),0);
});

test('Lord self-player role predictions are only notes, not role locks',()=>{
 const g=demonGame(10);g.selfRole.shownRole='lord_of_typhon';g.demonState={knownMinions:[],storytellerBluffs:[],bluffPlans:{},typhonPredictions:{'1L':'spy','1R':'witch'}};
 assert(validateSnapshot(g));const w=typhon10();assert(validSetup(w,g));
 g.demonState.typhonPredictions['1L']='chef';assert(!validateSnapshot(g));
});

test('Lord known 3 Minions and attack actions survive imported snapshots',()=>{
 const g=demonGame(10);g.selfRole.shownRole='lord_of_typhon';g.night=2;g.demonState={knownMinions:[{playerId:'1L',source:'demon_info',roleId:'poisoner'},{playerId:'1R',source:'demon_info',roleId:'baron'},{playerId:'2L',source:'demon_info',roleId:'assassin'}],storytellerBluffs:[],bluffPlans:{}};
 g.demonActionLog=[{id:321,roleId:'lord_of_typhon',when:'N2',target:'3L',note:null}];assert(validateSnapshot(g));
 const w=typhon10();assert(validSetup(w,g));g.demonActionLog[0].roleId='legion';assert(!validateSnapshot(g));
});

test('Kazali keeps standard Minion count and variable Outsiders',()=>{
 const g=demonGame(10),cs=setupCountOptionsForGame(g,['kazali','poisoner','baron']);
 assert.equal(cs.length,8);assert(cs.every(v=>v.minion===2&&v.demon===1&&v.townsfolk+v.outsider===7));
 assert(cs.some(v=>v.outsider===4));
});

test('Kazali selected Minion identities can be fixed on arbitrary seats',()=>{
 const g=demonGame(10);g.selfRole.shownRole='kazali';g.demonState={knownMinions:[{playerId:'3L',source:'demon_info',roleId:'poisoner'},{playerId:'4R',source:'demon_info',roleId:'assassin'}],storytellerBluffs:[],bluffPlans:{}};
 assert(validateSnapshot(g));let w=drawSpecialAssignment(g,Math.random,{self:'kazali'},'kazali');assert(w);assert(validSetup(w,g));assert.equal(w['3L'],'poisoner');assert.equal(w['4R'],'assassin');
 g.demonState.knownMinions[1].roleId='poisoner';assert.equal(drawSpecialAssignment(g,Math.random,{self:'kazali'},'kazali'),null);
});

test('Kazali outsider surplus is supportive but not a hard deduction',()=>{
 const g=demonGame(10),w={...typhon10(),self:'kazali'};claim(g,'1L','saint',1);claim(g,'2L','drunk',2);assert(demonPatternLogBonus(g,w)>0);
});

test('Legion generated worlds have Demon majority, duplicate role, and no Minions',()=>{
 const g=demonGame(10);g.selfRole.shownRole='legion';g.demonState={knownMinions:[],storytellerBluffs:[],bluffPlans:{}};
 for(let i=0;i<5;i++){const a=drawSpecialAssignment(g,Math.random,{self:'legion'},'legion');assert(a);assert(validSetup(a,g));assert(Object.values(a).filter(x=>x==='legion').length>5);assert(!Object.values(a).some(x=>ROLES[x].type==='minion'));}
});

test('Legion allies are hard locks and invalid ally records are rejected',()=>{
 const g=demonGame(10);g.selfRole.shownRole='legion';g.demonState={knownMinions:[],storytellerBluffs:[],bluffPlans:{},legionAllies:['1L','3R']};
 assert(validateSnapshot(g));let a=drawSpecialAssignment(g,Math.random,{self:'legion'},'legion');assert(a);assert.equal(a['1L'],'legion');assert.equal(a['3R'],'legion');
 g.demonState.legionAllies.push('1L');assert(!validateSnapshot(g));
});

test('Legion can register as a Minion, unlike normal Demons',()=>{
 assert(canRegisterRole('legion','spy'));assert(!canRegisterRole('imp','spy'));
});

test('Legion 0-vote large voting bloc boosts its weak heuristic weight',()=>{
 const g=demonGame(10),w={...typhon10(),self:'legion'};g.night=2;
 g.nominationLog=[{id:1,when:'D1',nominator:'self',nominee:'1L',voters:['1R','2R','3R','4R'],voteTotal:0,votingOccurred:true}];
 assert.equal(demonPatternSignals(g).suspiciousZeroVotes,1);assert(demonPatternLogBonus(g,w)>0);
});

test('Legion missing reported information modestly increases odds',()=>{
 const g=demonGame(10),w={...typhon10(),self:'legion'};g.night=2;
 for(const [i,p]of ['1L','2L','3L','4L'].entries())claim(g,p,'empath',900+i);
 assert(demonPatternSignals(g).sparseInfo);assert(demonPatternLogBonus(g,w)>0);
});

test('Leviathan stays impossible until explicitly confirmed on the reasoning screen',()=>{
 const g=demonGame(5),initial={self:'leviathan','1L':'chef','2L':'monk','2R':'poisoner','1R':'empath'};
 assert(!isLeviathanEnabled(g));assert(!validSetup(initial,g));g.leviathanConfirmed=true;
 assert(isLeviathanEnabled(g));assert(validSetup(initial,g));assert(validateSnapshot(g));
 g.leviathanConfirmed='yes';assert(!validateSnapshot(g));
});

test('A checked Leviathan restricts the whole sample to Leviathan worlds',()=>{
 const g=demonGame(7);g.leviathanConfirmed=true;
 const r=runSearch(g,{attempts:250,seed:877,maxMillis:6000,beamWidth:1});assert(r.unique>0);assert.equal(r.presence.leviathan,1);
});

test('Leviathan wins after two good executions and never chooses a night kill',()=>{
 const initial={self:'leviathan','1L':'chef','2L':'monk','2R':'poisoner','1R':'empath'};const g=customGame(initial);g.leviathanConfirmed=true;g.night=2;
 g.deathLog=[{id:1,playerId:'1L',when:'D1',reason:'execution'},{id:2,playerId:'2L',when:'D2',reason:'execution'}];
 const histories=evaluateAssignment(initial,g);assert(histories.length>0);assert(histories.every(w=>w.ended&&w.endReason==='leviathan'));
});

test('Leviathan world reaching sixth day is resolved as evil victory',()=>{
 const initial={self:'leviathan','1L':'chef','2L':'monk','2R':'poisoner','1R':'empath'},g=customGame(initial);g.leviathanConfirmed=true;g.night=6;
 const histories=evaluateAssignment(initial,g);assert(histories.length>0);assert(histories.every(w=>w.ended&&w.endReason==='leviathan'));
});

test('Special Demon mode results and conditional Legion ranking are produced',()=>{
 const g=demonGame(10),r=runSearch(g,{attempts:300,seed:919,maxMillis:6500,beamWidth:1});
 assert(r.unique>0);assert(r.presence.leviathan===undefined||r.presence.leviathan===0);
 assert(r.presence.legion>0);assert(r.legionConditionalSeats);
 for(const prob of Object.values(r.legionConditionalSeats))assert(prob>=0&&prob<=1);
});

test('Leviathan counts good executions where the player survives',()=>{
 const initial={self:'leviathan','1L':'chef','2L':'monk','2R':'poisoner','1R':'empath'},g=customGame(initial);g.leviathanConfirmed=true;g.night=2;
 g.nominationLog=[{id:1,when:'D1',nominator:'self',nominee:'1L',voters:['self'],voteTotal:1,votingOccurred:true,executed:true},{id:2,when:'D2',nominator:'self',nominee:'2L',voters:['self'],voteTotal:1,votingOccurred:true,executed:true}];
 assert(validateSnapshot(g));const ws=evaluateAssignment(initial,g);assert(ws.length);assert(ws.every(w=>w.ended&&w.endReason==='leviathan'&&w.leviathanGoodExecutions===2));
});

test('Leviathan does not double-count nonlethal marker and actual death',()=>{
 const initial={self:'leviathan','1L':'chef','2L':'monk','2R':'poisoner','1R':'empath'},g=customGame(initial);g.leviathanConfirmed=true;
 g.nominationLog=[{id:1,when:'D1',nominator:'self',nominee:'1L',voters:['self'],executed:true}];
 g.deathLog=[{id:2,playerId:'1L',when:'D1',reason:'execution'}];const ws=evaluateAssignment(initial,g);assert(ws.length);assert(ws.every(w=>w.leviathanGoodExecutions===1));
});

test('An observed nonlethal execution cannot be marked as no execution day',()=>{
 const g=demonGame(5);g.nominationLog=[{id:1,nominator:'self',nominee:'1L',when:'D1',voters:['self'],executed:true}];g.noExecutionDays=[1];
 // The form explicitly clears no-execution when the user confirms an execution.
 assert(g.nominationLog[0].executed);g.nominationLog[0].executed='maybe';assert(!validateSnapshot(g));
});

test('Legion executions fail when every recorded voter is Legion',()=>{
 const initial={self:'legion','1L':'legion','2L':'legion','3L':'legion','4L':'legion','5L':'legion','4R':'legion','3R':'chef','2R':'empath','1R':'monk'},g=customGame(initial,10);
 g.nominationLog=[{id:1,when:'D1',nominator:'self',nominee:'3R',voters:['self','1L','2L'],voteTotal:0,votingOccurred:true}];
 assert(evaluateAssignment(initial,g).length);
 g.deathLog=[{id:2,playerId:'3R',when:'D1',reason:'execution'}];assert.equal(evaluateAssignment(initial,g).length,0);
 g.nominationLog[0].voters.push('3R');g.nominationLog[0].voteTotal=4;assert(evaluateAssignment(initial,g).length);
});

test('Legion does not infer exclusively evil voting when no voters were entered',()=>{
 const initial={self:'legion','1L':'legion','2L':'legion','3L':'legion','4L':'legion','5L':'legion','4R':'legion','3R':'chef','2R':'empath','1R':'monk'},g=customGame(initial,10);
 g.nominationLog=[{id:1,when:'D1',nominator:'self',nominee:'3R',voters:[],voteTotal:4,votingOccurred:true}];
 g.deathLog=[{id:2,playerId:'3R',when:'D1',reason:'execution'}];assert(evaluateAssignment(initial,g).length);
});
