const { test } = require('../harness.cjs');
const { assert, DEATH_REASONS, availableDeathReasons, getSnapshotScriptRoleIds, game, context, traveller } = require('../fixtures.cjs');

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
 const source=require('node:fs').readFileSync(require('node:path').join(require('node:path').resolve(__dirname, '..'),'../src/App.tsx'),'utf8');
 assert(source.includes('availableDeathReasons(currentScriptRoleIds, getActiveTravellers()).map'));
 assert(source.includes('currentScriptRoleIds.includes("mutant")'));
});
