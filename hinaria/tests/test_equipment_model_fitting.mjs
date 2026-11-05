import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCharacterVisualV2} from '../src/modelsV2/index.js';
import {CharacterAnimator} from '../src/player/characterAnimator.js';
import {attachReplayAxe} from '../src/player/replayAxeModel.js';
import {buildRig,applyAppearance} from '../src/player/player.js';
import {WEAPONS,ensureArsenal} from '../src/player/arsenal.js';
import {gameState} from '../src/core/gameState.js';
globalThis.Audio=class {addEventListener(){} pause(){} play(){return Promise.resolve()}};
const {cloneHouseAvatar}=await import('../src/world/houseInteriors.js');

function dispose(root){
 const gs=new Set(),ms=new Set();root.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)ms.add(m)});
 gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());
}
function gripDistance(root){
 const r=root.userData.r;root.updateMatrixWorld(true);
 const actual=r.weapon.localToWorld(new THREE.Vector3(...r.weapon.userData.equipment.grip));
 return actual.distanceTo(r.rightHandGrip.getWorldPosition(new THREE.Vector3()));
}
const roster=['kn','pa','so','dr','blacksmith','sage','bandit','skeleton','troll','orc','troll_ancient','orc_king'];
for(const id of roster){
 const root=createCharacterVisualV2(id),r=root.userData.r;
 assert.ok(root&&r.weapon&&r.rightHandGrip,id);
 let ancestor=r.weapon,belongs=false;while(ancestor){if(ancestor===r.armR)belongs=true;ancestor=ancestor.parent}
 assert.ok(belongs,id+' weapon must follow the animated dominant arm');
 const entity={mesh:root,kind:'p',hp:100,x:0,z:0,spd:0,at:0,fl:0};
 const animator=new CharacterAnimator(r);
 for(const state of ['idle','walk','run','attack','damage','dodge','death']){
  Object.assign(entity,{hp:100,spd:0,at:0,fl:0,combatV2Dodge:false});
  if(state==='walk')entity.spd=2;
  if(state==='run')entity.spd=4.5;
  if(state==='attack')entity.at=.5;
  if(state==='damage')entity.fl=.18;
  if(state==='dodge'){entity.combatV2Dodge=true;entity.combatV2DodgeProgress=.5}
  if(state==='death')entity.hp=0;
  for(let i=0;i<20;i++)animator.update(entity,.025);
  assert.ok(gripDistance(root)<1e-6,id+'/'+state+' grip detached');
  root.traverse(o=>assert.ok([...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()].every(Number.isFinite)));
 }
 if(r.capes.length>1)assert.ok(r.capes.every(p=>Math.abs(p.rotation.x-r.capes[0].rotation.x)<1e-7),id+' cape strips must follow the same pose');
 dispose(root);
}
const armorFingerprints=[];
for(let armor=0;armor<4;armor++){
 const root=createCharacterVisualV2('kn',{armor});
 const colors=[];root.traverse(o=>{if(o.geometry?.attributes.color)colors.push(...o.geometry.attributes.color.array.slice(0,30))});
 armorFingerprints.push(colors.join(','));
 assert.equal(root.userData.r.armorLevel,armor);dispose(root);
}
assert.equal(new Set(armorFingerprints).size,4,'Four armor tiers must have distinct rendered colors');

gameState.scene=new THREE.Scene();gameState.getHeightAt=()=>0;
let variants=0;
for(const cls of ['kn','pa','so','dr','yo']){
 const P=ensureArsenal({cls,sk:0,ar:2,x:3,z:4,mesh:new THREE.Group(),gold:999,ownedWeapons:WEAPONS.filter(w=>w.cls===cls).map(w=>w.id)});
 for(const weapon of WEAPONS.filter(w=>w.cls===cls)){
  P.equippedWeapons[cls]=weapon.id;applyAppearance(P);
  const r=P.mesh.userData.r;
  assert.ok(gripDistance(P.mesh)<1e-6,weapon.id+' equipped hand');
  assert.equal(r.aim,weapon.kind==='bow',weapon.id+' aiming state');
  if(r.aim){
   assert.equal(r.shield,null,'A two-handed bow cannot retain a shield');
   const animator=new CharacterAnimator(r);for(let i=0;i<60;i++)animator.update({...P,kind:'p',hp:100,spd:0,at:0,fl:0},.025);
   P.mesh.updateMatrixWorld(true);
   const gap=r.supportTarget.getWorldPosition(new THREE.Vector3()).distanceTo(r.leftHandGrip.getWorldPosition(new THREE.Vector3()));
   assert.ok(gap<.08,weapon.id+' support hand must reach its string: '+gap);
  }
  if(weapon.kind==='axe')assert.equal(r.weapon.name,'MachadoDoReplay');
  if(weapon.model.includes('_')&&weapon.kind!=='axe')assert.ok(r.weapon.name.startsWith('Equipped_'));
  assert.equal(P.mesh.position.x,3);assert.equal(P.mesh.position.z,4);
  assert.equal(r.armorLevel,2);variants++;
 }
 dispose(P.mesh);gameState.scene.remove(P.mesh);
}
const bow=createCharacterVisualV2('pa'),clone=cloneHouseAvatar(bow);
assert.equal(clone.userData.r.bindY,bow.userData.r.bindY);
assert.notEqual(clone.userData.r.rightHandGrip,bow.userData.r.rightHandGrip);
assert.notEqual(clone.userData.r.supportTarget,bow.userData.r.supportTarget);
assert.equal(clone.userData.r.capes.length,5);
const before=bow.userData.r.armL.quaternion.clone();
new CharacterAnimator(clone.userData.r).update({kind:'p',hp:100,x:0,z:0,spd:2,mesh:clone},.05);
assert.ok(bow.userData.r.armL.quaternion.equals(before),'Indoor support constraint must not mutate outdoor rig');
dispose(bow);

// Test the real classic fallback too; image loading is a no-op in this Node fixture.
globalThis.window={HINARIA_MODELOS_V2:false,location:{search:''}};
globalThis.document={createElementNS(){return {addEventListener(){},removeEventListener(){},set src(v){this._src=v}}}};
for(const role of ['knight','ranger','mage','druid','sage','blacksmith','orc','troll','bandit','skeleton']){
 const root=buildRig({role,w:role==='ranger'?'bow':'sword',sh:role==='knight'?'shield':null,armor:3,skin:0xd9a97f,cloth:0x586f53});
 assert.equal(root.userData.r.visualKind,'classic');
 assert.ok(gripDistance(root)<1e-6,role+' classic grip');
 dispose(root);
}
console.log('PASS model fitting: 12 rigs × 7 poses, '+variants+' player loadouts, 4 armor tiers, safe indoor clone, 10 classic fallback rigs.');
