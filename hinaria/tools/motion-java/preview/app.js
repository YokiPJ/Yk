(function(){
'use strict';
const originalSource='<!doctype html>\n'+document.documentElement.outerHTML;
const $=id=>document.getElementById(id),assets=window.HINARIA_MOTION_ASSETS;
const groups={Idle:'Locomoção',Walk:'Locomoção',Run:'Locomoção',Jump:'Locomoção',Attack:'Combate',AttackHeavy:'Combate',Hit:'Combate',Block:'Combate',Dodge:'Combate',Death:'Estados'};
const descriptions={
 Idle:'Respiração, pequenos movimentos da cabeça e balanço da capa. Ciclo contínuo.',
 Walk:'Andar no lugar com pernas e braços em oposição, baseado no CharacterAnimator do HINÁRIA.',
 Run:'Passadas amplas, inclinação do corpo e balanço da capa. O deslocamento no mundo continua sendo responsabilidade do controlador.',
 Attack:'Golpe único de 0,35 s. O pivô principal acompanha o braço que carrega a arma do modelo.',
 AttackHeavy:'Variação do golpe com amplitude maior e recuperação mais longa.',
 Hit:'Reação a dano: recuo do tronco, oscilação lateral, cabeça e braços. Inclui impacto e recuperação.',
 Block:'Pose de defesa com elevação do braço de apoio e preparação do braço principal.',
 Dodge:'Esquiva baixa com compressão, inclinação e retorno à postura inicial.',
 Jump:'Antecipação, arco de salto e compressão na aterrissagem, dentro da hierarquia local.',
 Death:'Queda com pose final mantida. Reinicie para observar novamente.'
};
const catalog=assets.animations.map((a,i)=>({...a,id:a.name,category:groups[a.name],title:a.label,index:i+1}));
const state={model:assets.models[0].id,id:'Walk',category:'Todos',query:'',playing:!matchMedia('(prefers-reduced-motion: reduce)').matches,progress:0,speed:1,loop:true,ready:false,loading:false,error:null,frames:0,last:0,dirty:true,wireframe:false,autoCamera:false,quality:innerWidth<650?'low':'medium'};
let renderer,scene,camera,controls,key,mixer,action,loaded,wrapper,resizeObserver,raf,loadToken=0,modelBytes,defaultCamera,drawBusy=false;
const clamp=x=>Math.max(0,Math.min(1,x));
const arrow='<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13L13 3M4 3H13V12"/></svg>';
function announce(text){$('announcement').textContent=text}
function sync(){
 $('play-label').textContent=state.playing?'Pausar':'Reproduzir';
 $('play').setAttribute('aria-label',state.playing?'Pausar animação':'Reproduzir animação');
 $('play').querySelector('.glyph').innerHTML=state.playing?'<svg class="icon" viewBox="0 0 16 16"><path d="M5 3V13M11 3V13" stroke-width="3"/></svg>':'<svg class="icon" viewBox="0 0 16 16"><path d="M4 2L14 8L4 14Z" fill="currentColor" stroke="none"/></svg>';
 $('live').textContent=state.loading?'CARREGANDO':state.ready?(state.playing?'LIVE 3D':'PAUSADO'):'SEM GPU';
 $('state-value').textContent=state.loading?'CARREGA':state.playing?'LIVE':'PAUSA';
 const def=catalog.find(a=>a.id===state.id),duration=def.duration;
 $('timeline').value=Math.round(state.progress*1000);$('timeline').setAttribute('aria-valuetext',Math.round(state.progress*100)+'%');
 $('time').textContent=(state.progress*duration).toFixed(2)+' / '+duration.toFixed(2)+' s';
 $('frame-value').textContent=String(Math.round(state.progress*duration*assets.fps)).padStart(3,'0');
 $('progress-value').textContent=Math.round(state.progress*100)+'%';
 $('duration-value').textContent=duration.toFixed(2).replace('.',',')+' s';
}
function reportError(error){
 state.error=error.message||String(error);state.playing=false;state.loading=false;
 $('error').textContent='Não foi possível carregar ou renderizar: '+state.error;$('error').hidden=false;sync();console.error(error);
}
function disposeAsset(gltf){
 if(!gltf)return;const geometries=new Set(),materials=new Set();
 gltf.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m)}});
 geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}
function draw(){
 if(!state.ready||state.loading||!loaded||!action||drawBusy)return;
 drawBusy=true;
 try{
  // All poses come from animation tracks exported by HinariaAnimator.java.
  // JavaScript only asks Three.js to sample the selected GLB clip.
  action.enabled=true;action.paused=false;
  mixer.setTime(state.progress*action.getClip().duration);
  renderer.render(scene,camera);state.frames++;state.dirty=false;sync();
 }catch(error){reportError(error)}finally{drawBusy=false}
}
function applyWireframe(){
 if(loaded)loaded.scene.traverse(o=>{if(o.isMesh){for(const m of Array.isArray(o.material)?o.material:[o.material]){m.wireframe=state.wireframe;m.needsUpdate=true}}});
 state.dirty=true;
}
function cameraReset(){
 if(!controls||!defaultCamera)return;
 const damping=controls.enableDamping;controls.autoRotate=false;controls.enableDamping=false;controls.update();
 camera.position.set(...defaultCamera.position);controls.target.set(...defaultCamera.target);controls.update();controls.enableDamping=damping;
 state.dirty=true;draw();
}
function resize(){
 if(!renderer)return;const width=Math.max(1,$('preview').clientWidth),height=Math.max(1,$('preview').clientHeight);
 renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();state.dirty=true;
}
function quality(){
 if(!renderer)return;const [ratio,size]={low:[1,512],medium:[1.5,1024],high:[2,2048]}[state.quality];
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,ratio));key.shadow.mapSize.set(size,size);
 if(key.shadow.map){key.shadow.map.dispose();key.shadow.map=null}resize();
}
function renderFilters(){
 $('filters').replaceChildren(...['Todos','Locomoção','Combate','Estados'].map(category=>{
  const b=document.createElement('button');b.type='button';b.className='filter';b.textContent=category;b.setAttribute('aria-pressed',String(state.category===category));
  b.addEventListener('click',()=>{state.category=category;renderFilters();renderList()});return b;
 }));
}
function renderList(){
 const list=$('demo-list'),top=list.scrollTop,left=list.scrollLeft,focus=document.activeElement?.dataset.demo;
 const normal=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),query=normal(state.query.trim());
 const filtered=catalog.filter(d=>(state.category==='Todos'||state.category===d.category)&&normal(d.title+' '+d.name+' '+d.category).includes(query));
 $('count').textContent=filtered.length+' / '+catalog.length;
 list.replaceChildren(...filtered.map(def=>{
  const b=document.createElement('button');b.type='button';b.className='demo-item';b.dataset.demo=def.id;b.setAttribute('aria-current',String(state.id===def.id));
  const number=document.createElement('span'),content=document.createElement('span'),name=document.createElement('span'),sub=document.createElement('span'),mark=document.createElement('span');
  number.className='demo-number mono';number.textContent=String(def.index).padStart(2,'0');name.className='demo-name';name.textContent=def.title;sub.className='demo-cat';sub.textContent=def.name+' · '+def.duration.toFixed(2)+' s';mark.className='item-mark';mark.innerHTML=arrow;
  content.append(name,sub);b.append(number,content,mark);b.addEventListener('click',()=>selectClip(def.id));return b;
 }));
 if(!filtered.length){const p=document.createElement('p');p.className='empty';p.textContent='Nenhuma animação encontrada.';list.append(p)}
 list.scrollTop=top;list.scrollLeft=left;
 if(focus)list.querySelector('[data-demo="'+focus+'"]')?.focus({preventScroll:true});
}
function selectClip(id){
 const def=catalog.find(a=>a.id===id);if(!def)return;
 state.id=id;state.progress=0;state.last=0;state.loop=def.loop;$('loop').checked=state.loop;
 if(mixer&&loaded){
  mixer.stopAllAction();const clip=loaded.animations.find(a=>a.name===id);if(!clip)throw new Error('Clipe ausente: '+id);
  action=mixer.clipAction(clip);action.reset();action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
 }
 $('preview-title').textContent=def.title;$('detail-title').textContent=def.title;$('description').textContent=descriptions[id];
 $('detail-category').textContent=def.category+' / '+def.name;$('preview-id').textContent='JAVA—'+String(def.index).padStart(2,'0');$('render-value').textContent='GLB';
 $('tags').replaceChildren(...[def.loop?'ciclo':'ação única','Java → GLB',assets.fps+' amostras/s'].map(text=>{const s=document.createElement('span');s.className='tag';s.textContent=text;return s}));
 renderList();const selected=$('demo-list').querySelector('[data-demo="'+id+'"]'),list=$('demo-list');
 if(selected){if(innerWidth<=650)list.scrollLeft=selected.offsetLeft-(list.clientWidth-selected.offsetWidth)/2;else if(selected.offsetTop<list.scrollTop||selected.offsetTop+selected.offsetHeight>list.scrollTop+list.clientHeight)list.scrollTop=selected.offsetTop-list.clientHeight/2}
 state.dirty=true;draw();sync();announce(def.title+' selecionado.');
}
async function loadModel(id){
 const entry=assets.models.find(m=>m.id===id);if(!entry||!state.ready)return;
 const token=++loadToken;state.loading=true;state.error=null;$('error').hidden=true;sync();$('download-glb').disabled=true;
 try{
  const raw=atob(entry.data),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  const gltf=await new ZeroGLTFLoader().parseAsync(bytes.buffer,'');
  if(token!==loadToken){disposeAsset(gltf);return}
  if(mixer){mixer.stopAllAction();mixer.uncacheRoot(loaded.scene)}
  if(wrapper){scene.remove(wrapper);disposeAsset(loaded);renderer.renderLists.dispose()}
  loaded=gltf;modelBytes=bytes;state.model=id;wrapper=new THREE.Group();wrapper.add(gltf.scene);
  const bounds=new THREE.Box3().setFromObject(gltf.scene),size=new THREE.Vector3();bounds.getSize(size);
  gltf.scene.position.y=-bounds.min.y;
  gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  scene.add(wrapper);mixer=new THREE.AnimationMixer(gltf.scene);
  const height=size.y;defaultCamera={position:[height*1.55,height*1.05,height*2.35],target:[0,height*.51,0]};
  state.loading=false;$('download-glb').disabled=false;$('download-glb').textContent='Baixar '+entry.name+'.glb ↓';
  applyWireframe();cameraReset();selectClip(state.id);announce(entry.name+' carregado: '+loaded.animations.length+' clipes gerados em Java.');
 }catch(error){if(token===loadToken)reportError(error)}
}
function save(blob,name){
 if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
function seek(value){state.progress=clamp(value);state.last=0;state.dirty=true;draw();sync()}
function toggle(){
 if(!state.ready||state.loading||state.error)return;
 if(!state.playing&&state.progress>=1)seek(0);state.playing=!state.playing;state.last=0;sync();
}
function tick(now){
 if(state.ready&&!document.hidden&&!state.loading){
  const dt=state.last?Math.min((now-state.last)/1000,.15):0;state.last=now;
  if(state.playing&&!state.error){
   const duration=catalog.find(a=>a.id===state.id).duration;state.progress+=dt*state.speed/duration;
   if(state.progress>=1){if(state.loop)state.progress%=1;else{state.progress=1;state.playing=false;sync()}}
   state.dirty=true;
  }
  controls.autoRotate=state.autoCamera&&state.playing;controls.update();if(state.dirty)draw();
 }else state.last=0;
 raf=requestAnimationFrame(tick);
}
function gpuFailure(message){
 state.ready=false;state.playing=false;$('error').textContent=message;$('error').hidden=false;
 for(const id of ['play','restart','timeline','camera-reset','capture','download-glb','wireframe','shadows','quality','auto-camera','model'])$(id).disabled=true;
 sync();
}
function init(){
 try{
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const canvas=renderer.domElement;canvas.id='scene-canvas';canvas.tabIndex=0;canvas.setAttribute('aria-label','Modelo 3D do HINÁRIA. Arraste para girar; scroll para zoom.');$('preview').append(canvas);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();gpuFailure('O contexto WebGL foi perdido. Recarregue a página; se necessário, ative a aceleração gráfica do navegador.')});
  scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#172129',.035);camera=new THREE.PerspectiveCamera(38,1,.05,60);
  scene.add(new THREE.HemisphereLight('#d5e9ff','#657261',1.8));key=new THREE.DirectionalLight('#ffe6cc',3.1);key.position.set(3,5,4);key.castShadow=true;
  Object.assign(key.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.1,far:15});key.shadow.normalBias=.008;key.shadow.bias=-.0001;scene.add(key);
  const fill=new THREE.DirectionalLight('#9edfd8',1.2);fill.position.set(-3,2,-3);scene.add(fill);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(8,64),new THREE.MeshStandardMaterial({color:'#253b43',roughness:.85}));floor.rotation.x=-Math.PI/2;floor.position.y=-.015;floor.receiveShadow=true;scene.add(floor);
  const grid=new THREE.GridHelper(16,32,'#4a696e','#3a565e');grid.position.y=-.01;grid.material.transparent=true;grid.material.opacity=.12;scene.add(grid);
  controls=new ZeroOrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.10;controls.enablePan=false;controls.minDistance=1.6;controls.maxDistance=14;controls.minPolarAngle=.1;controls.maxPolarAngle=Math.PI*.49;controls.autoRotateSpeed=.65;controls.addEventListener('change',()=>{state.dirty=true});
  state.ready=true;quality();resizeObserver=new ResizeObserver(resize);resizeObserver.observe($('preview'));
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);resizeObserver.disconnect();controls.dispose();if(mixer)mixer.stopAllAction();disposeAsset(loaded);floor.geometry.dispose();floor.material.dispose();grid.geometry.dispose();grid.material.dispose();renderer.dispose()},{once:true});
 }catch(error){gpuFailure('WebGL indisponível. Ative a aceleração gráfica e tente um navegador atualizado. '+error.message)}
}
for(const entry of assets.models){const option=new Option(entry.name,entry.id);$('model').add(option)}
$('model').addEventListener('change',e=>loadModel(e.target.value));
$('search').addEventListener('input',e=>{state.query=e.target.value;renderList()});
$('play').addEventListener('click',toggle);$('restart').addEventListener('click',()=>seek(0));
$('timeline').addEventListener('input',e=>{state.playing=false;seek(Number(e.target.value)/1000)});
$('speed').addEventListener('change',e=>{state.speed=Number(e.target.value);state.last=0});
$('loop').addEventListener('change',e=>{state.loop=e.target.checked});
$('camera-reset').addEventListener('click',()=>{state.autoCamera=false;$('auto-camera').checked=false;cameraReset()});
$('auto-camera').addEventListener('change',e=>{state.autoCamera=e.target.checked;state.dirty=true});
$('wireframe').addEventListener('change',e=>{state.wireframe=e.target.checked;applyWireframe();draw()});
$('shadows').addEventListener('change',e=>{renderer.shadowMap.enabled=e.target.checked;scene.traverse(o=>{if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.needsUpdate=true}});state.dirty=true;draw()});
$('quality').value=state.quality;$('quality').addEventListener('change',e=>{state.quality=e.target.value;quality();draw()});
$('download').addEventListener('click',()=>save(new Blob([originalSource],{type:'text/html;charset=utf-8'}),'HINARIA_MOTION_JAVA_PREVIEW.html'));
$('download-glb').addEventListener('click',()=>{if(modelBytes)save(new Blob([modelBytes],{type:'model/gltf-binary'}),'hinaria_'+state.model+'_animated.glb')});
$('capture').addEventListener('click',()=>{draw();renderer.domElement.toBlob(blob=>save(blob,'hinaria_'+state.model+'_'+state.id+'.png'),'image/png')});
document.addEventListener('keydown',e=>{
 if(e.ctrlKey||e.metaKey||e.altKey||/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(e.target.tagName))return;
 if(e.code==='Space'){e.preventDefault();toggle()}
 if(e.code==='ArrowLeft'||e.code==='ArrowRight'){e.preventDefault();state.playing=false;seek(state.progress+(e.code==='ArrowRight'?.05:-.05))}
});
document.addEventListener('visibilitychange',()=>{state.last=0});
window.HINARIA_JAVA_MOTION=Object.freeze({snapshot:()=>({
 ready:state.ready,loading:state.loading,error:state.error,model:state.model,clip:state.id,progress:state.progress,playing:state.playing,frames:state.frames,
 clips:loaded?loaded.animations.map(c=>({name:c.name,duration:c.duration,tracks:c.tracks.length})):[],
 camera:camera?camera.position.toArray():null,geometries:renderer?.info.memory.geometries||0,textures:renderer?.info.memory.textures||0,triangles:renderer?.info.render.triangles||0,
 transforms:loaded?(()=>{const result={};loaded.scene.traverse(o=>{if(/^HINARIA_(body|head|armR|armL|legR|legL)$/.test(o.name))result[o.name]=[...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()]});return result})():{}
})});
$('reduced-notice').hidden=state.playing;renderFilters();renderList();init();if(state.ready)loadModel(state.model);raf=requestAnimationFrame(tick);
})();
