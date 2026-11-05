/** HINÁRIA — shared offline texture atlas loader (Three.js r160).
 * Lazy loading, shared textures, retained tint, no network/CDN and graceful fallback.
 * Textures are intentionally not applied to merged vertex-color meshes because
 * different surfaces within a merged mesh need different UV/material assignments.
 */
import * as THREE from 'three';
const textureCache = new Map();
const ROOT = './assets/textures/';
export const GROUND_TEXTURES = Object.freeze({0:'grass',1:'dirt_path',2:'cobblestone',3:'water',4:'wood_planks',5:'forest_floor',6:'danger_ground',7:'ruin_tiles',8:'cave_rock',9:'sand'});
const known = new Set('grass dirt_path cobblestone water wood_planks forest_floor danger_ground ruin_tiles cave_rock sand foliage bark rock plaster roof_tiles thatch crate_wood canopy_stripes ember_fire crystal rune_stone mirror leather cloth_linen cloth_white cloth_blue cloth_violet cloth_crimson leaf_pattern fur skin_human skin_orc skin_troll bone metal_silver metal_gold metal_iron metal_rust'.split(' '));
function tex(name, kind, repeat=1) {
  if(!known.has(name))return null;
  const key=`${kind}:${name}:${repeat}`;
  if(textureCache.has(key))return textureCache.get(key);
  const file=kind==='normal'?`normais/${name}_n.png`:`texturas/${name}.png`;
  const loader=new THREE.TextureLoader();
  const texture=loader.load(ROOT+file,undefined,undefined,()=>console.warn('[Hinária] textura ausente:',file));
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(repeat,repeat);
  texture.anisotropy=2;
  if(kind==='color')texture.colorSpace=THREE.SRGBColorSpace;
  textureCache.set(key,texture);
  return texture;
}
export function addSurface(material,name,{repeat=1,normal=false,strength=.27,neutral=false}={}){
  if(!material||!known.has(name))return material;
  material.map=tex(name,'color',repeat);
  if(normal && (material.isMeshStandardMaterial||material.isMeshPhongMaterial)){
    material.normalMap=tex(name,'normal',repeat);
    material.normalScale=new THREE.Vector2(strength,strength);
  }
  if(neutral && material.color?.setHex)material.color.setHex(0xffffff);
  material.needsUpdate=true;
  return material;
}
/** Optional source for the existing large, tile-painted ground canvas. */
export function decorateTerrainCanvas(canvas,grid,size,onUpdate){
  if(typeof Image==='undefined'||!canvas?.getContext)return;
  const ctx=canvas.getContext('2d');
  const skip=new Set([3,4]); // river and bridges have separate geometry
  for(const [id,name] of Object.entries(GROUND_TEXTURES)){
    const type=Number(id);
    if(skip.has(type))continue;
    const img=new Image();
    img.onload=()=>{
      ctx.save();ctx.globalAlpha=(type===2||type===7||type===8)?.26:.20;
      const tw=type===2?2:1;
      for(let x=0;x<size;x++)for(let z=0;z<size;z++){
        if(grid[x]?.[z]!==type)continue;
        // Keep town-square ring and quest landmarks unobscured.
        if(Math.hypot(x-13,z-15)<4.3)continue;
        ctx.drawImage(img,((x+z)%tw)*(img.width/tw),0,img.width/tw,img.height,x*16,z*16,16,16);
      }
      ctx.restore();onUpdate?.();
    };
    img.onerror=()=>console.warn('[Hinária] textura de terreno ausente:',name);
    img.src=ROOT+'texturas/'+name+'.png';
  }
}
