/**
 * HINÁRIA V6 runtime mesh batching.
 * Combines *rigid* painted parts under each animated joint into one
 * vertex-coloured mesh, without flattening the articulated rig.
 * Eyes, textured portraits, weapon sockets, translucent FX and meshes with
 * custom userData are preserved. We do not merge across animated Group nodes.
 */
import * as THREE from 'three';
// The previous global painted material was shared by ALL entities AND houses.
// Damage/status FX on one entity changed its emissive color and made every
// building glow red/orange.  One paint material per root isolates that effect.

function mergeDirectMeshes(group, painted) {
    const eligible=[];
    for (const m of group.children) {
        if (!m.isMesh || m.isSkinnedMesh || !m.geometry?.attributes?.position ||
            !m.material?.isMeshLambertMaterial || m.material.map || m.material.transparent ||
            m.material.opacity!==1 || m.material.vertexColors ||
            Object.keys(m.userData).length || m.material.side !== THREE.FrontSide) continue;
        eligible.push(m);
    }
    if(eligible.length<2) return 0;
    const positions=[],normals=[],uvs=[],colors=[];
    for (const mesh of eligible) {
        mesh.updateMatrix();
        const g=mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
        g.applyMatrix4(mesh.matrix);
        const p=g.getAttribute('position'), n=g.getAttribute('normal'),uv=g.getAttribute('uv');
        const color=mesh.material.color;
        for(let i=0;i<p.count;i++){
            positions.push(p.getX(i),p.getY(i),p.getZ(i));
            if(n) normals.push(n.getX(i),n.getY(i),n.getZ(i));
            else normals.push(0,1,0);
            if(uv) uvs.push(uv.getX(i),uv.getY(i));
            else uvs.push(0,0);
            colors.push(color.r,color.g,color.b);
        }
        g.dispose();
    }
    const geom=new THREE.BufferGeometry();
    geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geom.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    geom.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    geom.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    const combined=new THREE.Mesh(geom,painted);
    combined.name='V6_CombinedPainted';
    for(const m of eligible) group.remove(m);
    group.add(combined);
    return eligible.length-1;
}

export function batchCharacterMeshes(root) {
    let reduced=0;
    const groups=[];
    root.traverse(o => {if(o.isGroup) groups.push(o)});
    const painted = new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true});
    for(const g of groups) reduced+=mergeDirectMeshes(g,painted);
    root.userData.v6SavedDrawCalls=reduced;
    root.userData.v77OwnedPaint=painted;
    return reduced;
}
