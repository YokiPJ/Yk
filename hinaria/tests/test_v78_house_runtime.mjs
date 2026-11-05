/** Verifica construção e passagem entre cena exterior/interior sem GPU. */
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/world/houseInteriors.js',import.meta.url),'utf8').replace(/^import .*;\s*$/gm,'').replaceAll('export function ','function ');
class Vec {constructor(x=0,y=0,z=0){this.set(x,y,z)}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}copy(v){return this.set(v.x,v.y,v.z)}}
class Obj {constructor(){this.position=new Vec();this.rotation=new Vec();this.quaternion=new Vec();this.scale=new Vec(1,1,1);this.isObject3D=true;this.children=[];this.style={}}add(v){this.children.push(v)}clone(){return new Obj()}}
class Geo {constructor(...args){this.args=args}}
class Mat {constructor(props){Object.assign(this,props)}}
class Mesh extends Obj{constructor(g,m){super();this.isMesh=true;this.geometry=g;this.material=m}}
class Camera extends Obj {constructor(){super();this.aspect=1}updateProjectionMatrix(){}lookAt(x,y,z){this.looked=[x,y,z]}}
class Scene extends Obj {constructor(){super();this.background=null}}
const THREE={Mesh,Scene,BoxGeometry:Geo,MeshStandardMaterial:Mat,Group:Obj,PerspectiveCamera:Camera,Color:Mat,HemisphereLight:Obj,DirectionalLight:Obj};
const elem={classList:{added:false,add(){this.added=true},remove(){this.added=false}},textContent:''};
const state={P:{x:11,z:22.3,path:[1,2],mesh:new Obj()},HO:[{x:11,z:21,w:4,d:3,district:'south tavern'}],renderer:{domElement:{clientWidth:915,clientHeight:412},render(scene,camera){this.last=[scene,camera]}},keys:{w:1},jx:0,jz:0,ccOpen:false,arsenalOpen:false,insideHouse:false,tgt:{}};
const ctx={THREE,gameState:state,document:{getElementById(){return elem}},innerWidth:915,innerHeight:412,console};
vm.createContext(ctx);vm.runInContext(source+'\nthis.api={nearbyHouse,houseLabel,enterHouse,leaveHouse,tickHouse};',ctx);
let house=ctx.api.nearbyHouse();
assert.ok(house,'door not detected');
assert.equal(ctx.api.houseLabel(house),'Taverna de Vilarrubra');
// A circular gameplay reference must not break the visual-only clone.
state.P.mesh.userData={self:state.P};
state.P.mesh.children.push(new Mesh(new Geo(1),new Mat({color:1})));
assert.equal(ctx.api.enterHouse(house),true);
assert.equal(state.insideHouse,true);assert.equal(state.P.path.length,0);
ctx.api.tickHouse(0.1);
assert.equal(state.renderer.last[0] instanceof Scene,true);
assert.equal(state.renderer.last[1] instanceof Camera,true);
assert.equal(elem.classList.added,true);
ctx.api.leaveHouse();
assert.equal(state.insideHouse,false);assert.equal(elem.classList.added,false);
assert.equal(ctx.api.nearbyHouse(),house,'same house accessible after exit');
// 1.0.8.0: the remote Abandoned Cabin at the far southern edge must open via F too.
const cabin={x:28,z:58,w:3,d:3,district:'abandoned cabin'};
state.HO.push(cabin);state.P.x=28.6;state.P.z=60.9;
assert.equal(ctx.api.nearbyHouse(),cabin,'remote cabin door accessible from a diagonal approach');
assert.equal(ctx.api.houseLabel(cabin),'Cabana Abandonada');
assert.equal(ctx.api.enterHouse(),true,'remote cabin entered using nearest-house flow');
ctx.api.tickHouse(.016);
assert.ok(elem.textContent.includes('Cabana Abandonada'));
ctx.api.leaveHouse();
assert.equal(state.insideHouse,false,'returned to overworld after leaving remote cabin');
console.log('PASS V7.8 + 1.0.8.0 casas: portas, sala 3D e Cabana Abandonada remota acessíveis');
