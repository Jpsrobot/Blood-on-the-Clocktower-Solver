const { test } = require('../harness.cjs');
const { assert, game, runSearch, ROLES, seats, analyzeEvidence, saveSnapshot, loadSnapshot } = require('../fixtures.cjs');
const { BUILT_IN_SCRIPTS, getSnapshotScriptRoleIds } = require('../../.engine-test/scripts.js');
const { loadSource } = require('../source-loader.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { AnalysisPanel, PlayerSummary } = loadSource('src/ui/ReasoningUI.tsx');
const options = { attempts: 300, seed: 71347, maxMillis: 10000, beamWidth: 3, worldLimit: 10000 };
const close = (a,b) => assert(Math.abs(a-b)<1e-9, `${a} != ${b}`);
function panel(g, r, extra = {}) {
  return renderToStaticMarkup(React.createElement(AnalysisPanel, { g, e: analyzeEvidence(g), player: null, onClose() {}, query: {result:r,status:'done',progress:{checked:0,unique:0},error:'',meta:false,rerun(){},setMeta(){}}, ...extra }));
}
function emptyResult(g) { return runSearch(g, {attempts:0}); }
for (const script of [...BUILT_IN_SCRIPTS, {id:'custom:all',roleIds:Object.keys(ROLES)}]) {
  test(`Every script Minion and Demon has a rendered initial-presence percentage: ${script.id}`, () => {
    const g=game(7);g.playset=script.id;g.scriptRoleIds=script.roleIds;
    const r=emptyResult(g);r.unique=1;r.effectiveWorlds=1;
    const html=panel(g,r);
    for(const role of getSnapshotScriptRoleIds(g).filter(id=>['minion','demon'].includes(ROLES[id].type))) {
      assert(html.includes(`${ROLES[role].name} <span class="metric-inline">初期配役: 0%</span>`), role);
    }
  });
}
test('Character presence displays real 0 and 100, and never fabricates values without a sample', () => {
  const g=game(7);g.playset='custom:presence';g.scriptRoleIds=['chef','empath','artist','clockmaker','dreamer','imp','poisoner','leviathan','al_hadikhia'];
  const r=emptyResult(g);r.unique=1;r.presence.imp=1;r.presence.leviathan=.25;
  let html=panel(g,r);assert(html.includes('初期配役: 100%'));assert(html.includes('初期配役: 0%'));assert(html.includes('初期配役: 25%'));
  for(const result of [null,emptyResult(g)]) {html=panel(g,result);assert(html.includes('初期配役: —'));assert(!html.includes('初期配役: 0%'));}
  assert(panel(g,emptyResult(g)).includes('候補が見つかりませんでした'));
  html=panel(g,null,{query:{result:null,status:'error',error:'worker failed',progress:{checked:0,unique:0}}});
  assert(html.includes('探索中にエラーが発生しました'));assert(!html.includes('初期配役: 0%'));
});
test('Player summary and analysis render all four Japanese metrics including zero', () => {
  const g=game();const r=emptyResult(g);r.unique=1;r.players.self={evil:.25,minion:1,demon:0,drunk:0,roles:{poisoner:1},poison:{}};
  const html=renderToStaticMarkup(React.createElement(PlayerSummary,{g,p:'self',r,e:analyzeEvidence(g),onOpen(){}}));
  assert(html.includes('悪陣営 25% / 手下 100% / デーモン 0% / 酔い 0%'));
  const analysis=panel(g,r,{player:'self'});
  for(const text of ['悪陣営<strong>25%','手下<strong>100%','デーモン<strong>0%','酔い<strong>0%','現在の役職'])assert(analysis.includes(text),text);
  const missing=renderToStaticMarkup(React.createElement(PlayerSummary,{g,p:'self',r:emptyResult(g),e:analyzeEvidence(g),onOpen(){}}));
  assert(missing.includes('手下 —'));assert(!missing.includes('手下 0%'));
});
test('All player character probabilities use the same normalized world weights as the solver', () => {
  const g=game();g.selfRole.shownRole='fortune_teller';
  const r=runSearch(g,options);assert(r.unique>0);close(r.worldWeights.reduce((a,b)=>a+b,0),1);
  assert(new Set(r.worldWeights.map(x=>x.toFixed(10))).size>1,'exercise unequal weights');
  for(const p of seats(g.playerCount))for(const [metric,predicate] of [
    ['evil',w=>w.currentAlignment[p]==='evil'],['minion',w=>ROLES[w.current[p]].type==='minion'],['demon',w=>ROLES[w.current[p]].type==='demon']
  ])close(r.players[p][metric],r.worlds.reduce((sum,w,i)=>sum+(predicate(w)?r.worldWeights[i]:0),0));
  for(const role of getSnapshotScriptRoleIds(g))close(r.presence[role]??0,r.worlds.reduce((sum,w,i)=>sum+(Object.values(w.initial).includes(role)?r.worldWeights[i]:0),0));
});
test('Pit-Hag good Minion and good Demon probabilities stay independent of evil alignment and initial presence', () => {
  for(const role of ['witch','vortox']) {
    const g=game(7);g.playset='custom:pit';g.night=2;g.scriptRoleIds=['clockmaker','dreamer','mathematician','flowergirl','town_crier','pit_hag','imp',role];g.selfRole.shownRole='pit_hag';
    g.minionState={knownDemon:{playerId:'1R',source:'minion_info'},knownMinions:[],sharedStorytellerBluffs:[],bluffPlans:{},spyInitialRoles:{},spyRedHerring:null,becameDemonAt:null};
    g.minionActionLog=[{id:9901,roleId:'pit_hag',kind:'transform',when:'N2',target:'2L',newRole:role,note:null}];
    const r=runSearch(g,options);assert(r.unique>0);
    const expected=r.worlds.reduce((sum,w,i)=>sum+(w.current['2L']===role?r.worldWeights[i]:0),0);
    assert(expected>0);close(r.players['2L'][role==='witch'?'minion':'demon'],expected);
    close(r.players['2L'].evil,0);close(r.players['2L'].roles[role],expected);
    assert(r.worlds.some(w=>!Object.values(w.initial).includes(role)&&w.current['2L']===role));
    if(role==='witch'){close(expected,1);close(r.presence.witch??0,0);}
  }
});
test('Snake Charmer results use current identity and independently swapped alignment', () => {
  const g=game(7);g.playset='custom:snake';g.scriptRoleIds=['snake_charmer','dreamer','mathematician','flowergirl','oracle','witch','vortox'];g.selfRole.shownRole='snake_charmer';
  g.selfActionLog=[{id:9902,roleId:'snake_charmer',when:'N1',target:'1R',swapped:true,newDemonRole:'vortox'}];
  const r=runSearch(g,options);assert(r.unique>0);close(r.players.self.demon,1);close(r.players.self.evil,1);close(r.players['1R'].demon,0);close(r.players['1R'].evil,0);close(r.players['1R'].roles.snake_charmer,1);close(r.presence.snake_charmer,1);
});
test('Fang Gu counts both dead former and living current Demon characters without forcing shares to sum to one', () => {
  const g=game(7);g.playset='custom:fang';g.scriptRoleIds=['fang_gu','clockmaker','dreamer','flowergirl','oracle','sweetheart','witch'];g.night=2;g.selfRole.shownRole='fang_gu';
  g.demonActionLog=[{id:9903,roleId:'fang_gu',when:'N2',target:'2R',note:null}];g.deathLog=[{id:9904,playerId:'self',when:'N2',reason:'night_death',sourceRoleId:'fang_gu'}];
  const r=runSearch(g,options);assert(r.unique>0);close(r.players.self.demon,1);close(r.players['2R'].demon,1);close(r.players['2R'].evil,1);close(r.presence.fang_gu,1);
});
test('Saved snapshot restoration recomputes shares and archives preserve new and legacy summaries', () => {
  const storage=require('../../.engine-test/storage.js');const g=game();const r=runSearch(g,options);
  const prev=global.localStorage;const entries=new Map();global.localStorage={getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,String(v)),removeItem:k=>entries.delete(k)};
  try {
    assert(saveSnapshot(g));const resumed=runSearch(loadSnapshot(),options);assert.deepEqual(resumed.players,r.players);
    const entry=storage.createGameLogEntry(g,r);assert.equal(entry.reasoning.playerShares.self.minion,r.players.self.minion);
    assert(storage.saveGameLogs([entry]));assert.equal(storage.loadGameLogs().length,1);
    for(const share of Object.values(entry.reasoning.playerShares))delete share.minion;
    assert(storage.saveGameLogs([entry]));assert.equal(storage.loadGameLogs().length,1);
  } finally {global.localStorage=prev;}
});

test('Worker messages transport actual Minion shares and preserve request IDs and errors', () => {
  const previous=global.self;const messages=[];global.self={postMessage:m=>messages.push(structuredClone(m))};
  try {
    loadSource('src/engine/solver.worker.ts');
    global.self.onmessage({data:{snapshot:game(),request:81,options:{...options,attempts:30}}});
    const result=messages.find(m=>m.type==='result');assert(result);assert.equal(result.request,81);assert(result.result.unique>0);
    for(const share of Object.values(result.result.players))assert(Number.isFinite(share.minion));
    messages.length=0;
    loadSource('src/engine/solver.worker.ts',{'./search':{runSearch(){throw new Error('test failure');}}});
    global.self.onmessage({data:{snapshot:game(),request:82}});
    assert.deepEqual(messages,[{type:'error',request:82,message:'test failure'}]);
  }finally{global.self=previous;}
});

// Exercise the real hook's effects and callbacks with controlled timers/Workers.
// This is not a browser or a React DOM lifecycle test.
function hookHarness(fn) {
  let cursor=0;const slots=[];let effects=[];const timers=new Map();let timerId=0;const workers=[];let throwWorker=false;
  const react={
    useState(initial){const index=cursor++;if(!slots[index])slots[index]={value:initial};return [slots[index].value,value=>{slots[index].value=typeof value==='function'?value(slots[index].value):value;}];},
    useRef(value){const index=cursor++;return slots[index]??(slots[index]={current:value});},
    useEffect(effect,deps){const index=cursor++;const old=slots[index];if(!old||deps.some((v,i)=>v!==old.deps[i])){effects.push(()=>{old?.cleanup?.();slots[index]={deps,cleanup:effect()};});}},
  };
  const old={Worker:global.Worker,setTimeout:global.setTimeout,clearTimeout:global.clearTimeout};
  global.Worker=class {constructor(){if(throwWorker)throw new Error('unavailable');workers.push(this);}postMessage(message){this.message=structuredClone(message);}terminate(){this.terminated=true;}};
  global.setTimeout=callback=>{timers.set(++timerId,callback);return timerId;};global.clearTimeout=id=>timers.delete(id);
  try {
    const {useReasoning}=loadSource('src/engine/useReasoning.ts',{react});
    const render=(snapshot,enabled=true)=>{cursor=0;const q=useReasoning(snapshot,enabled);const pending=effects;effects=[];pending.forEach(f=>f());return q;};
    fn({render,workers,flush(){const pending=[...timers.values()];timers.clear();pending.forEach(f=>f());},failConstruction(){throwWorker=true;}});
  }finally{for(const slot of slots)slot?.cleanup?.();Object.assign(global,old);}
}
test('React hook refreshes on snapshot changes, rejects stale callbacks, and supports deeper search and resume',()=>hookHarness(({render,workers,flush})=>{
  let g=game();render(g,false);flush();assert.equal(workers.length,0);
  render(g);flush();let worker=workers.at(-1);assert.equal(worker.message.snapshot.schemaVersion,2);
  const deliver=(w,value)=>w.onmessage({data:{type:'result',request:w.message.request,result:value}});
  const result=emptyResult(g);result.unique=1;result.players.self.minion=.75;
  deliver(worker,result);assert.equal(render(g).result.players.self.minion,.75);
  const updates=[
    {selfInfoLog:[{id:1,roleId:'chef',when:'N1',number:0}]},
    {deathLog:[{id:2,playerId:'1L',when:'D1',reason:'execution'}]},
    {revivalLog:[{id:3,playerId:'1L',when:'N2'}],night:2},
    {minionActionLog:[{id:4,roleId:'pit_hag',kind:'transform',when:'N2',target:'2L',newRole:'witch',note:null}]},
    {outsiderEvents:[{id:5,kind:'ogre_choice',playerId:'self',when:'N1',target:'1R'}]},
    {playset:'sects_and_violets',scriptRoleIds:BUILT_IN_SCRIPTS.find(s=>s.id==='sects_and_violets').roleIds},
  ];
  for(const update of updates){
    const old=worker;g={...g,...update};render(g);assert(old.terminated);flush();worker=workers.at(-1);
    assert.deepEqual(worker.message.snapshot,g);assert.equal(render(g).result,null);
    deliver(old,result);old.onerror({message:'late error'});assert.equal(render(g).result,null);assert.equal(render(g).status,'running');
    deliver(worker,result);assert.equal(render(g).result.players.self.minion,.75);
  }
  render(g).rerun(true);render(g);flush();worker=workers.at(-1);assert.equal(worker.message.options.attempts,12000);assert.equal(worker.message.options.beamWidth,5);
  worker.onmessage({data:{type:'progress',request:worker.message.request,checked:100,unique:10}});assert.deepEqual(render(g).progress,{checked:100,unique:10});
  deliver(worker,emptyResult(g));assert.equal(render(g).result.unique,0);
  render(g,false);deliver(worker,result);assert.equal(render(g,false).result,null);
  g=JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname,'../saves/snv.json'),'utf8'));
  render(g);flush();assert.deepEqual(workers.at(-1).message.snapshot,g);assert.equal(render(g).status,'running');
}));
test('Worker runtime, message and construction failures leave no fabricated or stale sample',()=>hookHarness(({render,workers,flush,failConstruction})=>{
  const g=game();render(g);flush();let w=workers.at(-1);
  w.onerror({message:'runtime failure'});assert.equal(render(g).status,'error');assert.equal(render(g).result,null);
  render(g).rerun();render(g);flush();w=workers.at(-1);
  w.onmessage({data:{type:'error',request:w.message.request,message:'solver failure'}});assert.equal(render(g).error,'solver failure');assert.equal(render(g).result,null);
  failConstruction();render(g).rerun();render(g);flush();assert.equal(render(g).status,'error');assert.equal(render(g).result,null);
}));


test('An evil Townsfolk after Pit-Hag transformation is not counted as a Minion', () => {
  const g=game(7);g.playset='custom:evil-townsfolk';g.night=2;g.selfRole.shownRole='pit_hag';
  g.scriptRoleIds=['clockmaker','dreamer','mathematician','flowergirl','town_crier','chef','pit_hag','imp'];
  g.minionActionLog=[{id:9905,roleId:'pit_hag',kind:'transform',when:'N2',target:'self',newRole:'chef',note:null}];
  const r=runSearch(g,options);assert(r.unique>0);close(r.players.self.evil,1);close(r.players.self.demon,0);
  assert(r.players.self.roles.chef>0);assert(r.players.self.minion<1);
  close(r.players.self.minion+r.players.self.roles.chef,1);
});
