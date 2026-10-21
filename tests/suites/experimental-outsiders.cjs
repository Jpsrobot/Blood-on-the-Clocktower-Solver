const { test } = require('../harness.cjs');
const { assert, seats, setupCountOptionsForGame, validSetup, evaluateAssignment, minionPatternLogBonus, validateSnapshot, ROLES, ALL_CORE_ROLE_IDS, BUILT_IN_SCRIPTS, outsiderEight } = require('../fixtures.cjs');

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
