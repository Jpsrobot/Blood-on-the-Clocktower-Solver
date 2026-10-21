const { test } = require('../harness.cjs');
const { assert, seats, validSetup, evaluateAssignment, infoMatches, validateSnapshot, ROLES, ALL_CORE_ROLE_IDS, BUILT_IN_SCRIPTS, context, customGame, phase5Ids } = require('../fixtures.cjs');

test('Phase-5 experimental Townsfolk are custom-only with consistent display symbols',()=>{
 for(const id of phase5Ids){assert(ALL_CORE_ROLE_IDS.includes(id));assert.equal(ROLES[id].type,'townsfolk');assert.equal(ROLES[id].solverSupport,'full');assert(Object.values(BUILT_IN_SCRIPTS).every(s=>!s.roleIds.includes(id)));}
 assert.deepEqual(phase5Ids.map(x=>ROLES[x].symbol),['芥','説','姫','修','執','村']);
});

test('Steward recognizes a good player, not the Imp, and Spy can register good',()=>{
 const roles={self:'steward','1L':'monk','2L':'chef','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='steward';
 g.selfInfoLog=[{id:1,roleId:'steward',when:'N1',player:'1L'}];assert(evaluateAssignment(roles,g).length);
 g.selfInfoLog[0].player='1R';assert.equal(evaluateAssignment(roles,g).length,0);
 g.selfInfoLog[0].player='2R';assert(evaluateAssignment(roles,g).length);
});

test('Shugenja uses circular seat order including wrap-around',()=>{
 const roles={self:'shugenja','1L':'chef','2L':'monk','2R':'spy','1R':'imp'};
 const c=context(roles);c.order=seats(5);
 assert(infoMatches('shugenja','self',{kind:'shugenjaDirection',direction:'anticlockwise'},c));
 assert(!infoMatches('shugenja','self',{kind:'shugenjaDirection',direction:'clockwise'},c));
});

test('Shugenja chooses either direction on a tie',()=>{
 const roles={self:'shugenja','1L':'poisoner','2L':'chef','2R':'monk','1R':'imp'};
 const c=context(roles);c.order=seats(5);
 // Set evil at opposite offsets? Self clockwise 1L and anticlockwise 1R.
 assert(infoMatches('shugenja','self',{kind:'shugenjaDirection',direction:'clockwise'},c));
 assert(infoMatches('shugenja','self',{kind:'shugenjaDirection',direction:'anticlockwise'},c));
});

test('Shugenja and Village Idiot reported-information imports validate',()=>{
 const roles={self:'shugenja','1L':'steward','2L':'village_idiot','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.night=2;
 g.abilityClaimLog=[
 {id:1,playerId:'self',roleId:'shugenja',when:'N1',targets:[],result:null,structured:{kind:'shugenjaDirection',direction:'clockwise'},visibility:'public',recipients:[]},
 {id:2,playerId:'2L',roleId:'village_idiot',when:'N2',targets:['1R'],result:null,structured:{kind:'alignmentRead',player:'1R',result:'evil'},visibility:'public',recipients:[]}
 ];
 assert(validateSnapshot(g));g.abilityClaimLog[1].structured.result='impossible';assert(!validateSnapshot(g));
});

test('Village Idiot allows two or three exact-role copies and rejects other duplicated Townsfolk',()=>{
 const two={self:'village_idiot','1L':'village_idiot','2L':'monk','2R':'spy','1R':'imp'};
 const three={self:'village_idiot','1L':'village_idiot','2L':'village_idiot','2R':'spy','1R':'imp'};
 assert(validSetup(two,customGame(two)));assert(validSetup(three,customGame(three)));
 const wrong={...two,'2L':'village_idiot','1L':'monk',self:'monk'};
 assert(!validSetup(wrong,customGame(wrong)));
});

test('Village Idiot has exactly one permanently drunk copy when there are two',()=>{
 const roles={self:'village_idiot','1L':'village_idiot','2L':'monk','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.night=2;g.selfRole.shownRole='village_idiot';
 g.selfInfoLog=[{id:1,roleId:'village_idiot',when:'N1',player:'1R',result:'good'},{id:2,roleId:'village_idiot',when:'N2',player:'1R',result:'good'}];
 const hs=evaluateAssignment(roles,g);assert(hs.length);assert(hs.every(h=>h.villageIdiotDrunk==='self'));
});

test('A lone Village Idiot cannot give wrong information when healthy',()=>{
 const roles={self:'village_idiot','1L':'chef','2L':'monk','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='village_idiot';
 g.selfInfoLog=[{id:1,roleId:'village_idiot',when:'N1',player:'1R',result:'good'}];
 assert.equal(evaluateAssignment(roles,g).length,0);
 g.selfInfoLog[0].result='evil';assert(evaluateAssignment(roles,g).length);
});

test('Poppy Grower blocks the original team introduction',()=>{
 const roles={self:'imp','1L':'poppy_grower','2L':'chef','2R':'poisoner','1R':'monk'};
 const g=customGame(roles);g.selfRole.shownRole='imp';
 g.demonState={knownMinions:[],storytellerBluffs:[],bluffPlans:{},evilTeamIntro:'blocked'};
 assert(evaluateAssignment(roles,g).length);
 g.demonState.evilTeamIntro='shown';assert.equal(evaluateAssignment(roles,g).length,0);
});

test('Poppy Grower death by day reveals the evil team the following night',()=>{
 const roles={self:'imp','1L':'poppy_grower','2L':'chef','2R':'poisoner','1R':'monk'};
 const g=customGame(roles);g.night=2;g.selfRole.shownRole='imp';
 g.demonState={knownMinions:[],storytellerBluffs:[],bluffPlans:{},evilTeamIntro:'blocked',evilTeamLearnedWhen:'N2'};
 g.deathLog=[{id:1,playerId:'1L',when:'D1',reason:'execution'}];
 assert(evaluateAssignment(roles,g).length);
 g.deathLog=[];assert.equal(evaluateAssignment(roles,g).length,0);
});

test('Poppy Grower delayed-introduction metadata must contain a valid night',()=>{
 const roles={self:'imp','1L':'poppy_grower','2L':'chef','2R':'poisoner','1R':'monk'};
 const g=customGame(roles);g.night=2;g.selfRole.shownRole='imp';g.demonState={knownMinions:[],storytellerBluffs:[],bluffPlans:{},evilTeamIntro:'blocked',evilTeamLearnedWhen:'N2'};
 assert(validateSnapshot(g));g.demonState.evilTeamLearnedWhen='D1';assert(!validateSnapshot(g));
 g.demonState.evilTeamLearnedWhen='N3';assert(!validateSnapshot(g));
 g.demonState.evilTeamLearnedWhen='N2';g.demonState.evilTeamIntro='shown';assert(!validateSnapshot(g));
});

test('Preacher choosing Poisoner prevents all its poison choices that night',()=>{
 const roles={self:'preacher','1L':'chef','2L':'monk','2R':'poisoner','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='preacher';g.selfActionLog=[{id:1,roleId:'preacher',when:'N1',target:'2R'}];
 const hs=evaluateAssignment(roles,g);assert(hs.length);assert(hs.every(h=>h.poison[1]===null));
});

test('Preacher choice of an innocent does not suppress Poisoner',()=>{
 const roles={self:'preacher','1L':'chef','2L':'monk','2R':'poisoner','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='preacher';g.selfActionLog=[{id:1,roleId:'preacher',when:'N1',target:'1L'}];
 g.abilityClaimLog=[{id:2,playerId:'1L',roleId:'chef',when:'N1',targets:[],result:null,structured:{kind:'number',value:0},visibility:'public',recipients:[]}];
 const hs=evaluateAssignment(roles,g);assert(hs.length);assert(hs.some(h=>h.poison[1]==='1L'));
});

test('A dead Preacher releases suppressed Poisoner on a later night',()=>{
 const roles={self:'preacher','1L':'empath','2L':'monk','2R':'poisoner','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='preacher';g.night=2;
 g.selfActionLog=[{id:1,roleId:'preacher',when:'N1',target:'2R'}];g.deathLog=[{id:2,playerId:'self',when:'D1',reason:'execution'}];
 g.abilityClaimLog=[{id:3,playerId:'1L',roleId:'empath',when:'N2',targets:[],result:null,structured:{kind:'number',value:0},visibility:'public',recipients:[]}];
 const hs=evaluateAssignment(roles,g);assert(hs.length);assert(hs.some(h=>h.poison[2]==='1L'));
});

test('Preacher can make one distinct choice every night and cannot duplicate a night',()=>{
 const roles={self:'preacher','1L':'chef','2L':'monk','2R':'poisoner','1R':'imp'};const g=customGame(roles);g.night=2;g.selfRole.shownRole='preacher';
 g.selfActionLog=[{id:1,roleId:'preacher',when:'N1',target:'1L'},{id:2,roleId:'preacher',when:'N2',target:'2R'}];
 assert(validateSnapshot(g));g.selfActionLog[1].when='N1';assert(!validateSnapshot(g));
});

test('A healthy Preacher blocks the Scarlet Woman from succeeding the executed Imp',()=>{
 const roles={self:'preacher','1L':'chef','2L':'monk','2R':'scarlet_woman','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='preacher';
 g.deathLog=[{id:2,playerId:'1R',when:'D1',reason:'execution'}];
 const ordinary=evaluateAssignment(roles,g);
 assert(ordinary.length);assert(ordinary.some(w=>w.current['2R']==='imp'));
 g.selfActionLog=[{id:1,roleId:'preacher',when:'N1',target:'2R'}];
 const preached=evaluateAssignment(roles,g);
 assert(preached.length);assert(preached.every(w=>w.current['2R']==='scarlet_woman' && w.ended));
});

test('Preached Spy cannot register good to another Townsfolk while suppressed',()=>{
 const roles={self:'preacher','1L':'steward','2L':'monk','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='preacher';
 g.abilityClaimLog=[{id:5,playerId:'1L',roleId:'steward',when:'N1',targets:['2R'],result:null,structured:{kind:'singlePlayer',player:'2R'},visibility:'public',recipients:[]}];
 const baseline=evaluateAssignment(roles,g);assert(baseline.length);assert(baseline.some(w=>w.info[5]==='registration'));
 g.selfActionLog=[{id:1,roleId:'preacher',when:'N1',target:'2R'}];
 const blocked=evaluateAssignment(roles,g);
 assert(blocked.length);assert(blocked.every(w=>w.info[5]!=='works'));
});

test('Princess prevents a Demon killing a chosen living target on N2',()=>{
 const roles={self:'princess','1L':'chef','2L':'monk','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.night=2;g.selfRole.shownRole='princess';g.completedNights=[2];
 g.nominationLog=[{id:1,nominator:'self',nominee:'1L',when:'D1',voters:['self','2L']}];
 g.deathLog=[{id:2,playerId:'1L',when:'D1',reason:'execution'}];
 g.selfActionLog=[{id:4,roleId:'princess',kind:'first_day_execution',when:'D1',nominee:'1L'}];
 const hs=evaluateAssignment(roles,g);assert(hs.length);
 // A Demon may voluntarily attack someone who is already dead, so a
 // zero-death night without this action would not prove Princess is active.
 assert(hs.every(h=>h.alive.includes('2L')));
});

test('Princess suppression does not forbid explicitly non-Demon night deaths',()=>{
 const roles={self:'princess','1L':'chef','2L':'monk','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.night=2;g.selfRole.shownRole='princess';
 g.nominationLog=[{id:1,nominator:'self',nominee:'1L',when:'D1',voters:['self']}];
 g.deathLog=[{id:2,playerId:'1L',when:'D1',reason:'execution'},{id:3,playerId:'2L',when:'N2',reason:'night_death',sourceRoleId:'lycanthrope'}];
 g.scriptRoleIds.push('lycanthrope');
 g.selfActionLog=[{id:4,roleId:'princess',kind:'first_day_execution',when:'D1',nominee:'1L'}];
 assert(validateSnapshot(g));assert(evaluateAssignment(roles,g).length);
});

test('Princess first-day execution action requires matching recorded nomination and execution',()=>{
 const roles={self:'princess','1L':'chef','2L':'monk','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.night=2;g.selfRole.shownRole='princess';
 g.selfActionLog=[{id:1,roleId:'princess',kind:'first_day_execution',when:'D1',nominee:'1L'}];
 assert(!validateSnapshot(g));
 g.nominationLog=[{id:2,nominator:'self',nominee:'1L',when:'D1',voters:[]}];assert(validateSnapshot(g));g.deathLog=[{id:3,playerId:'1L',when:'D1',reason:'execution'}];assert(validateSnapshot(g));
 g.selfActionLog[0].when='N1';assert(!validateSnapshot(g));
});

test('Princess may stop the Demon after an execution where the nominee survives',()=>{
 const roles={self:'princess','1L':'chef','2L':'monk','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.night=2;g.selfRole.shownRole='princess';g.completedNights=[2];
 g.nominationLog=[{id:1,nominator:'self',nominee:'1L',when:'D1',voters:['self','2L']}];
 g.selfActionLog=[{id:2,roleId:'princess',kind:'first_day_execution',when:'D1',nominee:'1L'}];
 assert(validateSnapshot(g));assert(evaluateAssignment(roles,g).length);
 g.noExecutionDays=[1];assert(!validateSnapshot(g));
 g.noExecutionDays=[];g.deathLog=[{id:3,playerId:'2L',when:'D1',reason:'execution'}];assert(!validateSnapshot(g));
});

test('Princess first-day ability fails when used on Day 2 without becoming Princess later',()=>{
 const roles={self:'princess','1L':'chef','2L':'monk','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.night=2;g.selfRole.shownRole='princess';
 g.selfActionLog=[{id:1,roleId:'princess',kind:'first_day_execution',when:'D2',nominee:'1L'}];
 g.nominationLog=[{id:2,nominator:'self',nominee:'1L',when:'D2',voters:[]}];g.deathLog=[{id:3,playerId:'1L',when:'D2',reason:'execution'}];
 assert.equal(evaluateAssignment(roles,g).length,0);
});
