import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// A deterministic geometry-only test for the EXACT V7.6 house and gate code.
// It doesn't claim to validate WebGL/Android graphics.
const root=new URL('../',import.meta.url);
const read=rel=>readFileSync(new URL(rel,root),'utf8');
class Vec {constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}}
class Obj {constructor(){this.children=[];this.userData={};this.position=new Vec();this.rotation=new Vec();this.scale=new Vec(1,1,1)}add(child){this.children.push(child)}traverse(fn){fn(this);this.children.forEach(c=>c.traverse(fn))}}
class Group extends Obj {}
class Mesh extends Obj {constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.isMesh=true}}
class Material {constructor(opts){Object.assign(this,opts);this.isMeshLambertMaterial=true}}
class Geo {constructor(...args){this.args=args}}
class BoxGeo extends Geo {}
class ConeGeo extends Geo {}
class BuffGeo extends Geo {setAttribute(){}computeVertexNormals(){}}
const THREE={Group,Mesh,MeshLambertMaterial:Material,BoxGeometry:BoxGeo,ConeGeometry:ConeGeo,IcosahedronGeometry:Geo,
  BufferGeometry:BuffGeo,Float32BufferAttribute:class {},DoubleSide:2};
const sandbox={THREE,batchCharacterMeshes:()=>0,console};
vm.createContext(sandbox);
const architecture=read('src/world/v6Architecture.js').replace(/^import .*;\s*$/gm,'').replaceAll('export function ','function ');
vm.runInContext(architecture+'\nthis.makeHouse=buildVillageHouseV6;this.makeForge=buildForgeV6;',sandbox);
let slabs=0, shingles=0, braces=0;
for(const args of [
  {w:3,d:3,x:8.5,z:11,r:0x805747,district:'western cottages'},
  {w:4,d:3,x:11,z:21,r:0x7a5648,district:'south tavern'},
  {w:4,d:3,x:11.5,z:5,r:0x667f9b,church:1,district:'chapel'}
]) {
  const h=sandbox.makeHouse(args,0);
  assert.equal(h.userData.collider.halfWidth,args.w/2);
  assert.equal(h.userData.collider.halfDepth,args.d/2);
  let slabHere=0, shingleHere=0, trimHere=0;
  h.traverse(mesh=>{
    if(!mesh.isMesh || !mesh.geometry?.args) return;
    const [w,y,d]=mesh.geometry.args;
    if(Math.abs(y-.20)<1e-6&&d>args.d+.4&&w>1) {
      slabHere++;
      const side=Math.sign(mesh.position.x);
      assert.equal(Math.sign(mesh.rotation.z),-side,'roof slab slants towards ridge');
    }
    if(Math.abs(y-.035)<1e-6&&d>args.d+.4&&w<.15){
      shingleHere++;
      assert.equal(Math.sign(mesh.rotation.z),-Math.sign(mesh.position.x),'shingle follows roof slope');
    }
    if(Math.abs(y-.15)<1e-6&&Math.abs(d-.12)<1e-6&&w>1) {
      trimHere++;
      assert.equal(Math.sign(mesh.rotation.z),-Math.sign(mesh.position.x),'gable end fascia follows roof pitch');
    }
    if(Math.abs(y-.075)<1e-6&&Math.abs(d-.15)<1e-6&&w>1)braces++;
  });
  assert.equal(slabHere,2,'two solid slopes');
  assert.equal(shingleHere,10,'five shingle rows per slope');
  assert.equal(trimHere,4,'two end fascias per slope');
  slabs+=slabHere;shingles+=shingleHere;
}
assert.equal(braces,0,'no inverted-pitch crossbeams from V7.5');
const forge=sandbox.makeForge(0);
assert.equal(forge.userData.collider.halfWidth,1.55);
// Gateway now uses short decorative posts, not giant 4.45-unit lintels.
const world=read('src/world/world.js');
assert.ok(world.includes('function villageWaymarkers('));
assert.ok(!world.includes('function villageGate('));
// The V3 dressing block now lives between the waymarkers and bridges. It needs
// the whole buildWorldMeshes scope (envV2, terrain and chunk registration), so a
// geometry-only fixture must end at the final waymarker call rather than at an
// unrelated section marker. Exercise the real function and both real placements.
const waymarkerStart=world.indexOf('    function villageWaymarkers(');
const lastPlacement='    villageWaymarkers(25,15,true);';
const waymarkerEnd=world.indexOf(lastPlacement,waymarkerStart);
assert.ok(waymarkerStart>=0&&waymarkerEnd>waymarkerStart,'waymarker fixture boundaries exist');
const snippet=world.slice(waymarkerStart,waymarkerEnd+lastPlacement.length);
const added=[];
const testCtx={THREE,gameState:{scene:{add(o){added.push(o)}},getHeightAt:()=>0}};
vm.runInNewContext(snippet,testCtx);
assert.equal(added.length,4,'two waymarker pairs at the gates');
for (const post of added) {
  assert.equal(post.name,'V7_6_Waymarker');
  let maxHeight=0;
  post.traverse(m=>{
    if(!m.isMesh) return;
    const [w,y,d]=m.geometry.args;
    maxHeight=Math.max(maxHeight,m.position.y+(y||0)/2);
    if(m.geometry instanceof BoxGeo) assert.ok(w<=.65&&d<=.65,'no oversized floating timber wall or lintel');
  });
  assert.ok(maxHeight<1.85,'markers stay low, outside roads');
}
console.log('PASS V7.6: 3 house types + forge,',slabs,'roof slabs,',shingles,'correctly pitched shingle strips, no crossed beams, 4 compact gateway markers.');
