import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { QUESTS } from '../src/quest/questData.js';
import { createQuestSystem } from '../src/quest/questSystem.js';
import { GameState } from '../src/core/gameState.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
// The user actually sent these regressions; validate defensive height precisely.
const state=new GameState();
assert.equal(state.getHeightAt(10,10),0,'missing HG fallback');
state.W=1;state.G=[[0]];state.HG=new Float32Array([1,2,3,4]);
assert(Number.isFinite(state.getHeightAt(0,0)));
assert.equal(state.getHeightAt(NaN,0),0);
assert.equal(state.getHeightAt(0,Infinity),0);
state.HG=new Float32Array([NaN,0,0,0]);assert.equal(state.getHeightAt(0,0),0);
// All side quests have distinct IDs and refer only to actual world landmarks.
const ids=QUESTS.map(q=>q.id);assert.equal(new Set(ids).size,ids.length);
for(const id of ['yoki_marcacoes','yoki_gol_impossivel','yoki_de_novo'])assert(ids.includes(id));
const text=read('src/world/world.js');
for(const lm of ['Marca do Escudo Partido','Marca do Passo no Gelo','Marca do Machado Silencioso'])assert(text.includes(lm));
const Q=createQuestSystem(QUESTS,{discovered:()=>false,level:()=>30});
Q.start('yoki_marcacoes');
assert.equal(Q.status('yoki_marcacoes'),'active');
for(const n of ['Bosque das Memórias','Marca do Escudo Partido','Marca do Passo no Gelo','Marca do Machado Silencioso'])Q.emit('discover',{n});
Q.talk('yoki','hi');
assert.equal(Q.status('yoki_marcacoes'),'done');
const saved=Q.serialize();
const copy=createQuestSystem(QUESTS,{level:()=>30});assert.equal(copy.restore(saved),true);
assert.equal(copy.status('yoki_marcacoes'),'done');
assert.equal(copy.restore('{"v":1,"q":{"yoki_marcacoes":{"s":"active","step":999,"n":0}}}'),true);
assert.notEqual(copy.status('yoki_marcacoes'),'active','corrupt quest active step must be rejected');
// All proposed cinematics build finite camera tracks, plus the boss aftermath dialogue.
const scripted=read('src/cutscene/scenes.js').replace(/^import .*;\s*$/gm,'').replace(/export const /g,'const ');
const npc={x:6,z:7,mesh:{position:{y:1}}};
const gs={P:{x:84,z:80,mesh:{position:{y:1}}},zoom:1,yaw:0,insideHouse:false,
 LM:[{n:'Bosque das Memórias',x:16,z:78},{n:'Alto das Cinzas',x:88,z:81},{n:'Refúgio da Trilha Sul',x:12,z:89}],
 ents:[{bossId:'troll_ancient',x:52,z:35,mesh:{position:{y:1.1}},hp:150,K:{level:14}},
       {bossId:'orc_king',x:58,z:59,mesh:{position:{y:1.2}},hp:150,K:{level:20}}],
 getHeightAt:()=>.2,N:npc,Y:npc};
const sandbox={gameState:gs,Math};vm.createContext(sandbox);
vm.runInContext(scripted+';globalThis.scenes=SCENES;',sandbox);
for(const id of ['yoki_memory','yoki_ashes','yoki_goal','yoki_troll_tip','orc_victory']){
 const built=sandbox.scenes[id].build(id==='orc_victory'?{x:58,z:59}:undefined);
 assert(built?.shots?.length>=3,`${id} should build camera shots`);
 for(const shot of built.shots)for(const which of ['a','b']){
   assert.equal(shot[which]?.p?.length,3,`${id} missing camera position`);
   assert(shot[which].p.every(Number.isFinite),`${id} invalid coordinates`);
 }
}
assert(sandbox.scenes.orc_victory.build({x:58,z:59}).shots.some(s=>s.say?.who==='Yoki'));
// Check chunk culling behavior without installing/running Three.js/WebGL.
const js=read('src/world/chunkVisibility.js').replace(/^import .*;\s*$/gm,'').replace(/export function /g,'function ');
class Group{constructor(){this.children=[];this.visible=true;}add(obj){this.children.push(obj);}}
const chunksState={worldChunks:new Map(),scene:{add(){}},activeChunkCount:0};
const chunkCtx={THREE:{Group},gameState:chunksState,location:{search:''},Math,URLSearchParams};vm.createContext(chunkCtx);
vm.runInContext(js+';globalThis.api={registerChunkVisual,updateChunkVisibility};',chunkCtx);
for(let cx=0;cx<6;cx++)for(let cz=0;cz<6;cz++)chunkCtx.api.registerChunkVisual({id:`${cx},${cz}`},cx*16+1,cz*16+1);
chunkCtx.api.updateChunkVisibility(40,40,false);assert.equal(chunksState.activeChunkCount,9,'3x3 active window');
chunkCtx.api.updateChunkVisibility(40,40,true);assert.equal(chunksState.activeChunkCount,36,'cinematics must keep entire world visible');
chunkCtx.api.updateChunkVisibility(40,40,false);assert.equal(chunksState.activeChunkCount,9,'post-cinema culling restored');
// Explicit crash defenses and feature paths live in production code.
assert(read('src/combat/combat.js').includes('enemy._hinariaDeathProcessed'));
assert(read('src/cutscene/cutsceneSystem.js').includes("def.failed = true"));
assert(read('src/world/houseInteriors.js').includes("houseTransition='entering'"));
assert(read('src/ui/qaDiagnostics.js').includes('drawCalls:info?.render?.calls'));
console.log('PASS QA + Lore: height safety, quest save, 3 Yoki missions, 5 cinematics, boss aftermath, 3x3 chunk visibility, duplicate death and diagnostics.');
