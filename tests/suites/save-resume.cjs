const { test } = require('../harness.cjs');
const { assert, validateSnapshot, loadSnapshot, saveSnapshot, hasUnreadableSnapshot, SAVE_KEY, SAVE_BACKUP_KEY, BUILT_IN_SCRIPTS, game, base } = require('../fixtures.cjs');

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
  const source=require('node:fs').readFileSync(require('node:path').join(require('node:path').resolve(__dirname, '..'),'../src/App.tsx'),'utf8');
  assert(source.includes('const saved=saveSnapshot(snapshot);'));
  assert(!source.includes('setTimeout(() => setSaveFailed(!saveSnapshot(snapshot)), 150)'));
  assert(source.includes("document.addEventListener('visibilitychange',onVisibilityChange)"));
  assert(source.includes("window.addEventListener('pagehide',flushActiveGame)"));
  assert(source.includes('if(saved)setSavedGame(snapshot);'));
  assert(source.includes('localStorage.removeItem(SAVE_BACKUP_KEY)'));
  assert(source.includes('保存データを救出する'));
});
