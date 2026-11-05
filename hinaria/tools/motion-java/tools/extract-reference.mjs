// Preparation only: copy the real static HINÁRIA geometry and semantic pivots.
// All animation samples and GLB files are generated later by Java.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
const root=fileURLToPath(new URL('../',import.meta.url));
const source=process.argv[2];
if(!source)throw new Error('Usage: node tools/extract-reference.mjs /path/to/hinaria');
const {batchArticulatedModel}=await import(pathToFileURL(path.join(source,'src/modelsV2/batch.js')).href);
const names=['Cavaleiro','Paladino','Feiticeiro','Druida','Bandido','Esqueleto','Orc'];
const models=[],evidence=[];
for(const name of names){
 const file=path.join(source,'src/modelsV2',name+'.js');
 const {createModel}=await import(pathToFileURL(file).href);
 const model=batchArticulatedModel(createModel()),rig=model.userData.r;
 if(!rig?.unit||!rig.armR||!rig.armL||rig.legs.length!==2)throw new Error('Unsupported humanoid rig: '+name);
 const objects=[];model.traverse(o=>objects.push(o));
 const index=new Map(objects.map((o,i)=>[o,i]));
 const roles={body:index.get(rig.unit),head:index.get(rig.head),armR:index.get(rig.armR),armL:index.get(rig.armL),legR:index.get(rig.legs[0]),legL:index.get(rig.legs[1])};
 const capeNodes=rig.unit.children.filter(o=>o.isGroup&&o.children.some(c=>c.geometry?.type==='ExtrudeGeometry')&&o.position.z<0&&o.position.y>1.5);
 const cape=Array.from(new Set([rig.cape,...capeNodes].filter(Boolean).map(o=>index.get(o))));
 const weapon=rig.weapon||objects.find(o=>/KnightDefaultSword/i.test(o.name));
 let primary='armR';
 if(weapon){let ancestor=weapon;while(ancestor){if(ancestor===rig.armL){primary='armL';break}if(ancestor===rig.armR){primary='armR';break}ancestor=ancestor.parent}}
 const sem=new Map(Object.entries(roles).map(([k,v])=>[objects[v],k]));
 cape.forEach((id,i)=>sem.set(objects[id],'cape'+i));
 const materials=[],materialIndex=new Map(),meshes=[],meshIndex=new Map(),geometries=[];
 function matIndex(material){
  if(materialIndex.has(material))return materialIndex.get(material);
  if(material.map)throw new Error('External texture is not supported by the offline snapshot: '+name);
  const m={name:material.name||'Material'+materials.length,pbrMetallicRoughness:{baseColorFactor:[material.color.r,material.color.g,material.color.b,material.opacity],metallicFactor:material.metalness??0,roughnessFactor:material.roughness??.7}};
  if(material.emissive?.getHex())m.emissiveFactor=material.emissive.toArray().map(v=>Math.min(1,v*(material.emissiveIntensity??1)));
  if(material.transparent)m.alphaMode='BLEND';
  if(material.side===2)m.doubleSided=true;
  const id=materials.length;materials.push(m);materialIndex.set(material,id);return id;
 }
 function meshId(object){
  const key=object.geometry.uuid+'|'+object.material.uuid;
  if(meshIndex.has(key))return meshIndex.get(key);
  if(Array.isArray(object.material))throw new Error('Unexpected multi-material mesh.');
  let geo=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();
  if(object.material.flatShading)geo.computeVertexNormals();
  const attributes={POSITION:Array.from(geo.attributes.position.array),NORMAL:Array.from(geo.attributes.normal.array)};
  if(geo.attributes.color)attributes.COLOR_0=Array.from(geo.attributes.color.array);
  for(const a of Object.values(attributes))if(a.some(v=>!Number.isFinite(v)))throw new Error('Invalid source geometry');
  const gi=geometries.length;geometries.push(attributes);geo.dispose();
  const id=meshes.length;meshes.push({geometry:gi,material:matIndex(object.material)});meshIndex.set(key,id);return id;
 }
 const nodes=objects.map((o,i)=>{
  const n={name:'HINARIA_'+(sem.get(o)||'Part'+i),translation:o.position.toArray(),rotation:o.quaternion.toArray(),scale:o.scale.toArray()};
  if(o.children.length)n.children=o.children.map(c=>index.get(c));
  if(o.isMesh)n.mesh=meshId(o);
  return n;
 });
 models.push({id:name.toLowerCase(),name,roles,cape,primaryArm:primary,amp:rig.amp??.65,swing:rig.sw??1.8,aim:!!rig.aim,nodes,meshes,materials,geometries});
 evidence.push({path:'src/modelsV2/'+name+'.js',sha256:createHash('sha256').update(await readFile(file)).digest('hex'),primaryArm:primary,weaponDetected:!!weapon,nodes:nodes.length,meshes:meshes.length});
 console.log(name+': '+nodes.length+' nodes, '+meshes.length+' mesh batches, primary='+primary);
}
for(const rel of ['src/modelsV2/batch.js','src/player/characterAnimator.js','src/core/loop.js','src/combat/combat.js'])evidence.push({path:rel,sha256:createHash('sha256').update(await readFile(path.join(source,rel))).digest('hex')});
await mkdir(path.join(root,'assets'),{recursive:true});
await writeFile(path.join(root,'assets/hinaria-rigs.json.gz'),gzipSync(JSON.stringify({version:1,source:'HINARIA_UPGRADE_1.2.0 (local release copy)',models})));
await writeFile(path.join(root,'assets/provenance.json'),JSON.stringify({source:'Existing local HINARIA_UPGRADE_1.2.0 release; newly uploaded archive could not be transferred because it exceeds 32 MiB.',geometry:'Actual game model factories and the same per-joint batching used by the game.',animationSource:'src/player/characterAnimator.js',animationGenerator:'Java, not this extraction script',rigKind:'Rigid node hierarchy; no vertex skinning',evidence},null,2)+'\n');
