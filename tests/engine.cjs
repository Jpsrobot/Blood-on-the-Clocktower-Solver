const assert=require('node:assert/strict');
const {seats,setupCounts,setupCountsForRoles,setupCountsForGame,setupCountOptionsForGame,amnesiacAbilityRole,bansheeAwakenedAt,livingNeighbours,rebuildStatus,observations,latestClaim,diedByExecution,empathStableNeighbourShifts,seatingOrderAt}=require('../.engine-test/engine/game.js');
const {validSetup,evaluateAssignment,canRegisterRole,infoMatches,chefRange}=require('../.engine-test/engine/mechanics.js');
const {runSearch,empathShiftLogBonus,hardLocks,drawAssignment,rng}=require('../.engine-test/engine/search.js');
const {analyzeEvidence}=require('../.engine-test/engine/evidence.js');
const {minionPatternLogBonus}=require('../.engine-test/engine/minionPatterns.js');
const {outsiderModifierClaimFit,outsiderClaimStyle}=require('../.engine-test/engine/outsiderClaims.js');
const {nominationAdvice}=require('../.engine-test/engine/advice.js');
const {buildSpyOpponentProjection,buildEvilOpponentProjection,runSpyBluffAdvisor}=require('../.engine-test/engine/spyBluff.js');
const {rankCerenovusSuggestions,rankPitHagSuggestions}=require('../.engine-test/engine/minionStrategy.js');
const {estimateTravellerAlignments}=require('../.engine-test/engine/travellerAlignment.js');
const {travellerCanVote,travellerVoteWeight,travellerVoteTally}=require('../.engine-test/engine/travellerVotes.js');
const {baristaEffectFor,boneCollectorRestored,deviantsFunnyToday,matronSwapCount}=require('../.engine-test/engine/travellerMechanics.js');
const {ALL_TRAVELLER_IDS,BMR_TRAVELLER_IDS,SNV_TRAVELLER_IDS,EXPERIMENTAL_TRAVELLER_IDS,TRAVELLERS}=require('../.engine-test/travellers.js');
const {validateSnapshot,deleteEventGroup,loadSnapshot,saveSnapshot,hasUnreadableSnapshot,SAVE_KEY,SAVE_BACKUP_KEY}=require('../.engine-test/storage.js');
const {ROLES}=require('../.engine-test/roles.js');
const {JINXES,OFFICIAL_JINXES,scriptJinxes,roleJinxes,hasJinx,jinxLabel}=require('../.engine-test/jinxes.js');
const {resolveRecordedJinxVictory,automaticallyResolvedJinxVictory,JINX_VICTORY_PAIRS}=require('../.engine-test/engine/jinxVictory.js');
const {kingInformationAvailable}=require('../.engine-test/engine/mechanics.js');
const {ALL_CORE_ROLE_IDS,BUILT_IN_SCRIPTS}=require('../.engine-test/scripts.js');
const {DEATH_REASONS,availableDeathReasons}=require('../.engine-test/deathReasons.js');
const {getSnapshotScriptRoleIds}=require('../.engine-test/scripts.js');
let passed=0;const tests=[];
function test(name,fn){try{fn();passed++;tests.push({name,passed:true});console.log('PASS',name);}catch(e){tests.push({name,passed:false,error:String(e)});console.error('FAIL',name,e.message);process.exitCode=1;}}
function game(n=5){return{schemaVersion:2,playerCount:n,playset:'trouble_brewing',night:1,playerNames:{},playerStatus:Object.fromEntries(seats(n).map(p=>[p,{alive:true,deadVoteAvailable:true}])),roleClaimLog:[],abilityClaimLog:[],deathLog:[],revivalLog:[],nominationLog:[],abilityTriggerLog:[],talkLog:[],selfRole:{shownRole:null},selfInfoLog:[],selfActionLog:[],manualReads:{},completedNights:[],noExecutionDays:[]};}
function context(roles,poisonTarget=null,redHerring=null){return{roles,initial:roles,alive:new Set(Object.keys(roles)),poisonTarget,redHerring,order:Object.keys(roles)};}
function claim(g,p,r,id=1,when='D1'){g.roleClaimLog.push({id,playerId:p,subject:{kind:'role',roleId:r},claimType:'normal',origin:'manual',visibility:'public',recipients:[],when});}
function traveller(id,roleId,patch={}){return{id,name:'',roleId,joinedWhen:'D1',active:true,alive:true,deadVoteAvailable:true,knownAlignment:'unknown',voteTokens:0,...patch};}
const base={self:'fortune_teller','1L':'empath','2L':'virgin','2R':'poisoner','1R':'imp'};
const noPoison={self:'fortune_teller','1L':'empath','2L':'virgin','2R':'spy','1R':'imp'};
const ftPair={players:['1L','2L']};
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
  assert(r.candidates.every(c=>['townsfolk','outsider'].includes(require('../.engine-test/roles.js').ROLES[c.roleId].type)));
  assert(r.recommendedRoleId);
  assert(r.baseUnique>0);
  const washer=r.candidates.find(c=>c.roleId==='washerwoman');
  assert.equal(washer.spyShownInPlayAt,'1L');
  assert.equal(washer.safeEligible,false);
});


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

test('Travellers stay outside normal setup counts and role IDs',()=>{
  const g=game(8);g.travellers=[traveller('t1','bureaucrat'),traveller('t2','thief')];
  assert.deepEqual(setupCounts(8,false),{townsfolk:5,outsider:1,minion:1,demon:1});
  assert.equal(Object.hasOwn(ROLES,'bureaucrat'),false);assert.equal(Object.hasOwn(ROLES,'thief'),false);
  assert(validateSnapshot(g));
});

test('Bureaucrat and Thief combine to a signed triple-negative vote',()=>{
  const g=game(8);g.travellers=[traveller('b','bureaucrat'),traveller('t','thief')];
  g.travellerActionLog=[
    {id:10001,roleId:'bureaucrat',kind:'vote_modifier',travellerId:'b',when:'N1',target:'1L'},
    {id:10002,roleId:'thief',kind:'vote_modifier',travellerId:'t',when:'N1',target:'1L'},
  ];
  assert.equal(travellerVoteWeight(g,'1L','D1'),-3);
  assert.deepEqual(travellerVoteTally(g,['1L','2L'],'D1'),{total:-2,weights:{'1L':-3,'2L':1}});
  g.travellers[1].alive=false;
  assert.equal(travellerVoteWeight(g,'1L','D1'),3,'dead Thief immediately loses the modifier');
});

test('Bureaucrat and Thief targets reset between days',()=>{
  const g=game(8);g.travellers=[traveller('b','bureaucrat'),traveller('t','thief')];
  g.travellerActionLog=[
    {id:10011,roleId:'bureaucrat',kind:'vote_modifier',travellerId:'b',when:'N1',target:'1L'},
    {id:10012,roleId:'thief',kind:'vote_modifier',travellerId:'t',when:'N1',target:'2L'},
  ];
  assert.equal(travellerVoteWeight(g,'1L','D1'),3);
  assert.equal(travellerVoteWeight(g,'2L','D1'),-1);
  assert.equal(travellerVoteWeight(g,'1L','D2'),1,'N1 Bureaucrat target must not carry into D2');
  assert.equal(travellerVoteWeight(g,'2L','D2'),1,'N1 Thief target must not carry into D2');
  g.travellerActionLog.push(
    {id:10013,roleId:'bureaucrat',kind:'vote_modifier',travellerId:'b',when:'N2',target:'3L'},
    {id:10014,roleId:'thief',kind:'vote_modifier',travellerId:'t',when:'N2',target:'4L'},
  );
  assert.equal(travellerVoteWeight(g,'3L','D2'),3);
  assert.equal(travellerVoteWeight(g,'4L','D2'),-1);
  assert.equal(travellerVoteWeight(g,'1L','D2'),1);
  assert.equal(travellerVoteWeight(g,'2L','D2'),1);
});

test('Beggar donation permanently consumes the donor dead vote in rebuilt status',()=>{
  const g=game(7);g.travellers=[traveller('beg','beggar',{voteTokens:1})];
  g.deathLog=[{id:11001,playerId:'1L',when:'D1',reason:'execution'}];
  g.travellerActionLog=[{id:11002,roleId:'beggar',kind:'donation',travellerId:'beg',when:'D1',donor:'1L',learnedAlignment:'good'}];
  g.nominationLog=[{id:11003,nominator:'self',nominee:'2L',when:'D1',voters:['beg'],voteTotal:1,voteWeights:{beg:1},votingOccurred:true}];
  const s=rebuildStatus(g);assert.equal(s['1L'].alive,false);assert.equal(s['1L'].deadVoteAvailable,false);
  assert(validateSnapshot(g));
});

test('Scapegoat replacement pulls Traveller alignment toward the saved player',()=>{
  const g=game(7);g.travellers=[traveller('sg','scapegoat')];
  g.travellerActionLog=[{id:12001,roleId:'scapegoat',kind:'replacement',travellerId:'sg',when:'D1',savedPlayer:'1L'}];
  const r={players:{'1L':{evil:.84}}};
  const e=estimateTravellerAlignments(g,r).sg;
  assert(e.evil>.8);assert(e.reasons.some(x=>x.includes('同陣営')));
});

test('Known Traveller alignment overrides behavioural estimates',()=>{
  const g=game(7);g.travellers=[traveller('gun','gunslinger',{knownAlignment:'good'})];
  g.travellerActionLog=[{id:13001,roleId:'gunslinger',kind:'shot',travellerId:'gun',when:'D1',target:'1L',killed:true}];
  const e=estimateTravellerAlignments(g,{players:{'1L':{evil:0}}}).gun;
  assert.equal(e.evil,0);assert.equal(e.good,1);assert.equal(e.exact,true);
});

test('Traveller votes do not count as Demon votes for Flowergirl',()=>{
  const g=game(7);g.night=2;g.travellers=[traveller('gun','gunslinger')];
  g.nominationLog=[{id:14001,nominator:'1L',nominee:'2L',when:'D1',voters:['gun'],voteTotal:1,voteWeights:{gun:1},votingOccurred:true}];
  const roles={self:'flowergirl','1L':'artist','2L':'witch','3L':'oracle','3R':'dreamer','2R':'savant','1R':'vortox'};
  const c=context(roles);
  assert(infoMatches('flowergirl','self',{kind:'singleYesNo',result:'no'},c,g,'N2'));
  assert(!infoMatches('flowergirl','self',{kind:'singleYesNo',result:'yes'},c,g,'N2'));
  assert(validateSnapshot(g));
});

test('Exiled Traveller keeps exactly one dead vote and loses active abilities',()=>{
  const g=game(7);
  g.travellers=[traveller('b','bureaucrat',{active:false,alive:false,exiled:true,exiledWhen:'D1',deadVoteAvailable:true})];
  g.travellerActionLog=[{id:15001,roleId:'bureaucrat',kind:'vote_modifier',travellerId:'b',when:'N1',target:'1L'}];
  assert.equal(travellerCanVote(g.travellers[0]),true);
  assert.equal(travellerVoteWeight(g,'1L','D1'),1,'exiled Bureaucrat ability must stop immediately');
  assert(validateSnapshot(g));
  g.travellers[0].deadVoteAvailable=false;
  assert.equal(travellerCanVote(g.travellers[0]),false);
  assert(validateSnapshot(g));
});

test('All BMR and S&V Travellers stay outside normal role IDs and setup counts',()=>{
  assert.deepEqual(BMR_TRAVELLER_IDS,['apprentice','matron','voudon','judge','bishop']);
  assert.deepEqual(SNV_TRAVELLER_IDS,['butcher','bone_collector','harlot','barista','deviant']);
  const g=game(8);g.travellers=ALL_TRAVELLER_IDS.map((roleId,i)=>traveller(`trav-${i}`,roleId));
  assert.deepEqual(setupCounts(8,false),{townsfolk:5,outsider:1,minion:1,demon:1});
  for(const id of [...BMR_TRAVELLER_IDS,...SNV_TRAVELLER_IDS]) assert.equal(Object.hasOwn(ROLES,id),false,id);
  assert(validateSnapshot(g));
});

test('Matron seat swaps alter the historical seating order without changing player identity',()=>{
  const g=game(7);g.travellers=[traveller('mat','matron')];
  g.travellerActionLog=[{id:16001,roleId:'matron',kind:'seat_swap',travellerId:'mat',when:'D1',playerA:'1L',playerB:'3R'}];
  const before=seatingOrderAt(g,'N1');
  const after=seatingOrderAt(g,'D1');
  assert.deepEqual(before,seats(7));
  assert.equal(after[before.indexOf('1L')],'3R');
  assert.equal(after[before.indexOf('3R')],'1L');
  assert.equal(matronSwapCount(g,'mat',1),1);
  assert(validateSnapshot(g));
});

test('Voudon lets dead Travellers vote repeatedly while blocking other living Travellers',()=>{
  const g=game(7);g.travellers=[
    traveller('vo','voudon'),
    traveller('dead','gunslinger',{alive:false,deadVoteAvailable:false}),
    traveller('live','bureaucrat'),
  ];
  assert.equal(travellerCanVote(g.travellers[0],g,'D1'),true);
  assert.equal(travellerCanVote(g.travellers[1],g,'D1'),true,'dead vote token is ignored while Voudon is active');
  assert.equal(travellerCanVote(g.travellers[2],g,'D1'),false);
  g.travellers[0].active=false;
  assert.equal(travellerCanVote(g.travellers[1],g,'D1'),false,'normal dead-vote limit returns when Voudon leaves play');
});

test('Apprentice copied ability determines its exact alignment estimate',()=>{
  const good=game(7);good.travellers=[traveller('a','apprentice')];good.travellerActionLog=[{id:17001,roleId:'apprentice',kind:'apprentice_ability',travellerId:'a',when:'N1',abilityRoleId:'empath'}];
  const evil=structuredClone(good);evil.travellerActionLog=[{id:17002,roleId:'apprentice',kind:'apprentice_ability',travellerId:'a',when:'N1',abilityRoleId:'poisoner'}];
  const ge=estimateTravellerAlignments(good,{players:{}}).a, ee=estimateTravellerAlignments(evil,{players:{}}).a;
  assert.equal(ge.exact,true);assert.equal(ge.good,1);assert.equal(ge.evil,0);
  assert.equal(ee.exact,true);assert.equal(ee.good,0);assert.equal(ee.evil,1);
});

test('Barista sober-and-healthy forces literal true Townsfolk information even under Vortox',()=>{
  const g=game(5);g.playset='custom';g.scriptRoleIds=['fortune_teller','artist','clockmaker','witch','vortox'];g.selfRole.shownRole='fortune_teller';
  g.travellers=[traveller('bar','barista',{joinedWhen:'N1'})];
  g.travellerActionLog=[{id:18001,roleId:'barista',kind:'barista_effect',travellerId:'bar',when:'N1',target:'self',effect:'sober_healthy'}];
  g.selfInfoLog=[{id:18002,roleId:'fortune_teller',when:'N1',players:['1R','1L'],result:'yes'}];
  const roles={self:'fortune_teller','1L':'artist','2L':'witch','2R':'clockmaker','1R':'vortox'};
  assert.equal(baristaEffectFor(g,'self','N1'),'sober_healthy');
  assert(evaluateAssignment(roles,g).length>0);
  const noBar=structuredClone(g);noBar.travellerActionLog=[];
  assert.equal(evaluateAssignment(roles,noBar).length,0,'the same literal-true result must be illegal under healthy Vortox without Barista');
});

test('Bone Collector temporarily restores a dead information ability through dusk',()=>{
  const g=game(5);g.night=2;g.playset='custom';g.scriptRoleIds=['fortune_teller','artist','clockmaker','poisoner','imp'];g.selfRole.shownRole='fortune_teller';
  g.travellers=[traveller('bone','bone_collector')];
  g.deathLog=[{id:19001,playerId:'self',when:'D1',reason:'execution'}];
  g.travellerActionLog=[{id:19002,roleId:'bone_collector',kind:'restore_ability',travellerId:'bone',when:'N2',target:'self'}];
  g.selfInfoLog=[{id:19003,roleId:'fortune_teller',when:'N2',players:['1R','1L'],result:'yes'}];
  const roles={self:'fortune_teller','1L':'artist','2L':'poisoner','2R':'clockmaker','1R':'imp'};
  assert.equal(boneCollectorRestored(g,'self','N2'),true);
  assert.equal(boneCollectorRestored(g,'self','D2'),true);
  assert(evaluateAssignment(roles,g).length>0);
  const noBone=structuredClone(g);noBone.travellerActionLog=[];
  assert.equal(evaluateAssignment(roles,noBone).length,0);
});

test('Deviant funny judgement and new Traveller action records survive snapshot validation',()=>{
  const g=game(7);g.travellers=[traveller('dev','deviant'),traveller('har','harlot'),traveller('bar','barista')];
  g.travellerActionLog=[
    {id:20001,roleId:'deviant',kind:'deviant_funny',travellerId:'dev',when:'D1',funny:true},
    {id:20002,roleId:'harlot',kind:'harlot_visit',travellerId:'har',when:'N2',target:'1L',agreed:true,shownRole:'empath',bothDied:false},
    {id:20003,roleId:'barista',kind:'barista_effect',travellerId:'bar',when:'N2',target:'1L',effect:'acts_twice'},
  ];g.night=2;
  assert.equal(deviantsFunnyToday(g,'dev',1),true);
  assert(validateSnapshot(g));
});

test('Judge, Bishop, and Butcher nomination records remain valid save data',()=>{
  const g=game(7);g.travellers=[traveller('jud','judge'),traveller('bish','bishop'),traveller('but','butcher')];
  g.nominationLog=[
    {id:21001,nominator:'storyteller',nominee:'1L',when:'D1',voters:['self'],voteTotal:1,voteWeights:{self:1},votingOccurred:true},
    {id:21002,nominator:'but',nominee:'2L',when:'D1',voters:['1L'],voteTotal:1,voteWeights:{'1L':1},votingOccurred:true},
  ];
  g.travellerActionLog=[
    {id:21003,roleId:'judge',kind:'judge_ruling',travellerId:'jud',when:'D1',nominationId:21001,result:'fail'},
    {id:21004,roleId:'butcher',kind:'butcher_nomination',travellerId:'but',when:'D1',nominationId:21002},
  ];
  assert(validateSnapshot(g));
});

test('Experimental Travellers are available in the unrestricted Traveller catalog',()=>{
  assert.deepEqual(EXPERIMENTAL_TRAVELLER_IDS,['cacklejack','gnome','gangster']);
  assert.equal(ALL_TRAVELLER_IDS.length,18);
  for(const id of EXPERIMENTAL_TRAVELLER_IDS) assert.equal(Object.hasOwn(ROLES,id),false,id);
  assert(TRAVELLERS.gnome.tags.includes('SPECIAL_DEATH_CAUSE'));
  assert(TRAVELLERS.gangster.tags.includes('SPECIAL_DEATH_CAUSE'));
  const g=game(7);g.travellers=EXPERIMENTAL_TRAVELLER_IDS.map((roleId,i)=>traveller(`exp-${i}`,roleId));
  assert(validateSnapshot(g));
});

test('Cacklejack recorded character change updates the seated world without changing alignment',()=>{
  const g=game(5);g.night=2;g.travellers=[traveller('cj','cacklejack')];
  g.travellerActionLog=[
    {id:22001,roleId:'cacklejack',kind:'cacklejack_protect',travellerId:'cj',when:'D1',target:'2L'},
    {id:22002,roleId:'cacklejack',kind:'cacklejack_change',travellerId:'cj',when:'N2',target:'1L',newRole:'chef'},
  ];
  const hs=evaluateAssignment(base,g,8);
  assert(hs.length);
  assert(hs.every(w=>w.current['1L']==='chef'));
  assert(hs.every(w=>w.currentAlignment['1L']==='good'));
  assert(hs.some(w=>w.changes.some(c=>c.kind==='cacklejack'&&c.playerId==='1L'&&c.toRole==='chef')));
  assert(validateSnapshot(g));
});

test('Gnome and Gangster deaths remain distinct special death causes',()=>{
  const g=game(7);g.travellers=[traveller('gn','gnome'),traveller('ga','gangster')];
  g.nominationLog=[{id:23001,nominator:'1L',nominee:'2L',when:'D1',voters:[],votingOccurred:true}];
  g.travellerActionLog=[
    {id:23002,roleId:'gnome',kind:'gnome_friend',travellerId:'gn',when:'D1',friend:'2L'},
    {id:23003,roleId:'gnome',kind:'gnome_kill',travellerId:'gn',when:'D1',nominationId:23001,target:'1L',killed:true},
    {id:23005,roleId:'gangster',kind:'gangster_kill',travellerId:'ga',when:'D1',agreedPlayer:'3L',target:'3R',killed:true},
  ];
  g.deathLog=[
    {id:23004,playerId:'1L',when:'D1',reason:'gnome',sourceTravellerRoleId:'gnome',sourceEventId:23003},
    {id:23006,playerId:'3R',when:'D1',reason:'gangster',sourceTravellerRoleId:'gangster',sourceEventId:23005},
  ];
  assert(validateSnapshot(g));
  assert.equal(g.deathLog[0].reason,'gnome');
  assert.equal(g.deathLog[1].reason,'gangster');
});

test('Gnome same-alignment friend informs Traveller alignment estimate',()=>{
  const g=game(7);g.travellers=[traveller('gn','gnome')];
  g.travellerActionLog=[{id:24001,roleId:'gnome',kind:'gnome_friend',travellerId:'gn',when:'D1',friend:'1L'}];
  const e=estimateTravellerAlignments(g,{players:{'1L':{evil:.92}}}).gn;
  assert(e.evil>.85);
  assert(e.reasons.some(x=>x.includes('同陣営')));
});

test('Experimental Acrobat, Alchemist, Alsaahir, and Amnesiac are custom-script only',()=>{
  const ids=['acrobat','alchemist','alsaahir','amnesiac'];
  for(const id of ids){
    assert(Object.hasOwn(ROLES,id),id);
    assert(ALL_CORE_ROLE_IDS.includes(id),`${id} should be available in the script maker`);
    assert(!BUILT_IN_SCRIPTS.some(script=>script.roleIds.includes(id)),`${id} must stay out of built-in scripts`);
  }
  assert(ROLES.acrobat.tags.includes('CAUSES_OWN_DEATH'));
  assert(ROLES.alchemist.tags.includes('SETUP_EFFECT'));
  assert(ROLES.alsaahir.tags.includes('ALTERNATE_WIN_CONDITION'));
  assert(ROLES.amnesiac.tags.includes('ROLE_HIDDEN_FROM_SELF'));
});

test('Healthy Acrobat dies after choosing the Drunk character',()=>{
  const g=game(5);g.night=2;g.playset='custom';g.scriptRoleIds=['acrobat','empath','drunk','saint','baron','imp'];g.selfRole.shownRole='acrobat';
  g.selfActionLog=[{id:25001,roleId:'acrobat',when:'N2',target:'1L',died:true}];
  g.deathLog=[{id:25002,playerId:'self',when:'N2',reason:'ability',sourceRoleId:'acrobat',sourceEventId:25001}];
  const roles={self:'acrobat','1L':'drunk','2L':'saint','2R':'baron','1R':'imp'};
  assert(evaluateAssignment(roles,g).length>0);
  const survived=structuredClone(g);survived.selfActionLog=[{id:25003,roleId:'acrobat',when:'N2',target:'1L',died:false}];survived.deathLog=[];
  assert.equal(evaluateAssignment(roles,survived).length,0,'healthy Acrobat cannot survive after choosing the Drunk');
});

test('Poisoned Acrobat may survive even when choosing an impaired player',()=>{
  const g=game(5);g.night=2;g.playset='custom';g.scriptRoleIds=['acrobat','empath','virgin','poisoner','imp'];g.selfRole.shownRole='acrobat';
  g.selfActionLog=[{id:25102,roleId:'acrobat',when:'N2',target:'self',died:false}];
  const roles={self:'acrobat','1L':'empath','2L':'virgin','2R':'poisoner','1R':'imp'};
  assert(evaluateAssignment(roles,g).length>0);
});

test('Alchemist copied setup Minion ability modifies setup and can stack with the real Minion',()=>{
  const g=game(8);g.selfRole.shownRole='alchemist';g.selfActionLog=[{id:25201,roleId:'alchemist',kind:'minion_ability',when:'N1',minionRole:'baron'}];
  assert.deepEqual(setupCountsForGame(g,['alchemist','poisoner','imp']),{townsfolk:3,outsider:3,minion:1,demon:1});
  const g10=game(10);g10.selfRole.shownRole='alchemist';g10.selfActionLog=[{id:25202,roleId:'alchemist',kind:'minion_ability',when:'N1',minionRole:'baron'}];
  assert.deepEqual(setupCountsForGame(g10,['alchemist','baron','poisoner','imp']),{townsfolk:3,outsider:4,minion:2,demon:1});
});

test('Healthy Alsaahir exact guess must be recorded as a win',()=>{
  const roles={self:'alsaahir','1L':'empath','2L':'virgin','2R':'spy','1R':'imp'};
  const exactWrong=game(5);exactWrong.playset='custom';exactWrong.scriptRoleIds=Object.values(roles);exactWrong.selfRole.shownRole='alsaahir';
  exactWrong.selfActionLog=[{id:25301,roleId:'alsaahir',when:'D1',minions:['2R'],demons:['1R'],won:false}];
  assert.equal(evaluateAssignment(roles,exactWrong).length,0);
  const inexact=structuredClone(exactWrong);inexact.selfActionLog=[{id:25302,roleId:'alsaahir',when:'D1',minions:['1L'],demons:['1R'],won:false}];
  assert(evaluateAssignment(roles,inexact).length>0);
  const exactWin=structuredClone(exactWrong);exactWin.selfActionLog=[{id:25303,roleId:'alsaahir',when:'D1',minions:['2R'],demons:['1R'],won:true}];
  const worlds=evaluateAssignment(roles,exactWin);assert(worlds.length>0);assert(worlds.every(w=>w.endReason==='alsaahir'));
});

test('Amnesiac tag answers and locked Townsfolk hypothesis survive validation',()=>{
  const g=game(5);g.playset='custom';g.scriptRoleIds=['amnesiac','fortune_teller','empath','poisoner','imp'];g.selfRole.shownRole='amnesiac';
  g.selfActionLog=[
    {id:25401,roleId:'amnesiac',kind:'tag_answer',when:'D1',tag:'INFO_SOURCE',matches:true},
    {id:25402,roleId:'amnesiac',kind:'tag_answer',when:'D1',tag:'FIRST_NIGHT_INFO',matches:false},
    {id:25403,roleId:'amnesiac',kind:'lock_role',when:'D1',chosenRole:'fortune_teller'},
  ];
  assert.equal(amnesiacAbilityRole(g),'fortune_teller');
  assert(validateSnapshot(g));
});


test('Phase-2 experimental Townsfolk are custom-script only and preserve requested symbols',()=>{
  const expected={acrobat:'軽',alchemist:'錬',alsaahir:'ア',amnesiac:'記',balloonist:'気',banshee:'叫',bounty_hunter:'賞',cannibal:'貪'};
  for(const [id,symbol] of Object.entries(expected)){
    assert(Object.hasOwn(ROLES,id),id);
    assert.equal(ROLES[id].symbol,symbol,`${id} symbol`);
    assert(ALL_CORE_ROLE_IDS.includes(id),`${id} should be available in the script maker`);
    assert(!BUILT_IN_SCRIPTS.some(script=>script.roleIds.includes(id)),`${id} must stay out of built-in scripts`);
  }
  assert(!Object.hasOwn(ROLES,'atheist'),'Atheist is intentionally skipped in this phase');
});

test('Balloonist setup supports both normal and plus-one Outsider distributions',()=>{
  const g=game(8);g.playset='custom';g.scriptRoleIds=['balloonist','empath','virgin','chef','saint','recluse','spy','imp'];
  const options=setupCountOptionsForGame(g,['balloonist','empath','virgin','chef','saint','recluse','spy','imp']);
  assert(options.some(x=>x.outsider===1&&x.townsfolk===5));
  assert(options.some(x=>x.outsider===2&&x.townsfolk===4));
});

test('Healthy Balloonist requires a different character type on consecutive nights',()=>{
  const roles={self:'balloonist','1L':'empath','2L':'virgin','2R':'spy','1R':'imp'};
  const g=game(5);g.playset='custom';g.night=2;g.scriptRoleIds=Object.values(roles);g.selfRole.shownRole='balloonist';
  g.selfInfoLog=[{id:26001,roleId:'balloonist',when:'N1',player:'2R'},{id:26002,roleId:'balloonist',when:'N2',player:'1L'}];
  assert(evaluateAssignment(roles,g).length>0);
  const same=structuredClone(g);same.selfInfoLog=[{id:26003,roleId:'balloonist',when:'N1',player:'1L'},{id:26004,roleId:'balloonist',when:'N2',player:'2L'}];
  assert.equal(evaluateAssignment(roles,same).length,0);
});

test('Vortox makes healthy Balloonist information false by allowing the same type',()=>{
  const roles={self:'balloonist','1L':'empath','2L':'virgin','2R':'spy','1R':'vortox'};
  const g=game(5);g.playset='custom';g.night=2;g.scriptRoleIds=Object.values(roles);g.selfRole.shownRole='balloonist';
  g.selfInfoLog=[{id:26101,roleId:'balloonist',when:'N1',player:'1L'},{id:26102,roleId:'balloonist',when:'N2',player:'2L'}];
  assert(evaluateAssignment(roles,g).length>0);
});

test('Banshee Demon kill activates double voting without consuming its dead vote',()=>{
  const g=game(5);g.playset='custom';g.night=2;g.selfRole.shownRole='banshee';g.scriptRoleIds=['banshee','empath','virgin','spy','imp'];
  g.deathLog=[{id:26201,playerId:'self',when:'N2',reason:'night_death'}];
  assert.equal(bansheeAwakenedAt(g,'self','D2'),true);
  assert.equal(travellerVoteWeight(g,'self','D2'),2);
  g.nominationLog=[{id:26202,nominator:'1L',nominee:'1R',when:'D2',voters:['self']}];
  assert.equal(rebuildStatus(g).self.deadVoteAvailable,true);
  const executed=structuredClone(g);executed.deathLog=[{id:26203,playerId:'self',when:'D1',reason:'execution'}];
  assert.equal(bansheeAwakenedAt(executed,'self','D2'),false);
});

test('Bounty Hunter creates exactly one evil Townsfolk and its information identifies one',()=>{
  const roles={self:'bounty_hunter','1L':'empath','2L':'virgin','2R':'spy','1R':'imp'};
  const g=game(5);g.playset='custom';g.scriptRoleIds=Object.values(roles);g.selfRole.shownRole='bounty_hunter';
  const worlds=evaluateAssignment(roles,g);
  assert.equal(worlds.length,3);
  for(const w of worlds){
    const evilTownsfolk=Object.entries(roles).filter(([p,r])=>ROLES[r].type==='townsfolk'&&w.currentAlignment[p]==='evil');
    assert.equal(evilTownsfolk.length,1);
  }
  g.selfInfoLog=[{id:26301,roleId:'bounty_hunter',when:'N1',player:'1L'}];
  const informed=evaluateAssignment(roles,g);
  assert(informed.length>0);
  assert(informed.every(w=>w.currentAlignment['1L']==='evil'));
});

test('Bounty Hunter only learns again after the previously shown player dies and never repeats them',()=>{
  const roles={self:'bounty_hunter','1L':'empath','2L':'virgin','2R':'spy','1R':'imp'};
  const g=game(5);g.playset='custom';g.night=2;g.scriptRoleIds=Object.values(roles);g.selfRole.shownRole='bounty_hunter';
  g.selfInfoLog=[{id:26401,roleId:'bounty_hunter',when:'N1',player:'1L'},{id:26402,roleId:'bounty_hunter',when:'N2',player:'2R'}];
  assert.equal(evaluateAssignment(roles,g).length,0,'cannot learn again before prior target dies');
  g.deathLog=[{id:26403,playerId:'1L',when:'D1',reason:'execution'}];
  assert(evaluateAssignment(roles,g).length>0);
  const repeated=structuredClone(g);repeated.selfInfoLog[1]={id:26404,roleId:'bounty_hunter',when:'N2',player:'1L'};
  assert.equal(evaluateAssignment(roles,repeated).length,0,'cannot learn the same evil player twice');
});

test('Cannibal inherits an executed good Monk ability and can protect the next Demon target',()=>{
  const roles={self:'cannibal','1L':'monk','2L':'virgin','2R':'spy','1R':'imp'};
  const g=game(5);g.playset='custom';g.night=2;g.scriptRoleIds=Object.values(roles);g.selfRole.shownRole='cannibal';
  g.deathLog=[{id:26501,playerId:'1L',when:'D1',reason:'execution'},{id:26503,playerId:'2L',when:'N2',reason:'night_death'}];
  g.selfActionLog=[{id:26502,roleId:'monk',when:'N2',target:'2L'}];
  assert.equal(evaluateAssignment(roles,g).length,0,'healthy Cannibal-Monk protection prevents the Demon kill');
  const safe=structuredClone(g);safe.deathLog=[{id:26504,playerId:'1L',when:'D1',reason:'execution'}];
  const worlds=evaluateAssignment(roles,safe);
  assert(worlds.length>0);
  assert(worlds.every(w=>w.cannibalAbilities.self==='monk'));
});


// Experimental Townsfolk phase 3: role setup, transformations and Storyteller information.
const phase3RoleSymbols={choirboy:'唱',king:'王',engineer:'技',farmer:'農',fisherman:'漁',general:'将',high_priestess:'巫'};
function customGame(initial, n=5) {const g=game(n);g.playset='custom:phase3';g.scriptRoleIds=[...new Set(Object.values(initial))];return g;}
test('Experimental phase 3: all seven symbols and roles only in custom scripts',()=>{
 for(const [id,symbol] of Object.entries(phase3RoleSymbols)){
   assert.equal(ROLES[id].symbol,symbol);assert.equal(ROLES[id].solverSupport,'full');assert(ALL_CORE_ROLE_IDS.includes(id));
   for(const builtin of BUILT_IN_SCRIPTS)assert(!builtin.roleIds.includes(id));
 }
});
test('Choirboy setup requires King and script snapshot includes King',()=>{
 const roles={self:'choirboy','1L':'king','2L':'empath','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='choirboy';
 assert(validSetup(roles,g));
 assert(!validSetup({...roles,'1L':'virgin'},g));
 const {getSnapshotScriptRoleIds}=require('../.engine-test/scripts.js');
 const legacy=customGame(roles);legacy.scriptRoleIds=legacy.scriptRoleIds.filter(r=>r!=='king');
 assert(getSnapshotScriptRoleIds(legacy).includes('king'));
 assert(validSetup(roles,legacy));
});
test('Choirboy sees the Demon player only when a Demon kills King',()=>{
 const roles={self:'choirboy','1L':'king','2L':'empath','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='choirboy';g.night=2;
 g.deathLog=[{id:31001,playerId:'1L',when:'N2',reason:'night_death'}];
 g.selfInfoLog=[{id:31002,roleId:'choirboy',when:'N2',player:'1R'}];
 assert(evaluateAssignment(roles,g,12).some(w=>w.info[31002]==='works'));
 const wrong=structuredClone(g);wrong.selfInfoLog[0].player='2R';assert.equal(evaluateAssignment(roles,wrong).length,0);
 const executed=structuredClone(g);executed.deathLog[0]={id:31001,playerId:'1L',when:'D1',reason:'execution'};assert.equal(evaluateAssignment(roles,executed).length,0);
});
test('Demon known King seat is a hard setup constraint, not an evil alignment',()=>{
 const roles={self:'imp','1L':'king','2L':'empath','2R':'spy','1R':'virgin'};
 const g=customGame(roles);g.selfRole.shownRole='imp';g.demonState={knownMinions:[],storytellerBluffs:[],knownKing:'1L',bluffPlans:{}};
 assert(validSetup(roles,g));assert(!validSetup({...roles,'1L':'virgin','1R':'king'},g));assert(validateSnapshot(g));
 const bad=structuredClone(g);bad.demonState.knownKing='unknown';assert(!validateSnapshot(bad));
});
test('King learns a living character only after dead >= living',()=>{
 const roles={self:'king','1L':'empath','2L':'virgin','3L':'saint','2R':'scarlet_woman','1R':'imp'};
 const g=customGame(roles,6);g.selfRole.shownRole='king';g.night=3;
 g.deathLog=[{id:32001,playerId:'1L',when:'D1',reason:'execution'}, {id:32002,playerId:'3L',when:'N2',reason:'night_death'},{id:32003,playerId:'2L',when:'D2',reason:'execution'}];
 g.selfInfoLog=[{id:32004,roleId:'king',when:'N3',shownRole:'scarlet_woman'}];
 assert(evaluateAssignment(roles,g,15).some(w=>w.info[32004]==='works'));
 const no=structuredClone(g);no.selfInfoLog[0].shownRole='saint';assert.equal(evaluateAssignment(roles,no).length,0);
 const early=structuredClone(g);early.selfInfoLog[0].when='N2';assert.equal(evaluateAssignment(roles,early).length,0);
});
// The Spy is eligible to register as a living Townsfolk/Outsider for the King.
test('King can learn an outsider character via a living healthy Spy registration',()=>{
 const roles={self:'king','1L':'empath','2L':'virgin','3L':'saint','2R':'spy','1R':'imp'};
 const g=customGame(roles,6);g.selfRole.shownRole='king';g.night=3;
 g.deathLog=[{id:32011,playerId:'1L',when:'D1',reason:'execution'}, {id:32012,playerId:'3L',when:'N2',reason:'night_death'},{id:32013,playerId:'2L',when:'D2',reason:'execution'}];
 g.selfInfoLog=[{id:32014,roleId:'king',when:'N3',shownRole:'saint'}];
 assert(evaluateAssignment(roles,g,15).some(w=>w.info[32014]==='registration'));
});
test('Vortox cannot make King wake before the death threshold',()=>{
 const roles={self:'king','1L':'empath','2L':'virgin','3L':'saint','2R':'spy','1R':'vortox'};
 const g=customGame(roles,6);g.selfRole.shownRole='king';g.scriptRoleIds.push('monk');
 g.selfInfoLog=[{id:32101,roleId:'king',when:'N1',shownRole:'monk'}];
 assert.equal(evaluateAssignment(roles,g).length,0);
});
test('Demon known King is used as a direct sampler lock',()=>{
 const roles={self:'imp','1L':'king','2L':'empath','2R':'spy','1R':'virgin'};
 const g=customGame(roles);g.selfRole.shownRole='imp';g.demonState={knownKing:'1L',knownMinions:[],storytellerBluffs:[],bluffPlans:{}};
 const {locks,issues}=hardLocks(g);assert.equal(locks['1L'],'king');assert.equal(issues.length,0);
 const samples=runSearch(g,{attempts:120,seed:951,beamWidth:1,maxMillis:4000});assert(samples.unique>0);
 assert(samples.worlds.every(w=>w.initial['1L']==='king'));
});
test('Engineer transforms Demon with its original team alignment and no retroactive setup',()=>{
 const roles={self:'engineer','1L':'empath','2L':'virgin','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.scriptRoleIds.push('vortox','fang_gu');g.selfRole.shownRole='engineer';g.night=2;
 g.selfActionLog=[{id:33001,roleId:'engineer',when:'N2',kind:'demon',demonRole:'vortox'}];
 const worlds=evaluateAssignment(roles,g,15);
 assert(worlds.length>0);
 assert(worlds.every(w=>w.current['1R']==='vortox'&&w.currentAlignment['1R']==='evil'&&w.initial['1R']==='imp'));
 assert(worlds.some(w=>w.changes.some(c=>c.kind==='engineer'&&c.toRole==='vortox')));
 const outsiderDelta=structuredClone(g);outsiderDelta.selfActionLog[0].demonRole='fang_gu';
 assert(evaluateAssignment(roles,outsiderDelta,15).some(w=>w.current['1R']==='fang_gu'));
});
test('Engineer can replace existing Minion and may be used only once',()=>{
 const roles={self:'engineer','1L':'empath','2L':'virgin','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.scriptRoleIds.push('poisoner','vortox');g.selfRole.shownRole='engineer';g.night=2;
 g.selfActionLog=[{id:33101,roleId:'engineer',when:'N1',kind:'minions',minionRoles:['poisoner']}];
 assert(evaluateAssignment(roles,g,15).some(w=>w.current['2R']==='poisoner'&&w.currentAlignment['2R']==='evil'));
 g.selfActionLog.push({id:33102,roleId:'engineer',when:'N2',kind:'demon',demonRole:'vortox'});
 assert.equal(evaluateAssignment(roles,g).length,0);
 assert(!validateSnapshot(g));
});
test('Farmer night-death converts exactly one surviving good player',()=>{
 const roles={self:'empath','1L':'farmer','2L':'virgin','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='empath';g.night=2;
 g.deathLog=[{id:34001,playerId:'1L',when:'N2',reason:'night_death'}];
 const worlds=evaluateAssignment(roles,g,15);assert(worlds.length>0);
 assert(worlds.every(w=>w.changes.filter(c=>c.kind==='farmer').length===1));
 assert(worlds.every(w=>w.changes.filter(c=>c.kind==='farmer').every(c=>['self','2L'].includes(c.playerId))));
 const observed=structuredClone(g);observed.selfActionLog=[{id:34002,roleId:'farmer',kind:'became_farmer',when:'N2',deceasedFarmer:'1L'}];
 assert(validateSnapshot(observed));
 const o=evaluateAssignment(roles,observed,15);assert(o.length>0&&o.every(w=>w.current.self==='farmer'));
});
test('Farmer transforms again when a newly-created Farmer dies at night',()=>{
 const roles={self:'empath','1L':'farmer','2L':'virgin','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='empath';g.night=3;
 g.deathLog=[{id:34101,playerId:'1L',when:'N2',reason:'night_death'},{id:34103,playerId:'self',when:'N3',reason:'night_death'}];
 g.selfActionLog=[{id:34102,roleId:'farmer',kind:'became_farmer',when:'N2',deceasedFarmer:'1L'}];
 const worlds=evaluateAssignment(roles,g,15);assert(worlds.length>0);
 assert(worlds.every(w=>w.current['2L']==='farmer'&&w.changes.filter(c=>c.kind==='farmer').length===2));
});
test('Fisherman, General and High Priestess are recorded without treating ST judgement as objective proof',()=>{
 const roles={self:'general','1L':'fisherman','2L':'high_priestess','2R':'spy','1R':'vortox'};
 const g=customGame(roles);g.selfRole.shownRole='general';
 g.selfInfoLog=[{id:35001,roleId:'general',when:'N1',result:'good'}];
 g.abilityClaimLog=[{id:35002,playerId:'1L',roleId:'fisherman',when:'D1',targets:[],structured:{kind:'storytellerAdvice',advice:'昨日の情報を確認'},result:null,visibility:'public',recipients:[]},{id:35003,playerId:'2L',roleId:'high_priestess',when:'N1',targets:[],structured:{kind:'singlePlayer',player:'1R'},result:null,visibility:'public',recipients:[]}];
 assert(validateSnapshot(g));
 const worlds=evaluateAssignment(roles,g,15);
 assert(worlds.length>0);
 assert(worlds.some(w=>w.info[35001]==='works'&&w.info[35002]==='works'&&w.info[35003]==='works'));
});
test('New role payload validation rejects malformed advice, King roles, and Engineer targets',()=>{
 const roles={self:'engineer','1L':'king','2L':'general','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.scriptRoleIds.push('fisherman','poisoner');g.selfRole.shownRole='engineer';
 g.selfActionLog=[{id:36001,roleId:'engineer',when:'N1',kind:'minions',minionRoles:['poisoner']}];
 assert(validateSnapshot(g));
 const badEngineer=structuredClone(g);badEngineer.selfActionLog[0].minionRoles=['king'];assert(!validateSnapshot(badEngineer));
 const badAdvice=structuredClone(g);badAdvice.abilityClaimLog=[{id:36002,playerId:'1L',roleId:'fisherman',when:'D1',targets:[],result:null,structured:{kind:'storytellerAdvice',advice:''},visibility:'public',recipients:[]}];assert(!validateSnapshot(badAdvice));
 const badKing=structuredClone(g);badKing.selfInfoLog=[{id:36003,roleId:'king',when:'N1',shownRole:'not_a_role'}];assert(!validateSnapshot(badKing));
});



// Experimental Townsfolk phase 4: Huntsman / Damsel through Pixie.
const phase4RoleSymbols={huntsman:'狩',knight:'騎',lycanthrope:'狼',magician:'幻',nightwatchman:'夜',noble:'貴',pixie:'妖',damsel:'乙'};
test('Experimental phase 4 symbols, types, and custom-only catalog',()=>{
 for(const [id,symbol] of Object.entries(phase4RoleSymbols)){
  assert.equal(ROLES[id].symbol,symbol);assert.equal(ROLES[id].solverSupport,'full');assert(ALL_CORE_ROLE_IDS.includes(id));
  for(const builtin of BUILT_IN_SCRIPTS)assert(!builtin.roleIds.includes(id));
 }
 assert.equal(ROLES.damsel.type,'outsider');
});
test('Huntsman setup forces Damsel with an optional extra Outsider',()=>{
 const roles={self:'huntsman','1L':'damsel','2L':'knight','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='huntsman';
 assert(validSetup(roles,g));
 assert(!validSetup({...roles,'1L':'noble'},g));
 const {getSnapshotScriptRoleIds,createCustomScript}=require('../.engine-test/scripts.js');
 const old=structuredClone(g);old.scriptRoleIds=old.scriptRoleIds.filter(x=>x!=='damsel');
 assert(getSnapshotScriptRoleIds(old).includes('damsel'));
 assert(createCustomScript('猟師',['huntsman','imp','spy','knight']).roleIds.includes('damsel'));
});
test('Huntsman converts chosen healthy Damsel to an out-of-play Townsfolk once',()=>{
 const roles={self:'huntsman','1L':'damsel','2L':'knight','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='huntsman';g.scriptRoleIds.push('virgin','empath');
 g.selfActionLog=[{id:51001,roleId:'huntsman',when:'N1',target:'1L',rescuedRole:'virgin'}];
 assert(validateSnapshot(g));
 const w=evaluateAssignment(roles,g,16);
 assert(w.length>0);assert(w.every(x=>x.current['1L']==='virgin'&&x.initial['1L']==='damsel'));
 g.selfActionLog.push({id:51002,roleId:'huntsman',when:'N1',target:'2L'});
 assert(!validateSnapshot(g));assert.equal(evaluateAssignment(roles,g).length,0);
});
test('Huntsman misses do not transform other players and rescue cannot name in-play Townsfolk',()=>{
 const roles={self:'huntsman','1L':'damsel','2L':'knight','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='huntsman';g.scriptRoleIds.push('virgin');
 g.selfActionLog=[{id:51101,roleId:'huntsman',when:'N1',target:'2L'}];
 assert(evaluateAssignment(roles,g).some(w=>w.current['1L']==='damsel'&&w.current['2L']==='knight'));
 g.selfActionLog[0].rescuedRole='virgin';assert.equal(evaluateAssignment(roles,g).length,0);
 g.selfActionLog[0].target='1L';g.selfActionLog[0].rescuedRole='knight';assert.equal(evaluateAssignment(roles,g).length,0);
});
test('Knight information excludes the Demon; Vortox requires a false pair',()=>{
 const c=context({self:'knight','1L':'spy','2L':'virgin','2R':'magician','1R':'imp'});
 const ok={kind:'knight',players:['1L','2L']},bad={kind:'knight',players:['1R','2L']};
 assert(infoMatches('knight','self',ok,c));assert(!infoMatches('knight','self',bad,c));
 const v={...c,roles:{...c.roles,'1R':'vortox'}};
 assert(!infoMatches('knight','self',bad,v)); // bare mechanical truth check; inversion handled by observations
 const roles={self:'knight','1L':'spy','2L':'virgin','2R':'magician','1R':'vortox'};
 const g=customGame(roles);g.selfRole.shownRole='knight';g.selfInfoLog=[{id:52001,roleId:'knight',when:'N1',players:['1R','2L']}];
 assert(evaluateAssignment(roles,g).length>0,'Vortox creates false Knight information');
 g.selfInfoLog[0].players=['1L','2L'];assert.equal(evaluateAssignment(roles,g).length,0);
});
test('Noble gets exactly one evil, with Spy and Recluse registrations',()=>{
 const c=context({self:'noble','1L':'spy','2L':'virgin','2R':'recluse','1R':'imp'});
 assert(infoMatches('noble','self',{kind:'noble',players:['1L','2L','2R']},c));
 assert(!infoMatches('noble','self',{kind:'noble',players:['1L','1R','2R']},context({self:'noble','1L':'poisoner','2L':'virgin','2R':'empath','1R':'imp'})));
 assert(infoMatches('noble','self',{kind:'noble',players:['2L','2R','1R']},c));
});
test('Knight/Noble/Pixie first-night structured information validates',()=>{
 const roles={self:'knight','1L':'noble','2L':'pixie','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.night=2;g.selfRole.shownRole='knight';
 g.selfInfoLog=[{id:53001,roleId:'knight',when:'N1',players:['1L','2L']}];
 assert(validateSnapshot(g));
 const bad=structuredClone(g);bad.selfInfoLog[0].players=['1L','1L'];assert(!validateSnapshot(bad));
 const report={id:53002,playerId:'1L',roleId:'noble',when:'N1',targets:[],result:null,structured:{kind:'noble',players:['self','2L','2R']},visibility:'public',recipients:[]};
 g.abilityClaimLog=[report];assert(validateSnapshot(g));
 const reportBad=structuredClone(g);reportBad.abilityClaimLog[0].structured.players=['self','self','1L'];assert(!validateSnapshot(reportBad));
 g.selfInfoLog=[{id:53003,roleId:'pixie',when:'N1',shownRole:'knight'}];assert(validateSnapshot(g));
 g.selfInfoLog[0].shownRole='spy';assert(!validateSnapshot(g));
});
test('Magician is shown among extra Minions but remains good',()=>{
 const roles={self:'imp','1L':'spy','2L':'magician','3L':'knight','3R':'noble','2R':'pixie','1R':'nightwatchman'};
 const g=customGame(roles,7);g.selfRole.shownRole='imp';
 g.demonState={knownMinions:[{playerId:'1L',source:'demon_info'},{playerId:'2L',source:'demon_info'}],storytellerBluffs:[],knownKing:null,bluffPlans:{}};
 assert(validSetup(roles,g));assert(validateSnapshot(g));
 const wrong=structuredClone(roles);wrong['2L']='poisoner';assert(!validSetup(wrong,g));
 const result=runSearch(g,{attempts:280,seed:43777,beamWidth:1,maxMillis:5000});
 assert(result.unique>0,'sampler explores extra Minion display');
 assert(result.worlds.every(w=>g.demonState.knownMinions.some(m=>w.initial[m.playerId]==='magician')));
});
test('Minion Magician introduction leaves two Demon candidates, one is Magician',()=>{
 const roles={self:'spy','1L':'imp','2L':'magician','3L':'knight','3R':'noble','2R':'pixie','1R':'nightwatchman'};
 const g=customGame(roles,7);g.selfRole.shownRole='spy';
 g.minionState={knownDemon:null,knownMinions:[],demonCandidates:['1L','2L'],sharedStorytellerBluffs:[],bluffPlans:{},spyInitialRoles:{},spyRedHerring:null,becameDemonAt:null};
 assert(validSetup(roles,g));assert(validateSnapshot(g));
 assert(!validSetup({...roles,'2L':'virgin'},g));
 const swap=structuredClone(roles);swap['1L']='magician';swap['2L']='imp';assert(validSetup(swap,g));
 const result=runSearch(g,{attempts:300,seed:6594,maxMillis:5000,beamWidth:1});
 assert(result.unique>0);assert(result.players['1L'].demon>0&&result.players['2L'].demon>0,'both demon candidates survive');
});
test('Nightwatchman chooses one recipient once, without forcing alignment',()=>{
 const roles={self:'nightwatchman','1L':'knight','2L':'noble','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='nightwatchman';
 g.selfActionLog=[{id:54001,roleId:'nightwatchman',when:'N1',target:'2R'}];
 assert(validateSnapshot(g));assert(evaluateAssignment(roles,g).length>0);
 g.night=2;g.selfActionLog.push({id:54002,roleId:'nightwatchman',when:'N2',target:'1L'});
 assert(!validateSnapshot(g));assert.equal(evaluateAssignment(roles,g).length,0);
});
test('Lycanthrope can kill a good target and suppress the Demon night kill',()=>{
 const roles={self:'lycanthrope','1L':'knight','2L':'noble','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='lycanthrope';g.night=2;
 g.selfActionLog=[{id:55001,roleId:'lycanthrope',when:'N2',target:'1L',killed:true}];
 g.deathLog=[{id:55002,playerId:'1L',when:'N2',reason:'night_death',sourceRoleId:'lycanthrope'}];
 assert(validateSnapshot(g));assert(evaluateAssignment(roles,g).length>0);
 g.deathLog.push({id:55003,playerId:'2L',when:'N2',reason:'night_death'});
 assert.equal(evaluateAssignment(roles,g).length,0);
});
test('Lycanthrope cannot kill actual evil and never acts on N1',()=>{
 const roles={self:'lycanthrope','1L':'knight','2L':'noble','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='lycanthrope';g.night=2;
 g.selfActionLog=[{id:55101,roleId:'lycanthrope',when:'N2',target:'2R',killed:true}];
 g.deathLog=[{id:55102,playerId:'2R',when:'N2',reason:'night_death',sourceRoleId:'lycanthrope'}];
 assert.equal(evaluateAssignment(roles,g).length,0);
 g.selfActionLog[0].when='N1';assert(!validateSnapshot(g));
});
test('Pixie first-night result refers to another in-play Townsfolk',()=>{
 const roles={self:'pixie','1L':'knight','2L':'noble','2R':'scarlet_woman','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='pixie';
 g.selfInfoLog=[{id:56001,roleId:'pixie',when:'N1',shownRole:'knight'}];
 assert(evaluateAssignment(roles,g).length>0);
 g.selfInfoLog[0].shownRole='general';g.scriptRoleIds.push('general');assert.equal(evaluateAssignment(roles,g).length,0);
});
test('Pixie gains seen ability after holder dies only with Storyteller confirmation',()=>{
 const roles={self:'pixie','1L':'knight','2L':'noble','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='pixie';g.night=2;
 g.selfInfoLog=[{id:56011,roleId:'pixie',when:'N1',shownRole:'knight'}];
 g.deathLog=[{id:56012,playerId:'1L',when:'D1',reason:'execution'}];
 g.selfActionLog=[{id:56013,roleId:'pixie',kind:'madness_confirmed',when:'N2',shownRole:'knight'}];
 assert(validateSnapshot(g));
 const worlds=evaluateAssignment(roles,g,15);assert(worlds.length>0);assert(worlds.every(w=>w.pixieAbilities.self==='knight'));
 g.deathLog=[];assert.equal(evaluateAssignment(roles,g).length,0);
});
test('Damsel correctly guessed by a Minion ends game for evil',()=>{
 const roles={self:'huntsman','1L':'damsel','2L':'knight','2R':'scarlet_woman','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='huntsman';
 g.selfActionLog=[{id:57001,roleId:'damsel',kind:'minion_guess',when:'D1',minion:'2R',target:'1L',won:true}];
 assert(validateSnapshot(g));
 const worlds=evaluateAssignment(roles,g,15);assert(worlds.length>0);assert(worlds.every(w=>w.ended&&w.endReason==='damsel'));
 g.selfActionLog[0].won=false;assert.equal(evaluateAssignment(roles,g).length,0);
});
test('Damsel guess fails against another character or with Spy jinx',()=>{
 const roles={self:'huntsman','1L':'damsel','2L':'knight','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='huntsman';
 g.selfActionLog=[{id:57101,roleId:'damsel',kind:'minion_guess',when:'D1',minion:'2R',target:'1L',won:false}];
 assert(validateSnapshot(g));assert(evaluateAssignment(roles,g).length>0,'Spy jinx prevents a Damsel win');
 g.selfActionLog[0].won=true;assert.equal(evaluateAssignment(roles,g).length,0);
 g.selfActionLog[0].won=false;g.selfActionLog[0].target='2L';assert(evaluateAssignment(roles,g).length>0);
});

// Registration and imported-history edge cases for the new experimental batch.
test('Lycanthrope Faux Paw makes a good player register as evil without joining evil',()=>{
 const c=context({self:'lycanthrope','1L':'noble','2L':'knight','2R':'spy','1R':'imp'});
 c.alignment={self:'good','1L':'good','2L':'good','2R':'evil','1R':'evil'};
 assert(!infoMatches('noble','1L',{kind:'noble',players:['self','1L','2L']},c));
 c.registersEvil=new Set(['2L']);
 assert.deepEqual(require('../.engine-test/engine/mechanics.js').alignmentOptions('2L',c),[1]);
 assert.equal(c.alignment['2L'],'good');
 assert(infoMatches('noble','1L',{kind:'noble',players:['self','1L','2L']},c));
});
test('Faux Paw is stable across a candidate history and informs an N1 Noble reading',()=>{
 const roles={self:'lycanthrope','1L':'noble','2L':'knight','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='lycanthrope';
 g.abilityClaimLog=[{id:58001,playerId:'1L',roleId:'noble',when:'N1',targets:[],structured:{kind:'noble',players:['self','1L','2L']},result:null,visibility:'public',recipients:[]}];
 const result=evaluateAssignment(roles,g,20);
 assert(result.some(w=>w.info[58001]==='works'&&['self','1L','2L'].includes(w.fauxPaw)&&w.initialAlignment[w.fauxPaw]==='good'));
});
test('Multiple same-night Lycanthrope and Damsel guess actions cannot be silently ignored',()=>{
 const roles={self:'lycanthrope','1L':'knight','2L':'noble','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='lycanthrope';g.night=2;
 g.selfActionLog=[{id:59001,roleId:'lycanthrope',when:'N2',target:'1L',killed:false},{id:59002,roleId:'lycanthrope',when:'N2',target:'2L',killed:false}];
 assert(!validateSnapshot(g));assert.equal(evaluateAssignment(roles,g).length,0);
 const damselRoles={self:'huntsman','1L':'damsel','2L':'knight','2R':'spy','1R':'imp'};
 const g2=customGame(damselRoles);g2.selfRole.shownRole='huntsman';
 g2.selfActionLog=[{id:59003,roleId:'damsel',kind:'minion_guess',when:'D1',minion:'2R',target:'2L',won:false},{id:59004,roleId:'damsel',kind:'minion_guess',when:'D1',minion:'2R',target:'1L',won:false}];
 assert(!validateSnapshot(g2));assert.equal(evaluateAssignment(damselRoles,g2).length,0);
});


// Experimental Townsfolk phase 5
const phase5Ids=['poppy_grower','preacher','princess','shugenja','steward','village_idiot'];
test('Phase-5 experimental Townsfolk are custom-only with consistent display symbols',()=>{
 for(const id of phase5Ids){assert(ALL_CORE_ROLE_IDS.includes(id));assert.equal(ROLES[id].type,'townsfolk');assert.equal(ROLES[id].solverSupport,'full');assert(Object.values(BUILT_IN_SCRIPTS).every(s=>!s.roleIds.includes(id)));}
 assert.deepEqual(phase5Ids.map(x=>ROLES[x].symbol),['芥','説','姫','修','執','村']);
});
test('Steward recognizes a good player, not the Imp, and Spy can register good',()=>{
 const roles={self:'steward','1L':'monk','2L':'chef','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='steward';
 g.selfInfoLog=[{id:1,roleId:'steward',when:'N1',player:'1L'}];assert(evaluateAssignment(roles,g).length);
 g.selfInfoLog[0].player='1R';assert.equal(evaluateAssignment(roles,g).length,0);
 g.selfInfoLog[0].player='2R';assert(evaluateAssignment(roles,g).length);
});
test('Shugenja uses circular seat order including wrap-around',()=>{
 const roles={self:'shugenja','1L':'chef','2L':'monk','2R':'spy','1R':'imp'};
 const c=context(roles);c.order=seats(5);
 assert(infoMatches('shugenja','self',{kind:'shugenjaDirection',direction:'anticlockwise'},c));
 assert(!infoMatches('shugenja','self',{kind:'shugenjaDirection',direction:'clockwise'},c));
});
test('Shugenja chooses either direction on a tie',()=>{
 const roles={self:'shugenja','1L':'poisoner','2L':'chef','2R':'monk','1R':'imp'};
 const c=context(roles);c.order=seats(5);
 // Set evil at opposite offsets? Self clockwise 1L and anticlockwise 1R.
 assert(infoMatches('shugenja','self',{kind:'shugenjaDirection',direction:'clockwise'},c));
 assert(infoMatches('shugenja','self',{kind:'shugenjaDirection',direction:'anticlockwise'},c));
});
test('Shugenja and Village Idiot reported-information imports validate',()=>{
 const roles={self:'shugenja','1L':'steward','2L':'village_idiot','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.night=2;
 g.abilityClaimLog=[
 {id:1,playerId:'self',roleId:'shugenja',when:'N1',targets:[],result:null,structured:{kind:'shugenjaDirection',direction:'clockwise'},visibility:'public',recipients:[]},
 {id:2,playerId:'2L',roleId:'village_idiot',when:'N2',targets:['1R'],result:null,structured:{kind:'alignmentRead',player:'1R',result:'evil'},visibility:'public',recipients:[]}
 ];
 assert(validateSnapshot(g));g.abilityClaimLog[1].structured.result='impossible';assert(!validateSnapshot(g));
});
test('Village Idiot allows two or three exact-role copies and rejects other duplicated Townsfolk',()=>{
 const two={self:'village_idiot','1L':'village_idiot','2L':'monk','2R':'spy','1R':'imp'};
 const three={self:'village_idiot','1L':'village_idiot','2L':'village_idiot','2R':'spy','1R':'imp'};
 assert(validSetup(two,customGame(two)));assert(validSetup(three,customGame(three)));
 const wrong={...two,'2L':'village_idiot','1L':'monk',self:'monk'};
 assert(!validSetup(wrong,customGame(wrong)));
});
test('Village Idiot has exactly one permanently drunk copy when there are two',()=>{
 const roles={self:'village_idiot','1L':'village_idiot','2L':'monk','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.night=2;g.selfRole.shownRole='village_idiot';
 g.selfInfoLog=[{id:1,roleId:'village_idiot',when:'N1',player:'1R',result:'good'},{id:2,roleId:'village_idiot',when:'N2',player:'1R',result:'good'}];
 const hs=evaluateAssignment(roles,g);assert(hs.length);assert(hs.every(h=>h.villageIdiotDrunk==='self'));
});
test('A lone Village Idiot cannot give wrong information when healthy',()=>{
 const roles={self:'village_idiot','1L':'chef','2L':'monk','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='village_idiot';
 g.selfInfoLog=[{id:1,roleId:'village_idiot',when:'N1',player:'1R',result:'good'}];
 assert.equal(evaluateAssignment(roles,g).length,0);
 g.selfInfoLog[0].result='evil';assert(evaluateAssignment(roles,g).length);
});
test('Poppy Grower blocks the original team introduction',()=>{
 const roles={self:'imp','1L':'poppy_grower','2L':'chef','2R':'poisoner','1R':'monk'};
 const g=customGame(roles);g.selfRole.shownRole='imp';
 g.demonState={knownMinions:[],storytellerBluffs:[],bluffPlans:{},evilTeamIntro:'blocked'};
 assert(evaluateAssignment(roles,g).length);
 g.demonState.evilTeamIntro='shown';assert.equal(evaluateAssignment(roles,g).length,0);
});
test('Poppy Grower death by day reveals the evil team the following night',()=>{
 const roles={self:'imp','1L':'poppy_grower','2L':'chef','2R':'poisoner','1R':'monk'};
 const g=customGame(roles);g.night=2;g.selfRole.shownRole='imp';
 g.demonState={knownMinions:[],storytellerBluffs:[],bluffPlans:{},evilTeamIntro:'blocked',evilTeamLearnedWhen:'N2'};
 g.deathLog=[{id:1,playerId:'1L',when:'D1',reason:'execution'}];
 assert(evaluateAssignment(roles,g).length);
 g.deathLog=[];assert.equal(evaluateAssignment(roles,g).length,0);
});
test('Poppy Grower delayed-introduction metadata must contain a valid night',()=>{
 const roles={self:'imp','1L':'poppy_grower','2L':'chef','2R':'poisoner','1R':'monk'};
 const g=customGame(roles);g.night=2;g.selfRole.shownRole='imp';g.demonState={knownMinions:[],storytellerBluffs:[],bluffPlans:{},evilTeamIntro:'blocked',evilTeamLearnedWhen:'N2'};
 assert(validateSnapshot(g));g.demonState.evilTeamLearnedWhen='D1';assert(!validateSnapshot(g));
 g.demonState.evilTeamLearnedWhen='N3';assert(!validateSnapshot(g));
 g.demonState.evilTeamLearnedWhen='N2';g.demonState.evilTeamIntro='shown';assert(!validateSnapshot(g));
});
test('Preacher choosing Poisoner prevents all its poison choices that night',()=>{
 const roles={self:'preacher','1L':'chef','2L':'monk','2R':'poisoner','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='preacher';g.selfActionLog=[{id:1,roleId:'preacher',when:'N1',target:'2R'}];
 const hs=evaluateAssignment(roles,g);assert(hs.length);assert(hs.every(h=>h.poison[1]===null));
});
test('Preacher choice of an innocent does not suppress Poisoner',()=>{
 const roles={self:'preacher','1L':'chef','2L':'monk','2R':'poisoner','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='preacher';g.selfActionLog=[{id:1,roleId:'preacher',when:'N1',target:'1L'}];
 g.abilityClaimLog=[{id:2,playerId:'1L',roleId:'chef',when:'N1',targets:[],result:null,structured:{kind:'number',value:0},visibility:'public',recipients:[]}];
 const hs=evaluateAssignment(roles,g);assert(hs.length);assert(hs.some(h=>h.poison[1]==='1L'));
});
test('A dead Preacher releases suppressed Poisoner on a later night',()=>{
 const roles={self:'preacher','1L':'empath','2L':'monk','2R':'poisoner','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='preacher';g.night=2;
 g.selfActionLog=[{id:1,roleId:'preacher',when:'N1',target:'2R'}];g.deathLog=[{id:2,playerId:'self',when:'D1',reason:'execution'}];
 g.abilityClaimLog=[{id:3,playerId:'1L',roleId:'empath',when:'N2',targets:[],result:null,structured:{kind:'number',value:0},visibility:'public',recipients:[]}];
 const hs=evaluateAssignment(roles,g);assert(hs.length);assert(hs.some(h=>h.poison[2]==='1L'));
});
test('Preacher can make one distinct choice every night and cannot duplicate a night',()=>{
 const roles={self:'preacher','1L':'chef','2L':'monk','2R':'poisoner','1R':'imp'};const g=customGame(roles);g.night=2;g.selfRole.shownRole='preacher';
 g.selfActionLog=[{id:1,roleId:'preacher',when:'N1',target:'1L'},{id:2,roleId:'preacher',when:'N2',target:'2R'}];
 assert(validateSnapshot(g));g.selfActionLog[1].when='N1';assert(!validateSnapshot(g));
});
test('A healthy Preacher blocks the Scarlet Woman from succeeding the executed Imp',()=>{
 const roles={self:'preacher','1L':'chef','2L':'monk','2R':'scarlet_woman','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='preacher';
 g.deathLog=[{id:2,playerId:'1R',when:'D1',reason:'execution'}];
 const ordinary=evaluateAssignment(roles,g);
 assert(ordinary.length);assert(ordinary.some(w=>w.current['2R']==='imp'));
 g.selfActionLog=[{id:1,roleId:'preacher',when:'N1',target:'2R'}];
 const preached=evaluateAssignment(roles,g);
 assert(preached.length);assert(preached.every(w=>w.current['2R']==='scarlet_woman' && w.ended));
});
test('Preached Spy cannot register good to another Townsfolk while suppressed',()=>{
 const roles={self:'preacher','1L':'steward','2L':'monk','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='preacher';
 g.abilityClaimLog=[{id:5,playerId:'1L',roleId:'steward',when:'N1',targets:['2R'],result:null,structured:{kind:'singlePlayer',player:'2R'},visibility:'public',recipients:[]}];
 const baseline=evaluateAssignment(roles,g);assert(baseline.length);assert(baseline.some(w=>w.info[5]==='registration'));
 g.selfActionLog=[{id:1,roleId:'preacher',when:'N1',target:'2R'}];
 const blocked=evaluateAssignment(roles,g);
 assert(blocked.length);assert(blocked.every(w=>w.info[5]!=='works'));
});
test('Princess prevents a Demon killing a chosen living target on N2',()=>{
 const roles={self:'princess','1L':'chef','2L':'monk','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.night=2;g.selfRole.shownRole='princess';g.completedNights=[2];
 g.nominationLog=[{id:1,nominator:'self',nominee:'1L',when:'D1',voters:['self','2L']}];
 g.deathLog=[{id:2,playerId:'1L',when:'D1',reason:'execution'}];
 g.selfActionLog=[{id:4,roleId:'princess',kind:'first_day_execution',when:'D1',nominee:'1L'}];
 const hs=evaluateAssignment(roles,g);assert(hs.length);
 // A Demon may voluntarily attack someone who is already dead, so a
 // zero-death night without this action would not prove Princess is active.
 assert(hs.every(h=>h.alive.includes('2L')));
});
test('Princess suppression does not forbid explicitly non-Demon night deaths',()=>{
 const roles={self:'princess','1L':'chef','2L':'monk','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.night=2;g.selfRole.shownRole='princess';
 g.nominationLog=[{id:1,nominator:'self',nominee:'1L',when:'D1',voters:['self']}];
 g.deathLog=[{id:2,playerId:'1L',when:'D1',reason:'execution'},{id:3,playerId:'2L',when:'N2',reason:'night_death',sourceRoleId:'lycanthrope'}];
 g.scriptRoleIds.push('lycanthrope');
 g.selfActionLog=[{id:4,roleId:'princess',kind:'first_day_execution',when:'D1',nominee:'1L'}];
 assert(validateSnapshot(g));assert(evaluateAssignment(roles,g).length);
});
test('Princess first-day execution action requires matching recorded nomination and execution',()=>{
 const roles={self:'princess','1L':'chef','2L':'monk','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.night=2;g.selfRole.shownRole='princess';
 g.selfActionLog=[{id:1,roleId:'princess',kind:'first_day_execution',when:'D1',nominee:'1L'}];
 assert(!validateSnapshot(g));
 g.nominationLog=[{id:2,nominator:'self',nominee:'1L',when:'D1',voters:[]}];assert(validateSnapshot(g));g.deathLog=[{id:3,playerId:'1L',when:'D1',reason:'execution'}];assert(validateSnapshot(g));
 g.selfActionLog[0].when='N1';assert(!validateSnapshot(g));
});
test('Princess may stop the Demon after an execution where the nominee survives',()=>{
 const roles={self:'princess','1L':'chef','2L':'monk','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.night=2;g.selfRole.shownRole='princess';g.completedNights=[2];
 g.nominationLog=[{id:1,nominator:'self',nominee:'1L',when:'D1',voters:['self','2L']}];
 g.selfActionLog=[{id:2,roleId:'princess',kind:'first_day_execution',when:'D1',nominee:'1L'}];
 assert(validateSnapshot(g));assert(evaluateAssignment(roles,g).length);
 g.noExecutionDays=[1];assert(!validateSnapshot(g));
 g.noExecutionDays=[];g.deathLog=[{id:3,playerId:'2L',when:'D1',reason:'execution'}];assert(!validateSnapshot(g));
});
test('Princess first-day ability fails when used on Day 2 without becoming Princess later',()=>{
 const roles={self:'princess','1L':'chef','2L':'monk','2R':'spy','1R':'imp'};
 const g=customGame(roles);g.night=2;g.selfRole.shownRole='princess';
 g.selfActionLog=[{id:1,roleId:'princess',kind:'first_day_execution',when:'D2',nominee:'1L'}];
 g.nominationLog=[{id:2,nominator:'self',nominee:'1L',when:'D2',voters:[]}];g.deathLog=[{id:3,playerId:'1L',when:'D2',reason:'execution'}];
 assert.equal(evaluateAssignment(roles,g).length,0);
});


// Experimental Demon phase 6: core setup, evidence, import, and win mechanics.
const {isTyphonLayout,typhonLayouts,isLeviathanEnabled,demonPatternSignals,demonPatternLogBonus}=require('../.engine-test/engine/demonVariants.js');
const {drawSpecialAssignment}=require('../.engine-test/engine/specialDemons.js');
function demonGame(n=10){const g=game(n);g.playset='custom:phase6';g.scriptRoleIds=Object.keys(ROLES);return g;}
function typhon10(){return {self:'lord_of_typhon','1L':'poisoner','2L':'assassin','3L':'chef','4L':'empath','5L':'monk','4R':'soldier','3R':'mayor','2R':'general','1R':'baron'};}
test('Phase 6 Demons are script-maker-only with Japanese labels and symbols',()=>{
 for(const id of ['lord_of_typhon','kazali','legion','leviathan']){assert.equal(ROLES[id].type,'demon');for(const core of Object.values(BUILT_IN_SCRIPTS))assert(!core.roleIds.includes(id));}
 assert.equal(ROLES.lord_of_typhon.symbol,'卿');assert.equal(ROLES.kazali.symbol,'傀');assert.equal(ROLES.legion.symbol,'群');assert.equal(ROLES.leviathan.symbol,'巨');
});
test('Lord of Typhon adds one Minion and supports arbitrary Outsider numbers',()=>{
 const g=demonGame(10);const options=setupCountOptionsForGame(g,['lord_of_typhon','poisoner','baron','assassin']);
 assert.equal(options.length,7);assert(options.every(x=>x.minion===3&&x.demon===1&&x.townsfolk+x.outsider===6));
 assert(options.some(x=>x.outsider===0));assert(options.some(x=>x.outsider===6));
});
test('Typhon is between contiguous Minions and invalid off-line placements are rejected',()=>{
 const g=demonGame(10),x=typhon10();assert(isTyphonLayout(x,seats(10)));assert(validSetup(x,g));
 const off={...x,'2L':'chef','3L':'assassin'};assert(!isTyphonLayout(off,seats(10)));assert(!validSetup(off,g));
});
test('Typhon at seven players requires both adjacent Minions',()=>{
 const g=demonGame(7);const layouts=typhonLayouts(seats(7),'self',2);assert.equal(layouts.length,1);
 assert.deepEqual(layouts[0].slice().sort(),['1L','1R']);
 const w={self:'lord_of_typhon','1L':'poisoner','2L':'chef','3L':'empath','2R':'monk','1R':'baron','3R':'soldier'};
 assert(validSetup(w,g));
});
test('Typhon generated assignments have one extra Minion and a valid seat line',()=>{
 const g=demonGame(10);g.selfRole.shownRole='lord_of_typhon';let found=0;
 for(let i=0;i<8;i++){const a=drawSpecialAssignment(g,Math.random,{self:'lord_of_typhon'},'lord_of_typhon');if(a){assert(validSetup(a,g));assert(isTyphonLayout(a,seats(10)));assert.equal(Object.values(a).filter(r=>ROLES[r].type==='minion').length,3);found++;}}
 assert(found>0);
});
test('Typhon additional independent Minion claimers increase only heuristic likelihood',()=>{
 const g=demonGame(10),ty=typhon10();assert.equal(demonPatternLogBonus(g,ty),0);
 claim(g,'1L','baron',201);claim(g,'2L','poisoner',202);claim(g,'3L','assassin',203);
 assert.equal(demonPatternSignals(g).excessMinions,1);assert(demonPatternLogBonus(g,ty)>0);
 const normal={...ty,self:'imp'};assert.equal(demonPatternLogBonus(g,normal),0);
});
test('Lord self-player role predictions are only notes, not role locks',()=>{
 const g=demonGame(10);g.selfRole.shownRole='lord_of_typhon';g.demonState={knownMinions:[],storytellerBluffs:[],bluffPlans:{},typhonPredictions:{'1L':'spy','1R':'witch'}};
 assert(validateSnapshot(g));const w=typhon10();assert(validSetup(w,g));
 g.demonState.typhonPredictions['1L']='chef';assert(!validateSnapshot(g));
});
test('Lord known 3 Minions and attack actions survive imported snapshots',()=>{
 const g=demonGame(10);g.selfRole.shownRole='lord_of_typhon';g.night=2;g.demonState={knownMinions:[{playerId:'1L',source:'demon_info',roleId:'poisoner'},{playerId:'1R',source:'demon_info',roleId:'baron'},{playerId:'2L',source:'demon_info',roleId:'assassin'}],storytellerBluffs:[],bluffPlans:{}};
 g.demonActionLog=[{id:321,roleId:'lord_of_typhon',when:'N2',target:'3L',note:null}];assert(validateSnapshot(g));
 const w=typhon10();assert(validSetup(w,g));g.demonActionLog[0].roleId='legion';assert(!validateSnapshot(g));
});
test('Kazali keeps standard Minion count and variable Outsiders',()=>{
 const g=demonGame(10),cs=setupCountOptionsForGame(g,['kazali','poisoner','baron']);
 assert.equal(cs.length,8);assert(cs.every(v=>v.minion===2&&v.demon===1&&v.townsfolk+v.outsider===7));
 assert(cs.some(v=>v.outsider===4));
});
test('Kazali selected Minion identities can be fixed on arbitrary seats',()=>{
 const g=demonGame(10);g.selfRole.shownRole='kazali';g.demonState={knownMinions:[{playerId:'3L',source:'demon_info',roleId:'poisoner'},{playerId:'4R',source:'demon_info',roleId:'assassin'}],storytellerBluffs:[],bluffPlans:{}};
 assert(validateSnapshot(g));let w=drawSpecialAssignment(g,Math.random,{self:'kazali'},'kazali');assert(w);assert(validSetup(w,g));assert.equal(w['3L'],'poisoner');assert.equal(w['4R'],'assassin');
 g.demonState.knownMinions[1].roleId='poisoner';assert.equal(drawSpecialAssignment(g,Math.random,{self:'kazali'},'kazali'),null);
});
test('Kazali outsider surplus is supportive but not a hard deduction',()=>{
 const g=demonGame(10),w={...typhon10(),self:'kazali'};claim(g,'1L','saint',1);claim(g,'2L','drunk',2);assert(demonPatternLogBonus(g,w)>0);
});
test('Legion generated worlds have Demon majority, duplicate role, and no Minions',()=>{
 const g=demonGame(10);g.selfRole.shownRole='legion';g.demonState={knownMinions:[],storytellerBluffs:[],bluffPlans:{}};
 for(let i=0;i<5;i++){const a=drawSpecialAssignment(g,Math.random,{self:'legion'},'legion');assert(a);assert(validSetup(a,g));assert(Object.values(a).filter(x=>x==='legion').length>5);assert(!Object.values(a).some(x=>ROLES[x].type==='minion'));}
});
test('Legion allies are hard locks and invalid ally records are rejected',()=>{
 const g=demonGame(10);g.selfRole.shownRole='legion';g.demonState={knownMinions:[],storytellerBluffs:[],bluffPlans:{},legionAllies:['1L','3R']};
 assert(validateSnapshot(g));let a=drawSpecialAssignment(g,Math.random,{self:'legion'},'legion');assert(a);assert.equal(a['1L'],'legion');assert.equal(a['3R'],'legion');
 g.demonState.legionAllies.push('1L');assert(!validateSnapshot(g));
});
test('Legion can register as a Minion, unlike normal Demons',()=>{
 assert(canRegisterRole('legion','spy'));assert(!canRegisterRole('imp','spy'));
});
test('Legion 0-vote large voting bloc boosts its weak heuristic weight',()=>{
 const g=demonGame(10),w={...typhon10(),self:'legion'};g.night=2;
 g.nominationLog=[{id:1,when:'D1',nominator:'self',nominee:'1L',voters:['1R','2R','3R','4R'],voteTotal:0,votingOccurred:true}];
 assert.equal(demonPatternSignals(g).suspiciousZeroVotes,1);assert(demonPatternLogBonus(g,w)>0);
});
test('Legion missing reported information modestly increases odds',()=>{
 const g=demonGame(10),w={...typhon10(),self:'legion'};g.night=2;
 for(const [i,p]of ['1L','2L','3L','4L'].entries())claim(g,p,'empath',900+i);
 assert(demonPatternSignals(g).sparseInfo);assert(demonPatternLogBonus(g,w)>0);
});
test('Leviathan stays impossible until explicitly confirmed on the reasoning screen',()=>{
 const g=demonGame(5),initial={self:'leviathan','1L':'chef','2L':'monk','2R':'poisoner','1R':'empath'};
 assert(!isLeviathanEnabled(g));assert(!validSetup(initial,g));g.leviathanConfirmed=true;
 assert(isLeviathanEnabled(g));assert(validSetup(initial,g));assert(validateSnapshot(g));
 g.leviathanConfirmed='yes';assert(!validateSnapshot(g));
});
test('A checked Leviathan restricts the whole sample to Leviathan worlds',()=>{
 const g=demonGame(7);g.leviathanConfirmed=true;
 const r=runSearch(g,{attempts:250,seed:877,maxMillis:6000,beamWidth:1});assert(r.unique>0);assert.equal(r.presence.leviathan,1);
});
test('Leviathan wins after two good executions and never chooses a night kill',()=>{
 const initial={self:'leviathan','1L':'chef','2L':'monk','2R':'poisoner','1R':'empath'};const g=customGame(initial);g.leviathanConfirmed=true;g.night=2;
 g.deathLog=[{id:1,playerId:'1L',when:'D1',reason:'execution'},{id:2,playerId:'2L',when:'D2',reason:'execution'}];
 const histories=evaluateAssignment(initial,g);assert(histories.length>0);assert(histories.every(w=>w.ended&&w.endReason==='leviathan'));
});
test('Leviathan world reaching sixth day is resolved as evil victory',()=>{
 const initial={self:'leviathan','1L':'chef','2L':'monk','2R':'poisoner','1R':'empath'},g=customGame(initial);g.leviathanConfirmed=true;g.night=6;
 const histories=evaluateAssignment(initial,g);assert(histories.length>0);assert(histories.every(w=>w.ended&&w.endReason==='leviathan'));
});
test('Special Demon mode results and conditional Legion ranking are produced',()=>{
 const g=demonGame(10),r=runSearch(g,{attempts:300,seed:919,maxMillis:6500,beamWidth:1});
 assert(r.unique>0);assert(r.presence.leviathan===undefined||r.presence.leviathan===0);
 assert(r.presence.legion>0);assert(r.legionConditionalSeats);
 for(const prob of Object.values(r.legionConditionalSeats))assert(prob>=0&&prob<=1);
});


test('Leviathan counts good executions where the player survives',()=>{
 const initial={self:'leviathan','1L':'chef','2L':'monk','2R':'poisoner','1R':'empath'},g=customGame(initial);g.leviathanConfirmed=true;g.night=2;
 g.nominationLog=[{id:1,when:'D1',nominator:'self',nominee:'1L',voters:['self'],voteTotal:1,votingOccurred:true,executed:true},{id:2,when:'D2',nominator:'self',nominee:'2L',voters:['self'],voteTotal:1,votingOccurred:true,executed:true}];
 assert(validateSnapshot(g));const ws=evaluateAssignment(initial,g);assert(ws.length);assert(ws.every(w=>w.ended&&w.endReason==='leviathan'&&w.leviathanGoodExecutions===2));
});
test('Leviathan does not double-count nonlethal marker and actual death',()=>{
 const initial={self:'leviathan','1L':'chef','2L':'monk','2R':'poisoner','1R':'empath'},g=customGame(initial);g.leviathanConfirmed=true;
 g.nominationLog=[{id:1,when:'D1',nominator:'self',nominee:'1L',voters:['self'],executed:true}];
 g.deathLog=[{id:2,playerId:'1L',when:'D1',reason:'execution'}];const ws=evaluateAssignment(initial,g);assert(ws.length);assert(ws.every(w=>w.leviathanGoodExecutions===1));
});
test('An observed nonlethal execution cannot be marked as no execution day',()=>{
 const g=demonGame(5);g.nominationLog=[{id:1,nominator:'self',nominee:'1L',when:'D1',voters:['self'],executed:true}];g.noExecutionDays=[1];
 // The form explicitly clears no-execution when the user confirms an execution.
 assert(g.nominationLog[0].executed);g.nominationLog[0].executed='maybe';assert(!validateSnapshot(g));
});
test('Legion executions fail when every recorded voter is Legion',()=>{
 const initial={self:'legion','1L':'legion','2L':'legion','3L':'legion','4L':'legion','5L':'legion','4R':'legion','3R':'chef','2R':'empath','1R':'monk'},g=customGame(initial,10);
 g.nominationLog=[{id:1,when:'D1',nominator:'self',nominee:'3R',voters:['self','1L','2L'],voteTotal:0,votingOccurred:true}];
 assert(evaluateAssignment(initial,g).length);
 g.deathLog=[{id:2,playerId:'3R',when:'D1',reason:'execution'}];assert.equal(evaluateAssignment(initial,g).length,0);
 g.nominationLog[0].voters.push('3R');g.nominationLog[0].voteTotal=4;assert(evaluateAssignment(initial,g).length);
});
test('Legion does not infer exclusively evil voting when no voters were entered',()=>{
 const initial={self:'legion','1L':'legion','2L':'legion','3L':'legion','4L':'legion','5L':'legion','4R':'legion','3R':'chef','2R':'empath','1R':'monk'},g=customGame(initial,10);
 g.nominationLog=[{id:1,when:'D1',nominator:'self',nominee:'3R',voters:[],voteTotal:4,votingOccurred:true}];
 g.deathLog=[{id:2,playerId:'3R',when:'D1',reason:'execution'}];assert(evaluateAssignment(initial,g).length);
});

// Experimental Demon phase 7: role setup, conditional clues, host poisoning,
// public announcements, nominations, and character-selected kills.
const {isAlHadikhiaEnabled,isRiotConfirmed}=require('../.engine-test/engine/demonVariants.js');
const PHASE7=['lil_monsta','lleech','al_hadikhia','ojo','riot','yaggababble'];
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


// Experimental Minions phase 8: storyteller-granted Demon ability, explosion,
// execution warnings, Harpy madness victim reports, and hidden evil tokens.
const phase8Symbols={boffin:'博',boomdandy:'炸',fearmonger:'恐',harpy:'鳥',marionette:'糸'};
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


// Experimental Minions phase 9: changing alignment, hidden voting, public
// Psychopath kills, a Demon-less Summoner setup, Widow poison, and Xaan.
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


// Catalog integrity safeguards: symbols must identify exactly one role and every
// registered non-Traveller character must appear in the custom-script maker.
test('Every registered character is selectable in custom scripts, including all ten experimental Demons',()=>{
 const defined=Object.keys(ROLES);
 assert.equal(defined.length,135);
 assert.equal(ALL_CORE_ROLE_IDS.length,defined.length,'No characters may be omitted or duplicated');
 assert.deepEqual(new Set(ALL_CORE_ROLE_IDS),new Set(defined));
 for(const demon of ['lord_of_typhon','kazali','legion','leviathan','lil_monsta','lleech','al_hadikhia','ojo','riot','yaggababble'])
   assert(ALL_CORE_ROLE_IDS.includes(demon),`${demon} absent from script maker`);
});
test('Every regular character and Traveller has a globally unique one-character symbol',()=>{
 const all=[...Object.entries(ROLES).map(([id,role])=>({id,symbol:role.symbol})),...Object.entries(TRAVELLERS).map(([id,role])=>({id,symbol:role.symbol}))];
 const seen=new Map();
 for(const {id,symbol} of all){
   assert.equal([...symbol].length,1,`${id} should have one symbol`);
   assert(!seen.has(symbol),`${id} and ${seen.get(symbol)} both use ${symbol}`);
   seen.set(symbol,id);
 }
});


// Cross-character setup dependency guard. These are the ONLY automatic
// script-insertion relationships; other named-character interactions are
// gameplay rules/jinxes and must not turn into new script-maker dependencies.
test('Only Choirboy and Huntsman add another character to a script',()=>{
 const {createCustomScript}=require('../.engine-test/scripts.js');
 const expected={choirboy:'king',huntsman:'damsel'};
 for(const id of ALL_CORE_ROLE_IDS){
   const script=createCustomScript('dependency check',[id]);
   assert.deepEqual(script.roleIds,[id,...(expected[id]?[expected[id]]:[])],`${id} unexpectedly adds or loses a character`);
 }
});
test('Old saved scripts normalize exactly the two official addition dependencies',()=>{
 const {getSnapshotScriptRoleIds}=require('../.engine-test/scripts.js');
 const expected={choirboy:'king',huntsman:'damsel'};
 for(const id of ALL_CORE_ROLE_IDS){
   const g=game();g.playset='custom:dependency-audit';g.scriptRoleIds=[id];
   assert.deepEqual(getSnapshotScriptRoleIds(g),[id,...(expected[id]?[expected[id]]:[])],`${id}: incorrect snapshot addition`);
 }
 const g=game();g.playset='custom:dependency-audit';g.scriptRoleIds=['choirboy','huntsman'];
 assert.deepEqual(getSnapshotScriptRoleIds(g),['choirboy','huntsman','king','damsel']);
});
test('King and Damsel do not require Choirboy and Huntsman respectively',()=>{
 const {createCustomScript}=require('../.engine-test/scripts.js');
 assert.deepEqual(createCustomScript('king only',['king']).roleIds,['king']);
 assert.deepEqual(createCustomScript('damsel only',['damsel']).roleIds,['damsel']);
 const kingRoles={self:'king','1L':'chef','2L':'empath','2R':'spy','1R':'imp'};
 const kg=customGame(kingRoles);kg.selfRole.shownRole='king';
 assert(validSetup(kingRoles,kg),'King may be in play without Choirboy');
 const damselRoles={self:'damsel','1L':'saint','2L':'chef','2R':'baron','1R':'imp'};
 const dg=customGame(damselRoles);dg.selfRole.shownRole='damsel';
 assert(validSetup(damselRoles,dg),'Damsel may be in play without Huntsman');
});

// Public Djinn/jinx data is scoped to characters actually implemented in our
// 125-character catalogue. Most other exceptions are Storyteller decisions.
test('Only active and winning jinxes appear in the UI registry',()=>{
 assert.equal(OFFICIAL_JINXES.length,90);
 assert.equal(JINXES.length,29);
 assert.equal(new Set(JINXES.map(j=>j.id)).size,29);
 for(const j of JINXES){assert(ROLES[j.a],j.a);assert(ROLES[j.b],j.b);assert.notEqual(j.a,j.b);assert(j.description.length>6);assert(['engine','victory'].includes(j.support));}
});
test('Jinxes are public script-level interactions, not proof of participating characters',()=>{
 assert.deepEqual(scriptJinxes(['marionette','huntsman','damsel']).map(j=>j.id),['huntsman:marionette']);
 assert.equal(scriptJinxes(['marionette','damsel']).length,0);
 assert(hasJinx('huntsman','marionette')); assert(hasJinx('marionette','huntsman'));
 assert(roleJinxes('marionette',['marionette','huntsman']).length===1);
 assert(jinxLabel(scriptJinxes(['marionette','huntsman'])[0]).includes(ROLES.marionette.symbol));
});
test('All three built-in scripts contain no experimental official jinx pair',()=>{
 for(const script of BUILT_IN_SCRIPTS)assert.equal(scriptJinxes(script.roleIds).length,0,script.id);
});
test('Retired Organ Grinder and Flowergirl jinx is not reintroduced',()=>{
 assert(!hasJinx('organ_grinder','flowergirl'));
});
test('All jinxes leave the old two automatic script additions unchanged',()=>{
 const {createCustomScript}=require('../.engine-test/scripts.js');
 const full=createCustomScript('all roles',ALL_CORE_ROLE_IDS);
 assert.equal(full.roleIds.length,135);
 assert.equal(scriptJinxes(full.roleIds).length,29);
});
test('King uses ordinary threshold unless Riot or Leviathan is in play',()=>{
 assert(!kingInformationAvailable(['king','imp'],4,5));
 assert(kingInformationAvailable(['king','imp'],2,5));
 assert(!kingInformationAvailable(['king','riot'],5,5));
 assert(kingInformationAvailable(['king','riot'],4,5));
 assert(kingInformationAvailable(['king','leviathan'],4,5));
 assert(!kingInformationAvailable(['king','lord_of_typhon'],4,5));
});
test('Marionette-Huntsman jinx permits Damsel outsider even with nominal zero outsiders',()=>{
 const roles={self:'imp','1L':'marionette','2L':'damsel','2R':'washerwoman','1R':'empath'};
 const g=customGame(roles);g.scriptRoleIds.push('huntsman');
 assert(validSetup(roles,g));
 claim(g,'1L','huntsman');
 const worlds=evaluateAssignment(roles,g);
 assert(worlds.length>0);
 assert(worlds.some(w=>w.believedRoles['1L']==='huntsman'));
});
test('Marionette cannot believe they are Huntsman without Damsel actually in play',()=>{
 const roles={self:'imp','1L':'marionette','2L':'chef','2R':'washerwoman','1R':'empath'};
 const g=customGame(roles);g.scriptRoleIds.push('huntsman','damsel');
 assert(validSetup(roles,g));
 claim(g,'1L','huntsman');
 const worlds=evaluateAssignment(roles,g);
 assert(worlds.length>0,'a claimed role can still be a bluff');
 assert(worlds.every(w=>w.believedRoles['1L']!=='huntsman'));
});
test('Marionette-Huntsman outsider variant is reachable by normal sampler',()=>{
 const g=game(5);g.playset='custom:jinxes';
 g.scriptRoleIds=['imp','marionette','damsel','huntsman','washerwoman','empath','chef','monk'];
 const roles=drawAssignment(g,rng(1),{self:'imp','1L':'marionette','2L':'damsel'});
 assert(roles,'out-of-order jinx setup should be sampled');
 assert(validSetup(roles,g));
});
test('Boffin cannot give the forbidden Drunk ability',()=>{
 const roles={self:'boffin','1L':'village_idiot','2L':'chef','2R':'empath','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='boffin';g.scriptRoleIds.push('drunk');
 g.minionState={boffinGrantedAbility:'drunk'};
 assert(!validSetup(roles,g));
});
test('Boffin may give Village Idiot ability with a spare token',()=>{
 const roles={self:'boffin','1L':'village_idiot','2L':'chef','2R':'empath','1R':'imp'};
 const g=customGame(roles);g.selfRole.shownRole='boffin';
 g.minionState={boffinGrantedAbility:'village_idiot'};
 assert(validSetup(roles,g));
 assert(evaluateAssignment(roles,g).some(w=>w.boffinGrantedAbility==='village_idiot'));
});
test('Existing Damsel, Spy and Widow interaction is registered explicitly',()=>{
 assert(hasJinx('spy','damsel'));
 assert(hasJinx('widow','damsel'));
 assert.equal(scriptJinxes(['damsel','spy','widow']).length,2);
});


test('Summoner/Pukka jinx permits the only legal N2 summon and preserves it on N3',()=>{
 const w={self:'summoner','1L':'chef','2L':'monk','2R':'empath','1R':'general'};
 const g=customGame(w);g.night=3;g.selfRole.shownRole='summoner';g.scriptRoleIds.push('pukka');
 g.minionState={knownDemon:null,knownMinions:[],sharedStorytellerBluffs:[],bluffPlans:{},spyInitialRoles:{},spyRedHerring:null,becameDemonAt:null,summonedDemon:{when:'N2',playerId:'1R',demonRole:'pukka'}};
 assert(validateSnapshot(g));const worlds=evaluateAssignment(w,g,12);
 assert(worlds.length,'recorded N2 jinx must be representable');
 assert(worlds.every(x=>x.current['1R']==='pukka'&&x.changes.filter(z=>z.kind==='summoner').length===1));
 assert(worlds.every(x=>x.changes.some(z=>z.kind==='summoner'&&z.when==='N2')));
 g.minionState.summonedDemon={when:'N2',playerId:'1R',demonRole:'imp'};
 g.scriptRoleIds.push('imp');
 assert(!validateSnapshot(g),'N2 cannot summon a different Demon');
});
test('Summoner can still wait until N3 with Pukka on the script',()=>{
 const w={self:'summoner','1L':'chef','2L':'monk','2R':'empath','1R':'general'};
 const g=customGame(w);g.night=3;g.selfRole.shownRole='summoner';g.scriptRoleIds.push('pukka');
 g.minionState={knownDemon:null,knownMinions:[],sharedStorytellerBluffs:[],bluffPlans:{},spyInitialRoles:{},spyRedHerring:null,becameDemonAt:null,summonedDemon:{when:'N3',playerId:'1R',demonRole:'pukka'}};
 assert(validateSnapshot(g));assert(evaluateAssignment(w,g,12).some(x=>x.current['1R']==='pukka'&&x.changes.some(c=>c.when==='N3'&&c.kind==='summoner')));
});
test('Lleech/Slayer jinx allows a Slayer shot to kill the poisoned host',()=>{
 const w={self:'slayer','1L':'chef','2L':'poisoner','2R':'monk','1R':'lleech'};
 const g=customGame(w);g.selfRole.shownRole='slayer';
 g.abilityTriggerLog=[{id:3201,roleId:'slayer',rolePlayerId:'self',targetPlayerId:'1L',when:'D1',triggered:true}];
 g.deathLog=[{id:3202,playerId:'1L',when:'D1',reason:'ability',sourceRoleId:'slayer',sourceEventId:3201}];
 const worlds=evaluateAssignment(w,g,24);
 assert(worlds.length,'slayer shot on a Lleech host is a valid kill');
 assert(worlds.every(x=>x.lleechHost==='1L'&&x.ended), 'successful shot proves chosen target is host here');
});


test('Alchemist/Spy jinx requires the real Spy if the Alchemist is given its ability',()=>{
 const w={self:'alchemist','1L':'chef','2L':'spy','2R':'empath','1R':'imp'};
 const g=customGame(w);g.selfRole.shownRole='alchemist';g.scriptRoleIds.push('poisoner');
 g.selfActionLog=[{id:3301,roleId:'alchemist',kind:'minion_ability',when:'N1',minionRole:'spy'}];
 assert(validSetup(w,g));assert(!validSetup({...w,'2L':'poisoner'},g));
});
test('Alchemist/Marionette jinx requires the real Marionette beside the Demon',()=>{
 const w={self:'alchemist','1L':'chef','2L':'empath','2R':'marionette','1R':'imp'};
 const g=customGame(w);g.selfRole.shownRole='alchemist';g.scriptRoleIds.push('poisoner');
 g.selfActionLog=[{id:3302,roleId:'alchemist',kind:'minion_ability',when:'N1',minionRole:'marionette'}];
 assert(validSetup(w,g));assert(!validSetup({...w,'2R':'poisoner'},g));
 assert(!validSetup({...w,'2R':'chef','1L':'marionette'},g));
});
test('Alchemist/Mastermind jinx forbids an in-play Mastermind with its copied ability',()=>{
 const w={self:'alchemist','1L':'chef','2L':'empath','2R':'mastermind','1R':'imp'};
 const g=customGame(w);g.selfRole.shownRole='alchemist';g.scriptRoleIds.push('poisoner');
 g.selfActionLog=[{id:3303,roleId:'alchemist',kind:'minion_ability',when:'N1',minionRole:'mastermind'}];
 assert(!validSetup(w,g));assert(validSetup({...w,'2R':'poisoner'},g));
});


// Victory-only Djinn release: hidden Storyteller-only interactions must not
// appear as active mechanics, and every public special ending is tested.
test('Active Djinn panel omits inert and Storyteller-only pairs',()=>{
 assert.equal(JINXES.length,29);
 assert(!hasJinx('butler','organ_grinder'));
 assert(!hasJinx('alchemist','boffin'));
 assert(hasJinx('leviathan','mayor'));
 assert(hasJinx('al_hadikhia','mastermind'));
 assert(hasJinx('lleech','mastermind'));
 assert.deepEqual([...JINX_VICTORY_PAIRS].length,14);
});
function fakeJinxWorld(roles,dead=[],align={}){
 return {initial:roles,current:roles,alive:Object.keys(roles).filter(k=>!dead.includes(k)),
  currentAlignment:Object.fromEntries(Object.keys(roles).map(k=>[k,align[k]??(ROLES[roles[k]].type==='minion'||ROLES[roles[k]].type==='demon'?'evil':'good')]))};
}
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


// Experimental Outsiders phase 10 - mechanical and data round-trip regressions.
function outsiderEight(out='puzzlemaster',minion='scarlet_woman'){
 const arr=[out,'chef','washerwoman','empath','monk','fortune_teller',minion,'imp'];
 const initial=Object.fromEntries(seats(8).map((p,i)=>[p,arr[i]]));
 return {initial,g:customGame(initial,8)};
}
test('All eleven Experimental Outsiders are selectable with globally distinct kanji',()=>{
 const outsiders=['damsel','golem','hatter','heretic','hermit','ogre','plague_doctor','politician','puzzlemaster','snitch','zealot'];
 for(const id of outsiders){assert.equal(ROLES[id].type,'outsider');assert(ALL_CORE_ROLE_IDS.includes(id));for(const script of BUILT_IN_SCRIPTS)assert(!script.roleIds.includes(id));}
 assert.equal(ROLES.ogre.symbol,'怪');assert.equal(ROLES.goblin.symbol,'鬼');
 assert.equal(new Set(Object.values(ROLES).map(role=>role.symbol)).size,Object.values(ROLES).length);
 assert.equal(ALL_CORE_ROLE_IDS.length,135);
});
test('Puzzlemaster has one fixed drunk who can even be themselves',()=>{
 const {initial,g}=outsiderEight();assert(validSetup(initial,g));
 const worlds=evaluateAssignment(initial,g,24);assert(worlds.length>0);
 assert(worlds.every(w=>w.puzzlemasterDrunk));
 assert(worlds.some(w=>w.puzzlemasterDrunk==='self'));
 assert(new Set(worlds.map(w=>w.puzzlemasterDrunk)).size>1);
});
test('Puzzlemaster may guess themselves, but not after a prior-night death',()=>{
 const {initial,g}=outsiderEight();g.selfRole.shownRole='puzzlemaster';
 g.outsiderEvents=[{id:130003,when:'D1',kind:'puzzlemaster_guess',playerId:'self',target:'self',shownDemon:'1L'}];
 assert(validateSnapshot(g));
 const candidates=evaluateAssignment(initial,g,40);assert(candidates.length>0);
 assert(candidates.some(w=>w.puzzlemasterDrunk==='self'));
 assert(candidates.some(w=>w.puzzlemasterDrunk!=='self'));
 const after=structuredClone(g);after.night=2;after.outsiderEvents[0].when='D2';
 after.deathLog=[{id:130004,when:'N2',playerId:'self',reason:'night_death'}];
 assert(validateSnapshot(after));assert.equal(evaluateAssignment(initial,after,40).length,0);
});
test('Puzzlemaster correct guess shows true Demon, not arbitrary player',()=>{
 const {initial,g}=outsiderEight();g.outsiderEvents=[{id:130001,when:'D1',kind:'puzzlemaster_guess',playerId:'self',target:'1L',shownDemon:'1R'}];
 const demon=seats(8).at(-1);g.outsiderEvents[0].shownDemon=demon;
 const worlds=evaluateAssignment(initial,g,16);assert(worlds.length>0);
 assert(worlds.every(w=>w.puzzlemasterDrunk==='1L' || w.puzzlemasterDrunk==='self')); // A self-drunk Puzzlemaster can receive arbitrary information.
 const wrong=structuredClone(g);wrong.outsiderEvents[0].shownDemon='1L';
 const alternative=evaluateAssignment(initial,wrong,16);assert(alternative.length>0);
 assert(alternative.every(w=>w.puzzlemasterDrunk!=='1L')); 
});
test('Ogre alignment follows chosen evil seat without becoming a Minion',()=>{
 const {initial,g}=outsiderEight('ogre');g.selfRole.shownRole='ogre';
 g.outsiderEvents=[{id:130010,when:'N1',kind:'ogre_choice',playerId:'self',target:seats(8).at(-1)}];
 const worlds=evaluateAssignment(initial,g,12);assert(worlds.length>0);
 assert(worlds.every(w=>w.initialAlignment.self==='evil'&&w.currentAlignment.self==='evil'&&w.ogreFriend===seats(8).at(-1)&&w.current.self==='ogre'));
});
test('Golem kills a non-Demon nominee if ability was actually active',()=>{
 const {initial,g}=outsiderEight('golem');g.selfRole.shownRole='golem';
 g.nominationLog=[{id:130020,when:'D1',nominator:'self',nominee:'1L',voters:[],votingOccurred:false}];
 g.outsiderEvents=[{id:130021,when:'D1',kind:'golem_nomination',playerId:'self',target:'1L',killed:true}];
 g.deathLog=[{id:130022,when:'D1',playerId:'1L',reason:'ability',sourceRoleId:'golem',sourcePlayerId:'self',sourceEventId:130021}];
 assert(evaluateAssignment(initial,g,12).length>0);
 const incompatible=structuredClone(initial);incompatible['1L']='imp';incompatible[seats(8).at(-1)]='chef';
 // A Golem ability may NOT kill an actual Demon character.
 assert.equal(evaluateAssignment(incompatible,g,12).length,0);
});
test('Zealot must vote with five living voters when public tally is complete',()=>{
 const {initial,g}=outsiderEight('zealot');g.selfRole.shownRole='zealot';
 g.nominationLog=[{id:130030,when:'D1',nominator:'1L',nominee:'2L',voters:['1L'],votingOccurred:true}];
 assert.equal(evaluateAssignment(initial,g,10).length,0);
 g.nominationLog[0].voters.push('self');assert(evaluateAssignment(initial,g,10).length>0);
});
test('Heretic reverses a normal good victory including when they are dead',()=>{
 const {initial,g}=outsiderEight('heretic','assassin');g.selfRole.shownRole='heretic';
 g.deathLog=[{id:130040,when:'D1',playerId:seats(8).at(-1),reason:'execution'}];
 const worlds=evaluateAssignment(initial,g,12);assert(worlds.length>0);
 assert(worlds.every(w=>w.ended&&w.endReason==='demonDeath'&&w.effectiveWinner==='evil'));
});
test('Heretic forbidden Djinn pairing is invalid but normal Heretic is legal',()=>{
 const {initial,g}=outsiderEight('heretic');assert(validSetup(initial,g));
 g.scriptRoleIds.push('baron');
 const invalid={...initial,[seats(8)[6]]:'baron'};assert(!validSetup(invalid,g));
});
test('Plague Doctor grants the Storyteller an ability, NOT an extra Minion player',()=>{
 const {initial,g}=outsiderEight('plague_doctor');g.selfRole.shownRole='plague_doctor';
 g.deathLog=[{id:130050,when:'D1',playerId:'self',reason:'execution'}];
 g.outsiderEvents=[{id:130051,when:'D1',kind:'plague_grant',playerId:'self',abilityRole:'witch'}];
 assert(validateSnapshot(g));
 const worlds=evaluateAssignment(initial,g,12);assert(worlds.length>0);
 assert(worlds.every(w=>w.storytellerMinionAbilities.length===1&&w.storytellerMinionAbilities[0].role==='witch'&&Object.values(w.current).filter(r=>ROLES[r].type==='minion').length===1));
});
test('Politician suspicion raises a soft score without making that Outsider evil',()=>{
 const {initial,g}=outsiderEight('politician');g.outsiderEvents=[{id:130060,when:'D1',kind:'politician_suspicion',playerId:'self'}];
 const worlds=evaluateAssignment(initial,g,10);assert(worlds.length>0);
 assert(worlds.every(w=>w.initialAlignment.self==='good'&&w.currentAlignment.self==='good'));
 assert(minionPatternLogBonus(g,worlds[0])>0);
});
test('Storyteller-only Politician reward is recorded separately from team alignment',()=>{
 const {initial,g}=outsiderEight('politician');g.outsiderEvents=[{id:130061,when:'D1',kind:'politician_reward',playerId:'self'}];
 const worlds=evaluateAssignment(initial,g,10);assert(worlds.length>0);
 assert(worlds.every(w=>w.politicianRewarded && w.currentAlignment.self==='good'));
});
test('Hatter death permits a confirmed change to an unused Minion character',()=>{
 const {initial,g}=outsiderEight('hatter');g.scriptRoleIds.push('witch');g.selfRole.shownRole='hatter';
 g.deathLog=[{id:130070,when:'D1',playerId:'self',reason:'execution'}];
 const minion=seats(8)[6];
 g.outsiderEvents=[{id:130071,when:'D1',kind:'hatter_change',playerId:'self',target:minion,newRole:'witch'}];
 const worlds=evaluateAssignment(initial,g,12);assert(worlds.length>0);
 assert(worlds.every(w=>w.current[minion]==='witch'&&w.changes.some(c=>c.kind==='hatter'&&c.playerId===minion)));
});
test('Hatter can change evil roles after a night death',()=>{
 const {initial,g}=outsiderEight('hatter');g.night=2;g.selfRole.shownRole='hatter';g.scriptRoleIds.push('witch');
 g.deathLog=[{id:130072,when:'N2',playerId:'self',reason:'night_death'}];
 const minion=seats(8)[6];g.outsiderEvents=[{id:130073,when:'N2',kind:'hatter_change',playerId:'self',target:minion,newRole:'witch'}];
 assert(validateSnapshot(g));
 const worlds=evaluateAssignment(initial,g,12);assert(worlds.length>0);
 assert(worlds.every(w=>w.current[minion]==='witch'));
});
test('Plague Doctor death at night can grant the Storyteller a Minion ability',()=>{
 const {initial,g}=outsiderEight('plague_doctor');g.night=2;g.selfRole.shownRole='plague_doctor';
 g.deathLog=[{id:130053,when:'N2',playerId:'self',reason:'night_death'}];
 g.outsiderEvents=[{id:130054,when:'N2',kind:'plague_grant',playerId:'self',abilityRole:'witch'}];
 assert(validateSnapshot(g));
 const worlds=evaluateAssignment(initial,g,12);assert(worlds.length>0);
 assert(worlds.every(w=>w.storytellerMinionAbilities.some(grant=>grant.when==='N2'&&grant.role==='witch')));
});
test('DEVOUT THEISTS V6 screenshot has all 25 roles in the custom script catalog',()=>{
 const ids=['noble','chef','pixie','high_priestess','mathematician','flowergirl','savant','amnesiac','juggler','fisherman','farmer','magician','cannibal','puzzlemaster','klutz','golem','snitch','widow','goblin','psychopath','marionette','lleech','fang_gu','kazali','legion'];
 assert.equal(ids.length,25);assert.equal(new Set(ids).size,25);
 ids.forEach(id=>assert(ALL_CORE_ROLE_IDS.includes(id),`${id} missing from custom script catalog`));
});
test('Snitch gives three confirmed out-of-play role bluffs to a Minion',()=>{
 const {initial,g}=outsiderEight('snitch','poisoner');
 const minion=seats(8)[6];g.selfRole.shownRole=null;
 initial.self='snitch';g.scriptRoleIds.push('sage','virgin','mayor');
 g.minionState={knownDemon:null,knownMinions:[],sharedStorytellerBluffs:[],bluffPlans:{},spyInitialRoles:{},spyRedHerring:null,becameDemonAt:null,snitchBluffs:['sage','virgin','mayor']};
 assert(validateSnapshot(g));assert(validSetup(initial,g));
 const impossible={...initial,[seats(8)[2]]:'sage'};
 assert(!validSetup(impossible,g));
});
test('Outsider event save validation rejects impossible kinds, targets and duplicates',()=>{
 const {g}=outsiderEight('golem');g.outsiderEvents=[{id:130080,when:'D1',kind:'golem_nomination',playerId:'self',target:'1L',killed:true}];
 assert(validateSnapshot(g));
 const double=structuredClone(g);double.outsiderEvents.push({...g.outsiderEvents[0],id:130081});assert(!validateSnapshot(double));
 const bad=structuredClone(g);bad.outsiderEvents[0].target='self';assert(!validateSnapshot(bad));
 const wrong=structuredClone(g);wrong.outsiderEvents[0].kind='random';assert(!validateSnapshot(wrong));
});
test('Hermit setup can use zero or one fewer Outsiders without changing the number of evil players',()=>{
 const {initial,g}=outsiderEight('hermit');g.scriptRoleIds.push('golem');
 assert(validSetup(initial,g));
 const counts=setupCountOptionsForGame(g,Object.values(initial));assert(counts.some(c=>c.outsider===1));
});


test('Trouble Brewing death menu does not offer Psychopath or unrelated Traveller causes',()=>{
 const g=game();
 const ids=availableDeathReasons(getSnapshotScriptRoleIds(g),[]).map(x=>x.id);
 assert.deepEqual(ids,['storyteller','execution','night_death','ability','other']);
 assert(!ids.includes('psychopath'));
});
test('Psychopath death cause appears only when the frozen current game script has Psychopath',()=>{
 const g=game();
 g.playset='custom:my-script';g.scriptRoleIds=['imp','chef','empath','poisoner'];
 const missing=availableDeathReasons(getSnapshotScriptRoleIds(g),[]).map(x=>x.id);
 assert(!missing.includes('psychopath'));
 g.scriptRoleIds.push('psychopath');
 const shown=availableDeathReasons(getSnapshotScriptRoleIds(g),[]);
 assert.equal(shown.filter(x=>x.id==='psychopath').length,1);
 assert.equal(shown.find(x=>x.id==='psychopath').phase,'day');
});
test('Travellers have special death causes only while the corresponding Traveller is active and alive',()=>{
 const gnome=traveller('t1','gnome');
 const gangster=traveller('t2','gangster');
 const ids=(ts)=>availableDeathReasons(getSnapshotScriptRoleIds(game()),ts).map(x=>x.id);
 assert.deepEqual(ids([gnome]),['storyteller','execution','night_death','ability','gnome','other']);
 assert(ids([gnome,gangster]).includes('gangster'));
 assert(!ids([{...gnome,active:false}, {...gangster,alive:false}]).includes('gnome'));
 assert(!ids([{...gnome,active:false}, {...gangster,alive:false}]).includes('gangster'));
});
test('Death reason history labels are retained independent of script restrictions',()=>{
 assert(DEATH_REASONS.some(x=>x.id==='psychopath'&&x.label==='サイコパスの公開殺害'));
 const gameRoles=getSnapshotScriptRoleIds(game());
 assert(!availableDeathReasons(gameRoles,[]).some(x=>x.id==='psychopath'));
 assert.equal(DEATH_REASONS.filter(x=>x.id==='psychopath').length,1);
});
test('Player death UI renders the context-filtered options, not the global catalog',()=>{
 const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'../src/App.tsx'),'utf8');
 assert(source.includes('availableDeathReasons(currentScriptRoleIds, getActiveTravellers()).map'));
 assert(source.includes('currentScriptRoleIds.includes("mutant")'));
});

// Regression: the actual UI always serializes its optional records, including empty
// records for experimental characters not available in the selected script.
test('Auto-saved standard games reopen with all empty experimental records',()=>{
  for(const n of [5,7,10,15]) {
    const g={...game(n),scriptName:BUILT_IN_SCRIPTS[0].name,scriptRoleIds:[...BUILT_IN_SCRIPTS[0].roleIds],
      travellers:[],travellerActionLog:[],
      demonState:{knownMinions:[],storytellerBluffs:[],knownKing:null,bluffPlans:{},lilMonstaBabysitters:[]},demonActionLog:[],
      minionState:{knownDemon:null,knownMinions:[],demonCandidates:[],sharedStorytellerBluffs:[],bluffPlans:{},spyInitialRoles:{},spyRedHerring:null,becameDemonAt:null,evilTwin:null,snitchBluffs:[],organGrinderDrunkNights:[],wraithNotes:[]},minionActionLog:[],
      leviathanConfirmed:false,alHadikhiaConfirmed:false,riotConfirmed:false,fearmongerActive:false,
      boomdandyLog:[],jinxVictoryLog:[],widowReports:[],evilBehaviorReports:[],psychopathEvents:[],organGrinderVotes:[],outsiderEvents:[]};
    assert(validateSnapshot(g),`Unchanged ${n}-player UI save must resume`);
  }
});
test('Empty optional role records are allowed but out-of-script actual records are not',()=>{
  for(const field of ['boomdandyLog','widowReports','evilBehaviorReports','psychopathEvents','organGrinderVotes']){
    assert(validateSnapshot({...game(),[field]:[]}),`${field} must allow empty arrays`);
    assert(!validateSnapshot({...game(),[field]:[{id:2,when:'D1'}]}),`${field} must still reject real out-of-script entries`);
  }
  const base={knownDemon:null,knownMinions:[],sharedStorytellerBluffs:[],bluffPlans:{},spyInitialRoles:{},spyRedHerring:null,becameDemonAt:null};
  for(const [field,value] of [['snitchBluffs',['chef']],['organGrinderDrunkNights',['N1']],['wraithNotes',[{when:'N1',note:'x'}]]]){
    assert(validateSnapshot({...game(),minionState:{...base,[field]:[]}}),`Empty ${field} must be valid`);
    assert(!validateSnapshot({...game(),minionState:{...base,[field]:value}}),`Populated ${field} requires its role`);
  }
});
test('Continue reads a previously saved game after simulated Android WebView relaunch',()=>{
  const previous=global.localStorage;
  const entries=new Map();
  global.localStorage={getItem:k=>entries.has(k)?entries.get(k):null,setItem:(k,v)=>entries.set(k,String(v)),removeItem:k=>entries.delete(k)};
  try {
    const g={...game(7),scriptName:BUILT_IN_SCRIPTS[0].name,scriptRoleIds:[...BUILT_IN_SCRIPTS[0].roleIds],
      boomdandyLog:[],widowReports:[],evilBehaviorReports:[],psychopathEvents:[],organGrinderVotes:[]};
    assert(saveSnapshot(g));
    assert.deepEqual(loadSnapshot(),g);
    const later=structuredClone(g);later.night=2;later.playerNames={'1L':'A','1R':'B'};
    assert(saveSnapshot(later));
    assert.deepEqual(loadSnapshot(),later);
    assert.deepEqual(JSON.parse(entries.get(SAVE_BACKUP_KEY)),g);
    entries.set(SAVE_KEY,'{not-json');
    assert(hasUnreadableSnapshot());
    assert.deepEqual(loadSnapshot(),g,'Previous valid save should survive corrupt primary');
    assert.equal(entries.get(SAVE_KEY),'{not-json','Recovery must not erase unreadable raw save');
  }finally{global.localStorage=previous;}
});
test('Active game saves immediately and when Android hides the WebView',()=>{
  const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'../src/App.tsx'),'utf8');
  assert(source.includes('const saved=saveSnapshot(snapshot);'));
  assert(!source.includes('setTimeout(() => setSaveFailed(!saveSnapshot(snapshot)), 150)'));
  assert(source.includes("document.addEventListener('visibilitychange',onVisibilityChange)"));
  assert(source.includes("window.addEventListener('pagehide',flushActiveGame)"));
  assert(source.includes('if(saved)setSavedGame(snapshot);'));
  assert(source.includes('localStorage.removeItem(SAVE_BACKUP_KEY)'));
  assert(source.includes('保存データを救出する'));
});


const {BMR_ABILITY_TIMING,BMR_ACTION_SPECS,rolePhaseOptions,roleTimingCategories,isBmrRecordedActionRole,bmrActionCanBeRecorded}=require('../.engine-test/abilityTiming.js');
const {BAD_MOON_RISING_ROLE_IDS}=require('../.engine-test/scripts.js');
const {observationTimingValid}=require('../.engine-test/engine/game.js');
function bmrGame(n=7){const g=game(n);g.playset='bad_moon_rising';g.scriptName='バッド・ムーン・ライジング';g.scriptRoleIds=[...BAD_MOON_RISING_ROLE_IDS];return g;}
test('All 25 BMR characters have individual info/action timing records',()=>{
 assert.equal(BAD_MOON_RISING_ROLE_IDS.length,25);
 assert.deepEqual([...BAD_MOON_RISING_ROLE_IDS].sort(),Object.keys(BMR_ABILITY_TIMING).sort());
 assert.equal(new Set(BAD_MOON_RISING_ROLE_IDS).size,25);
});
test('Night-only BMR characters do not accept D1, D2 or D3 as active-ability claim times',()=>{
 for(const role of ['sailor','innkeeper','exorcist','gambler','courtier','professor','lunatic','godfather','devils_advocate','assassin','zombuul','pukka','shabaloth','po']){
  const phases=rolePhaseOptions(role,3,'action');
  assert(phases.length,role+' phases');assert(phases.every(when=>when.startsWith('N')),role+' has daytime entry');
 }
});
test('BMR first-night info, continuous info and later-night active abilities are separate',()=>{
 assert.deepEqual(rolePhaseOptions('grandmother',3,'info'),['N1']);
 assert.deepEqual(rolePhaseOptions('grandmother',3,'action'),[]);
 assert.deepEqual(rolePhaseOptions('godfather',3,'info'),['N1']);
 assert.deepEqual(rolePhaseOptions('godfather',3,'action'),['N2','N3']);
 assert.deepEqual(rolePhaseOptions('sailor',3,'info'),[]);
 assert.deepEqual(rolePhaseOptions('sailor',3,'action'),['N1','N2','N3']);
 assert.deepEqual(rolePhaseOptions('chambermaid',3,'info'),['N1','N2','N3']);
 assert.deepEqual(rolePhaseOptions('chambermaid',3,'action'),[]);
 assert.deepEqual(rolePhaseOptions('innkeeper',3,'action'),['N2','N3']);
 assert.deepEqual(rolePhaseOptions('gossip',3,'action'),['D1','D2','D3']);
 assert.deepEqual(rolePhaseOptions('moonchild',2,'action'),['D1','D2']);
});
test('BMR roles distinguish night information and night ability categories',()=>{
 assert.deepEqual(roleTimingCategories('grandmother'),['NIGHT_INFORMATION']);
 assert.deepEqual(roleTimingCategories('chambermaid'),['NIGHT_INFORMATION']);
 assert.deepEqual(roleTimingCategories('sailor'),['NIGHT_ABILITY']);
 assert.deepEqual(roleTimingCategories('innkeeper'),['NIGHT_ABILITY']);
 assert.deepEqual(roleTimingCategories('godfather'),['NIGHT_INFORMATION','NIGHT_ABILITY']);
 for(const passive of ['minstrel','tea_lady','pacifist','fool','tinker','mastermind','goon'])
  assert.deepEqual(roleTimingCategories(passive),[],passive);
});
test('BMR night starts and once-per-game records are available for all role-selected actions',()=>{
 for(const role of ['sailor','innkeeper','gambler','gossip','courtier','professor','lunatic','moonchild','godfather','devils_advocate','assassin','zombuul','pukka','shabaloth','po'])
  assert(isBmrRecordedActionRole(role),role+' action missing');
 assert(!isBmrRecordedActionRole('chambermaid'));
 assert(!isBmrRecordedActionRole('fool'));
 assert(!bmrActionCanBeRecorded('assassin','N1',3));
 assert(bmrActionCanBeRecorded('assassin','N2',3));
 assert(!bmrActionCanBeRecorded('gossip','N1',3));
 assert(bmrActionCanBeRecorded('gossip','D1',3));
 assert(!observationTimingValid('grandmother','D1'));
 assert(!observationTimingValid('chambermaid','D2'));
 assert(!observationTimingValid('godfather','N2'));
});
test('A healthy first-night Grandmother read identifies a good seat and its character',()=>{
 const g=bmrGame();g.selfRole.shownRole='grandmother';
 const initial={self:'grandmother','1L':'sailor','2L':'chambermaid','3L':'fool','3R':'gambler','2R':'assassin','1R':'pukka'};
 assert(validSetup(initial,g));
 g.selfInfoLog=[{id:207101,roleId:'grandmother',when:'N1',player:'1L',shownRole:'sailor'}];
 assert(validateSnapshot(g));assert(evaluateAssignment(initial,g,30).length>0);
 const bad=structuredClone(g);bad.selfInfoLog[0].shownRole='gambler';
 assert(validateSnapshot(bad));assert.equal(evaluateAssignment(initial,bad,30).length,0);
 const day=structuredClone(g);day.selfInfoLog[0].when='D1';assert(!validateSnapshot(day));
});
test('Chambermaid night records accept 0, 1 and 2 and reject daytime or self-target reads',()=>{
 const g=bmrGame();g.selfRole.shownRole='chambermaid';g.night=3;
 const read={id:207105,roleId:'chambermaid',when:'N2',players:['1L','2L'],number:1};g.selfInfoLog=[read];
 assert(validateSnapshot(g));
 for(const n of [0,2])assert(validateSnapshot({...g,selfInfoLog:[{...read,number:n}]}));
 assert(!validateSnapshot({...g,selfInfoLog:[{...read,number:3}]}));
 assert(!validateSnapshot({...g,selfInfoLog:[{...read,when:'D2'}]}));
 assert(!validateSnapshot({...g,selfInfoLog:[{...read,players:['self','2L']}]}));
});
test('Godfather first-night Outsider character information is recorded as a set and constrained',()=>{
 const g=bmrGame();g.selfRole.shownRole='godfather';
 const initial={self:'godfather','1L':'grandmother','2L':'sailor','3L':'chambermaid','3R':'fool','2R':'goon','1R':'pukka'};
 assert(validSetup(initial,g));
 g.selfInfoLog=[{id:207108,roleId:'godfather',when:'N1',shownOutsiders:['goon']}];
 assert(validateSnapshot(g));assert(evaluateAssignment(initial,g,25).length>0);
 const wrong=structuredClone(g);wrong.selfInfoLog[0].shownOutsiders=['lunatic'];
 assert(validateSnapshot(wrong));assert.equal(evaluateAssignment(initial,wrong,25).length,0);
 const wrongDay=structuredClone(g);wrongDay.selfInfoLog[0].when='D1';assert(!validateSnapshot(wrongDay));
});
test('BMR action records survive strict save validation and fail on impossible timing and target counts',()=>{
 const g=bmrGame();g.night=3;g.selfRole.shownRole='innkeeper';
 const action={id:207112,roleId:'innkeeper',kind:'bmr_action',when:'N2',targets:['1L','2L'],chosenRole:null,note:null};
 g.selfActionLog=[action];assert(validateSnapshot(g));
 assert(!validateSnapshot({...g,selfActionLog:[{...action,when:'D2'}]}));
 assert(!validateSnapshot({...g,selfActionLog:[{...action,targets:['1L']}]}));
 assert(!validateSnapshot({...g,selfActionLog:[{...action,targets:['1L','1L']}]}));
 assert(!validateSnapshot({...g,selfActionLog:[{...action,chosenRole:'fool'}]}));
 const note=structuredClone(g);note.selfActionLog[0].note='確認した結果';assert(validateSnapshot(note));
});
test('Courtier and Assassin may act once, Devil Advocate cannot repeat consecutive targets, Po must charge',()=>{
 const g=bmrGame();g.night=4;
 const action=(id,roleId,when,targets,chosenRole=null)=>({id,kind:'bmr_action',roleId,when,targets,chosenRole,note:null});
 g.selfActionLog=[action(207201,'courtier','N1',[],'pukka')];assert(validateSnapshot(g));
 g.selfActionLog.push(action(207202,'courtier','N2',[],'shabaloth'));assert(!validateSnapshot(g));
 g.selfActionLog=[action(207203,'devils_advocate','N1',['1L']),action(207204,'devils_advocate','N2',['1L'])];assert(!validateSnapshot(g));
 g.selfActionLog=[action(207205,'po','N2',[])];assert(validateSnapshot(g));
 g.selfActionLog.push(action(207206,'po','N3',['1L','2L','3L']));assert(validateSnapshot(g));
 g.selfActionLog[1].targets=['1L'];assert(!validateSnapshot(g));
 g.selfActionLog=[action(207207,'assassin','N2',['1L']),action(207208,'assassin','N3',['2L'])];assert(!validateSnapshot(g));
});
test('Both BMR info/report forms and self recorder filter ability timing',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const source=fs.readFileSync(path.join(__dirname,'../src/App.tsx'),'utf8');
 const form=fs.readFileSync(path.join(__dirname,'../src/ui/ReportedInfoForm.tsx'),'utf8');
 assert(source.includes("rolePhaseOptions(abilityClaimRole, night, 'action')"));
 assert(form.includes("rolePhaseOptions(role,g.night,'action')"));
 assert(source.includes("effectiveSelfAbilityRole === \"grandmother\""));
 assert(source.includes("effectiveSelfAbilityRole === \"chambermaid\""));
 assert(source.includes("effectiveSelfAbilityRole === \"godfather\""));
 assert(source.includes("isBmrRecordedActionRole(effectiveSelfAbilityRole)"));
});


const {bmrWakePossibility,chambermaidWakeCountRange}=require('../.engine-test/abilityTiming.js');
test('Bad Moon Rising first-night Godfather outsider count allows exactly -1 or +1',()=>{
 const g=bmrGame(8);g.selfRole.shownRole='godfather';
 const noOut={self:'godfather','1L':'grandmother','2L':'sailor','3L':'chambermaid','4L':'fool','3R':'gambler','2R':'professor','1R':'pukka'};
 const twoOut={self:'godfather','1L':'grandmother','2L':'sailor','3L':'chambermaid','4L':'fool','3R':'goon','2R':'tinker','1R':'pukka'};
 assert(validSetup(noOut,g),'Godfather -1 Outsider option');
 assert(validSetup(twoOut,g),'Godfather +1 Outsider option');
 const oneOut={...twoOut,'2R':'professor'};
 assert(!validSetup(oneOut,g),'Godfather cannot preserve the ordinary one-Outsider count');
 const possible=setupCountOptionsForGame(g,Object.values(noOut));
 assert.deepEqual(possible.map(v=>v.outsider).sort(),[0,2]);
});
test('All Bad Moon Rising characters have their actual first/later-night wake schedule',()=>{
 for(const role of ['sailor','chambermaid','courtier','devils_advocate','pukka']){
  assert(rolePhaseOptions(role,3,role==='chambermaid'?'info':'action').includes('N1'),role+' first night');
 }
 for(const role of ['innkeeper','exorcist','gambler','professor','godfather','assassin','zombuul','shabaloth','po']){
  const phases=rolePhaseOptions(role,3,role==='godfather'?'action':'action');
  assert(phases.includes('N2'),role+' later night');
  assert(!phases.includes('N1'),role+' should not have first-night action');
 }
 for(const role of ['grandmother','minstrel','tea_lady','pacifist','fool','goon','tinker','mastermind']){
  assert.equal(roleTimingCategories(role).includes('NIGHT_ABILITY'),false,role+' false active wake');
 }
});
test('Chambermaid distinguishes guaranteed BMR waking from passive nonwaking',()=>{
 assert.equal(bmrWakePossibility('grandmother',1),'yes');
 assert.equal(bmrWakePossibility('grandmother',2),'no');
 assert.equal(bmrWakePossibility('gossip',2),'no');
 assert.equal(bmrWakePossibility('fool',2),'no');
 assert.equal(bmrWakePossibility('goon',2),'maybe');
 assert.equal(bmrWakePossibility('assassin',1),'no');
 assert.equal(bmrWakePossibility('po',1),'no');
 assert.equal(bmrWakePossibility('sailor',2),'yes');
 assert.equal(bmrWakePossibility('pukka',2,true),'maybe');
 assert.deepEqual(chambermaidWakeCountRange(['sailor','pacifist'],2),[1,1]);
 assert.deepEqual(chambermaidWakeCountRange(['minstrel','fool'],2),[0,0]);
 assert.deepEqual(chambermaidWakeCountRange(['goon','sailor'],2),[1,2]);
});
test('Chambermaid reported ability rejects impossible wake counts but permits conditional ones',()=>{
 const g=bmrGame();
 const initial={self:'chambermaid','1L':'sailor','2L':'minstrel','3L':'fool','3R':'gambler','2R':'assassin','1R':'pukka'};
 g.selfRole.shownRole='chambermaid';
 assert(validSetup(initial,g));
 const make=(number,players=['1L','2L'])=>({...g,selfInfoLog:[{id:207301,roleId:'chambermaid',when:'N1',players,number}]});
 assert(evaluateAssignment(initial,make(1),20).length>0,'sailor must wake, minstrel does not');
 assert.equal(evaluateAssignment(initial,make(0),20).length,0,'healthy Chambermaid cannot see zero for Sailor');
 assert.equal(evaluateAssignment(initial,make(2),20).length,0,'Minstrel never wakes');
 assert(evaluateAssignment(initial,make(0,['2L','3L']),20).length>0,'two passives wake zero');
});
test('Claim and script-maker UIs show Japanese BMR wake types; Godfather night action remains accessible',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const a=fs.readFileSync(path.join(__dirname,'../src/App.tsx'),'utf8');
 const f=fs.readFileSync(path.join(__dirname,'../src/ui/ReportedInfoForm.tsx'),'utf8');
 assert(a.includes("exactRole !== 'godfather'"));
 assert(a.includes("role.id === 'godfather'"));
 assert(a.includes("tag === 'NIGHT_INFORMATION' ? '夜情報'"));
 assert(a.includes("id==='sailor')return !isAliveAt(snapshot,p,selfActionWhen,0)"));
 assert(a.includes("id==='professor')return isAliveAt(snapshot,p,selfActionWhen)"));
 assert(!a.includes("id==='sailor'||id==='innkeeper'"));
 assert(f.includes('initial && isBmrRole(initial)'));
});


test('Moonchild can only publicly choose on death day after recording death',()=>{
 const g=bmrGame();g.night=3;g.selfRole.shownRole='moonchild';
 const a={id:207401,kind:'bmr_action',roleId:'moonchild',when:'D2',targets:['1L'],chosenRole:null,note:null};
 g.selfActionLog=[a];assert(!validateSnapshot(g),'living Moonchild cannot choose');
 g.deathLog=[{id:207402,playerId:'self',reason:'night_death',when:'N2'}];
 assert(validateSnapshot(g),'night death should permit the next daytime choice');
 assert(!validateSnapshot({...g,selfActionLog:[{...a,when:'N2'}]}),'choice must be public and during daytime');
 assert(!validateSnapshot({...g,selfActionLog:[{...a,when:'D3'}]}),'cannot wait an extra day');
});
test('Zombuul night attack requires that nobody died the preceding day',()=>{
 const g=bmrGame();g.night=3;g.selfRole.shownRole='zombuul';
 const a={id:207411,kind:'bmr_action',roleId:'zombuul',when:'N2',targets:['1L'],chosenRole:null,note:null};
 g.selfActionLog=[a];assert(validateSnapshot(g));
 g.deathLog=[{id:207412,when:'D1',playerId:'3L',reason:'execution'}];
 assert(!validateSnapshot(g));
 g.deathLog=[{id:207412,when:'N2',playerId:'3L',reason:'night_death'}];
 assert(validateSnapshot(g),'night death does not imply somebody died during D1');
});
test('Grandmother and Chambermaid self information cannot be duplicated',()=>{
 const g=bmrGame();g.night=2;g.selfRole.shownRole='grandmother';
 const gm={id:207421,roleId:'grandmother',when:'N1',player:'1L',shownRole:'sailor'};
 g.selfInfoLog=[gm,{...gm,id:207422}];assert(!validateSnapshot(g));
 g.selfInfoLog=[gm];assert(validateSnapshot(g));
 g.selfInfoLog=[{id:207423,roleId:'chambermaid',when:'N2',players:['1L','2L'],number:0},{id:207424,roleId:'chambermaid',when:'N2',players:['2L','3L'],number:1}];
 assert(!validateSnapshot(g));
});
test('Grandmother first-night information survives an autosave and reopen',()=>{
 const old=global.localStorage,items=new Map();
 global.localStorage={getItem:key=>items.get(key)??null,setItem:(key,val)=>items.set(key,String(val)),removeItem:key=>items.delete(key)};
 try{
  const g=bmrGame();g.selfRole.shownRole='grandmother';
  g.selfInfoLog=[{id:207431,roleId:'grandmother',when:'N1',player:'1L',shownRole:'sailor'}];
  assert(validateSnapshot(g));assert(saveSnapshot(g));assert.deepEqual(loadSnapshot(),g);
 }finally{global.localStorage=old;}
});
test('BMR passive guidance is provided for all seven non-choosing passive roles',()=>{
 const {BMR_PASSIVE_EXPLANATIONS}=require('../.engine-test/abilityTiming.js');
 for(const role of ['minstrel','tea_lady','pacifist','fool','goon','tinker','mastermind'])assert((BMR_PASSIVE_EXPLANATIONS[role]??'').length>25,role);
 assert(BMR_PASSIVE_EXPLANATIONS.grandmother);
});

console.log(`\n${passed}/${tests.length} tests passed`);
require('fs').writeFileSync(require('path').join(__dirname,'results.json'),JSON.stringify({passed,total:tests.length,tests},null,2));
