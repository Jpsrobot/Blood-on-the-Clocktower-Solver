const { test } = require('../harness.cjs');
const { assert, setupCountOptionsForGame, validSetup, evaluateAssignment, validateSnapshot, loadSnapshot, saveSnapshot, game, claim, BMR_ABILITY_TIMING, rolePhaseOptions, roleTimingCategories, isBmrRecordedActionRole, bmrActionCanBeRecorded, BAD_MOON_RISING_ROLE_IDS, observationTimingValid, bmrGame, bmrWakePossibility, chambermaidWakeCountRange } = require('../fixtures.cjs');

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
 const source=fs.readFileSync(path.join(require('node:path').resolve(__dirname, '..'),'../src/App.tsx'),'utf8');
 const form=fs.readFileSync(path.join(require('node:path').resolve(__dirname, '..'),'../src/ui/ReportedInfoForm.tsx'),'utf8');
 assert(source.includes("rolePhaseOptions(abilityClaimRole, night, 'action')"));
 assert(form.includes("rolePhaseOptions(role,g.night,'action')"));
 assert(source.includes("effectiveSelfAbilityRole === \"grandmother\""));
 assert(source.includes("effectiveSelfAbilityRole === \"chambermaid\""));
 assert(source.includes("effectiveSelfAbilityRole === \"godfather\""));
 assert(source.includes("isBmrRecordedActionRole(effectiveSelfAbilityRole)"));
});

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
 const a=fs.readFileSync(path.join(require('node:path').resolve(__dirname, '..'),'../src/App.tsx'),'utf8');
 const f=fs.readFileSync(path.join(require('node:path').resolve(__dirname, '..'),'../src/ui/ReportedInfoForm.tsx'),'utf8');
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
 const {BMR_PASSIVE_EXPLANATIONS}=require('../../.engine-test/abilityTiming.js');
 for(const role of ['minstrel','tea_lady','pacifist','fool','goon','tinker','mastermind'])assert((BMR_PASSIVE_EXPLANATIONS[role]??'').length>25,role);
 assert(BMR_PASSIVE_EXPLANATIONS.grandmother);
});
