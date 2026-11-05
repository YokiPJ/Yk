import assert from 'node:assert/strict';
import {deriveBossEncounter} from '../src/ui/hudData.js';
const P={x:10,z:10,tx:10,tz:10,hp:96};
const boss={isBoss:true,name:'Rei dos Orcs',x:11,z:10,tx:11,tz:10,hp:50,max:200,cd:.4,st:{}};
const state={P,flow:'PLAYING',ents:[boss],ZN:[]};
const original=JSON.stringify(state);
assert.deepEqual(deriveBossEncounter(state),{name:'Rei dos Orcs',hp:50,max:200,ratio:.25,imminent:true});
assert.equal(JSON.stringify(state),original,'encounter presentation never modifies targeting/combat');
for(const flow of ['TITLE','PAUSED','CHARACTER_CREATION','DIALOGUE','CUTSCENE'])assert.equal(deriveBossEncounter({...state,flow}),null);
for(const flag of ['insideHouse','cutsceneActive','dialogueOpen','arsenalOpen','pauseRequested'])assert.equal(deriveBossEncounter({...state,[flag]:true}),null);
for(const patch of [{cd:.5},{st:{stun:1}},{x:11.4},{tx:12},{hp:0}]){
  const encounter=deriveBossEncounter({...state,ents:[{...boss,...patch}]});
  assert.ok(!encounter?.imminent,'telegraph follows actual cooldown, tile range and stationary condition');
}
const ZN=[];ZN[11]=[];ZN[11][10]=0;
assert.equal(deriveBossEncounter({...state,ZN}).imminent,false,'safe zone prevents strike warning');
assert.equal(deriveBossEncounter({...state,ents:[{...boss,x:60}]}),null);
console.log('PASS boss HUD: real HP, imminent strike conditions, no targeting mutation, safe-zone and lifecycle visibility.');
