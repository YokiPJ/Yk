import * as THREE from 'three';
export function createModel(options={}){
const CFG={"id": "Yoki", "name": "YOKI", "role": "replayOrc", "subtitle": "O Bárbaro do Replay", "summary": "Último da Garra Cinzenta • Observa, aprende, repete. Carrega o espelho negro.", "skin": "#708d52", "skinLight": "#9eb477", "hair": "#2a2420", "hairLight": "#514333", "iris": "#e3bb70", "primary": "#4d5456", "secondary": "#535145", "trim": "#a99c78", "metal": "#878e85", "metalDark": "#434a4b", "leather": "#493c33", "scale": 1.08, "weapon": "axe", "hairStyle": "braids"};
if(options.skin!=null) CFG.skin=new THREE.Color(options.skin).getStyle();
if(options.hair!=null) CFG.hair=new THREE.Color(options.hair).getStyle();
const mat=(c,metalness=0,roughness=.72)=>new THREE.MeshStandardMaterial({color:c,metalness,roughness,flatShading:true});
const P={skin:mat(CFG.skin),skinLight:mat(CFG.skinLight),hair:mat(CFG.hair),hairLight:mat(CFG.hairLight),iris:mat(CFG.iris),white:mat('#fff6df'),pupil:mat('#18212c'),lip:mat('#9d624e'),primary:mat(CFG.primary),secondary:mat(CFG.secondary),trim:mat(CFG.trim,.40,.4),metal:mat(CFG.metal,.70,.38),metalDark:mat(CFG.metalDark,.65,.54),leather:mat(CFG.leather,.02,.87),bone:mat('#ebe2ca'),dark:mat('#222a2a'),red:mat('#a6494c'),glow:mat('#7de1cc',.1,.24)};
const meshes=[];const add=(parent,geom,material,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geom,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);meshes.push(m);return m};
function ell(p,m,x,y,z,sx,sy,sz,seg=11){const o=add(p,new THREE.SphereGeometry(1,seg,Math.max(6,Math.round(seg*.72))),m,x,y,z);o.scale.set(sx,sy,sz);return o}
function box(p,m,x,y,z,sx,sy,sz){return add(p,new THREE.BoxGeometry(sx,sy,sz),m,x,y,z)}
function cyl(p,m,x,y,z,t,b,h,n=10){return add(p,new THREE.CylinderGeometry(t,b,h,n),m,x,y,z)}
function cone(p,m,x,y,z,r,h,n=7){return add(p,new THREE.ConeGeometry(r,h,n),m,x,y,z)}
function rod(p,m,a,b,r=.05){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),dir=B.clone().sub(A);const c=cyl(p,m,...A.clone().add(B).multiplyScalar(.5).toArray(),r,r,dir.length(),8);c.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());return c}
function gem(p,m,x,y,z,s=.12){return add(p,new THREE.OctahedronGeometry(s,0),m,x,y,z)}
function plate(p,m,x,y,z,sx,sy,sz){const e=ell(p,m,x,y,z,sx,sy,sz,12);return e}
function leaf(p,m,x,y,z,sz,ry=0){const sh=new THREE.Shape();sh.moveTo(0,-.15);sh.quadraticCurveTo(-.20,0,0,.4);sh.quadraticCurveTo(.20,0,0,-.15);const o=add(p,new THREE.ExtrudeGeometry(sh,{depth:.028,bevelEnabled:true,bevelSize:.012,bevelThickness:.011,bevelSegments:1}),m,x,y,z);o.scale.setScalar(sz);o.rotation.y=ry;return o}
function strand(p,m,coords,w=.11){const curve=new THREE.CatmullRomCurve3(coords.map(t=>new THREE.Vector3(...t)),false,'centripetal');const pts=[],idx=[],n=7;for(let i=0;i<=n;i++){const t=i/n,pos=curve.getPoint(t),tangent=curve.getTangent(t).normalize();let side=new THREE.Vector3(0,0,1).cross(tangent);if(side.lengthSq()<.01)side.set(1,0,0);side.normalize();const width=w*Math.pow(Math.max(.018,1-t),.7),thick=.054*(1-t*.72);const vectors=[side.clone().multiplyScalar(width),new THREE.Vector3(0,0,thick),side.clone().multiplyScalar(-width),new THREE.Vector3(0,0,-thick)];for(const v of vectors)pts.push(pos.x+v.x,pos.y+v.y,pos.z+v.z)}for(let i=0;i<n;i++)for(let k=0;k<4;k++){const a=i*4+k,b=i*4+(k+1)%4,c=a+4,d=b+4;idx.push(a,c,b,b,c,d)}idx.push(0,1,2,0,2,3);const t=n*4;idx.push(t,t+2,t+1,t,t+3,t+2);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));g.setIndex(idx);g.computeVertexNormals();return add(p,g,m)}
function createSword(p,rusty=false){const g=new THREE.Group();p.add(g);cyl(g,P.leather,0,.14,0,.066,.07,.34);cyl(g,P.trim,0,.37,0,.115,.10,.08);rod(g,P.trim,[-.24,-.055,0],[.24,-.055,0],.052);const blade=cyl(g,rusty?P.metalDark:P.metal,0,-.43,0,.035,.113,.70,4);blade.rotation.y=Math.PI/4;const tip=cone(g,P.metal,0,-.83,0,.095,.20,4);tip.rotation.z=Math.PI;return g}
function createAxe(p){const g=new THREE.Group();p.add(g);cyl(g,P.leather,0,0,0,.060,.065,1.46);cyl(g,P.trim,0,-.05,0,.085,.08,.35);const sh=new THREE.Shape();sh.moveTo(-.10,.33);sh.quadraticCurveTo(-.48,.43,-.63,.67);sh.quadraticCurveTo(-.49,.85,-.62,1.05);sh.quadraticCurveTo(-.35,.97,-.10,.90);sh.closePath();add(g,new THREE.ExtrudeGeometry(sh,{depth:.09,bevelEnabled:true,bevelSize:.025,bevelThickness:.02,bevelSegments:1}),P.metal,0,0,-.045);cyl(g,P.trim,0,.66,0,.12,.12,.23,8);gem(g,P.red,0,.64,.11,.065);return g}
function createStaff(p,branch=false){const g=new THREE.Group();p.add(g);cyl(g,branch?P.leather:P.metalDark,0,.25,0,.075,.085,1.95,9);for(let i=0;i<4;i++)cyl(g,P.trim,0,-.45+i*.22,0,.089,.089,.025,9);if(branch){rod(g,P.leather,[0,1.08,0],[-.27,1.48,0],.075);rod(g,P.leather,[0,1.08,0],[.25,1.46,0],.075);leaf(g,P.secondary,-.25,1.42,0,.6,-.2);leaf(g,P.secondary,.22,1.41,.04,.5,.35);gem(g,P.glow,0,1.38,.04,.17)}else{const crown=cone(g,P.trim,0,1.25,0,.25,.42,6);crown.rotation.z=Math.PI;gem(g,P.glow,0,1.54,0,.24);ell(g,P.glow,0,1.54,.16,.07,.08,.09,9)}return g}
function createClub(p,elder=false){const g=new THREE.Group();p.add(g);cyl(g,P.leather,0,.04,0,.078,.10,1.65,9);const head=ell(g,elder?P.metalDark:P.leather,0,.88,0,.28,.5,.29,11);head.rotation.z=.09;for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const h=cone(g,P.metal,Math.sin(a)*.27,.85+Math.cos(a)*.20,Math.cos(a)*.20,.085,.23,6);h.rotation.z=Math.sin(a)*.55}if(elder){for(let i=0;i<4;i++)gem(g,P.glow,0,.57+i*.16,.29,.07)}return g}
function createHammer(p){const g=new THREE.Group();p.add(g);cyl(g,P.leather,0,.09,0,.068,.074,1.20,9);cyl(g,P.trim,0,-.26,0,.083,.081,.21,9);const h=box(g,P.metal,0,.61,0,.72,.25,.27);ell(g,P.metalDark,-.37,.61,0,.16,.20,.19,8);ell(g,P.metalDark,.37,.61,0,.16,.20,.19,8);cyl(g,P.trim,0,.43,0,.11,.11,.09,9);return g}
function createBow(p){const g=new THREE.Group();p.add(g);const upper=[[0,-.8,0],[.20,-.46,0],[.29,0,0],[.20,.45,0],[0,.80,0]];for(let i=0;i<upper.length-1;i++)rod(g,P.leather,upper[i],upper[i+1],.035);rod(g,P.white,[0,-.80,.014],[0,.80,.014],.012);cyl(g,P.trim,.29,0,0,.065,.06,.22);return g}
function shield(p){const g=new THREE.Group();p.add(g);const sh=new THREE.Shape();sh.moveTo(-.37,.40);sh.quadraticCurveTo(0,.52,.37,.40);sh.lineTo(.34,-.18);sh.quadraticCurveTo(.20,-.43,0,-.60);sh.quadraticCurveTo(-.20,-.43,-.34,-.18);sh.closePath();add(g,new THREE.ExtrudeGeometry(sh,{depth:.065,bevelEnabled:true,bevelThickness:.025,bevelSize:.03,bevelSegments:1}),P.trim);const inner=add(g,new THREE.ShapeGeometry(sh,12),P.primary,0,0,.11);inner.scale.set(.84,.84,1);gem(g,P.trim,0,.02,.14,.18);g.rotation.y=-.15;return g}
function buildHair(h,style){if(style==='none')return;const root=new THREE.Group();h.add(root);
 if(style==='hood'){const hood=ell(root,P.secondary,0,.35,-.04,.43,.36,.36,13);ell(root,P.primary,0,.17,-.12,.43,.29,.32,12);return}
 ell(root,P.hair,0,.37,-.055,.362,.22,.31,12);
 if(style==='mohawk'){for(let i=0;i<6;i++){const t=(i-2.5)*.145;const tuft=cone(root,i%2?P.hair:P.hairLight,0,.58-.07*Math.abs(t),t,.14,.30,6);tuft.rotation.z=.13*(i-2.5)}return}
 const bangs=style==='medium'?5:style==='long'?7:style==='asymmetric'?5:style==='braids'?6:6;
 for(let i=0;i<bangs;i++){const t=(i-(bangs-1)/2),x=t*.113,weight=style==='asymmetric'?(i*.05):0;strand(root,i%3===0?P.hairLight:P.hair,[[x*.75,.53,.11],[x,.40,.31],[x+(i%2?.035:-.025)+weight,.25-.020*Math.abs(t),.335]],.11+.016*(i%2))}
 for(const s of [-1,1]){for(let i=0;i<2;i++){const sy=style==='short'?.04:style==='medium'?-.24:-.36;strand(root,i%2?P.hairLight:P.hair,[[s*.32,.35,.05],[s*(.37+i*.04),.11,-.02],[s*(.32+i*.05),sy-.10*i,-.04]],.085)}}
 const long=style==='long'||style==='braids'||style==='medium';for(let i=0;i<(long?9:5);i++){const x=(i-((long?9:5)-1)/2)*.084;strand(root,i%2?P.hair:P.hairLight,[[x,.39,-.25],[x*1.04,.06,-.35],[x*.9,long?-.40:-.10,-.28]],.096)}
 if(style==='braids'){for(const s of [-1,1]){for(let i=0;i<5;i++){const yy=-.07-i*.12;ell(root,i%2?P.hair:P.hairLight,s*(.31+.012*Math.sin(i)),yy,.015,.075,.093,.072,7)}cyl(root,P.trim,s*.31,-.68,.01,.055,.055,.06,8)}}
}
function buildCharacter(){const root=new THREE.Group(),body=new THREE.Group();root.add(body);root.scale.setScalar(CFG.scale);const core=new THREE.Group();body.add(core);const rig={root,body,core,arms:[],legs:[],cape:[],jaw:null};const r=CFG.role,mon=['troll','orc','elder','replayOrc'].includes(r),sk=r==='skeleton';const shoulderW=mon?.64:.49;const headY=mon?2.46:2.16;
 // Coherent class-specific silhouette; everything follows animation pivots.
 ell(core,sk?P.dark:P.secondary,0,1.52,0,mon?.54:.40,mon?.55:.44,mon?.30:.27,13);
 if(sk){ell(core,P.bone,0,1.53,.08,.28,.39,.16,10);for(let i=0;i<5;i++){const y=1.40+i*.13;const rib=ell(core,P.bone,0,y,.22,.31,.029,.10,10);rib.rotation.z=.03*i}cyl(core,P.bone,0,1.54,.29,.055,.06,.56,8)}
 else{ell(core,mon?P.skin:P.metal,0,1.62,.17,mon?.54:.37,mon?.44:.37,.12,12);ell(core,P.primary,0,1.48,.275,mon?.41:.25,.26,.063,11);box(core,P.trim,0,1.53,.337,.05,.42,.038);for(const s of [-1,1])ell(core,P.trim,s*(mon?.40:.285),1.66,.20,.032,.26,.05,9)}
 if(['mage','druid','sage'].includes(r)){ell(core,P.primary,0,1.18,0,.40,.24,.28,11);for(let i=0;i<6;i++){const a=i*Math.PI*2/6,x=Math.sin(a)*.30,z=Math.cos(a)*.15;const p=box(core,i%2?P.secondary:P.primary,x,.91,z,.20,.65,.08);p.rotation.y=-a}}else{box(core,P.leather,0,1.09,.24,mon?.90:.76,.13,.12);box(core,P.trim,0,1.09,.32,.18,.17,.045)}
 if(r==='blacksmith'){box(core,P.leather,0,.96,.33,.45,.66,.07);for(const x of [-.21,.21])rod(core,P.leather,[x,1.50,.22],[x,1.04,.34],.04)}
 if(r==='bandit'){const scarf=ell(core,P.red,0,1.88,.11,.40,.17,.30,11);scarf.rotation.x=.12}
 if(r==='druid'){gem(core,P.glow,0,1.58,.40,.20);for(const s of [-1,1])leaf(core,P.secondary,s*.33,1.77,.25,.64,s*.4)}
 if(r==='mage'){gem(core,P.glow,0,1.66,.40,.18);for(const s of [-1,1])ell(core,P.trim,s*.30,1.74,.24,.07,.04,.07,8)}
 if(r==='paladin'){gem(core,P.trim,0,1.56,.42,.15);for(const s of [-1,1])box(core,P.trim,s*.31,1.50,.30,.06,.42,.035)}
 if(r==='elder'){for(const s of [-1,1]){gem(core,P.glow,s*.37,1.83,.35,.11);cone(core,P.metal,s*.47,2.40,-.08,.19,.46,6)}}
 if(r==='replayOrc'){
   // Yoki is a practical fighter, not a wizard. Worn crossed leather and old gray-claw insignia.
   rod(core,P.leather,[-.41,2.04,.31],[.34,1.26,.36],.075);
   rod(core,P.leather,[.31,2.02,.30],[-.36,1.28,.34],.041);
   box(core,P.metalDark,-.30,1.78,.345,.31,.35,.085).rotation.z=-.12;
   for(let k=0;k<3;k++)rod(core,P.metal,[ -.41+k*.087,1.93,.406],[-.36+k*.087,1.76,.409],.012);
   ell(core,P.leather,0,1.00,.27,.45,.16,.24,10);
   // Black 'mirror' found frozen in the Cave of Forgetting. Secured on LEFT hip, not floating.
   const mirror=new THREE.Group();mirror.name='EspelhoDoReplay';
   mirror.position.set(-.46,1.16,.225);mirror.rotation.y=-.32;core.add(mirror);
   box(mirror,P.dark,0,0,0,.30,.39,.10);
   box(mirror,P.metalDark,0,0,.057,.255,.34,.014);
   const glassMat=new THREE.MeshStandardMaterial({color:'#254948',emissive:'#2d8b75',emissiveIntensity:.40,roughness:.18,metalness:.12});
   box(mirror,glassMat,0,.005,.070,.21,.28,.012);
   // Replay/field motif; not a full moving screen or an imported football asset.
   rod(mirror,P.glow,[-.076,.096,.083],[.076,.096,.083],.009);
   rod(mirror,P.glow,[-.076,-.084,.083],[.076,-.084,.083],.009);
   const arrow=cone(mirror,P.glow,.014,-.005,.086,.050,.090,3);arrow.rotation.z=-Math.PI/2;
   for(const x of [-.092,.092])cyl(mirror,P.trim,x,0,.052,.018,.018,.41,7);
   for(const y of [-.20,.20])box(mirror,P.leather,0,y,.028,.34,.055,.08);
   // The mirror can be reached during his idle and never takes the right-hand weapon slot.
   rig.replayMirror=mirror;
 }

 const head=new THREE.Group();head.position.y=headY;body.add(head);rig.head=head;const faceScale=mon?1.13:1;
 ell(head,sk?P.bone:P.skin,0,.12,.03,.345*faceScale,.37*faceScale,.315*faceScale,14);
 if(sk){for(const s of [-1,1]){ell(head,P.dark,s*.15,.11,.305,.091,.09,.035,10);ell(head,P.iris,s*.15,.12,.336,.033,.038,.018,9)}cone(head,P.dark,0,-.045,.32,.069,.09,4);box(head,P.dark,0,-.21,.24,.28,.055,.045);for(let i=0;i<5;i++)box(head,P.bone,(i-2)*.055,-.225,.29,.04,.06,.03)}
 else{for(const s of [-1,1]){const x=s*(mon?.185:.14);const brow=ell(head,P.hair,x,.22,.325,.130,.04,.035,9);brow.rotation.z=s*.15;ell(head,P.white,x,.13,.345,.092,.065,.025,12);ell(head,P.iris,x,.13,.365,.050,.053,.023,10);ell(head,P.pupil,x,.13,.382,.026,.034,.014,9);ell(head,P.white,x-.016,.158,.392,.013,.013,.007,6);ell(head,P.skinLight,x,.065,.346,.094,.024,.025,8);ell(head,P.skinLight,s*.28,.015,.245,.12,.095,.12,9)}ell(head,P.skinLight,0,-.025,.36,mon?.16:.092,mon?.105:.075,.090,10);const mouth=add(head,new THREE.TorusGeometry(.072,.009,6,16,Math.PI),sk?P.dark:P.lip,0,-.16,.33);mouth.rotation.z=Math.PI}
 if(sk){for(const s of [-1,1])ell(head,P.bone,s*.34,.10,.03,.072,.12,.09,9)}else if(mon){for(const s of [-1,1]){const ear=cone(head,P.skin,s*.44,.19,-.01,.15,.38,5);ear.rotation.z=s*.96;cone(head,P.bone,s*.205,-.15,.34,.077,.23,8)}}else{for(const s of [-1,1])ell(head,P.skin,s*.35,.085,.03,.075,.118,.064,8)}
 if(r==='blacksmith'){ell(head,P.hair,0,-.23,.22,.24,.14,.16,9);for(const s of [-1,1])ell(head,P.hair,s*.18,-.26,.20,.10,.13,.09,9)}
 if(r==='bandit'){const mask=ell(head,P.red,0,-.11,.305,.31,.13,.07,12);mask.rotation.x=.08}
 if(r==='mage'){const brim=cyl(head,P.primary,0,.45,0,.42,.42,.09,12);const hat=cone(head,P.primary,0,.82,-.035,.33,.66,9);hat.rotation.z=.11;cyl(head,P.trim,0,.50,0,.345,.345,.07,10);gem(head,P.glow,.11,.55,.29,.09)}
 if(r==='druid'){for(const s of [-1,1]){const branch=rod(head,P.leather,[s*.23,.52,.00],[s*.36,.78,.02],.06);leaf(head,P.secondary,s*.36,.72,.02,.54,s*.3)}}
 if(r==='sage'){const cap=ell(head,P.secondary,0,.42,-.05,.39,.24,.34,10);for(const s of [-1,1]){cone(head,P.bone,s*.08,-.16,.33,.024,.13,6);ell(head,P.skinLight,s*.16,.23,.09,.14,.16,.09,8)}}
 if(r==='troll'||r==='elder'){for(const s of [-1,1]){cone(head,P.bone,s*.28,.48,-.05,.115,.28,7);cone(head,P.bone,s*.21,-.11,.33,.083,.22,6)}ell(head,P.hair,0,.45,-.06,.30,.16,.25,10)}
 if(r==='orc'){for(const s of [-1,1])cone(head,P.bone,s*.22,-.12,.33,.075,.18,7)}
 if(r==='replayOrc'){
   // Broad brow, tusks, jaw scar: battle-hardened but calm and observant.
   ell(head,P.skinLight,0,-.165,.214,.30,.14,.14,13);
   for(const s of [-1,1]){
     cone(head,P.bone,s*.22,-.14,.337,.070,.21,7);
     const ear=cone(head,P.skin,s*.45,.15,-.035,.14,.28,5);ear.rotation.z=s*.95;
     const darkBrow=ell(head,P.hair,s*.185,.226,.34,.145,.047,.042,9);darkBrow.rotation.z=-s*.11;
   }
   rod(head,P.metal,[-.325,.18,.275],[-.25,.02,.33],.012);
 }

 if(r==='paladin'){const circ=cyl(head,P.trim,0,.47,0,.36,.36,.055,13);circ.material=P.trim}
 buildHair(head,CFG.hairStyle);
 // Separate articulated arms and legs.
 for(const s of [-1,1]){const a=new THREE.Group();a.position.set(s*shoulderW,1.78+(mon?.13:0),0);body.add(a);rig.arms.push(a);ell(a,sk?P.bone:mon?P.skin:P.secondary,0,-.28,0,mon?.22:.155,.31,.18,11);ell(a,sk?P.metalDark:P.metal,s*.06,-.105,.03,mon?.29:.235,.18,mon?.28:.225,12);ell(a,P.trim,s*.10,-.105,.17,.08,.065,.07,8);cyl(a,sk?P.bone:P.metalDark,0,-.50,.02,mon?.20:.14,mon?.22:.17,.34,9);ell(a,sk?P.bone:P.skin,0,-.75,.09,mon?.20:.16,.17,.16,9);for(let j=0;j<3;j++)ell(a,sk?P.bone:P.skinLight,(j-1)*.068,-.84,.22,.042,.08,.055,7);
 if(r==='replayOrc'){
   // Practical, asymmetrical gear. Reinforced right bracer and three claw-marks on left guard.
   if(s===1){ell(a,P.leather,0,-.43,.11,.205,.155,.19,10);for(let n=0;n<3;n++)rod(a,P.metal,[ (n-1)*.082,-.50,.278],[ (n-1)*.082+.028,-.40,.284],.013)}
   else{ell(a,P.metalDark,0,-.10,.03,.33,.17,.31,11);for(let n=0;n<3;n++)rod(a,P.trim,[(n-1)*.088,-.15,.335],[(n-1)*.088+.02,-.04,.34],.014)}
 }
 if(s===1){
   // Weapon local origin is the PALM, not the shoulder. Animation stays on the existing arm.
   const handSocket=new THREE.Group();handSocket.name='RightHandGrip';
   handSocket.position.set(0,-.77,.105);a.add(handSocket);rig.rightHandGrip=handSocket;
   const gear=CFG.weapon==='bow'?createBow(handSocket):CFG.weapon==='sword'||CFG.weapon==='rustysword'?createSword(handSocket,CFG.weapon==='rustysword'):CFG.weapon==='axe'?createAxe(handSocket):CFG.weapon==='staff'||CFG.weapon==='branch'||CFG.weapon==='wand'?createStaff(handSocket,CFG.weapon==='branch'):CFG.weapon==='hammer'?createHammer(handSocket):createClub(handSocket,CFG.weapon==='elderclub');
   gear.name='Weapon_'+CFG.weapon;
   // Weapon pose tuned to keep the equipment OUTSIDE the torso and readable in idle view.
   if(CFG.weapon==='staff'||CFG.weapon==='branch'||CFG.weapon==='wand'){
     gear.position.set(.17,.02,.22);gear.rotation.set(-.68,.06,-.24);
   }else if(CFG.weapon==='axe'){
     gear.position.set(.18,-.02,.18);gear.rotation.set(-.82,.02,-.28);
   }else if(CFG.weapon==='bow'){
     // Center the bow grip in the palm, keeping the bow forward and off the torso.
     gear.position.set(.31,-.02,.23);gear.rotation.set(-.24,Math.PI,-.18);
   }else if(CFG.weapon==='sword'||CFG.weapon==='rustysword'){
     gear.position.set(.18,-.03,.18);gear.rotation.set(-.92,.06,-.18);
   }else if(CFG.weapon==='hammer'){
     gear.position.set(.18,-.01,.18);gear.rotation.set(-.86,.04,-.22);
   }else{
     gear.position.set(.18,.01,.18);gear.rotation.set(-.76,.03,-.20);
   }
   if(r==='replayOrc'){
     // A worn twin blade, the head marked by memory/replay rather than royal gold.
     const mark=gem(gear,P.glow,-.25,.73,.060,.065);mark.name='ReplayMark';
     gear.name='MachadoDeYoki';
   }
   rig.weapon=gear;
 }else if(['paladin','orc','bandit','skeleton'].includes(r)){
   // Attached to the forearm, not to the torso or the weapon hand.
   const shieldSocket=new THREE.Group();shieldSocket.name='LeftForearmShield';
   shieldSocket.position.set(-.09,-.55,.27);a.add(shieldSocket);
   const sh=shield(shieldSocket);sh.position.z=.10;sh.scale.setScalar(r==='orc'?1.04:.84);rig.shield=sh;
 }}
 for(const s of [-1,1]){const l=new THREE.Group();l.position.set(s*(mon?.27:.22),1.01,0);body.add(l);rig.legs.push(l);ell(l,sk?P.bone:mon?P.skin:P.primary,0,-.20,0,mon?.23:.175,.31,.20,11);cyl(l,sk?P.bone:P.metalDark,0,-.50,.015,mon?.18:.14,mon?.22:.18,.34,10);ell(l,P.trim,0,-.52,.15,mon?.19:.16,.09,.12,9);ell(l,sk?P.bone:P.metalDark,0,-.75,.08,mon?.24:.195,.23,.24,10);ell(l,P.metal,0,-.84,.23,mon?.25:.21,.12,.26,10)}
 if(['paladin','mage','druid','bandit','orc','elder'].includes(r)){for(let i=0;i<5;i++){const cp=new THREE.Group();cp.position.set((i-2)*.155,1.78,-.25);body.add(cp);rig.cape.push(cp);const sh=new THREE.Shape();sh.moveTo(-.12,0);sh.lineTo(.12,0);sh.lineTo(.155,-1.03);sh.quadraticCurveTo(0,-1.13,-.14,-1.02);sh.closePath();const c=add(cp,new THREE.ExtrudeGeometry(sh,{depth:.034,bevelEnabled:true,bevelThickness:.01,bevelSize:.015,bevelSegments:1}),i%2?P.secondary:P.primary);c.rotation.x=-.1}}
 if(r==='troll'||r==='elder'){for(let i=0;i<5;i++)cone(core,P.metalDark,(i-2)*.22,2.14,-.38,.14,.33,6)}
 if(r==='orc'){for(let i=0;i<4;i++)cone(core,P.metalDark,(i-1.5)*.22,2.22,-.32,.12,.23,6)}
 return rig}

const obj=buildCharacter();
obj.root.scale.setScalar(.55*(options.scale??CFG.scale));
const r={unit:obj.body,legs:[obj.legs[1],obj.legs[0]],armR:obj.arms[1],armL:obj.arms[0],head:obj.head,cape:obj.cape[2]||null,
  weapon:obj.weapon||null,amp:.65,sw:1.8,aim:CFG.weapon==='bow',sit:false,role:CFG.role};
obj.root.userData.r=r;obj.root.userData.hinariaV2=true;return obj.root;
}
