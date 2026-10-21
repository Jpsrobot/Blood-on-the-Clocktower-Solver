const { test } = require('../harness.cjs');
const { assert, evaluateAssignment, infoMatches, validateSnapshot, ROLES, game, context } = require('../fixtures.cjs');

test('S&V phase 1 information tags are active',()=>{
  for(const id of ['clockmaker','dreamer','flowergirl','town_crier','oracle','seamstress']){
    assert(ROLES[id].tags.includes('INFO_SOURCE'),`${id} should be an information source`);
    assert.equal(ROLES[id].solverSupport,'full');
  }
  assert(ROLES.clockmaker.tags.includes('FIRST_NIGHT_INFO'));
  assert(ROLES.seamstress.tags.includes('ONE_TIME_ABILITY'));
});

test('Clockmaker checks shortest Demon-to-Minion distance',()=>{
  const roles={a:'fang_gu',b:'artist',c:'witch',d:'oracle',e:'dreamer',f:'savant',g:'clockmaker'};
  const c=context(roles);
  assert(infoMatches('clockmaker','g',{kind:'number',value:2},c));
  assert(!infoMatches('clockmaker','g',{kind:'number',value:1},c));
});

test('Dreamer requires the target character plus one opposite character-side token',()=>{
  const roles={self:'dreamer','1L':'mutant','2L':'witch','3L':'artist','3R':'oracle','2R':'savant','1R':'vortox'};
  const c=context(roles);
  assert(infoMatches('dreamer','self',{kind:'dreamer',player:'1L',shownRoles:['mutant','cerenovus']},c));
  assert(!infoMatches('dreamer','self',{kind:'dreamer',player:'1L',shownRoles:['mutant','oracle']},c));
  assert(!infoMatches('dreamer','self',{kind:'dreamer',player:'1L',shownRoles:['artist','cerenovus']},c));
});

test('Flowergirl reads whether any Demon voted on the previous day',()=>{
  const g=game(7);g.night=2;g.nominationLog=[{id:500,nominator:'1L',nominee:'2L',when:'D1',voters:['1R'],votingOccurred:true}];
  const roles={self:'flowergirl','1L':'artist','2L':'witch','3L':'oracle','3R':'dreamer','2R':'savant','1R':'vortox'};
  const c=context(roles);
  assert(infoMatches('flowergirl','self',{kind:'singleYesNo',result:'yes'},c,g,'N2'));
  assert(!infoMatches('flowergirl','self',{kind:'singleYesNo',result:'no'},c,g,'N2'));
});

test('Town Crier reads whether a Minion nominated on the previous day',()=>{
  const g=game(7);g.night=2;g.nominationLog=[{id:501,nominator:'2L',nominee:'1L',when:'D1',voters:[],votingOccurred:true}];
  const roles={self:'town_crier','1L':'artist','2L':'witch','3L':'oracle','3R':'dreamer','2R':'savant','1R':'vortox'};
  const c=context(roles);
  assert(infoMatches('town_crier','self',{kind:'singleYesNo',result:'yes'},c,g,'N2'));
});

test('Oracle counts dead evil-aligned players, not nominal evil character types',()=>{
  const roles={self:'oracle','1L':'artist','2L':'witch','3L':'dreamer','3R':'savant','2R':'flowergirl','1R':'vortox'};
  const c=context(roles);c.alive.delete('2L');c.alive.delete('1L');
  c.alignment={self:'good','1L':'evil','2L':'good','3L':'good','3R':'good','2R':'good','1R':'evil'};
  assert(infoMatches('oracle','self',{kind:'number',value:1},c));
  assert(!infoMatches('oracle','self',{kind:'number',value:0},c));
});

test('Seamstress compares actual alignment independently of character',()=>{
  const roles={self:'seamstress','1L':'witch','2L':'artist','3L':'oracle','3R':'dreamer','2R':'savant','1R':'vortox'};
  const c=context(roles);c.alignment={self:'good','1L':'good','2L':'good','3L':'good','3R':'good','2R':'good','1R':'evil'};
  assert(infoMatches('seamstress','self',{kind:'pairAlignment',players:['1L','2L'],result:'same'},c));
  assert(!infoMatches('seamstress','self',{kind:'pairAlignment',players:['1L','1R'],result:'same'},c));
});

test('Snapshot validation accepts new S&V structured information records',()=>{
  const g=game(7);g.playset='sects_and_violets';g.scriptRoleIds=['clockmaker','dreamer','flowergirl','town_crier','oracle','seamstress','artist','witch','vortox'];
  g.night=2;g.selfRole.shownRole='oracle';g.selfInfoLog=[{id:510,roleId:'oracle',when:'N2',number:1}];
  g.abilityClaimLog=[{id:511,playerId:'1L',sourcePlayerId:'1L',roleId:'dreamer',when:'N2',targets:['2L'],result:null,structured:{kind:'dreamer',player:'2L',shownRoles:['artist','witch']},visibility:'public',recipients:[]}];
  assert(validateSnapshot(g));
});

test('S&V Townsfolk and Outsider implementation cutoff is explicit',()=>{
  for(const id of ['clockmaker','dreamer','snake_charmer','mathematician','flowergirl','town_crier','oracle','savant','seamstress','philosopher','artist','juggler','sage','mutant','sweetheart','barber','klutz']){
    assert.equal(ROLES[id].solverSupport,'full',`${id} should have full solver support`);
  }
  for(const id of ['fang_gu','vigormortis','no_dashii','vortox']) assert.equal(ROLES[id].solverSupport,'full',`${id} should now have full Demon support`);
  for(const id of ['evil_twin','witch','cerenovus','pit_hag']){
    assert.equal(ROLES[id].solverSupport,'full',`${id} should now have full Minion support`);
  }
  assert(ROLES.philosopher.tags.includes('TARGETS_CHARACTER'));
  assert(ROLES.artist.tags.includes('ONE_TIME_ABILITY'));
  assert(ROLES.sweetheart.tags.includes('POISON_DRUNK_ABILITY'));
  assert(ROLES.barber.tags.includes('ROLE_CHANGING'));
  assert(ROLES.klutz.tags.includes('ALTERNATE_WIN_CONDITION'));
});

test('Healthy Snake Charmer must swap after choosing a living Demon',()=>{
  const g=game(7);g.playset='sects_and_violets';g.scriptRoleIds=['snake_charmer','dreamer','mathematician','flowergirl','oracle','witch','vortox'];g.selfRole.shownRole='snake_charmer';
  g.selfActionLog=[{id:520,roleId:'snake_charmer',when:'N1',target:'1R',swapped:false,newDemonRole:null}];
  const w={self:'snake_charmer','1L':'dreamer','2L':'mathematician','3L':'flowergirl','3R':'oracle','2R':'witch','1R':'vortox'};
  assert.equal(evaluateAssignment(w,g).length,0);
});

test('Snake Charmer swaps character and alignment and poisons the old Demon permanently',()=>{
  const g=game(7);g.playset='sects_and_violets';g.scriptRoleIds=['snake_charmer','dreamer','mathematician','flowergirl','oracle','witch','vortox'];g.selfRole.shownRole='snake_charmer';
  g.selfActionLog=[{id:521,roleId:'snake_charmer',when:'N1',target:'1R',swapped:true,newDemonRole:'vortox'}];
  const w={self:'snake_charmer','1L':'dreamer','2L':'mathematician','3L':'flowergirl','3R':'oracle','2R':'witch','1R':'vortox'};
  const hs=evaluateAssignment(w,g);assert(hs.length>0);
  for(const h of hs){
    assert.equal(h.current.self,'vortox');assert.equal(h.current['1R'],'snake_charmer');
    assert.equal(h.currentAlignment.self,'evil');assert.equal(h.currentAlignment['1R'],'good');
    assert(h.permanentPoison.includes('1R'));
    assert(h.changes.some(c=>c.kind==='snake_charmer'&&c.snake==='self'&&c.demon==='1R'&&c.demonRole==='vortox'));
  }
});

test('Flowergirl evaluates the previous day before a Night-2 Snake Charmer swap',()=>{
  const g=game(7);g.playset='sects_and_violets';g.scriptRoleIds=['snake_charmer','dreamer','mathematician','flowergirl','oracle','witch','vortox'];g.night=2;g.selfRole.shownRole='snake_charmer';
  g.nominationLog=[{id:522,nominator:'1L',nominee:'2L',when:'D1',voters:['1R'],votingOccurred:true}];
  g.selfActionLog=[{id:523,roleId:'snake_charmer',when:'N2',target:'1R',swapped:true,newDemonRole:'vortox'}];
  g.abilityClaimLog=[{id:524,playerId:'3L',sourcePlayerId:'3L',roleId:'flowergirl',when:'N2',targets:[],result:null,structured:{kind:'singleYesNo',result:'yes'},visibility:'public',recipients:[]}];
  const w={self:'snake_charmer','1L':'dreamer','2L':'mathematician','3L':'flowergirl','3R':'oracle','2R':'witch','1R':'vortox'};
  const hs=evaluateAssignment(w,g);assert(hs.length>0);
  assert(hs.some(h=>h.current.self==='vortox'&&h.info[524]==='lie'));
});

test('Healthy Savant requires exactly one of the two entered statements to be true',()=>{
  const g=game(7);g.playset='sects_and_violets';g.scriptRoleIds=['savant','dreamer','mathematician','flowergirl','oracle','witch','cerenovus','imp'];g.selfRole.shownRole='savant';
  const w={self:'savant','1L':'dreamer','2L':'mathematician','3L':'flowergirl','3R':'oracle','2R':'witch','1R':'imp'};
  g.selfInfoLog=[{id:525,roleId:'savant',when:'D1',statements:[{kind:'roleInPlay',roleId:'witch'},{kind:'roleInPlay',roleId:'cerenovus'}]}];
  assert(evaluateAssignment(w,g).length>0);
  g.selfInfoLog=[{id:526,roleId:'savant',when:'D1',statements:[{kind:'roleInPlay',roleId:'witch'},{kind:'roleInPlay',roleId:'imp'}]}];
  assert.equal(evaluateAssignment(w,g).length,0);
});

test('Savant selected-player statement checks only the selected group',()=>{
  const g=game(7);g.playset='sects_and_violets';g.scriptRoleIds=['savant','dreamer','mathematician','flowergirl','oracle','witch','cerenovus','imp'];g.selfRole.shownRole='savant';
  g.selfInfoLog=[{id:527,roleId:'savant',when:'D1',statements:[{kind:'roleAmong',roleId:'dreamer',players:['1L','2L']},{kind:'roleInPlay',roleId:'cerenovus'}]}];
  const w={self:'savant','1L':'dreamer','2L':'mathematician','3L':'flowergirl','3R':'oracle','2R':'witch','1R':'imp'};
  assert(evaluateAssignment(w,g).length>0);
});

test('Mathematician counts a poisoned Soldier dying to the Demon as one abnormal player',()=>{
  const baseGame=game(7);baseGame.playset='custom:math-soldier';baseGame.scriptRoleIds=['mathematician','soldier','dreamer','flowergirl','town_crier','poisoner','imp'];baseGame.night=2;baseGame.selfRole.shownRole='mathematician';
  baseGame.deathLog=[{id:528,playerId:'1L',when:'N2',reason:'night_death'}];
  const w={self:'mathematician','1L':'soldier','2L':'dreamer','3L':'flowergirl','3R':'town_crier','2R':'poisoner','1R':'imp'};
  baseGame.selfInfoLog=[{id:529,roleId:'mathematician',when:'N2',number:1}];
  const hs=evaluateAssignment(w,baseGame);assert(hs.length>0);assert(hs.every(h=>h.poison[2]==='1L'));
  baseGame.selfInfoLog=[{id:530,roleId:'mathematician',when:'N2',number:0}];
  assert.equal(evaluateAssignment(w,baseGame).length,0);
});

test('Mathematician can identify false poisoned information without counting poisoning by itself',()=>{
  const g=game(7);g.playset='custom:math-info';g.scriptRoleIds=['mathematician','oracle','dreamer','flowergirl','town_crier','poisoner','imp'];g.night=2;g.selfRole.shownRole='mathematician';
  g.deathLog=[{id:531,playerId:'2L',when:'D1',reason:'execution'}];
  g.abilityClaimLog=[{id:532,playerId:'1L',sourcePlayerId:'1L',roleId:'oracle',when:'N2',targets:[],result:null,structured:{kind:'number',value:1},visibility:'public',recipients:[]}];
  g.selfInfoLog=[{id:533,roleId:'mathematician',when:'N2',number:1}];
  const w={self:'mathematician','1L':'oracle','2L':'dreamer','3L':'flowergirl','3R':'town_crier','2R':'poisoner','1R':'imp'};
  const hs=evaluateAssignment(w,g);assert(hs.length>0);
  assert(hs.some(h=>h.poison[2]==='1L'&&h.info[532]==='poison'&&h.info[533]==='works'));
});

test('Snapshot validation accepts Mathematician, Savant, and Snake Charmer records through the Seamstress cutoff',()=>{
  const g=game(7);g.playset='sects_and_violets';g.scriptRoleIds=['snake_charmer','mathematician','savant','dreamer','flowergirl','town_crier','oracle','seamstress','witch','vortox'];g.night=2;
  g.selfRole.shownRole='mathematician';g.selfInfoLog=[{id:534,roleId:'mathematician',when:'N2',number:1}];assert(validateSnapshot(g));
  g.selfRole.shownRole='savant';g.selfInfoLog=[{id:535,roleId:'savant',when:'D2',statements:[{kind:'roleInPlay',roleId:'witch'},{kind:'roleAmong',roleId:'vortox',players:['1L','1R']}]}];assert(validateSnapshot(g));
  g.selfRole.shownRole='snake_charmer';g.selfInfoLog=[];g.selfActionLog=[{id:536,roleId:'snake_charmer',when:'N2',target:'1R',swapped:true,newDemonRole:'vortox'}];assert(validateSnapshot(g));
  g.selfActionLog=[{id:537,roleId:'snake_charmer',when:'D2',target:'1R',swapped:true,newDemonRole:'vortox'}];assert.equal(validateSnapshot(g),false);
});

test('Healthy Philosopher gains a good ability and makes its in-play holder drunk',()=>{
  const g=game(5);g.playset='custom:philo-empath';g.scriptRoleIds=['philosopher','empath','chef','poisoner','imp'];g.selfRole.shownRole='philosopher';
  g.selfActionLog=[{id:600,roleId:'philosopher',when:'N1',gainedRole:'empath'}];
  g.abilityClaimLog=[{id:601,playerId:'1L',sourcePlayerId:'1L',roleId:'empath',when:'N1',targets:[],result:null,structured:{kind:'number',value:2},visibility:'public',recipients:[]}];
  const w={self:'philosopher','1L':'empath','2L':'chef','2R':'poisoner','1R':'imp'};
  const hs=evaluateAssignment(w,g);assert(hs.length>0);
  assert(hs.some(h=>h.philosopherAbility==='empath'&&h.info[601]==='drunk'));
});

test('Philosopher can receive a gained first-night ability on the night it is chosen',()=>{
  const g=game(5);g.playset='custom:philo-clockmaker';g.scriptRoleIds=['philosopher','clockmaker','chef','empath','spy','imp'];g.night=2;g.selfRole.shownRole='philosopher';
  g.selfActionLog=[{id:602,roleId:'philosopher',when:'N2',gainedRole:'clockmaker'}];
  g.selfInfoLog=[{id:603,roleId:'clockmaker',when:'N2',number:1}];
  const w={self:'philosopher','1L':'chef','2L':'empath','2R':'spy','1R':'imp'};
  const hs=evaluateAssignment(w,g);assert(hs.length>0);assert(hs.some(h=>h.info[603]==='works'));
  const bad=game(5);bad.playset=g.playset;bad.scriptRoleIds=g.scriptRoleIds;bad.night=2;bad.selfRole.shownRole='philosopher';bad.selfInfoLog=[{id:604,roleId:'clockmaker',when:'N2',number:1}];
  assert.equal(evaluateAssignment(w,bad).length,0);
});

test('Artist records a timed yes-no question without pretending to parse natural language',()=>{
  const g=game(5);g.playset='custom:artist';g.scriptRoleIds=['artist','chef','empath','spy','imp'];g.selfRole.shownRole='artist';g.selfInfoLog=[{id:605,roleId:'artist',when:'D1',question:'Is the Demon on the right?',result:'yes'}];
  const w={self:'artist','1L':'chef','2L':'empath','2R':'spy','1R':'imp'};
  assert(validateSnapshot(g));assert(evaluateAssignment(w,g).length>0);
});

test('Juggler counts exact public player-character guesses from the previous day',()=>{
  const g=game(5);g.playset='custom:juggler';g.scriptRoleIds=['juggler','chef','empath','artist','spy','imp'];g.night=2;g.selfRole.shownRole='juggler';
  const w={self:'juggler','1L':'chef','2L':'empath','2R':'spy','1R':'imp'};
  g.selfInfoLog=[{id:606,roleId:'juggler',when:'N2',guessDay:'D1',guesses:[{player:'1L',roleId:'chef'},{player:'2L',roleId:'artist'}],number:1}];
  assert(evaluateAssignment(w,g).length>0);
  g.selfInfoLog=[{id:607,roleId:'juggler',when:'N2',guessDay:'D1',guesses:[{player:'1L',roleId:'chef'},{player:'2L',roleId:'artist'}],number:2}];
  assert.equal(evaluateAssignment(w,g).length,0);
});

test('Sage information requires a Demon kill and contains the Demon in the shown pair',()=>{
  const g=game(5);g.playset='custom:sage';g.scriptRoleIds=['sage','chef','empath','spy','imp'];g.night=2;g.selfRole.shownRole='sage';
  const w={self:'sage','1L':'chef','2L':'empath','2R':'spy','1R':'imp'};
  g.deathLog=[{id:608,playerId:'self',when:'N2',reason:'night_death',sourceRoleId:'imp'}];
  g.selfInfoLog=[{id:609,roleId:'sage',when:'N2',players:['1R','1L']}];
  assert(evaluateAssignment(w,g).length>0);
  g.selfInfoLog=[{id:610,roleId:'sage',when:'N2',players:['1L','2L']}];
  assert.equal(evaluateAssignment(w,g).length,0);
  const noKill={...g,deathLog:[{id:608,playerId:'self',when:'N2',reason:'storyteller'}],selfInfoLog:[{id:611,roleId:'sage',when:'N2',players:['1R','1L']}]};
  assert.equal(evaluateAssignment(w,noKill).length,0);
});

test('Mutant madness execution marker is only legal for a healthy Mutant ability',()=>{
  const g=game(5);g.playset='custom:mutant';g.scriptRoleIds=['mutant','sweetheart','chef','baron','imp'];g.selfRole.shownRole='mutant';g.deathLog=[{id:612,playerId:'self',when:'D1',reason:'storyteller',sourceRoleId:'mutant',isExecution:true}];
  const w={self:'mutant','1L':'sweetheart','2L':'chef','2R':'baron','1R':'imp'};
  assert(evaluateAssignment(w,g).length>0);
  g.deathLog=[{id:613,playerId:'self',when:'D1',reason:'storyteller',sourceRoleId:'mutant',isExecution:false}];
  assert.equal(evaluateAssignment(w,g).length,0);
});

test('Sweetheart death creates persistent drunkenness',()=>{
  const g=game(5);g.playset='custom:sweetheart';g.scriptRoleIds=['sweetheart','mutant','chef','baron','imp'];g.selfRole.shownRole='sweetheart';g.deathLog=[{id:614,playerId:'self',when:'D1',reason:'execution'}];
  const w={self:'sweetheart','1L':'mutant','2L':'chef','2R':'baron','1R':'imp'};
  const hs=evaluateAssignment(w,g);assert(hs.length>0);
  assert(hs.every(h=>h.permanentDrunk.length===1));
  assert(hs.some(h=>h.permanentDrunk.includes('1L')));
});

test('Barber death records an unresolved character-swap window without changing alignment',()=>{
  const g=game(5);g.playset='custom:barber';g.scriptRoleIds=['barber','sweetheart','chef','baron','imp'];g.selfRole.shownRole='barber';g.deathLog=[{id:615,playerId:'self',when:'D1',reason:'execution'}];
  const w={self:'barber','1L':'sweetheart','2L':'chef','2R':'baron','1R':'imp'};
  const hs=evaluateAssignment(w,g);assert(hs.length>0);
  assert(hs.every(h=>h.unresolvedBarberFrom.includes('D1')));
  assert(hs.every(h=>h.currentAlignment['1L']==='good'&&h.currentAlignment['2R']==='evil'));
});

test('Healthy Klutz loses immediately after choosing an evil living player',()=>{
  const g=game(5);g.playset='custom:klutz';g.scriptRoleIds=['klutz','sweetheart','chef','baron','imp'];g.selfRole.shownRole='klutz';g.deathLog=[{id:616,playerId:'self',when:'D1',reason:'execution'}];g.selfActionLog=[{id:617,roleId:'klutz',when:'D1',target:'2R',teamLost:true}];
  const w={self:'klutz','1L':'sweetheart','2L':'chef','2R':'baron','1R':'imp'};
  const hs=evaluateAssignment(w,g);assert(hs.length>0);assert(hs.every(h=>h.ended&&h.endReason==='klutz'));
  g.selfActionLog=[{id:618,roleId:'klutz',when:'D1',target:'2R',teamLost:false}];
  assert.equal(evaluateAssignment(w,g).length,0);
});

test('Snapshot validation accepts the new Townsfolk and Outsider records',()=>{
  const script=['philosopher','artist','juggler','sage','mutant','sweetheart','barber','klutz','chef','spy','imp'];
  const g=game(7);g.playset='custom:snv-good-batch';g.scriptRoleIds=script;g.night=2;g.selfRole.shownRole='philosopher';
  g.selfActionLog=[{id:620,roleId:'philosopher',when:'N1',gainedRole:'artist'}];
  g.selfInfoLog=[{id:621,roleId:'artist',when:'D1',question:'Test?',result:'unknown'}];
  g.abilityClaimLog=[
    {id:622,playerId:'1L',sourcePlayerId:'1L',roleId:'juggler',when:'N2',targets:[],result:null,structured:{kind:'juggler',guessDay:'D1',guesses:[{player:'2L',roleId:'chef'}],number:1},visibility:'public',recipients:[]},
    {id:623,playerId:'2L',sourcePlayerId:'2L',roleId:'sage',when:'N2',targets:['1R','1L'],result:null,structured:{kind:'sage',players:['1R','1L']},visibility:'public',recipients:[]},
    {id:624,playerId:'3L',sourcePlayerId:'3L',roleId:'klutz',when:'D2',targets:['1L'],result:null,structured:{kind:'klutzChoice',target:'1L',teamLost:false},visibility:'public',recipients:[]},
  ];
  g.deathLog=[{id:625,playerId:'3L',when:'D1',reason:'storyteller',sourceRoleId:'mutant',isExecution:true}];
  assert(validateSnapshot(g));
});
