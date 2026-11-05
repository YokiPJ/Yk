/** Claude 34-effect VFX pack — visual-only bridge. No additional damage or RAF. */
import * as THREE from 'three';
import { createVFX } from './claudeVfx.js';
import { hasLineOfSight } from '../combat/forwardHit.js';
let instance=null;
let failed=false;
let heightAt=()=>0;
let stateRef=null;
const mobile=()=>typeof navigator!=='undefined' && (navigator.maxTouchPoints>0 || /Android|iPhone/i.test(navigator.userAgent||''));
const at=e=>({x:Number(e?.x)||0,y:Number(e?.y)||0,z:Number(e?.z)||0});
export function initClaudeVfx(state){
  if(instance||failed||!state?.scene)return instance;
  try {stateRef=state;heightAt=typeof state.getHeightAt==='function'?(x,z)=>state.getHeightAt(x,z):()=>0;
    instance=createVFX(THREE,state.scene,{renderer:state.renderer,maxParticles:mobile()?700:1800});}
  catch(err){failed=true;console.warn('[Hinária] Claude VFX desativado:',err);}
  return instance;
}
export function playClaudeVfx(id,source,target=null,scale=1){
  if(!instance||!source)return false;
  try{
    const pos=at(source),dest=at(target||source);
    // Most gameplay entities store ground X/Z, not world-space mesh Y.
    if(!Number.isFinite(source?.y))pos.y=heightAt(pos.x,pos.z);
    if(target && !Number.isFinite(target?.y))dest.y=heightAt(dest.x,dest.z);
    // The terrain height is added by the event caller, avoiding direct gameplay dependencies.
    const dx=dest.x-pos.x,dz=dest.z-pos.z,ang=Number(source?.mesh?.rotation?.y)||0;
    const len=Math.hypot(dx,dz);
    const dir=len>.05?{x:dx/len,y:0,z:dz/len}:{x:Math.sin(ang),y:0,z:Math.cos(ang)};
    // Keep following the real enemy while it is alive. No target swapping mid-flight.
    const tracked=(target?.kind==='m' && Number.isFinite(target?.hp))?target:null;
    const rangeLimit=Math.hypot(dest.x-pos.x,dest.z-pos.z)+1.3;
    const getTarget=tracked?()=>{
      if(!(tracked.hp>0)||tracked.dead||tracked._hinariaDeathProcessed||
         !Number.isFinite(tracked.x)||!Number.isFinite(tracked.z)||
         Math.hypot(tracked.x-pos.x,tracked.z-pos.z)>rangeLimit||
         !hasLineOfSight(stateRef,pos.x,pos.z,tracked.x,tracked.z))return null;
      return {x:tracked.x,y:heightAt(tracked.x,tracked.z)+.82,z:tracked.z};
    }:undefined;
    instance.play(id,{pos,dir,target:dest,scale,...(getTarget?{getTarget}:{})});return true;
  }catch(err){console.warn('[Hinária] VFX',id,err);return false;}
}
/**
 * Mapeamento de 20 habilidades existentes -> exclusivamente VFX do Claude.
 * Mantem os indices do player/POWERS e nao altera cooldown, dano ou alvo real.
 * Cada classe possui 4 slots, mesmo que o quarto precise ser desbloqueado.
 */
export const CLASS_SKILL_VFX=Object.freeze({
  kn:Object.freeze(['slash_cross','boss_roar','shield','ground_slam']),
  pa:Object.freeze(['smite','lightning_sky','aura','beam']),
  so:Object.freeze(['fireball','explosion','aura','meteor']),
  dr:Object.freeze(['ice_bolt','heal','ice_burst','heal']),
  yo:Object.freeze(['slash_fire','shadow_burst','shield','slash_spin'])
});
// Area/self casts use the character position. Ground hits target the enemy.
const TARGET_CENTERED=new Set(['kn:0','yo:0','pa:0','pa:1','so:1','so:3']);
const PROJECTILES=new Set(['pa:3','so:0','dr:0']);
export function playClaudeSkill(cls,index,source,target){
  const id=CLASS_SKILL_VFX[cls]?.[index];
  if(!id || !source) return false;
  const key=`${cls}:${index}`;
  const a=at(source),b=at(target||source);
  const centerOnTarget=TARGET_CENTERED.has(key) && target && target!==source;
  const launching=PROJECTILES.has(key);
  const pos=centerOnTarget?b:a;
  // Ground circles/AOE under the target; slashes at enemy torso; magic launched from hand.
  const heightOffset=launching?1.05:(centerOnTarget && (id.startsWith('slash'))?.82:.12);
  const py=heightAt(pos.x,pos.z)+heightOffset;
  const ty=heightAt(b.x,b.z)+(launching?.82:.12);
  const origin={x:pos.x,y:py,z:pos.z,mesh:source.mesh};
  // Melee slash gets target-facing direction, but remains centered over the enemy.
  const enemySlash=centerOnTarget && id.startsWith('slash');
  const destination=enemySlash
    ? {x:pos.x+(b.x-a.x)*.08,y:py,z:pos.z+(b.z-a.z)*.08}
    : launching?target||{x:b.x,y:ty,z:b.z}
    : centerOnTarget?origin:{x:b.x,y:ty,z:b.z};
  return playClaudeVfx(id,origin,destination,id==='meteor'?.77:.72);
}
export function tickClaudeVfx(dt){if(!instance)return;try{instance.update(Math.max(0,Math.min(.05,Number(dt)||0)));}catch(e){console.warn('[Hinária] Falha VFX frame:',e);instance?.clear?.();}}
export function clearClaudeVfx(){instance?.clear?.();}
export function claudeVfxStats(){return instance?.stats()||{actors:0,particles:0};}
export function claudeVfxIds(){return instance?.list().map(e=>e.id)||[];}
