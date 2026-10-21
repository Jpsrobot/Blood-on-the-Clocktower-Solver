const { test } = require('../harness.cjs');
const { assert, validSetup, TRAVELLERS, ROLES, ALL_CORE_ROLE_IDS, getSnapshotScriptRoleIds, game, customGame } = require('../fixtures.cjs');

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

test('Only Choirboy and Huntsman add another character to a script',()=>{
 const {createCustomScript}=require('../../.engine-test/scripts.js');
 const expected={choirboy:'king',huntsman:'damsel'};
 for(const id of ALL_CORE_ROLE_IDS){
   const script=createCustomScript('dependency check',[id]);
   assert.deepEqual(script.roleIds,[id,...(expected[id]?[expected[id]]:[])],`${id} unexpectedly adds or loses a character`);
 }
});

test('Old saved scripts normalize exactly the two official addition dependencies',()=>{
 const {getSnapshotScriptRoleIds}=require('../../.engine-test/scripts.js');
 const expected={choirboy:'king',huntsman:'damsel'};
 for(const id of ALL_CORE_ROLE_IDS){
   const g=game();g.playset='custom:dependency-audit';g.scriptRoleIds=[id];
   assert.deepEqual(getSnapshotScriptRoleIds(g),[id,...(expected[id]?[expected[id]]:[])],`${id}: incorrect snapshot addition`);
 }
 const g=game();g.playset='custom:dependency-audit';g.scriptRoleIds=['choirboy','huntsman'];
 assert.deepEqual(getSnapshotScriptRoleIds(g),['choirboy','huntsman','king','damsel']);
});

test('King and Damsel do not require Choirboy and Huntsman respectively',()=>{
 const {createCustomScript}=require('../../.engine-test/scripts.js');
 assert.deepEqual(createCustomScript('king only',['king']).roleIds,['king']);
 assert.deepEqual(createCustomScript('damsel only',['damsel']).roleIds,['damsel']);
 const kingRoles={self:'king','1L':'chef','2L':'empath','2R':'spy','1R':'imp'};
 const kg=customGame(kingRoles);kg.selfRole.shownRole='king';
 assert(validSetup(kingRoles,kg),'King may be in play without Choirboy');
 const damselRoles={self:'damsel','1L':'saint','2L':'chef','2R':'baron','1R':'imp'};
 const dg=customGame(damselRoles);dg.selfRole.shownRole='damsel';
 assert(validSetup(damselRoles,dg),'Damsel may be in play without Huntsman');
});
