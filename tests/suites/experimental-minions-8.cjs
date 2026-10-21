const { test } = require('../harness.cjs');
const { assert, seats, observations, validSetup, evaluateAssignment, runSearch, hardLocks, analyzeEvidence, nominationAdvice, validateSnapshot, ROLES, ALL_CORE_ROLE_IDS, BUILT_IN_SCRIPTS, game, claim, base, customGame, phase8Symbols } = require('../fixtures.cjs');

test('Phase 8 Minions have Japanese glyphs and are custom-script-only',()=>{
 for(const [id,symbol] of Object.entries(phase8Symbols)){
  assert.equal(ROLES[id].symbol,symbol);assert(ALL_CORE_ROLE_IDS.includes(id));
  assert.equal(ROLES[id].type,'minion');
  for(const s of BUILT_IN_SCRIPTS)assert(!s.roleIds.includes(id));
 }
});

test('Marionette can occupy either Demon neighbour',()=>{
 const w={self:'imp','1L':'marionette','2L':'chef','2R':'empath','1R':'general'};
 const g=customGame(w);g.selfRole.shownRole='imp';
 assert(validSetup(w,g));
 const reversed={...w,'1L':'general','1R':'marionette'};
 assert(validSetup(reversed,g));
});

test('Nonadjacent Marionette is not a legal world',()=>{
 const w={self:'imp','1L':'chef','2L':'marionette','2R':'empath','1R':'general'};
 assert(!validSetup(w,customGame(w)));
});

test('Demon knowledge of Marionette acts as a direct seat lock',()=>{
 const w={self:'imp','1L':'marionette','2L':'chef','2R':'empath','1R':'general'};
 const g=customGame(w);g.selfRole.shownRole='imp';g.demonState={knownMarionette:'1L'};
 assert.equal(hardLocks(g).locks['1L'],'marionette');
 assert(validSetup(w,g));
 g.demonState.knownMarionette='1R';assert(!validSetup(w,g));
});

test('A Marionette can see an unused Townsfolk token without changing evil alignment',()=>{
 const w={self:'marionette','1L':'imp','2L':'chef','2R':'empath','1R':'general'};
 const g=customGame(w);g.scriptRoleIds.push('slayer');g.selfRole.shownRole='slayer';
 assert(validSetup(w,g));
 const hist=evaluateAssignment(w,g);assert(hist.length);
 assert(hist.every(x=>x.initialAlignment.self==='evil' && x.believedRoles.self==='slayer'));
});

test('A Marionette token cannot duplicate a genuine in-play role',()=>{
 const w={self:'marionette','1L':'imp','2L':'chef','2R':'empath','1R':'general'};
 const g=customGame(w);g.selfRole.shownRole='chef';
 assert(!validSetup(w,g));
});

test('Marionette contradictory public role claim remains a bluff, not impossible reality',()=>{
 const w={self:'imp','1L':'marionette','2L':'chef','2R':'empath','1R':'general'};
 const g=customGame(w);g.selfRole.shownRole='imp';g.scriptRoleIds.push('monk');claim(g,'1L','chef',981);
 const worlds=evaluateAssignment(w,g);assert(worlds.length);
 assert(worlds.every(x=>x.believedRoles['1L']!=='chef'));
});

test('Boffin can grant a not-in-play good ability to the Demon',()=>{
 const w={self:'boffin','1L':'imp','2L':'chef','2R':'empath','1R':'general'};
 const g=customGame(w);g.scriptRoleIds.push('slayer');g.selfRole.shownRole='boffin';
 g.minionState={boffinGrantedAbility:'slayer'};
 assert(validSetup(w,g));
 const histories=evaluateAssignment(w,g);assert(histories.length);
 assert(histories.every(h=>h.boffinGrantedAbility==='slayer'));
});

test('Boffin cannot grant a good ability that is actually in play',()=>{
 const w={self:'boffin','1L':'imp','2L':'chef','2R':'empath','1R':'general'};
 const g=customGame(w);g.selfRole.shownRole='boffin';g.minionState={boffinGrantedAbility:'chef'};
 assert(!validSetup(w,g));assert.equal(evaluateAssignment(w,g).length,0);
});

test('Boffin possibilities cannot be narrowed away by standard Slayer confirmation',()=>{
 const g=game(5);g.playset='custom:phase8';g.scriptRoleIds=[...new Set([...Object.values(base),'boffin','slayer'])];
 g.abilityTriggerLog=[{id:981,roleId:'slayer',rolePlayerId:'1L',targetPlayerId:'1R',when:'D1',triggered:true}];
 assert.equal(hardLocks(g).locks['1L'],undefined);
 const e=analyzeEvidence(g).players['1L'];assert.equal(e.confirmedRole,undefined);
 assert(e.reasons.some(r=>r.code==='boffinPublicAbility'));
});

test('Without Boffin, successful Slayer retains a hard role confirmation',()=>{
 const g=game(5);g.abilityTriggerLog=[{id:982,roleId:'slayer',rolePlayerId:'1L',targetPlayerId:'1R',when:'D1',triggered:true}];
 assert.equal(hardLocks(g).locks['1L'],'slayer');
 assert.equal(analyzeEvidence(g).players['1L'].confirmedRole,'slayer');
});

test('Boffin-gifted Virgin can produce a public trigger from a Demon',()=>{
 const w={self:'imp','1L':'boffin','2L':'chef','2R':'empath','1R':'general'};
 const g=customGame(w);g.selfRole.shownRole='imp';g.scriptRoleIds.push('virgin');
 g.demonState={boffinGrantedAbility:'virgin'};
 g.nominationLog=[{id:985,when:'D1',nominator:'2L',nominee:'self',voters:[]}];
 g.abilityTriggerLog=[{id:986,when:'D1',roleId:'virgin',rolePlayerId:'self',targetPlayerId:'2L',triggered:true,sourceEventId:985}];
 assert(evaluateAssignment(w,g).length>0);
});

test('Fearmonger warning checkbox reduces execution enthusiasm without proving role',()=>{
 const g=customGame({self:'empath','1L':'imp','2L':'fearmonger','2R':'chef','1R':'general'});
 const result={unique:150,effectiveWorlds:80,players:{'1L':{demon:.67,evil:.89,roles:{}}}};
 assert.equal(nominationAdvice(g,result,'1L').verdict,'support');
 g.fearmongerActive=true;
 const advise=nominationAdvice(g,result,'1L');assert.equal(advise.verdict,'hold');
 assert(advise.risks.some(r=>r.code==='fearmongerExecutionRisk'));
 assert(validateSnapshot(g));g.scriptRoleIds=g.scriptRoleIds.filter(r=>r!=='fearmonger');assert(!validateSnapshot(g));
});

test('Boomdandy public claim warns against executions',()=>{
 const g=customGame({self:'empath','1L':'imp','2L':'boomdandy','2R':'chef','1R':'general'});
 claim(g,'2L','boomdandy',990);
 const result={unique:150,effectiveWorlds:80,players:{'2L':{demon:.7,evil:.9,roles:{}}}};
 const a=nominationAdvice(g,result,'2L');
 assert.equal(a.verdict,'hold');assert(a.risks.some(r=>r.code==='boomdandyExecutionRisk'));
});

test('Boomdandy explosion record preserves 3 survivors and mass death',()=>{
 const w={self:'imp','1L':'boomdandy','2L':'chef','2R':'empath','1R':'general'};
 const g=customGame(w);g.selfRole.shownRole='imp';
 g.deathLog=[{id:992,when:'D1',playerId:'1L',reason:'execution'},
 {id:993,when:'D1',playerId:'2L',reason:'ability',sourceRoleId:'boomdandy',sourcePlayerId:'1L',sourceEventId:999}];
 g.boomdandyLog=[{id:999,when:'D1',executedPlayer:'1L',survivors:['self','2R','1R'],pointedPlayer:null,tied:true}];
 assert(validateSnapshot(g));
 const histories=evaluateAssignment(w,g);assert(histories.length);
 assert(histories.every(h=>h.alive.length===3&&h.alive.includes('self')&&!h.alive.includes('2L')));
});

test('Boomdandy explosion cannot leave a Demon outside the survivors',()=>{
 const w={self:'imp','1L':'boomdandy','2L':'chef','2R':'empath','1R':'general'};
 const g=customGame(w);g.selfRole.shownRole='imp';
 g.deathLog=[{id:995,when:'D1',playerId:'1L',reason:'execution'},
 {id:996,when:'D1',playerId:'self',reason:'ability',sourceRoleId:'boomdandy'}];
 g.boomdandyLog=[{id:1000,when:'D1',executedPlayer:'1L',survivors:['2L','2R','1R'],pointedPlayer:null,tied:true}];
 assert.equal(evaluateAssignment(w,g).length,0);
});

test('Invalid Boomdandy survivor count fails import validation',()=>{
 const g=customGame({self:'imp','1L':'boomdandy','2L':'chef','2R':'empath','1R':'general'});
 g.boomdandyLog=[{id:1001,when:'D1',executedPlayer:'1L',survivors:['self','2R'],pointedPlayer:null,tied:true}];
 assert(!validateSnapshot(g));
});

test('Harpy victim report can be saved without becoming a Harpy role claim',()=>{
 const g=customGame({self:'empath','1L':'imp','2L':'harpy','2R':'chef','1R':'general'});
 g.abilityClaimLog=[{id:1002,playerId:'2R',roleId:'harpy',affectedByHarpy:true,when:'D1',targets:['1R'],result:'相手を悪と言うよう求められた',visibility:'public',recipients:[]}];
 assert(validateSnapshot(g));assert.equal(observations(g).length,0);
 assert.equal(g.roleClaimLog.length,0);
});

test('Invalid Harpy victim report (self-accusation) is rejected',()=>{
 const g=customGame({self:'empath','1L':'imp','2L':'harpy','2R':'chef','1R':'general'});
 g.abilityClaimLog=[{id:1003,playerId:'2R',roleId:'harpy',affectedByHarpy:true,when:'D1',targets:['2R'],result:null,visibility:'public',recipients:[]}];
 assert(!validateSnapshot(g));
});

test('Harpy selected pair enables either target to die during the day',()=>{
 const w={self:'harpy','1L':'imp','2L':'chef','2R':'empath','1R':'general'};
 const g=customGame(w);g.selfRole.shownRole='harpy';g.minionActionLog=[{id:1004,roleId:'harpy',kind:'madness_pair',when:'N1',target:'2L',accuse:'2R',note:null}];
 g.deathLog=[{id:1005,when:'D1',playerId:'2L',reason:'ability',sourceRoleId:'harpy'}];
 assert(validateSnapshot(g));assert(evaluateAssignment(w,g).length>0);
 g.deathLog=[{id:1006,when:'D1',playerId:'1R',reason:'ability',sourceRoleId:'harpy'}];
 assert.equal(evaluateAssignment(w,g).length,0);
});

test('Fearmonger own successful execution ends the game for the chosen team',()=>{
 const w={self:'fearmonger','1L':'imp','2L':'chef','2R':'empath','1R':'general'};
 const g=customGame(w);g.selfRole.shownRole='fearmonger';
 g.minionActionLog=[{id:1007,roleId:'fearmonger',kind:'choose',when:'N1',target:'2L',note:null}];
 g.nominationLog=[{id:1008,when:'D1',nominator:'self',nominee:'2L',voters:['self','1L','2R'],voteTotal:3,executed:true}];
 g.deathLog=[{id:1009,when:'D1',playerId:'2L',reason:'execution'}];
 assert(validateSnapshot(g));
 const histories=evaluateAssignment(w,g);assert(histories.length);
 assert(histories.every(h=>h.ended&&h.endReason==='fearmonger'&&h.fearmongerWinner==='evil'));
});

test('A plain prior save remains valid without the new phase 8 fields',()=>{
 const g=game();assert(validateSnapshot(g));
 assert.equal(g.boomdandyLog,undefined);assert.equal(g.fearmongerActive,undefined);
});

test('Boomdandy can explode even when the execution does not kill it',()=>{
 const w={self:'imp','1L':'boomdandy','2L':'chef','2R':'empath','1R':'general'};
 const g=customGame(w);g.selfRole.shownRole='imp';
 g.nominationLog=[{id:12001,when:'D1',nominator:'2L',nominee:'1L',voters:['self','2L','1R'],voteTotal:3,executed:true}];
 g.deathLog=[{id:12002,when:'D1',playerId:'2L',reason:'ability',sourceRoleId:'boomdandy',sourceEventId:12005},
 {id:12003,when:'D1',playerId:'1R',reason:'ability',sourceRoleId:'boomdandy',sourceEventId:12005}];
 g.boomdandyLog=[{id:12005,when:'D1',executedPlayer:'1L',survivors:['self','1L','2R'],pointedPlayer:null,tied:true}];
 assert(validateSnapshot(g));const hist=evaluateAssignment(w,g);
 assert(hist.length);assert(hist.every(h=>h.alive.includes('1L')&&h.alive.length===3));
});

test('Fearmonger warning combines with Goblin risk for a marked target',()=>{
 const w={self:'empath','1L':'imp','2L':'fearmonger','2R':'chef','1R':'general'};
 const g=customGame(w);g.fearmongerActive=true;g.scriptRoleIds.push('goblin');
 claim(g,'1L','goblin',12101);
 const sample={unique:150,effectiveWorlds:80,players:{'1L':{demon:.75,evil:.95,roles:{}}}};
 const advice=nominationAdvice(g,sample,'1L');assert.equal(advice.verdict,'hold');
 assert(advice.risks.some(r=>r.code==='fearmongerExecutionRisk'));
 assert(advice.risks.some(r=>r.code==='goblinExecutionRisk'));
});

test('Sampler explores normal Marionette assignments without locking hidden evil to good',()=>{
 const g=game();g.playset='custom:phase8';g.scriptRoleIds=['imp','marionette','chef','empath','general','monk','slayer'];
 g.selfRole.shownRole='monk';
 const sampled=runSearch(g,{attempts:700,seed:8091,beamWidth:1,maxMillis:5000});
 assert(sampled.unique>0);
 assert(sampled.worlds.every(w=>!Object.values(w.initial).includes('marionette')||
  (()=>{const ps=seats(5), d=ps.find(p=>w.initial[p]==='imp'),m=ps.find(p=>w.initial[p]==='marionette');
    const i=ps.indexOf(d);return m===ps[(i+1)%ps.length]||m===ps[(i+4)%ps.length]})()));
});
