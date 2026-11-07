/** Real Three.js regression coverage for world rendering, without a WebGL/browser fixture. */
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {optimizeStaticChunks,freezeStaticTransforms} from '../src/world/staticBatch.js';
import {applyWorldMaterialBudget,createWorldLightBudget} from '../src/world/worldRenderBudget.js';

// Keep texture requests pending: these tests exercise materials/geometry, not image decoding.
const context=new Proxy({}, {get(target,key){return key in target?target[key]:(()=>{});}});
globalThis.document={createElement:()=>({width:128,height:128,getContext:()=>context}),
  createElementNS:()=>({addEventListener(){},removeEventListener(){},set src(_value){}})};
const {createEnvironmentV2}=await import('../src/assets/environmentV2.js');
const {createVillageModelV3,updateVillageModelsV3}=await import('../src/assets/villageModelsV3.js');
function triangles(root){let count=0;root.traverse(o=>{if(o.isMesh)count+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);});return count;}
function meshes(root){const output=[];root.traverse(o=>{if(o.isMesh)output.push(o);});return output;}

// Cached prefabs retain the architecture and share immutable indexed geometry.
const scene=new THREE.Scene(),chunk=new THREE.Group();scene.add(chunk);
const first=createEnvironmentV2('casa'),second=createEnvironmentV2('casa');
assert.notEqual(first,second);assert.equal(meshes(first)[0].geometry,meshes(second)[0].geometry);
second.position.x=5;chunk.add(first,second);
const beforeTriangles=triangles(chunk),beforeMeshes=meshes(chunk).length;
const expected=new THREE.Box3().setFromObject(chunk);
const stats=optimizeStaticChunks(new Map([['0,0',chunk]]));
assert.ok(stats.batches>0);assert.ok(meshes(chunk).length<beforeMeshes);
assert.equal(triangles(chunk),beforeTriangles,'batching retains all roof tiles and architectural triangles');
const actual=new THREE.Box3().setFromObject(chunk);
assert.ok(actual.min.distanceTo(expected.min)<1e-5&&actual.max.distanceTo(expected.max)<1e-5);
assert.equal(meshes(chunk).some(o=>o.isInstancedMesh),false,'small roof instances join the material batches');
assert.ok(meshes(chunk).some(o=>o.geometry.index&&o.geometry.attributes.position.count<o.geometry.index.count),'indexed geometry avoids expanded triangle vertices');

// Low detail removes PBR/normal shader work; high restores the exact PBR materials.
const decorated=meshes(chunk).filter(o=>o.material.userData.worldQuality&&!o.material.userData.dynamicMaterial&&!o.material.transparent);
assert.ok(decorated.length>0);const original=decorated[0].material;
assert.equal(original.normalMap,null,'normal maps are lazy before high quality');
applyWorldMaterialBudget(scene,{highDetail:false});
assert.ok(decorated.every(o=>o.material.isMeshLambertMaterial));
const cheap=decorated[0].material;assert.equal(cheap.map,original.map);
assert.equal(cheap.normalMap,null);assert.deepEqual(cheap.color.toArray(),original.color.toArray());
assert.deepEqual(cheap.emissive.toArray(),original.emissive.toArray());
applyWorldMaterialBudget(scene,{highDetail:true});assert.equal(decorated[0].material,original);
assert.ok(decorated.some(o=>o.material.normalMap?.isTexture),'high detail loads optional normal maps');
applyWorldMaterialBudget(scene,{highDetail:false});assert.equal(decorated[0].material,cheap);
const lanternGlass=meshes(chunk).filter(o=>o.material.userData.dynamicMaterial);
assert.ok(lanternGlass.length>0);assert.ok(lanternGlass.every(o=>o.material.isMeshStandardMaterial));
const liveMaterial=lanternGlass[0].material;liveMaterial.emissiveIntensity=.37;
assert.equal(lanternGlass[0].material.emissiveIntensity,.37,'opaque dynamic material references remain live after batching and low detail');

// A fixed light pool excludes hidden districts without changing shader light count.
const lightsScene=new THREE.Scene(),district=new THREE.Group();lightsScene.add(district);
const source=new THREE.PointLight(0xffa033,.7,3);source.userData.worldLocalLight=true;source.position.set(1,2,1);district.add(source);
const far=new THREE.PointLight(0xffa033,1,3);far.userData.worldLocalLight=true;far.position.set(50,2,50);district.add(far);
const npc=new THREE.PointLight(0x55ff88,.7,3.5);lightsScene.add(npc);
const budget=createWorldLightBudget(lightsScene,{maxLights:2});budget.update(1,1,0);
assert.deepEqual(budget.diagnostics(),{sources:2,slots:2,active:1});
assert.equal(source.visible,false);assert.equal(npc.visible,true);
const pool=lightsScene.children.filter(o=>o.userData.worldLightPool);
assert.equal(pool.length,2);assert.ok(pool.every(o=>o.visible));
source.intensity=1.25;source.position.x=2;budget.update(1,1,16);
assert.equal(pool[0].intensity,1.25);assert.equal(pool[0].position.x,2,'live source transforms/intensity still reach the selected slot');
district.visible=false;budget.update(1,1,32);
assert.ok(pool.every(o=>o.visible&&o.intensity===0),'hidden chunks silence intensity without changing NUM_POINT_LIGHTS');
district.visible=true;budget.update(50,50,200);assert.equal(budget.diagnostics().active,1);
budget.setBudget(1);budget.update(50,50,220);assert.equal(budget.diagnostics().slots,1);
budget.dispose();assert.equal(source.visible,true);assert.equal(npc.visible,true);
assert.equal(lightsScene.children.some(o=>o.userData.worldLightPool),false);

// Matrix freezing preserves water movement, windmill rotation and hidden-chunk suspension.
const animatedScene=new THREE.Scene(),animatedChunk=new THREE.Group();animatedScene.add(animatedChunk);
const mill=createVillageModelV3('moinho'),fountain=createVillageModelV3('fonte');animatedChunk.add(mill,fountain);
const rings=meshes(fountain).filter(o=>o.userData.i!==undefined),originalRingMaterials=rings.map(o=>o.material);
const originalWaterMaterials=meshes(fountain).filter(o=>o.userData.dynamicTransform).map(o=>o.material);
applyWorldMaterialBudget(animatedScene,{highDetail:false});
assert.equal(rings.length,2);rings.forEach((ring,i)=>assert.equal(ring.material,originalRingMaterials[i]));
meshes(fountain).filter(o=>o.userData.dynamicTransform).forEach((mesh,i)=>assert.equal(mesh.material,originalWaterMaterials[i],'transparent water retains its material reference'));
freezeStaticTransforms(animatedChunk);
const hub=mill.children.find(o=>o.userData.keep),water=meshes(fountain).find(o=>o.userData.dynamicTransform);
assert.ok(hub&&water);assert.equal(hub.matrixAutoUpdate,true);assert.equal(water.matrixAutoUpdate,true);
const initialY=water.position.y,initialOpacity=rings.map(o=>o.material.opacity);
updateVillageModelsV3(.2);assert.notEqual(water.position.y,initialY);assert.notEqual(hub.rotation.z,0);
rings.forEach((ring,i)=>assert.notEqual(ring.material.opacity,initialOpacity[i],'fountain tick changes opacity on the material actually rendered in low detail'));
const rotation=hub.rotation.z;animatedChunk.visible=false;updateVillageModelsV3(.2);assert.equal(hub.rotation.z,rotation);
console.log('PASS world rendering: cached indexed architecture, roof batching, reversible Lambert/PBR, lazy normals, fixed local lights, preserved visible animations.');
