const { test } = require('../harness.cjs');
const { assert, rebuildStatus, empathStableNeighbourShifts, evaluateAssignment, infoMatches, empathShiftLogBonus, analyzeEvidence, nominationAdvice, runSpyBluffAdvisor, validateSnapshot, ROLES, game, context, base } = require('../fixtures.cjs');

test('Direct Exorcist no-death choice adds suspicion to the chosen player',()=>{
  const g=game(7);g.playset='bad_moon_rising';g.scriptRoleIds=['grandmother','sailor','exorcist','innkeeper','goon','mastermind','po'];g.night=2;g.completedNights=[2];g.selfRole.shownRole='exorcist';g.selfActionLog=[{id:90,roleId:'exorcist',when:'N2',target:'1L'}];
  const e=analyzeEvidence(g);assert(e.players['1L'].evil>=2);assert(e.players['1L'].reasons.some(r=>r.code==='exorcistNoDeathDirect'));
});

test('Reported Exorcist repeated target is flagged as inconsistent',()=>{
  const g=game(7);g.playset='bad_moon_rising';g.scriptRoleIds=['grandmother','sailor','exorcist','innkeeper','goon','mastermind','po'];g.night=3;g.completedNights=[2,3];g.abilityClaimLog=[
    {id:91,playerId:'1L',roleId:'exorcist',when:'N2',targets:['2L'],result:null,visibility:'public',recipients:[]},
    {id:92,playerId:'1L',roleId:'exorcist',when:'N3',targets:['2L'],result:null,visibility:'public',recipients:[]},
  ];
  const e=analyzeEvidence(g);assert(e.players['1L'].inconsistency>=1.5);assert(e.players['1L'].reasons.some(r=>r.code==='exorcistRepeatTarget'));
});

test('Mastermind risk is surfaced after an execution followed by a completed no-death night',()=>{
  const g=game(7);g.playset='bad_moon_rising';g.scriptRoleIds=['grandmother','sailor','exorcist','innkeeper','goon','mastermind','po'];g.night=3;g.completedNights=[3];g.deathLog=[{id:93,playerId:'1L',when:'D2',reason:'execution'}];
  const e=analyzeEvidence(g);assert((e.global.mastermind?.points??0)>=1);assert(e.global.mastermind.reasons.some(r=>r.code==='mastermindNoDeathAfterExecution'));
  const a=nominationAdvice(g,null,'2L');assert(a.risks.some(r=>r.code==='mastermindRisk'));assert.equal(a.verdict,'hold');
});

test('Snapshot validation accepts a direct self Exorcist action',()=>{
  const g=game(7);g.playset='bad_moon_rising';g.scriptRoleIds=['grandmother','sailor','exorcist','innkeeper','goon','mastermind','po'];g.night=2;g.selfRole.shownRole='exorcist';g.selfActionLog=[{id:94,roleId:'exorcist',when:'N2',target:'1L'}];assert(validateSnapshot(g));
});

test('BMR protection tags distinguish general death prevention from execution-death prevention',()=>{
  for(const id of ['monk','soldier','sailor','exorcist','innkeeper','tea_lady','fool','zombuul']){
    assert(ROLES[id].tags.includes('PREVENTS_DEATH'),`${id} should prevent death`);
  }
  for(const id of ['sailor','tea_lady','fool','pacifist','devils_advocate']){
    assert(ROLES[id].tags.includes('PREVENTS_EXECUTION_DEATH'),`${id} should prevent execution death`);
  }
  for(const id of ['pacifist','devils_advocate']){
    assert(!ROLES[id].tags.includes('PREVENTS_DEATH'),`${id} should use only the execution-specific tag`);
  }
});

test('Revival returns a dead player to alive status',()=>{
  const g=game(7);g.night=2;g.deathLog=[{id:200,playerId:'1L',when:'D1',reason:'execution'}];g.revivalLog=[{id:201,playerId:'1L',when:'N2'}];
  const s=rebuildStatus(g);assert.equal(s['1L'].alive,true);assert.equal(s['1L'].deadVoteAvailable,true);
});

test('A revived player can die again later',()=>{
  const g=game(7);g.night=3;g.deathLog=[{id:210,playerId:'1L',when:'D1',reason:'execution'},{id:212,playerId:'1L',when:'N3',reason:'night_death'}];g.revivalLog=[{id:211,playerId:'1L',when:'N2'}];
  const s=rebuildStatus(g);assert.equal(s['1L'].alive,false);assert.equal(s['1L'].deadVoteAvailable,true);assert(validateSnapshot(g));
});

test('Pit-Hag metadata marks character-changing night targeting',()=>{
  for(const tag of ['WAKES_OTHER_NIGHTS','TARGETS_PLAYER','TARGETS_CHARACTER','ROLE_CHANGING']) assert(ROLES.pit_hag.tags.includes(tag),tag);
});

test('Snapshot validation accepts Pit-Hag transformations only from N2 onward',()=>{
  const g=game(7);g.playset='sects_and_violets';g.scriptRoleIds=['clockmaker','dreamer','mathematician','flowergirl','town_crier','pit_hag','imp','witch','vortox'];g.night=2;g.selfRole.shownRole='pit_hag';
  g.minionActionLog=[{id:300,roleId:'pit_hag',kind:'transform',when:'N2',target:'2L',newRole:'witch',note:null}];assert(validateSnapshot(g));
  g.minionActionLog=[{id:301,roleId:'pit_hag',kind:'transform',when:'N1',target:'2L',newRole:'witch',note:null}];assert.equal(validateSnapshot(g),false);
});

test('Direct Pit-Hag action changes character but preserves alignment',()=>{
  const g=game(7);g.playset='sects_and_violets';g.scriptRoleIds=['clockmaker','dreamer','mathematician','flowergirl','town_crier','pit_hag','imp','witch','vortox'];g.night=2;g.selfRole.shownRole='pit_hag';g.minionActionLog=[{id:310,roleId:'pit_hag',kind:'transform',when:'N2',target:'2L',newRole:'witch',note:null}];
  const w={self:'pit_hag','1L':'dreamer','2L':'clockmaker','3L':'mathematician','3R':'flowergirl','2R':'town_crier','1R':'imp'};
  const hs=evaluateAssignment(w,g);assert(hs.length>0);assert(hs.every(x=>x.current['2L']==='witch'));assert(hs.every(x=>x.currentAlignment['2L']==='good'));assert(hs.every(x=>x.changes.some(c=>c.kind==='pit_hag'&&c.playerId==='2L'&&c.fromRole==='clockmaker'&&c.toRole==='witch')));
});

test('Pit-Hag Demon creation makes that nights deaths arbitrary',()=>{
  const script=['clockmaker','dreamer','mathematician','flowergirl','town_crier','pit_hag','imp','vortox'];
  const w={self:'pit_hag','1L':'dreamer','2L':'clockmaker','3L':'mathematician','3R':'flowergirl','2R':'town_crier','1R':'imp'};
  const base=game(7);base.playset='custom:test';base.scriptName='Pit-Hag test';base.scriptRoleIds=script;base.night=2;base.selfRole.shownRole='pit_hag';base.deathLog=[{id:320,playerId:'3L',when:'N2',reason:'night_death'},{id:321,playerId:'3R',when:'N2',reason:'night_death'}];
  assert.equal(evaluateAssignment(w,base).length,0);
  base.minionActionLog=[{id:322,roleId:'pit_hag',kind:'transform',when:'N2',target:'2L',newRole:'vortox',note:null}];
  const hs=evaluateAssignment(w,base);assert(hs.length>0);assert(hs.every(x=>x.current['2L']==='vortox'));assert(hs.every(x=>x.currentAlignment['2L']==='good'));assert(hs.every(x=>x.arbitraryDeathNights.includes(2)));
});

test('Empath repeating the same result on different nights is not an input conflict',()=>{
  const g=game(7);g.night=2;
  g.abilityClaimLog=[
    {id:201,playerId:'1L',roleId:'empath',when:'N1',targets:[],result:null,structured:{kind:'number',value:1},visibility:'public',recipients:[]},
    {id:202,playerId:'1L',roleId:'empath',when:'N2',targets:[],result:null,structured:{kind:'number',value:1},visibility:'public',recipients:[]},
  ];
  const e=analyzeEvidence(g);
  assert.equal(e.players['1L'].inconsistency,0);
  assert(!e.players['1L'].warnings.some(w=>w.color==='orange'||w.color==='yellow'));
});

test('Empath changed read with stable neighbours creates impairment signal',()=>{
  const g=game(7);g.night=2;g.abilityClaimLog=[
    {id:401,playerId:'1L',roleId:'empath',when:'N1',targets:[],result:null,structured:{kind:'number',value:1},visibility:'public',recipients:[]},
    {id:402,playerId:'1L',roleId:'empath',when:'N2',targets:[],result:null,structured:{kind:'number',value:0},visibility:'public',recipients:[]},
  ];
  const shifts=empathStableNeighbourShifts(g);assert.equal(shifts.length,1);assert.equal(shifts[0].source,'1L');
  const e=analyzeEvidence(g);assert(e.players['1L'].reasons.some(r=>r.code==='empathShiftStableNeighbours'));
});

test('Nearby neighbour death prevents Empath stable-neighbour impairment signal',()=>{
  const g=game(7);g.night=2;g.deathLog=[{id:410,playerId:'self',when:'N2',reason:'night_death'}];g.abilityClaimLog=[
    {id:411,playerId:'1L',roleId:'empath',when:'N1',targets:[],result:null,structured:{kind:'number',value:1},visibility:'public',recipients:[]},
    {id:412,playerId:'1L',roleId:'empath',when:'N2',targets:[],result:null,structured:{kind:'number',value:0},visibility:'public',recipients:[]},
  ];
  assert.equal(empathStableNeighbourShifts(g).length,0);
});

test('Empath stable-neighbour shift rewards Drunk or poison explanations',()=>{
  const g=game(5);g.night=2;g.abilityClaimLog=[
    {id:421,playerId:'1L',roleId:'empath',when:'N1',targets:[],result:null,structured:{kind:'number',value:1},visibility:'public',recipients:[]},
    {id:422,playerId:'1L',roleId:'empath',when:'N2',targets:[],result:null,structured:{kind:'number',value:0},visibility:'public',recipients:[]},
  ];
  const signals=empathStableNeighbourShifts(g);assert.equal(signals.length,1);
  const mk=(role,requiredPoison={})=>({initial:{self:'chef','1L':role,'2L':'baron','2R':'saint','1R':'imp'},current:{self:'chef','1L':role,'2L':'baron','2R':'saint','1R':'imp'},initialAlignment:{self:'good','1L':'good','2L':'evil','2R':'good','1R':'evil'},currentAlignment:{self:'good','1L':'good','2L':'evil','2R':'good','1R':'evil'},believedRoles:role==='drunk'?{'1L':'empath'}:{},alive:['self','1L','2L','2R','1R'],redHerring:null,poison:{},requiredPoison,info:{},changes:[],arbitraryDeathNights:[],logScore:0,assumptions:[],ended:false});
  const healthy=empathShiftLogBonus(mk('empath'),signals,g);
  const drunk=empathShiftLogBonus(mk('drunk'),signals,g);
  const poisoned=empathShiftLogBonus(mk('empath',{2:'1L'}),signals,g);
  assert(drunk>healthy);assert(poisoned>healthy);
});

test('Fortune Teller treats any Demon character as a positive, not only Imp',()=>{
  const c=context({self:'fortune_teller','1L':'chef','2L':'saint','2R':'spy','1R':'po'});
  assert(infoMatches('fortune_teller','self',{kind:'pairYesNo',players:['1R','1L'],result:'yes'},c));
});

test('Goblin is available to custom scripts as an execution-risk Minion',()=>{
  assert.equal(ROLES.goblin.type,'minion');
  assert(ROLES.goblin.tags.includes('ALTERNATE_WIN_CONDITION'));
  assert(ROLES.goblin.tags.includes('ON_EXECUTION'));
});

test('Spy 2.1 advisor supplies fake info and frames a known Saint while protecting the Demon seat',()=>{
  const g=game(8);g.selfRole.shownRole='spy';g.night=2;
  g.minionState={knownDemon:{playerId:'1R',source:'minion_info'},knownMinions:[],sharedStorytellerBluffs:[],bluffPlans:{},spyInitialRoles:{'1L':'washerwoman','2L':'saint','3L':'chef','4L':'empath','3R':'fortune_teller','2R':'monk','1R':'imp'},spyRedHerring:'1L',becameDemonAt:null};
  g.minionActionLog=[];g.demonActionLog=[];
  const r=runSpyBluffAdvisor(g,false);
  assert(r.scapegoatPlayers.some(x=>x.playerId==='2L'&&x.roleId==='saint'));
  assert.equal(r.knownDemonPlayerId,'1R');
  const chef=r.candidates.find(c=>c.roleId==='chef');
  assert(chef);assert(chef.falseInfo);
  assert.notEqual(chef.knownDemonGoodShare,null);
  assert.notEqual(chef.falseInfo.knownDemonGoodShare,null);
});
