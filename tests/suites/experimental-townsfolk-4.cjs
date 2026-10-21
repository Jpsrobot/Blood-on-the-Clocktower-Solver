const { test } = require('../harness.cjs');
const { assert, observations, validSetup, evaluateAssignment, infoMatches, runSearch, validateSnapshot, ROLES, ALL_CORE_ROLE_IDS, BUILT_IN_SCRIPTS, getSnapshotScriptRoleIds, game, context, customGame, phase4RoleSymbols } = require('../fixtures.cjs');

test('Experimental phase 4 symbols, types, and custom-only catalog',()=>{
 for(const [id,symbol] of Object.entries(phase4RoleSymbols)){
  assert.equal(ROLES[id].symbol,symbol);assert.equal(ROLES[id].solverSupport,'full');assert(ALL_CORE_ROLE_IDS.includes(id));
  for(const builtin of BUILT_IN_SCRIPTS)assert(!builtin.roleIds.includes(id));
 }
 assert.equal(ROLES.damsel.type,'outsider');
});

test('Huntsman setup forces Damsel with an optional extra Outsider',()=>{
 const roles={self:'huntsman','1L':'damsel','2L':'knight','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='huntsman';
 assert(validSetup(roles,g));
 assert(!validSetup({...roles,'1L':'noble'},g));
 const {getSnapshotScriptRoleIds,createCustomScript}=require('../../.engine-test/scripts.js');
 const old=structuredClone(g);old.scriptRoleIds=old.scriptRoleIds.filter(x=>x!=='damsel');
 assert(getSnapshotScriptRoleIds(old).includes('damsel'));
 assert(createCustomScript('猟師',['huntsman','imp','spy','knight']).roleIds.includes('damsel'));
});

test('Huntsman converts chosen healthy Damsel to an out-of-play Townsfolk once',()=>{
 const roles={self:'huntsman','1L':'damsel','2L':'knight','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='huntsman';g.scriptRoleIds.push('virgin','empath');
 g.selfActionLog=[{id:51001,roleId:'huntsman',when:'N1',target:'1L',rescuedRole:'virgin'}];
 assert(validateSnapshot(g));
 const w=evaluateAssignment(roles,g,16);
 assert(w.length>0);assert(w.every(x=>x.current['1L']==='virgin'&&x.initial['1L']==='damsel'));
 g.selfActionLog.push({id:51002,roleId:'huntsman',when:'N1',target:'2L'});
 assert(!validateSnapshot(g));assert.equal(evaluateAssignment(roles,g).length,0);
});

test('Huntsman misses do not transform other players and rescue cannot name in-play Townsfolk',()=>{
 const roles={self:'huntsman','1L':'damsel','2L':'knight','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='huntsman';g.scriptRoleIds.push('virgin');
 g.selfActionLog=[{id:51101,roleId:'huntsman',when:'N1',target:'2L'}];
 assert(evaluateAssignment(roles,g).some(w=>w.current['1L']==='damsel'&&w.current['2L']==='knight'));
 g.selfActionLog[0].rescuedRole='virgin';assert.equal(evaluateAssignment(roles,g).length,0);
 g.selfActionLog[0].target='1L';g.selfActionLog[0].rescuedRole='knight';assert.equal(evaluateAssignment(roles,g).length,0);
});

test('Knight information excludes the Demon; Vortox requires a false pair',()=>{
 const c=context({self:'knight','1L':'spy','2L':'virgin','2R':'magician','1R':'imp'});
 const ok={kind:'knight',players:['1L','2L']},bad={kind:'knight',players:['1R','2L']};
 assert(infoMatches('knight','self',ok,c));assert(!infoMatches('knight','self',bad,c));
 const v={...c,roles:{...c.roles,'1R':'vortox'}};
 assert(!infoMatches('knight','self',bad,v)); // bare mechanical truth check; inversion handled by observations
 const roles={self:'knight','1L':'spy','2L':'virgin','2R':'magician','1R':'vortox'};
 const g=customGame(roles);g.selfRole.shownRole='knight';g.selfInfoLog=[{id:52001,roleId:'knight',when:'N1',players:['1R','2L']}];
 assert(evaluateAssignment(roles,g).length>0,'Vortox creates false Knight information');
 g.selfInfoLog[0].players=['1L','2L'];assert.equal(evaluateAssignment(roles,g).length,0);
});

test('Noble gets exactly one evil, with Spy and Recluse registrations',()=>{
 const c=context({self:'noble','1L':'spy','2L':'virgin','2R':'recluse','1R':'imp'});
 assert(infoMatches('noble','self',{kind:'noble',players:['1L','2L','2R']},c));
 assert(!infoMatches('noble','self',{kind:'noble',players:['1L','1R','2R']},context({self:'noble','1L':'poisoner','2L':'virgin','2R':'empath','1R':'imp'})));
 assert(infoMatches('noble','self',{kind:'noble',players:['2L','2R','1R']},c));
});

test('Knight/Noble/Pixie first-night structured information validates',()=>{
 const roles={self:'knight','1L':'noble','2L':'pixie','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.night=2;g.selfRole.shownRole='knight';
 g.selfInfoLog=[{id:53001,roleId:'knight',when:'N1',players:['1L','2L']}];
 assert(validateSnapshot(g));
 const bad=structuredClone(g);bad.selfInfoLog[0].players=['1L','1L'];assert(!validateSnapshot(bad));
 const report={id:53002,playerId:'1L',roleId:'noble',when:'N1',targets:[],result:null,structured:{kind:'noble',players:['self','2L','2R']},visibility:'public',recipients:[]};
 g.abilityClaimLog=[report];assert(validateSnapshot(g));
 const reportBad=structuredClone(g);reportBad.abilityClaimLog[0].structured.players=['self','self','1L'];assert(!validateSnapshot(reportBad));
 g.selfInfoLog=[{id:53003,roleId:'pixie',when:'N1',shownRole:'knight'}];assert(validateSnapshot(g));
 g.selfInfoLog[0].shownRole='spy';assert(!validateSnapshot(g));
});

test('Magician is shown among extra Minions but remains good',()=>{
 const roles={self:'imp','1L':'spy','2L':'magician','3L':'knight','3R':'noble','2R':'pixie','1R':'nightwatchman'};
 const g=customGame(roles,7);g.selfRole.shownRole='imp';
 g.demonState={knownMinions:[{playerId:'1L',source:'demon_info'},{playerId:'2L',source:'demon_info'}],storytellerBluffs:[],knownKing:null,bluffPlans:{}};
 assert(validSetup(roles,g));assert(validateSnapshot(g));
 const wrong=structuredClone(roles);wrong['2L']='poisoner';assert(!validSetup(wrong,g));
 const result=runSearch(g,{attempts:280,seed:43777,beamWidth:1,maxMillis:5000});
 assert(result.unique>0,'sampler explores extra Minion display');
 assert(result.worlds.every(w=>g.demonState.knownMinions.some(m=>w.initial[m.playerId]==='magician')));
});

test('Minion Magician introduction leaves two Demon candidates, one is Magician',()=>{
 const roles={self:'spy','1L':'imp','2L':'magician','3L':'knight','3R':'noble','2R':'pixie','1R':'nightwatchman'};
 const g=customGame(roles,7);g.selfRole.shownRole='spy';
 g.minionState={knownDemon:null,knownMinions:[],demonCandidates:['1L','2L'],sharedStorytellerBluffs:[],bluffPlans:{},spyInitialRoles:{},spyRedHerring:null,becameDemonAt:null};
 assert(validSetup(roles,g));assert(validateSnapshot(g));
 assert(!validSetup({...roles,'2L':'virgin'},g));
 const swap=structuredClone(roles);swap['1L']='magician';swap['2L']='imp';assert(validSetup(swap,g));
 const result=runSearch(g,{attempts:300,seed:6594,maxMillis:5000,beamWidth:1});
 assert(result.unique>0);assert(result.players['1L'].demon>0&&result.players['2L'].demon>0,'both demon candidates survive');
});

test('Nightwatchman chooses one recipient once, without forcing alignment',()=>{
 const roles={self:'nightwatchman','1L':'knight','2L':'noble','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='nightwatchman';
 g.selfActionLog=[{id:54001,roleId:'nightwatchman',when:'N1',target:'2R'}];
 assert(validateSnapshot(g));assert(evaluateAssignment(roles,g).length>0);
 g.night=2;g.selfActionLog.push({id:54002,roleId:'nightwatchman',when:'N2',target:'1L'});
 assert(!validateSnapshot(g));assert.equal(evaluateAssignment(roles,g).length,0);
});

test('Lycanthrope can kill a good target and suppress the Demon night kill',()=>{
 const roles={self:'lycanthrope','1L':'knight','2L':'noble','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='lycanthrope';g.night=2;
 g.selfActionLog=[{id:55001,roleId:'lycanthrope',when:'N2',target:'1L',killed:true}];
 g.deathLog=[{id:55002,playerId:'1L',when:'N2',reason:'night_death',sourceRoleId:'lycanthrope'}];
 assert(validateSnapshot(g));assert(evaluateAssignment(roles,g).length>0);
 g.deathLog.push({id:55003,playerId:'2L',when:'N2',reason:'night_death'});
 assert.equal(evaluateAssignment(roles,g).length,0);
});

test('Lycanthrope cannot kill actual evil and never acts on N1',()=>{
 const roles={self:'lycanthrope','1L':'knight','2L':'noble','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='lycanthrope';g.night=2;
 g.selfActionLog=[{id:55101,roleId:'lycanthrope',when:'N2',target:'2R',killed:true}];
 g.deathLog=[{id:55102,playerId:'2R',when:'N2',reason:'night_death',sourceRoleId:'lycanthrope'}];
 assert.equal(evaluateAssignment(roles,g).length,0);
 g.selfActionLog[0].when='N1';assert(!validateSnapshot(g));
});

test('Pixie first-night result refers to another in-play Townsfolk',()=>{
 const roles={self:'pixie','1L':'knight','2L':'noble','2R':'scarlet_woman','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='pixie';
 g.selfInfoLog=[{id:56001,roleId:'pixie',when:'N1',shownRole:'knight'}];
 assert(evaluateAssignment(roles,g).length>0);
 g.selfInfoLog[0].shownRole='general';g.scriptRoleIds.push('general');assert.equal(evaluateAssignment(roles,g).length,0);
});

test('Pixie gains seen ability after holder dies only with Storyteller confirmation',()=>{
 const roles={self:'pixie','1L':'knight','2L':'noble','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='pixie';g.night=2;
 g.selfInfoLog=[{id:56011,roleId:'pixie',when:'N1',shownRole:'knight'}];
 g.deathLog=[{id:56012,playerId:'1L',when:'D1',reason:'execution'}];
 g.selfActionLog=[{id:56013,roleId:'pixie',kind:'madness_confirmed',when:'N2',shownRole:'knight'}];
 assert(validateSnapshot(g));
 const worlds=evaluateAssignment(roles,g,15);assert(worlds.length>0);assert(worlds.every(w=>w.pixieAbilities.self==='knight'));
 g.deathLog=[];assert.equal(evaluateAssignment(roles,g).length,0);
});

test('Damsel correctly guessed by a Minion ends game for evil',()=>{
 const roles={self:'huntsman','1L':'damsel','2L':'knight','2R':'scarlet_woman','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='huntsman';
 g.selfActionLog=[{id:57001,roleId:'damsel',kind:'minion_guess',when:'D1',minion:'2R',target:'1L',won:true}];
 assert(validateSnapshot(g));
 const worlds=evaluateAssignment(roles,g,15);assert(worlds.length>0);assert(worlds.every(w=>w.ended&&w.endReason==='damsel'));
 g.selfActionLog[0].won=false;assert.equal(evaluateAssignment(roles,g).length,0);
});

test('Damsel guess fails against another character or with Spy jinx',()=>{
 const roles={self:'huntsman','1L':'damsel','2L':'knight','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='huntsman';
 g.selfActionLog=[{id:57101,roleId:'damsel',kind:'minion_guess',when:'D1',minion:'2R',target:'1L',won:false}];
 assert(validateSnapshot(g));assert(evaluateAssignment(roles,g).length>0,'Spy jinx prevents a Damsel win');
 g.selfActionLog[0].won=true;assert.equal(evaluateAssignment(roles,g).length,0);
 g.selfActionLog[0].won=false;g.selfActionLog[0].target='2L';assert(evaluateAssignment(roles,g).length>0);
});

test('Lycanthrope Faux Paw makes a good player register as evil without joining evil',()=>{
 const c=context({self:'lycanthrope','1L':'noble','2L':'knight','2R':'spy','1R':'imp'});
 c.alignment={self:'good','1L':'good','2L':'good','2R':'evil','1R':'evil'};
 assert(!infoMatches('noble','1L',{kind:'noble',players:['self','1L','2L']},c));
 c.registersEvil=new Set(['2L']);
 assert.deepEqual(require('../../.engine-test/engine/mechanics.js').alignmentOptions('2L',c),[1]);
 assert.equal(c.alignment['2L'],'good');
 assert(infoMatches('noble','1L',{kind:'noble',players:['self','1L','2L']},c));
});

test('Faux Paw is stable across a candidate history and informs an N1 Noble reading',()=>{
 const roles={self:'lycanthrope','1L':'noble','2L':'knight','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='lycanthrope';
 g.abilityClaimLog=[{id:58001,playerId:'1L',roleId:'noble',when:'N1',targets:[],structured:{kind:'noble',players:['self','1L','2L']},result:null,visibility:'public',recipients:[]}];
 const result=evaluateAssignment(roles,g,20);
 assert(result.some(w=>w.info[58001]==='works'&&['self','1L','2L'].includes(w.fauxPaw)&&w.initialAlignment[w.fauxPaw]==='good'));
});

test('Multiple same-night Lycanthrope and Damsel guess actions cannot be silently ignored',()=>{
 const roles={self:'lycanthrope','1L':'knight','2L':'noble','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='lycanthrope';g.night=2;
 g.selfActionLog=[{id:59001,roleId:'lycanthrope',when:'N2',target:'1L',killed:false},{id:59002,roleId:'lycanthrope',when:'N2',target:'2L',killed:false}];
 assert(!validateSnapshot(g));assert.equal(evaluateAssignment(roles,g).length,0);
 const damselRoles={self:'huntsman','1L':'damsel','2L':'knight','2R':'spy','1R':'imp'};
 const g2=customGame(damselRoles);g2.selfRole.shownRole='huntsman';
 g2.selfActionLog=[{id:59003,roleId:'damsel',kind:'minion_guess',when:'D1',minion:'2R',target:'2L',won:false},{id:59004,roleId:'damsel',kind:'minion_guess',when:'D1',minion:'2R',target:'1L',won:false}];
 assert(!validateSnapshot(g2));assert.equal(evaluateAssignment(damselRoles,g2).length,0);
});
