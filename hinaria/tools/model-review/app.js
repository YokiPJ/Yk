(function(){
'use strict';
const original='<!doctype html>\n'+document.documentElement.outerHTML,$=id=>document.getElementById(id);
const entries=[
 ['kn','Cavaleiro','Cavaleiro','sword_sun'],['pa','Paladino','Paladino','bow_moon'],['so','Feiticeiro','Feiticeiro','staff_star'],['dr','Druida','Druida','staff_nature'],
 ['blacksmith','Bram','Bram'],['sage','Yoki','Yoki'],['bandit','Bandido','Bandido'],['skeleton','Esqueleto','Esqueleto'],['troll','Troll','Troll'],['orc','Orc','Orc'],['troll_ancient','Troll Ancião','Troll_Anciao'],['orc_king','Rei dos Orcs','Rei_dos_Orcs']];
let renderer,scene,camera,controls,items=[],p=.45,playing=false,last=0,dirty=true;
const cacheNodes=r=>Array.from(new Set([r.unit,r.head,r.armR,r.armL,...r.legs,...(r.capes||[r.cape]),r.weapon,r.weapon?.userData?.crystal,r.supportTarget].filter(Boolean)));
function sample(root,Animator,pose){
 const rig=root.userData.r,nodes=cacheNodes(rig),animator=new Animator(rig),frames=[];
 const speed=pose==='walk'?2:pose==='run'?4.4:0;
 const duration=speed?Math.PI*2/(speed*2.7):pose==='attack'?.35:pose==='damage'?.42:pose==='death'?1.1:2.5;
 const entity={kind:'p',hp:100,mesh:root,x:0,z:0,spd:speed,at:0,fl:0};
 if(speed)for(let i=0;i<25;i++)animator.update(entity,.025);
 for(let i=0;i<=80;i++){
  const u=i/80;entity.at=pose==='attack'?Math.max(.0001,1-u):0;entity.fl=pose==='damage'?.18*(1-u):0;
  entity.hp=pose==='death'?0:100;entity.combatV2Dodge=pose==='dodge';entity.combatV2DodgeProgress=u;
  animator.update(entity,duration/80);
  frames.push(nodes.map(n=>({p:n.position.clone(),q:n.quaternion.clone(),s:n.scale.clone()})));
 }
 return {nodes,frames,duration};
}
function dispose(root){const gs=new Set(),ms=new Set();root.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)ms.add(m)});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose())}
function cameraReset(){controls.enableDamping=false;controls.update();camera.position.set(2.0,2.4,5.5);controls.target.set(0,1.1,0);controls.update();controls.enableDamping=true;dirty=true}
function rebuild(){
 try{
  for(const item of items){scene.remove(item.root);dispose(item.root)}items=[];renderer.renderLists.dispose();
  const entry=entries.find(e=>e[0]===$('model').value),pose=$('pose').value,compare=$('compare').checked,armor=Number($('armor').value),gear=$('gear').value;
  const options={scale:1};if(armor>=0)options.armor=armor;if(gear==='relic'&&entry[3])options.weaponModel=entry[3];
  if(compare){
   const before=ModelAudit.beforeBatch(ModelAudit.before[entry[2]]({scale:1}));
   if(gear==='axe')ModelAudit.beforeAxe(before,entry[0]==='sage'?'yo':entry[0]);
   before.position.x=-1.08;scene.add(before);items.push({root:before,...sample(before,ModelAudit.beforeAnimator,pose),side:'before'});
  }
  const after=ModelAudit.build(entry[0],options);
  if(gear==='axe')ModelAudit.afterAxe(after,entry[0]==='sage'?'yo':entry[0]);
  after.position.x=compare?1.08:0;scene.add(after);items.push({root:after,...sample(after,ModelAudit.afterAnimator,pose),side:'after'});
  for(const item of items)item.root.traverse(o=>{if(o.isMesh)o.material.wireframe=$('wire').checked});
  $('before-label').hidden=!compare;$('title').textContent=entry[1];$('status').textContent=pose==='attack'?'Empunhadura em movimento':$('pose').selectedOptions[0].textContent;
  $('error').hidden=true;dirty=true;draw();
 }catch(e){$('error').textContent=e.message;$('error').hidden=false;console.error(e)}
}
function draw(){
 for(const item of items){
  const f=p*80,i=Math.min(79,Math.floor(f)),a=f-i;
  item.nodes.forEach((n,k)=>{const from=item.frames[i][k],to=item.frames[i+1][k];n.position.lerpVectors(from.p,to.p,a);n.quaternion.slerpQuaternions(from.q,to.q,a);n.scale.lerpVectors(from.s,to.s,a)});
 }
 renderer.render(scene,camera);$('timeline').value=Math.round(p*1000);$('time').textContent=Math.round(p*100)+'%';dirty=false;
}
function resize(){const s=$('stage');renderer.setSize(s.clientWidth,s.clientHeight,false);camera.aspect=s.clientWidth/s.clientHeight;camera.updateProjectionMatrix();dirty=true}
function save(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}
try{
 renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.domElement.id='model-canvas';$('stage').append(renderer.domElement);
 scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#d4e8f5','#657567',2));
 const light=new THREE.DirectionalLight('#ffe2bb',3);light.position.set(4,6,5);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:20});light.shadow.normalBias=.008;scene.add(light);
 const fill=new THREE.DirectionalLight('#9bdfd4',1.3);fill.position.set(-4,3,-3);scene.add(fill);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(24,24),new THREE.MeshStandardMaterial({color:'#263e47',roughness:.9}));floor.rotation.x=-Math.PI/2;floor.position.y=-.014;floor.receiveShadow=true;scene.add(floor);
 const grid=new THREE.GridHelper(24,24,'#54797c','#3a5961');grid.position.y=-.009;grid.material.transparent=true;grid.material.opacity=.16;scene.add(grid);
 camera=new THREE.PerspectiveCamera(37,1,.05,60);controls=new ZeroOrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=3;controls.maxDistance=15;controls.maxPolarAngle=Math.PI*.49;controls.addEventListener('change',()=>dirty=true);
 for(const e of entries)$('model').add(new Option(e[1],e[0]));resize();cameraReset();rebuild();new ResizeObserver(resize).observe($('stage'));
 for(const id of ['model','pose','gear','armor','compare','wire'])$(id).addEventListener('change',rebuild);
 $('timeline').addEventListener('input',()=>{p=Number($('timeline').value)/1000;playing=false;$('play').textContent='Reproduzir';draw()});
 $('play').addEventListener('click',()=>{playing=!playing;last=0;$('play').textContent=playing?'Pausar':'Reproduzir'});
 $('reset').addEventListener('click',cameraReset);
 $('download').addEventListener('click',()=>save(new Blob([original],{type:'text/html;charset=utf-8'}),'HINARIA_MODELOS_ANTES_DEPOIS.html'));
 $('capture').addEventListener('click',()=>{draw();renderer.domElement.toBlob(b=>save(b,'HINARIA_modelos_'+$('model').value+'.png'))});
 function tick(now){
  if(!document.hidden){if(playing){const dt=last?Math.min((now-last)/1000,.1):0;p=(p+dt*Number($('speed').value)/(items[0]?.duration||1))%1;dirty=true}last=now;controls.update();if(dirty)draw()}else last=0;
  requestAnimationFrame(tick);
 }requestAnimationFrame(tick);
 window.HINARIA_MODEL_REVIEW=Object.freeze({snapshot:()=>({model:$('model').value,pose:$('pose').value,gear:$('gear').value,armor:$('armor').value,progress:p,error:$('error').hidden?null:$('error').textContent,models:items.length,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries})});
}catch(e){$('error').hidden=false;$('error').textContent='WebGL indisponível: '+e.message;console.error(e)}
})();
