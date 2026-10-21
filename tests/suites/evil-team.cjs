const { test } = require('../harness.cjs');
const { assert, seats, evaluateAssignment, runSearch, analyzeEvidence, buildSpyOpponentProjection, runSpyBluffAdvisor, validateSnapshot, ROLES, game } = require('../fixtures.cjs');

test('Demon mode locks self, known Minion seats, exact teammate roles, and Storyteller bluffs',()=>{
  const g=game(10);g.selfRole.shownRole='imp';g.demonState={knownMinions:[{playerId:'1L',source:'demon_info',roleId:'poisoner'},{playerId:'2R',source:'demon_info',roleId:'scarlet_woman'}],storytellerBluffs:['soldier','mayor','monk'],bluffPlans:{self:'chef','1L':'empath'}};g.demonActionLog=[];
  const r=runSearch(g,{attempts:1800,seed:947,maxMillis:5000,beamWidth:2});
  assert(r.worlds.length>0);
  for(const w of r.worlds){
    assert.equal(w.initial.self,'imp');assert.equal(w.initial['1L'],'poisoner');assert.equal(w.initial['2R'],'scarlet_woman');
    for(const bluff of g.demonState.storytellerBluffs)assert(!Object.values(w.initial).includes(bluff));
  }
});

test('Demon attack record constrains ordinary night death to the selected target',()=>{
  const g=game(10);g.night=2;g.selfRole.shownRole='imp';g.demonState={knownMinions:[{playerId:'1L',source:'demon_info',roleId:'poisoner'},{playerId:'2L',source:'demon_info',roleId:'spy'}],storytellerBluffs:[],bluffPlans:{}};g.demonActionLog=[{id:10,roleId:'imp',when:'N2',target:'3L',note:null}];g.deathLog=[{id:11,playerId:'3L',when:'N2',reason:'night_death'}];
  const w={self:'imp','1L':'poisoner','2L':'spy','3L':'washerwoman','4L':'librarian','5L':'investigator','4R':'chef','3R':'empath','2R':'fortune_teller','1R':'undertaker'};
  assert(evaluateAssignment(w,g).length>0);
  g.deathLog=[{id:11,playerId:'4L',when:'N2',reason:'night_death'}];
  assert.equal(evaluateAssignment(w,g).length,0);
});

test('Demon may deliberately sink a kill into an already-dead player',()=>{
  const g=game(10);g.night=2;g.selfRole.shownRole='imp';g.completedNights=[2];g.demonActionLog=[{id:10,roleId:'imp',when:'N2',target:'3L',note:null}];g.deathLog=[{id:9,playerId:'3L',when:'D1',reason:'execution'}];
  const w={self:'imp','1L':'poisoner','2L':'spy','3L':'washerwoman','4L':'librarian','5L':'investigator','4R':'chef','3R':'empath','2R':'fortune_teller','1R':'undertaker'};
  assert(evaluateAssignment(w,g).length>0);
});

test('Imp self-kill with a healthy Scarlet Woman passes to Scarlet Woman first',()=>{
  const g=game(10);g.night=2;g.selfRole.shownRole='imp';g.demonActionLog=[{id:10,roleId:'imp',when:'N2',target:'self',note:null}];g.deathLog=[{id:11,playerId:'self',when:'N2',reason:'night_death'}];
  const w={self:'imp','1L':'scarlet_woman','2L':'spy','3L':'washerwoman','4L':'librarian','5L':'investigator','4R':'chef','3R':'empath','2R':'fortune_teller','1R':'undertaker'};
  const hs=evaluateAssignment(w,g);assert(hs.length>0);assert(hs.every(x=>x.current['1L']==='imp'&&x.current['2L']==='spy'));
});

test('Demon-state import rejects a non-Minion exact teammate role',()=>{
  const g=game(10);g.selfRole.shownRole='imp';g.demonState={knownMinions:[{playerId:'1L',source:'demon_info',roleId:'chef'}],storytellerBluffs:[],bluffPlans:{}};g.demonActionLog=[];assert.equal(validateSnapshot(g),false);
});

test('Minion mode locks self, known Demon, fellow Minions, and shared ST bluffs',()=>{
  const g=game(10);g.selfRole.shownRole='poisoner';
  g.minionState={knownDemon:{playerId:'1R',source:'minion_info'},knownMinions:[{playerId:'1L',source:'minion_info',roleId:'spy'}],sharedStorytellerBluffs:['soldier','mayor','monk'],bluffPlans:{self:'chef'},spyInitialRoles:{},spyRedHerring:null,becameDemonAt:null};
  g.minionActionLog=[];g.demonActionLog=[];
  const r=runSearch(g,{attempts:1800,seed:195,maxMillis:5000,beamWidth:2});
  assert(r.worlds.length>0);
  for(const w of r.worlds){
    assert.equal(w.initial.self,'poisoner');assert.equal(w.initial['1R'],'imp');assert.equal(w.initial['1L'],'spy');
    for(const bluff of g.minionState.sharedStorytellerBluffs)assert(!Object.values(w.initial).includes(bluff));
  }
});

test('Own Poisoner action fixes that nights poison target and produces a direct green marker',()=>{
  const g=game(10);g.selfRole.shownRole='poisoner';g.minionState={knownDemon:{playerId:'1R',source:'minion_info'},knownMinions:[{playerId:'1L',source:'minion_info',roleId:'spy'}],sharedStorytellerBluffs:[],bluffPlans:{},spyInitialRoles:{},spyRedHerring:null,becameDemonAt:null};g.minionActionLog=[{id:40,roleId:'poisoner',kind:'poison',when:'N1',target:'2L',note:null}];
  const w={self:'poisoner','1L':'spy','2L':'washerwoman','3L':'librarian','4L':'investigator','5L':'chef','4R':'empath','3R':'fortune_teller','2R':'undertaker','1R':'imp'};
  const hs=evaluateAssignment(w,g);assert(hs.length>0);assert(hs.every(x=>x.poison[1]==='2L'));
  assert(analyzeEvidence(g).players['2L'].warnings.some(x=>x.color==='green'&&x.cycle===1));
});

test('A mismatching Spy Grimoire remains possible only through Spy poisoning',()=>{
  const g=game(10);g.selfRole.shownRole='spy';g.minionState={knownDemon:{playerId:'1R',source:'minion_info'},knownMinions:[{playerId:'1L',source:'minion_info',roleId:'poisoner'}],sharedStorytellerBluffs:[],bluffPlans:{},spyInitialRoles:{'2L':'mayor'},spyRedHerring:null,becameDemonAt:null};g.minionActionLog=[];
  const w={self:'spy','1L':'poisoner','2L':'washerwoman','3L':'librarian','4L':'investigator','5L':'chef','4R':'empath','3R':'fortune_teller','2R':'undertaker','1R':'imp'};
  const hs=evaluateAssignment(w,g,20);assert(hs.length>0);assert(hs.every(x=>x.poison[1]==='self'));
});

test('Healthy Spy poison reminder matches the real poison target, but a poisoned Spy can be misinformed',()=>{
  const g=game(10);g.selfRole.shownRole='spy';g.minionState={knownDemon:{playerId:'1R',source:'minion_info'},knownMinions:[{playerId:'1L',source:'minion_info',roleId:'poisoner'}],sharedStorytellerBluffs:[],bluffPlans:{},spyInitialRoles:{},spyRedHerring:null,becameDemonAt:null};g.minionActionLog=[{id:41,roleId:'spy',kind:'grimoire',when:'N1',poisonTarget:'2L',note:null}];
  const w={self:'spy','1L':'poisoner','2L':'washerwoman','3L':'librarian','4L':'investigator','5L':'chef','4R':'empath','3R':'fortune_teller','2R':'undertaker','1R':'imp'};
  const hs=evaluateAssignment(w,g,20);assert(hs.length>0);assert(hs.every(x=>x.poison[1]==='2L'||x.poison[1]==='self'));
  assert(analyzeEvidence(g).players['2L'].warnings.some(x=>x.color==='green'&&x.cycle===1));
});

test('Scarlet Woman takeover can be recorded as direct self Demon succession',()=>{
  const g=game(10);g.night=2;g.selfRole.shownRole='scarlet_woman';g.minionState={knownDemon:{playerId:'1R',source:'minion_info'},knownMinions:[{playerId:'1L',source:'minion_info',roleId:'spy'}],sharedStorytellerBluffs:[],bluffPlans:{},spyInitialRoles:{},spyRedHerring:null,becameDemonAt:'D1'};g.minionActionLog=[];g.deathLog=[{id:50,playerId:'1R',when:'D1',reason:'execution'}];
  const w={self:'scarlet_woman','1L':'spy','2L':'washerwoman','3L':'librarian','4L':'investigator','5L':'chef','4R':'empath','3R':'fortune_teller','2R':'undertaker','1R':'imp'};
  const hs=evaluateAssignment(w,g);assert(hs.length>0);assert(hs.every(x=>x.current.self==='imp'&&x.changes.some(c=>c.to==='self'&&c.when==='D1')));
});

test('Minion-state import rejects self as known Demon and non-Minion teammate roles',()=>{
  const a=game(10);a.selfRole.shownRole='poisoner';a.minionState={knownDemon:{playerId:'self',source:'minion_info'},knownMinions:[],sharedStorytellerBluffs:[],bluffPlans:{},spyInitialRoles:{},spyRedHerring:null,becameDemonAt:null};a.minionActionLog=[];assert.equal(validateSnapshot(a),false);
  const b=game(10);b.selfRole.shownRole='poisoner';b.minionState={knownDemon:{playerId:'1R',source:'minion_info'},knownMinions:[{playerId:'1L',source:'minion_info',roleId:'chef'}],sharedStorytellerBluffs:[],bluffPlans:{},spyInitialRoles:{},spyRedHerring:null,becameDemonAt:null};b.minionActionLog=[];assert.equal(validateSnapshot(b),false);
});

test('Spy opponent projection strips private evil knowledge and self-only whispers',()=>{
  const g=game(7);g.selfRole.shownRole='spy';
  g.minionState={knownDemon:{playerId:'1R',source:'minion_info'},knownMinions:[],sharedStorytellerBluffs:['mayor'],bluffPlans:{self:'chef'},spyInitialRoles:{'1L':'washerwoman'},spyRedHerring:'2L',becameDemonAt:null};
  g.minionActionLog=[{id:71,roleId:'spy',kind:'grimoire',when:'N1',poisonTarget:null,note:'secret'}];
  g.roleClaimLog=[
    {id:72,playerId:'self',subject:{kind:'role',roleId:'chef'},claimType:'bluff',origin:'manual',visibility:'public',recipients:[],when:'D1'},
    {id:73,playerId:'1L',subject:{kind:'role',roleId:'empath'},claimType:'normal',origin:'manual',visibility:'private',recipients:['self'],when:'D1'},
    {id:74,playerId:'2L',subject:{kind:'role',roleId:'fortune_teller'},claimType:'bluff',origin:'manual',visibility:'public',recipients:[],when:'D1'},
  ];
  const projected=buildSpyOpponentProjection(g);
  assert.equal(projected.selfRole.shownRole,null);
  assert.equal(projected.minionState.knownDemon,null);
  assert.equal(projected.minionActionLog.length,0);
  assert(!projected.roleClaimLog.some(c=>c.playerId==='self'));
  assert(!projected.roleClaimLog.some(c=>c.id===73));
  assert.equal(projected.roleClaimLog.find(c=>c.id===74).claimType,'normal');
});

test('Spy bluff advisor ranks only good roles and returns a collision-aware recommendation',()=>{
  const g=game(5);g.selfRole.shownRole='spy';
  g.minionState={knownDemon:null,knownMinions:[],sharedStorytellerBluffs:[],bluffPlans:{},spyInitialRoles:{'1L':'washerwoman','2L':'chef','2R':'empath','1R':'imp'},spyRedHerring:null,becameDemonAt:null};
  g.minionActionLog=[];g.demonActionLog=[];
  const r=runSpyBluffAdvisor(g,false);
  assert(r.candidates.length>0);
  assert(r.candidates.every(c=>['townsfolk','outsider'].includes(require('../../.engine-test/roles.js').ROLES[c.roleId].type)));
  assert(r.recommendedRoleId);
  assert(r.baseUnique>0);
  const washer=r.candidates.find(c=>c.roleId==='washerwoman');
  assert.equal(washer.spyShownInPlayAt,'1L');
  assert.equal(washer.safeEligible,false);
});
