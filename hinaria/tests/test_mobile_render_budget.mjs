import assert from 'node:assert/strict';
import * as THREE from 'three';
import {deviceRenderProfile,budgetPixelRatio,createFramePacer} from '../src/core/renderProfile.js';
import {optimizeStaticChunks} from '../src/world/staticBatch.js';

const phone=deviceRenderProfile({maxTouchPoints:5,hardwareConcurrency:4,deviceMemory:4},{});
assert.equal(phone.mobile,true);assert.equal(phone.economy,true);assert.equal(phone.targetFPS,30);
assert.equal(phone.hudBackend,'canvas2d');
const powerful=deviceRenderProfile({maxTouchPoints:5,hardwareConcurrency:8,deviceMemory:8},{});
assert.equal(powerful.targetFPS,60);assert.equal(powerful.economy,false);
assert.equal(deviceRenderProfile({maxTouchPoints:0},{}).hudBackend,'pixi-webgl');
const ratio=budgetPixelRatio(2,2400,1080,3,phone);
assert.ok(2400*1080*ratio*ratio<=phone.pixelBudget+1);
assert.equal(budgetPixelRatio(1.2,400,300,.8,phone),.8);
const pacer=createFramePacer();let rendered=0;
for(let frame=0;frame<=120;frame++)if(pacer.shouldRender(frame*1000/60,30))rendered++;
assert.ok(rendered>=60&&rendered<=62);
assert.equal(pacer.shouldRender(10000,30),true);assert.equal(pacer.shouldRender(10000,30),false,'stall does not cause catch-up bursts');
assert.equal(pacer.shouldRender(10001,60),true,'a frame-limit change responds immediately');
assert.equal(pacer.shouldRender(NaN,60),false);

// Real Three geometry: same-shader colors merge, transformed vertices retain
// their world bounds, while transparent/dynamic/hidden objects stay independent.
const scene=new THREE.Scene(),chunk=new THREE.Group();scene.add(chunk);chunk.position.set(4,0,8);
const originals=[];
for(let i=0;i<6;i++){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:i%2?0x226633:0xaa3311,roughness:.8}));
 mesh.position.set(i*2,1,0);if(i===2)mesh.scale.x=-1;chunk.add(mesh);originals.push(mesh);
}
const moving=new THREE.Group();moving.userData.keep=true;chunk.add(moving);
const animated=new THREE.Mesh(new THREE.BoxGeometry(),originals[0].material);moving.add(animated);
const glass=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({transparent:true,opacity:.5}));chunk.add(glass);
const hidden=new THREE.Group();hidden.visible=false;chunk.add(hidden);
const concealed=new THREE.Mesh(new THREE.BoxGeometry(),originals[0].material);hidden.add(concealed);
scene.updateMatrixWorld(true);
const expected=new THREE.Box3();for(const mesh of originals)expected.union(new THREE.Box3().setFromObject(mesh));
const stats=optimizeStaticChunks(new Map([['0,0',chunk]]));
assert.equal(stats.batches,1);assert.equal(stats.mergedMeshes,6);
const batch=chunk.children.find(o=>o.name==='WorldStaticBatch');assert.ok(batch);
const actual=new THREE.Box3().setFromObject(batch);
assert.ok(actual.min.distanceTo(expected.min)<1e-5&&actual.max.distanceTo(expected.max)<1e-5);
assert.equal(batch.material.vertexColors,true);assert.equal(batch.material.color.getHex(),0xffffff);
assert.ok(batch.geometry.getAttribute('color').array.some(v=>v>0));
assert.equal(animated.parent,moving);assert.equal(animated.matrixAutoUpdate,true);
assert.equal(glass.parent,chunk);assert.equal(concealed.parent,hidden);
const previous=animated.matrix.clone();animated.rotation.x=.8;scene.updateMatrixWorld(true);
assert.notDeepEqual(animated.matrix.elements,previous.elements,'animated limbs still update after freezing static transforms');
assert.equal(batch.matrixAutoUpdate,false);assert.equal(chunk.matrixAutoUpdate,false);
console.log('PASS mobile budgets: capability presets, bounded pixels, 30/60 pacing, static geometry/colors/reflections, live animation and transparent/hidden exclusions.');
