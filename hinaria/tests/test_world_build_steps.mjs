/** Build the actual procedural world with real Three, using a canvas adapter without a GPU. */
import assert from 'node:assert/strict';
import * as THREE from 'three';
const context=new Proxy({createRadialGradient:()=>({addColorStop(){}})},
  {get:(target,key)=>key in target?target[key]:(()=>{})});
globalThis.document={documentElement:{style:{setProperty(){}}},
  createElement:()=>({width:128,height:128,getContext:()=>context}),
  createElementNS:()=>({addEventListener(){},removeEventListener(){},set src(_value){}})};
globalThis.Image=class {width=128;height=128;};
Object.defineProperty(globalThis,'navigator',{value:{maxTouchPoints:1},configurable:true});
const {gameState}=await import('../src/core/gameState.js');
const {generateWorld,buildWorldMeshesAsync}=await import('../src/world/world.js');
const {optimizeStaticChunks}=await import('../src/world/staticBatch.js');
const {createWorldLightBudget,applyWorldMaterialBudget}=await import('../src/world/worldRenderBudget.js');
gameState.scene=new THREE.Scene();generateWorld();
const before={houses:gameState.HO.length,chests:gameState.CH.length,landmarks:gameState.LM.length};
const phases=[];
await buildWorldMeshesAsync(async phase=>{phases.push(phase);await Promise.resolve();});
assert.equal(phases[0],'assets');assert.ok(phases.includes('terrain'));assert.ok(phases.includes('village'));
assert.ok(phases.filter(phase=>phase.startsWith('objects:')).length>=10);
assert.equal(phases.filter(phase=>phase==='house').length,before.houses);
assert.deepEqual({houses:gameState.HO.length,chests:gameState.CH.length,landmarks:gameState.LM.length},before);
assert.ok(gameState.ground?.isMesh&&gameState.waterMesh?.isMesh);assert.ok(gameState.worldChunks.size>1);
const triangles=root=>{let total=0;root.traverse(o=>{if(o.isMesh)total+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);});return total;};
const originalTriangles=triangles(gameState.scene),stats=optimizeStaticChunks(gameState.worldChunks);
assert.ok(stats.batches>0&&stats.mergedMeshes>stats.batches);
assert.equal(triangles(gameState.scene),originalTriangles,'whole-world batching retains the rendered architecture');
applyWorldMaterialBudget(gameState.scene,{highDetail:false});
const lights=createWorldLightBudget(gameState.scene,{maxLights:2});lights.update(13,15,0);
assert.ok(lights.diagnostics().sources>2,'the pool replaces the actual many-lantern world');
let points=0,expensiveDecorations=0;
gameState.scene.traverseVisible(o=>{if(o.isPointLight)points++;if(o.isMesh&&o.material?.userData.worldQuality&&!o.material.transparent&&!o.material.userData.dynamicMaterial&&o.material.isMeshStandardMaterial)expensiveDecorations++;});
assert.equal(points,2);assert.equal(expensiveDecorations,0);
lights.dispose();
console.log('PASS world construction: cooperative stages, complete quest landmarks, triangle-preserving batches, bounded lights and Lambert decoration shaders.');
