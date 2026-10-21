const { test } = require('../harness.cjs');
const { assert, validSetup, evaluateAssignment, drawAssignment, rng, validateSnapshot, ROLES, JINXES, hasJinx, resolveRecordedJinxVictory, automaticallyResolvedJinxVictory, JINX_VICTORY_PAIRS, game, customGame, fakeJinxWorld } = require('../fixtures.cjs');

test('Active Djinn panel omits inert and Storyteller-only pairs',()=>{
 assert.equal(JINXES.length,29);
 assert(!hasJinx('butler','organ_grinder'));
 assert(!hasJinx('alchemist','boffin'));
 assert(hasJinx('leviathan','mayor'));
 assert(hasJinx('al_hadikhia','mastermind'));
 assert(hasJinx('lleech','mastermind'));
 assert.deepEqual([...JINX_VICTORY_PAIRS].length,14);
});

test('Grandmother victory requires actual execution DEATH, not only an execution',()=>{
 const roles={self:'leviathan','1L':'grandmother','2L':'soldier','2R':'chef','1R':'poisoner'};
 const g=customGame(roles);g.nominationLog=[{id:60001,when:'D1',nominator:'1R',nominee:'2L',executed:true}];
 const ev={id:60002,when:'D1',pair:'grandmother:leviathan',target:'2L'};
 assert.equal(resolveRecordedJinxVictory(g,fakeJinxWorld(roles),ev),null);
 g.deathLog=[{id:60003,when:'D1',playerId:'2L',reason:'execution'}];
 assert.deepEqual(resolveRecordedJinxVictory(g,fakeJinxWorld(roles,['2L']),ev),{pair:'grandmother:leviathan',winner:'evil'});
});

test('Grandmother victory can apply after the original grandchild changes alignment',()=>{
 const roles={self:'riot','1L':'grandmother','2L':'soldier','2R':'chef','1R':'poisoner'};
 const g=customGame(roles);g.deathLog=[{id:60011,when:'D1',playerId:'2L',reason:'execution'}];
 const ev={id:60012,when:'D1',pair:'grandmother:riot',target:'2L'};
 assert.deepEqual(resolveRecordedJinxVictory(g,fakeJinxWorld(roles,['2L'],{'2L':'evil'}),ev),{pair:'grandmother:riot',winner:'evil'});
 assert.deepEqual(resolveRecordedJinxVictory(g,fakeJinxWorld(roles,['2L']),ev),{pair:'grandmother:riot',winner:'evil'});
});

test('Soldier being executed after a Demon nomination can automatically win good',()=>{
 const roles={self:'leviathan','1L':'grandmother','2L':'soldier','2R':'chef','1R':'poisoner'};
 const g=customGame(roles);g.nominationLog=[{id:60021,when:'D1',nominator:'self',nominee:'2L',executed:true}];
 assert.deepEqual(automaticallyResolvedJinxVictory(g,fakeJinxWorld(roles),'D1'),{pair:'leviathan:soldier',winner:'good'});
 g.nominationLog[0].nominator='1L';assert.equal(automaticallyResolvedJinxVictory(g,fakeJinxWorld(roles),'D1'),null);
});

test('Leviathan and Mayor win immediately after Day 5 is marked no-execution',()=>{
 const roles={self:'leviathan','1L':'mayor','2L':'soldier','2R':'chef','1R':'poisoner'};
 const g=customGame(roles);g.night=5;g.noExecutionDays=[5];
 assert.deepEqual(automaticallyResolvedJinxVictory(g,fakeJinxWorld(roles),'D5'),{pair:'leviathan:mayor',winner:'good'});
 assert.equal(automaticallyResolvedJinxVictory(g,fakeJinxWorld(roles,['1L']),'D5'),null);
 assert.equal(automaticallyResolvedJinxVictory(g,fakeJinxWorld(roles),'D4'),null);
 g.nominationLog=[{id:60028,when:'D5',nominator:'1R',nominee:'2L',executed:true}];
 assert.equal(automaticallyResolvedJinxVictory(g,fakeJinxWorld(roles),'D5'),null,'execution must override contradictory no-execution entry');
});

test('Riot-Mayor outcome depends on the living Riot count, not script composition',()=>{
 const roles={self:'riot','1L':'mayor','2L':'riot','2R':'chef','1R':'poisoner'};
 const g=customGame(roles);const ev={id:60031,when:'D3',pair:'mayor:riot',actor:'1L'};
 assert.deepEqual(resolveRecordedJinxVictory(g,fakeJinxWorld(roles),ev),{pair:'mayor:riot',winner:'evil'});
 assert.deepEqual(resolveRecordedJinxVictory(g,fakeJinxWorld(roles,['2L']),ev),{pair:'mayor:riot',winner:'good'});
 assert.equal(resolveRecordedJinxVictory(g,fakeJinxWorld(roles,['1L']),ev),null);
});

test('Al-Hadikhia/Mastermind documented three-choice result changes actual winner',()=>{
 const roles={self:'al_hadikhia','1L':'mastermind','2L':'chef','2R':'empath','1R':'monk'};
 const g=customGame(roles);g.deathLog=[{id:60041,when:'D1',playerId:'self',reason:'execution'}];
 const ev={id:60042,when:'D1',pair:'al_hadikhia:mastermind',allLive:true};
 assert.deepEqual(resolveRecordedJinxVictory(g,fakeJinxWorld(roles,['self']),ev),{pair:ev.pair,winner:'evil'});
 ev.allLive=false;
 assert.deepEqual(resolveRecordedJinxVictory(g,fakeJinxWorld(roles,['self']),ev),{pair:ev.pair,winner:'good'});
 assert.equal(resolveRecordedJinxVictory(g,fakeJinxWorld(roles,['self','1L']),ev),null);
});

test('Confirmed protected victim ends game only for compatible Demon nomination',()=>{
 const roles={self:'riot','1L':'exorcist','2L':'soldier','2R':'chef','1R':'poisoner'};
 const g=customGame(roles);g.nominationLog=[{id:60051,when:'D3',nominator:'self',nominee:'2L',executed:true}];
 const ev={id:60052,when:'D3',pair:'exorcist:riot',actor:'self',target:'2L'};
 assert.deepEqual(resolveRecordedJinxVictory(g,fakeJinxWorld(roles),ev),{pair:'exorcist:riot',winner:'good'});
 ev.actor='1R';assert.equal(resolveRecordedJinxVictory(g,fakeJinxWorld(roles),ev),null);
});

test('Recorded jinx victories survive import; unscripted and malformed records fail',()=>{
 const roles={self:'al_hadikhia','1L':'mastermind','2L':'chef','2R':'empath','1R':'monk'};
 const g=customGame(roles);g.alHadikhiaConfirmed=true;
 g.jinxVictoryLog=[{id:60061,when:'D1',pair:'al_hadikhia:mastermind',allLive:true}];
 assert(validateSnapshot(g));
 const legacy={...g};delete legacy.jinxVictoryLog;assert(validateSnapshot(legacy));
 const wrong={...g,jinxVictoryLog:[{...g.jinxVictoryLog[0],pair:'leviathan:mayor'}]};assert(!validateSnapshot(wrong));
 g.jinxVictoryLog[0].allLive=null;assert(!validateSnapshot(g));
});

test('Alchemist copied Summoner setup has no real Demon and can be sampled',()=>{
 const roles={self:'alchemist','1L':'chef','2L':'empath','2R':'poisoner','1R':'monk'};
 const g=customGame(roles);g.selfRole.shownRole='alchemist';g.scriptRoleIds.push('summoner','imp');
 g.selfActionLog=[{id:60071,when:'N1',roleId:'alchemist',kind:'minion_ability',minionRole:'summoner'}];
 assert(validSetup(roles,g));
 for(let i=0;i<8;i++){const w=drawAssignment(g,rng(i+100),{self:'alchemist'});assert(w,'Sampler must allow a no-Demon Alchemist/Summoner');assert(validSetup(w,g));assert(!Object.values(w).some(r=>ROLES[r].type==='demon'));}
 assert(evaluateAssignment(roles,g).length>0);
});

test('Alchemist/Summoner dying before summoning creates an evil-win jinx world',()=>{
 const roles={self:'alchemist','1L':'chef','2L':'empath','2R':'poisoner','1R':'monk'};
 const g=customGame(roles);g.selfRole.shownRole='alchemist';g.scriptRoleIds.push('summoner','imp');g.night=2;
 g.selfActionLog=[{id:60081,when:'N1',roleId:'alchemist',kind:'minion_ability',minionRole:'summoner'}];
 g.deathLog=[{id:60082,when:'D2',playerId:'self',reason:'execution'}];
 const hs=evaluateAssignment(roles,g,10);
 assert(hs.length);
 assert(hs.every(w=>w.endReason==='jinx'&&w.jinxPair==='alchemist:summoner'&&w.jinxWinner==='evil'));
});

test('Lleech/Mastermind execution of host lets Lleech survive but lose power',()=>{
 const roles={self:'lleech','1L':'mastermind','2L':'chef','3L':'monk','3R':'soldier','2R':'virgin','1R':'empath'};
 const g=customGame(roles,7);g.selfRole.shownRole='lleech';g.demonState={knownMinions:[],storytellerBluffs:[],bluffPlans:{},lleechHost:'2L'};
 g.deathLog=[{id:60091,when:'D1',playerId:'2L',reason:'execution'}];
 assert(validSetup(roles,g));
 const hs=evaluateAssignment(roles,g,10);
 assert(hs.length);assert(hs.every(w=>w.lleechAbilityLost&&!w.ended&&w.alive.includes('self')&&!w.permanentPoison.includes('2L')));
 g.night=2;g.deathLog.push({id:60092,when:'D2',playerId:'self',reason:'execution'});
 const next=evaluateAssignment(roles,g,10);
 assert(next.length);assert(next.every(w=>w.lleechAbilityLost&&!w.alive.includes('self')));
});

test('Recorded Al-Hadikhia/Mastermind result determines the completed solver world',()=>{
 const roles={self:'al_hadikhia','1L':'mastermind','2L':'chef','2R':'empath','1R':'monk'};
 const g=customGame(roles);g.selfRole.shownRole='al_hadikhia';g.alHadikhiaConfirmed=true;
 g.deathLog=[{id:60101,when:'D1',playerId:'self',reason:'execution'}];
 g.jinxVictoryLog=[{id:60102,when:'D1',pair:'al_hadikhia:mastermind',allLive:true}];
 let hs=evaluateAssignment(roles,g,12);assert(hs.length);assert(hs.every(w=>w.ended&&w.endReason==='jinx'&&w.jinxWinner==='evil'));
 g.jinxVictoryLog[0].allLive=false;
 hs=evaluateAssignment(roles,g,12);assert(hs.length);assert(hs.every(w=>w.ended&&w.jinxWinner==='good'));
});

test('Leviathan/Mayor D5 no-execution win is resolved in actual timeline',()=>{
 const roles={self:'leviathan','1L':'mayor','2L':'soldier','2R':'chef','1R':'poisoner'};
 const g=customGame(roles);g.selfRole.shownRole='leviathan';g.leviathanConfirmed=true;g.night=5;g.noExecutionDays=[5];
 const hs=evaluateAssignment(roles,g,10);assert(hs.length);assert(hs.every(w=>w.ended&&w.endReason==='jinx'&&w.jinxWinner==='good'));
});

test('Alchemist/Summoner creates a Demon on the third night when healthy',()=>{
 const roles={self:'alchemist','1L':'chef','2L':'empath','2R':'poisoner','1R':'monk'};
 const g=customGame(roles);g.selfRole.shownRole='alchemist';g.scriptRoleIds.push('summoner','imp');g.night=3;
 g.selfActionLog=[{id:60111,when:'N1',roleId:'alchemist',kind:'minion_ability',minionRole:'summoner'}];
 const hs=evaluateAssignment(roles,g,12);assert(hs.some(w=>w.changes.some(x=>x.kind==='summoner'&&x.when==='N3'&&x.toRole==='imp')));
});
