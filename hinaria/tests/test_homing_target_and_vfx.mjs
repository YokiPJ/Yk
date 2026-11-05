import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {findGuidedEnemy,hasLineOfSight} from '../src/combat/forwardHit.js';
import {createVFX} from '../src/vfx/claudeVfx.js';
import * as THREE from './helpers/mini-three.mjs';

// All five classes use the same explicit frontal/range/LoS query.
// Guided visuals may follow a valid frontal target after launch, but never aim-snap.
const P={x:10,z:10,mesh:{rotation:{y:0}}};
const near={x:10,z:11,hp:20,kind:'m'};
const rear={x:10,z:9.2,hp:20,kind:'m'};
const far={x:10,z:15,hp:20,kind:'m'};
const state={ents:[near,rear,far],B:[]};
for(const range of [1,1.5,4,5,6])assert.equal(findGuidedEnemy({...state,ents:[near]},P,range),near);
assert.equal(findGuidedEnemy({...state,ents:[rear]},P,1.5),null,'rear enemies stay outside the manual forward cone');
assert.equal(findGuidedEnemy({...state,ents:[far]},P,4),null,'real weapon range enforced');
assert.equal(findGuidedEnemy({...state,ents:[{...near,hp:0}]},P,2),null,'dead enemies ignored');
const B=[];B[10]=[];B[10][11]=1;
assert.equal(hasLineOfSight({B},10,10,10,12),false,'wall blocks line');
assert.equal(findGuidedEnemy({ents:[{...far,z:12}],B},P,4),null,'manual frontal query cannot shoot through walls');
assert.equal(findGuidedEnemy({...state,ents:[rear,far,near]},P,6),near,'nearest visible FRONT target preferred');

// Actual VFX bridge should place targeted skills AT the enemy, not atop the caster,
// and pass a live position getter only for projectile effects.
const script=readFileSync(new URL('../src/vfx/claudeVfxBridge.js',import.meta.url),'utf8')
  .replace(/^import\s+.*?;\s*$/gm,'').replace(/\bexport (?=(const|function)\b)/g,'');
const calls=[];
const ctx={THREE,console,hasLineOfSight,createVFX:()=>({play:(id,opts)=>calls.push({id,opts}),update(){},clear(){},stats(){return{}},list(){return[]}})};
vm.runInNewContext(script+'\nthis.api={initClaudeVfx,playClaudeSkill,playClaudeVfx};',ctx);
const {initClaudeVfx,playClaudeSkill,playClaudeVfx}=ctx.api;
initClaudeVfx({scene:new THREE.Group(),getHeightAt:()=>3,B:[]});
const user={x:0,z:0,mesh:{rotation:{y:0}}},enemy={x:4,z:0,hp:40,kind:'m'};
for(const cls of ['kn','yo','pa','so','dr']){
  assert.equal(playClaudeSkill(cls,0,user,enemy),true,cls+' cast');
  const event=calls.at(-1);
  if(['kn','yo','pa'].includes(cls))assert.equal(event.opts.pos.x,4,cls+' hit visual centered at enemy');
  else assert.equal(event.opts.pos.x,0,cls+' projectile starts at caster');
}
const fire=calls.find(e=>e.id==='fireball');
assert.equal(fire.opts.target.x,4);
assert.equal(fire.opts.getTarget().x,4);
enemy.x=4.6;assert.equal(fire.opts.getTarget().x,4.6,'projectile getter follows moving entity');
enemy.hp=0;assert.equal(fire.opts.getTarget(),null,'projectile stops tracking dead target');
const prior=calls.length;
assert.equal(playClaudeSkill('dr',1,user,user),true);assert.equal(calls.at(-1).opts.pos.x,user.x);
assert.equal(calls.length,prior+1);

// Real Claude particles + projectile actor: homing, arrival and cleanup.
const docContext=new Proxy({}, {get:()=>()=>docContext,set:()=>true});
const doc={createElement:()=>({width:0,height:0,getContext:()=>docContext})};
const scene=new THREE.Group();
const vfx=createVFX(THREE,scene,{document:doc,seed:4,maxParticles:700});
let foe={x:3,y:1,z:0},impacts=[];
vfx.play('fireball',{pos:[0,1,0],target:{...foe},getTarget:()=>({...foe}),onHit:(p)=>impacts.push(p)});
for(let f=0;f<8;f++)vfx.update(1/60);
foe.x=4.5;foe.z=1;
for(let f=0;f<180;f++)vfx.update(1/60);
assert.equal(impacts.length,1,'one projectile hit, not duplicated');
assert.ok(Math.hypot(impacts[0].x-foe.x,impacts[0].z-foe.z)<.1,'hits the moved target');
for(let f=0;f<180;f++)vfx.update(1/60);
assert.equal(vfx.stats().actors,0,'homing effect actors cleaned up');
impacts=[];
let living=true;
vfx.play('ice_bolt',{pos:[0,1,0],target:[5,1,0],getTarget:()=>living?{x:5,y:1,z:0}:null,onHit:(p)=>impacts.push(p)});
for(let f=0;f<3;f++)vfx.update(1/60);
living=false;
for(let f=0;f<160;f++)vfx.update(1/60);
assert.equal(impacts.length,0,'no phantom hit after death');
assert.equal(vfx.stats().actors,0,'early cancellation cleans actors');
vfx.dispose();assert.equal(scene.children.length,0,'all effect resources disposed');
console.log('PASS homing target: 5 classes, obstacle/range, enemy-centered VFX, moving/dead projectile, cleanup');
