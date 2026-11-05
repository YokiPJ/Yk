import assert from 'node:assert/strict';
import { gameState } from '../src/core/gameState.js';
import { SCENES, BOSS_TRIGGERS } from '../src/cutscene/scenes.js';
import { createRunner, stepRunner, pose, advance } from '../src/cutscene/cutsceneTimeline.js';

gameState.getHeightAt = (x,z)=> 0.04 * x + 0.025 * z;
gameState.P = {x:7,z:8,mesh:{position:{y:0.5}}};
gameState.N = {x:17,z:9,mesh:{position:{y:0.3}}};
gameState.Y = {x:6,z:6,mesh:{position:{y:0.25}}};
gameState.LM = [{n:'Ponte Velha',x:35,z:15}];
gameState.ents = [
 {bossId:'troll_ancient',x:44,z:33,hp:300,name:'Troll Ancião',K:{level:14},mesh:{position:{y:0.6}}},
 {bossId:'orc_king',x:57,z:56,hp:500,name:'Rei dos Orcs',K:{level:20},mesh:{position:{y:0.8}}}
];
gameState.zoom = 1; gameState.yaw = 0;
const cases = [
 ['arrival'],['yoki'],['bridge'],['diary', null, true],['troll'],['orc'],
 ['troll_victory',{x:44,z:33}],['orc_victory',{x:57,z:56}]
];
for(const [id, ctx, insideHouse] of cases){
 gameState.insideHouse=Boolean(insideHouse);
 const scene = SCENES[id].build(ctx || undefined);
 assert(scene?.shots?.length >= 3, id+' scene build');
 for(const s of scene.shots){
  assert(Number.isFinite(s.dur) && s.dur>0,id+' duration');
  for (const key of ['a','b']) for(const c of ['p','l']) {
   const vals=s[key]?.[c];assert(vals?.length===3 && vals.every(Number.isFinite),`${id} ${key}.${c}`);
  }
 }
 const runner=createRunner(scene), out={p:[0,0,0],l:[0,0,0]};
 assert(pose(runner,out) && out.p.every(Number.isFinite),id+' timeline pose');
 for(let i=0;i<scene.shots.length;i++){if(runner.done)break;advance(runner)}
 assert(runner.done,id+' can skip/advance to end');
}
assert.equal(BOSS_TRIGGERS.length,2,'boss triggers preserved');
assert.equal(SCENES.troll.build()?.musicBossId,'troll_ancient');
assert.equal(SCENES.orc.build()?.musicBossId,'orc_king');
assert.equal(SCENES.yoki.build()?.shots.at(-1)?.b?.p?.length,3);
console.log('PASS: 8 cutscenes, 3D camera coordinates, cinematic timeline, 2 boss intros and victories');
