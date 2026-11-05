/** Build real legacy house geometries in strict mode, where ES modules execute. */
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
const source=readFileSync(new URL('../src/world/v6Architecture.js',import.meta.url),'utf8')
  .replace(/^import .*;\s*$/gm,'').replaceAll('export function ','function ');
const context={THREE,addSurface(){},batchCharacterMeshes(){}};
vm.runInNewContext('"use strict";\n'+source+';this.build=buildVillageHouseV6;',context);
let meshes=0;
for(const district of ['','western farm','smith quarter','south tavern','eastern workshop','chapel']){
  const model=context.build({w:3.4,d:3,x:10,z:10,r:0x916647,district,church:district==='chapel'},0);
  assert.ok(model.isGroup);
  model.traverse(node=>{
    if(!node.isMesh)return;
    meshes++;
    const pos=node.geometry.attributes.position.array;
    assert.ok(Array.from(pos).every(Number.isFinite),district+' finite geometry');
    assert.ok(node.material.isMaterial,district+' real material');
    assert.ok([node.position.x,node.position.y,node.position.z].every(Number.isFinite));
  });
}
assert.equal('i' in context,false,'planter loop must never create a global variable');
console.log(`PASS classic architecture: 6 districts, ${meshes} finite meshes, strict scope without leaked planter index.`);
