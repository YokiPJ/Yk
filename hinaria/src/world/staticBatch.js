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
/** Retain indexed vertices; no expansion to six copies per box face. */
export function mergeStaticGeometry(meshes, root, bakeColors=false) {
  const inverse=new THREE.Matrix4().copy(root.matrixWorld).invert(), copies=[];
  const local=new THREE.Matrix4(), instance=new THREE.Matrix4(), tint=new THREE.Color();
  for (const mesh of meshes) {
    local.multiplyMatrices(inverse,mesh.matrixWorld);
    const count=mesh.isInstancedMesh?mesh.count:1;
    for(let index=0;index<count;index++) {
      const matrix=local.clone();
      if(mesh.isInstancedMesh){mesh.getMatrixAt(index,instance);matrix.multiply(instance);}
      const geometry=mesh.geometry.clone();geometry.applyMatrix4(matrix);
      if(bakeColors){
        const positions=geometry.getAttribute('position'),originalColors=geometry.getAttribute('color');
        const colors=new Float32Array(positions.count*3);tint.copy(mesh.material.color);
        if(mesh.instanceColor){mesh.getColorAt(index,_instanceTint);tint.multiply(_instanceTint);}
        for(let i=0;i<positions.count;i++) {
          colors[i*3]=tint.r*(mesh.material.vertexColors&&originalColors?originalColors.getX(i):1);
          colors[i*3+1]=tint.g*(mesh.material.vertexColors&&originalColors?originalColors.getY(i):1);
          colors[i*3+2]=tint.b*(mesh.material.vertexColors&&originalColors?originalColors.getZ(i):1);
        }
        geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
      }
      // A reflection reverses triangle winding, including indexed geometry.
      if(matrix.determinant()<0){
        if(geometry.index){
          const a=geometry.index.array;
          for(let i=0;i<a.length;i+=3){const v=a[i+1];a[i+1]=a[i+2];a[i+2]=v;}
        }else for(const attribute of Object.values(geometry.attributes)){
          for(let i=0;i<attribute.count;i+=3)for(let k=0;k<attribute.itemSize;k++){
            const a=(i+1)*attribute.itemSize+k,b=(i+2)*attribute.itemSize+k,v=attribute.array[a];attribute.array[a]=attribute.array[b];attribute.array[b]=v;
          }
        }
      }
      copies.push(geometry);
    }
  }
  const output=new THREE.BufferGeometry();
  for(const name of Object.keys(copies[0].attributes)){
    const first=copies[0].getAttribute(name),length=copies.reduce((n,g)=>n+g.getAttribute(name).array.length,0);
    const array=new first.array.constructor(length);let offset=0;
    for(const geometry of copies){const values=geometry.getAttribute(name).array;array.set(values,offset);offset+=values.length;}
    output.setAttribute(name,new THREE.BufferAttribute(array,first.itemSize,first.normalized));
  }
  const vertexCount=output.getAttribute('position').count;
  const length=copies.reduce((n,g)=>n+(g.index?.count??g.getAttribute('position').count),0);
  const indices=vertexCount>65535?new Uint32Array(length):new Uint16Array(length);
  let offset=0,base=0;
  for(const geometry of copies){
    const count=geometry.getAttribute('position').count,index=geometry.index;
    for(let i=0;i<(index?.count??count);i++)indices[offset++]=base+(index?index.getX(i):i);
    base+=count;geometry.dispose();
  }
  output.setIndex(new THREE.BufferAttribute(indices,1));
  output.computeBoundingSphere();output.computeBoundingBox();return output;
}
const _instanceTint=new THREE.Color();
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
      if(!mesh.isMesh||(mesh.isInstancedMesh&&!mesh.userData.batchInstances)||mesh.isSkinnedMesh||!mesh.visible||dynamic(mesh,chunk)||Array.isArray(mesh.material)||mesh.material.transparent||mesh.material.userData.dynamicMaterial)return;
      const geometry=mesh.geometry,attributes=Object.entries(geometry?.attributes||{}).filter(([name])=>name!=='color').sort();
      if(!geometry?.attributes.position||geometry.drawRange.start!==0||geometry.drawRange.count!==Infinity||Object.keys(geometry.morphAttributes).length||attributes.some(([,a])=>a.isInterleavedBufferAttribute||a.count%3&& !geometry.index))return;
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
      const batched=new THREE.Mesh(mergeStaticGeometry(meshes,chunk,true),materials.get(key));
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
