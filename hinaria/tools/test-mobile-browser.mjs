/** Mobile runtime checks against the packaged game, with real browser input. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=resolve(process.env.HINARIA_MOBILE_ARTIFACTS||root+'qa-evidence/mobile');await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.js','--offline'],{cwd:root,env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
let browser;
try{
 const origin=await new Promise((done,fail)=>{let log='';const timer=setTimeout(()=>fail(new Error('Servidor não iniciou')),15000);server.once('error',fail);server.stdout.on('data',data=>{log+=data;const m=log.match(/Jogo: http:\/\/localhost:(\d+)\//);if(m){clearTimeout(timer);done('http://127.0.0.1:'+m[1])}})});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2.75,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await context.addInitScript(()=>{Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>4});Object.defineProperty(navigator,'deviceMemory',{get:()=>4});});
 const page=await context.newPage(),errors=[],external=[];
 page.on('pageerror',error=>errors.push(error.message));
 await context.route(/^https?:/,route=>{if(new URL(route.request().url()).origin===origin)return route.continue();external.push(route.request().url());return route.abort()});
 const ready=async()=>page.waitForFunction(()=>window.gameState?.flow==='TITLE'&&!document.getElementById('play').disabled,null,{timeout:90000,polling:100});
 await page.goto(origin);await ready();
 assert.equal((await page.evaluate(()=>HINARIA_QA.snapshot().graphics)).frameLimit,30);
 await page.locator('#title-settings').click();await page.selectOption('#perf-frame-limit','60');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('hinaria-v79-quality')).frameLimit),'60');
 await page.reload();await ready();assert.equal((await page.evaluate(()=>HINARIA_QA.snapshot().graphics)).frameLimit,60);
 await page.locator('#title-settings').click();await page.selectOption('#perf-frame-limit','auto');await page.locator('#perf-close').click();
 await page.locator('#play').click();await page.locator('#go').click();
 await page.waitForFunction(()=>gameState.cutsceneActive||gameState.t>.4,null,{timeout:60000,polling:100});
 if(await page.evaluate(()=>gameState.cutsceneActive))await page.locator('#cs-skip').click();
 await page.waitForFunction(()=>gameState.flow==='PLAYING'&&!gameState.cutsceneActive,null,{timeout:30000,polling:100});
 await page.waitForFunction(()=>window.HINARIA_HUD_PIXI?.diagnostics?.().backend==='canvas2d',null,{timeout:15000,polling:100});
 const layouts=[];
 for(const [width,height] of [[390,844],[844,390],[360,800]]){
   await page.setViewportSize({width,height});
   await page.waitForFunction(()=>{const hud=window.HINARIA_HUD_PIXI?.diagnostics?.();return hud&&hud.width===Math.round(innerWidth)&&hud.height===Math.round(innerHeight)},null,{timeout:15000,polling:100});
   const state=await page.evaluate(()=>{
     const hud=HINARIA_HUD_PIXI.diagnostics(),r=gameState.renderer;
     return {viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth,hud,
       drawingPixels:r.domElement.width*r.domElement.height,graphics:HINARIA_QA.snapshot().graphics,
       gameCanvases:document.querySelectorAll('#wrap canvas').length};
   });
   assert.equal(state.overflow,false);assert.equal(state.gameCanvases,1);assert.equal(state.hud.backend,'canvas2d');
   assert.ok(state.hud.width*state.hud.height<=state.viewport[0]*state.viewport[1],JSON.stringify({hud:state.hud,viewport:state.viewport}));
   assert.ok(state.drawingPixels<=state.graphics.deviceProfile.pixelBudget,'drawing buffer respects the current mobile pixel budget');assert.equal(state.graphics.frameLimit,30);
   const joy=await page.locator('#joy').boundingBox(),dock=await page.locator('#ui-combat-dock').boundingBox();
   assert.ok(joy&&dock);assert.ok(joy.x+joy.width<=dock.x||dock.x+dock.width<=joy.x||joy.y+joy.height<=dock.y||dock.y+dock.height<=joy.y,'thumb controls must not overlap');
   await page.screenshot({path:out+`/mobile-${width}x${height}.png`,fullPage:true});layouts.push(state);
 }
 // A real held touch must be cleared if the viewport/orientation changes.
 const cdp=await context.newCDPSession(page),joy=await page.locator('#joy').boundingBox();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:joy.x+joy.width*.85,y:joy.y+joy.height*.5,id:1}]});
 assert.ok(Math.abs(await page.evaluate(()=>gameState.jx))>.2);
 await page.setViewportSize({width:800,height:360});
 await page.waitForFunction(()=>gameState.jx===0&&gameState.jz===0,null,{polling:100});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 await writeFile(out+'/results.json',JSON.stringify({status:'PASS',browser:await browser.version(),engine:'SwiftShader; device emulation, not a physical Android phone',checks:['mobile Canvas2D HUD','one game renderer','pixel budget on three layouts','30/60 preference persistence','automatic economy preset','thumb controls do not overlap','held touch cleared on orientation change','no external runtime requests'],layouts,errors,external},null,2)+'\n');
 console.log('PASS mobile: Canvas2D HUD, bounded pixels, 30/60 settings persistence, 3 layouts, touch reset, offline.');
}finally{if(browser)await browser.close();server.kill();if(server.exitCode===null)await once(server,'exit')}
