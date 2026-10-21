const { test } = require('../harness.cjs');
const { assert, seats, validSetup, evaluateAssignment, hardLocks, buildEvilOpponentProjection, rankCerenovusSuggestions, rankPitHagSuggestions, validateSnapshot, deleteEventGroup, game } = require('../fixtures.cjs');

test('Evil Twin direct setup info locks the good Twin character',()=>{
  const g=game(7);g.playset='custom:evil-twin';g.scriptRoleIds=['evil_twin','clockmaker','dreamer','flowergirl','oracle','seamstress','vortox'];g.selfRole.shownRole='evil_twin';
  g.minionState={knownDemon:null,knownMinions:[],sharedStorytellerBluffs:[],bluffPlans:{},spyInitialRoles:{},spyRedHerring:null,becameDemonAt:null,evilTwin:{playerId:'1L',roleId:'clockmaker'}};
  const locks=hardLocks(g);assert.equal(locks.locks.self,'evil_twin');assert.equal(locks.locks['1L'],'clockmaker');
  const good={self:'evil_twin','1L':'clockmaker','2L':'dreamer','3L':'flowergirl','3R':'oracle','2R':'seamstress','1R':'vortox'};
  assert(validSetup(good,g));assert.equal(validSetup({...good,'1L':'dreamer','2L':'clockmaker'},g),false);
});

test('Executing the healthy good Twin ends the game for evil',()=>{
  const g=game(7);g.playset='custom:evil-twin-win';g.scriptRoleIds=['evil_twin','clockmaker','dreamer','flowergirl','oracle','seamstress','vortox'];g.selfRole.shownRole='evil_twin';
  g.minionState={knownDemon:{playerId:'1R',source:'minion_info'},knownMinions:[],sharedStorytellerBluffs:[],bluffPlans:{},spyInitialRoles:{},spyRedHerring:null,becameDemonAt:null,evilTwin:{playerId:'1L',roleId:'clockmaker'}};
  g.deathLog=[{id:900,playerId:'1L',when:'D1',reason:'execution'}];
  const w={self:'evil_twin','1L':'clockmaker','2L':'dreamer','3L':'flowergirl','3R':'oracle','2R':'seamstress','1R':'vortox'};
  const hs=evaluateAssignment(w,g);assert(hs.length>0);assert(hs.every(h=>h.ended&&h.endReason==='evilTwin'));
});

test('Living Evil Twin pair blocks good victory when the Demon dies',()=>{
  const g=game(7);g.playset='custom:evil-twin-block';g.scriptRoleIds=['evil_twin','clockmaker','dreamer','flowergirl','oracle','seamstress','vortox'];g.selfRole.shownRole='evil_twin';
  g.minionState={knownDemon:{playerId:'1R',source:'minion_info'},knownMinions:[],sharedStorytellerBluffs:[],bluffPlans:{},spyInitialRoles:{},spyRedHerring:null,becameDemonAt:null,evilTwin:{playerId:'1L',roleId:'clockmaker'}};
  g.deathLog=[{id:901,playerId:'1R',when:'D1',reason:'execution'}];
  const w={self:'evil_twin','1L':'clockmaker','2L':'dreamer','3L':'flowergirl','3R':'oracle','2R':'seamstress','1R':'vortox'};
  const hs=evaluateAssignment(w,g);assert(hs.length>0);assert(hs.every(h=>!h.ended));
});

test('Healthy Witch curse must kill its cursed nominator while more than three live',()=>{
  const baseg=game(7);baseg.playset='custom:witch';baseg.scriptRoleIds=['witch','clockmaker','dreamer','flowergirl','oracle','seamstress','vortox'];baseg.selfRole.shownRole='witch';
  baseg.minionState={knownDemon:{playerId:'1R',source:'minion_info'},knownMinions:[],sharedStorytellerBluffs:[],bluffPlans:{},spyInitialRoles:{},spyRedHerring:null,becameDemonAt:null};
  baseg.nominationLog=[{id:910,nominator:'1L',nominee:'2L',when:'D1',voters:[]}];
  const w={self:'witch','1L':'clockmaker','2L':'dreamer','3L':'flowergirl','3R':'oracle','2R':'seamstress','1R':'vortox'};
  const good=structuredClone(baseg);good.minionActionLog=[{id:911,roleId:'witch',kind:'curse',when:'N1',target:'1L',triggered:true,note:null}];good.deathLog=[{id:912,playerId:'1L',when:'D1',reason:'ability',sourceRoleId:'witch',sourcePlayerId:'self',sourceEventId:911}];
  assert(evaluateAssignment(w,good).length>0);
  const bad=structuredClone(baseg);bad.minionActionLog=[{id:913,roleId:'witch',kind:'curse',when:'N1',target:'1L',triggered:false,note:null}];assert.equal(evaluateAssignment(w,bad).length,0);
});

test('Cerenovus madness execution requires the matching healthy nightly choice',()=>{
  const g=game(7);g.playset='custom:cerenovus';g.scriptRoleIds=['cerenovus','clockmaker','dreamer','flowergirl','oracle','seamstress','vortox'];g.selfRole.shownRole='cerenovus';
  g.minionState={knownDemon:{playerId:'1R',source:'minion_info'},knownMinions:[],sharedStorytellerBluffs:[],bluffPlans:{},spyInitialRoles:{},spyRedHerring:null,becameDemonAt:null};
  g.minionActionLog=[{id:920,roleId:'cerenovus',kind:'madness',when:'N1',target:'1L',madRole:'dreamer',note:null}];g.deathLog=[{id:921,playerId:'1L',when:'D1',reason:'ability',isExecution:true,sourceRoleId:'cerenovus',sourcePlayerId:'self',sourceEventId:920}];
  const w={self:'cerenovus','1L':'clockmaker','2L':'dreamer','3L':'flowergirl','3R':'oracle','2R':'seamstress','1R':'vortox'};
  assert(evaluateAssignment(w,g).length>0);const bad=structuredClone(g);bad.minionActionLog=[];assert.equal(evaluateAssignment(w,bad).length,0);
});

test('Vigormortis-killed Pit-Hag keeps acting while the Vigormortis ability remains active',()=>{
  const g=game(8);g.playset='custom:vigor-pit';g.scriptRoleIds=['pit_hag','vigormortis','clockmaker','dreamer','flowergirl','oracle','seamstress','artist','sweetheart'];g.night=3;g.selfRole.shownRole='pit_hag';
  g.minionState={knownDemon:{playerId:'1R',source:'minion_info'},knownMinions:[],sharedStorytellerBluffs:[],bluffPlans:{},spyInitialRoles:{},spyRedHerring:null,becameDemonAt:null};
  g.deathLog=[{id:930,playerId:'self',when:'N2',reason:'night_death',sourceRoleId:'vigormortis'}];g.minionActionLog=[{id:931,roleId:'pit_hag',kind:'transform',when:'N3',target:'2L',newRole:'sweetheart',note:null}];
  const w={self:'pit_hag','1L':'clockmaker','2L':'dreamer','3L':'flowergirl','4L':'oracle','3R':'seamstress','2R':'artist','1R':'vigormortis'};
  const hs=evaluateAssignment(w,g);assert(hs.length>0);assert(hs.every(h=>!h.alive.includes('self')&&h.current['2L']==='sweetheart'));
});

test('Evil opponent projection removes secret Twin and team information',()=>{
  const g=game(7);g.selfRole.shownRole='evil_twin';g.minionState={knownDemon:{playerId:'1R',source:'minion_info'},knownMinions:[],sharedStorytellerBluffs:['clockmaker'],bluffPlans:{self:'dreamer'},spyInitialRoles:{},spyRedHerring:null,becameDemonAt:null,evilTwin:{playerId:'1L',roleId:'oracle'}};
  const p=buildEvilOpponentProjection(g,true);assert.equal(p.selfRole.shownRole,null);assert.equal(p.minionState.knownDemon,null);assert.equal(p.minionState.evilTwin,undefined);
});

test('Cerenovus strategy prioritizes targets already evil-looking to town',()=>{
  const g=game(7);g.playset='custom:cere-strategy';g.scriptRoleIds=['cerenovus','clockmaker','dreamer','flowergirl','oracle','seamstress','vortox'];
  const players=Object.fromEntries(seats(7).map(p=>[p,{evil:p==='1L'?.9:p==='2L'?.1:.3,roles:{},demon:0,drunk:0,poison:{}}]));
  const publicR={players};const privateR={players:Object.fromEntries(seats(7).map(p=>[p,{evil:.2,roles:{},demon:0,drunk:0,poison:{}}]))};
  const ranked=rankCerenovusSuggestions(g,privateR,publicR);assert(ranked.length>0);assert.equal(ranked[0].target,'1L');
});

test('Pit-Hag strategy uses current-world role presence when estimating success',()=>{
  const g=game(7);g.playset='custom:pit-strategy';g.scriptRoleIds=['pit_hag','clockmaker','dreamer','flowergirl','oracle','sweetheart','vortox'];
  const current={self:'pit_hag','1L':'clockmaker','2L':'dreamer','3L':'flowergirl','3R':'oracle','2R':'sweetheart','1R':'vortox'};
  const result={players:Object.fromEntries(seats(7).map(p=>[p,{evil:p==='1R'||p==='self'?1:0,roles:{},demon:p==='1R'?1:0,drunk:0,poison:{}}])),presence:{},worlds:[{current}],worldWeights:[1]};
  const ranked=rankPitHagSuggestions(g,result);assert(ranked.every(x=>x.newRole!=='sweetheart'));
});

test('Deleting a resolved Witch or Cerenovus action also removes its linked death',()=>{
  const witch=game(7);witch.minionActionLog=[{id:940,roleId:'witch',kind:'curse',when:'N1',target:'1L',triggered:true,note:null}];witch.deathLog=[{id:941,playerId:'1L',when:'D1',reason:'ability',sourceRoleId:'witch',sourcePlayerId:'self',sourceEventId:940}];
  const wnext=deleteEventGroup(witch,'minionActionLog',940);assert.equal(wnext.minionActionLog.length,0);assert.equal(wnext.deathLog.length,0);assert.equal(wnext.playerStatus['1L'].alive,true);
  const cere=game(7);cere.minionActionLog=[{id:942,roleId:'cerenovus',kind:'madness',when:'N1',target:'1L',madRole:'clockmaker',note:null}];cere.deathLog=[{id:943,playerId:'1L',when:'D1',reason:'ability',isExecution:true,sourceRoleId:'cerenovus',sourcePlayerId:'self',sourceEventId:942}];
  const cnext=deleteEventGroup(cere,'minionActionLog',942);assert.equal(cnext.minionActionLog.length,0);assert.equal(cnext.deathLog.length,0);assert.equal(cnext.playerStatus['1L'].alive,true);
});

test('Snapshot validation accepts Evil Twin, Witch, Cerenovus, and Pit-Hag Minion records',()=>{
  const g=game(7);g.playset='sects_and_violets';g.scriptRoleIds=['evil_twin','witch','cerenovus','pit_hag','clockmaker','dreamer','vortox'];g.selfRole.shownRole='evil_twin';
  g.minionState={knownDemon:null,knownMinions:[],sharedStorytellerBluffs:[],bluffPlans:{},spyInitialRoles:{},spyRedHerring:null,becameDemonAt:null,evilTwin:{playerId:'1L',roleId:'clockmaker'}};assert(validateSnapshot(g));
  for(const action of [
    {id:950,roleId:'witch',kind:'curse',when:'N1',target:'1L',triggered:null,note:null},
    {id:951,roleId:'cerenovus',kind:'madness',when:'N1',target:'1L',madRole:'clockmaker',note:null},
    {id:952,roleId:'pit_hag',kind:'transform',when:'N2',target:'1L',newRole:'dreamer',note:null},
  ]){const x=structuredClone(g);x.night=2;x.minionActionLog=[action];assert(validateSnapshot(x));}
});
