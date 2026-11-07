/** Reproducible mobile fixture; reports rendering work, never phone FPS claims. */
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const project=resolve(process.argv[2]||fileURLToPath(new URL('../',import.meta.url)));
const output=resolve(process.argv[3]||'qa-evidence/mobile/benchmark.json');
const server=spawn(process.execPath,['server.js'],{cwd:project,env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
let browser;
try{
 const origin=await new Promise((done,fail)=>{let log='';const timer=setTimeout(()=>fail(new Error('Server startup timeout: '+log)),20000);server.once('error',fail);server.stderr.on('data',b=>log+=b);server.stdout.on('data',b=>{log+=b;const m=log.match(/Jogo: http:\/\/localhost:(\d+)\//);if(m){clearTimeout(timer);done('http://127.0.0.1:'+m[1])}})});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2.75,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await context.addInitScript(()=>{
  let seed=0x48494e41;Math.random=()=>{seed+=0x6D2B79F5;let n=seed;n=Math.imul(n^n>>>15,n|1);n^=n+Math.imul(n^n>>>7,n|61);return ((n^n>>>14)>>>0)/4294967296};
  Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>4});Object.defineProperty(navigator,'deviceMemory',{get:()=>4});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const start=performance.now();await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.gameState?.flow==='TITLE'&&!document.getElementById('play').disabled,null,{timeout:120000,polling:100});
 const titleReadyMs=Math.round(performance.now()-start);
 await page.locator('#play').click();await page.locator('#go').click();
 await page.waitForFunction(()=>gameState.cutsceneActive||gameState.t>.4,null,{timeout:60000,polling:100});
 if(await page.evaluate(()=>gameState.cutsceneActive))await page.locator('#cs-skip').click();
 await page.waitForFunction(()=>gameState.flow==='PLAYING'&&!gameState.cutsceneActive,null,{timeout:30000,polling:100});
 // The fixture pauses the real game through its UI, preserving an identical scene.
 await page.locator('#ui-hud-menu-btn').click();await page.waitForFunction(()=>gameState.flow==='PAUSED',null,{polling:100});
 const sample=await page.evaluate(async()=>{
  const s=gameState,r=s.renderer;const requestedRatio=r.getPixelRatio();r.setPixelRatio(1);r.setSize(844,390,false);s.camera.position.set(s.P.x+8,11,s.P.z+9);s.camera.lookAt(s.P.x,.7,s.P.z);s.camera.updateMatrixWorld();let prototype=s.scene;while(prototype&&!Object.prototype.hasOwnProperty.call(prototype,'updateMatrix'))prototype=Object.getPrototypeOf(prototype);
  const original=prototype.updateMatrix;let localUpdates=0;
  prototype.updateMatrix=function(...args){localUpdates++;return original.apply(this,args)};
  let objects=0,meshes=0,autoMatrices=0;s.scene.traverse(o=>{objects++;if(o.isMesh)meshes++;if(o.matrixAutoUpdate)autoMatrices++});
  const runs=[],locations=[];
  const gl=r.getContext();gl.finish();
  try{
   for(const [name,x,z] of [['village',13,15],['forest',15,35],['ruins',44,38]]){
    s.P.x=x;s.P.z=z;s.P.mesh.position.set(x,s.getHeightAt(x,z),z);
    const cx=Math.floor(x/16),cz=Math.floor(z/16);let active=0;
    for(const [key,group] of s.worldChunks){const [gx,gz]=key.split(',').map(Number);group.visible=Math.abs(gx-cx)<=1&&Math.abs(gz-cz)<=1;if(group.visible)active++}
    s.activeChunkCount=active;s.worldLightBudget?.update(x,z,performance.now()+1000);
    s.camera.position.set(x+8,11,z+9);s.camera.lookAt(x,.7,z);s.camera.updateMatrixWorld();
    const frames=[];
    for(let i=0;i<4;i++){
     localUpdates=0;const start=performance.now();r.render(s.scene,s.camera);const submitted=performance.now();gl.finish();
     frames.push({cpuSubmissionMs:submitted-start,completeFrameMs:performance.now()-start,localMatrixUpdates:localUpdates,calls:r.info.render.calls,triangles:r.info.render.triangles});
    }
    let pointLights=0,standardMeshes=0,lambertMeshes=0;s.scene.traverseVisible(o=>{if(o.isPointLight)pointLights++;if(o.isMesh){if(o.material?.isMeshStandardMaterial)standardMeshes++;if(o.material?.isMeshLambertMaterial)lambertMeshes++}});
    locations.push({name,position:[x,z],camera:s.camera.position.toArray(),activeChunks:active,pointLights,standardMeshes,lambertMeshes,programs:r.info.programs.length,frames});
   }
   runs.push(...locations[0].frames);
  }finally{prototype.updateMatrix=original}
  const hud=window.HINARIA_HUD_PIXI?.diagnostics?.()||{backend:window.HINARIA_HUD_PIXI?'pixi-webgl':'dom'};
  return {device:{viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,touch:navigator.maxTouchPoints,cores:navigator.hardwareConcurrency,memoryGiB:navigator.deviceMemory},position:[s.P.x,s.P.z],requestedRatio,camera:s.camera.position.toArray(),pixelRatio:r.getPixelRatio(),drawingBuffer:[r.domElement.width,r.domElement.height],scene:{objects,meshes,autoMatrices,geometries:r.info.memory.geometries,textures:r.info.memory.textures},hud,graphics:window.HINARIA_QA?.snapshot().graphics,boot:window.HINARIA_BOOT||null,locations,runs};
 });
 assert.deepEqual(errors,[]);assert.ok(sample.runs.every(r=>r.calls>0&&r.triangles>1000));
 const report={status:'PASS',environment:'Chromium headless / SwiftShader; emulated 844x390 touch device, deterministic random fixture, fixed DPR1, gl.finish measures complete GPU work in this software renderer; not a physical phone benchmark',titleReadyMs,...sample,errors};
 await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
 await page.screenshot({path:output.replace(/\.json$/,'.png'),fullPage:true});
 console.log(JSON.stringify({output,titleReadyMs,pixelRatio:sample.pixelRatio,scene:sample.scene,hud:sample.hud,locations:sample.locations.map(l=>({name:l.name,pointLights:l.pointLights,standard:l.standardMeshes,lambert:l.lambertMeshes,lastFrame:l.frames.at(-1)}))}));
}finally{if(browser)await browser.close();server.kill();if(server.exitCode===null)await once(server,'exit')}
