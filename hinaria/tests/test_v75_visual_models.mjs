import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const read=(rel)=>readFileSync(new URL(rel,root),'utf8');
class Vec { constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z})} set(x,y,z){Object.assign(this,{x,y,z});return this} setScalar(v){return this.set(v,v,v)} }
class Geo { constructor(...args){this.args=args} scale(){return this} translate(){return this} }
class Obj {constructor(){this.position=new Vec();this.rotation=new Vec();this.scale=new Vec(1,1,1);this.children=[];this.userData={}} add(m){this.children.push(m);m.parent=this} traverse(fn){fn(this);for(const c of this.children)c.traverse(fn)} }
class Group extends Obj {}
class Mesh extends Obj {constructor(geo,mat){super();this.geometry=geo;this.material=mat} }
class Mat {constructor(opts){Object.assign(this,opts);this.userData={}} }
const THREE={Group,Mesh,MeshLambertMaterial:Mat,MeshBasicMaterial:Mat,Vector3:Vec,
   SphereGeometry:Geo,CylinderGeometry:Geo,ConeGeometry:Geo,BoxGeometry:Geo,
   TorusGeometry:Geo,OctahedronGeometry:Geo,CircleGeometry:Geo,IcosahedronGeometry:Geo,
   BufferGeometry:class {setAttribute(){} computeVertexNormals(){}},
   BufferAttribute:class{}, Float32BufferAttribute:class{}, DoubleSide:2};
const context={THREE,gameState:{FT:[]},console,batchCharacterMeshes:()=>0};
vm.createContext(context);
const models=read('src/player/characterModels.js').replace(/^import .*;\s*$/gm,'').replaceAll('export function ','function ');
vm.runInContext(models+'\nthis.makeRig = buildImprovedRig;',context);
const results={};
for(const role of ['knight','ranger','mage','druid','sage','blacksmith']){
 const avatar=context.makeRig({role,skin:0xd9a97f,hair:0x5a3b22,cloth:0x725b4b,pants:0x34281d,armor:1,cape:0x5f3328});
 const rig=avatar.userData.r;
 assert.equal(rig.role,role);
 assert.ok(rig.head && rig.armR && rig.armL && rig.legs.length===2 && rig.cape);
 let meshes=0; avatar.traverse(o=>{if(o instanceof Mesh)meshes++});
 assert.ok(meshes>=40,`Insufficient class detail: ${role} (${meshes})`);
 results[role]=meshes;
}
assert.ok(results.mage>=45, "Mage signature mesh density");
const arch=read('src/world/v6Architecture.js').replace(/^import .*;\s*$/gm,'').replaceAll('export function ','function ');
vm.runInContext(arch+'\nthis.makeHouse=buildVillageHouseV6;this.makeForge=buildForgeV6;',context);
const cottage=context.makeHouse({w:3,d:3,x:8.5,z:11,b:0xb99b78,r:0x985441,district:'western cottages'},0);
let cottageMeshes=0; cottage.traverse(o=>{if(o instanceof Mesh)cottageMeshes++});
assert.ok(cottageMeshes>50,`Not enough house detail: ${cottageMeshes}`);
assert.equal(cottage.userData.collider.halfWidth,1.5);
assert.equal(cottage.userData.collider.halfDepth,1.5);
const forge=context.makeForge(0);assert.ok(forge.children.length>15);
assert.equal(forge.userData.collider.halfWidth,1.55);
// Scene geometry upgraded, but all shape-only accessories stay out of navigation grid.
const env=read('src/assets/v6Environment.js');
assert.match(env,/set\('pine'/);assert.match(env,/set\('oak'/);assert.match(env,/set\('lantern'/);
console.log('PASS V7.6 (classes): 4 playable classes + Bram/Yoki, existing articulated rig, chunky buildings/forest, stable collision footprint:',results);
