import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
await mkdir(root+'verification',{recursive:true});
const manifest=JSON.parse(await readFile(root+'output/manifest.json','utf8'));
const server=createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(!['/HINARIA_MOTION_JAVA_PREVIEW.html','/verification/downloaded.html'].includes(pathname)){res.writeHead(404);res.end();return}
 try{const data=await readFile(root+pathname.slice(1));res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(data)}catch(_){res.writeHead(500);res.end()}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.HINARIA_CHROMIUM||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],consoleErrors=[],external=[],combinations=[];
const context=await browser.newContext({viewport:{width:1440,height:1040},reducedMotion:'reduce',acceptDownloads:true});
await context.route(/^https?:/,route=>{if(new URL(route.request().url()).origin===origin)return route.continue();external.push(route.request().url());return route.abort()});
const page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
const snapshot=()=>page.evaluate(()=>HINARIA_JAVA_MOTION.snapshot());
const seek=v=>page.locator('#timeline').evaluate((e,v)=>{e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}))},v);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function load(id){
 await page.locator('#model').selectOption(id);
 await page.waitForFunction(id=>{const s=window.HINARIA_JAVA_MOTION?.snapshot();return s?.ready&&!s.loading&&s.model===id},id,{timeout:30000});
}
try{
 await page.goto(origin+'/HINARIA_MOTION_JAVA_PREVIEW.html');
 await page.waitForFunction(()=>window.HINARIA_JAVA_MOTION?.snapshot().frames>0,null,{timeout:30000});
 assert.equal((await snapshot()).ready,true);assert.equal(await page.locator('#play-label').textContent(),'Reproduzir');
 assert.equal(await page.locator('#model option').count(),7);
 for(const model of manifest.models){
  await load(model.id);
  const imported=await snapshot();assert.equal(imported.clips.length,10);
  assert.ok(imported.clips.every(c=>c.tracks>=8));
  for(const clip of manifest.animations){
   await page.locator('[data-demo="'+clip.name+'"]').click();
   await seek(80);const a=await snapshot();
   await seek(610);const b=await snapshot();
   assert.equal(b.error,null,model.id+'/'+clip.name);
   assert.equal(Object.keys(b.transforms).length,6,'semantic rig nodes must be imported');
   assert.ok(Object.values(b.transforms).flat().every(Number.isFinite));
   assert.notDeepEqual(a.transforms,b.transforms,model.id+'/'+clip.name+' must actually animate the imported rig');
   assert.ok(b.triangles>1000);
   await seek(1000);await seek(0);assert.equal((await snapshot()).error,null);
   combinations.push({model:model.id,clip:clip.name,tracks:imported.clips.find(c=>c.name===clip.name).tracks,triangles:b.triangles});
  }
  console.log('PASS '+model.name+': 10 Java-generated GLB clips imported and sampled.');
 }
 await load('cavaleiro');await page.locator('[data-demo="Attack"]').click();await seek(500);
 await page.screenshot({path:root+'verification/cavaleiro-attack.png',fullPage:true});
 const still=sha(await page.locator('#scene-canvas').screenshot());await page.waitForTimeout(180);
 assert.equal(sha(await page.locator('#scene-canvas').screenshot()),still,'pause must freeze the imported clip');
 const baseline=await snapshot();
 await load('orc');await load('druida');await load('cavaleiro');await seek(500);
 assert.equal((await snapshot()).geometries,baseline.geometries,'GLB geometry leaked across model swaps');
 const originalCamera=(await snapshot()).camera,box=await page.locator('#scene-canvas').boundingBox();
 await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();
 await page.mouse.move(box.x+box.width*.65,box.y+box.height*.55,{steps:8});await page.mouse.up();await page.waitForTimeout(200);
 assert.ok((await snapshot()).camera.some((v,i)=>Math.abs(v-originalCamera[i])>.1));
 await page.locator('#camera-reset').click();assert.ok((await snapshot()).camera.every((v,i)=>Math.abs(v-originalCamera[i])<.001));
 await page.locator('#wireframe').check();await page.locator('#wireframe').uncheck();
 await page.locator('#shadows').uncheck();await page.locator('#shadows').check();
 await page.locator('#quality').selectOption('low');await page.locator('#quality').selectOption('medium');
 await page.getByRole('button',{name:'Combate',exact:true}).click();assert.equal(await page.locator('.demo-item').count(),5);
 await page.locator('#search').fill('inexistente_123');assert.equal(await page.locator('.empty').count(),1);
 await page.locator('#search').fill('');await page.getByRole('button',{name:'Todos',exact:true}).click();
 await page.locator('[data-demo="Hit"]').click();await page.locator('#restart').click();
 await page.locator('#speed').selectOption('.5');await page.locator('#play').click();
 await page.waitForFunction(()=>document.getElementById('play-label').textContent==='Reproduzir',null,{timeout:6000});
 assert.equal(await page.locator('#timeline').inputValue(),'1000','Hit plays once and holds final pose');
 await page.locator('[data-demo="Walk"]').click();await seek(950);await page.locator('#speed').selectOption('1');await page.locator('#play').click();
 await page.waitForFunction(()=>{const s=HINARIA_JAVA_MOTION.snapshot();return s.playing&&s.progress<.95},null,{timeout:6000});
 await page.locator('#play').click();
 const [glbDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#download-glb').click()]);
 await glbDownload.saveAs(root+'verification/downloaded-cavaleiro.glb');
 assert.equal(sha(await readFile(root+'verification/downloaded-cavaleiro.glb')),manifest.models[0].sha256,'exported GLB bytes must match Java output');
 const [htmlDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#download').click()]);
 await htmlDownload.saveAs(root+'verification/downloaded.html');
 const copy=await context.newPage();copy.on('pageerror',e=>errors.push(e.message));
 await copy.goto(origin+'/verification/downloaded.html');
 await copy.waitForFunction(()=>window.HINARIA_JAVA_MOTION?.snapshot().frames>0,null,{timeout:30000});
 assert.equal((await copy.evaluate(()=>HINARIA_JAVA_MOTION.snapshot())).clips.length,10);await copy.close();
 for(const [model,clip,p] of [['cavaleiro','Walk',350],['cavaleiro','Hit',220],['orc','Attack',450],['druida','Idle',350]]){
  await load(model);await page.locator('[data-demo="'+clip+'"]').click();await seek(p);
  await page.screenshot({path:root+'verification/'+model+'-'+clip+'.png',fullPage:true});
 }
 const mobileContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await mobileContext.route(/^https?:/,route=>{if(new URL(route.request().url()).origin===origin)return route.continue();external.push(route.request().url());return route.abort()});
 const mobile=await mobileContext.newPage();mobile.on('pageerror',e=>errors.push(e.message));
 await mobile.goto(origin+'/HINARIA_MOTION_JAVA_PREVIEW.html');
 await mobile.waitForFunction(()=>window.HINARIA_JAVA_MOTION?.snapshot().frames>0,null,{timeout:30000});
 assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.equal(await mobile.locator('#quality').inputValue(),'low');
 await mobile.screenshot({path:root+'verification/mobile.png',fullPage:true});await mobileContext.close();
 assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);assert.deepEqual(external,[]);
 await writeFile(root+'verification/browser-report.json',JSON.stringify({status:'PASS',browser:await browser.version(),renderer:'WebGL / SwiftShader test renderer',combinations,checks:['70 GLB model/clip pairs imported with official Three.js GLTFLoader','Finite transforms, animation changes and actual rendered triangles','Pause, seek, one-shot Hit and Walk loop','Model swaps release GPU geometries','Camera drag and reset','Wireframe, shadows, quality, search and category filters','Downloaded GLB equals Java output SHA-256','Offline HTML download and re-open','Mobile viewport 390x844; reduced motion starts paused','No page errors, console errors or external requests'],errors,consoleErrors,externalRequests:external},null,2)+'\n');
 console.log('PASS ALL: 70 model/clip combinations, offline preview, Java GLB download, camera, mobile.');
}finally{await browser.close();await new Promise(r=>server.close(r))}
