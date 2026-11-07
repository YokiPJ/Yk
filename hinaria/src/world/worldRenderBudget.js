/** Bounded local lighting and reversible decoration quality for the world. */
import * as THREE from 'three';
import {addSurface} from '../assets/hinariaTextures.js';

const cheapMaterials=new WeakMap(),originalMaterials=new WeakMap();
function materialAtQuality(material,highDetail){
  const original=originalMaterials.get(material)||material;
  if(!original.isMeshStandardMaterial||!original.userData.worldQuality)return material;
  // Animation callbacks may retain the original material reference. Only
  // opaque decorations with static material properties can use cached clones.
  if(original.transparent||original.userData.dynamicMaterial)return original;
  if(highDetail){
    const normal=original.userData.worldNormalSurface;
    if(normal&&!original.normalMap)addSurface(original,normal.name,{...normal,normal:true});
    return original;
  }
  if(!cheapMaterials.has(original)){
    const cheap=new THREE.MeshLambertMaterial();
    for(const key of ['name','map','lightMap','lightMapIntensity','aoMap','aoMapIntensity',
      'emissiveMap','emissiveIntensity','alphaMap','transparent','opacity','alphaTest',
      'side','shadowSide','flatShading','vertexColors','fog','depthWrite','depthTest',
      'polygonOffset','polygonOffsetFactor','polygonOffsetUnits','dithering'])
      cheap[key]=original[key];
    cheap.color.copy(original.color);cheap.emissive.copy(original.emissive);
    cheap.userData={...original.userData,worldLowDetail:true};
    cheapMaterials.set(original,cheap);originalMaterials.set(cheap,original);
  }
  return cheapMaterials.get(original);
}
export function applyWorldMaterialBudget(root,{highDetail=false}={}){
  let changed=0;
  root?.traverse(object=>{
    if(!object.isMesh||!object.material)return;
    if(Array.isArray(object.material)){
      object.material=object.material.map(material=>{
        const next=materialAtQuality(material,highDetail);if(next!==material)changed++;return next;
      });
    }else{
      const next=materialAtQuality(object.material,highDetail);
      if(next!==object.material){object.material=next;changed++;}
    }
  });
  return {highDetail:!!highDetail,changed};
}

function ancestorsVisible(object,root){
  // Managed originals are intentionally hidden; their parents still determine eligibility.
  for(let node=object.parent;node;node=node.parent){
    if(!node.visible)return false;
    if(node===root)return true;
  }
  return false;
}
/** A fixed pool keeps NUM_POINT_LIGHTS stable as the player changes districts.
 * Original emitters retain their live position/intensity and never enter shaders.
 * Only explicitly tagged world decorations are managed; NPC/interior lights stay owned by their scenes.
 */
export function createWorldLightBudget(scene,{maxLights=3,maxDistance=18}={}){
  const sources=[],pool=[],candidates=[],position=new THREE.Vector3();
  let selected=[],lastSelection=-Infinity,lastX=NaN,lastZ=NaN,disposed=false;
  scene.traverse(light=>{
    if(!light.isPointLight||!light.userData.worldLocalLight||light.userData.worldLightPool)return;
    sources.push({light,visible:light.visible,position:new THREE.Vector3(),score:0});light.visible=false;
  });
  function setBudget(value){
    const count=Math.max(0,Math.min(8,Math.floor(Number(value)||0)));
    if(pool.length===count||disposed)return;
    for(const light of pool)light.removeFromParent();pool.length=0;
    for(let i=0;i<count;i++){
      const light=new THREE.PointLight(0xffffff,0,1,2);
      light.name='WorldLocalLightPool';light.userData.worldLightPool=true;
      // Slots stay visible even at zero intensity: movement cannot change shader variants.
      scene.add(light);pool.push(light);
    }
    selected=[];lastSelection=-Infinity;
  }
  function update(x,z,now){
    // Keep the optional method call inside the body. The Chrome 80 lowering of
    // this expression in a default parameter can lose its receiver temporary.
    if(now===undefined)now=globalThis.performance?.now?.()??0;
    if(disposed||!Number.isFinite(x)||!Number.isFinite(z))return;
    if(now-lastSelection>=120||Math.abs(x-lastX)+Math.abs(z-lastZ)>.5){
      candidates.length=0;
      for(const source of sources){
        if(!source.visible||!ancestorsVisible(source.light,scene)||source.light.intensity<=0)continue;
        source.light.getWorldPosition(source.position);
        const distance=(source.position.x-x)**2+(source.position.z-z)**2;
        if(distance>maxDistance*maxDistance)continue;
        source.score=distance*(selected.includes(source)?.8:1);
        candidates.push(source);
      }
      candidates.sort((a,b)=>a.score-b.score);selected=candidates.slice(0,pool.length);
      lastSelection=now;lastX=x;lastZ=z;
    }
    for(let i=0;i<pool.length;i++){
      const source=selected[i],light=pool[i];
      if(!source||!ancestorsVisible(source.light,scene)){light.intensity=0;continue;}
      source.light.getWorldPosition(position);light.position.copy(position);
      light.color.copy(source.light.color);light.intensity=source.light.intensity;
      light.distance=source.light.distance;light.decay=source.light.decay;
    }
  }
  function diagnostics(){return {sources:sources.length,slots:pool.length,active:pool.filter(light=>light.intensity>0).length};}
  function dispose(){
    if(disposed)return;disposed=true;
    for(const light of pool)light.removeFromParent();pool.length=0;
    for(const source of sources)source.light.visible=source.visible;
    selected=[];
  }
  setBudget(maxLights);
  return {update,setBudget,diagnostics,dispose};
}
