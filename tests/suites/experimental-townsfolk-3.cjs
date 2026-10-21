const { test } = require('../harness.cjs');
const { assert, validSetup, evaluateAssignment, runSearch, hardLocks, validateSnapshot, ROLES, ALL_CORE_ROLE_IDS, BUILT_IN_SCRIPTS, getSnapshotScriptRoleIds, phase3RoleSymbols, customGame } = require('../fixtures.cjs');

test('Experimental phase 3: all seven symbols and roles only in custom scripts',()=>{
 for(const [id,symbol] of Object.entries(phase3RoleSymbols)){
   assert.equal(ROLES[id].symbol,symbol);assert.equal(ROLES[id].solverSupport,'full');assert(ALL_CORE_ROLE_IDS.includes(id));
   for(const builtin of BUILT_IN_SCRIPTS)assert(!builtin.roleIds.includes(id));
 }
});

test('Choirboy setup requires King and script snapshot includes King',()=>{
 const roles={self:'choirboy','1L':'king','2L':'empath','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='choirboy';
 assert(validSetup(roles,g));
 assert(!validSetup({...roles,'1L':'virgin'},g));
 const {getSnapshotScriptRoleIds}=require('../../.engine-test/scripts.js');
 const legacy=customGame(roles);legacy.scriptRoleIds=legacy.scriptRoleIds.filter(r=>r!=='king');
 assert(getSnapshotScriptRoleIds(legacy).includes('king'));
 assert(validSetup(roles,legacy));
});

test('Choirboy sees the Demon player only when a Demon kills King',()=>{
 const roles={self:'choirboy','1L':'king','2L':'empath','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='choirboy';g.night=2;
 g.deathLog=[{id:31001,playerId:'1L',when:'N2',reason:'night_death'}];
 g.selfInfoLog=[{id:31002,roleId:'choirboy',when:'N2',player:'1R'}];
 assert(evaluateAssignment(roles,g,12).some(w=>w.info[31002]==='works'));
 const wrong=structuredClone(g);wrong.selfInfoLog[0].player='2R';assert.equal(evaluateAssignment(roles,wrong).length,0);
 const executed=structuredClone(g);executed.deathLog[0]={id:31001,playerId:'1L',when:'D1',reason:'execution'};assert.equal(evaluateAssignment(roles,executed).length,0);
});

test('Demon known King seat is a hard setup constraint, not an evil alignment',()=>{
 const roles={self:'imp','1L':'king','2L':'empath','2R':'spy','1R':'virgin'};
 const g=customGame(roles);g.selfRole.shownRole='imp';g.demonState={knownMinions:[],storytellerBluffs:[],knownKing:'1L',bluffPlans:{}};
 assert(validSetup(roles,g));assert(!validSetup({...roles,'1L':'virgin','1R':'king'},g));assert(validateSnapshot(g));
 const bad=structuredClone(g);bad.demonState.knownKing='unknown';assert(!validateSnapshot(bad));
});

test('King learns a living character only after dead >= living',()=>{
 const roles={self:'king','1L':'empath','2L':'virgin','3L':'saint','2R':'scarlet_woman','1R':'imp'};
 const g=customGame(roles,6);g.selfRole.shownRole='king';g.night=3;
 g.deathLog=[{id:32001,playerId:'1L',when:'D1',reason:'execution'}, {id:32002,playerId:'3L',when:'N2',reason:'night_death'},{id:32003,playerId:'2L',when:'D2',reason:'execution'}];
 g.selfInfoLog=[{id:32004,roleId:'king',when:'N3',shownRole:'scarlet_woman'}];
 assert(evaluateAssignment(roles,g,15).some(w=>w.info[32004]==='works'));
 const no=structuredClone(g);no.selfInfoLog[0].shownRole='saint';assert.equal(evaluateAssignment(roles,no).length,0);
 const early=structuredClone(g);early.selfInfoLog[0].when='N2';assert.equal(evaluateAssignment(roles,early).length,0);
});

test('King can learn an outsider character via a living healthy Spy registration',()=>{
 const roles={self:'king','1L':'empath','2L':'virgin','3L':'saint','2R':'spy','1R':'imp'};
 const g=customGame(roles,6);g.selfRole.shownRole='king';g.night=3;
 g.deathLog=[{id:32011,playerId:'1L',when:'D1',reason:'execution'}, {id:32012,playerId:'3L',when:'N2',reason:'night_death'},{id:32013,playerId:'2L',when:'D2',reason:'execution'}];
 g.selfInfoLog=[{id:32014,roleId:'king',when:'N3',shownRole:'saint'}];
 assert(evaluateAssignment(roles,g,15).some(w=>w.info[32014]==='registration'));
});

test('Vortox cannot make King wake before the death threshold',()=>{
 const roles={self:'king','1L':'empath','2L':'virgin','3L':'saint','2R':'spy','1R':'vortox'};
 const g=customGame(roles,6);g.selfRole.shownRole='king';g.scriptRoleIds.push('monk');
 g.selfInfoLog=[{id:32101,roleId:'king',when:'N1',shownRole:'monk'}];
 assert.equal(evaluateAssignment(roles,g).length,0);
});

test('Demon known King is used as a direct sampler lock',()=>{
 const roles={self:'imp','1L':'king','2L':'empath','2R':'spy','1R':'virgin'};
 const g=customGame(roles);g.selfRole.shownRole='imp';g.demonState={knownKing:'1L',knownMinions:[],storytellerBluffs:[],bluffPlans:{}};
 const {locks,issues}=hardLocks(g);assert.equal(locks['1L'],'king');assert.equal(issues.length,0);
 const samples=runSearch(g,{attempts:120,seed:951,beamWidth:1,maxMillis:4000});assert(samples.unique>0);
 assert(samples.worlds.every(w=>w.initial['1L']==='king'));
});

test('Engineer transforms Demon with its original team alignment and no retroactive setup',()=>{
 const roles={self:'engineer','1L':'empath','2L':'virgin','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.scriptRoleIds.push('vortox','fang_gu');g.selfRole.shownRole='engineer';g.night=2;
 g.selfActionLog=[{id:33001,roleId:'engineer',when:'N2',kind:'demon',demonRole:'vortox'}];
 const worlds=evaluateAssignment(roles,g,15);
 assert(worlds.length>0);
 assert(worlds.every(w=>w.current['1R']==='vortox'&&w.currentAlignment['1R']==='evil'&&w.initial['1R']==='imp'));
 assert(worlds.some(w=>w.changes.some(c=>c.kind==='engineer'&&c.toRole==='vortox')));
 const outsiderDelta=structuredClone(g);outsiderDelta.selfActionLog[0].demonRole='fang_gu';
 assert(evaluateAssignment(roles,outsiderDelta,15).some(w=>w.current['1R']==='fang_gu'));
});

test('Engineer can replace existing Minion and may be used only once',()=>{
 const roles={self:'engineer','1L':'empath','2L':'virgin','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.scriptRoleIds.push('poisoner','vortox');g.selfRole.shownRole='engineer';g.night=2;
 g.selfActionLog=[{id:33101,roleId:'engineer',when:'N1',kind:'minions',minionRoles:['poisoner']}];
 assert(evaluateAssignment(roles,g,15).some(w=>w.current['2R']==='poisoner'&&w.currentAlignment['2R']==='evil'));
 g.selfActionLog.push({id:33102,roleId:'engineer',when:'N2',kind:'demon',demonRole:'vortox'});
 assert.equal(evaluateAssignment(roles,g).length,0);
 assert(!validateSnapshot(g));
});

test('Farmer night-death converts exactly one surviving good player',()=>{
 const roles={self:'empath','1L':'farmer','2L':'virgin','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='empath';g.night=2;
 g.deathLog=[{id:34001,playerId:'1L',when:'N2',reason:'night_death'}];
 const worlds=evaluateAssignment(roles,g,15);assert(worlds.length>0);
 assert(worlds.every(w=>w.changes.filter(c=>c.kind==='farmer').length===1));
 assert(worlds.every(w=>w.changes.filter(c=>c.kind==='farmer').every(c=>['self','2L'].includes(c.playerId))));
 const observed=structuredClone(g);observed.selfActionLog=[{id:34002,roleId:'farmer',kind:'became_farmer',when:'N2',deceasedFarmer:'1L'}];
 assert(validateSnapshot(observed));
 const o=evaluateAssignment(roles,observed,15);assert(o.length>0&&o.every(w=>w.current.self==='farmer'));
});

test('Farmer transforms again when a newly-created Farmer dies at night',()=>{
 const roles={self:'empath','1L':'farmer','2L':'virgin','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='empath';g.night=3;
 g.deathLog=[{id:34101,playerId:'1L',when:'N2',reason:'night_death'},{id:34103,playerId:'self',when:'N3',reason:'night_death'}];
 g.selfActionLog=[{id:34102,roleId:'farmer',kind:'became_farmer',when:'N2',deceasedFarmer:'1L'}];
 const worlds=evaluateAssignment(roles,g,15);assert(worlds.length>0);
 assert(worlds.every(w=>w.current['2L']==='farmer'&&w.changes.filter(c=>c.kind==='farmer').length===2));
});

test('Fisherman, General and High Priestess are recorded without treating ST judgement as objective proof',()=>{
 const roles={self:'general','1L':'fisherman','2L':'high_priestess','2R':'spy','1R':'vortox'};
 const g=customGame(roles);g.selfRole.shownRole='general';
 g.selfInfoLog=[{id:35001,roleId:'general',when:'N1',result:'good'}];
 g.abilityClaimLog=[{id:35002,playerId:'1L',roleId:'fisherman',when:'D1',targets:[],structured:{kind:'storytellerAdvice',advice:'昨日の情報を確認'},result:null,visibility:'public',recipients:[]},{id:35003,playerId:'2L',roleId:'high_priestess',when:'N1',targets:[],structured:{kind:'singlePlayer',player:'1R'},result:null,visibility:'public',recipients:[]}];
 assert(validateSnapshot(g));
 const worlds=evaluateAssignment(roles,g,15);
 assert(worlds.length>0);
 assert(worlds.some(w=>w.info[35001]==='works'&&w.info[35002]==='works'&&w.info[35003]==='works'));
});

test('New role payload validation rejects malformed advice, King roles, and Engineer targets',()=>{
 const roles={self:'engineer','1L':'king','2L':'general','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.scriptRoleIds.push('fisherman','poisoner');g.selfRole.shownRole='engineer';
 g.selfActionLog=[{id:36001,roleId:'engineer',when:'N1',kind:'minions',minionRoles:['poisoner']}];
 assert(validateSnapshot(g));
 const badEngineer=structuredClone(g);badEngineer.selfActionLog[0].minionRoles=['king'];assert(!validateSnapshot(badEngineer));
 const badAdvice=structuredClone(g);badAdvice.abilityClaimLog=[{id:36002,playerId:'1L',roleId:'fisherman',when:'D1',targets:[],result:null,structured:{kind:'storytellerAdvice',advice:''},visibility:'public',recipients:[]}];assert(!validateSnapshot(badAdvice));
 const badKing=structuredClone(g);badKing.selfInfoLog=[{id:36003,roleId:'king',when:'N1',shownRole:'not_a_role'}];assert(!validateSnapshot(badKing));
});
