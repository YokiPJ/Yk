/** Execute the actual encounter director against the real quest engine. */
import assert from 'node:assert/strict';
import {createPart2Director} from '../src/content/part2Director.js';
import {PART2_QUESTS,PART2_SPAWNS} from '../src/content/part2.js';
import {createQuestSystem} from '../src/quest/questSystem.js';

const [guards,sentinel]=PART2_SPAWNS;
function fixture(savedProgress={v:1,q:{},items:{},flags:{}}){
  const Q=createQuestSystem(PART2_QUESTS,{level:()=>30});Q.restore(JSON.stringify(savedProgress));
  const state={flow:'PLAYING',ents:[],enemyRespawns:[],defeatedBosses:new Set()};
  const calls=[];let snapshots=0;
  const quests={serialize(){snapshots++;return Q.serialize();}};
  const spawnEnemy=(kind,zone)=>{const enemy={kind:'m',k:kind,zd:zone,hp:20,bossId:zone.bossId||null};calls.push({kind,zone});state.ents.push(enemy);return enemy;};
  const director=createPart2Director({state,quests,spawnEnemy});
  return {Q,state,calls,director,get snapshots(){return snapshots;}};
}
const progress=(id,n=0,step=0)=>({v:1,q:{[id]:{s:'active',step,n}},items:{},flags:{}});

const closed=fixture();closed.director.tick(.1);
assert.equal(closed.calls.length,0,'locked encounters never spawn ambient enemies');
assert.equal(closed.snapshots,1);

const f=fixture(progress('p2_vigilia'));f.director.tick(.1);
assert.equal(f.calls.length,2);assert.ok(f.state.ents.every(enemy=>enemy.zd===guards));
const sampled=f.snapshots;
f.director.tick(.25);f.director.tick(.25);
assert.equal(f.snapshots,sampled,'director does not serialize quests every frame');
f.director.tick(.5);assert.equal(f.snapshots,sampled+1);
assert.equal(f.calls.length,2,'a complete living encounter is never duplicated');
f.director.reset();f.director.tick(.01);assert.equal(f.calls.length,2,'reset permits a prompt check without duplicating actors');

// Killing one guard through the actual engine persists a demand for one guard.
f.Q.emit('kill',{k:'skeleton',region:'eco'});f.state.ents.splice(0,1);
const afterFirst=f.Q.serialize();f.director.tick(1);
assert.equal(f.calls.length,2,'remaining living guard already satisfies the remaining objective');
const loaded=fixture(JSON.parse(afterFirst));loaded.director.tick(.1);
assert.equal(loaded.calls.length,1,'reload without living actors recreates only the one missing guard');
loaded.director.tick(1);assert.equal(loaded.calls.length,1);
loaded.Q.emit('kill',{k:'skeleton',region:'eco'});loaded.state.ents.length=0;
loaded.director.tick(1);assert.equal(loaded.calls.length,1,'finished kill stage cannot replenish guard kills');

const pending=fixture(progress('p2_vigilia'));
pending.state.enemyRespawns.push({kind:guards.k,zone:guards,due:2});
pending.director.tick(.1);assert.equal(pending.calls.length,1,'queued actors are included in encounter demand');

const paused=fixture(progress('p2_vigilia'));
for(const flow of ['BOOT','TITLE','CHARACTER_CREATION','PAUSED','DIALOGUE','CUTSCENE','DEAD']){
  paused.state.flow=flow;paused.director.tick(10);
}
assert.equal(paused.calls.length,0);assert.equal(paused.snapshots,0,'non-playing modes do no director work');
paused.state.flow='PLAYING';
for(const dt of [0,-1,NaN,undefined])paused.director.tick(dt);
assert.equal(paused.calls.length,0);
paused.director.tick(.1);assert.equal(paused.calls.length,2);

const boss=fixture(progress('p2_ultima_voz'));boss.director.tick(.1);
assert.equal(boss.calls.length,1);assert.equal(boss.state.ents[0].zd,sentinel);
boss.director.tick(1);assert.equal(boss.calls.length,1);
const historical=fixture(progress('p2_ultima_voz'));
historical.state.defeatedBosses.add('sentinela_eco');historical.director.tick(.1);
assert.equal(historical.calls.length,0,'historical boss victories block recreation before quest reconciliation');
const returned=fixture(progress('p2_ultima_voz',0,1));returned.director.tick(.1);
assert.equal(returned.calls.length,0,'a victory awaiting return dialogue never recreates its boss');

let attempts=0;
const failState={flow:'PLAYING',ents:[],enemyRespawns:[],defeatedBosses:new Set()};
const failDirector=createPart2Director({state:failState,quests:{serialize:()=>JSON.stringify(progress('p2_vigilia'))},spawnEnemy(){attempts++;return null;}});
failDirector.tick(.1);assert.equal(attempts,1,'failed spawning stops the current loop instead of trying every demanded actor');
failDirector.tick(.2);assert.equal(attempts,1);failDirector.tick(.8);assert.equal(attempts,2,'retry is throttled to a later director check');
console.log('PASS Part II director: actual quest gate, one-second throttle, no duplicate actors, remaining kill progress after reload, queued spawns, boss persistence and pause.');
