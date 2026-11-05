import * as THREE from 'three';
/** Merge rigid mesh pieces PER joint only; do not flatten articulated rig or weapon sockets. */
export function batchArticulatedModel(root){
 const groups=[];root.traverse(o=>{if(o.isGroup)groups.push(o)});
 let saved=0;
 for(const group of groups){
   const lists=new Map();
   for(const o of group.children){
     if(!o.isMesh||!o.geometry?.getAttribute('position')||!o.material?.isMeshStandardMaterial||
       o.material.transparent||o.material.map||o.material.opacity!==1||o.material.emissiveIntensity&&
       o.material.emissive?.getHex()!==0||o.material.side!==THREE.FrontSide)continue;
     const key=`${o.material.metalness.toFixed(1)}-${o.material.roughness.toFixed(1)}`;
     const arr=lists.get(key)||[];arr.push(o);lists.set(key,arr);
   }
   for(const [key,objects] of lists){if(objects.length<3)continue;
     const positions=[],normals=[],uvs=[],colors=[];
     for(const mesh of objects){
       mesh.updateMatrix();let geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
       geometry.applyMatrix4(mesh.matrix);
       const p=geometry.getAttribute('position'),n=geometry.getAttribute('normal'),uv=geometry.getAttribute('uv');
       const color=mesh.material.color;
       for(let i=0;i<p.count;i++){
         positions.push(p.getX(i),p.getY(i),p.getZ(i));
         normals.push(n?n.getX(i):0,n?n.getY(i):1,n?n.getZ(i):0);
         uvs.push(uv?uv.getX(i):0,uv?uv.getY(i):0);
         colors.push(color.r,color.g,color.b);
       }
       geometry.dispose();
     }
     const geometry=new THREE.BufferGeometry();
     geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
     geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
     geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
     geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
     const [metal,rough]=key.split('-').map(Number);
     const material=new THREE.MeshStandardMaterial({vertexColors:true,metalness:metal,roughness:rough,flatShading:true});
     const merged=new THREE.Mesh(geometry,material);merged.name='HINARIA_RIG_PART_BATCH';
     merged.castShadow=true;merged.receiveShadow=true;
     for(const o of objects)group.remove(o);
     group.add(merged);saved+=objects.length-1;
   }
 }
 // Joint/socket groups stay live. Rigid mesh pieces within them do not need
 // their unchanged local matrices rebuilt on every animation frame.
 const rig=root.userData.r;
 if(rig){
   const live=new Set([root,rig.unit,rig.head,rig.armR,rig.armL,rig.tail,rig.cape,...(rig.legs||[]),...(rig.capes||[])]);
   let frozen=0;
   root.traverse(object=>{
     if(!object.isMesh||live.has(object))return;
     for(let parent=object;parent&&parent!==root;parent=parent.parent)
       if(parent===rig.weapon||parent===rig.shield)return;
     object.updateMatrix();object.matrixAutoUpdate=false;frozen++;
   });
   root.userData.v2StaticMeshCount=frozen;
 }
 root.userData.v2BatchedDrawCalls=saved;return root;
}
