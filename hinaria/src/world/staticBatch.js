/** Merge only opaque, static geometry within the existing visibility chunks. */
import * as THREE from 'three';
function materialSignature(material) {
  if(!material.isMeshStandardMaterial&&!material.isMeshLambertMaterial&&!material.isMeshBasicMaterial)return null;
  const values={};
  for(const key of Object.keys(material).sort()) {
    if(['id','uuid','name','color','vertexColors','version','userData','_listeners'].includes(key))continue;
    const value=material[key];
    if(value===null||['number','string','boolean'].includes(typeof value))values[key]=value;
    else if(value?.isTexture)values[key]=value.uuid;
    else if(value?.isColor)values[key]=value.toArray();
    else if(value?.isVector2||value?.isVector3)values[key]=value.toArray();
    else if(Array.isArray(value)&&value.length===0)values[key]=[];
    else if(value&&Object.getPrototypeOf(value)===Object.prototype&&Object.values(value).every(v=>v===null||['number','string','boolean'].includes(typeof v)))values[key]=value;
    else if(value!==undefined)return null;
  }
  return JSON.stringify(values);
}
function dynamic(object, root) {
  for (let node=object;node&&node!==root;node=node.parent)
    if (!node.visible || node.userData.keep || node.userData.dynamicTransform) return true;
  return false;
}
function merge(meshes, chunk) {
  const inverse=new THREE.Matrix4().copy(chunk.matrixWorld).invert(), copies=[];
  for (const mesh of meshes) {
    let geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
    const matrix=new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);
    geometry.applyMatrix4(matrix);
    const positions=geometry.getAttribute('position'),originalColors=geometry.getAttribute('color');
    const colors=new Float32Array(positions.count*3),tint=mesh.material.color;
    for(let i=0;i<positions.count;i++) {
      colors[i*3]=tint.r*(mesh.material.vertexColors&&originalColors?originalColors.getX(i):1);
      colors[i*3+1]=tint.g*(mesh.material.vertexColors&&originalColors?originalColors.getY(i):1);
      colors[i*3+2]=tint.b*(mesh.material.vertexColors&&originalColors?originalColors.getZ(i):1);
    }
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
    // Baking a reflection must retain the original front-face winding.
    if (matrix.determinant()<0) for (const attr of Object.values(geometry.attributes)) {
      for (let vertex=0;vertex<attr.count;vertex+=3) for (let k=0;k<attr.itemSize;k++) {
        const a=(vertex+1)*attr.itemSize+k,b=(vertex+2)*attr.itemSize+k,v=attr.array[a];attr.array[a]=attr.array[b];attr.array[b]=v;
      }
    }
    copies.push(geometry);
  }
  const output=new THREE.BufferGeometry();
  for (const name of Object.keys(copies[0].attributes)) {
    const first=copies[0].getAttribute(name), length=copies.reduce((n,g)=>n+g.getAttribute(name).array.length,0);
    const array=new first.array.constructor(length);let offset=0;
    for (const geometry of copies) { const values=geometry.getAttribute(name).array;array.set(values,offset);offset+=values.length; }
    output.setAttribute(name,new THREE.BufferAttribute(array,first.itemSize,first.normalized));
  }
  copies.forEach(geometry=>geometry.dispose());
  output.computeBoundingSphere();output.computeBoundingBox();return output;
}
export function freezeStaticTransforms(root) {
  root.updateWorldMatrix(true,true);
  root.traverse(object=>{if(!dynamic(object,root)){object.updateMatrix();object.matrixAutoUpdate=false;}});
}
export function optimizeStaticChunks(chunks) {
  let inputMeshes=0,batches=0,mergedMeshes=0;
  const signatures=new Map(),materials=new Map();
  for (const chunk of chunks.values()) {
    chunk.updateWorldMatrix(true,true);const groups=new Map();
    chunk.traverse(mesh=>{
      if(!mesh.isMesh||mesh.isInstancedMesh||mesh.isSkinnedMesh||!mesh.visible||dynamic(mesh,chunk)||Array.isArray(mesh.material)||mesh.material.transparent)return;
      const geometry=mesh.geometry,attributes=Object.entries(geometry?.attributes||{}).filter(([name])=>name!=='color').sort();
      if(!geometry?.attributes.position||Object.keys(geometry.morphAttributes).length||attributes.some(([,a])=>a.isInterleavedBufferAttribute||a.count%3&& !geometry.index))return;
      if(geometry.attributes.color?.itemSize===4)return;
      if(!signatures.has(mesh.material))signatures.set(mesh.material,materialSignature(mesh.material));
      const signature=signatures.get(mesh.material);
      if(!signature)return;
      const key=[signature,mesh.renderOrder,mesh.castShadow,mesh.receiveShadow,mesh.layers.mask,
        ...attributes.map(([name,a])=>[name,a.itemSize,a.normalized,a.array.constructor.name].join(':'))].join('|');
      if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);inputMeshes++;
    });
    for(const [key,meshes] of groups) {
      if(meshes.length<3)continue;
      const first=meshes[0];
      if(!materials.has(key)){const material=first.material.clone();material.color.setHex(0xffffff);material.vertexColors=true;materials.set(key,material);}
      const batched=new THREE.Mesh(merge(meshes,chunk),materials.get(key));
      batched.name='WorldStaticBatch';batched.renderOrder=first.renderOrder;batched.layers.mask=first.layers.mask;
      batched.castShadow=first.castShadow;batched.receiveShadow=first.receiveShadow;
      // Materials/geometries can be shared with other prefabs: ownership stays
      // with their factories. These original static nodes have never hit the GPU.
      for(const mesh of meshes)mesh.removeFromParent();
      chunk.add(batched);batches++;mergedMeshes+=meshes.length;
    }
    freezeStaticTransforms(chunk);
  }
  return {inputMeshes,batches,mergedMeshes};
}
