/** Real rat geometry and animator: offscreen parts must not submit draw calls. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {updateEntityAnimation} from '../src/player/characterAnimator.js';

// Exercise the actual private factory without initializing the browser's
// combat/UI dependency graph. No model or animation implementation is copied.
const source=readFileSync(new URL('../src/combat/combat.js',import.meta.url),'utf8');
const start=source.indexOf('function buildRat()'),end=source.indexOf('\nfunction buildHumanoid',start);
assert.ok(start>=0&&end>start,'actual rat factory exists');
const makeRat=vm.runInNewContext(source.slice(start,end)+'\nbuildRat',{THREE});
const camera=new THREE.PerspectiveCamera(45,844/390,.1,80),frustum=new THREE.Frustum();
const projection=new THREE.Matrix4(),sphere=new THREE.Sphere(),point=new THREE.Vector3();
function view(x=13,z=15){
  camera.position.set(x+8,11,z+9);camera.lookAt(x,.7,z);camera.updateMatrixWorld();
  projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(projection);
}
function meshes(root){const result=[];root.traverse(o=>{if(o.isMesh)result.push(o);});return result;}
function visibleParts(root){root.updateMatrixWorld(true);return meshes(root).filter(mesh=>!mesh.frustumCulled||frustum.intersectsObject(mesh)).length;}
function validateBounds(root){
  root.updateMatrixWorld(true);
  for(const mesh of meshes(root)){
    assert.equal(mesh.frustumCulled,true,'rat parts use normal camera culling');
    mesh.geometry.computeBoundingSphere();sphere.copy(mesh.geometry.boundingSphere).applyMatrix4(mesh.matrixWorld);
    assert.ok(sphere.center.toArray().every(Number.isFinite)&&Number.isFinite(sphere.radius)&&sphere.radius>0,'animated world bounding sphere remains finite');
    // Every vertex of each rigid piece still lies inside its transformed bound.
    const positions=mesh.geometry.attributes.position,limit=(sphere.radius+1e-5)**2;
    for(let i=0;i<positions.count;i++){
      point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);
      assert.ok(point.distanceToSquared(sphere.center)<=limit,'camera bound encloses the actual animated geometry');
    }
  }
}
const poses=['idle','walk','run','attack','damage','dodge','death'];
for(const pose of poses){
  const root=makeRat(),parts=meshes(root),materials=parts.map(mesh=>mesh.material),rig=root.userData.r;
  const entity={kind:'m',mesh:root,x:13,z:15,hp:pose==='death'?0:12,at:0,fl:0};
  const initialTail=rig.tail.rotation.y;
  for(let frame=0;frame<48;frame++){
    if(pose==='walk')entity.x+=2/30;
    if(pose==='run')entity.x+=4.4/30;
    entity.at=pose==='attack'?(1-(frame%11)/11):0;
    entity.fl=pose==='damage'?.18:0;
    entity.combatV2Dodge=pose==='dodge';entity.combatV2DodgeProgress=(frame%12)/12;
    updateEntityAnimation(entity,1/30);
    root.position.set(entity.x,0,entity.z);view(entity.x,entity.z);
    assert.equal(visibleParts(root),parts.length,`${pose}: visible rat retains all pieces`);
  }
  validateBounds(root);
  parts.forEach((mesh,index)=>assert.equal(mesh.material,materials[index],'culling does not replace appearance materials'));
  if(pose==='walk'||pose==='run'){
    assert.notEqual(rig.tail.rotation.y,initialTail,'real locomotion still animates the tail');
    assert.ok(rig.legs.some(leg=>Math.abs(leg.rotation.x)>.01),'real locomotion still animates paws');
  }
  // Check even exaggerated head/tail/paw turns, not only resting bounds.
  rig.head.rotation.set(-1.1,.8,0);rig.tail.rotation.set(1.3,1.2,0);
  rig.legs.forEach((leg,index)=>leg.rotation.x=index%2?1.3:-1.3);
  validateBounds(root);assert.equal(visibleParts(root),parts.length);
  root.position.set(96,0,96);view();assert.equal(visibleParts(root),0,`${pose}: distant geometry is culled`);
}

// Explicit nine-rat rendering fixture, not a phone FPS or spawn simulation.
view();const positions=[[22,2],[31,6],[28,30],[4,30],[15,25],[3,35],[24,34],[27,20],[2,26]];
const fixture=positions.map(([x,z])=>{const root=makeRat();root.position.set(x,0,z);return {position:[x,z],total:meshes(root).length,submitted:visibleParts(root)};});
const before=fixture.reduce((n,rat)=>n+rat.total,0),after=fixture.reduce((n,rat)=>n+rat.submitted,0);
assert.ok(after>0&&after<before,'offscreen rats no longer force every part through rendering');
console.log('PASS rat frustum: actual factory, 7 real animation states, extreme articulated poses, finite enclosing bounds; nine-rat fixture '+before+' -> '+after+' expected mesh submissions.');
