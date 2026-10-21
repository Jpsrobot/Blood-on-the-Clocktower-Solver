const { test } = require('../harness.cjs');
const { assert, validSetup, evaluateAssignment, runSearch, analyzeEvidence, validateSnapshot, ROLES, BUILT_IN_SCRIPTS, game, claim, customGame, demonPatternSignals, demonPatternLogBonus, demonGame, typhon10, isAlHadikhiaEnabled, isRiotConfirmed, PHASE7 } = require('../fixtures.cjs');

test('Phase 7 experimental Demons are Japanese-labeled and custom-script only',()=>{
 for(const id of PHASE7){assert.equal(ROLES[id].type,'demon');assert.equal(ROLES[id].solverSupport==='generic',id==='yaggababble');for(const sc of Object.values(BUILT_IN_SCRIPTS))assert(!sc.roleIds.includes(id));}
 assert.equal(ROLES.lil_monsta.symbol,'赤');assert.equal(ROLES.lleech.symbol,'蛭');assert.equal(ROLES.al_hadikhia.symbol,'蘇');assert.equal(ROLES.ojo.symbol,'眼');assert.equal(ROLES.riot.symbol,'乱');assert.equal(ROLES.yaggababble.symbol,'詠');
});

test('Al-Hadikhia only enters candidate worlds when explicitly confirmed',()=>{
 const roles={self:'al_hadikhia','1L':'chef','2L':'monk','2R':'spy','1R':'empath'},g=customGame(roles);
 assert(!isAlHadikhiaEnabled(g));assert(!validSetup(roles,g));
 g.alHadikhiaConfirmed=true;assert(isAlHadikhiaEnabled(g));assert(validSetup(roles,g));assert(validateSnapshot(g));
 g.alHadikhiaConfirmed='confirmed';assert(!validateSnapshot(g));
});

test('Confirmed Al-Hadikhia restricts random assignments to that Demon',()=>{
 const g=demonGame(5);g.alHadikhiaConfirmed=true;
 const r=runSearch(g,{attempts:260,seed:571,maxMillis:5000,beamWidth:1});
 assert(r.unique>0);assert.equal(r.presence.al_hadikhia,1);
});

test('Riot publicly confirmed games restrict setup to Riot',()=>{
 const g=demonGame(5),r={self:'riot','1L':'chef','2L':'monk','2R':'spy','1R':'empath'};
 assert(!isRiotConfirmed(g));g.riotConfirmed=true;assert(isRiotConfirmed(g));
 assert(validSetup(r,g));assert(validateSnapshot(g));assert(!validSetup({...r,self:'imp'},g));
});

test('Riot converts Minions into Riots on the third day, not earlier',()=>{
 const roles={self:'riot','1L':'chef','2L':'monk','2R':'spy','1R':'empath'},g=customGame(roles);g.riotConfirmed=true;
 g.night=2;let histories=evaluateAssignment(roles,g);assert(histories.length>0);assert(histories.every(w=>w.current['2R']==='spy'));
 g.night=3;histories=evaluateAssignment(roles,g);assert(histories.length>0);assert(histories.every(w=>w.current['2R']==='riot' && w.changes.some(x=>x.kind==='riot'&&x.playerId==='2R')));
});

test('Confirmed Riot has separate conditional seat weights on the third day',()=>{
 const g=demonGame(5);g.night=3;g.riotConfirmed=true;
 const r=runSearch(g,{attempts:200,seed:995,maxMillis:5000,beamWidth:1});
 assert(r.unique>0);assert.equal(r.presence.riot,1);assert(r.riotConditionalSeats);assert(Object.values(r.riotConditionalSeats).some(n=>n>0));
});

test('Lil Monsta keeps the standard visible Demon slot but grants an underlying Minion ability',()=>{
 const roles={self:'lil_monsta','1L':'chef','2L':'monk','2R':'poisoner','1R':'empath'},g=customGame(roles);
 g.scriptRoleIds.push('assassin');g.selfRole.shownRole='lil_monsta';
 assert(validSetup(roles,g));const w=evaluateAssignment(roles,g);
 assert(w.length>0);assert(w.some(x=>x.lilMonstaHolder==='self'&&x.lilMonstaUnderlyingRole==='assassin'));
});

test('Lil Monsta can change the Demon-registration seat from night to night',()=>{
 const roles={self:'lil_monsta','1L':'chef','2L':'monk','2R':'poisoner','1R':'empath'},g=customGame(roles);
 g.scriptRoleIds.push('assassin');g.night=2;g.selfRole.shownRole='lil_monsta';
 g.demonState={knownMinions:[],storytellerBluffs:[],bluffPlans:{},lilMonstaBabysitters:[{when:'N2',playerId:'2R'}]};
 const worlds=evaluateAssignment(roles,g,10);
 assert(worlds.length>0);assert(worlds.every(w=>w.lilMonstaHolder==='2R'));
 g.demonState.lilMonstaBabysitters[0].playerId='1L';
 assert.equal(evaluateAssignment(roles,g,10).length,0);
});

test('Excess Minion reports and changing Demon pings favour Lil Monsta weakly',()=>{
 const g=demonGame(10),w={...typhon10(),self:'lil_monsta'};
 assert.equal(demonPatternLogBonus(g,w),0);
 claim(g,'1L','baron',24001);claim(g,'2L','poisoner',24002);claim(g,'3L','assassin',24003);
 const bonus=demonPatternLogBonus(g,w);assert(bonus>0);
 g.abilityClaimLog=[{id:24004,playerId:'4L',roleId:'flowergirl',when:'N2',targets:['1L'],result:null,structured:{kind:'singleYesNo',result:'no'},visibility:'public',recipients:[]},{id:24005,playerId:'4L',roleId:'flowergirl',when:'N3',targets:['1L'],result:null,structured:{kind:'singleYesNo',result:'yes'},visibility:'public',recipients:[]}];
 assert.equal(demonPatternSignals(g).changingPings,1);assert(demonPatternLogBonus(g,w)>bonus);
});

test('Lleech selects a fixed permanently poisoned host',()=>{
 const roles={self:'lleech','1L':'monk','2L':'chef','2R':'spy','1R':'empath'},g=customGame(roles);
 g.selfRole.shownRole='lleech';g.demonState={knownMinions:[],storytellerBluffs:[],bluffPlans:{},lleechHost:'1L'};
 const w=evaluateAssignment(roles,g);assert(w.length>0);assert(w.every(x=>x.lleechHost==='1L'&&x.permanentPoison.includes('1L')));
});

test('Healthy Lleech cannot die while its chosen host remains alive',()=>{
 const roles={self:'lleech','1L':'monk','2L':'chef','2R':'spy','1R':'empath'},g=customGame(roles);
 g.selfRole.shownRole='lleech';g.demonState={knownMinions:[],storytellerBluffs:[],bluffPlans:{},lleechHost:'1L'};
 g.deathLog=[{id:24006,playerId:'self',when:'D1',reason:'execution'}];
 assert.equal(evaluateAssignment(roles,g).length,0);
});

test('Killing Lleech host also kills the Lleech and concludes the game',()=>{
 const roles={self:'lleech','1L':'monk','2L':'chef','2R':'spy','1R':'empath'},g=customGame(roles);g.night=2;
 g.selfRole.shownRole='lleech';g.demonState={knownMinions:[],storytellerBluffs:[],bluffPlans:{},lleechHost:'1L'};
 g.deathLog=[{id:24007,playerId:'1L',when:'N2',reason:'night_death'}];
 const w=evaluateAssignment(roles,g);assert(w.length);assert(w.every(x=>x.ended&&x.lleechDiedAt==='N2'&&!x.alive.includes('self')));
 g.deathLog.push({id:24008,playerId:'self',when:'N2',reason:'night_death'});assert(evaluateAssignment(roles,g).length);
});

test('Lleech host notes validate and disallow self-hosting',()=>{
 const g=demonGame(5);g.demonState={knownMinions:[],storytellerBluffs:[],bluffPlans:{},lleechHost:'2L'};
 assert(validateSnapshot(g));g.demonState.lleechHost='self';assert(!validateSnapshot(g));
});

test('Ojo selects a character, not a player',()=>{
 const roles={self:'ojo','1L':'chef','2L':'monk','2R':'spy','1R':'empath'},g=customGame(roles);g.night=2;g.selfRole.shownRole='ojo';
 g.demonActionLog=[{id:24009,roleId:'ojo',target:'self',targetRole:'chef',when:'N2',note:null}];
 g.deathLog=[{id:24010,playerId:'1L',when:'N2',reason:'night_death'}];
 assert(validateSnapshot(g));assert(evaluateAssignment(roles,g).length);
 g.deathLog[0].playerId='2L';assert.equal(evaluateAssignment(roles,g).length,0);
 g.demonActionLog[0].targetRole='not_a_role';assert(!validateSnapshot(g));
});

test('Early undisclosed continuous-information deaths support Ojo and Spy weakly',()=>{
 const g=demonGame(10),w={...typhon10(),self:'ojo'};g.night=2;
 claim(g,'1L','flowergirl',24011,'D1');g.roleClaimLog[0].visibility='private';g.roleClaimLog[0].recipients=['2L'];
 g.deathLog=[{id:24012,playerId:'1L',when:'N2',reason:'night_death'}];
 assert.equal(demonPatternSignals(g).earlyContinuousDeaths,1);assert(demonPatternLogBonus(g,w)>0);
 const evidence=analyzeEvidence(g);assert(evidence.global.ojo?.points>0);
});

test('Yaggababble gets only a weak multiple-night-kills indicator',()=>{
 const g=demonGame(10),w={...typhon10(),self:'yaggababble'};g.night=2;
 g.deathLog=[{id:24013,when:'N2',playerId:'1L',reason:'night_death'},{id:24014,when:'N2',playerId:'2L',reason:'night_death'}];
 assert.equal(demonPatternSignals(g).unusualKills,1);assert(demonPatternLogBonus(g,w)>0);
 assert.equal(ROLES.yaggababble.solverSupport,'generic');
});

test('Two incompatible announced Demon modes cannot both be confirmed in a save',()=>{
 const g=demonGame(5);g.alHadikhiaConfirmed=true;g.riotConfirmed=true;assert(!validateSnapshot(g));
 g.riotConfirmed=false;assert(validateSnapshot(g));g.leviathanConfirmed=true;assert(!validateSnapshot(g));
});

test('A Riot nominee who dies can continue the Day-3 nomination chain',()=>{
 const roles={self:'riot','1L':'chef','2L':'monk','2R':'spy','1R':'empath'},g=customGame(roles);g.night=3;g.riotConfirmed=true;
 g.nominationLog=[{id:28001,nominator:'1L',nominee:'2L',when:'D3',voters:[],voteTotal:0,votingOccurred:false},{id:28003,nominator:'2L',nominee:'1R',when:'D3',voters:[],voteTotal:0,votingOccurred:false}];
 g.deathLog=[{id:28002,playerId:'2L',when:'D3',reason:'ability',sourceRoleId:'riot',sourceEventId:28001},{id:28004,playerId:'1R',when:'D3',reason:'ability',sourceRoleId:'riot',sourceEventId:28003}];
 assert(validateSnapshot(g));const histories=evaluateAssignment(roles,g);assert(histories.length);assert(histories.every(w=>!w.alive.includes('2L')&&!w.alive.includes('1R')));
});
