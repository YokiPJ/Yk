/** Validate the actual classic Android bundle; current Chromium is not Chrome 80. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {stripInsetDeclarations} from './legacy-css.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=resolve(process.env.HINARIA_BUNDLE_ARTIFACTS||root+'qa-evidence/bundle-browser.json');
const build=JSON.parse(await readFile(root+'www/build-info.json','utf8'));
const html=await readFile(root+'www/index.html','utf8');
assert.equal(build.target,'mobile');assert.equal(build.compatibility.format,'iife');
assert.ok(!/<script[^>]+type=["'](?:module|importmap)/i.test(html));
assert.match(html,/<script defer src="game\.js"><\/script>/);
const server=spawn(process.execPath,['server.js','--offline'],{cwd:root,env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
let browser,activePage;
const results=[];
try{
 const origin=await new Promise((done,fail)=>{
  let log='';const timeout=setTimeout(()=>fail(new Error('Server startup timeout')),15000);
  server.once('error',fail);server.stdout.on('data',chunk=>{log+=chunk;const match=log.match(/Jogo: http:\/\/localhost:(\d+)\//);if(match){clearTimeout(timeout);done('http://127.0.0.1:'+match[1]);}});
 });
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const webgl1 of [false,true]){
  const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2.75,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await context.addInitScript(forceWebGL1=>{
   Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>4});
   Object.defineProperty(navigator,'deviceMemory',{get:()=>4});
   if(forceWebGL1){delete Element.prototype.replaceChildren;delete DocumentFragment.prototype.replaceChildren;}
   if(forceWebGL1){const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:original.call(this,type,...args);};}
  },webgl1);
  const external=[],blocked=[],scripts=[],errors=[],sfx=[];let ignoredInsets=0;
  await context.route(/^https?:/,async route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.origin!==origin){external.push(url.href);return route.abort('blockedbyclient');}
   if(request.resourceType()==='script'){
    scripts.push(url.pathname);
    if(url.pathname!=='/game.js'){blocked.push(url.pathname);return route.abort('blockedbyclient');}
   }
   if(webgl1&&['document','stylesheet','script'].includes(request.resourceType())){
    const response=await route.fetch(),legacy=stripInsetDeclarations(await response.text());
    ignoredInsets+=legacy.removed;
    return route.fulfill({response,body:legacy.source});
   }
   return route.continue();
  });
  const page=await context.newPage();activePage=page;
  page.on('console',async message=>{if(message.type()==='error'){errors.push(message.text());for(const arg of message.args())console.error('Browser error',await arg.evaluate(value=>value?.stack||String(value)).catch(()=>message.text()));}});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{
   const url=new URL(response.url());
   if(url.pathname.startsWith('/assets/audio/sfx/'))sfx.push({path:url.pathname,status:response.status()});
  });
  const start=performance.now();await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.HINARIA_BOOT?.state==='failed'||window.HINARIA_BOOT?.state==='ready'&&window.gameState?.flow==='TITLE'&&!document.getElementById('play').disabled,null,{timeout:90000,polling:100});
  assert.equal(await page.evaluate(()=>HINARIA_BOOT.state),'ready');
  const title=await page.evaluate(()=>({boot:HINARIA_BOOT,graphics:HINARIA_QA.snapshot().graphics,titleBackend:document.getElementById('cover').dataset.titleBackend,gameCanvases:document.querySelectorAll('#wrap canvas').length,titleCanvases:document.querySelectorAll('#title-three').length,webglVersion:gameState.renderer.getContext().getParameter(gameState.renderer.getContext().VERSION)}));
  assert.equal(title.titleBackend,'css');assert.equal(title.gameCanvases,1);assert.equal(title.titleCanvases,0);
  assert.equal(title.graphics.frameLimit,30);assert.equal(title.graphics.deviceProfile.mobile,true);
  if(webgl1)assert.match(title.webglVersion,/WebGL 1\.0/);
  if(webgl1){
   assert.ok(ignoredInsets>=20,'legacy fixture ignores real inset declarations');
   const fullViewport=async selector=>{
    const rect=await page.locator(selector).boundingBox(),size=page.viewportSize();
    assert.ok(rect&&Math.abs(rect.x)<1&&Math.abs(rect.y)<1&&Math.abs(rect.width-size.width)<1&&Math.abs(rect.height-size.height)<1,selector+' must cover the viewport without inset');
   };
   await fullViewport('#cover');
   await page.locator('#title-settings').click();await page.locator('#perf-panel').waitFor({state:'visible'});
   await fullViewport('#upgrade-settings-shade');await page.locator('#perf-close').click();
  }
  const readyMs=Math.round(performance.now()-start);
  await page.locator('#play').click();await page.waitForFunction(()=>gameState.flow==='CHARACTER_CREATION',null,{polling:100});
  await page.locator('#go').click();
  await page.waitForFunction(()=>gameState.cutsceneActive||gameState.t>.4,null,{timeout:60000,polling:100});
  if(await page.evaluate(()=>gameState.cutsceneActive))await page.locator('#cs-skip').click();
  await page.waitForFunction(()=>gameState.flow==='PLAYING'&&!gameState.cutsceneActive,null,{timeout:45000,polling:100});
  await page.waitForFunction(()=>HINARIA_HUD_PIXI?.diagnostics?.().backend==='canvas2d',null,{timeout:15000,polling:100});
  // Real pointer input warms the original SFX system; all sixteen files must load.
  await page.waitForFunction(()=>performance.getEntriesByType('resource').filter(entry=>new URL(entry.name).pathname.startsWith('/assets/audio/sfx/')).length===16,null,{timeout:15000,polling:100});
  assert.equal(new Set(sfx.map(item=>item.path)).size,16);assert.ok(sfx.every(item=>item.status===200));
  assert.deepEqual(external,[]);assert.deepEqual(blocked,[]);assert.deepEqual(errors,[]);assert.deepEqual([...new Set(scripts)],['/game.js']);
  results.push({name:webgl1?'forced-webgl1':'default-webgl',status:'PASS',readyMs,webglVersion:title.webglVersion,titleBackend:title.titleBackend,gameCanvases:title.gameCanvases,frameLimit:title.graphics.frameLimit,boot:title.boot,legacyCompatibility:{replaceChildrenRemoved:webgl1,ignoredInsetDeclarations:ignoredInsets},scripts:[...new Set(scripts)],sfx,errors,external,blocked});
  console.log('PASS classic bundle '+results.at(-1).name+' · title/create/play · CSS title · 16 local SFX');
  await context.close();
 }
 await mkdir(dirname(output),{recursive:true});
 await writeFile(output,JSON.stringify({status:'PASS',browser:await browser.version(),environment:'Current Chromium/SwiftShader with touch and WebGL1 fault injection; not a physical Android or Chrome 80 execution test',build,checks:['Classic IIFE entrypoint without import maps or module scripts','Runtime rejects every script except game.js','Default WebGL and forced WebGL1 boot/title/character creation/play','One game renderer and CSS mobile title','Automatic 30 FPS mobile profile','16 original local SFX files HTTP 200','No external runtime request or unhandled JavaScript error'],results},null,2)+'\n');
}catch(error){
 const diagnostic=await activePage?.evaluate(()=>({flow:window.gameState?.flow,t:window.gameState?.t,ccOpen:window.gameState?.ccOpen,pauseRequested:window.gameState?.pauseRequested,hidden:document.hidden,diagnostics:window.HINARIA_QA?.snapshot?.(),boot:window.HINARIA_BOOT})).catch(()=>null);
 console.error('Bundle test failure diagnostic',diagnostic);
 await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify({status:'FAIL',build,results,error:error.stack,diagnostic},null,2)+'\n');
 throw error;
}finally{if(browser)await browser.close();server.kill();if(server.exitCode===null)await once(server,'exit');}
