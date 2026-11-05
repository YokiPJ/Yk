import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { clearBossView } from '../src/cutscene/cameraOcclusion.js';
import { gameState } from '../src/core/gameState.js';
import { SCENES } from '../src/cutscene/scenes.js';
const read = s => fs.readFileSync(new URL('../'+s,import.meta.url),'utf8');
const world = read('src/world/world.js');
const fragment = world.slice(world.indexOf('// Seeded random for reproducible world'),world.indexOf('/**\n * Build Three.js meshes for the world')).replaceAll('export const ','const ').replaceAll('export function ','function ');
const state = {G:[],ZN:[],B:[],OB:[],CLR:[],HO:[],CH:[],LM:[],BRG:[],HS:[],ents:[],P:null,W:96};
vm.runInNewContext(fragment+'\ngenerateWorld();',{CONFIG:{WORLD_SIZE:96},gameState:state,console});
assert.equal(state.BRG.length,4);
for (const b of state.BRG) {
  const cz=Math.round((b.z0+b.z1)/2);
  for (let x=b.x0;x<=b.x1;x++) {
    assert.equal(state.B[x][cz],0,'center bridge deck is traversable');
    assert.equal(state.RC[x*96+cz],1,'bridge reachable from village');
    for(const z of [b.z0,b.z1]) if (state.G[x][z]===4) assert.equal(state.B[x][z],1,'outer bridge deck edge blocked');
  }
}
// Extract the production height function, rather than copying its formula.
const start=world.indexOf('export function getHeightAt('),end=world.indexOf('/**\n * 8-directional movement',start);
const fun=world.slice(start,end).replace('export function','function');
const getHeightAt=vm.runInNewContext(fun+'\ngetHeightAt',{gameState:state});
for(const b of state.BRG){
 const cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2;
 assert(getHeightAt(cx,cz)>.75,'player feet follow deck curve center');
 assert(getHeightAt(cx,cz)<1.2,'no giant step in bridge height');
 assert(getHeightAt(b.x0,cz)<getHeightAt(cx,cz),'deck has physically arched height');
}
const obstacles=[{t:'cliff',x:3.8,z:0,sy:2.1}];
const target=[0,2,0],camera=[9,4,0];
const fixed=clearBossView(camera,target,obstacles,()=>0);
assert(fixed[0]<camera[0] || fixed[1]>camera[1],'camera must adapt around cliff');
assert.deepEqual(clearBossView(camera,target,[],()=>0),camera,'no obstruction keeps original pose');
// Verify both live boss scenes and both victory scenes can build valid camera tracks.
gameState.getHeightAt=()=>0;gameState.P={x:56,z:56,mesh:{position:{y:0}}};gameState.zoom=1;gameState.yaw=0;
gameState.ents=[
 {bossId:'orc_king',x:59,z:59,mesh:{position:{y:0}},hp:10,K:{level:20}},
 {bossId:'troll_ancient',x:52,z:35,mesh:{position:{y:0}},hp:10,K:{level:14}},
];
for(const id of ['orc','troll','orc_victory','troll_victory']){
 const context=id==='orc_victory'?{x:59,z:59}:id==='troll_victory'?{x:52,z:35}:undefined;
 const s=SCENES[id].build(context);
 assert(s?.shots?.length>=3,id+' scene playable');
 for(const shot of s.shots)for(const key of ['a','b']) assert(shot[key].p.every(Number.isFinite),id+' camera valid');
}
const combat=read('src/combat/combat.js'),cutscene=read('src/cutscene/cutsceneSystem.js');
assert(combat.indexOf('notifyBossVictory(enemy);')<combat.indexOf("Q.emit('kill'"),'queue victory before quest side effects');
assert(cutscene.includes('const VICTORY_SPAWNS'),'victory previews have fallback positions');
assert(cutscene.includes('if (playCutscene(q.id, { context: q.context })) { pendingVictory = null; return; }'),'queue retained until scene begins');
console.log('PASS: 4 bridge decks/rails + curved height, camera occlusion, boss and victory scenes, victory queue integration');
