(function(){
'use strict';
const ORIGINAL_SOURCE='<!doctype html>\n'+document.documentElement.outerHTML;
const $=id=>document.getElementById(id),TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,p)=>a+(b-a)*p,fract=v=>v-Math.floor(v);
const smooth=v=>{v=clamp(v);return v*v*(3-2*v)};
const random=(i,seed=1)=>fract(Math.sin(i*127.1+seed*311.7)*43758.5453);
const arrow='<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13L13 3M4 3H13V12"/></svg>';
const catalog=[
 {id:'village',category:'Cenários',title:'Vilarejo flutuante',description:'Um diorama 3D original: casas, árvores, nuvens e um moinho em movimento. Orbite a câmera para descobrir a cena por todos os lados.',tags:['diorama','moinho','nuvens']},
 {id:'walk',category:'Personagem',title:'Caminhada 3D',description:'Um robô articulado com braços, pernas e joelhos em oposição. A cabeça acompanha o balanço do tronco.',tags:['rig procedural','caminhada','ciclo']},
 {id:'portal',category:'Efeitos',title:'Portal dimensional',description:'Três anéis com rotações independentes, núcleo pulsante e partículas orbitais. A profundidade aparece ao girar a câmera.',tags:['órbitas','energia','partículas']},
 {id:'forest',category:'Cenários',title:'Floresta ao vento',description:'Árvores low poly com balanços fora de fase e folhas que atravessam um pequeno arquipélago flutuante.',tags:['vento','vegetação','instâncias']},
 {id:'run',category:'Personagem',title:'Corrida 3D',description:'Passadas rápidas, inclinação do corpo e pequenos saltos entre os apoios. A animação é controlada pela linha do tempo.',tags:['corrida','articulações','ritmo']},
 {id:'fire',category:'Cenários',title:'Fogueira e brasas',description:'Chamas volumétricas estilizadas, madeira, pedras e brasas ascendentes. A luz quente pulsa sobre o acampamento.',tags:['fogo','luz dinâmica','brasas']},
 {id:'jump',category:'Personagem',title:'Salto e aterrissagem',description:'Antecipação, trajetória parabólica e compressão na aterrissagem. Explore a pose no ar de qualquer ângulo.',tags:['antecipação','arco','peso']},
 {id:'shield',category:'Efeitos',title:'Escudo geodésico',description:'Uma barreira esférica facetada com malha luminosa, anéis inclinados e pontos de energia em sua superfície.',tags:['barreira','geometria','pulso']},
 {id:'attack',category:'Personagem',title:'Golpe de espada',description:'Um braço articulado prepara e executa o golpe, acompanhado por um arco de energia e retorno à posição inicial.',tags:['espada','antecipação','recuperação']},
 {id:'burst',category:'Efeitos',title:'Explosão de partículas',description:'Fragmentos 3D se dispersam em trajetórias determinísticas, com gravidade estilizada e uma onda de choque.',tags:['fragmentos','instâncias','impacto']},
 {id:'orbit',category:'Objetos',title:'Escultura orbital',description:'Uma escultura cinética com trajetórias inclinadas, satélites e um núcleo geométrico em rotação.',tags:['cinética','rotação','profundidade']},
 {id:'assembly',category:'Objetos',title:'Montagem mecânica',description:'Uma vista explodida de um módulo imaginário: carcaça, discos, suportes e núcleo se afastam e se reúnem.',tags:['vista explodida','produto','montagem']}
].map((item,i)=>({...item,index:i+1}));
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const state={id:'village',category:'Todos',query:'',playing:!reduced,progress:0,duration:4,speed:1,loop:true,autoCamera:false,wireframe:false,shadows:true,quality:innerWidth<650?'low':'medium',ready:false,error:null,last:0,dirty:true,frames:0};
let renderer,scene,camera,controls,current,keyLight,resizeObserver,raf,frameDelta=0,isRendering=false;

// Recursos por cena: geometria e materiais compartilhados, liberados ao trocar.
class Art{
 constructor(){this.group=new THREE.Group();this.geometries=new Map();this.materials=new Map();this.extra=[]}
 geometry(key,create){if(!this.geometries.has(key))this.geometries.set(key,create());return this.geometries.get(key)}
 material(color,opts={},basic=false){
  const key=color+JSON.stringify(opts)+basic;
  if(!this.materials.has(key)){
   const props={color,...opts};
   const mat=basic?new THREE.MeshBasicMaterial(props):new THREE.MeshStandardMaterial({roughness:.57,metalness:.13,...props});
   this.materials.set(key,mat);
  }return this.materials.get(key);
 }
 mesh(geometry,material,parent=this.group,pos=[0,0,0],scale=[1,1,1]){
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...pos);mesh.scale.set(...scale);
  mesh.castShadow=!material.transparent&&!material.isMeshBasicMaterial;mesh.receiveShadow=true;parent.add(mesh);return mesh;
 }
 node(parent=this.group,pos=[0,0,0]){const g=new THREE.Group();g.position.set(...pos);parent.add(g);return g}
 box(size,pos,color,parent=this.group,opts={}){return this.mesh(this.geometry('box',()=>new THREE.BoxGeometry(1,1,1)),this.material(color,opts),parent,pos,size)}
 ball(radius,pos,color,parent=this.group,opts={},basic=false){return this.mesh(this.geometry('sphere',()=>new THREE.SphereGeometry(1,20,14)),this.material(color,opts,basic),parent,pos,[radius,radius,radius])}
 cylinder(radius,height,pos,color,parent=this.group,opts={}){return this.mesh(this.geometry('cylinder',()=>new THREE.CylinderGeometry(1,1,1,24)),this.material(color,opts),parent,pos,[radius,height,radius])}
 cone(radius,height,pos,color,parent=this.group,sides=8){return this.mesh(this.geometry('cone'+sides,()=>new THREE.ConeGeometry(1,1,sides)),this.material(color,{flatShading:true}),parent,pos,[radius,height,radius])}
 ring(radius,tube,pos,color,parent=this.group,opts={},basic=false){
  return this.mesh(this.geometry('ring'+radius+','+tube,()=>new THREE.TorusGeometry(radius,tube,8,80)),this.material(color,opts,basic),parent,pos);
 }
 instanced(count,color,geometry){
  const mesh=new THREE.InstancedMesh(geometry,this.material(color,{roughness:.5}),count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;this.group.add(mesh);return mesh;
 }
 dispose(){
  this.group.traverse(node=>{if(node.isInstancedMesh)node.dispose()});
  for(const g of this.geometries.values())g.dispose();
  for(const m of this.materials.values())m.dispose();
  for(const item of this.extra)item.dispose();
  this.group.clear();
 }
}
function platform(a,radius=2.6){
 a.cylinder(radius,.20,[0,-.15,0],'#253b46',a.group,{metalness:.65,roughness:.4});
 a.cylinder(radius*.95,.035,[0,-.035,0],'#405f63');
 const trim=a.ring(radius+.024,.014,[0,-.13,0],'#f49b70',a.group,{emissive:'#e27346',emissiveIntensity:.4});trim.rotation.x=Math.PI/2;
}
function island(a,radius=3.2,parent=a.group){
 a.cylinder(radius,.3,[0,-.2,0],'#476c5b',parent,{flatShading:true});
 const rock=a.cone(radius*.98,1.65,[0,-1.1,0],'#354a50',parent,9);rock.rotation.z=Math.PI;
 const trim=a.ring(radius*.98,.045,[0,-.34,0],'#77978b',parent);trim.rotation.x=Math.PI/2;
}
function tree(a,parent,x,z,scale=1){
 const g=a.node(parent,[x,0,z]);g.scale.setScalar(scale);
 a.cylinder(.10,.85,[0,.42,0],'#8a6550',g);
 a.cone(.64,1.08,[0,1.04,0],'#398070',g,7);
 a.cone(.5,.95,[0,1.54,0],'#559d80',g,7);
 a.cone(.32,.75,[0,1.99,0],'#7ab294',g,7);
 return g;
}
function robot(a){
 const root=a.node(),body=a.node(root,[0,1.27,0]);
 a.box([.54,.19,.38],[0,1.08,0],'#465b67',root);
 a.cylinder(.42,.64,[0,.18,0],'#ff885b',body,{metalness:.25});
 a.box([.24,.31,.035],[0,.19,.445],'#213c47',body);
 a.ball(.065,[0,.2,.48],'#a6edd1',body,{emissive:'#a6edd1',emissiveIntensity:.8});
 const head=a.node(body,[0,.75,0]);
 a.box([.67,.51,.56],[0,0,0],'#c6dcd5',head,{roughness:.32});
 a.box([.52,.19,.035],[0,.02,.296],'#182b35',head);
 for(const x of [-.13,.13])a.box([.075,.042,.024],[x,.025,.322],'#a6edd1',head,{emissive:'#a6edd1',emissiveIntensity:1.2});
 a.cylinder(.025,.17,[0,.33,0],'#b5cbc6',head);
 a.ball(.055,[0,.44,0],'#ff885b',head,{emissive:'#ff885b',emissiveIntensity:.6});
 const legs=[],knees=[],arms=[],elbows=[];
 for(const sign of [-1,1]){
  const hip=a.node(root,[sign*.21,1.06,0]);legs.push(hip);
  a.ball(.11,[0,0,0],'#78979f',hip);
  a.box([.15,.42,.17],[0,-.24,0],'#bdd3cf',hip);
  const knee=a.node(hip,[0,-.49,0]);knees.push(knee);
  a.ball(.105,[0,0,0],'#5d7b88',knee);
  a.box([.14,.39,.16],[0,-.22,0],'#a8c6c6',knee);
  a.box([.23,.13,.39],[0,-.44,.08],'#d1e5db',knee);
  const shoulder=a.node(body,[sign*.45,.38,0]);arms.push(shoulder);
  a.ball(.125,[0,0,0],'#ffd3a8',shoulder);
  a.box([.14,.35,.15],[0,-.23,0],'#b4cdca',shoulder);
  const elbow=a.node(shoulder,[0,-.42,0]);elbows.push(elbow);
  a.ball(.095,[0,0,0],'#698593',elbow);
  a.box([.13,.30,.14],[0,-.2,0],'#c6ddd4',elbow);
  a.ball(.105,[0,-.40,0],'#d1e5db',elbow);
 }
 const sword=a.node(elbows[1],[0,-.38,0]);
 sword.rotation.z=1.1;
 a.box([.105,.24,.09],[0,-.13,0],'#775746',sword);
 a.box([.4,.06,.12],[0,-.27,0],'#e7ba78',sword,{metalness:.6});
 a.box([.12,.83,.05],[0,-.70,0],'#d4eee7',sword,{metalness:.75,roughness:.2});
 const tip=a.cone(.1,.22,[0,-1.20,0],'#d4eee7',sword,4);tip.rotation.z=Math.PI;
 sword.visible=false;
 return {root,body,head,legs,knees,arms,elbows,sword};
}
function makeCharacter(id){
 const a=new Art();platform(a,2.35);
 const rig=robot(a);
 const slashGeo=a.geometry('slash',()=>new THREE.TorusGeometry(1.3,.035,6,56,Math.PI*.85));
 const slash=a.mesh(slashGeo,a.material('#b3ffe1',{transparent:true,opacity:0,depthWrite:false},true),a.group,[.15,1.25,.2]);slash.rotation.set(.3,.2,-1.2);slash.castShadow=false;
 const tracks=[];
 for(let i=0;i<5;i++){const line=a.box([.7,.014,.018],[-1.3-i*.18,.02,(i-2)*.42],'#789e9e');tracks.push(line)}
 return {a,position:[5,3.15,6.6],target:[0,1.0,0],update(p){
  const t=p*TAU;let phase=t*2,stride=.58,bob=.055,lean=0,height=0,sx=1,sy=1;
  rig.root.position.set(0,0,0);rig.root.rotation.set(0,0,0);
  rig.body.rotation.set(0,0,0);rig.head.rotation.set(0,Math.sin(t)*.045,0);
  rig.sword.visible=id==='attack';slash.material.opacity=0;
  if(id==='run'){phase=t*4;stride=.95;bob=.14;lean=.17}
  if(id==='jump'){
   stride=0;bob=0;
   const air=clamp((p-.2)/.52),prep=Math.sin(clamp(p/.2)*Math.PI),land=Math.sin(clamp((p-.72)/.2)*Math.PI);
   height=4*air*(1-air)*1.8;sy=1-prep*.2-land*.2+Math.sin(air*Math.PI)*.08;sx=1+prep*.12+land*.12;
   rig.arms[0].rotation.x=rig.arms[1].rotation.x=-Math.sin(air*Math.PI)*1.5;
   rig.legs[0].rotation.x=-Math.sin(air*Math.PI)*.45;rig.legs[1].rotation.x=Math.sin(air*Math.PI)*.4;
   rig.knees.forEach(n=>n.rotation.x=Math.sin(air*Math.PI)*.55);
  }else{
   if(id==='attack'){stride=0;bob=0}
   rig.legs.forEach((n,i)=>{const s=Math.sin(phase+i*Math.PI);n.rotation.x=s*stride;rig.knees[i].rotation.x=Math.max(0,-s)*stride*.8;rig.arms[i].rotation.x=-s*stride*.85});
  }
  rig.root.position.y=height+Math.abs(Math.sin(phase))*bob;
  rig.root.scale.set(sx,sy,sx);rig.body.rotation.x=lean;
  rig.arms.forEach(n=>n.rotation.z=0);rig.elbows.forEach(n=>n.rotation.x=-.12);
  if(id==='attack'){
   const anticipate=smooth((p-.08)/.17),strike=smooth((p-.31)/.17),recover=smooth((p-.67)/.3);
   const swing=(anticipate*(-1.4)+strike*3.5)*(1-recover);
   rig.arms[1].rotation.z=swing;rig.arms[1].rotation.x=-anticipate*.3*(1-recover);
   rig.elbows[1].rotation.x=-anticipate*.6*(1-recover);
   rig.body.rotation.y=anticipate*.25-strike*.5+recover*.25;
   rig.legs[0].rotation.x=-.15*anticipate*(1-recover);
   const arc=Math.sin(clamp((p-.33)/.22)*Math.PI);
   slash.material.opacity=arc*.7;slash.rotation.z=-1.1+strike*2.3;
  }
  tracks.forEach((n,i)=>{n.visible=id==='run';n.position.x=-1.5-fract(p*4+i*.1)*.7});
 }};
}
function makeVillage(){
 const a=new Art();island(a,3.35);
 a.box([.32,.025,5.8],[0,-.035,0],'#a9afa0');
 a.box([5.8,.025,.32],[0,-.03,0],'#a9afa0');
 const windows=[];
 function house(x,z,s,roofColor){
  const g=a.node(a.group,[x,0,z]);g.scale.setScalar(s);
  a.box([1.2,.96,1],[0,.48,0],'#e0d2b4',g);
  const roof=a.cone(1.06,.83,[0,1.36,0],roofColor,g,4);roof.rotation.y=Math.PI/4;
  a.box([.18,.50,.2],[.30,1.51,-.14],'#82908d',g);
  a.box([.25,.51,.035],[0,.26,.518],'#4b6867',g);
  for(const xx of [-.38,.38]){
   const w=a.box([.2,.23,.04],[xx,.6,.52],'#ffe6ac',g,{emissive:'#ffc078',emissiveIntensity:.55});windows.push(w);
   a.box([.23,.035,.06],[xx,.59,.55],'#55685f',g);
   a.box([.025,.24,.06],[xx,.59,.55],'#55685f',g);
  }
  a.box([.58,.08,.25],[0,.04,.6],'#899e93',g);
 }
 house(-1.16,-.65,.95,'#d77a57');house(1.13,-.85,.78,'#577a92');house(1.3,1.2,.70,'#527f8e');
 const trees=[];
 for(const [x,z,s] of [[-2.45,-.3,.72],[-1.9,-2,.65],[.1,-2.6,.66],[2.55,-.5,.7],[2.45,1.6,.55],[-.7,2.6,.62],[-2.6,1.3,.56]])trees.push(tree(a,a.group,x,z,s));
 const mill=a.node(a.group,[-1.4,0,1.55]);
 const tower=a.cone(.4,1.5,[0,.75,0],'#c7bf9c',mill,8);
 a.cone(.52,.42,[0,1.69,0],'#775f54',mill,8);
 const blades=a.node(mill,[0,1.48,.42]);
 a.cylinder(.11,.15,[0,0,0],'#a6dbca',blades).rotation.x=Math.PI/2;
 for(let i=0;i<4;i++){
  const pivot=a.node(blades);pivot.rotation.z=i*Math.PI/2;
  a.box([.11,.88,.05],[0,.5,0],'#e5d3ac',pivot);
  a.box([.27,.47,.045],[.04,.64,.015],'#c4b68e',pivot);
 }
 const pond=a.ball(1,[-2,.015,-1],'#5aaab0',a.group,{metalness:.4,roughness:.2});pond.scale.set(.53,.035,.65);
 for(let i=0;i<11;i++)a.ball(.055,[-2.6+random(i)*5,.06,-2.5+random(i,4)*5],i%2?'#f5bc7c':'#efa281',a.group);
 const clouds=[];
 for(let i=0;i<3;i++){
  const g=a.node(a.group,[-2+i*2,3.0+i*.24,-2.0+random(i,2)]);
  for(let k=0;k<3;k++){const b=a.ball(.38+random(k,i+1)*.2,[(k-1)*.45,Math.sin(k)*.1,0],'#adc9cf',g,{roughness:1});b.scale.y=.55}
  clouds.push(g);
 }
 return {a,position:[7.8,5.8,8.4],target:[0,.9,0],update(p){
  const t=p*TAU;blades.rotation.z=-t;
  trees.forEach((g,i)=>{g.rotation.z=Math.sin(t+i)*.025;g.rotation.x=Math.cos(t+i)*.015});
  clouds.forEach((g,i)=>{g.position.x=-2+i*2+Math.sin(t+i)*.35;g.position.y=3+i*.24+Math.cos(t+i)*.08});
  windows.forEach((w,i)=>w.material.emissiveIntensity=.48+Math.sin(t+i)*.07);
  pond.scale.y=.035+Math.sin(t*2)*.008;tower.rotation.y=Math.PI/8;
 }};
}
function makeForest(){
 const a=new Art();island(a,3.15);
 const trees=[];
 for(const [x,z,s] of [[-1.8,-1.3,1.1],[.1,-1.5,.95],[1.8,-.8,1.05],[-1.6,.8,.8],[.4,.8,.82],[1.9,1.4,.68],[-.6,2.3,.6]])trees.push(tree(a,a.group,x,z,s));
 const small=a.node(a.group,[3.9,-.15,-1.9]);small.scale.setScalar(.45);island(a,1.8,small);tree(a,small,.1,0,1);
 const leaves=a.instanced(75,'#c6ac72',a.geometry('leaf',()=>new THREE.OctahedronGeometry(.075,0)));
 const dummy=new THREE.Object3D();
 for(let i=0;i<14;i++){const rock=a.mesh(a.geometry('rock',()=>new THREE.IcosahedronGeometry(.19,0)),a.material('#8f9f95',{flatShading:true}),a.group,[-2.6+random(i)*5,.05,-2.6+random(i,4)*5]);rock.scale.y=.65}
 return {a,position:[7,4.8,8],target:[.3,1,0],update(p){
  const t=p*TAU;
  trees.forEach((g,i)=>{g.rotation.z=Math.sin(t+i*.72)*.07;g.rotation.x=Math.sin(t+i*.6)*.035});
  small.position.y=-.15+Math.sin(t)*.12;
  for(let i=0;i<75;i++){
   const f=fract(p+random(i));dummy.position.set(mix(-3.6,3.7,f),.4+random(i,4)*2.4+Math.sin(t*2+i)*.16,-2.5+random(i,7)*5);
   dummy.rotation.set(t*2+i,t*3+i*.7,t+i);dummy.scale.set(.7,.15,1.5);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);
  }leaves.instanceMatrix.needsUpdate=true;
 }};
}
function makeFire(){
 const a=new Art();platform(a,2.7);
 const logGeo=a.geometry('log',()=>new THREE.CylinderGeometry(.16,.19,1.65,9));
 for(let i=0;i<4;i++){const log=a.mesh(logGeo,a.material(i%2?'#98704f':'#725243',{flatShading:true}),a.group,[0,.12+i*.055,0]);log.rotation.set(Math.PI/2,0,i*Math.PI/2+.4)}
 for(let i=0;i<12;i++)a.mesh(a.geometry('rock',()=>new THREE.IcosahedronGeometry(.24,0)),a.material('#7f9499',{flatShading:true}),a.group,[Math.cos(i*TAU/12)*1.05,.11,Math.sin(i*TAU/12)*1.05],[1,.65,1]);
 const points=[[0,0],[.28,.08],[.42,.4],[.24,.86],[.10,1.20],[0,1.7]].map(([x,y])=>new THREE.Vector2(x,y));
 const flameGeo=a.geometry('flame',()=>new THREE.LatheGeometry(points,12));
 const flames=[];
 for(let i=0;i<3;i++){const f=a.mesh(flameGeo,a.material(['#ff7546','#ffb85e','#ffe2a0'][i],{transparent:true,opacity:.92,depthWrite:false},true),a.group,[i===0?-.10:i===1?.14:0,.2,i*.12],[1-i*.22,1-i*.18,1-i*.22]);flames.push(f)}
 const light=new THREE.PointLight('#ff9b54',12,7,2);light.position.set(0,1.25,0);a.group.add(light);
 const sparks=a.instanced(46,'#ffc88b',a.geometry('spark',()=>new THREE.IcosahedronGeometry(.032,0)));
 const dummy=new THREE.Object3D();tree(a,a.group,-1.9,-1.2,.6);tree(a,a.group,1.75,-1.25,.55);
 const bench=a.node(a.group,[1.5,0,.8]);a.box([.45,.12,1.3],[0,.42,0],'#bc9270',bench);for(const z of [-.4,.4])a.box([.32,.4,.12],[0,.2,z],'#665b50',bench);
 return {a,position:[5.9,3.5,6.4],target:[0,.9,0],update(p){
  const t=p*TAU;
  flames.forEach((f,i)=>{const s=1-i*.22;f.scale.set(s*(1+Math.sin(t*5+i)*.08),(1-i*.18)*(1+Math.sin(t*7+i*1.4)*.09),s);f.rotation.z=Math.sin(t*4+i)*.07});
  light.intensity=11+Math.sin(t*7)*1.0+Math.sin(t*11)*.5;
  for(let i=0;i<46;i++){const f=fract(p*2+random(i));dummy.position.set(Math.sin(i+f*5)*(.16+f*.35),.4+f*2.4,Math.cos(i+f*3)*(.12+f*.35));dummy.rotation.set(f*10,i,f*7);dummy.scale.setScalar((1-f)*.9);dummy.updateMatrix();sparks.setMatrixAt(i,dummy.matrix)}sparks.instanceMatrix.needsUpdate=true;
 }};
}
function makePortal(){
 const a=new Art();platform(a,2.5);
 const core=a.ball(.88,[0,1.8,0],'#234f59',a.group,{metalness:.75,roughness:.17,emissive:'#28625b',emissiveIntensity:.35});
 const rings=[];
 for(let i=0;i<3;i++){
  const pivot=a.node(a.group,[0,1.8,0]);pivot.rotation.x=i*Math.PI/3;
  const ring=a.ring(1.22+i*.19,.035,[0,0,0],i===1?'#ff9d71':'#a6edd1',pivot,{emissive:i===1?'#ff9d71':'#79d7b9',emissiveIntensity:.7});
  const inner=a.ring(1.1+i*.19,.010,[0,0,0],'#416b73',pivot);
  rings.push(pivot);void ring;void inner;
 }
 const particles=a.instanced(64,'#baffde',a.geometry('orb',()=>new THREE.IcosahedronGeometry(.035,0)));
 const dummy=new THREE.Object3D();
 const point=new THREE.PointLight('#89f1c6',6,7);point.position.set(0,1.8,0);a.group.add(point);
 return {a,position:[5.6,3.25,6.8],target:[0,1.4,0],update(p){
  const t=p*TAU;
  rings.forEach((g,i)=>{g.rotation.set(t*(i%2?-.5:.5)+i*Math.PI/3,t*(i%2?1:-1),t*.2)});
  core.rotation.set(t*.3,t*.5,0);core.scale.setScalar(1+Math.sin(t)*.05);
  for(let i=0;i<64;i++){const angle=t+i*TAU/64,r=1.65+random(i)*.45;dummy.position.set(Math.cos(angle)*r,1.8+Math.sin(angle*2+i)*.65,Math.sin(angle)*r);dummy.scale.setScalar(.6+random(i,4));dummy.updateMatrix();particles.setMatrixAt(i,dummy.matrix)}particles.instanceMatrix.needsUpdate=true;
 }};
}
function makeShield(){
 const a=new Art();platform(a,2.6);
 const core=a.mesh(a.geometry('crystal',()=>new THREE.OctahedronGeometry(.47)),a.material('#ffb581',{metalness:.5,roughness:.25,emissive:'#b25d38',emissiveIntensity:.2}),a.group,[0,1.7,0]);
 const geo=a.geometry('shield',()=>new THREE.IcosahedronGeometry(1.55,1));
 const shell=a.mesh(geo,a.material('#8bdec6',{transparent:true,opacity:.11,depthWrite:false,side:THREE.DoubleSide}),a.group,[0,1.7,0]);
 const edges=a.geometry('shieldEdges',()=>new THREE.EdgesGeometry(geo));
 const edgeMaterial=new THREE.LineBasicMaterial({color:'#a6edd1',transparent:true,opacity:.65});a.extra.push(edgeMaterial);
 const wire=new THREE.LineSegments(edges,edgeMaterial);wire.position.y=1.7;a.group.add(wire);
 const rings=[];
 for(let i=0;i<2;i++){const r=a.ring(1.75,.018,[0,1.7,0],i?'#fca276':'#baffde',a.group,{},true);r.rotation.x=i?Math.PI/3:Math.PI/2;rings.push(r)}
 return {a,position:[6,3.5,7],target:[0,1.35,0],update(p){
  const t=p*TAU,scale=1+Math.sin(t)*.025;
  shell.scale.setScalar(scale);wire.scale.setScalar(scale);shell.rotation.y=wire.rotation.y=t*.2;edgeMaterial.opacity=.45+(Math.sin(t)+1)*.12;
  core.rotation.set(t*.4,t*.8,Math.sin(t)*.15);core.position.y=1.7+Math.sin(t)*.14;
  rings.forEach((r,i)=>r.rotation.z=t*(i?1:-1));
 }};
}
function makeBurst(){
 const a=new Art();platform(a,3.1);
 const fragments=a.instanced(128,'#f6b580',a.geometry('fragment',()=>new THREE.IcosahedronGeometry(.085,0)));
 const core=a.ball(.3,[0,1.7,0],'#ffe3ad',a.group,{emissive:'#ffc27b',emissiveIntensity:1});
 const ring=a.ring(1,.028,[0,1.7,0],'#ffb184',a.group,{transparent:true,opacity:1,depthWrite:false},true);ring.rotation.x=Math.PI/2;
 const dummy=new THREE.Object3D(),color=new THREE.Color();
 for(let i=0;i<128;i++){color.set(i%3?'#ff9c6d':'#baffe1');fragments.setColorAt(i,color)}
 return {a,position:[6.8,4.3,8],target:[0,1.1,0],update(p){
  const e=clamp((p-.1)/.78),travel=1-Math.pow(1-e,2),alive=p>.1;
  for(let i=0;i<128;i++){
   const theta=random(i)*TAU,z=random(i,3)*2-1,r=Math.sqrt(1-z*z),power=1.1+random(i,7)*2.1;
   dummy.position.set(Math.cos(theta)*r*power*travel,1.7+z*power*travel-e*e*.9,Math.sin(theta)*r*power*travel);
   dummy.rotation.set(e*8+i,e*5+i*.8,e*3);dummy.scale.setScalar(alive?Math.pow(1-e,1.5):0);dummy.updateMatrix();fragments.setMatrixAt(i,dummy.matrix);
  }fragments.instanceMatrix.needsUpdate=true;
  core.scale.setScalar(alive?Math.pow(1-e,3)*2.2:.6+Math.sin(p*15)*.15);
  ring.scale.setScalar(.2+travel*3);ring.material.opacity=alive?(1-e)*.6:0;
 }};
}
function makeOrbit(){
 const a=new Art();platform(a,2.7);
 const nucleus=a.mesh(a.geometry('nucleus',()=>new THREE.IcosahedronGeometry(.62,0)),a.material('#ffb27f',{metalness:.5,roughness:.25}),a.group,[0,1.9,0]);
 const hoops=[],satellites=[];
 for(let i=0;i<4;i++){
  const g=a.node(a.group,[0,1.9,0]);g.rotation.set(Math.PI/2+i*.32,i*.7,i*.6);
  a.ring(1.1+i*.21,.014,[0,0,0],i%2?'#80c6bd':'#c9a88b',g);
  const planet=a.ball(.11+i*.025,[0,0,0],i%2?'#a6edd1':'#fca478',g,{metalness:.4});
  hoops.push(g);satellites.push(planet);
 }
 return {a,position:[5.5,3.6,7.1],target:[0,1.5,0],update(p){
  const t=p*TAU;nucleus.rotation.set(t*.5,t,t*.25);
  satellites.forEach((s,i)=>{const angle=t*(i+1),r=1.1+i*.21;s.position.set(Math.cos(angle)*r,Math.sin(angle)*r,0)});
  hoops.forEach((g,i)=>g.rotation.z=i*.6+Math.sin(t)*.1);
 }};
}
function makeAssembly(){
 const a=new Art();platform(a,2.65);
 const parts=[];
 for(let i=0;i<6;i++){
  const g=a.node(a.group,[0,.15+i*.32,0]);parts.push(g);
  if(i===0||i===5){
   a.cylinder(.95,.19,[0,0,0],i===0?'#486d74':'#ff9c6c',g,{metalness:.55,roughness:.3});
   a.ring(.75,.035,[0,.11,0],'#d6eee0',g).rotation.x=Math.PI/2;
  }else if(i===3){
   const ball=a.mesh(a.geometry('assemblyCore',()=>new THREE.OctahedronGeometry(.51)),a.material('#a6edd1',{emissive:'#61bda4',emissiveIntensity:.5,metalness:.4}),g);
   ball.rotation.z=.3;
  }else{
   a.cylinder(.72,.11,[0,0,0],i%2?'#b5ccc4':'#667f8c',g,{metalness:.7,roughness:.3});
   for(let k=0;k<4;k++)a.box([.10,.27,.10],[Math.cos(k*Math.PI/2)*.62,.15,Math.sin(k*Math.PI/2)*.62],'#d4b68e',g,{metalness:.7});
  }
 }
 return {a,position:[6,4.3,7.5],target:[0,1.45,0],update(p){
  const t=p*TAU,e=(1-Math.cos(t))*.5;
  parts.forEach((g,i)=>{g.position.y=.15+i*.32+(i-2.5)*.3*e;g.rotation.y=(i%2?1:-1)*e*.38;g.position.x=i===3?Math.sin(t)*.10:0});
 }};
}
function buildScene(id){
 if(['walk','run','jump','attack'].includes(id))return makeCharacter(id);
 const factories={village:makeVillage,forest:makeForest,fire:makeFire,portal:makePortal,shield:makeShield,burst:makeBurst,orbit:makeOrbit,assembly:makeAssembly};
 if(!factories[id])throw new Error('Cena desconhecida: '+id);
 return factories[id]();
}
function announce(text){$('announcement').textContent=text}
function applyWireframe(){
 if(!current)return;
 current.a.group.traverse(node=>{
  if(node.material&&node.material.isMeshStandardMaterial){node.material.wireframe=state.wireframe;node.material.needsUpdate=true}
 });
 state.dirty=true;
}
function syncPlayback(){
 $('play-label').textContent=state.playing?'Pausar':'Reproduzir';
 $('play').setAttribute('aria-label',state.playing?'Pausar animação':'Reproduzir animação');
 $('play').querySelector('.glyph').innerHTML=state.playing?'<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3V13M11 3V13" stroke-width="3"/></svg>':'<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2L14 8L4 14Z" fill="currentColor" stroke="none"/></svg>';
 $('live').textContent=state.ready?(state.playing?'LIVE 3D':'PAUSADO'):'SEM GPU';
 $('state-value').textContent=state.ready?(state.playing?'LIVE':'PAUSA'):'SEM GPU';
}
function updateTime(){
 $('timeline').value=Math.round(state.progress*1000);
 $('timeline').setAttribute('aria-valuetext',Math.round(state.progress*100)+'%');
 $('time').textContent=(state.progress*state.duration).toFixed(2)+' / '+state.duration.toFixed(2)+' s';
 $('progress-value').textContent=Math.round(state.progress*100)+'%';
 $('frame-value').textContent=String(Math.round(state.progress*state.duration*60)).padStart(3,'0');
}
function renderNow(){
 if(!state.ready||!current||isRendering)return;
 isRendering=true;
 try{current.update(state.progress);renderer.render(scene,camera);state.frames++;state.dirty=false;updateTime()}
 catch(error){sceneError(error)}
 finally{isRendering=false}
}
function sceneError(error){
 state.error=error.message||String(error);state.playing=false;$('error').textContent='Falha na cena: '+state.error+'. Selecione outra demonstração.';$('error').hidden=false;syncPlayback();console.error(error);
}
function gpuFailure(message){
 state.ready=false;state.playing=false;
 const overlay=document.createElement('div');overlay.className='gpu-failure';
 const content=document.createElement('div'),h=document.createElement('h3'),p=document.createElement('p'),button=document.createElement('button');
 h.textContent='A renderização 3D está indisponível.';p.textContent=message;button.type='button';button.textContent='Tentar novamente';button.addEventListener('click',()=>location.reload());
 content.append(h,p,button);overlay.append(content);$('stage').append(overlay);
 for(const id of ['play','restart','timeline','capture','camera-reset','auto-camera','wireframe','shadows','quality'])$(id).disabled=true;
 syncPlayback();announce('Renderização 3D indisponível.');
}
function resetCamera(){
 if(!current||!controls)return;
 const damping=controls.enableDamping;
 controls.autoRotate=false;controls.enableDamping=false;controls.update(0);
 camera.position.set(...current.position);controls.target.set(...current.target);controls.update(0);
 controls.enableDamping=damping;state.dirty=true;renderNow();
}
function resize(){
 if(!renderer)return;const width=Math.max(1,$('preview').clientWidth),height=Math.max(1,$('preview').clientHeight);
 renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();state.dirty=true;
}
function quality(){
 if(!renderer)return;
 const level={low:[1,512],medium:[1.5,1024],high:[2,2048]}[state.quality];
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,level[0]));
 keyLight.shadow.mapSize.set(level[1],level[1]);
 if(keyLight.shadow.map){keyLight.shadow.map.dispose();keyLight.shadow.map=null}
 resize();
}
function renderFilters(){
 const focused=document.activeElement&&document.activeElement.dataset.category;
 $('filters').replaceChildren(...['Todos','Personagem','Cenários','Efeitos','Objetos'].map(category=>{
  const b=document.createElement('button');b.type='button';b.className='filter';b.dataset.category=category;b.textContent=category;b.setAttribute('aria-pressed',String(state.category===category));
  b.addEventListener('click',()=>{state.category=category;renderFilters();renderList()});return b;
 }));
 if(focused){const button=$('filters').querySelector('[data-category="'+focused+'"]');if(button)button.focus({preventScroll:true})}
}
function renderList(){
 const list=$('demo-list'),scrollTop=list.scrollTop,scrollLeft=list.scrollLeft,focusedId=document.activeElement&&document.activeElement.dataset.demo;
 const normal=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),query=normal(state.query.trim());
 const filtered=catalog.filter(d=>(state.category==='Todos'||d.category===state.category)&&normal([d.title,d.category,...d.tags].join(' ')).includes(query));
 $('count').textContent=filtered.length+' / '+catalog.length;
 list.replaceChildren(...filtered.map(def=>{
  const b=document.createElement('button');b.type='button';b.className='demo-item';b.dataset.demo=def.id;b.setAttribute('aria-current',String(def.id===state.id));
  const number=document.createElement('span'),content=document.createElement('span'),name=document.createElement('span'),category=document.createElement('span'),mark=document.createElement('span');
  number.className='demo-number mono';number.textContent=String(def.index).padStart(2,'0');
  name.className='demo-name';name.textContent=def.title;category.className='demo-cat';category.textContent=def.category;content.append(name,category);
  mark.className='item-mark';mark.innerHTML=arrow;b.append(number,content,mark);b.addEventListener('click',()=>selectDemo(def.id));return b;
 }));
 if(!filtered.length){const p=document.createElement('p');p.className='empty';p.textContent='Nenhuma cena encontrada. Tente outra busca ou categoria.';list.append(p)}
 list.scrollTop=scrollTop;list.scrollLeft=scrollLeft;
 if(focusedId){const button=list.querySelector('[data-demo="'+focusedId+'"]');if(button)button.focus({preventScroll:true})}
}
function selectDemo(id,updateHash=true){
 const def=catalog.find(d=>d.id===id);if(!def)return;
 state.id=id;state.progress=0;state.last=0;state.error=null;$('error').hidden=true;
 $('preview-title').textContent=def.title;$('detail-title').textContent=def.title;$('detail-category').textContent=def.category+' / '+String(def.index).padStart(2,'0');
 $('preview-id').textContent='3D—'+String(def.index).padStart(2,'0');$('description').textContent=def.description;$('render-value').textContent='WebGL';
 $('tags').replaceChildren(...def.tags.map(text=>{const span=document.createElement('span');span.className='tag';span.textContent=text;return span}));
 if(state.ready){
  try{
   if(current){scene.remove(current.a.group);current.a.dispose();current=null;renderer.renderLists.dispose()}
   current=buildScene(id);current.a.group.name=id;scene.add(current.a.group);applyWireframe();resetCamera();renderNow();
  }catch(error){sceneError(error)}
 }
 renderList();const selected=$('demo-list').querySelector('[data-demo="'+id+'"]');
 if(selected){const list=$('demo-list');if(matchMedia('(max-width: 650px)').matches)list.scrollLeft=selected.offsetLeft-(list.clientWidth-selected.offsetWidth)/2;else if(selected.offsetTop<list.scrollTop||selected.offsetTop+selected.offsetHeight>list.scrollTop+list.clientHeight)list.scrollTop=selected.offsetTop-list.clientHeight/2}
 syncPlayback();updateTime();announce(def.title+' selecionado.');
 if(updateHash){try{history.replaceState(null,'','#'+id)}catch(_){/* A cena permanece utilizável sem histórico. */}}
}
function seek(progress){state.progress=clamp(progress);state.last=0;state.dirty=true;renderNow()}
function togglePlay(){
 if(!state.ready||state.error)return;
 if(!state.playing&&state.progress>=1)seek(0);
 state.playing=!state.playing;state.last=0;syncPlayback();
}
function tick(now){
 if(state.ready&&!document.hidden){
  frameDelta=state.last?Math.min((now-state.last)/1000,.15):0;state.last=now;
  if(state.playing&&!state.error){
   state.progress+=frameDelta*state.speed/state.duration;
   if(state.progress>=1){if(state.loop)state.progress%=1;else{state.progress=1;state.playing=false;syncPlayback()}}
   state.dirty=true;
  }
  controls.autoRotate=state.autoCamera&&state.playing;controls.update(frameDelta);
  if(state.dirty)renderNow();
 }else state.last=0;
 raf=requestAnimationFrame(tick);
}
function saveBlob(blob,name){
 if(!blob){announce('Não foi possível gerar o arquivo.');return}
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
function init(){
 try{
  if(!window.THREE||!window.ZeroOrbitControls)throw new Error('A biblioteca 3D embutida não pôde ser carregada.');
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const canvas=renderer.domElement;canvas.id='scene-canvas';canvas.tabIndex=0;canvas.setAttribute('aria-label','Cena 3D. Arraste para orbitar; use scroll ou pinça para zoom.');$('preview').append(canvas);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();gpuFailure('O navegador perdeu o contexto gráfico. Feche outras abas 3D ou ative a aceleração gráfica e tente novamente.')});
  scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#172129',.028);
  camera=new THREE.PerspectiveCamera(40,1,.1,80);
  scene.add(new THREE.HemisphereLight('#c9e9f2','#506659',2.1));
  keyLight=new THREE.DirectionalLight('#ffe0bf',3.2);keyLight.position.set(5,8,5);keyLight.castShadow=true;
  keyLight.shadow.camera.left=-6;keyLight.shadow.camera.right=6;keyLight.shadow.camera.top=6;keyLight.shadow.camera.bottom=-6;keyLight.shadow.camera.near=.5;keyLight.shadow.camera.far=24;keyLight.shadow.normalBias=.035;keyLight.shadow.bias=-.0002;scene.add(keyLight);
  const rim=new THREE.DirectionalLight('#90d9cf',1.7);rim.position.set(-5,4,-4);scene.add(rim);
  const floorGeometry=new THREE.CircleGeometry(12,64),floorMaterial=new THREE.MeshStandardMaterial({color:'#17252d',roughness:.95});
  const ground=new THREE.Mesh(floorGeometry,floorMaterial);ground.rotation.x=-Math.PI/2;ground.position.y=-1.95;ground.receiveShadow=true;scene.add(ground);
  const grid=new THREE.GridHelper(24,24,'#52777c','#36565f');grid.position.y=-1.944;grid.material.transparent=true;grid.material.opacity=.10;scene.add(grid);
  controls=new ZeroOrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.09;controls.minDistance=4;controls.maxDistance=23;controls.minPolarAngle=.12;controls.maxPolarAngle=Math.PI*.49;controls.enablePan=false;controls.autoRotateSpeed=.65;
  controls.addEventListener('change',()=>{state.dirty=true});
  state.ready=true;quality();resizeObserver=new ResizeObserver(resize);resizeObserver.observe($('preview'));
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);if(resizeObserver)resizeObserver.disconnect();controls.dispose();if(current)current.a.dispose();floorGeometry.dispose();floorMaterial.dispose();grid.geometry.dispose();grid.material.dispose();renderer.dispose()},{once:true});
 }catch(error){gpuFailure('Ative a aceleração gráfica do navegador ou tente um navegador atualizado com suporte a WebGL. '+(error.message||''))}
}
$('search').addEventListener('input',event=>{state.query=event.target.value;renderList()});
$('play').addEventListener('click',togglePlay);
$('restart').addEventListener('click',()=>{seek(0);announce('Animação reiniciada.')});
$('timeline').addEventListener('input',event=>{state.playing=false;seek(Number(event.target.value)/1000);syncPlayback()});
$('loop').addEventListener('change',event=>{state.loop=event.target.checked});
$('speed').addEventListener('change',event=>{state.speed=Number(event.target.value);state.last=0});
$('duration').addEventListener('input',event=>{state.duration=Number(event.target.value);$('duration-value').textContent=state.duration.toFixed(1).replace('.',',')+' s';state.last=0;updateTime()});
$('camera-reset').addEventListener('click',()=>{state.autoCamera=false;$('auto-camera').checked=false;controls.autoRotate=false;resetCamera();announce('Câmera restaurada.')});
$('auto-camera').addEventListener('change',event=>{state.autoCamera=event.target.checked;state.dirty=true});
$('wireframe').addEventListener('change',event=>{state.wireframe=event.target.checked;applyWireframe();renderNow()});
$('shadows').addEventListener('change',event=>{state.shadows=event.target.checked;renderer.shadowMap.enabled=state.shadows;scene.traverse(n=>{if(n.material)n.material.needsUpdate=true});state.dirty=true;renderNow()});
$('quality').value=state.quality;
$('quality').addEventListener('change',event=>{state.quality=event.target.value;quality();renderNow()});
$('download').addEventListener('click',()=>{saveBlob(new Blob([ORIGINAL_SOURCE],{type:'text/html;charset=utf-8'}),'ZERO_MOTION_STUDIO_3D.html');announce('Download do laboratório 3D iniciado.')});
$('capture').addEventListener('click',()=>{
 if(!state.ready)return;renderNow();
 try{renderer.domElement.toBlob(blob=>{saveBlob(blob,'ZERO_3D_'+state.id+'.png');announce(blob?'Captura PNG gerada.':'Não foi possível gerar a captura.')},'image/png')}catch(error){announce('Falha ao capturar a imagem: '+error.message)}
});
document.addEventListener('keydown',event=>{
 if(event.ctrlKey||event.metaKey||event.altKey||/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(event.target.tagName)||event.target.isContentEditable)return;
 if(event.code==='Space'){event.preventDefault();togglePlay()}
 if(event.code==='ArrowLeft'||event.code==='ArrowRight'){event.preventDefault();state.playing=false;seek(state.progress+(event.code==='ArrowRight'?.05:-.05));syncPlayback()}
});
document.addEventListener('visibilitychange',()=>{state.last=0});
window.addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(catalog.some(d=>d.id===id)&&state.id!==id)selectDemo(id,false)});
// Somente leitura: diagnóstico para verificação externa e inspeção no console.
window.ZERO3D=Object.freeze({snapshot:()=>({
 id:state.id,ready:state.ready,error:state.error,playing:state.playing,progress:state.progress,frames:state.frames,
 revision:window.THREE&&THREE.REVISION,camera:camera?camera.position.toArray():null,
 geometries:renderer?renderer.info.memory.geometries:0,textures:renderer?renderer.info.memory.textures:0,
 triangles:renderer?renderer.info.render.triangles:0,drawCalls:renderer?renderer.info.render.calls:0,
 meshes:current?(()=>{let n=0;current.a.group.traverse(o=>{if(o.isMesh)n++});return n})():0,
 invalidTransforms:current?(()=>{let n=0;current.a.group.traverse(o=>{if(![...o.position.toArray(),...o.rotation.toArray().slice(0,3),...o.scale.toArray()].every(Number.isFinite))n++});return n})():0
 })});
$('reduced-notice').hidden=!reduced;renderFilters();init();selectDemo(catalog.some(d=>d.id===location.hash.slice(1))?location.hash.slice(1):'village');raf=requestAnimationFrame(tick);
})();
