/** HINÁRIA V6 collision inspector: no impact until explicitly enabled. */
import * as THREE from 'three';
import { gameState } from '../core/gameState.js';
let debugMesh=null;
export function toggleV6CollisionDebug(force) {
    const show=typeof force==='boolean'?force:!(debugMesh?.visible);
    if(!debugMesh && show) {
        const blocked=[];
        for(let x=0;x<gameState.W;x++)for(let z=0;z<gameState.W;z++)
            if(gameState.B[x][z])blocked.push([x,z]);
        const geom=new THREE.PlaneGeometry(.88,.88);
        const mat=new THREE.MeshBasicMaterial({color:0xd64b48,transparent:true,opacity:.27,
            depthWrite:false,side:THREE.DoubleSide});
        debugMesh=new THREE.InstancedMesh(geom,mat,blocked.length);
        debugMesh.name='V6_CollisionDebug_Grid';
        const matrix=new THREE.Matrix4();
        const orientation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
        const scale=new THREE.Vector3(1,1,1);
        blocked.forEach(([x,z],i)=>{
            const position=new THREE.Vector3(x,gameState.getHeightAt(x,z)+.09,z);
            matrix.compose(position,orientation,scale);debugMesh.setMatrixAt(i,matrix);
        });
        debugMesh.instanceMatrix.needsUpdate=true;
        debugMesh.frustumCulled=false;
        gameState.scene.add(debugMesh);
    }
    if(debugMesh)debugMesh.visible=show;
    return show;
}
export function installV6Diagnostics() {
    window.HINARIA_V6={
        toggleCollision:toggleV6CollisionDebug,
        stats:()=>({
            size:gameState.W,
            entities:gameState.ents.length,
            houses:gameState.HO.length,
            objects:gameState.OB.length,
            drawCalls:gameState.renderer.info.render.calls,
            triangles:gameState.renderer.info.render.triangles,
            textures:gameState.renderer.info.memory.textures,
            geometries:gameState.renderer.info.memory.geometries
        })
    };
}
