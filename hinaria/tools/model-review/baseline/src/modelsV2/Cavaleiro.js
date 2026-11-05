import * as THREE from 'three';
export function createModel(options={}){
const mat=(color,metalness=.0,roughness=.65)=>new THREE.MeshStandardMaterial({color,metalness,roughness,flatShading:true});
const M={
 silver:mat('#bdcbd8',.72,.34),silverLight:mat('#ebf4f0',.75,.28),silverDark:mat('#75889e',.72,.35),
 gold:mat('#f1bd55',.65,.37),goldLight:mat('#ffe4a0',.55,.3),blue:mat('#315da3',.1,.7),blueLight:mat('#477dc2',.08,.78),blueDark:mat('#192f55',.12,.72),
 leather:mat('#62412f',.02,.9),leatherLight:mat('#956446',0,.82),skin:mat('#e3a77e',0,.93),skinLight:mat('#f5c09a',0,.88),hair:mat('#6a372b',0,.9),hairLight:mat('#9d6036',0,.85),eye:mat('#1d2430',0,.7),
 under:mat('#263c5c',0,.85),black:mat('#111c28',.1,.75),shieldBlue:mat('#254981',.45,.46),wood:mat('#6e5139',0,.9)
};
const sphere=new THREE.SphereGeometry(1,12,8);
function mesh(parent,geom,material,x=0,y=0,z=0){const m=new THREE.Mesh(geom,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function ell(parent,material,x,y,z,sx,sy,sz,segments){const g=segments?new THREE.SphereGeometry(1,segments,Math.max(5,Math.round(segments*.7))):sphere;const m=mesh(parent,g,material,x,y,z);m.scale.set(sx,sy,sz);return m}
function cyl(parent,material,x,y,z,top,bottom,h,seg=10){return mesh(parent,new THREE.CylinderGeometry(top,bottom,h,seg,1),material,x,y,z)}
function box(parent,material,x,y,z,sx,sy,sz){return mesh(parent,new THREE.BoxGeometry(sx,sy,sz),material,x,y,z)}
function cone(parent,material,x,y,z,r,h,n=7){return mesh(parent,new THREE.ConeGeometry(r,h,n),material,x,y,z)}
function rod(parent,material,a,b,r=0.045,r2=r){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av);const m=cyl(parent,material,...av.clone().add(bv).multiplyScalar(.5).toArray(),r,r2,d.length(),9);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m}
function shieldShape(){let s=new THREE.Shape();s.moveTo(-.35,.34);s.quadraticCurveTo(0,.5,.35,.34);s.lineTo(.32,-.16);s.quadraticCurveTo(.19,-.43,0,-.58);s.quadraticCurveTo(-.19,-.43,-.32,-.16);s.closePath();return s}
function makeShield(parent){const g=new THREE.Group();parent.add(g);
 const edge=mesh(g,new THREE.ExtrudeGeometry(shieldShape(),{depth:.065,bevelEnabled:true,bevelThickness:.04,bevelSize:.046,bevelSegments:2,curveSegments:6}),M.gold,0,0,.0);
 const inner=mesh(g,new THREE.ShapeGeometry(shieldShape(),14),M.shieldBlue,0,0,.117);inner.scale.set(.87,.86,1);
 const band=box(g,M.silverLight,0,-.04,.135,.075,.65,.045);band.rotation.z=Math.PI/2;
 const star=new THREE.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2;const r=i%2? .10:.235;let x=Math.cos(a)*r,y=Math.sin(a)*r-.09;i?star.lineTo(x,y):star.moveTo(x,y)}star.closePath();mesh(g,new THREE.ExtrudeGeometry(star,{depth:.025,bevelEnabled:true,bevelSize:.015,bevelThickness:.008,bevelSegments:1}),M.goldLight,0,0,.161);
 for(const x of [-.25,.25])for(const y of [-.13,.2])ell(g,M.goldLight,x,y,.12,.027,.027,.025);
 g.rotation.y=-.15;g.rotation.z=-.07;return g;
}
function sword(parent){const g=new THREE.Group();parent.add(g);
 cyl(g,M.leather,-.0,.17,0,.063,.073,.38,8);
 const pom=ell(g,M.gold,0,.40,0,.115,.09,.11,9);rod(g,M.gold,[-.22,-.035,0],[.22,-.035,0],.06);
 const blade=mesh(g,new THREE.CylinderGeometry(.04,.11,.76,4,1),M.silverLight,0,-.46,0);blade.rotation.y=Math.PI/4;
 const point=cone(g,M.silverLight,0,-.95,0,.095,.25,4);point.rotation.y=Math.PI/4;point.rotation.z=Math.PI;
 rod(g,M.silverDark,[0,-.09,.095],[0,-.83,.02],.013);return g;
}
function armorSkirt(parent){for(let i=0;i<5;i++){const a=(i-2)*.43;const panel=box(parent,i%2===0?M.blueDark:M.blue,-.0+Math.sin(a)*.31,.87,Math.cos(a)*.18,.17,.37,.055);panel.rotation.y=-a}}
function buildKnight(){const root=new THREE.Group(),body=new THREE.Group();root.add(body);
 const core=new THREE.Group();body.add(core);
 // Belt, tabard, chest.
 ell(core,M.under,0,1.42,0,.40,.48,.25,12);
 ell(core,M.silver,0,1.48,.105,.37,.38,.24,12);
 ell(core,M.silverLight,0,1.51,.316,.20,.26,.025,10);
 const chestSeam=box(core,M.gold,0,1.54,.342,.038,.40,.036);chestSeam.rotation.z=.06;
 for(const x of [-.29,.29]){
  const seam=ell(core,M.gold,x,1.57,.15,.025,.25,.045,9);seam.rotation.z=x<0?-.23:.23;
  ell(core,M.silverDark,x,1.29,.185,.09,.17,.1,9);
 }
 ell(core,M.blue,0,1.12,.04,.38,.21,.23,11);
 box(core,M.leather,0,1.095,.23,.75,.10,.14);
 box(core,M.gold,0,1.10,.305,.17,.16,.04);box(core,M.silverDark,0,1.10,.348,.09,.09,.02);
 armorSkirt(core);
 // Tunic fabric hanging at front.
 const tab=box(core,M.blueLight,0,.83,.21,.27,.46,.062);tab.rotation.x=.05;
 box(core,M.gold,0,.79,.253,.045,.34,.023);
 ell(core,M.gold,0,.91,.293,.082,.082,.027,8);
 // Neck and ears.
 cyl(core,M.leather,0,1.84,0,.17,.18,.18,10);
 const head=new THREE.Group();head.position.y=1.97;body.add(head);
 ell(head,M.skin,0,.1,.07,.305,.345,.286,14);
 for(const x of [-.295,.295])ell(head,M.skin,x,.065,.07,.056,.095,.071,8);
 ell(head,M.skinLight,0,-.015,.329,.075,.085,.095,10);
 // Helmet crown and cheek guards, open face.
 ell(head,M.silverDark,0,.31,.022,.341,.235,.302,12);
 ell(head,M.silverLight,0,.35,.058,.312,.15,.273,12);
 const ridge=ell(head,M.gold,0,.50,.045,.066,.11,.26,9);
 for(const x of [-.296,.296]){
  ell(head,M.silver,x,.00,.13,.075,.23,.13,10);
  ell(head,M.gold,x,-.09,.22,.036,.09,.05,8);
 }
 const forehead=box(head,M.silverLight,0,.23,.281,.55,.09,.085);
 // Face: olhos grandes e expressivos (esclera, íris, pupila, brilho, pálpebra), sobrancelhas, sorriso e bochechas.
 M.eyeWhite=mat('#fff8ee',0,.5);M.iris=mat('#3f78c8',0,.4);M.irisDark=mat('#25508f',0,.45);M.lip=mat('#b8574a',0,.7);M.blush=mat('#f2a08e',0,.9);M.lash=mat('#2a1a1a',0,.8);
 for(const x of [-.115,.115]){
  const s=x>0?1:-1;
  const brow=ell(head,M.hair,x,.128,.326,.112,.027,.028,8);brow.rotation.z=s*.16;
  ell(head,M.eyeWhite,x,.052,.338,.058,.068,.02,12);
  ell(head,M.iris,x+s*.004,.05,.352,.039,.049,.014,11);
  ell(head,M.irisDark,x+s*.004,.034,.353,.034,.026,.012,9);
  ell(head,M.eye,x+s*.004,.05,.361,.021,.027,.01,8);
  ell(head,M.eyeWhite,x+s*.016,.07,.368,.013,.015,.008,6);
  const lid=ell(head,M.lash,x,.103,.346,.066,.012,.02,8);lid.rotation.z=s*-.1;
  ell(head,M.skinLight,x,.0,.34,.056,.014,.014,8);
  ell(head,M.blush,x*1.02,-.085,.318,.082,.04,.014,9);
 }
 const smile=new THREE.Mesh(new THREE.TorusGeometry(.05,.0095,6,12,Math.PI),M.lip);smile.position.set(0,-.07,.341);smile.rotation.z=Math.PI;smile.castShadow=true;head.add(smile);
 ell(head,M.lip,0,-.104,.332,.026,.008,.012,6);
 // Cabelo: franja em camadas sob o elmo, cachos laterais e cabelo longo atrás com laço dourado.
 for(let i=0;i<5;i++){const k=i-2,a=Math.abs(k);const tuft=cone(head,i%2?M.hair:M.hairLight,k*.1,.238-a*.016,.322-a*.012,.078-a*.004,.17-a*.022,6);tuft.rotation.z=-k*.3;tuft.rotation.x=-.38}
 for(const x of [-.31,.31]){const lock=ell(head,M.hair,x,.0,-.04,.055,.2,.1,8);lock.rotation.z=x>0?-.12:.12;ell(head,M.hairLight,x*.99,-.07,.02,.04,.1,.06,7)}
 ell(head,M.hair,0,-.03,-.21,.29,.3,.14,12);ell(head,M.hairLight,0,.02,-.27,.2,.22,.06,10);
 for(let i=0;i<3;i++){const x=(i-1)*.12;const lk=cone(head,i===1?M.hair:M.hairLight,x,-.3,-.24,.085,.46-Math.abs(i-1)*.08,6);lk.rotation.x=Math.PI+.12;lk.rotation.z=(i-1)*.1}
 const tie=new THREE.Mesh(new THREE.TorusGeometry(.13,.02,6,12),M.gold);tie.position.set(0,-.12,-.23);tie.rotation.x=Math.PI/2;tie.castShadow=true;head.add(tie);
 // Cloth collar.
 const collar=ell(core,M.blueDark,0,1.78,.032,.40,.16,.28,11);
 // Arms with pivot points.
 const arms=[];
 for(const sign of [-1,1]){
  const a=new THREE.Group();a.position.set(sign*.48,1.69,0);body.add(a);arms.push(a);
  ell(a,M.under,0,-.25,0,.14,.28,.17,11);
  ell(a,M.silver,sign*.055,-.11,.005,.25,.19,.24,12);
  ell(a,M.gold,sign*.12,-.10,.13,.065,.12,.14,9);
  cyl(a,M.silverDark,0,-.44,.02,.135,.165,.34,10);
  ell(a,M.silverLight,0,-.48,.095,.17,.13,.16,11);
  ell(a,M.leather,0,-.67,.05,.17,.16,.17,10);
  ell(a,M.gold,0,-.69,.185,.085,.09,.06,8);
  if(sign===-1){const blade=sword(a);blade.name='KnightDefaultSword';blade.position.set(-.18,-.79,.18);blade.rotation.set(-.92,.05,.24);}
  else{const shield=makeShield(a);shield.position.set(.09,-.57,.36);shield.scale.set(.83,.83,.83);}
 }
 // Leg pivots.
 const legs=[];
 for(const sign of [-1,1]){
  const l=new THREE.Group();l.position.set(sign*.21,.97,0);body.add(l);legs.push(l);
  ell(l,M.blueDark,0,-.18,0,.18,.30,.19,11);
  cyl(l,M.silverDark,0,-.41,.015,.155,.12,.30,10);
  ell(l,M.gold,0,-.53,.13,.16,.105,.10,9);
  const boot=ell(l,M.silverDark,0,-.71,.082,.19,.22,.225,11);
  ell(l,M.silverLight,0,-.79,.255,.20,.12,.25,10);
  box(l,M.leather,0,-.79,.38,.26,.07,.05);
 }
 // Cape with hinged layered strips.
 const cape=[];
 for(let i=0;i<5;i++){
  const strip=new THREE.Group();strip.position.set((i-2)*.152,1.76,-.235);body.add(strip);
  const s=new THREE.Shape();s.moveTo(-.11,0);s.lineTo(.11,0);s.lineTo(.16,-1.07);s.quadraticCurveTo(.025,-1.21,-.15,-1.05);s.closePath();
  const cl=mesh(strip,new THREE.ExtrudeGeometry(s,{depth:.028,bevelEnabled:true,bevelSize:.015,bevelThickness:.008,bevelSegments:1,curveSegments:5}),i%2?M.blueLight:M.blue);
  cl.position.z=-.045;cl.rotation.x=-.1;
  cape.push(strip);
 }
 for(const x of [-.3,.3])ell(core,M.gold,x,1.75,-.23,.085,.075,.09,9);
 return{root,body,core,head,arms,legs,cape};
}

const obj=buildKnight();
obj.root.scale.setScalar(.65*(options.scale??1));
obj.root.userData.r={unit:obj.body,legs:[obj.legs[1],obj.legs[0]],armR:obj.arms[1],armL:obj.arms[0],head:obj.head,cape:obj.cape[2]||null,
 amp:.65,sw:2.1,aim:false,sit:false,role:'knight'};
obj.root.userData.hinariaV2=true;return obj.root;
}
