import {fitBowSupport,bindWeaponPose} from '../player/equipmentSockets.js';
/** HINÁRIA V7.8 — Interiores leves em uma cena 3D separada.
 * Mantém o mundo, missões e posições externas intactos enquanto o jogador entra.
 */
import * as THREE from 'three';
import {addSurface} from '../assets/hinariaTextures.js';
import { gameState } from '../core/gameState.js';
import { cutsceneCameraPass } from '../cutscene/cutsceneSystem.js';
import { CharacterAnimator } from '../player/characterAnimator.js';

let roomScene=null, roomCamera=null, interiorPlayer=null, roomId=null;
let px=0, pz=0;
let indoorAnimator=null, indoorActor=null, indoorHeading=Math.PI, indoorFootsteps=0;
const roomGeoCache=new Map(), roomMatCache=new Map();
const lerpAngle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;

let obstacles=[], inspectables=[];
let roomOwnedGeometry=[], roomOwnedMaterials=[], roomOwnedTextures=[];
let houseTransition='outside';
export function getHouseTransitionState(){return houseTransition;}
function houseFade(){
  if(typeof document==='undefined'||!document.body)return;
  let veil=document.getElementById('hinaria-house-fade');
  if(!veil){veil=document.createElement('div');veil.id='hinaria-house-fade';
    veil.style.cssText='position:fixed;inset:0;background:#070c15;pointer-events:none;opacity:0;z-index:51;transition:opacity .26s ease';
    document.body.append(veil);}
  veil.style.transition='none';veil.style.opacity='.85';
  void veil.offsetWidth;veil.style.transition='opacity .26s ease';veil.style.opacity='0';
}
const R=2.65;
const palette={
  'south tavern':{name:'Taverna de Vilarrubra',wall:0xa58c69,carpet:0x9d5342,wood:0x674a32},
  'chapel':{name:'Capela da Aurora',wall:0xc3b79e,carpet:0x8c6c54,wood:0x775939},
  'smith quarter':{name:'Casa do Ferreiro',wall:0x9a8773,carpet:0x7e4d36,wood:0x583d30},
  'western cottages':{name:'Casa do Bosque',wall:0xaf997b,carpet:0x507b5f,wood:0x765135},
  'western farm':{name:'Casa da Colheita',wall:0xb9a579,carpet:0x827448,wood:0x77533b},
  'artisan quarter':{name:'Casa do Artesão',wall:0xb7ad93,carpet:0x6d6c93,wood:0x674839},
  'eastern workshop':{name:'Oficina da Vila',wall:0xae967c,carpet:0x788a5f,wood:0x5e4637},
  'abandoned cabin':{name:'Cabana Abandonada',wall:0x837967,carpet:0x59694c,wood:0x4b3b2c}
};
function nearby() {
  const P=gameState.P;
  if (!P || gameState.insideHouse) return null;
  let result=null, best=2.5;
  for (const h of gameState.HO) {
    // Door is centered on the +Z facade. Distance to a thin door region
    // works even for a slightly diagonal approach on a mobile joystick.
    const doorZ=h.z+h.d/2+0.85;
    const lateral=Math.max(0,Math.abs(P.x-h.x)-0.9);
    const forward=Math.abs(P.z-doorZ);
    const d=Math.hypot(lateral,forward);
    if (d<best) { result=h;best=d; }
  }
  return result;
}
export function nearbyHouse() {return nearby();}
export function houseLabel(h){return (palette[h?.district]?.name)||'Casa de Vilarrubra';}
export function insideCabin() { return gameState.insideHouse && roomId?.district === 'abandoned cabin'; }
// A small baked-looking wooden grain map: procedural, deterministic, offline.
// Map is nearly white so it preserves the original style palette.
function indoorWoodGrain(){
  if(typeof document==='undefined'||!document.createElement)return null;
  const canvas=document.createElement('canvas');
  if(!canvas?.getContext)return null;
  canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d');if(!ctx)return null;
  ctx.fillStyle='#f2eee5';ctx.fillRect(0,0,64,64);
  for(let i=0;i<24;i++){
    const y=(i*13)%64;
    ctx.fillStyle=(i%3===0)?'rgba(80,55,30,.095)':'rgba(255,255,255,.18)';
    ctx.fillRect(0,y,64,i%4===0?2:1);
  }
  for(let i=0;i<10;i++){
    const x=(i*19)%64,y=(i*31)%64;
    ctx.strokeStyle='rgba(68,45,20,.06)';ctx.beginPath();
    ctx.ellipse(x,y,4+(i%3),1.5,0,0,Math.PI*2);ctx.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  roomOwnedTextures.push(texture);
  return texture;
}
const woodPalette=new Set([0x674a32,0x775939,0x583d30,0x765135,0x77533b,0x674839,0x5e4637,0x4b3b2c,
  0x8b6547,0x987453,0x795a42,0x6e4930,0x98734e,0x6b4b35,0x42372e,0x6d825f]);
let sharedIndoorWood=null;
function mat(color,metalness=0){
  const key=`${color}:${metalness}`;
  let m=roomMatCache.get(key);
  if(!m){
    m=new THREE.MeshStandardMaterial({color,roughness:.88,metalness});
    if(woodPalette.has(color)){
      // Tint retained; map is shared across furniture and floorboards.
      if(typeof addSurface==='function')addSurface(m,'wood_planks',{normal:true,strength:.12});
      else {sharedIndoorWood??=indoorWoodGrain();if(sharedIndoorWood)m.map=sharedIndoorWood;}
    } else if([0xa58c69,0xc3b79e,0x9a8773,0xaf997b,0xb9a579,0xb7ad93,0xae967c,0x837967,0xb2a080].includes(color)) {
      if(typeof addSurface==='function')addSurface(m,'plaster',{normal:true,strength:.10});
    } else if([0xaaaaa0,0x45372e,0xc1a67b,0xb4946a].includes(color)) {
      if(typeof addSurface==='function')addSurface(m,'rock',{normal:true,strength:.10});
    }
    roomMatCache.set(key,m);roomOwnedMaterials.push(m);
  }
  return m;
}
function box(group,x,y,z,w,h,d,color){
  // One unit-cube geometry shared by all furniture/architecture. Mesh.scale
  // defines the actual dimensions; static boxes may be instanced per material.
  let geometry=roomGeoCache.get('box');
  if(!geometry){geometry=new THREE.BoxGeometry(1,1,1);roomGeoCache.set('box',geometry);roomOwnedGeometry.push(geometry);}
  const m = new THREE.Mesh(geometry,mat(color));
  m.position.set(x,y,z); m.scale.set(w,h,d);group.add(m);return m;
}
function batchRoomBoxes(room){
  if(!THREE.InstancedMesh)return; // old testing stubs / fallback
  const cube=roomGeoCache.get('box');
  const byMaterial=new Map();
  for(const child of room.children){
    if(!child.isMesh||child.geometry!==cube)continue;
    if(!byMaterial.has(child.material))byMaterial.set(child.material,[]);
    byMaterial.get(child.material).push(child);
  }
  for(const [material,meshes] of byMaterial){
    if(meshes.length<2)continue;
    const batch=new THREE.InstancedMesh(cube,material,meshes.length);
    batch.name='HINARIA_InteriorStatic_Instanced';
    meshes.forEach((mesh,i)=>{mesh.updateMatrix();batch.setMatrixAt(i,mesh.matrix);room.remove(mesh);});
    batch.instanceMatrix.needsUpdate=true;
    batch.frustumCulled=false; // all small interior geometry, no incorrect partial bounding-sphere culling
    room.add(batch);
  }
}
function furnishingAccent(room,style){
  // Low-poly 3D accents shared by every house; all pieces are static and batchable.
  const amber=0xffd385, dark=0x4c3728, iron=0x515c5d;
  // Windowsills and timber rafters.
  box(room,0,.83,-2.48,1.27,.14,.26,style.wood);
  box(room,-1.5,2.37,-1.54,.19,.14,2.66,style.wood);
  box(room,1.5,2.37,-1.54,.19,.14,2.66,style.wood);
  box(room,0,2.37,-.25,5.72,.14,.18,style.wood);
  // Soft window glow inspired by baked-light room dioramas; no extra dynamic light.
  const windowGlow=box(room,0,1.38,-2.425,.78,.68,.012,0xffd99b);
  const sideGlow=box(room,-2.965,1.22,-.12,.012,.54,.78,0xf8d79a);
  // Reuse our established MeshStandardMaterial path, including legacy renderer stubs.
  for(const pane of [windowGlow,sideGlow]) if(pane.material){
    pane.material.transparent=true;
    pane.material.opacity=.27;
    pane.material.depthWrite=false;
    pane.material.emissive?.setHex?.(0xffae55);
    pane.material.emissiveIntensity=.38;
  }
  // A warm lantern suspended from the back beam.
  box(room,-.04,1.98,-2.53,.17,.36,.16,iron);
  box(room,-.04,1.98,-2.43,.125,.23,.055,amber);
  box(room,-.04,2.29,-2.51,.04,.25,.045,dark);
  // Small decorative weaving + door threshold.
  box(room,-1.76,1.53,-2.86,.62,.58,.060,style.wood);
  box(room,-1.76,1.53,-2.81,.49,.45,.035,style.carpet);
  box(room,0,.012,2.46,1.55,.032,.29,0xb4946a);
  box(room,2.15,1.86,-2.88,1.35,.12,.09,style.wood);
  for(let i=0;i<4;i++)box(room,1.72+i*.28,2.08,-2.82,.15,.28,.12,i%2?0x8d6f45:0x6b8a5d);
  box(room,2.20,.58,2.35,.36,.56,.36,0x9d7c58);
  box(room,2.20,.93,2.35,.46,.13,.46,0x5f7f53);
  box(room,2.20,1.13,2.35,.24,.28,.24,0xd8bd79);
  if(THREE.PointLight){const light=new THREE.PointLight(0xffd6a1,.72,4.9,2);light.position.set(-.06,1.94,-1.95);room.add(light);}
}

// Do not call Object3D.clone(true) on gameplay actors: Three.js JSON-copies userData,
// which includes cyclic references from actor -> mesh -> actor in HINÁRIA.
// This creates only a renderable, independent scene hierarchy and shares GPU assets.
export function cloneHouseAvatar(source) {
  if (!source || !source.isObject3D) throw new TypeError('Avatar 3D indisponível');
  // A THREE.Object3D.clone(true) calls JSON.stringify on userData and crashes on
  // circular player references. Recreate the render tree and map ONLY rig pivots.
  const nodes=new WeakMap();
  function copy(node) {
    let result;
    if (node.isSkinnedMesh) result = new THREE.Mesh(node.geometry,node.material);
    else if (node.isMesh) result = new THREE.Mesh(node.geometry,node.material);
    else if (node.isSprite) result = new THREE.Sprite(node.material);
    else if (node.isLineSegments) result = new THREE.LineSegments(node.geometry,node.material);
    else if (node.isLine) result = new THREE.Line(node.geometry,node.material);
    else if (node.isPoints) result = new THREE.Points(node.geometry,node.material);
    else result = new THREE.Group();
    nodes.set(node,result);
    result.name=node.name;
    result.position.copy(node.position); result.quaternion.copy(node.quaternion);
    result.scale.copy(node.scale); result.visible=node.visible;
    result.castShadow=node.castShadow; result.receiveShadow=node.receiveShadow;
    result.userData={};
    if(node.userData?.equipment)result.userData.equipment={...node.userData.equipment,grip:[...node.userData.equipment.grip],restQuaternion:node.userData.equipment.restQuaternion?[...node.userData.equipment.restQuaternion]:undefined};
    if(Number.isFinite(node.userData?.p))result.userData.p=node.userData.p;
    for (const child of node.children) result.add(copy(child));
    return result;
  }
  const avatar=copy(source);
  const sourceRig=source.userData?.r;
  if(sourceRig?.unit && Array.isArray(sourceRig.legs)){
    const pivot=o=>o&&nodes.get(o)||null;
    const rig={
      unit:pivot(sourceRig.unit),legs:sourceRig.legs.map(pivot),
      armR:pivot(sourceRig.armR),armL:pivot(sourceRig.armL),
      head:pivot(sourceRig.head),cape:pivot(sourceRig.cape),tail:pivot(sourceRig.tail),
      aim:!!sourceRig.aim,sit:false,amp:sourceRig.amp??.7,sw:sourceRig.sw??1.9,
      weapon:pivot(sourceRig.weapon),shield:pivot(sourceRig.shield),
      rightHandGrip:pivot(sourceRig.rightHandGrip),leftHandGrip:pivot(sourceRig.leftHandGrip),
      supportTarget:pivot(sourceRig.supportTarget),capes:(sourceRig.capes||[]).map(pivot).filter(Boolean),
      bindY:sourceRig.bindY||0,capeRest:sourceRig.capeRest||0,visualKind:sourceRig.visualKind,
      handOffset:sourceRig.handOffset?[...sourceRig.handOffset]:undefined
    };
    if(typeof bindWeaponPose==='function')bindWeaponPose(rig);
    if(rig.aim && typeof fitBowSupport==='function')rig.fitSupport=(draw,alpha)=>fitBowSupport(rig,draw,alpha);
    if(rig.unit && rig.legs.some(Boolean))avatar.userData.r=rig;
  }
  return avatar;
}

function inspectable(x,z,label,description){inspectables.push({x,z,label,description});}
function detailProps(room, h, style){
  // Lightweight district-specific props: visual and readable, without quests or loot duplication.
  const wood=style.wood;
  if (h.district==='smith quarter'||h.district==='eastern workshop'||h.district==='artisan quarter') {
    // Workbench, anvil and smithing tools.
    box(room,2.10,.65,-.08,.73,.12,.9,wood);
    box(room,2.10,.95,-.07,.42,.38,.28,0x63727b);
    box(room,1.95,1.18,-.08,.56,.09,.18,0xb0b8bb);
    for(let i=0;i<3;i++)box(room,2.25,.94,-.43+i*.25,.07,.50,.065,0x949fa5);
    box(room,1.75,1.54,-.03,1.08,.10,.26,wood);
    for(let i=0;i<4;i++)box(room,1.40+i*.22,1.72,-.03,.08,.28,.08,i%2?0xc7d0d6:0x83684f);
    if (h.district==='artisan quarter') {
      box(room,1.86,.42,1.72,.98,.10,.34,0x8d6f51);
      box(room,1.86,.64,1.72,.76,.28,.08,style.carpet);
      box(room,1.86,.72,1.52,.12,.44,.12,0x6a5540);
    }
    obstacles.push([1.67,2.57,-.56,.43]);
    inspectable(1.55,.60,'Bancada de trabalho','Ferramentas de Bram. Ferro frio, martelos e marcas de muitos reparos.');
  } else if (h.district==='south tavern') {
    // Bar counter, casks and a tiny guest table like an isometric tavern diorama.
    box(room,1.87,.61,.15,1.10,.20,.66,wood);
    for(let i=0;i<3;i++)box(room,2.20,.44,-1.76+i*.56,.42,.84,.42,0x745437);
    box(room,1.69,.83,.14,.15,.20,.16,0xb3a16f);
    box(room,.86,.55,1.55,.72,.12,.72,wood);
    box(room,.60,.31,1.28,.24,.48,.24,0x7a573d);
    box(room,1.13,.31,1.28,.24,.48,.24,0x7a573d);
    box(room,.86,.78,1.55,.14,.18,.14,0xc7b27c);
    obstacles.push([1.22,2.47,-.17,.56]);
    inspectable(1.45,.72,'Balcão da taverna','Cheiro de madeira, pão quente e histórias de viajantes.');
  } else if (h.district==='chapel') {
    box(room,0,.69,-1.83,1.27,1.18,.54,0xaaaaa0);
    box(room,0,1.43,-1.83,.85,.06,.42,0xe3c78c);
    for(const x of [-.3,.3])box(room,x,1.67,-1.75,.11,.40,.11,0xffdb88);
    for(const z of [-.75,.10,.95]) box(room,0,.48,z,1.55,.16,.30,0x7b6244);
    box(room,0,1.34,-2.84,.22,.76,.05,0x7aa0b1);
    box(room,0,1.34,-2.80,.07,.72,.07,0xe7d38d);
    box(room,0,1.34,-2.80,.22,.07,.07,0xe7d38d);
    obstacles.push([-.78,.78,-2.36,-1.38]);
    inspectable(0,-1.05,'Altar da Aurora','Um lugar silencioso para refletir antes da jornada.');
  } else if (h.district==='abandoned cabin') {
    box(room,1.63,.84,-.71,.40,.07,.34,0xe2d5a9);
    box(room,1.63,.87,-.70,.31,.025,.22,0x4f4230);
    box(room,-.88,.22,1.62,.88,.08,.62,0x6a513f);
    inspectable(1.12,-.20,'Diário de Garrick','As páginas antigas lembram a investigação da Cabana Abandonada.');
  } else {
    box(room,2.24,.62,-1.85,.68,.12,.72,wood);
    for(let i=0;i<3;i++)box(room,2.23,.78,-1.98+i*.19,.14,.18,.12,i%2?0x9d7144:0x5b985e);
    box(room,-.20,.82,2.05,1.05,.10,.18,0x8f704e);
    inspectable(1.67,-1.23,'Provisões da casa','Mantimentos organizados para os próximos dias.');
  }
  // Books and shelving use no extra render loop / no special game resources.
  for(let i=0;i<5;i++)box(room,-2.01,1.16,.34+i*.15,.16,.34,.12,i%2?0x9c6138:0x567f74);
  inspectable(-1.50,.71,'Estante','Mapas e livros antigos de Vilarrubra.');
  inspectable(1.15,1.35,'Baú','Um baú particular. Melhor não mexer nas coisas dos moradores.');
}
function releaseRoom(){
  for(const geometry of roomOwnedGeometry)geometry.dispose?.();
  for(const material of roomOwnedMaterials)material.dispose?.();
  for(const texture of roomOwnedTextures)texture.dispose?.();
  roomOwnedGeometry=[]; roomOwnedMaterials=[];roomOwnedTextures=[];sharedIndoorWood=null;
  roomGeoCache.clear();roomMatCache.clear();
  roomScene=null; roomCamera=null; interiorPlayer=null; roomId=null;
  indoorAnimator=null;indoorActor=null;
  obstacles=[]; inspectables=[];
}
export function inspectHouseObject(){
  if(!gameState.insideHouse)return false;
  let closest=null,dist=1.6;
  for(const item of inspectables){const d=Math.hypot(px-item.x,pz-item.z);if(d<dist){dist=d;closest=item;}}
  const hint=document.getElementById('house-hint');
  if(hint){
    const text=closest ? `${closest.label}: ${closest.description}` : 'Chegue mais perto dos móveis para examinar. F: sair.';
    hint.textContent=text;
    houseHintTimer=5;
  }
  return !!closest;
}
let houseHintTimer=0;

function furnishings(group, colors) {
  const {wood,carpet}=colors;
  // Pillow, blanket and thick bed frame.
  box(group,-1.7,.21,-.95,1.35,.36,1.75,wood);
  box(group,-1.7,.42,-1.18,1.18,.13,1.16,carpet);
  box(group,-1.7,.45,-.34,1.18,.17,.42,0xdfcfb0);
  obstacles.push([-2.45,-.95,-1.95,-.04]);
  // Table with legs and two simple stools.
  box(group,1.18,.62,-1.1,1.2,.18,.87,wood);
  for(const x of [.75,1.60])for(const z of [-1.42,-.79])box(group,x,.31,z,.13,.56,.12,wood);
  box(group,1.25,.27,.18,.55,.52,.55,0x98734e);
  obstacles.push([.5,1.84,-1.65,-.56]);
  // Bookcase and drawers on left wall.
  box(group,-2.25,.92,.7,.37,1.75,.95,wood);
  for(const z of [.4,.68,.96])box(group,-2.02,.65,z,.08,.55,.15,0x8a6737);
  // Rug, chest, door on the front side.
  box(group,0,.041,0,1.9,.02,2.2,carpet);
  box(group,1.85,.3,1.50,.78,.58,.64,wood);
  box(group,1.85,.65,1.50,.82,.12,.69,0xb49b5d);
  obstacles.push([1.36,2.32,1.1,1.99]);
  // Windows on rear wall and wall trim.
  box(group,0,1.38,-2.56,1.0,1.0,.05,0x46667d);
  box(group,0,1.37,-2.49,.09,1.05,.07,wood);
  box(group,0,1.37,-2.47,1.05,.09,.07,wood);
  // Open-door DIORAMA: the old full-height door PANEL stood between camera and
  // player, hiding the avatar. Keep only jambs, lintel and ground threshold.
  for(const side of [-1,1])box(group,side*.69,1.1,2.55,.15,2.08,.16,0x6e4930);
  box(group,0,2.17,2.55,1.53,.19,.18,0x6e4930);
  box(group,0,.015,2.45,1.50,.04,.34,0xc1a67b);
  // Little house-details: books, bedside lantern and framed local landscape.
  box(group,-1.24,.76,-1.75,.22,.26,.19,0xe6c274);
  box(group,-1.24,.96,-1.75,.18,.18,.17,0xffd99b);
  box(group,1.17,1.5,-2.88,1.02,.63,.10,0x6b4b35);
  box(group,1.17,1.5,-2.79,.87,.46,.045,0x557e8c);
  box(group,1.17,1.35,-2.75,.87,.12,.050,0x436d51);
  for(let i=0;i<3;i++)box(group,-2.06,1.28,-.16+i*.23,.13,.28,.15,[0x6d825f,0x98694e,0x3b6d87][i]);
}
function buildRoom(h){
  const style=palette[h.district]||{name:'Casa de Vilarrubra',wall:0xb2a080,carpet:0x8a6853,wood:0x674730};
  releaseRoom();
  roomScene=new THREE.Scene();roomScene.background=new THREE.Color(0x252c33);
  roomScene.add(new THREE.HemisphereLight(0xe2f2ff,0x817258,1.45));
  const sun=new THREE.DirectionalLight(0xffe9c9,1.5);sun.position.set(-3,8,5);roomScene.add(sun);
  const room=new THREE.Group();roomScene.add(room);
  box(room,0,-.20,0,6.3,.30,6,0x45372e);
  // Plank floor rather than one featureless rectangle. Geometry and materials are cached.
  for(let i=0;i<13;i++){
    const x=-2.88+i*.48;
    box(room,x,-.045,0,.465,.055,5.95,i%4===0?0x8b6547:i%3===0?0x987453:0x795a42);
    if(i%3===0){box(room,x,-.012,-1.35,.015,.012,.06,0x42372e);box(room,x,-.012,1.33,.015,.012,.06,0x42372e);}
  }
  // Three walls: open towards the player/camera, so interior never disappears behind a front wall.
  box(room,-3.12,1.25,0,.2,2.6,6.25,style.wall);
  box(room,3.12,1.25,0,.2,2.6,6.25,style.wall);
  box(room,0,1.25,-3.02,6.3,2.6,.2,style.wall);
  box(room,0,2.5,-2.83,6.3,.2,.22,0x63452e);
  for(const x of [-2.95,2.95])box(room,x,1.25,-2.88,.24,2.5,.22,style.wood);
  // Timber frame, wainscot and horizontal rafters create recognizable interior scale.
  for(const z of [-2.7,-.95,.8,2.53])for(const x of [-3.02,3.02])box(room,x,1.27,z,.125,2.49,.15,style.wood);
  for(const x of [-3.04,3.04]){
    box(room,x,.48,0,.09,.12,5.9,style.wood);
    box(room,x,2.33,0,.09,.12,5.9,style.wood);
  }
  for(const x of [-2.3,0,2.3])box(room,x,2.43,-2.96,.18,.26,.19,style.wood);
  box(room,0,.44,-2.90,5.88,.12,.14,style.wood);
  box(room,0,2.31,-2.90,5.88,.13,.14,style.wood);
  for(const z of [-2.1,-.7,.7,2.1]) box(room,0,2.48,z,5.7,.12,.16,style.wood);
  furnishings(room,style);
  detailProps(room,h,style);
  furnishingAccent(room,style);
  batchRoomBoxes(room);
  interiorPlayer=cloneHouseAvatar(gameState.P.mesh);
  px=0;pz=1.85;indoorHeading=Math.PI;indoorFootsteps=0;
  interiorPlayer.position.set(px,0,pz);
  interiorPlayer.rotation.y=indoorHeading;
  roomScene.add(interiorPlayer);
  // Use the game's same CharacterAnimator on an isolated mapped rig. No RAF duplication.
  const cloneRig=interiorPlayer.userData?.r;
  indoorActor={kind:'house',x:px,z:pz,hp:1,at:0,fl:0,mesh:interiorPlayer};
  indoorAnimator=(cloneRig && typeof CharacterAnimator!=='undefined')?new CharacterAnimator(cloneRig):null;
  roomCamera=new THREE.PerspectiveCamera(42,1,.1,40);
  roomCamera.position.set(2.55,4.55,6.9);
  roomCamera.lookAt(0,1.0,0);
  const hElement=document.getElementById('house-hint');
  if(hElement)hElement.textContent=`⌂ ${style.name} · WASD/analógico · E: examinar · F: sair`;
  houseHintTimer=0;
}
function toggleInspectButton(visible){
  if (typeof document?.createElement!=='function' || !document.body) return;
  let button=document.getElementById('house-inspect-btn');
  if (!button && visible){
    button=document.createElement('button');
    button.id='house-inspect-btn';button.type='button';button.textContent='🔎 Examinar';
    button.setAttribute('aria-label','Examinar objetos próximos na casa');
    button.addEventListener('click',inspectHouseObject);
    document.body.appendChild(button);
  }
  if(button)button.classList.toggle('on',visible);
}
export function enterHouse(h=nearby()){
  if(!h || houseTransition!=='outside' || gameState.insideHouse || gameState.ccOpen || gameState.arsenalOpen)return false;
  houseTransition='entering';
  try { buildRoom(h);roomId=h; } catch(error) { console.error('[Hinária] Erro ao abrir interior:', error);releaseRoom();houseTransition='outside';return false; }
  gameState.insideHouse=true;
  if(gameState.P.path)gameState.P.path.length=0;
  gameState.tgt=null;
  gameState.keys={};gameState.jx=gameState.jz=0;
  document.getElementById('house-hint')?.classList.add('on');
  toggleInspectButton(true);
  houseFade();
  houseTransition='inside';
  return true;
}
export function leaveHouse(){
  if(!gameState.insideHouse || houseTransition!=='inside')return;
  houseTransition='exiting';
  gameState.insideHouse=false;
  gameState.keys={};gameState.jx=gameState.jz=0;
  releaseRoom();
  document.getElementById('house-hint')?.classList.remove('on');
  toggleInspectButton(false);
  houseFade();
  houseTransition='outside';
}
function isBlocked(x,z){
  if(Math.abs(x)>R || Math.abs(z)>2.4) return true;
  return obstacles.some(([x0,x1,z0,z1])=>x>x0-.23 && x<x1+.23 && z>z0-.23 && z<z1+.23);
}
export function tickHouse(dt){
  if(!gameState.insideHouse||!roomScene||!roomCamera)return;
  const P=gameState.P,k=gameState.keys;
  if(houseHintTimer>0){
    houseHintTimer=Math.max(0,houseHintTimer-dt);
    if(!houseHintTimer){const el=document.getElementById('house-hint');if(el)el.textContent=`⌂ ${houseLabel(roomId)} · E: examinar · F: sair`;}
  }
  let vx=(k.d||k.ArrowRight?1:0)-(k.a||k.ArrowLeft?1:0)+(gameState.jx||0);
  let vz=(k.s||k.ArrowDown?1:0)-(k.w||k.ArrowUp?1:0)+(gameState.jz||0);
  const len=Math.hypot(vx,vz);if(len>1){vx/=len;vz/=len;}
  const step=Math.max(0,Math.min(.05,dt)),speed=2.45;
  const oldX=px,oldZ=pz;
  // Separate axis collision keeps sliding along tables/walls without teleportation.
  const x=px+vx*step*speed,z=pz+vz*step*speed;
  if(!isBlocked(x,pz))px=x;
  if(!isBlocked(px,z))pz=z;
  const travelled=Math.hypot(px-oldX,pz-oldZ);
  interiorPlayer.position.set(px,0,pz);
  if(travelled>.0002){
    const desired=Math.atan2(px-oldX,pz-oldZ);
    indoorHeading=lerpAngle(indoorHeading,desired,1-Math.exp(-step*12));
  }
  interiorPlayer.rotation.y=indoorHeading;
  // Animate the DISPLAYED house avatar, never the outdoor character/saved entity.
  if(indoorAnimator && indoorActor){
    indoorActor.x=px;indoorActor.z=pz;
    indoorAnimator.update(indoorActor,step);
  } else if(interiorPlayer.userData?.r?.unit){
    // Defensive fallback for rigs that differ from the standard animator.
    const unit=interiorPlayer.userData.r.unit;
    indoorFootsteps=travelled>.0002?indoorFootsteps+step*9:0;
    unit.position.y+=(Math.sin(indoorFootsteps)*.017-unit.position.y)*Math.min(1,step*12);
  }
  const canvas=gameState.renderer.domElement;
  const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;
  roomCamera.aspect=w/h;roomCamera.updateProjectionMatrix();
  // Fixed-room isometric framing blended with the player to avoid a jerky camera.
  const blend=1-Math.exp(-step*5);
  const desiredX=2.55+px*.26,desiredY=4.5,desiredZ=6.85+pz*.19;
  roomCamera.position.set(
    roomCamera.position.x+(desiredX-roomCamera.position.x)*blend,
    roomCamera.position.y+(desiredY-roomCamera.position.y)*blend,
    roomCamera.position.z+(desiredZ-roomCamera.position.z)*blend
  );
  roomCamera.lookAt(px*.48,1.03,pz*.37);
  if (gameState.cutsceneActive) cutsceneCameraPass(roomCamera);
  gameState.renderer.render(roomScene,roomCamera);
}

/** Interior coordinates belong to the room; P.x/z always remain outdoors. */
export function houseSnapshot() {
 return gameState.insideHouse && roomId ? {x:roomId.x,z:roomId.z,px,pz,heading:indoorHeading} : null;
}
export function restoreHouse(saved) {
 if(!saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.z))return false;
 const house=gameState.HO.find(h=>h.x===saved.x && h.z===saved.z);
 if(!house || !enterHouse(house))return false;
 if(Number.isFinite(saved.px) && Number.isFinite(saved.pz) && !isBlocked(saved.px,saved.pz)) {px=saved.px;pz=saved.pz;}
 if(Number.isFinite(saved.heading))indoorHeading=saved.heading;
 tickHouse(0);return true;
}
