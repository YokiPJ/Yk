/** Real WebGL fault injection: context loss/recovery plus an honest no-GPU boot. */
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=process.env.HINARIA_CONTEXT_ARTIFACTS||'/tmp/hinaria-context';mkdirSync(out,{recursive:true});
const port=Number(process.env.HINARIA_TEST_PORT||8098),base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['server.js',...(process.argv.includes('--offline')?['--offline']:[])],{cwd:root,env:{...process.env,PORT:String(port)},stdio:'ignore'});
let browser;const results=[];
try {
  for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:720},reducedMotion:'reduce'});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.gameState?.flow==='TITLE'&&!document.getElementById('play').disabled,null,{timeout:45000});
  await page.locator('#play').click();await page.locator('#go').click();
  await page.waitForFunction(()=>window.gameState.cutsceneActive||window.gameState.t>.4,null,{timeout:30000});
  if(await page.evaluate(()=>window.gameState.cutsceneActive))await page.locator('#cs-skip').click();
  await page.waitForFunction(()=>window.gameState.flow==='PLAYING');
  await page.waitForFunction(()=>window.HINARIA_QA.snapshot().graphics.frameTiming.samples>0);
  const measured=await page.evaluate(()=>window.HINARIA_QA.snapshot());
  assert.equal(await page.evaluate(()=>{const gl=gameState.renderer.getContext();window.__lost=gl.getExtension('WEBGL_lose_context');if(!window.__lost)return false;window.__lost.loseContext();return true;}),true);
  await page.waitForFunction(()=>gameState.flow==='PAUSED'&&HINARIA_QA.snapshot().graphics.contextState==='lost');
  await page.locator('#hinaria-context-notice').waitFor({state:'visible'});
  const time=await page.evaluate(()=>gameState.t);await page.waitForTimeout(500);
  assert.equal(await page.evaluate(()=>gameState.t),time);
  await page.evaluate(()=>window.__lost.restoreContext());
  await page.waitForFunction(()=>HINARIA_QA.snapshot().graphics.contextState==='restored',null,{timeout:30000});
  await page.getByRole('button',{name:'Retomar aventura',exact:true}).click();
  await page.waitForFunction(()=>gameState.flow==='PLAYING'&&!document.getElementById('hinaria-context-notice'));
  await page.waitForFunction(()=>gameState.renderer.info.render.calls>0);
  assert.deepEqual(errors,[]);
  await page.screenshot({path:join(out,'context-restored.png')});
  results.push({name:'real context loss/restore/resume',status:'passed',measuredBeforeFault:measured,errors});
  await page.close();
  const fallback=await browser.newPage();const fallbackErrors=[];fallback.on('pageerror',e=>fallbackErrors.push(e.message));
  await fallback.addInitScript(()=>{const old=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:old.call(this,type,...args);};});
  await fallback.goto(base,{waitUntil:'domcontentloaded'});
  await fallback.locator('#boot-retry').waitFor({state:'visible'});
  assert.match(await fallback.locator('#title-status').innerText(),/WebGL|gráfica|3D/i);
  assert.equal(await fallback.locator('#play').isVisible(),false);
  assert.deepEqual(fallbackErrors,[]);
  await fallback.screenshot({path:join(out,'no-webgl-boot.png')});
  results.push({name:'no WebGL honest boot failure with explicit retry',status:'passed',expectedConsole:'WebGL renderer initialization error',errors:fallbackErrors});
  console.log('PASS 2/2 real GPU fault scenarios: pause/restore/resume and no-WebGL boot with retry.');
} catch(error){results.push({name:'runner',status:'failed',error:error.stack});console.error(error);process.exitCode=1;}
finally{writeFileSync(join(out,'results.json'),JSON.stringify({executedAt:new Date().toISOString(),renderer:'Chromium SwiftShader software; not Android',results},null,2));await browser?.close();server.kill('SIGTERM');}
