import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const read=name=>readFileSync(new URL(name,root),'utf8');

// Execute the actual batching function with a lightweight Three API double.
class V {constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}}
class Attrib {constructor(arr,size){this.array=arr;this.count=arr.length/size;this.itemSize=size}getX(i){return this.array[this.itemSize*i]}getY(i){return this.array[this.itemSize*i+1]}getZ(i){return this.array[this.itemSize*i+2]}}
class Geo {
  constructor(){this.index=null;this.attributes={position:new Attrib([0,0,0,1,0,0,0,1,0],3),normal:new Attrib([0,0,1,0,0,1,0,0,1],3),uv:new Attrib([0,0,1,0,0,1],2)}}
  clone(){return new Geo()}applyMatrix4(){return this}dispose(){}getAttribute(k){return this.attributes[k]}setAttribute(k,v){this.attributes[k]=v}
}
class Obj {constructor(){this.children=[];this.userData={};this.position=new V();this.rotation=new V();this.scale=new V(1,1,1)}add(child){this.children.push(child)}remove(child){this.children=this.children.filter(x=>x!==child)}traverse(fn){fn(this);for(const ch of this.children)ch.traverse(fn)}updateMatrix(){this.matrix={}}}
class Group extends Obj {constructor(){super();this.isGroup=true}}
class Mtl {constructor(opt){Object.assign(this,opt);this.userData={};this.isMeshLambertMaterial=true;this.opacity=1;this.side=0;this.emissive={value:0,setHex(v){this.value=v}};this.color={r:1,g:1,b:1,...opt?.color}}}
class Mesh extends Obj {constructor(g,m){super();this.isMesh=true;this.geometry=g;this.material=m}}
const THREE={Mesh,MeshLambertMaterial:Mtl,BufferGeometry:Geo,Float32BufferAttribute:Attrib,FrontSide:0};
const code=read('src/player/v6MeshBatching.js').replace(/^import .*;\s*$/gm,'').replaceAll('export function ','function ');
const ctx={THREE};vm.createContext(ctx);
vm.runInContext(code+'\nthis.batch=batchCharacterMeshes;',ctx);
function createEntity(){const root=new Group();root.add(new Mesh(new Geo(),new Mtl({color:{r:.7,g:.3,b:.2}})));root.add(new Mesh(new Geo(),new Mtl({color:{r:.4,g:.2,b:.1}})));return root}
const house=createEntity(),player=createEntity(),npc=createEntity();
for(const g of [house,player,npc]) assert.equal(ctx.batch(g),1);
assert.notEqual(house.userData.v77OwnedPaint,player.userData.v77OwnedPaint,'house must not share player emissive');
assert.notEqual(npc.userData.v77OwnedPaint,player.userData.v77OwnedPaint,'independent NPC status materials');
player.userData.v77OwnedPaint.emissive.setHex(0xff3300);
assert.equal(house.userData.v77OwnedPaint.emissive.value,0,'damage flash cannot affect house');
assert.equal(npc.userData.v77OwnedPaint.emissive.value,0,'damage flash cannot affect unrelated NPC');

// Execute the installed environment catalogue and count real mesh parts.
class Shape {constructor(...args){this.args=args}}
const geoTHREE={BoxGeometry:Shape,ConeGeometry:Shape,CylinderGeometry:Shape,IcosahedronGeometry:Shape};
const envCode=read('src/assets/v6Environment.js').replaceAll('export function ','function ');
const envCtx={};vm.createContext(envCtx);vm.runInContext(envCode+'\nthis.installer=installV6Environment;',envCtx);
const shapes={};envCtx.installer(geoTHREE,shapes,parts=>parts);
for(const t of ['stall','well','basket','sack','flowerbed','planter','barrel','crate','lantern']){
 assert.ok(Array.isArray(shapes[t])&&shapes[t].length>=5,`Missing low-poly prop: ${t}`);
 for(const part of shapes[t]) assert.ok(Number.isInteger(part[1]),`No plain material color for ${t}`);
}
assert.ok(shapes.stall.length>=15,'Market stalls need timber supports, striped canopy and produce');
const procedural=read('src/assets/procedural.js');
assert.match(procedural,/vertexColor:\s*new THREE\.MeshLambertMaterial\(\{ vertexColors: true, flatShading: true \}\)/);
const world=read('src/world/world.js');
assert.match(world,/villageProp\('basket'/);
assert.match(world,/villageProp\('planter'/);
assert.ok(!world.includes("'north market',{c:"),'No red-tinted stall instances');
const html=read('index.html');assert.match(html,/1\.1\.0 · COMBATE MANUAL \+ VFX\/SFX V2 · STORY/);
console.log('PASS V7.7: isolated emissive house/NPC materials; noise-free vertex colors; basket/sack/planter/well/striped market; no red tint; build marker');
