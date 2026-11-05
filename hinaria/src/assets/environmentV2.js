/** HINÁRIA environment prefabs V2. Extracted from the 28 independent Three.js asset previews.
 * All geometry is procedural. No browser/CDN fetches or new textures are required. */
import * as THREE from 'three';
import {addSurface} from './hinariaTextures.js';
const C={
 wood:0x805333,woodLight:0xaf7641,woodDark:0x4d3023,stone:0xa7a69f,stone2:0x777f86,stoneDark:0x555f68,plaster:0xe9d7b7,
 blue:0x31588a,blueLight:0x4474ae,red:0xb74c35,redLight:0xd6764c,green:0x38683a,greenLight:0x5f9c4c,greenDeep:0x23472d,
 gold:0xf1bb4c,iron:0x707980,ironLight:0xc0c8c8,leather:0x8c6543,soil:0x5d5240,leaf:0x659b4c,leaf2:0x89b862,
 night:0x22364e,cream:0xf6dcb2,black:0x1e272b,white:0xf8f0db,orange:0xff8e24,blueRune:0x5cecff,water:0x5dbfca,
 mushroom:0xc94639
};
const textureMapCache=new Map();
function patternTexture(type){
 if(textureMapCache.has(type))return textureMapCache.get(type);
 const cvs=document.createElement('canvas');cvs.width=cvs.height=128;
 const ctx=cvs.getContext('2d');ctx.fillStyle='#fafafa';ctx.fillRect(0,0,128,128);
 let state=37;const rand=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296};
 if(type==='wood'){
   for(let i=0;i<18;i++){const y=i*8;ctx.fillStyle=i%2?'#e7e7e7':'#f8f8f8';ctx.fillRect(0,y,128,7);ctx.fillStyle='#c5c5c5';ctx.fillRect(0,y+7,128,1);}
   for(let i=0;i<60;i++){ctx.strokeStyle='rgba(70,50,45,.08)';ctx.beginPath();let y=rand()*128;ctx.moveTo(rand()*128,y);ctx.lineTo(rand()*128,y+rand()*2);ctx.stroke();}
 }else if(type==='roof'){
   for(let row=0;row<8;row++)for(let col=-1;col<9;col++){
     const x=col*16+(row%2)*8,y=row*16;ctx.fillStyle=(row+col)%3?'#f2f2f2':'#dddddd';ctx.fillRect(x+1,y+1,15,14);
     ctx.fillStyle='#bebebe';ctx.fillRect(x,y+15,16,1);
   }
 }else if(type==='stone'){
   for(let row=0;row<8;row++)for(let col=-1;col<9;col++){
     const x=col*20+(row%2)*10,y=row*16;ctx.fillStyle=(row+col)%3?'#eeeeee':'#dbdbdb';ctx.fillRect(x+1,y+1,19,15);
     ctx.strokeStyle='#c9c9c9';ctx.strokeRect(x+.5,y+.5,19,15);
   }
 }else if(type==='leaf'){
   for(let i=0;i<250;i++){ctx.fillStyle=i%2?'rgba(35,35,35,.09)':'rgba(255,255,255,.10)';ctx.beginPath();ctx.arc(rand()*128,rand()*128,1+rand()*3,0,Math.PI*2);ctx.fill();}
 }
 const tx=new THREE.CanvasTexture(cvs);tx.colorSpace=THREE.SRGBColorSpace;tx.wrapS=tx.wrapT=THREE.RepeatWrapping;tx.anisotropy=2;
 textureMapCache.set(type,tx);return tx;
}
function patternFor(hex){
 if([C.wood,C.woodLight,C.woodDark,C.leather].includes(hex))return 'wood';
 if([C.red,C.redLight,C.blue,C.blueLight].includes(hex))return 'roof';
 if([C.stone,C.stone2,C.stoneDark,C.plaster].includes(hex))return 'stone';
 if([C.green,C.greenLight,C.greenDeep,C.leaf,C.leaf2].includes(hex))return 'leaf';
 return null;
}
const matCache = new Map();
const mat=(hex,opts={})=>{
 const key=JSON.stringify([hex,opts]);if(matCache.has(key))return matCache.get(key);
 const m=new THREE.MeshStandardMaterial({color:hex,roughness:opts.rough??.85,metalness:opts.metal??0,flatShading:opts.flat??true,side:opts.double?THREE.DoubleSide:THREE.FrontSide,emissive:opts.glow??0x000000,emissiveIntensity:opts.intensity??0});
 const pattern=patternFor(hex);
 // Material ID mapping is explicit: do not put the same tile texture on every prop.
 const surface=({
  [C.wood]:'wood_planks',[C.woodLight]:'wood_planks',[C.woodDark]:'bark',
  [C.leather]:'leather',[C.plaster]:'plaster',
  [C.stone]:'rock',[C.stone2]:'rock',[C.stoneDark]:'cave_rock',
  [C.red]:'roof_tiles',[C.redLight]:'roof_tiles',
  [C.green]:'foliage',[C.greenLight]:'foliage',[C.greenDeep]:'foliage',
  [C.leaf]:'foliage',[C.leaf2]:'foliage',
  [C.iron]:'metal_iron',[C.ironLight]:'metal_silver'
 })[hex];
 if(surface)addSurface(m,surface,{normal:true,strength:.18,neutral:surface!=='leather'});
 else if(pattern)m.map=patternTexture(pattern);
 matCache.set(key,m);return m;
};
const add=(p,g,m,x=0,y=0,z=0)=>{const v=new THREE.Mesh(g,m);v.position.set(x,y,z);v.castShadow=true;v.receiveShadow=true;p.add(v);return v};
const box=(p,x,y,z,w,h,d,c,rx=0,ry=0,rz=0)=>{const m=add(p,new THREE.BoxGeometry(w,h,d),mat(c),x,y,z);m.rotation.set(rx,ry,rz);return m};
const cyl=(p,x,y,z,rt,rb,h,c,n=10)=>add(p,new THREE.CylinderGeometry(rt,rb,h,n),mat(c),x,y,z);
const ell=(p,x,y,z,sx,sy,sz,c,n=10)=>{const a=add(p,new THREE.SphereGeometry(1,n,Math.max(6,Math.floor(n*.7))),mat(c),x,y,z);a.scale.set(sx,sy,sz);return a};
const cone=(p,x,y,z,r,h,c,n=7)=>add(p,new THREE.ConeGeometry(r,h,n),mat(c),x,y,z);
const rod=(p,a,b,r,c,r2=r,n=8)=>{const v1=new THREE.Vector3(...a),v2=new THREE.Vector3(...b);const dif=v2.clone().sub(v1);const o=add(p,new THREE.CylinderGeometry(r2,r,dif.length(),n),mat(c),...v1.clone().add(v2).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dif.clone().normalize());return o};
const group=(p,x=0,y=0,z=0)=>{const g=new THREE.Group();g.position.set(x,y,z);p.add(g);return g};
const prism=(p,points,depth,c,x=0,y=0,z=0)=>{const s=new THREE.Shape();points.forEach(([xx,yy],i)=>i?s.lineTo(xx,yy):s.moveTo(xx,yy));s.closePath();return add(p,new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.02,bevelThickness:.015,bevelSegments:1}),mat(c),x,y,z)};
const patch=(p,x,y,z,r,c)=>{ell(p,x,y,z,r,.04,r,c,8)};
const flowers=(p,x,y,z,count=8)=>{for(let i=0;i<count;i++){const a=i*2.399,r=.12+.08*(i%3);ell(p,x+Math.sin(a)*r,y+.045+(i%4)*.032,z+Math.cos(a)*r,.035,.035,.035,i%4?C.white:C.gold,6);ell(p,x+Math.sin(a)*r,y+.035,z+Math.cos(a)*r,.015,.015,.015,C.gold,6)}};
function leaf(p,x,y,z,scale=1,c=C.leaf,rz=0){const o=ell(p,x,y,z,.16*scale,.075*scale,.29*scale,c,7);o.rotation.z=rz;return o}
function boulder(p,x,y,z,r=1,c=C.stone2){const o=ell(p,x,y,z,r*.70,r*.55,r*.70,c,7);o.rotation.set(.2,.4,.18);return o}
function lantern(p,x,y,z,animated){const l=group(p,x,y,z);box(l,0,.23,0,.21,.055,.21,C.iron);box(l,0,-.22,0,.23,.07,.23,C.iron);box(l,0,0,0,.16,.38,.16,C.gold);
 const glass=mat(0xffc35b,{glow:0xff9d24,intensity:1.2});const glow=add(l,new THREE.BoxGeometry(.13,.30,.13),glass);
 for(const xx of [-.095,.095])for(const zz of [-.095,.095])box(l,xx,0,zz,.024,.44,.024,C.iron);
 cone(l,0,.31,0,.17,.14,C.iron,4);const light=new THREE.PointLight(0xffae46,.6,3);light.position.y=0;l.add(light);
 if(animated)animated.push((t)=>{glass.emissiveIntensity=1.0+.15*Math.sin(t*9);});return l}
function grass(p,span=1,count=7){for(let i=0;i<count;i++){const a=i*2.399,s=span*(.5+.32*((i*13)%7)/7);const g=cone(p,Math.sin(a)*s,.09,Math.cos(a)*s,.07,.2,i%3?C.greenLight:C.green,4);g.rotation.z=.12*Math.sin(a)}}
function stoneBase(p,w=2,d=1.7){box(p,0,.12,0,w,.24,d,C.stoneDark);box(p,0,.25,0,w+.03,.06,d+.03,C.stone2)}
function gableRoof(p,w,d,y,raise,c1,c2){const rw=w/2+.20, dz=d/2+.2,theta=Math.atan2(raise,rw),length=Math.hypot(rw,raise), roofMat=mat(c1);
 for(const side of [-1,1]){const panel=box(p,side*rw/2,y+raise/2,0,length,.09,d+.40,c1,0,0,side===-1?theta:-theta);panel.castShadow=true;
 const colors=[c1,c2];const g=new THREE.BoxGeometry(length/5*.92,.013,(d+.4)/7*.96),ms=[];
 for(let row=0;row<5;row++)for(let col=0;col<7;col++){
    const u=(row+.5)/5;const midx=side*rw*u,midy=y+raise*(1-u)+.06;
    const o=new THREE.Object3D();o.position.set(midx,midy,(col-3)*((d+.4)/7));o.rotation.z=side===-1?theta:-theta;o.updateMatrix();ms.push(o.matrix.clone());
 }
 for(let k=0;k<2;k++){const ids=ms.filter((_,i)=>i%3===k||k===1&&i%3===2);const inst=new THREE.InstancedMesh(g,mat(colors[k]),ids.length);ids.forEach((m,i)=>inst.setMatrixAt(i,m));p.add(inst);inst.castShadow=true;inst.receiveShadow=true}
 }
 box(p,0,y+raise+.035,0,.12,.1,d+.5,C.woodLight);
 // Visible triangular gable ends, matching the plaster walls
 for(const z of [-d/2-.01,d/2+.01])prism(p,[[-w/2,y],[w/2,y],[0,y+raise-.05]],.035,C.plaster,0,0,z);
}
function door(p,x,y,z,scale=1){const d=group(p,x,y,z);const shape=new THREE.Shape();shape.moveTo(-.32,0);shape.lineTo(.32,0);shape.lineTo(.32,.64);shape.quadraticCurveTo(0,.98,-.32,.64);shape.closePath();
 add(d,new THREE.ExtrudeGeometry(shape,{depth:.09,bevelEnabled:true,bevelSize:.05,bevelThickness:.025,bevelSegments:1,curveSegments:8}),mat(C.stone2),0,0,0);
 const inside=add(d,new THREE.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:false,curveSegments:8}),mat(C.woodDark),0,0,.12);inside.scale.set(.84,.89,1);inside.position.y=.02;
 for(let i=-1;i<=1;i++)box(d,i*.15,.44,.15,.025,.70,.025,C.wood);
 ell(d,.20,.46,.17,.043,.045,.03,C.gold,8);d.scale.setScalar(scale);return d}
function windowPane(p,x,y,z,scale=1){const win=group(p,x,y,z);box(win,0,0,0,.45,.54,.13,C.woodDark);
 add(win,new THREE.BoxGeometry(.34,.42,.035),mat(0xffe0a1,{glow:0xffa341,intensity:1.15}),0,0,.09);
 box(win,0,0,.13,.045,.47,.04,C.woodLight);box(win,0,0,.13,.39,.045,.04,C.woodLight);
 box(win,0,-.32,.07,.58,.075,.18,C.stone);win.scale.setScalar(scale);return win}
function chimney(p,x,y,z){const m=group(p,x,y,z);box(m,0,.40,0,.40,.85,.42,C.stone2);box(m,0,.90,0,.51,.17,.52,C.stone);for(let i=0;i<3;i++)box(m,0,.15+i*.30,.222,.39,.024,.023,C.stoneDark);return m}
function sign(p,x,y,z,label='⚒'){const g=group(p,x,y,z);box(g,0,0,0,.58,.52,.10,C.woodDark);box(g,0,0,.08,.48,.41,.06,C.woodLight);
 // Decorative crossed implements, no text-dependent fonts or canvas
 rod(g,[-.13,-.12,.16],[.13,.12,.16],.028,C.gold);rod(g,[.13,-.12,.16],[-.13,.12,.16],.028,C.gold);return g}
function steps(p,x,z){for(let i=0;i<3;i++)box(p,x,.04+i*.055,z+(i-1)*.26,.91,.12+i*.02,.28,C.stone2)}
function flowerPlanter(p,x,y,z,w=.58){box(p,x,y,z,w,.14,.27,C.wood);box(p,x,y+.08,z+.01,w-.08,.09,.18,0x52623d);for(let i=-1;i<=1;i++)ell(p,x+i*w*.18,y+.18,z+.04,.08,.08,.08,i===0?C.gold:C.redLight,6)}
function porchAwning(p,x,y,z,w,d,c){box(p,x,y,z,w,.08,d,c);box(p,x-w/2+.12,y-.32,z-d/2+.02,.09,.62,.09,C.wood);box(p,x+w/2-.12,y-.32,z-d/2+.02,.09,.62,.09,C.wood);box(p,x,y+.06,z-d/2+.02,w+.04,.06,.09,C.woodLight)}
function house(p,large=false,tavern=false){const w=large?3.75:3.0,d=large?2.8:2.3,h=large?2.75:2.0,rh=large?1.06:.78;
 stoneBase(p,w+.12,d+.12);box(p,0,h/2+.25,0,w,h,d,C.plaster);
 for(const sx of [-1,1])for(const zz of [-1,1])box(p,sx*(w/2-.13),h/2+.25,zz*(d/2-.1),.20,h,.20,C.wood);
 for(const zz of [-1,1]){box(p,0,h+.15,zz*(d/2-.08),w,.18,.14,C.woodLight);box(p,0,.50,zz*(d/2-.08),w,.15,.13,C.woodLight)}
 for(const xx of [-1,1])box(p,xx*(w/2-.10),h/2+.25,0,.15,h,d+.05,C.woodLight);
 gableRoof(p,w,d,h+.25,rh,large?C.red:C.blue,large?C.redLight:C.blueLight);
 door(p,-.20,.30,d/2+.10,large?1.03:1);
 const wy=large?1.87:1.40;
 for(const x of large?[-1.23,1.14]:[-.98,.92])windowPane(p,x,wy,d/2+.09,.98);
 for(const x of large?[-1.25,1.18]:[-1.02,1.02])windowPane(p,x,h*.53,-d/2-.12,.75);
 for(const x of [-1,1])windowPane(p,x*w/2+.10,h*.50,0,.65).rotation.y=Math.PI/2;
 chimney(p,-w*.26,h+.25+.23,-d*.20);
 // flowerboxes, planters and small entrance details
 for(const x of [-1.06,1.05]){box(p,x,.73,d/2+.28,.57,.21,.28,C.wood);for(let i=0;i<4;i++)leaf(p,x+(i-1.5)*.12,.89,d/2+.26,.40,C.greenLight)}
 flowerPlanter(p,w/2-.34,.54,d/2+.24,.46);
 steps(p,-.20,d/2+.60);lantern(p,.45,1.60,d/2+.21,[]);lantern(p,-.62,1.58,d/2+.18,[]);makeBarrel(p,w/2+.38,.37,.45,.55);
 if(large){porchAwning(p,0,1.69,d/2+.58,2.18,.72,C.woodLight);box(p,.10,1.70,d/2+.28,1.70,.09,.55,C.woodLight);for(const x of [-.72,.08,.77])box(p,x,1.92,d/2+.47,.10,.43,.10,C.wood);box(p,.03,2.08,d/2+.47,1.78,.09,.10,C.woodLight);
 windowPane(p,.12,2.40,d/2+.09,.75);makeBanner(p,w/2-.34,h*.68,d/2+.24,C.blue,.65);
 }
 if(tavern){porchAwning(p,0,1.56,d/2+.58,2.26,.76,C.cream);sign(p,w/2-.20,1.75,d/2+.30);makeBarrel(p,-w/2-.27,.34,d/2+.1,.52);makeBarrel(p,w/2+.32,.34,d/2-.3,.52);box(p,-w/2+.78,.34,d/2+.25,.48,.44,.28,C.woodLight)}
 grass(p,2.35,13);return {width:w,height:h+rh+.4};}
function makeBarrel(p,x=0,y=.48,z=0,scale=1){const g=group(p,x,y,z);g.scale.setScalar(scale);
 const geom=new THREE.CylinderGeometry(.43,.39,.94,12,5);const m=add(g,geom,mat(C.wood));for(let i=0;i<12;i++){const a=i*2*Math.PI/12;const st=box(g,Math.sin(a)*.41,0,Math.cos(a)*.41,.055,.83,.06,i%2?C.wood:C.woodLight);st.rotation.y=a}
 for(const yy of [-.32,.30])cyl(g,0,yy,0,.444,.444,.083,C.iron,12);
 cyl(g,0,.49,0,.36,.36,.04,C.woodLight,12);return g}
function makeCrate(p,x=0,y=.35,z=0,s=1){const g=group(p,x,y,z);g.scale.setScalar(s);box(g,0,0,0,.72,.72,.72,C.woodLight);
 for(const yy of [-.30,.30])for(const zz of [-.375,.375])box(g,0,yy,zz,.78,.075,.065,C.woodDark);
 for(const xx of [-.30,.30])for(const zz of [-.374,.374])box(g,xx,0,zz,.06,.72,.065,C.woodDark);
 for(const xx of [-.38,.38]){const br=box(g,xx,0,0,.055,.07,.95,C.woodDark);br.rotation.x=.72}
 const diagonal=box(g,0,0,.402,.065,.88,.055,C.woodDark);diagonal.rotation.z=.74;return g}
function makeSack(p,x=0,y=.42,z=0,s=1){const g=group(p,x,y,z);g.scale.setScalar(s);
 // Compressed asymmetrical bag profile, with a gathered top
 const points=[[0,0],[.28,.03],[.40,.14],[.44,.33],[.37,.54],[.23,.70],[.13,.83],[.10,.9]].map(([r,yy])=>new THREE.Vector2(r,yy-.45));
 add(g,new THREE.LatheGeometry(points,11),mat(C.cream),0,0,0);cyl(g,0,.36,0,.15,.15,.07,C.woodDark,8);return g}
function makeLanternPost(p){cyl(p,0,.19,0,.34,.43,.38,C.stone2,8);box(p,0,1.65,0,.18,3.05,.18,C.wood);box(p,.48,2.89,0,1.14,.18,.18,C.woodLight);rod(p,[.05,2.40,0],[.75,2.90,0],.065,C.woodDark);rod(p,[.94,2.79,0],[.94,2.60,0],.025,C.iron);lantern(p,.94,2.29,0,[]);grass(p,.48,5)}
function fence(p,z=0){for(const x of [-1.2,0,1.2]){box(p,x,.63,z,.20,1.25,.20,C.woodLight);cone(p,x,1.34,z,.145,.25,C.woodDark,4)}for(const yy of [.38,.99])box(p,0,yy,z,2.63,.16,.17,C.wood)}
function well(p){cyl(p,0,.40,0,.95,1.0,.65,C.stone2,12);cyl(p,0,.70,0,1.02,1.02,.21,C.stone,12);cyl(p,0,.72,0,.72,.72,.03,C.black,16);
 for(const x of [-.94,.94])box(p,x,1.67,0,.20,2.45,.20,C.woodLight);box(p,0,2.86,0,2.18,.22,.20,C.wood);
 gableRoof(p,1.80,1.32,2.94,.45,C.blue,C.blueLight);
 rod(p,[-1.01,1.55,0],[1.01,1.55,0],.06,C.woodDark);rod(p,[0,1.55,0],[0,1.07,0],.018,C.leather);cyl(p,0,.99,0,.18,.22,.30,C.woodDark,9);
 box(p,0,.80,.54,.26,.10,.18,C.woodLight);box(p,0,.84,.54,.12,.16,.12,C.blueRune);grass(p,1.42,7)}
function market(p){stoneBase(p,3.0,2.2);for(const x of [-1.26,1.26])for(const z of [-.86,.86])box(p,x,1.58,z,.15,3.03,.15,C.wood);
 for(let i=0;i<8;i++)box(p,-1.13+i*.32,2.93,0,.34,.07,2.36,i%2?C.cream:C.red,0,0,(i-3.5)*.013);
 box(p,0,1.14,.28,2.70,.20,.90,C.woodLight);box(p,0,.85,.28,2.7,1.13,.72,C.woodDark);
 for(let i=0;i<3;i++){makeCrate(p,-.84+i*.84,.49,1.0,.54);for(let j=0;j<8;j++)ell(p,-.91+i*.84+Math.sin(j*6)*.18,1.32,.23+(j%3)*.16,.11,.10,.10,i===0?C.red:i===1?C.greenLight:C.gold,7)}
 for(const x of [-.84,0,.84]) flowerPlanter(p,x,.46,-.92,.40);
 makeBanner(p,-1.1,1.48,1.05,C.blue,.42);lantern(p,1.18,2.16,.82,[]);lantern(p,-1.18,2.16,.82,[]);grass(p,1.73,9)}
function forge(p){house(p,false); // Replace/add workshop exterior around a stone furnace
 const x=2.05;box(p,x,1.38,0,1.84,2.20,2.03,C.woodDark);
 for(const xx of [x-.79,x+.79])for(const zz of [-.84,.84])box(p,xx,1.2,zz,.17,2.45,.17,C.woodLight);
 gableRoof(p,1.96,2.20,2.47,.63,C.red,C.redLight);
 box(p,x,1.04,1.0,1.03,1.60,.55,C.stone2);
 const fire=add(p,new THREE.BoxGeometry(.76,.80,.06),mat(0xff641f,{glow:0xff4318,intensity:1.45}),x,1.00,1.30);
 for(let i=0;i<5;i++)cone(p,x+Math.sin(i*4)*.22,1.05,1.36,.09,.20,C.orange,6);
 box(p,x,1.83,1.08,1.15,.18,.35,C.stone);chimney(p,x,2.50,-.35);
 // Anvil: tapered foot, metal body and horns
 box(p,2.12,.43,2.07,.48,.70,.45,C.iron);box(p,2.12,.83,2.07,.80,.24,.55,C.ironLight);
 const horn=cone(p,2.65,.89,2.07,.16,.55,C.iron,8);horn.rotation.z=-Math.PI/2;
 sign(p,x-.86,2.02,1.07);makeBarrel(p,x+1.24,.4,1.0,.54);makeCrate(p,x+1.20,.31,-.98,.56);lantern(p,x-.94,2.16,1.05,[]);grass(p,3.3,9)}
function hut(p){stoneBase(p,2.95,2.85);cyl(p,0,1.15,0,1.34,1.47,2.20,C.wood,12);for(let i=0;i<12;i++){const a=i*Math.PI/6;rod(p,[Math.sin(a)*1.36,.3,Math.cos(a)*1.36],[Math.sin(a)*1.32,2.15,Math.cos(a)*1.32],.105,C.woodDark)}
 for(let h=0;h<3;h++)cone(p,0,2.35+h*.29,0,1.86-h*.25,.78,C.greenLight,11);
 door(p,0,.30,1.44,.94);for(const x of [-.78,.77]){boulder(p,x,.30,1.4,.37);leaf(p,x,1.38,1.36,.8,C.greenLight)}
 for(let i=0;i<5;i++){const a=i*2*Math.PI/5;rod(p,[Math.sin(a)*1.25,.25,Math.cos(a)*1.25],[Math.sin(a)*1.60,.72,Math.cos(a)*1.60],.11,C.woodDark);flowers(p,Math.sin(a)*1.55,.14,Math.cos(a)*1.55,5)}
 for(const xx of [-.65,.65]){const r=rod(p,[xx,3.20,0],[xx*1.25,3.76,-.08],.08,C.woodLight);r.rotation.z=.2}
 cone(p,0,3.55,0,.16,.24,C.woodDark,6);const rune=add(p,new THREE.TorusGeometry(.22,.043,7,20,Math.PI*1.75),mat(C.blueRune,{glow:C.blueRune,intensity:.75}),0,2.24,1.37);grass(p,1.75,12)}
function tower(p){cyl(p,0,1.54,0,1.04,1.24,3.1,C.stone2,12);for(let i=0;i<12;i++){const a=2*Math.PI*i/12;box(p,Math.sin(a)*.95,3.15,Math.cos(a)*.95,.37,.45,.4,C.stone)}
 cyl(p,0,3.35,0,1.18,1.10,.26,C.woodLight,12);for(let i=0;i<10;i++){const a=2*Math.PI*i/10;box(p,Math.sin(a)*1.09,3.60,Math.cos(a)*1.09,.14,.62,.15,C.wood)}
 cone(p,0,4.14,0,1.45,1.28,C.blue,10);door(p,0,.30,1.17,.76);for(const yy of [1.65,2.28])box(p,0,yy,1.04,.19,.32,.16,C.black);makeBanner(p,1.18,2.43,.27,C.red,.54);grass(p,1.5,10)}
function bridge(p){const length=4.1;for(let i=0;i<12;i++){const x=-length/2+i*length/11;const lift=.48*(1-(x/(length/2))**2);box(p,x,.33+lift,0,.38,.13,1.80,C.woodLight,0,0,0)}
 for(const z of [-.82,.82]){for(let i=0;i<5;i++){const x=-1.9+i*.95;const lift=.48*(1-(x/2.05)**2);box(p,x,.85+lift,z,.14,.72,.14,C.wood)}for(let i=0;i<4;i++){const x=-1.42+i*.95;const lift=.48*(1-(x/2.05)**2);box(p,x,1.14+lift,z,1.0,.10,.12,C.woodLight)}}
 for(const x of [-2.04,2.04])boulder(p,x,.20,0,.65);box(p,0,.04,0,4.5,.05,2.6,C.water);}
function makeBanner(p,x,y,z,c=C.blue,s=1){const g=group(p,x,y,z);g.scale.setScalar(s);rod(g,[-.46,.50,0],[.46,.50,0],.06,C.wood);box(g,0,.10,0,.75,.65,.025,c);
 prism(g,[[-.375,-.2],[0,-.53],[.375,-.2]],.03,c,0,0,0);box(g,0,.20,.05,.10,.37,.03,C.gold);
 const emblem=add(g,new THREE.OctahedronGeometry(.12,0),mat(C.gold),0,0,.08);return g}
function totem(p){cyl(p,0,1.05,0,.42,.55,2.08,C.wood,9);for(let i=0;i<6;i++){rod(p,[0,.30+i*.33,0],[.31,.39+i*.33,.29],.032,C.woodDark)}
 for(const xx of [-1,1]){const side=xx*.38;rod(p,[side,2.05,0],[xx*.65,2.62,0],.12,C.woodLight);rod(p,[xx*.65,2.62,0],[xx*.76,2.77,-.2],.08,C.woodLight);leaf(p,xx*.6,2.1,.09,.8,C.greenLight)}
 const r=add(p,new THREE.TorusGeometry(.25,.057,8,20,Math.PI*1.7),mat(C.gold),0,1.43,.44);r.rotation.z=.75;grass(p,1.04,11)}
function runestone(p){const pts=[[-.52,0],[.52,0],[.70,1.54],[.33,2.35],[-.28,2.25],[-.58,1.65]];prism(p,pts,.37,C.stone2,0,0,-.15);const rune=add(p,new THREE.TorusGeometry(.34,.047,6,25,Math.PI*1.8),mat(C.blueRune,{glow:C.blueRune,intensity:1.8}),0,1.22,.28);rune.rotation.z=.5;
 for(let i=0;i<8;i++){const a=i*2.4;boulder(p,Math.sin(a)*.83,.15,Math.cos(a)*.75,.23,i%2?C.stone:C.stoneDark)}grass(p,1.13,11)}
function firepit(p){for(let i=0;i<9;i++){const a=i*2*Math.PI/9;boulder(p,Math.sin(a)*.67,.18,Math.cos(a)*.67,.24,i%2?C.stone:C.stoneDark)}
 for(let i=0;i<5;i++){const a=i*Math.PI/5;const o=rod(p,[-.44*Math.cos(a),.22,-.44*Math.sin(a)],[.44*Math.cos(a),.22,.44*Math.sin(a)],.12,C.wood);}
 const flames=[];for(let i=0;i<7;i++){const a=i*2.4;const f=cone(p,Math.sin(a)*.24,.53+Math.sin(i)*.09,Math.cos(a)*.24,.17,.75+(i%3)*.13,i%2?C.orange:C.gold,5);f.rotation.z=.12;flames.push(f)}
 return (t)=>flames.forEach((f,i)=>{f.scale.y=.84+.16*Math.sin(t*6+i*2);f.rotation.z=.12*Math.sin(t*5+i)})}
function makeCart(p){const base=box(p,0,.85,0,2.3,.25,1.45,C.wood);for(const x of [-.95,.95])for(const z of [-.58,.58])box(p,x,1.25,z,.14,.65,.14,C.woodLight);
 for(const z of [-.60,.60])box(p,0,1.02,z,2.18,.57,.11,C.woodDark);for(const x of [-.95,.95])box(p,x,1.02,0,.11,.57,1.3,C.woodDark);
 for(const x of [-.74,.74])for(const z of [-.85,.85]){const wheel=cyl(p,x,.52,z,.48,.48,.19,C.woodDark,12);wheel.rotation.x=Math.PI/2;cyl(p,x,.52,z+Math.sign(z)*.12,.19,.19,.06,C.gold,10).rotation.x=Math.PI/2}
 for(const z of [-.45,.45])rod(p,[1.02,.63,z],[2.3,.49,z],.095,C.wood);
 makeCrate(p,-.48,1.31,0,.67);makeSack(p,.52,1.37,.1,.65);grass(p,1.8,7)}
function forestTree(p,pine=true){cyl(p,0,1.12,0,.20,.28,2.28,C.wood,10);
 if(pine){for(let i=0;i<4;i++)cone(p,0,1.55+i*.64,0,1.35-i*.16,1.57,C.greenDeep+(i%2?0x001600:0),9);}
 else{for(let i=0;i<6;i++){const a=i*2.4,x=Math.sin(a)*.73,z=Math.cos(a)*.64;rod(p,[0,1.8,0],[x,2.65,z],.105,C.wood);ell(p,x,2.83,z,.79,.76,.73,i%2?C.greenLight:C.green,9)}ell(p,0,3.38,0,.84,.74,.78,C.greenLight,9)}grass(p,1.55,12)}
function rockCluster(p){for(let i=0;i<10;i++){const a=i*2.39;const r=.15+(i%4)*.28;boulder(p,Math.sin(a)*r,.22+((i%3)*.07),Math.cos(a)*r,.25+(i%4)*.16,i%3?C.stone2:C.stone)}grass(p,1.48,9)}
function stumps(p){for(let k=0;k<3;k++){const x=(k-1)*.75,s=1-.22*k;const h=.45+.18*(k%2);cyl(p,x,h/2,0,.41*s,.46*s,h,C.wood,11);cyl(p,x,h+.025,0,.42*s,.41*s,.055,C.woodLight,11);cyl(p,x,h+.057,0,.24*s,.23*s,.02,C.wood,11);for(let i=0;i<3;i++){const a=i*2.4;rod(p,[x,.18,0],[x+Math.sin(a)*.51*s,.06,Math.cos(a)*.51*s],.08,C.woodDark)}}grass(p,1.20,10)}
function mushroomCluster(p){for(let i=0;i<9;i++){const a=i*2.399,rr=(i%4)*.21,s=.55+(i%3)*.24;const x=Math.sin(a)*rr,z=Math.cos(a)*rr;cyl(p,x,.22*s,z,.075*s,.095*s,.45*s,C.cream,7);const hat=ell(p,x,.48*s,z,.24*s,.14*s,.24*s,C.mushroom,9);for(let j=0;j<3;j++)ell(p,x+Math.sin(j*2)*.12*s,.57*s,z+Math.cos(j*3)*.11*s,.04*s,.012*s,.04*s,C.white,6)}grass(p,.95,11)}
function shrubs(p){for(let i=0;i<11;i++){const a=i*2.4,s=.25+(i%4)*.17,x=Math.sin(a)*s,z=Math.cos(a)*s;ell(p,x,.33+(i%3)*.12,z,.28,.34,.26,i%3===0?C.greenLight:C.leaf,8);if(i%2)ell(p,x,.59,z+.19,.045,.043,.04,i%3?C.mushroom:C.white,6)}grass(p,1.12,9)}
function anvil(p){box(p,0,.24,0,1.13,.48,.60,C.stoneDark);box(p,0,.55,0,.76,.25,.48,C.iron);box(p,0,.82,0,1.04,.26,.48,C.ironLight);const h=cone(p,-.72,.83,0,.16,.58,C.iron,8);h.rotation.z=-Math.PI/2;
 rod(p,[1.10,.22,0],[.63,1.15,0],.075,C.wood);box(p,.56,1.12,0,.40,.19,.24,C.iron);}
function buildAsset(id){const root=new THREE.Group();const animators=[];
 switch(id){
 case 'casa':house(root);break;
 case 'casarao':house(root,true);break;
 case 'ferraria':forge(root);break;
 case 'cabana':hut(root);break;
 case 'taverna':house(root,true,true);break;
 case 'torre':tower(root);break;
 case 'mercado':market(root);break;
 case 'poco':well(root);break;
 case 'ponte':bridge(root);break;
 case 'cerca':fence(root);grass(root,1.4,6);break;
 case 'portao':for(const x of [-1.55,1.55]){box(root,x,1.5,0,.35,3.05,.36,C.wood);cone(root,x,3.14,0,.3,.42,C.woodDark,4)}box(root,0,2.9,0,3.5,.29,.36,C.woodLight);makeBanner(root,0,2.42,.22,C.blue,.68);fence(root,-.78);grass(root,2.4,10);break;
 case 'carroca':makeCart(root);break;
 case 'caixas':makeCrate(root,-.52,.45,.08,1.15);makeCrate(root,.58,.31,.24,.74);makeCrate(root,.39,.96,-.43,.66);grass(root,1.05,6);break;
 case 'barris':makeBarrel(root,-.47,.49,.0,1);makeBarrel(root,.48,.35,.23,.72);makeBarrel(root,.45,.30,-.53,.65);break;
 case 'sacos':makeSack(root,-.37,.43,0,1);makeSack(root,.35,.33,.22,.8);makeSack(root,.20,.29,-.52,.66);break;
 case 'lanterna':makeLanternPost(root);break;
 case 'placas':box(root,0,1.44,0,.19,2.87,.18,C.wood);for(let i=0;i<3;i++){const s=i%2?-1:1;box(root,s*.32,2.28-i*.54,.11,.84,.32,.14,i%2?C.wood:C.woodLight);cone(root,s*.73,2.28-i*.54,.11,.19,.34,C.wood,3).rotation.z=s*-Math.PI/2}grass(root,.78,10);break;
 case 'fogueira':animators.push(firepit(root));break;
 case 'bigorna':anvil(root);break;
 case 'rochas':rockCluster(root);break;
 case 'tocos':stumps(root);break;
 case 'cogumelos':mushroomCluster(root);break;
 case 'arbustos':shrubs(root);break;
 case 'pinheiro':forestTree(root,true);break;
 case 'arvore':forestTree(root,false);break;
 case 'bandeiras':for(let i=-1;i<=1;i++){const x=i*1.00;box(root,x,1.55,0,.08,3.1,.08,C.wood);makeBanner(root,x,2.27,.11,[C.blue,C.red,0x65488d][i+1],.75)}break;
 case 'totem':totem(root);break;
 case 'runa':runestone(root);break;
 }
 root.userData.environmentId=id;return root;}


function mergeGeometries(geometries){
 const arrays={position:[],normal:[],uv:[]};
 for(const g of geometries){for(const k of Object.keys(arrays)){
    const a=g.getAttribute(k);if(!a)return null;
    for(let i=0;i<a.array.length;i++)arrays[k].push(a.array[i]);
 }}
 const combined=new THREE.BufferGeometry();
 combined.setAttribute('position',new THREE.Float32BufferAttribute(arrays.position,3));
 combined.setAttribute('normal',new THREE.Float32BufferAttribute(arrays.normal,3));
 combined.setAttribute('uv',new THREE.Float32BufferAttribute(arrays.uv,2));
 return combined;
}

// Reduce each static prefab to one draw call per material wherever geometry permits.
function batchPrefab(root){
 root.updateMatrixWorld(true);
 const lists=new Map();
 root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.material.transparent)return;
   const g=o.geometry;if(!g?.getAttribute('position')||!g.getAttribute('uv')||!g.getAttribute('normal'))return;
   const arr=lists.get(o.material)||[];arr.push(o);lists.set(o.material,arr);
 });
 for(const [material,meshes] of lists){if(meshes.length<2)continue;
   const geos=meshes.map(m=>{let g=m.geometry.clone();g.applyMatrix4(m.matrixWorld);if(g.index){const nonIndexed=g.toNonIndexed();g.dispose();g=nonIndexed;}return g});
   const merged=mergeGeometries(geos);geos.forEach(g=>g.dispose());if(!merged)continue;
   const mesh=new THREE.Mesh(merged,material);mesh.castShadow=false;mesh.receiveShadow=true;mesh.name='PrefabBatched';
   for(const original of meshes){original.parent.remove(original);original.geometry.dispose();}
   root.add(mesh);
 }
 return root;
}
export const ENV_V2_IDS=['casa','casarao','ferraria','cabana','taverna','torre','mercado','poco','ponte','cerca','portao','carroca','caixas','barris','sacos','lanterna','placas','fogueira','bigorna','rochas','tocos','cogumelos','arbustos','pinheiro','arvore','bandeiras','totem','runa'];
export function createEnvironmentV2(id){
 if(!ENV_V2_IDS.includes(id))return null;
 const model=buildAsset(id);
 model.name='HINARIA_ENV_V2_'+id;
 return batchPrefab(model);
}

export function getV2EnvironmentTexture(kind){return patternTexture(kind);}
