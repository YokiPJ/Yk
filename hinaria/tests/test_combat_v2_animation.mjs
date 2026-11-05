import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CharacterAnimator, AnimationState } from '../src/player/characterAnimator.js';
function node(){return {position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0}};}
function setup(stage,dodge=false){
 const rig={unit:node(),head:node(),armR:node(),armL:node(),legs:[node(),node()],cape:node(),amp:.65,sw:1.9};
 const e={kind:'p',hp:90,x:0,z:0,spd:0,at:dodge?0:.5,fl:0,b:{},st:{},mesh:{userData:{r:rig}},combatV2Stage:stage,combatV2Dodge:dodge,combatV2DodgeProgress:.5};
 const animator=new CharacterAnimator(rig);animator.update(e,.05);return {rig,e,animator};
}
test('estágios 1, 2 e 3 geram poses distintas no mesmo rig',()=>{
 const a=setup(0).rig,b=setup(1).rig,c=setup(2).rig;
 assert.notEqual(a.unit.rotation.y,b.unit.rotation.y);
 assert.notEqual(a.unit.rotation.x,c.unit.rotation.x);
});
test('esquiva usa estado próprio e pivôs originais',()=>{
 const {rig,animator}=setup(undefined,true);
 assert.equal(animator.state,AnimationState.DODGE);
 assert.ok(rig.unit.rotation.x<0);
 assert.ok(rig.armR.rotation.x<0);
});
test('sem atributos V2, animation ATTACK original funciona',()=>{
 const {animator}=setup(undefined,false);assert.equal(animator.state,AnimationState.ATTACK);
});
