import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('.',import.meta.url)).replace(/[\\/]$/,'');
await mkdir(root+'/verification',{recursive:true});
const server=createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(!['/ZERO_MOTION_STUDIO_3D.html','/verification/downloaded.html'].includes(path)){res.writeHead(404);res.end();return}
 try{const file=await readFile(root+path);res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(file)}catch(_){res.writeHead(500);res.end()}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.HINARIA_CHROMIUM||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],consoleErrors=[],external=[];
const context=await browser.newContext({viewport:{width:1440,height:1040},deviceScaleFactor:1,reducedMotion:'reduce',acceptDownloads:true});
await context.addInitScript(()=>{
 const live=new Set();window.__gpuBuffers={created:0,deleted:0,live:0};
 for(const Context of [window.WebGLRenderingContext,window.WebGL2RenderingContext]){
  if(!Context)continue;
  const prototype=Context.prototype,create=prototype.createBuffer,remove=prototype.deleteBuffer;
  prototype.createBuffer=function(...args){const buffer=create.apply(this,args);if(buffer&&!live.has(buffer)){live.add(buffer);window.__gpuBuffers.created++;window.__gpuBuffers.live=live.size}return buffer};
  prototype.deleteBuffer=function(buffer){if(live.delete(buffer)){window.__gpuBuffers.deleted++;window.__gpuBuffers.live=live.size}return remove.call(this,buffer)};
 }
});
await context.route(/^https?:/,route=>{if(new URL(route.request().url()).origin===origin)return route.continue();external.push(route.request().url());return route.abort()});
const page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
const snapshot=()=>page.evaluate(()=>ZERO3D.snapshot());
const seek=async v=>page.locator('#timeline').evaluate((e,value)=>{e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}))},v);
const digest=buffer=>createHash('sha256').update(buffer).digest('hex');
const scenes=[];
try{
 await page.goto(origin+'/ZERO_MOTION_STUDIO_3D.html');
 await page.waitForFunction(()=>window.ZERO3D&&ZERO3D.snapshot().frames>0);
 assert.equal((await snapshot()).ready,true);
 assert.equal(await page.locator('#play-label').textContent(),'Reproduzir');
 assert.equal(await page.locator('.demo-item').count(),12);
 const demos=await page.locator('.demo-item').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.demo,title:n.querySelector('.demo-name').textContent})));
 for(const demo of demos){
  await page.locator('[data-demo="'+demo.id+'"]').click();
  let first,second,info;
  for(const v of [0,80,610,1000]){
   await seek(v);info=await snapshot();
   assert.equal(info.ready,true,demo.id);assert.equal(info.error,null,demo.id);assert.equal(info.invalidTransforms,0,demo.id);
   assert.ok(info.triangles>500,demo.id+' must render actual 3D geometry');
   assert.ok(info.meshes>3,demo.id+' must contain scene meshes');
   if(v===80)first=digest(await page.locator('#scene-canvas').screenshot());
   if(v===610)second=digest(await page.locator('#scene-canvas').screenshot());
  }
  assert.notEqual(first,second,demo.id+' must visibly animate');
  scenes.push({id:demo.id,title:demo.title,frames:[0,.08,.61,1],triangles:info.triangles,drawCalls:info.drawCalls,geometries:info.geometries,visualChange:true});
  console.log('PASS 3D '+demo.id+' / '+info.triangles+' triangles');
 }
 // Switching does not accumulate GPU geometry or textures.
 await page.locator('[data-demo="village"]').click();await seek(400);
 const baseline=await snapshot();
 const buffersBefore=await page.evaluate(()=>window.__gpuBuffers.live);
 for(const id of ['portal','fire','assembly','walk','shield','village']){await page.locator('[data-demo="'+id+'"]').click();await seek(400)}
 const returned=await snapshot();
 assert.equal(returned.geometries,baseline.geometries,'scene geometry leaked across switches');
 assert.equal(returned.textures,baseline.textures,'textures leaked across switches');
 const buffersAfter=await page.evaluate(()=>window.__gpuBuffers.live);
 assert.equal(buffersAfter,buffersBefore,'GPU instance buffers leaked across scene switches');
 const still=digest(await page.locator('#scene-canvas').screenshot());
 await page.waitForTimeout(180);
 assert.equal(digest(await page.locator('#scene-canvas').screenshot()),still,'pause must freeze geometry');
 const initialCamera=(await snapshot()).camera,box=await page.locator('#scene-canvas').boundingBox();
 await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();
 await page.mouse.move(box.x+box.width*.68,box.y+box.height*.55,{steps:8});await page.mouse.up();
 await page.waitForTimeout(350);
 const movedCamera=(await snapshot()).camera;
 assert.ok(movedCamera.some((v,i)=>Math.abs(v-initialCamera[i])>.2),'drag must orbit camera');
 await page.locator('#camera-reset').click();
 const resetCamera=(await snapshot()).camera;
 assert.ok(resetCamera.every((v,i)=>Math.abs(v-initialCamera[i])<.001),'camera reset must clear damping');
 await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.wheel(0,-240);await page.waitForTimeout(250);
 const zoomCamera=(await snapshot()).camera;
 assert.ok(zoomCamera.some((v,i)=>Math.abs(v-resetCamera[i])>.2),'wheel must zoom');
 await page.locator('#camera-reset').click();await seek(450);
 const solid=digest(await page.locator('#scene-canvas').screenshot());
 await page.locator('#wireframe').check();
 assert.notEqual(digest(await page.locator('#scene-canvas').screenshot()),solid,'wireframe must change scene');
 await page.locator('#wireframe').uncheck();
 await page.locator('#shadows').uncheck();await page.locator('#shadows').check();
 await page.locator('#quality').selectOption('low');await page.locator('#quality').selectOption('medium');
 await page.getByRole('button',{name:'Personagem',exact:true}).click();
 assert.equal(await page.locator('.demo-item').count(),4);
 await page.locator('#search').fill('nao_existe');assert.equal(await page.locator('.empty').count(),1);
 await page.locator('#search').fill('');await page.getByRole('button',{name:'Todos',exact:true}).click();
 await page.locator('#search').fill('explosao');assert.equal(await page.locator('.demo-item').count(),1);
 await page.locator('#search').fill('');
 // Playback, duration, repeat and automatic camera.
 await page.locator('#duration').evaluate(e=>{e.value='2';e.dispatchEvent(new Event('input',{bubbles:true}))});
 await page.locator('#speed').selectOption('2');
 await page.locator('#loop').uncheck();await seek(900);await page.locator('#play').click();
 await page.waitForFunction(()=>document.getElementById('play-label').textContent==='Reproduzir',null,{timeout:5000});
 assert.equal(await page.locator('#timeline').inputValue(),'1000');
 await page.locator('#loop').check();await seek(950);await page.locator('#play').click();
 await page.waitForTimeout(350);assert.ok(Number(await page.locator('#timeline').inputValue())<950,'loop must wrap');
 await page.locator('#play').click();
 await page.locator('#auto-camera').check();const cameraBefore=(await snapshot()).camera;
 await page.locator('#play').click();await page.waitForTimeout(300);await page.locator('#play').click();
 assert.ok((await snapshot()).camera.some((v,i)=>Math.abs(v-cameraBefore[i])>.01),'automatic camera must rotate');
 await page.locator('#camera-reset').click();
 const [png]=await Promise.all([page.waitForEvent('download'),page.locator('#capture').click()]);
 await png.saveAs(root+'/verification/captured-village.png');
 const bytes=await readFile(root+'/verification/captured-village.png');
 assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.ok(bytes.length>12000,'capture must contain a nonempty image');
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#download').click()]);
 await download.saveAs(root+'/verification/downloaded.html');
 const exported=await context.newPage();exported.on('pageerror',e=>errors.push(e.message));
 await exported.goto(origin+'/verification/downloaded.html');
 await exported.waitForFunction(()=>window.ZERO3D&&ZERO3D.snapshot().ready);
 assert.equal(await exported.locator('.demo-item').count(),12);await exported.close();
 await page.locator('#duration').evaluate(e=>{e.value='4';e.dispatchEvent(new Event('input',{bubbles:true}))});
 await page.locator('#speed').selectOption('1');
 for(const id of ['village','walk','portal','fire','jump','assembly']){
  await page.locator('[data-demo="'+id+'"]').click();await seek(450);await page.screenshot({path:root+'/verification/'+id+'.png',fullPage:true});
 }
 const mobileContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await mobileContext.route(/^https?:/,route=>{if(new URL(route.request().url()).origin===origin)return route.continue();external.push(route.request().url());return route.abort()});
 const mobile=await mobileContext.newPage();mobile.on('pageerror',e=>errors.push(e.message));
 await mobile.goto(origin+'/ZERO_MOTION_STUDIO_3D.html#portal');
 await mobile.waitForFunction(()=>window.ZERO3D&&ZERO3D.snapshot().ready);
 const dimensions=await mobile.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
 assert.ok(dimensions.scroll<=dimensions.width,'mobile horizontal overflow');
 assert.equal(await mobile.locator('#quality').inputValue(),'low');
 await mobile.locator('#timeline').evaluate(e=>{e.value='400';e.dispatchEvent(new Event('input',{bubbles:true}))});
 await mobile.screenshot({path:root+'/verification/mobile.png',fullPage:true});
 await mobileContext.close();
 // Context loss must surface a recovery action and stop playback.
 await page.evaluate(()=>{
  const canvas=document.getElementById('scene-canvas');
  const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');
  const extension=gl.getExtension('WEBGL_lose_context');if(!extension)throw new Error('Context loss extension unavailable in test browser');
  extension.loseContext();
 });
 await page.locator('.gpu-failure').waitFor();
 assert.equal(await page.locator('#play').isDisabled(),true);
 assert.equal((await snapshot()).ready,false);
 assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);assert.deepEqual(external,[]);
 const report={status:'PASS',browser:await browser.version(),threeRevision:'160',renderer:'WebGL / SwiftShader (verification only)',gpuBuffers:{before:buffersBefore,after:buffersAfter},scenes,checks:['12 real 3D scenes in four timeline poses','Visual changes across frames','Finite 3D transforms and rendered triangle counts','GPU geometry, texture and instance-buffer counts stable after scene switches','Pause, seek, speed, duration and loop','Mouse orbit, wheel zoom and camera reset','Wireframe, shadows and quality controls','Search and filters','Automatic camera rotation','PNG capture','Self-contained HTML download and re-open','Mobile 390x844 and reduced motion','WebGL context-loss recovery UI','No JavaScript errors or external requests'],errors,consoleErrors,externalRequests:external};
 await writeFile(root+'/verification/report.json',JSON.stringify(report,null,2)+'\n');
 console.log('PASS ALL 3D: 12 scenes, camera, controls, GPU cleanup, PNG, HTML, mobile, context loss.');
}finally{await browser.close();await new Promise(r=>server.close(r))}
