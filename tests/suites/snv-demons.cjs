const { test } = require('../harness.cjs');
const { assert, seats, setupCountsForRoles, validSetup, evaluateAssignment, runSearch, analyzeEvidence, outsiderModifierClaimFit, outsiderClaimStyle, validateSnapshot, ROLES, game, claim } = require('../fixtures.cjs');

test('S&V Demon setup modifiers apply before world validation',()=>{
  assert.deepEqual(setupCountsForRoles(7,['fang_gu']),{townsfolk:4,outsider:1,minion:1,demon:1});
  assert.deepEqual(setupCountsForRoles(8,['vigormortis']),{townsfolk:6,outsider:0,minion:1,demon:1});
  assert.deepEqual(setupCountsForRoles(7,['vigormortis']),{townsfolk:5,outsider:0,minion:1,demon:1});
  const fg=game(7);fg.playset='custom:fang-gu-setup';fg.scriptRoleIds=['fang_gu','clockmaker','dreamer','flowergirl','oracle','sweetheart','witch'];
  assert(validSetup({self:'fang_gu','1L':'clockmaker','2L':'dreamer','3L':'flowergirl','3R':'oracle','2R':'sweetheart','1R':'witch'},fg));
});

test('OUTSIDER_COUNT_MODIFIER metadata drives Baron, Fang Gu, and Vigormortis setup counts',()=>{
  assert.equal(ROLES.baron.outsiderCountDelta,2);
  assert.equal(ROLES.fang_gu.outsiderCountDelta,1);
  assert.equal(ROLES.vigormortis.outsiderCountDelta,-1);
  assert.deepEqual(setupCountsForRoles(9,['baron']),{townsfolk:3,outsider:4,minion:1,demon:1});
  assert.deepEqual(setupCountsForRoles(9,['fang_gu']),{townsfolk:4,outsider:3,minion:1,demon:1});
  assert.deepEqual(setupCountsForRoles(9,['vigormortis']),{townsfolk:6,outsider:1,minion:1,demon:1});
  assert.deepEqual(setupCountsForRoles(7,['vigormortis']),{townsfolk:5,outsider:0,minion:1,demon:1});
});

test('Outsider claim-behaviour tags distinguish early, hidden, and neutral roles',()=>{
  for(const id of ['butler','recluse','drunk','tinker']) assert.equal(outsiderClaimStyle(id),'early',`${id} should be early-claim`);
  for(const id of ['saint','lunatic','mutant']) assert.equal(outsiderClaimStyle(id),'hidden',`${id} should be hidden-claim`);
  for(const id of ['goon','moonchild','sweetheart','barber','klutz']) assert.equal(outsiderClaimStyle(id),'neutral',`${id} should stay neutral`);
});

test('Baron is heavily downweighted when its extra Outsiders would force missing early claims',()=>{
  const g=game(8);g.selfRole.shownRole='chef';
  const claims=[['1L','saint'],['2L','empath'],['3L','fortune_teller'],['4L','monk'],['3R','soldier'],['2R','mayor'],['1R','undertaker']];
  claims.forEach(([p,r],i)=>claim(g,p,r,810+i,'D1'));
  const fit=outsiderModifierClaimFit(g,'baron');
  assert(fit);
  assert.equal(fit.normalOutsiders,1);
  assert.equal(fit.modifiedOutsiders,3);
  assert.equal(fit.minEarlyModified,2);
  assert.equal(fit.claimedEarlyCount,0);
  assert.equal(fit.positiveShortage,2);
  assert.equal(fit.confidence,1);
  assert(fit.logAdjustment<=-6.9);
  const e=analyzeEvidence(g,null);
  assert((e.global.baron?.points??0)<0);
  assert(e.global.baron?.reasons.some(r=>r.code==='outsiderModifierEarlyMissing'));
});

test('The one-Saint eight-player example no longer produces a high Baron share',()=>{
  const g=game(8);g.selfRole.shownRole='chef';
  const claims=[['1L','saint'],['2L','empath'],['3L','fortune_teller'],['4L','monk'],['3R','soldier'],['2R','mayor'],['1R','undertaker']];
  claims.forEach(([p,r],i)=>claim(g,p,r,820+i,'D1'));
  const r=runSearch(g,{attempts:1200,seed:71347,maxMillis:5000,beamWidth:3,meta:false});
  assert(r.unique>100);
  assert((r.presence.baron??0)<0.01,`Baron share was ${(r.presence.baron??0)*100}%`);
});

test('Incomplete role-claim coverage does not punish a count modifier for missing early claims',()=>{
  const g=game(8);claim(g,'1L','saint',829,'D1');
  const fit=outsiderModifierClaimFit(g,'baron');
  assert(fit);
  assert.equal(fit.confidence,0);
  assert(Math.abs(fit.logAdjustment)<1e-12);
});

test('Hidden or neutral Outsiders do not fake Vigormortis count evidence',()=>{
  const g=game(9);g.playset='custom:vigor-hidden';g.scriptRoleIds=['vigormortis','clockmaker','dreamer','flowergirl','oracle','seamstress','artist','sweetheart','barber','witch'];
  const roles=['clockmaker','dreamer','flowergirl','oracle','seamstress','artist','sweetheart','barber','witch'];
  seats(9).forEach((p,i)=>{if(p!=='self')claim(g,p,roles[i]||'clockmaker',830+i,'D1');});
  g.selfRole.shownRole='clockmaker';
  const fit=outsiderModifierClaimFit(g,'vigormortis');
  assert(fit);
  assert.equal(fit.negativeSupport,0);
  assert.equal(analyzeEvidence(g,null).global.vigormortis,undefined);
});

test('Vigormortis gets weak support only when it removes a normally forced early-claim Outsider',()=>{
  const g=game(9);g.playset='custom:vigor-early';g.scriptRoleIds=['vigormortis','clockmaker','dreamer','flowergirl','oracle','seamstress','artist','juggler','sage','savant','tinker','saint','witch'];
  g.selfRole.shownRole='clockmaker';
  const townClaims=['dreamer','flowergirl','oracle','seamstress','artist','juggler','sage','savant'];
  seats(9).filter(p=>p!=='self').forEach((p,i)=>claim(g,p,townClaims[i],850+i,'D1'));
  const fit=outsiderModifierClaimFit(g,'vigormortis');
  assert(fit);
  assert.equal(fit.minEarlyNormal,1);
  assert.equal(fit.minEarlyModified,0);
  assert.equal(fit.negativeSupport,1);
  const e=analyzeEvidence(g,null);
  assert((e.global.vigormortis?.points??0)>0);
  assert(e.global.vigormortis?.reasons.some(r=>r.code==='outsiderReducerEarlyMissing'));
});

test('Fang Gu first Outsider kill jumps, changes alignment, and kills the old Demon instead',()=>{
  const g=game(7);g.playset='custom:fang-gu-jump';g.scriptRoleIds=['fang_gu','clockmaker','dreamer','flowergirl','oracle','sweetheart','witch'];g.night=2;g.selfRole.shownRole='fang_gu';
  g.demonActionLog=[{id:700,roleId:'fang_gu',when:'N2',target:'2R',note:null}];
  g.deathLog=[{id:701,playerId:'self',when:'N2',reason:'night_death',sourceRoleId:'fang_gu'}];
  const w={self:'fang_gu','1L':'clockmaker','2L':'dreamer','3L':'flowergirl','3R':'oracle','2R':'sweetheart','1R':'witch'};
  const hs=evaluateAssignment(w,g);assert(hs.length>0);
  assert(hs.every(h=>h.fangGuJumped));
  assert(hs.every(h=>h.current['2R']==='fang_gu'&&h.currentAlignment['2R']==='evil'&&!h.alive.includes('self')&&h.alive.includes('2R')));
  assert(hs.some(h=>h.changes.some(c=>c.kind==='fang_gu'&&c.oldDemon==='self'&&c.newDemon==='2R')));
});

test('Fang Gu cannot record the first healthy Outsider target as the player who died',()=>{
  const g=game(7);g.playset='custom:fang-gu-jump';g.scriptRoleIds=['fang_gu','clockmaker','dreamer','flowergirl','oracle','sweetheart','witch'];g.night=2;g.selfRole.shownRole='fang_gu';
  g.demonActionLog=[{id:702,roleId:'fang_gu',when:'N2',target:'2R',note:null}];
  g.deathLog=[{id:703,playerId:'2R',when:'N2',reason:'night_death',sourceRoleId:'fang_gu'}];
  const w={self:'fang_gu','1L':'clockmaker','2L':'dreamer','3L':'flowergirl','3R':'oracle','2R':'sweetheart','1R':'witch'};
  assert.equal(evaluateAssignment(w,g).length,0);
});

test('No Dashii poisons the nearest Townsfolk on each side and skips non-Townsfolk',()=>{
  const g=game(7);g.playset='custom:no-dashii';g.scriptRoleIds=['dreamer','flowergirl','oracle','seamstress','clockmaker','witch','no_dashii'];g.selfRole.shownRole='dreamer';
  g.selfInfoLog=[{id:704,roleId:'dreamer',when:'N1',player:'1L',shownRoles:['artist','witch']}];
  const w={self:'dreamer','1L':'flowergirl','2L':'oracle','3L':'seamstress','3R':'clockmaker','2R':'witch','1R':'no_dashii'};
  const hs=evaluateAssignment(w,g);assert(hs.length>0);
  assert(hs.every(h=>h.info[704]==='poison'));
  assert(hs.every(h=>h.requiredPoison[1]===undefined));
});

test('No Dashii nearest-Townsfolk search does not skip dead Townsfolk',()=>{
  const g=game(7);g.playset='custom:no-dashii-dead';g.scriptRoleIds=['oracle','dreamer','seamstress','clockmaker','flowergirl','witch','no_dashii'];g.night=2;g.selfRole.shownRole='oracle';
  g.deathLog=[{id:714,playerId:'1R',when:'D1',reason:'execution'}];
  const w={self:'oracle','1L':'dreamer','2L':'seamstress','3L':'clockmaker','3R':'witch','2R':'no_dashii','1R':'flowergirl'};
  // Dead 1R Flowergirl remains the nearest Townsfolk between No Dashii and self, so self is healthy.
  g.selfInfoLog=[{id:715,roleId:'oracle',when:'N2',number:1}];
  assert.equal(evaluateAssignment(w,g).length,0);
  g.selfInfoLog=[{id:716,roleId:'oracle',when:'N2',number:0}];
  const hs=evaluateAssignment(w,g);assert(hs.length>0);assert(hs.every(h=>h.info[716]==='works'));
});

test('Vigormortis killing a Minion preserves the Minion character and creates one directional poison source',()=>{
  const g=game(8);g.playset='custom:vigor';g.scriptRoleIds=['vigormortis','clockmaker','dreamer','flowergirl','oracle','seamstress','artist','witch'];g.night=2;g.selfRole.shownRole='vigormortis';
  g.demonActionLog=[{id:705,roleId:'vigormortis',when:'N2',target:'1R',note:null}];
  g.deathLog=[{id:706,playerId:'1R',when:'N2',reason:'night_death',sourceRoleId:'vigormortis'}];
  const w={self:'vigormortis','1L':'clockmaker','2L':'dreamer','3L':'flowergirl','4L':'oracle','3R':'seamstress','2R':'artist','1R':'witch'};
  const hs=evaluateAssignment(w,g);assert(hs.length>0);
  assert(hs.every(h=>!h.alive.includes('1R')&&h.current['1R']==='witch'));
  assert(hs.every(h=>h.vigormortisPoisonDirections['1R']===-1||h.vigormortisPoisonDirections['1R']===1));
  assert(new Set(hs.map(h=>h.vigormortisPoisonDirections['1R'])).size===2);
});

test('Vortox requires healthy Townsfolk information to be false',()=>{
  const g=game(7);g.playset='custom:vortox-info';g.scriptRoleIds=['clockmaker','dreamer','flowergirl','oracle','seamstress','witch','vortox'];g.selfRole.shownRole='clockmaker';
  const w={self:'clockmaker','1L':'dreamer','2L':'flowergirl','3L':'oracle','3R':'seamstress','2R':'witch','1R':'vortox'};
  // Demon at 1R and Minion at 2R are adjacent, so the literal Clockmaker answer is 1.
  g.selfInfoLog=[{id:707,roleId:'clockmaker',when:'N1',number:1}];
  assert.equal(evaluateAssignment(w,g).length,0);
  g.selfInfoLog=[{id:708,roleId:'clockmaker',when:'N1',number:2}];
  const hs=evaluateAssignment(w,g);assert(hs.length>0);assert(hs.every(h=>h.info[708]==='vortox'));
});

test('Vortox false-information rule overrides Sweetheart drunkenness on Townsfolk',()=>{
  const g=game(8);g.playset='custom:vortox-drunk';g.scriptRoleIds=['oracle','dreamer','flowergirl','seamstress','clockmaker','sweetheart','witch','vortox'];g.night=2;g.selfRole.shownRole='oracle';
  g.deathLog=[{id:711,playerId:'3R',when:'D1',reason:'execution'}];
  const w={self:'oracle','1L':'dreamer','2L':'flowergirl','3L':'seamstress','4L':'clockmaker','3R':'sweetheart','2R':'witch','1R':'vortox'};
  // Only a good Sweetheart is dead, so literal Oracle information is 0. Vortox requires a false number.
  g.selfInfoLog=[{id:712,roleId:'oracle',when:'N2',number:0}];
  const literal= evaluateAssignment(w,g);
  assert(literal.length>0);
  assert(literal.every(h=>h.permanentDrunk.includes('1R')), 'a literal-true result is legal only when Sweetheart drunkenness disables Vortox itself');
  assert(!literal.some(h=>h.permanentDrunk.includes('self')), 'drunk Townsfolk still cannot receive literal-true information while Vortox is healthy');
  g.selfInfoLog=[{id:713,roleId:'oracle',when:'N2',number:1}];
  const hs=evaluateAssignment(w,g);assert(hs.length>0);
  assert(hs.some(h=>h.permanentDrunk.includes('self')&&h.info[713]==='vortox'));
});

test('Vortox ends the game at dusk when nobody was executed that day',()=>{
  const g=game(7);g.playset='custom:vortox-dusk';g.scriptRoleIds=['clockmaker','dreamer','flowergirl','oracle','seamstress','witch','vortox'];g.noExecutionDays=[1];
  const w={self:'clockmaker','1L':'dreamer','2L':'flowergirl','3L':'oracle','3R':'seamstress','2R':'witch','1R':'vortox'};
  const hs=evaluateAssignment(w,g);assert(hs.length>0);assert(hs.every(h=>h.ended&&h.endReason==='vortox'));
});

test('Vortox Savant information has both statements false while healthy',()=>{
  const g=game(7);g.playset='custom:vortox-savant';g.scriptRoleIds=['savant','dreamer','flowergirl','oracle','seamstress','witch','vortox'];g.selfRole.shownRole='savant';
  const w={self:'savant','1L':'dreamer','2L':'flowergirl','3L':'oracle','3R':'seamstress','2R':'witch','1R':'vortox'};
  g.selfInfoLog=[{id:709,roleId:'savant',when:'D1',statements:[{kind:'roleInPlay',roleId:'witch'},{kind:'roleInPlay',roleId:'artist'}]}];
  assert.equal(evaluateAssignment(w,g).length,0);
  g.selfInfoLog=[{id:710,roleId:'savant',when:'D1',statements:[{kind:'roleInPlay',roleId:'artist'},{kind:'roleAmong',roleId:'clockmaker',players:['1L','2L']}]}];
  const hs=evaluateAssignment(w,g);assert(hs.length>0);assert(hs.every(h=>h.info[710]==='vortox'));
});

test('Snapshot validation accepts S&V Demon attack logs and rejects unrelated Demon IDs',()=>{
  const g=game(7);g.playset='sects_and_violets';g.scriptRoleIds=['fang_gu','vigormortis','no_dashii','vortox','clockmaker','dreamer','witch'];g.night=2;g.selfRole.shownRole='fang_gu';
  for(const roleId of ['fang_gu','vigormortis','no_dashii','vortox']){g.demonActionLog=[{id:720,roleId,when:'N2',target:'1L',note:null}];assert(validateSnapshot(g));}
  g.demonActionLog=[{id:721,roleId:'zombuul',when:'N2',target:'1L',note:null}];assert.equal(validateSnapshot(g),false);
});
