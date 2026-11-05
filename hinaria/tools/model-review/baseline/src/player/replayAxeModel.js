/** O machado do Replay: geometria procedural independente, presa ao pivô da mão. */
import * as THREE from 'three';

const axeGlow = new WeakMap();
const animatedFlames = new WeakMap();
const attachedAxes = new WeakMap();
const axeSparks = new WeakMap();
// V3: particle pooling like compact procedural WebGL examples, not a copied demo.
const TINTS = { kn: 0xffc779, pa: 0xffecac, so: 0xb6a1ff, dr: 0x9ee8a3, yo: 0xff602e };
const mat = (color, metalness=0, roughness=.58) => new THREE.MeshStandardMaterial({color,metalness,roughness,flatShading:true});

export function makeReplayAxe(cls) {
  const root=new THREE.Group();root.name='MachadoDoReplay';
  const wood=mat(0x503322,.0,.85), iron=mat(0x667883,.72,.3), trim=mat(0xd4b279,.63,.32);
  const color=TINTS[cls]??TINTS.kn;
  const flame=mat(color,.08,.26);flame.emissive.setHex(color);flame.emissiveIntensity=0;
  const add=(geometry,material,x=0,y=0,z=0)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;root.add(mesh);return mesh;};
  // Grip at local origin, shaft runs through the fist. +Y is the head direction.
  add(new THREE.CylinderGeometry(.036,.046,1.48,8),wood,0,.18,0);
  for(const y of [-.35,-.25,-.15])add(new THREE.CylinderGeometry(.051,.051,.023,8),trim,0,y,0);
  add(new THREE.CylinderGeometry(.071,.071,.23,9),trim,0,.80,0);
  const shape=new THREE.Shape();
  shape.moveTo(-.08,.55);shape.lineTo(-.31,.61);shape.lineTo(-.68,.93);
  shape.quadraticCurveTo(-.48,1.03,-.68,1.25);
  shape.lineTo(-.31,1.13);shape.lineTo(-.08,1.14);shape.closePath();
  const blade=add(new THREE.ExtrudeGeometry(shape,{depth:.105,bevelEnabled:true,bevelSize:.018,bevelThickness:.018,bevelSegments:1,curveSegments:5}),iron,0,0,-.055);
  blade.name='MachadoLamina';
  const glow=add(new THREE.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:false,curveSegments:5}),flame,0,0,.064);
  glow.name='MachadoRuna';glow.scale.set(.93,.95,1);
  const gem=add(new THREE.OctahedronGeometry(.083,0),flame,0,.91,.10);gem.name='MachadoNucleo';
  // Three small low-poly flame/rune tongues (no particle system or extra render loop).
  const tongues=[];
  const fireMat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.86,depthWrite:false});
  for(const [i,x,y] of [[0,-.47,.75],[1,-.49,.99],[2,-.20,1.05]]){
    const tongue=add(new THREE.ConeGeometry(.066,.23,5,1),fireMat,x,y,.104);
    tongue.name='ReplayAxeFire'+i;tongue.visible=false;tongues.push(tongue);
  }
  // A single GPU particle group replaces per-spark Mesh objects.
  const sparkCount=15;
  const positions=new Float32Array(sparkCount*3);
  const sparkGeometry=new THREE.BufferGeometry();
  sparkGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const sparkMaterial=new THREE.PointsMaterial({
    color, size:.10, transparent:true,opacity:.84,sizeAttenuation:true,
    depthWrite:false,blending:THREE.AdditiveBlending
  });
  const sparks=new THREE.Points(sparkGeometry,sparkMaterial);
  sparks.name='ReplayAxeV3_Fagulhas';sparks.visible=false;sparks.frustumCulled=false;
  root.add(sparks);
  axeSparks.set(root,{sparks,positions,sparkCount});
  animatedFlames.set(root,tongues);
  axeGlow.set(root,flame);
  return root;
}

export function attachReplayAxe(model,cls) {
  const rig=model?.userData?.r;if(!rig)return false;
  const isKnight=cls==='kn';
  const arm=isKnight?rig.armL:rig.armR;
  if(!arm)return false;
  // Some V2 models already supply a weapon, and Knight V2 stores his sword without a rig reference.
  if(rig.weapon?.parent)rig.weapon.visible=false;
  if(isKnight) {const sword=arm.getObjectByName('KnightDefaultSword');if(sword)sword.visible=false;}
  const socket=(!isKnight?arm.getObjectByName('RightHandGrip'):null)||new THREE.Group();
  if(!socket.parent){socket.name='ReplayAxeHandGrip';socket.position.set(0,-.75,.13);arm.add(socket);}
  const axe=makeReplayAxe(cls);
  socket.add(axe);
  // Inward grip, head outward and slightly ahead of torso; mirror it for Knight's left hand.
  axe.position.set(0,0,.02);
  axe.rotation.set(-.50,0,isKnight?2.13:-2.13);
  rig.weapon=axe;rig.aim=false;rig.sw=1.8;
  attachedAxes.set(model,axe);
  return true;
}

export function syncReplayAxeVisual(P,now=0) {
  const axe=P?.mesh?attachedAxes.get(P.mesh):null;
  const glow=axe?axeGlow.get(axe):null;
  if(!glow)return;
  const awake=Number(P.axeAwakeUntil||0)>now;
  glow.emissiveIntensity=awake?1.05:0;
  glow.opacity=1;
  const sparkFX=axeSparks.get(axe);
  if(sparkFX){
    const {sparks,positions,sparkCount}=sparkFX;
    sparks.visible=awake;
    if(awake){
      const seedBase=now*2.7;
      for(let i=0;i<sparkCount;i++){
        const age=(seedBase+i*.61803398875)%1;
        const a=i*2.3999632297;
        const spread=.04+age*.41;
        positions[i*3]=-.35+Math.cos(a)*spread;
        positions[i*3+1]=.72+age*.78;
        positions[i*3+2]=.11+Math.sin(a)*spread*.56;
      }
      sparks.geometry.attributes.position.needsUpdate=true;
      sparks.material.opacity=.73+.12*Math.sin(now*9);
    }
  }
  const flames=animatedFlames.get(axe)||[];
  for(let i=0;i<flames.length;i++){
    const tip=flames[i];tip.visible=awake;
    if(awake){tip.scale.y=.83+.16*Math.sin(now*13+i*1.7);tip.rotation.z=.14*Math.sin(now*9+i);}
  }
}
