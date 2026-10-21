const { test } = require('../harness.cjs');
const { assert, seats, setupCounts, livingNeighbours, rebuildStatus, observations, latestClaim, diedByExecution, validSetup, evaluateAssignment, canRegisterRole, infoMatches, chefRange, runSearch, analyzeEvidence, nominationAdvice, validateSnapshot, deleteEventGroup, game, context, claim, base, noPoison, ftPair } = require('../fixtures.cjs');

test('Seat ring and counts for every supported game size',()=>{for(let n=5;n<=15;n++){const p=seats(n);assert.equal(p.length,n);assert.equal(new Set(p).size,n);for(const b of[false,true])assert.equal(Object.values(setupCounts(n,b)).reduce((a,b)=>a+b,0),n);}assert.deepEqual(seats(5),['self','1L','2L','2R','1R']);});

test('15-player Baron setup is 7/4/3/1',()=>assert.deepEqual(setupCounts(15,true),{townsfolk:7,outsider:4,minion:3,demon:1}));

test('Living neighbours bridge deaths and wrap correctly',()=>assert.deepEqual(livingNeighbours(seats(9),'self',new Set(['self','2L','3R','4L'])),['3R','2L']));

test('Registration directions are constrained',()=>{assert(canRegisterRole('spy','monk'));assert(!canRegisterRole('spy','imp'));assert(canRegisterRole('recluse','poisoner'));assert(!canRegisterRole('recluse','saint'));assert(!canRegisterRole('spy','monk',true));});

test('Chef registration varies per PAIR, not one global alignment',()=>{const c=context({a:'imp',b:'recluse',c:'poisoner',d:'chef',e:'monk'});assert.deepEqual(chefRange(c),[0,2]);assert(infoMatches('chef','d',{kind:'number',value:1},c));});

test('Character role and team alignment are independent',()=>{const c=context({a:'imp',b:'poisoner',c:'chef',d:'empath',e:'monk'});c.alignment={a:'good',b:'evil',c:'good',d:'good',e:'good'};assert.deepEqual(chefRange(c),[0,0]);assert(infoMatches('chef','c',{kind:'number',value:0},c));});

test('Fortune Teller detects dead Imp',()=>{const c=context(base,null,'2L');c.alive.delete('1R');assert(infoMatches('fortune_teller','self',{kind:'pairYesNo',players:['1R','1L'],result:'yes'},c));assert(!infoMatches('fortune_teller','self',{kind:'pairYesNo',players:['1R','1L'],result:'no'},c));});

test('Fortune Teller red herring stays a positive even when dead',()=>{const c=context(base,null,'1L');c.alive.delete('1L');assert(!infoMatches('fortune_teller','self',{kind:'pairYesNo',players:['1L','2L'],result:'no'},c));});

test('Recluse can register either way to Fortune Teller',()=>{const c=context({...base,'1L':'recluse'},null,'self');for(const result of ['yes','no'])assert(infoMatches('fortune_teller','self',{kind:'pairYesNo',players:['1L','2L'],result},c));});

test('Poisoned Recluse cannot supply optional positive',()=>{const c=context({...base,'1L':'recluse'},'1L','self');assert(!infoMatches('fortune_teller','self',{kind:'pairYesNo',players:['1L','2L'],result:'yes'},c));});

test('Undertaker may read executed Recluse as Imp',()=>assert(infoMatches('undertaker','self',{kind:'roleReveal',player:'1L',shownRole:'imp'},context({...base,'1L':'recluse'}))));

test('Drunk is revealed as Drunk, not as believed Townsfolk',()=>{const c=context({...base,'1L':'drunk'});assert(infoMatches('undertaker','self',{kind:'roleReveal',player:'1L',shownRole:'drunk'},c));assert(!infoMatches('undertaker','self',{kind:'roleReveal',player:'1L',shownRole:'empath'},c));});

test('Legal setup requires unique roles',()=>{assert(validSetup(base,game()));assert(!validSetup({...base,'1L':'fortune_teller'},game()));});

test('Own shown Townsfolk can be Drunk, but token cannot duplicate actual role',()=>{const g=game();g.selfRole.shownRole='fortune_teller';const w={self:'drunk','1L':'chef','2L':'baron','2R':'saint','1R':'imp'};assert(validSetup(w,g));assert(!validSetup({...w,'1L':'fortune_teller'},g));});

test('Claims alone never exclude a legal good bluff world',()=>{const g=game();claim(g,'1L','imp');assert(evaluateAssignment(base,g).length>0);});

test('FT red herring must be consistent across nights',()=>{const g=game();g.night=2;g.selfRole.shownRole='fortune_teller';g.selfInfoLog=[{id:1,roleId:'fortune_teller',when:'N1',...ftPair,result:'yes'},{id:2,roleId:'fortune_teller',when:'N2',...ftPair,result:'no'}];assert.equal(evaluateAssignment(noPoison,g).length,0);});

test('Poison can rescue a changing direct FT reading',()=>{const g=game();g.night=2;g.selfRole.shownRole='fortune_teller';g.selfInfoLog=[{id:1,roleId:'fortune_teller',when:'N1',...ftPair,result:'yes'},{id:2,roleId:'fortune_teller',when:'N2',...ftPair,result:'no'}];assert(evaluateAssignment(base,g).length>0);});

test('Poison does not imply the received answer must be false',()=>{const g=game();g.selfRole.shownRole='fortune_teller';g.selfInfoLog=[{id:1,roleId:'fortune_teller',when:'N1',players:['1R','2L'],result:'yes'}];const w=evaluateAssignment(base,g,8);assert(w.some(w=>w.info[1]==='works'));});

test('Drunk direct inconsistent readings are observations, not truth',()=>{const g=game();g.night=2;g.selfRole.shownRole='fortune_teller';g.selfInfoLog=[{id:1,roleId:'fortune_teller',when:'N1',...ftPair,result:'yes'},{id:2,roleId:'fortune_teller',when:'N2',...ftPair,result:'no'}];const w={self:'drunk','1L':'chef','2L':'baron','2R':'saint','1R':'imp'};const hs=evaluateAssignment(w,g);assert(hs.length);assert(hs.every(h=>h.info[1]==='drunk'&&h.info[2]==='drunk'));});

test('Different players cannot both be poisoned on the same cycle',()=>{const g=game();g.abilityClaimLog=[{id:1,playerId:'self',roleId:'fortune_teller',when:'N1',targets:['1R','1L'],result:null,structured:{kind:'pairYesNo',players:['1R','1L'],result:'no'},visibility:'public',recipients:[]},{id:2,playerId:'1L',roleId:'empath',when:'N1',targets:[],result:null,structured:{kind:'number',value:2},visibility:'public',recipients:[]}];const hs=evaluateAssignment(base,g,12);assert(hs.length);assert(hs.every(h=>!(h.info[1]==='poison'&&h.info[2]==='poison')));});

test('Failed Slayer shot does not confirm shooter or target',()=>{const g=game();g.abilityTriggerLog=[{id:1,roleId:'slayer',rolePlayerId:'1L',targetPlayerId:'1R',when:'D1',triggered:false}];assert(evaluateAssignment(base,g).length>0);assert.equal(analyzeEvidence(g).players['1L'].confirmedRole,undefined);});

test('Slayer miss on actual Imp requires impaired/spent/fake shooter',()=>{const g=game();g.abilityTriggerLog=[{id:1,roleId:'slayer',rolePlayerId:'1L',targetPlayerId:'1R',when:'D1',triggered:false}];assert.equal(evaluateAssignment({...noPoison,'1L':'slayer'},g).length,0);assert(evaluateAssignment({...base,'1L':'slayer'},g).some(w=>w.requiredPoison[1]==='1L'));});

test('Successful Slayer can kill Recluse',()=>{const g=game();const w={self:'slayer','1L':'recluse','2L':'baron','2R':'saint','1R':'imp'};g.abilityTriggerLog=[{id:1,roleId:'slayer',rolePlayerId:'self',targetPlayerId:'1L',when:'D1',triggered:true}];g.deathLog=[{id:2,playerId:'1L',when:'D1',reason:'ability',sourceRoleId:'slayer',sourceEventId:1}];assert(evaluateAssignment(w,g).length);});

test('Virgin first nomination by Townsfolk must trigger if healthy',()=>{const g=game();g.nominationLog=[{id:1,nominator:'self',nominee:'2L',when:'D1',voters:[]}];g.abilityTriggerLog=[{id:2,roleId:'virgin',rolePlayerId:'2L',targetPlayerId:'self',when:'D1',triggered:false,sourceEventId:1}];assert.equal(evaluateAssignment(noPoison,g).length,0);assert(evaluateAssignment(base,g).some(w=>w.requiredPoison[1]==='2L'));});

test('Failed first Virgin test uses the ability',()=>{const g=game();g.night=2;g.nominationLog=[{id:1,nominator:'2R',nominee:'2L',when:'D1',voters:[]},{id:3,nominator:'self',nominee:'2L',when:'D2',voters:[]}];g.abilityTriggerLog=[{id:2,roleId:'virgin',rolePlayerId:'2L',targetPlayerId:'2R',when:'D1',triggered:false,sourceEventId:1},{id:4,roleId:'virgin',rolePlayerId:'2L',targetPlayerId:'self',when:'D2',triggered:true,sourceEventId:3}];assert.equal(evaluateAssignment(noPoison,g).length,0);});

test('Spy may trigger Virgin but stays evil',()=>{const g=game();g.nominationLog=[{id:1,nominator:'2R',nominee:'2L',when:'D1',voters:[],votingOccurred:false}];g.abilityTriggerLog=[{id:2,roleId:'virgin',rolePlayerId:'2L',targetPlayerId:'2R',when:'D1',triggered:true,sourceEventId:1}];g.deathLog=[{id:3,playerId:'2R',when:'D1',reason:'execution',sourceRoleId:'virgin',sourceEventId:2}];assert(evaluateAssignment(noPoison,g).length);assert.equal(analyzeEvidence(g).players['2R'].confirmedRole,undefined);});

test('Virgin death counts as execution for Undertaker',()=>{const g=game();g.night=2;g.selfRole.shownRole='undertaker';g.deathLog=[{id:2,playerId:'1L',when:'D1',reason:'ability',sourceRoleId:'virgin'}];g.selfInfoLog=[{id:3,roleId:'undertaker',when:'N2',player:'1L',shownRole:'empath'}];assert(diedByExecution(g.deathLog[0]));assert(evaluateAssignment({...noPoison,self:'undertaker'},g).length);});

test('Scarlet Woman takes over when Imp is executed with FIVE alive before death',()=>{const g=game();g.night=2;g.deathLog=[{id:1,playerId:'1R',when:'D1',reason:'execution'}];const hs=evaluateAssignment({...base,'2R':'scarlet_woman'},g);assert(hs.length);assert(hs.every(w=>w.current['2R']==='imp'));});

test('Scarlet Woman does NOT save executed Imp with FOUR alive',()=>{const g=game();g.night=2;g.deathLog=[{id:1,playerId:'1L',when:'D1',reason:'ability'},{id:2,playerId:'1R',when:'D1',reason:'execution'}];assert.equal(evaluateAssignment({...base,'2R':'scarlet_woman'},g).length,0);});

test('Imp night self-kill can pass to a living minion',()=>{const g=game();g.night=2;g.deathLog=[{id:1,playerId:'1R',when:'N2',reason:'night_death'}];const hs=evaluateAssignment(base,g);assert(hs.length);assert(hs.every(w=>w.current['2R']==='imp'));});

test('Poison effect ends when Poisoner becomes Imp',()=>{const g=game();g.night=2;g.selfRole.shownRole='fortune_teller';g.deathLog=[{id:1,playerId:'1R',when:'N2',reason:'night_death'}];g.selfInfoLog=[{id:2,roleId:'fortune_teller',when:'N2',players:['2R','1L'],result:'no'}];assert.equal(evaluateAssignment(base,g).length,0);});

test('Healthy Saint execution cannot allow another night',()=>{const g=game();g.night=2;g.deathLog=[{id:1,playerId:'2R',when:'D1',reason:'execution'}];const w={self:'fortune_teller','1L':'butler','2L':'baron','2R':'saint','1R':'imp'};assert.equal(evaluateAssignment(w,g).length,0);});

test('Soldier cannot die to ordinary Imp attack while healthy',()=>{const g=game();g.night=2;g.deathLog=[{id:1,playerId:'1L',when:'N2',reason:'night_death'}];assert.equal(evaluateAssignment({...noPoison,'1L':'soldier'},g).length,0);assert(evaluateAssignment({...base,'1L':'soldier'},g).some(w=>w.requiredPoison[2]==='1L'));});

test('Monk chosen protection is conditional on being genuine and healthy',()=>{const g=game();g.night=2;g.selfRole.shownRole='monk';g.selfActionLog=[{id:1,roleId:'monk',when:'N2',target:'1L'}];g.deathLog=[{id:2,playerId:'1L',when:'N2',reason:'night_death'}];assert.equal(evaluateAssignment({...noPoison,self:'monk'},g).length,0);assert(evaluateAssignment({...base,self:'monk'},g).some(w=>w.requiredPoison[2]==='self'));});

test('Missing night death is not automatically a confirmed no-kill night',()=>{const g=game();g.night=2;assert(evaluateAssignment(noPoison,g).length);g.completedNights=[2];assert.equal(evaluateAssignment(noPoison,g).length,0);});

test('On a completed night Imp can target an already dead player',()=>{const g=game();g.night=2;g.completedNights=[2];g.deathLog=[{id:1,playerId:'1L',when:'D1',reason:'execution'}];assert(evaluateAssignment(noPoison,g).length);});

test('Own dead vote is consumed, living vote is not',()=>{const g=game();g.deathLog=[{id:1,playerId:'self',when:'D1',reason:'ability'}];g.nominationLog=[{id:2,nominator:'1L',nominee:'1R',when:'D1',voters:['self','2L']}];const s=rebuildStatus(g);assert.equal(s.self.deadVoteAvailable,false);assert.equal(s['2L'].deadVoteAvailable,true);});

test('Virgin event before voting consumes NO ghost votes',()=>{const g=game();g.deathLog=[{id:1,playerId:'self',when:'D1',reason:'ability'}];g.nominationLog=[{id:2,nominator:'1L',nominee:'1R',when:'D1',voters:['self'],votingOccurred:false}];assert.equal(rebuildStatus(g).self.deadVoteAvailable,true);});

test('Historical role claim uses occurrence time, not time entered',()=>{const g=game();claim(g,'1L','empath',1,'D2');claim(g,'1L','chef',2,'D1');assert.equal(latestClaim(g,'1L').subject.roleId,'empath');});

test('Repeated relayed info, even swapped pair order, is one observation',()=>{const g=game();for(let i=0;i<3;i++)g.abilityClaimLog.push({id:i+1,playerId:'2L',sourcePlayerId:'1L',roleId:'fortune_teller',when:'N1',targets:[],result:null,structured:{kind:'pairYesNo',players:i===1?['1R','self']:['self','1R'],result:'yes'},visibility:'public',recipients:[]});assert.equal(observations(g).length,1);});

test('Saint claim alone adds no evil points',()=>{const g=game();claim(g,'1L','saint');assert.equal(analyzeEvidence(g).players['1L'].evil,0);});

test('Unknown conversation alone adds no evil or good points',()=>{const g=game();g.talkLog=[{id:1,participants:['1L','2L'],when:'D1',topic:null,details:null}];const e=analyzeEvidence(g);assert.equal(e.players['1L'].evil,0);assert.equal(e.players['1L'].good,0);});

test('Failed Virgin test alone adds no evil points',()=>{const g=game();g.abilityTriggerLog=[{id:1,roleId:'virgin',rolePlayerId:'1L',targetPlayerId:'2L',when:'D1',triggered:false}];const e=analyzeEvidence(g);assert.equal(e.players['1L'].evil,0);assert.equal(e.players['2L'].evil,0);});

test('Manual read does not feed back into scoring',()=>{const g=game();g.manualReads['1L']={playerId:'1L',roleId:'imp',alignment:'evil',note:'guess',updatedAt:1};assert.equal(analyzeEvidence(g).players['1L'].evil,0);});

test('Deleting linked Virgin nomination removes trigger and execution atomically',()=>{const g=game();g.nominationLog=[{id:1,nominator:'self',nominee:'1L',when:'D1',voters:[],votingOccurred:false}];g.abilityTriggerLog=[{id:2,roleId:'virgin',rolePlayerId:'1L',targetPlayerId:'self',when:'D1',triggered:true,sourceEventId:1}];g.deathLog=[{id:3,playerId:'self',when:'D1',reason:'execution',sourceRoleId:'virgin',sourceEventId:2}];const next=deleteEventGroup(g,'deathLog',3);assert.equal(next.nominationLog.length+next.deathLog.length+next.abilityTriggerLog.length,0);assert.equal(next.playerStatus.self.alive,true);});

test('Malformed import is rejected; proper snapshot accepted',()=>{assert(validateSnapshot(game()));assert(!validateSnapshot({}));assert(!validateSnapshot({...game(),playerCount:900}));});

test('Barely explored samples never cause red/blue/green confidence warnings',()=>{const g=game();const r={players:{'1L':{evil:.99,drunk:.9,poison:{1:.99},roles:{imp:.99}}},unique:1,effectiveWorlds:1};assert.equal(analyzeEvidence(g,r).players['1L'].warnings.length,0);});

test('Sparse data nomination guidance stays HOLD',()=>{const g=game();assert.equal(nominationAdvice(g,null,'1L').verdict,'hold');});

test('Sampler returns bounded exploratory shares, not proof flags',()=>{const g=game();const r=runSearch(g,{attempts:150,seed:123,maxMillis:3000});assert(r.unique>0);assert.equal(r.exhaustive,false);assert(Math.abs(Object.values(r.players).reduce((s,p)=>s+p.evil,0)-2)<1e-9);});

test('Import rejects unknown participant ids',()=>{const g=game();g.talkLog=[{id:1,participants:['1L','not-a-player'],when:'D1',topic:null,details:null}];assert(!validateSnapshot(g));});

test('Import rejects duplicate event ids',()=>{const g=game();claim(g,'1L','saint',1);claim(g,'1R','saint',1);assert(!validateSnapshot(g));});

test('Dead poisoned information character cannot receive later nightly info',()=>{const g=game();g.night=2;g.selfRole.shownRole='fortune_teller';g.deathLog=[{id:1,playerId:'self',when:'D1',reason:'execution'}];g.selfInfoLog=[{id:2,roleId:'fortune_teller',when:'N2',players:['1L','2L'],result:'yes'}];assert.equal(evaluateAssignment(base,g).length,0);});

test('Dead Drunk cannot keep receiving fake recurring info',()=>{const g=game();g.night=2;g.selfRole.shownRole='fortune_teller';g.deathLog=[{id:1,playerId:'self',when:'D1',reason:'execution'}];g.selfInfoLog=[{id:2,roleId:'fortune_teller',when:'N2',players:['1L','2L'],result:'yes'}];const w={self:'drunk','1L':'chef','2L':'baron','2R':'saint','1R':'imp'};assert.equal(evaluateAssignment(w,g).length,0);});

test('Drunk has one fixed believed character, not a different one each report',()=>{const g=game();const w={self:'chef','1L':'drunk','2L':'baron','2R':'saint','1R':'imp'};g.abilityClaimLog=[{id:1,playerId:'1L',roleId:'fortune_teller',when:'N1',targets:[],result:null,structured:{kind:'pairYesNo',players:['1R','self'],result:'yes'},visibility:'public',recipients:[]},{id:2,playerId:'1L',roleId:'empath',when:'N1',targets:[],result:null,structured:{kind:'number',value:0},visibility:'public',recipients:[]}];const hs=evaluateAssignment(w,g,10);assert(hs.length);assert(hs.every(h=>!(h.info[1]==='drunk'&&h.info[2]==='drunk')));});

test('Two living players with a Demon cannot continue to another night',()=>{const g=game();g.night=3;g.deathLog=[{id:1,playerId:'2L',when:'D1',reason:'execution'},{id:2,playerId:'1L',when:'N2',reason:'night_death'},{id:3,playerId:'self',when:'D2',reason:'execution'}];assert.equal(evaluateAssignment(base,g).length,0);});

test('Public proof can flag contradictory manual read without sampling',()=>{const g=game();g.abilityTriggerLog=[{id:1,roleId:'virgin',rolePlayerId:'1L',targetPlayerId:'self',when:'D1',triggered:true}];g.manualReads['1L']={playerId:'1L',roleId:'spy',alignment:'evil',note:'guess',updatedAt:1};assert(analyzeEvidence(g).players['1L'].warnings.some(w=>w.color==='yellow'));});
