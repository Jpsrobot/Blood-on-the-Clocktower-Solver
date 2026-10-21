const { test } = require('../harness.cjs');
const { assert, seats, setupCounts, rebuildStatus, seatingOrderAt, evaluateAssignment, infoMatches, estimateTravellerAlignments, travellerCanVote, travellerVoteWeight, travellerVoteTally, baristaEffectFor, boneCollectorRestored, deviantsFunnyToday, matronSwapCount, ALL_TRAVELLER_IDS, BMR_TRAVELLER_IDS, SNV_TRAVELLER_IDS, EXPERIMENTAL_TRAVELLER_IDS, TRAVELLERS, validateSnapshot, ROLES, game, context, traveller, base } = require('../fixtures.cjs');

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
