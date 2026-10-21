const { test } = require('../harness.cjs');
const { assert, setupCountOptionsForGame, validSetup, evaluateAssignment, infoMatches, drawAssignment, rng, minionPatternLogBonus, validateSnapshot, ROLES, BUILT_IN_SCRIPTS, game, context, claim, customGame } = require('../fixtures.cjs');

test('Eight phase-9 Minions are custom-script roles with stable kanji',()=>{
 const expected={mezepheles:'言',organ_grinder:'奏',psychopath:'凶',summoner:'喚',widow:'寡',wizard:'願',wraith:'幽',xaan:'惨'};
 for(const [id,symbol] of Object.entries(expected)){
   assert.equal(ROLES[id].symbol,symbol);assert.equal(ROLES[id].type,'minion');
   for(const script of BUILT_IN_SCRIPTS) assert(!script.roleIds.includes(id));
 }
});

test('Summoner setup contains no starting Demon, one more Townsfolk',()=>{
 const w={self:'summoner','1L':'chef','2L':'monk','2R':'empath','1R':'general'};
 const g=customGame(w);g.selfRole.shownRole='summoner';g.scriptRoleIds.push('imp');
 assert(validSetup(w,g));assert(!validSetup({...w,'1L':'imp'},g));
 assert.deepEqual(setupCountOptionsForGame(g,Object.values(w)),[{townsfolk:4,outsider:0,minion:1,demon:0}]);
 assert(evaluateAssignment(w,g).length>0);
});

test('Summoner setup preserves Baron changes to Outsider count',()=>{
 const g=game(10);g.playset='custom:test';g.scriptRoleIds=['summoner','baron','imp','chef','empath','monk','general','soldier','mayor','undertaker','recluse','drunk','saint','butler'];
 assert(setupCountOptionsForGame(g,['summoner','baron']).some(x=>x.townsfolk===6&&x.outsider===2&&x.minion===2&&x.demon===0));
});

test('Summoner sampler produces valid Demon-less starting worlds',()=>{
 const w={self:'summoner','1L':'chef','2L':'monk','2R':'empath','1R':'general'};
 const g=customGame(w);g.selfRole.shownRole='summoner';g.scriptRoleIds.push('imp');
 for(let seed=0;seed<18;seed++){
   const initial=drawAssignment(g,rng(seed),{self:'summoner'});
   assert(initial,`seed ${seed}`);assert(validSetup(initial,g));
   assert.equal(Object.values(initial).filter(r=>ROLES[r].type==='demon').length,0);
 }
});

test('Summoner N3 creates recorded evil Demon without a starting Demon',()=>{
 const w={self:'summoner','1L':'chef','2L':'monk','2R':'empath','1R':'general'};
 const g=customGame(w);g.night=3;g.selfRole.shownRole='summoner';g.scriptRoleIds.push('imp');
 g.minionState={knownDemon:null,knownMinions:[],sharedStorytellerBluffs:[],bluffPlans:{},spyInitialRoles:{},spyRedHerring:null,becameDemonAt:null,summonedDemon:{when:'N3',playerId:'1R',demonRole:'imp'}};
 assert(validateSnapshot(g));const worlds=evaluateAssignment(w,g,10);
 assert(worlds.length);assert(worlds.every(world=>world.current['1R']==='imp'&&world.currentAlignment['1R']==='evil'));
 assert(worlds.every(world=>world.initial['1R']==='general'&&world.changes.some(x=>x.kind==='summoner'&&x.playerId==='1R')));
});

test('Summoner death before N3 ends the no-Demon scenario',()=>{
 const w={self:'summoner','1L':'chef','2L':'monk','2R':'empath','1R':'general'};
 const g=customGame(w);g.selfRole.shownRole='summoner';g.scriptRoleIds.push('imp');
 g.deathLog=[{id:90001,when:'D1',playerId:'self',reason:'execution'}];
 const hs=evaluateAssignment(w,g);
 assert(hs.length);assert(hs.every(x=>x.ended&&x.endReason==='summoner'));
});

test('Mezepheles turns a chosen good player evil at the following night',()=>{
 const w={self:'mezepheles','1L':'chef','2L':'monk','2R':'empath','1R':'imp'};
 const g=customGame(w);g.night=2;g.selfRole.shownRole='mezepheles';
 g.minionActionLog=[{id:90101,roleId:'mezepheles',kind:'secret_word',when:'D1',target:'1L',word:'blue',transformed:true}];
 assert(validateSnapshot(g));const hs=evaluateAssignment(w,g);
 assert(hs.length);assert(hs.every(x=>x.currentAlignment['1L']==='evil'&&x.mezephelesUsed));
 g.minionActionLog[0].transformed=false;
 assert.equal(evaluateAssignment(w,g).length,0);
});

test('Mezepheles cannot convert an already-evil player',()=>{
 const w={self:'mezepheles','1L':'chef','2L':'monk','2R':'empath','1R':'imp'};
 const g=customGame(w);g.night=2;g.selfRole.shownRole='mezepheles';
 g.minionActionLog=[{id:90111,roleId:'mezepheles',kind:'secret_word',when:'D1',target:'1R',word:'blue',transformed:true}];
 assert.equal(evaluateAssignment(w,g).length,0);
});

test('Widow poisoned player and notification records survive import',()=>{
 const w={self:'widow','1L':'chef','2L':'monk','2R':'empath','1R':'imp'};
 const g=customGame(w);g.selfRole.shownRole='widow';
 g.minionState={knownDemon:null,knownMinions:[],sharedStorytellerBluffs:[],bluffPlans:{},spyInitialRoles:{},spyRedHerring:null,becameDemonAt:null,widowPoisonedPlayer:'1L'};
 g.widowReports=[{id:90201,when:'D1',playerId:'2R'}];
 assert(validateSnapshot(g));const hs=evaluateAssignment(w,g);
 assert(hs.length);assert(hs.every(x=>x.widowTarget==='1L'));
 const bad=structuredClone(g);bad.widowReports[0].playerId='not a seat';assert(!validateSnapshot(bad));
});

test('Xaan poison on Night X explains otherwise impossible Townsfolk information',()=>{
 const w={self:'empath','1L':'recluse','2L':'chef','2R':'xaan','1R':'imp'};
 const g=customGame(w);g.selfRole.shownRole='empath';
 g.selfInfoLog=[{id:90301,roleId:'empath',when:'N1',number:0}];
 assert(validSetup(w,g));assert(validateSnapshot(g));
 const hs=evaluateAssignment(w,g);
 assert(hs.length);assert(hs.some(x=>x.xaanTriggered===1&&x.info[90301]==='poison'));
});

test('Xaan with zero Outsiders never poisons on Night 1',()=>{
 const w={self:'empath','1L':'monk','2L':'chef','2R':'xaan','1R':'imp'};
 const g=customGame(w);g.selfRole.shownRole='empath';
 g.selfInfoLog=[{id:90311,roleId:'empath',when:'N1',number:0}];
 assert(validSetup(w,g));assert.equal(evaluateAssignment(w,g).length,0);
});

test('Psychopath death is only compatible with an active Psychopath actor',()=>{
 const w={self:'chef','1L':'psychopath','2L':'monk','2R':'empath','1R':'imp'};
 const g=customGame(w);g.psychopathEvents=[{id:90401,when:'D1',playerId:'1L',target:'2L',killed:true}];
 g.deathLog=[{id:90402,when:'D1',playerId:'2L',reason:'psychopath',sourceRoleId:'psychopath',sourcePlayerId:'1L',sourceEventId:90401}];
 assert(validateSnapshot(g));assert(evaluateAssignment(w,g).length>0);
 g.deathLog[0].sourcePlayerId='2R';assert.equal(evaluateAssignment(w,g).length,0);
});

test('Psychopath kill record must have linked death and valid source',()=>{
 const w={self:'chef','1L':'psychopath','2L':'monk','2R':'empath','1R':'imp'};
 const g=customGame(w);g.psychopathEvents=[{id:90411,when:'D1',playerId:'1L',target:'2L',killed:true}];
 assert.equal(evaluateAssignment(w,g).length,0);
 g.deathLog=[{id:90412,when:'D1',playerId:'2L',reason:'psychopath',sourceRoleId:'psychopath',sourcePlayerId:'1L',sourceEventId:90411}];
 assert(evaluateAssignment(w,g).length>0);
});

test('Psychopath hiding through Day 1 incurs soft penalty only',()=>{
 const w={self:'chef','1L':'psychopath','2L':'monk','2R':'empath','1R':'imp'};
 const g=customGame(w);g.night=2;const hist=evaluateAssignment(w,g);
 assert(hist.length);const hiddenPenalty=minionPatternLogBonus(g,hist[0]);assert(hiddenPenalty<0);
 claim(g,'1L','psychopath',90501);
 assert(minionPatternLogBonus(g,hist[0])>hiddenPenalty);
});

test('Widow notice and Mezepheles behavior change are soft contextual bonuses',()=>{
 const w={self:'mezepheles','1L':'chef','2L':'monk','2R':'empath','1R':'imp'};
 const g=customGame(w);let hist=evaluateAssignment(w,g);assert(hist.length);
 const before=minionPatternLogBonus(g,hist[0]);
 g.evilBehaviorReports=[{id:90511,when:'D1',playerId:'1L',note:'behavior changed'}];
 assert(minionPatternLogBonus(g,hist[0])>before);
 const widowW={...w,self:'widow'}, widowG=customGame(widowW), widowWorlds=evaluateAssignment(widowW,widowG);
 assert(widowWorlds.length);const wb=minionPatternLogBonus(widowG,widowWorlds[0]);
 widowG.widowReports=[{id:90512,when:'D1',playerId:'1L'}];
 assert(minionPatternLogBonus(widowG,widowWorlds[0])>wb);
});

test('Organ Grinder hidden votes do not become false Flowergirl evidence',()=>{
 const g=game(7);g.night=2;g.organGrinderVotes=[{id:90521,when:'D1',hidden:true}];
 g.nominationLog=[{id:90522,when:'D1',nominator:'2L',nominee:'1L',voters:[],votingOccurred:true}];
 const w={self:'flowergirl','1L':'artist','2L':'organ_grinder','3L':'oracle','3R':'dreamer','2R':'savant','1R':'vortox'};
 g.playset='custom:phase9';g.scriptRoleIds=Object.values(w);
 const c=context(w);
 assert(infoMatches('flowergirl','self',{kind:'singleYesNo',result:'yes'},c,g,'N2'));
 assert(infoMatches('flowergirl','self',{kind:'singleYesNo',result:'no'},c,g,'N2'));
 assert(validateSnapshot(g));
});

test('Summoner quiet early Demon nights are positive but weak evidence',()=>{
 const w={self:'summoner','1L':'chef','2L':'monk','2R':'empath','1R':'general'};
 const g=customGame(w);g.night=2;g.scriptRoleIds.push('imp');
 g.completedNights=[];let hist=evaluateAssignment(w,g);assert(hist.length);
 const first=minionPatternLogBonus(g,hist[0]);g.completedNights=[2];
 assert(minionPatternLogBonus(g,hist[0])>first);
});

test('Wizard and Wraith note data does not force impossible solver conclusions',()=>{
 const w={self:'wizard','1L':'chef','2L':'monk','2R':'empath','1R':'imp'};
 const g=customGame(w);g.selfRole.shownRole='wizard';
 g.minionState={knownDemon:null,knownMinions:[],sharedStorytellerBluffs:[],bluffPlans:{},spyInitialRoles:{},spyRedHerring:null,becameDemonAt:null,wizardWish:{when:'D1',wish:'More chaos',granted:true,price:'a price',clue:'a clue'},wraithNotes:[{when:'N1',note:'opened eyes'}]};
 g.scriptRoleIds.push('wraith');assert(validateSnapshot(g));assert(evaluateAssignment(w,g).length>0);
});

test('Xaan with two starting Outsiders poisons N2 and D2, not N1',()=>{
 const w={self:'empath','1L':'recluse','2L':'saint','3L':'chef','4L':'monk','4R':'general','3R':'soldier','2R':'xaan','1R':'imp'};
 const g=customGame(w,9);g.night=2;g.selfRole.shownRole='empath';
 g.selfInfoLog=[{id:90601,roleId:'empath',when:'N1',number:1},{id:90602,roleId:'empath',when:'N2',number:0}];
 assert(validSetup(w,g));const hs=evaluateAssignment(w,g,10);
 assert(hs.length);assert(hs.every(x=>x.xaanTriggered===2&&x.info[90601]==='works'&&x.info[90602]==='poison'));
});
