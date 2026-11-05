/** Interior V2: playable gait with safe cloned pivots, collisions and static instancing.
 * GPU/browser-free regression using small Three.js shims; actual visual QA still needed.
 */
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/world/houseInteriors.js',import.meta.url),'utf8')
  .replace(/^import .*;\s*$/gm,'').replaceAll('export function ','function ');
const animatorSource=readFileSync(new URL('../src/player/characterAnimator.js',import.meta.url),'utf8')
  .replaceAll('export const ','const ').replaceAll('export class ','class ').replaceAll('export function ','function ');
class Vec {constructor(x=0,y=0,z=0){this.set(x,y,z);}set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}copy(v){return this.set(v.x,v.y,v.z);}}
class Obj {constructor(){this.position=new Vec();this.rotation=new Vec();this.quaternion=new Vec();this.scale=new Vec(1,1,1);this.children=[];this.userData={};this.isObject3D=true;this.visible=true;this.matrix={};}add(v){this.children.push(v)}remove(v){this.children.splice(this.children.indexOf(v),1);}updateMatrix(){this.matrix={pos:{...this.position},scale:{...this.scale}};} }
class Geo {constructor(...args){this.args=args;}dispose(){}}
class Mat {constructor(arg){Object.assign(this,arg);}dispose(){}}
class Mesh extends Obj {constructor(g,m){super();this.isMesh=true;this.geometry=g;this.material=m;}}
class InstancedMesh extends Mesh {constructor(g,m,n){super(g,m);this.count=n;this.instanceMatrix={needsUpdate:false};this.matrices=[];}setMatrixAt(i,m){this.matrices[i]=m;}}
class Camera extends Obj {constructor(){super();this.aspect=1;}updateProjectionMatrix(){}lookAt(x,y,z){this.looked=[x,y,z];}}
class Scene extends Obj {constructor(){super();this.background=null;}}
const THREE={Mesh,InstancedMesh,Scene,BoxGeometry:Geo,MeshStandardMaterial:Mat,Group:Obj,PerspectiveCamera:Camera,Color:Mat,HemisphereLight:Obj,DirectionalLight:Obj,PointLight:Obj};
const player=new Obj();player.name='hero';
const rigUnit=new Obj();player.add(rigUnit);
const legA=new Obj(),legB=new Obj(),armR=new Obj(),armL=new Obj(),head=new Obj(),cape=new Obj();
for(const p of [legA,legB,armR,armL,head,cape])rigUnit.add(p);
const g=new Geo(),m=new Mat({color:1});legA.add(new Mesh(g,m));legB.add(new Mesh(g,m));
player.userData.r={unit:rigUnit,legs:[legA,legB],armR,armL,head,cape,amp:.7};
player.userData.e={mesh:player}; // deliberate cycle to reproduce historical house crash
const status={insideHouse:false,ccOpen:false,arsenalOpen:false,dialogueOpen:false,
  keys:{},jx:0,jz:0,P:{x:11,z:22,path:[],mesh:player},HO:[{x:11,z:21,d:3,district:'western cottages'}],
  renderer:{domElement:{clientWidth:900,clientHeight:650},render(scene,camera){this.scene=scene;this.camera=camera;}}};
const hint={textContent:'',classList:{add(){},remove(){}}};
const doc={getElementById(){return hint}};
const ctx={THREE,gameState:status,document:doc,console,innerWidth:900,innerHeight:650};
vm.createContext(ctx);
vm.runInContext(animatorSource+'\n'+source+`\nthis.api={enterHouse,leaveHouse,tickHouse,cloneHouseAvatar,debug:()=>({avatar:interiorPlayer,room:roomScene,px,pz,indoorAnimator})};`,ctx);
const clone=ctx.api.cloneHouseAvatar(player);
assert.ok(clone.userData.r,'rig pivots cloned');
assert.notEqual(clone.userData.r.unit,rigUnit,'isolated pivots');
assert.notEqual(clone.userData.r.legs[0],legA,'leg pivot belongs to preview');
assert.equal(clone.userData.r.legs[0].children[0].geometry,g,'GPU geometry shared');
assert.equal(ctx.api.enterHouse(status.HO[0]),true);
const data=ctx.api.debug();
assert.ok(data.indoorAnimator,'CharacterAnimator attached to indoor avatar');
const grouped=data.room.children.flatMap(o=>o.children).filter(o=>o.name==='HINARIA_InteriorStatic_Instanced');
assert.ok(grouped.length>3,'walls, wooden floor and furniture batches created');
const leg=()=>ctx.api.debug().avatar.userData.r.legs[0].rotation.x;
const z0=ctx.api.debug().pz;
status.keys={w:true};
for(let i=0;i<15;i++)ctx.api.tickHouse(.05);
const z1=ctx.api.debug().pz;
assert.ok(z1<z0-.35,'avatar walked inside house');
assert.ok(Math.abs(leg())>.001,'animated leg swing in walk state');
assert.ok(status.renderer.scene===data.room,'interior still renders');
status.keys={};
for(let i=0;i<20;i++)ctx.api.tickHouse(.05);
assert.ok(Math.abs(leg())<.03,'returns toward idle pose');
// Test sliding collision without walking in place.
status.keys={a:true};for(let i=0;i<100;i++)ctx.api.tickHouse(.05);
status.keys={};for(let i=0;i<18;i++)ctx.api.tickHouse(.05);
assert.ok(ctx.api.debug().px>=-2.65,'does not leave house boundary');
assert.ok(Math.abs(leg())<.035,'no walk animation once blocked by wall');
ctx.api.leaveHouse();
assert.equal(status.insideHouse,false);
assert.equal(status.P.mesh.userData.e.mesh,player,'outside actor and circular runtime state untouched');
console.log('PASS interiores V2: clone cíclico seguro, rig animado, caminhada, idle, colisão, batching e retorno');
