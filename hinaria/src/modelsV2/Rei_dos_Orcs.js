import * as THREE from 'three';
import {markEquipment,finalizeVisualRig} from '../player/equipmentSockets.js';
export function createModel(options={}){
 const standard=(color,metalness=0,roughness=.7,flat=true)=>new THREE.MeshStandardMaterial({color,metalness,roughness,flatShading:flat});
 const M={
  skin:standard('#577a43',0,.87),skinLight:standard('#83a95e',0,.85),skinDark:standard('#375339',0,.9),
  ivory:standard('#f6e1ae',0,.55),teeth:standard('#f8edca',0,.45),iris:standard('#eaaf43',.05,.34),pupil:standard('#221b13',0,.42),eyeWhite:standard('#d5d5ad',0,.65),
  iron:standard('#83929a',.7,.35),ironLight:standard('#bcc5bf',.72,.31),ironDark:standard('#374b53',.68,.46),
  gold:standard('#d7a348',.65,.37),goldLight:standard('#ffe09a',.6,.3),bronze:standard('#94612f',.65,.46),
  crimson:standard('#8c2936',.05,.9),cloth:standard('#4a1d29',0,.95),black:standard('#1c2724',.05,.9),
  hair:standard('#24221e',0,.93),hairLight:standard('#403528',0,.87),leather:standard('#5f3826',0,.93),leatherLight:standard('#936043',0,.9),
  ruby:standard('#b51f39',.2,.25),rubyLight:standard('#ec5571',.2,.23),wood:standard('#62412b',0,.93),stone:standard('#313c3d',.1,.93)
 };
 const sphere=new THREE.SphereGeometry(1,12,9);
 const meshes=[];
 function add(parent,geometry,material,x=0,y=0,z=0){const v=new THREE.Mesh(geometry,material);v.position.set(x,y,z);v.castShadow=true;v.receiveShadow=true;parent.add(v);meshes.push(v);return v}
 function ell(p,m,x,y,z,a,b,c,seg=0){const o=add(p,seg?new THREE.SphereGeometry(1,seg,Math.max(6,Math.round(seg*.7))):sphere,m,x,y,z);o.scale.set(a,b,c);return o}
 function box(p,m,x,y,z,a,b,c){return add(p,new THREE.BoxGeometry(a,b,c),m,x,y,z)}
 function cyl(p,m,x,y,z,top,bottom,h,n=10){return add(p,new THREE.CylinderGeometry(top,bottom,h,n),m,x,y,z)}
 function cone(p,m,x,y,z,r,h,n=7){return add(p,new THREE.ConeGeometry(r,h,n),m,x,y,z)}
 function rod(p,m,a,b,r=.06,r2=r){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=B.clone().sub(A),o=cyl(p,m,...A.clone().add(B).multiplyScalar(.5).toArray(),r,r2,v.length(),9);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o}
 function extrude(p,mat,shape,depth,x,y,z,bevel=.02){const geo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,curveSegments:4});return add(p,geo,mat,x,y,z)}
 function diamond(p,m,x,y,z,sz){const o=add(p,new THREE.OctahedronGeometry(sz,0),m,x,y,z);return o}
 function ringSectionGeometry(profiles,sides=12){const positions=[],indices=[],uvs=[];for(let j=0;j<profiles.length;j++){const [y,rx,rz,cx=0,cz=0]=profiles[j];for(let i=0;i<sides;i++){const t=i*2*Math.PI/sides;positions.push(cx+Math.cos(t)*rx,y,cz+Math.sin(t)*rz);uvs.push(i/sides,j/(profiles.length-1))}}for(let j=0;j<profiles.length-1;j++)for(let i=0;i<sides;i++){const a=j*sides+i,b=j*sides+(i+1)%sides,c=(j+1)*sides+i,d=(j+1)*sides+(i+1)%sides;indices.push(a,c,b,b,c,d)}for(let i=1;i<sides-1;i++){indices.push(0,i,i+1);const end=(profiles.length-1)*sides;indices.push(end,end+i+1,end+i)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g}
 function bladedClump(p,m,pts,widths,thick){const curve=new THREE.CatmullRomCurve3(pts.map(v=>new THREE.Vector3(...v)),false,'centripetal');const P=[],indices=[];const count=6;for(let i=0;i<=count;i++){const t=i/count,point=curve.getPoint(t),dir=curve.getTangent(t).normalize();let side=new THREE.Vector3(0,0,1).cross(dir).normalize();if(side.length()<.2)side.set(1,0,0);const w=(widths[0]*(1-t)+widths[1]*t)*Math.max(.045,Math.sin(Math.PI*(.08+t*.9))),th=thick*(1-t*.7);const front=new THREE.Vector3(0,0,1);const offsets=[side.clone().multiplyScalar(w),front.clone().multiplyScalar(th),side.clone().multiplyScalar(-w),front.clone().multiplyScalar(-th)];for(const v of offsets)P.push(point.x+v.x,point.y+v.y,point.z+v.z)}for(let i=0;i<count;i++)for(let k=0;k<4;k++){let a=i*4+k,b=i*4+(k+1)%4,c=(i+1)*4+k,d=(i+1)*4+(k+1)%4;indices.push(a,c,b,b,c,d)}indices.push(0,1,2,0,2,3);const a=count*4;indices.push(a,a+2,a+1,a,a+3,a+2);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setIndex(indices);g.computeVertexNormals();return add(p,g,m)}
 function makeAxe(parent){const g=new THREE.Group();parent.add(g); // Pivot at the fist
  cyl(g,M.wood,0,.08,0,.067,.074,1.78,10);cyl(g,M.leather,0,-.06,0,.080,.080,.37,10);for(let i=0;i<5;i++)cyl(g,M.gold,0,-.22+i*.08,0,.082,.082,.012,10);
  const blade=new THREE.Shape();blade.moveTo(-.11,.36);blade.quadraticCurveTo(-.45,.45,-.78,.71);blade.quadraticCurveTo(-.64,.92,-.72,1.17);blade.quadraticCurveTo(-.43,1.01,-.11,1.08);blade.closePath();extrude(g,M.ironLight,blade,.08,0,0,-.045,.035);
  const bladeR=new THREE.Shape();bladeR.moveTo(.11,.42);bladeR.quadraticCurveTo(.31,.54,.45,.68);bladeR.quadraticCurveTo(.31,.85,.43,1.03);bladeR.quadraticCurveTo(.24,.94,.11,1.00);bladeR.closePath();extrude(g,M.ironDark,bladeR,.085,0,0,-.04,.025);
  cyl(g,M.gold,0,.77,.005,.13,.13,.26,8);diamond(g,M.ruby,0,.75,.14,.085);cyl(g,M.gold,0,1.02,0,.115,.10,.10,8);
  return g;
 }
 function makeRoyalShield(parent){const g=new THREE.Group();parent.add(g);const s=new THREE.Shape();s.moveTo(-.49,.49);s.quadraticCurveTo(0,.68,.49,.49);s.lineTo(.44,-.15);s.quadraticCurveTo(.25,-.54,0,-.75);s.quadraticCurveTo(-.25,-.54,-.44,-.15);s.closePath();
  extrude(g,M.gold,s,.075,0,0,0,.055);const inner=extrude(g,M.crimson,s,.04,0,0,.121,0);inner.scale.set(.85,.86,1);
  const crest=new THREE.Shape();crest.moveTo(0,.32);crest.lineTo(.17,.04);crest.lineTo(.09,-.26);crest.lineTo(0,-.39);crest.lineTo(-.09,-.26);crest.lineTo(-.17,.04);crest.closePath();extrude(g,M.goldLight,crest,.029,0,0,.172,.018);diamond(g,M.ruby,0,.14,.23,.10);
  for(const x of [-.32,.32])for(const y of [-.12,.29])ell(g,M.goldLight,x,y,.16,.035,.035,.025,8);
  g.rotation.y=-.12;return g;
 }
 function buildKing(){const root=new THREE.Group(),body=new THREE.Group();root.add(body);const core=new THREE.Group();body.add(core);const rig={root,body,core};
  // Orc proportions: wider upper torso and narrower waist.
  add(core,ringSectionGeometry([[1.28,.39,.25],[1.48,.46,.29],[1.83,.63,.36],[2.11,.70,.40],[2.45,.59,.31],[2.55,.35,.22]],12),M.skinDark);
  ell(core,M.ironDark,0,1.92,.055,.60,.50,.35,13);
  // Front breastplate with stepped thickness.
  ell(core,M.iron,0,1.96,.295,.54,.42,.11,14);ell(core,M.ironLight,0,2.00,.394,.34,.30,.027,12);
  const central=box(core,M.gold,0,1.99,.435,.065,.49,.04);central.rotation.z=.03;
  for(const side of [-1,1]){ell(core,M.gold,side*.43,1.98,.32,.045,.30,.065,8);ell(core,M.ironDark,side*.4,1.6,.3,.14,.19,.07,9)}
  diamond(core,M.ruby,0,2.08,.49,.13);ell(core,M.gold,0,2.08,.48,.155,.155,.036,9);
  // Waist, belting, royal loincloth.
  ell(core,M.leather,0,1.33,.02,.46,.25,.29,10);box(core,M.leather,0,1.38,.28,.89,.16,.17);box(core,M.gold,0,1.39,.38,.23,.20,.04);diamond(core,M.ruby,0,1.40,.42,.075);
  for(let i=0;i<5;i++){const t=(i-2)*.42;const p=box(core,i%2?M.ironDark:M.iron,Math.sin(t)*.34,1.09,Math.cos(t)*.19,.20,.42,.09);p.rotation.y=-t}
  const loin=box(core,M.crimson,0,.98,.27,.32,.60,.075);loin.rotation.x=.07;box(core,M.gold,0,1.04,.31,.05,.52,.035);diamond(core,M.goldLight,0,.88,.36,.095);
  // Neck and head pivot.
  cyl(core,M.skinDark,0,2.48,0,.19,.23,.35,10);
  const head=new THREE.Group();head.position.set(0,2.63,0);body.add(head);rig.head=head;
  const skull=add(head,ringSectionGeometry([[-.36,.15,.20,0,-.025],[-.27,.28,.26,0,.02],[-.11,.37,.33,0,0],[.08,.40,.35,0,.005],[.26,.38,.35,0,-.02],[.46,.34,.32,0,-.055],[.59,.25,.26,0,-.065],[.64,.10,.13,0,-.05]],16),M.skin);
  ell(head,M.skinLight,0,.065,.285,.295,.22,.12,14);
  for(const sign of [-1,1]){const x=sign*.39;
    const ear=new THREE.Shape();ear.moveTo(0,-.11);ear.quadraticCurveTo(sign*.10,.045,sign*.25,.18);ear.quadraticCurveTo(sign*.17,.22,0,.13);ear.closePath();extrude(head,M.skin,ear,.08,x,.04,-.015,.012);
    const earInner=ell(head,M.skinDark,sign*.48,.095,.055,.06,.085,.025,9);earInner.rotation.z=-sign*.30;
    // Heavy brow line, amber eye, eyelids.
    ell(head,M.skinDark,sign*.17,.19,.331,.155,.067,.062,11);
    ell(head,M.eyeWhite,sign*.17,.105,.348,.095,.064,.028,12);
    ell(head,M.iris,sign*.17,.099,.372,.052,.057,.021,12);
    ell(head,M.pupil,sign*.17,.100,.389,.028,.036,.009,10);
    ell(head,M.eyeWhite,sign*.17-.014,.127,.398,.012,.014,.006,8);
    let brow=ell(head,M.hair,sign*.174,.234,.345,.144,.038,.035,10);brow.rotation.z=sign*.16;
    let lower=ell(head,M.skinLight,sign*.175,.040,.357,.101,.020,.017,10);lower.rotation.z=-sign*.12;
    ell(head,M.skinLight,sign*.27,-.06,.275,.125,.105,.08,10);
  }
  // Wide integrated nose and layered mouth/jaw with fangs.
  ell(head,M.skinDark,0,.028,.365,.175,.14,.102,10);ell(head,M.skin,0,-.004,.41,.115,.073,.10,10);
  ell(head,M.skinLight,0,-.185,.275,.29,.14,.13,14);
  const jaw=new THREE.Group();jaw.position.set(0,-.16,.205);head.add(jaw);rig.jaw=jaw;
  ell(jaw,M.skinDark,0,-.105,.06,.29,.14,.19,13);
  ell(jaw,M.skinLight,0,-.13,.12,.23,.065,.12,11);
  ell(jaw,M.black,0,-.015,.23,.17,.026,.024,11);
  for(const sign of [-1,1]){
    const tusk=cone(jaw,M.ivory,sign*.20,.06,.245,.071,.25,9);tusk.rotation.z=-sign*.17;
    ell(jaw,M.skinLight,sign*.20,-.046,.19,.079,.061,.065,10);
  }
  // Scar across one eyebrow, thick beard sections underneath.
  const scar=rod(head,M.ivory,[-.245,.11,.385],[-.32,-.025,.344],.012);scar.rotation.z=-.02;
  for(let i=-2;i<=2;i++){const cl=bladedClump(head,i%2?M.hairLight:M.hair,[[i*.105,-.18,.29],[i*.11,-.36,.26],[i*.096,-.47,.11]],[.105,.015],.07);}
  // Crown + hair + short back locks (all follow head pivot).
  const hair=new THREE.Group();head.add(hair);rig.hair=hair;
  ell(hair,M.hair,0,.45,-.04,.37,.195,.32,13);
  for(let i=0;i<9;i++){const x=(i-4)*.085;bladedClump(hair,i%3===0?M.hairLight:M.hair,[[x,.53,.12],[x*.96,.44,.32],[x+(i%2?.03:-.035),.25+(i%3)*.025,.348]],[.12,.01],.06)}
  for(const s of [-1,1])for(let i=0;i<3;i++){const x=s*(.28+i*.028);bladedClump(hair,M.hair,[[x,.38,-.06],[x+s*.04,.13,-.19],[x+s*.02,-.07-i*.04,-.18]],[.11,.015],.075)}
  for(let i=0;i<6;i++){const x=(i-2.5)*.12;bladedClump(hair,i%2?M.hair:M.hairLight,[[x,.39,-.26],[x*1.03,.15,-.38],[x*.9,-.19,-.28]],[.13,.015],.09)}
  const crown=new THREE.Group();head.add(crown);rig.crown=crown;
  for(let i=0;i<11;i++){const a=i*2*Math.PI/11,xx=Math.sin(a)*.36,zz=Math.cos(a)*.30-.03;
    const gold=cyl(crown,M.gold,xx,.43,zz,.073,.073,.12,8);gold.rotation.y=a;
    const tip=cone(crown,i%3===0?M.goldLight:M.gold,xx,.58+(i%3)*.02,zz,.088,.28+(i%3)*.035,5);tip.rotation.z=-Math.sin(a)*.21;
  }
  const centerGem=diamond(crown,M.ruby,0,.48,.338,.105);centerGem.rotation.z=Math.PI/4;
  // Arms: muscular, heavily armored, animated by old-style pivots.
  const arms=[];
  for(const sign of [-1,1]){const a=new THREE.Group();a.position.set(sign*.64,2.31,0);body.add(a);arms.push(a);
    ell(a,M.skinDark,0,-.34,0,.235,.38,.23,13);
    ell(a,M.ironDark,sign*.07,-.07,.0,.32,.23,.31,12);
    ell(a,M.iron,sign*.10,-.02,.10,.30,.165,.27,11);
    ell(a,M.gold,sign*.10,-.01,.245,.115,.08,.065,8);
    for(const k of [-1,1])ell(a,M.gold,sign*.16,-.16,k*.145,.05,.13,.045,8);
    cyl(a,M.iron,-sign*.015,-.49,.02,.21,.24,.34,10);
    ell(a,M.ironLight,0,-.62,.12,.235,.16,.17,10);
    ell(a,M.skin,0,-.81,.075,.21,.20,.175,11);
    for(let j=0;j<3;j++)ell(a,M.skinLight,(j-1)*.09,-.90,.20,.051,.09,.065,8);
    if(sign===1){
      const axe=makeAxe(a);
      // The wrapped mid-section of the shaft (local y=-0.06) passes through the right fist.
      axe.position.set(.015,-.86,.17);
      // The head/blade is at the positive-Y end of the axe model.
      // Aim that end downward AND forward (+Z), rather than sideways behind the shoulder.
      const bladeHeading=new THREE.Vector3(.09,-.78,.62).normalize();
      axe.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bladeHeading);
      axe.rotateY(-Math.PI/7); // Small twist so the cutting edge presents a forward-facing angle.
      rig.axe=axe;
    }
    else{const shield=makeRoyalShield(a);shield.position.set(-.10,-.55,.38);shield.scale.set(.90,.90,.90);rig.shield=shield}
  }
  rig.arms=arms;
  const legs=[];
  for(const sign of [-1,1]){const l=new THREE.Group();l.position.set(sign*.26,1.21,0);body.add(l);legs.push(l);
    ell(l,M.skinDark,0,-.20,.0,.23,.32,.24,12);ell(l,M.ironDark,0,-.41,.02,.23,.23,.21,11);
    cyl(l,M.iron,0,-.59,.03,.185,.23,.31,10);ell(l,M.gold,0,-.49,.20,.20,.09,.08,9);
    ell(l,M.ironDark,0,-.84,.09,.25,.22,.25,12);ell(l,M.ironLight,0,-.95,.28,.26,.13,.28,11);
    box(l,M.leather,0,-.99,.46,.31,.065,.09);
  }rig.legs=legs;
  // Cloth cape and ragged regal panels, with own animation pivots.
  const cape=[];for(let i=0;i<5;i++){const c=new THREE.Group();c.position.set((i-2)*.215,2.39,-.31);body.add(c);const s=new THREE.Shape();s.moveTo(-.15,0);s.lineTo(.15,0);s.lineTo(.22,-1.25);s.quadraticCurveTo(.05,-1.45,-.19,-1.28);s.closePath();const piece=extrude(c,i%2?M.crimson:M.cloth,s,.035,0,0,0,.017);piece.rotation.x=-.08;cape.push(c)}
  for(const side of [-1,1])ell(core,M.gold,side*.50,2.34,-.32,.10,.11,.10,9);rig.cape=cape;
  return rig;
 }

const obj=buildKing();
obj.root.scale.setScalar(.57*(options.scale??1));
obj.root.userData.r={unit:obj.body,legs:[obj.legs[1],obj.legs[0]],armR:obj.arms[1],armL:obj.arms[0],head:obj.head,cape:obj.cape[2]||null,
 amp:.58,sw:1.8,aim:false,sit:false,role:'orc'};
obj.root.userData.hinariaV2=true;
markEquipment(obj.axe,'axe',[0,-.06,0],'upY');
return finalizeVisualRig(obj.root,{...options,kind:'king',handOffset:[0,-.81,.075],weapon:obj.axe,shield:obj.shield,capes:obj.cape});
}
