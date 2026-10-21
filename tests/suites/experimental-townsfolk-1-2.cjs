const { test } = require('../harness.cjs');
const { assert, setupCountsForGame, setupCountOptionsForGame, amnesiacAbilityRole, bansheeAwakenedAt, rebuildStatus, evaluateAssignment, travellerVoteWeight, validateSnapshot, ROLES, ALL_CORE_ROLE_IDS, BUILT_IN_SCRIPTS, game } = require('../fixtures.cjs');

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
