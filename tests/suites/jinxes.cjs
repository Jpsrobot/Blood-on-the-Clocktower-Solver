const { test } = require('../harness.cjs');
const { assert, validSetup, evaluateAssignment, drawAssignment, rng, validateSnapshot, ROLES, JINXES, OFFICIAL_JINXES, scriptJinxes, roleJinxes, hasJinx, jinxLabel, kingInformationAvailable, ALL_CORE_ROLE_IDS, BUILT_IN_SCRIPTS, game, claim, customGame } = require('../fixtures.cjs');

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
 const {createCustomScript}=require('../../.engine-test/scripts.js');
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
