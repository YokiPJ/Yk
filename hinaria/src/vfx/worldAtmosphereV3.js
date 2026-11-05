/** HINÁRIA Visual V3 — lightweight world atmosphere.
 * Original implementation inspired by FreeFrontend's procedural-particle examples.
 * One draw call, deterministic motes, no CDN/assets or global RAF.
 */
import * as THREE from 'three';

let motes=null, scene=null, tickAccumulator=0;
let enabled=true, reducedMotion=false, basePositions=null, motionQuery=null;
let onMotionChange=null, onSettingsChange=null, onVisibilityChange=null;
function refreshVisibility(){
  if(motes)motes.visible=enabled&&!reducedMotion&&!(typeof document!=='undefined'&&document.hidden);
  tickAccumulator=0;
}
function installMotionPreferences(){
  motionQuery=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
  const override=typeof document!=='undefined'?document.documentElement?.dataset?.reduceMotion:undefined;
  reducedMotion=override==='true'||(override!=='false'&&!!motionQuery?.matches);
  onMotionChange=event=>{
    const selected=typeof document!=='undefined'?document.documentElement?.dataset?.reduceMotion:undefined;
    if(selected!=='true'&&selected!=='false')reducedMotion=event.matches;
    refreshVisibility();
  };
  onSettingsChange=event=>{if(typeof event.detail?.reducedMotion==='boolean')reducedMotion=event.detail.reducedMotion;refreshVisibility();};
  onVisibilityChange=refreshVisibility;
  motionQuery?.addEventListener?.('change',onMotionChange);
  if(typeof window!=='undefined')window.addEventListener?.('hinaria:settingschange',onSettingsChange);
  if(typeof document!=='undefined')document.addEventListener?.('visibilitychange',onVisibilityChange);
}
const mobile=typeof navigator!=='undefined'&&(
  (navigator.maxTouchPoints||0)>0 || (typeof matchMedia==='function' && matchMedia('(pointer:coarse)').matches));
const count=mobile?14:26;
const seedNoise=(i,offset=0)=>{
  const n=Math.sin((i+1)*12.9898+offset*78.233)*43758.5453;
  return n-Math.floor(n);
};

export function initializeVisualAtmosphere(worldScene){
  if(!worldScene||motes)return;
  scene=worldScene;
  const xyz=new Float32Array(count*3),colors=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    xyz[i*3]=(seedNoise(i,1)-.5)*13;
    xyz[i*3+1]=.45+seedNoise(i,2)*3.4;
    xyz[i*3+2]=(seedNoise(i,3)-.5)*13;
    const warm=seedNoise(i,4)>.73;
    colors[i*3]=warm?1:.58;
    colors[i*3+1]=warm?.80:.83;
    colors[i*3+2]=warm?.45:1;
  }
  basePositions=xyz.slice(); // Cache seeded bases; only three motion terms per particle at runtime.
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(xyz,3));
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const material=new THREE.PointsMaterial({size:mobile?.065:.078,vertexColors:true,
    transparent:true,opacity:.55,depthWrite:false,
    sizeAttenuation:true,blending:THREE.AdditiveBlending});
  motes=new THREE.Points(geometry,material);
  motes.name='HinariaV3_PoeiraAmbiental';
  motes.frustumCulled=false; // tiny localized particles follow the player
  scene.add(motes);
  installMotionPreferences();
  refreshVisibility();
}
export function setVisualAtmosphereEnabled(next){enabled=Boolean(next);refreshVisibility();}
export function visualAtmosphereEnabled(){return enabled;}
export function tickVisualAtmosphere(player,dt,gameTime=0){
  if(!motes||!player||!motes.visible||!(dt>0)||!Number.isFinite(dt)||!Number.isFinite(gameTime)||!Number.isFinite(player.x)||!Number.isFinite(player.z))return;
  const elevation=Number.isFinite(player.mesh?.position?.y)?player.mesh.position.y:(Number.isFinite(player.y)?player.y:0);
  motes.position.set(player.x,elevation,player.z);
  tickAccumulator+=Math.max(0,Math.min(dt,.05));
  if(tickAccumulator<.047)return;
  tickAccumulator=0;
  const attribute=motes.geometry.getAttribute('position');
  for(let i=0;i<count;i++){
    const j=i*3;
    attribute.array[j]=basePositions[j] + Math.sin(gameTime*.23+i*1.71)*.30;
    attribute.array[j+1]=basePositions[j+1] + Math.sin(gameTime*.67+i*1.25)*.13;
    attribute.array[j+2]=basePositions[j+2] + Math.cos(gameTime*.20+i*2.39)*.30;
  }
  attribute.needsUpdate=true;
}
export function disposeVisualAtmosphere(){
  if(motes){motes.parent?.remove(motes);motes.geometry.dispose();motes.material.dispose();motes=null;}
  motionQuery?.removeEventListener?.('change',onMotionChange);
  if(typeof window!=='undefined')window.removeEventListener?.('hinaria:settingschange',onSettingsChange);
  if(typeof document!=='undefined')document.removeEventListener?.('visibilitychange',onVisibilityChange);
  scene=null; basePositions=null; motionQuery=null; tickAccumulator=0;
  onMotionChange=onSettingsChange=onVisibilityChange=null;
}
