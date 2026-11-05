import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('.',import.meta.url)).replace(/[\\/]$/,'');await mkdir(root+'/screenshots',{recursive:true});
const server=createServer(async(req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(await readFile(root+'/HINARIA_MODELOS_ANTES_DEPOIS.html'))});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.HINARIA_CHROMIUM||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],external=[],results=[];
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 await context.route(/^https?:/,route=>{if(new URL(route.request().url()).origin===origin)return route.continue();external.push(route.request().url());return route.abort()});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto(origin);
 await page.waitForFunction(()=>window.HINARIA_MODEL_REVIEW?.snapshot().models===2);
 const models=await page.locator('#model option').evaluateAll(n=>n.map(o=>o.value));
 const poses=await page.locator('#pose option').evaluateAll(n=>n.map(o=>o.value));
 const seek=p=>page.locator('#timeline').evaluate((n,v)=>{n.value=String(v);n.dispatchEvent(new Event('input',{bubbles:true}))},p);
 for(const model of models){
  await page.selectOption('#model',model);
  for(const pose of poses){
   await page.selectOption('#pose',pose);await seek(350);
   const state=await page.evaluate(()=>HINARIA_MODEL_REVIEW.snapshot());
   assert.equal(state.error,null,model+'/'+pose);assert.ok(state.triangles>1000);
   results.push({model,pose,triangles:state.triangles});
  }
  console.log('PASS review '+model+' · 7 poses before/after');
 }
 for(const id of ['kn','pa','so','dr','sage','orc_king']){
  await page.selectOption('#model',id);await page.selectOption('#pose','attack');await seek(450);
  await page.screenshot({path:root+'/screenshots/'+id+'.png',fullPage:true});
 }
 for(const gear of ['relic','axe'])for(const armor of ['0','1','2','3']){
  await page.selectOption('#model','kn');await page.selectOption('#gear',gear);await page.selectOption('#armor',armor);await seek(500);
  assert.equal(await page.locator('#error').isVisible(),false);
 }
 await page.selectOption('#gear','default');await page.selectOption('#armor','-1');await page.selectOption('#model','pa');await page.selectOption('#pose','idle');await seek(500);
 await page.screenshot({path:root+'/screenshots/pa-idle.png',fullPage:true});
 await page.locator('#compare').uncheck();assert.equal((await page.evaluate(()=>HINARIA_MODEL_REVIEW.snapshot())).models,1);
 await page.locator('#wire').check();await page.locator('#wire').uncheck();
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#download').click()]);
 await download.saveAs(root+'/downloaded.html');
 assert.ok((await readFile(root+'/downloaded.html','utf8')).includes('window.ModelAudit='));
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(origin);await mobile.waitForFunction(()=>window.HINARIA_MODEL_REVIEW?.snapshot().models===2);
 assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await mobile.screenshot({path:root+'/screenshots/mobile.png',fullPage:true});await mobile.close();
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 const sha=createHash('sha256').update(await readFile(root+'/HINARIA_MODELOS_ANTES_DEPOIS.html')).digest('hex');
 await writeFile(root+'/report.json',JSON.stringify({status:'PASS',browser:await browser.version(),results,combinations:results.length,checks:['12 models x 7 poses side by side','Equipped relic/Replay axe and four armor tiers','Single model and wireframe modes','HTML download','Mobile viewport without page overflow','No JavaScript errors or external requests'],errors,externalRequests:external,htmlSha256:sha},null,2)+'\n');
 console.log('PASS review: 84 model/pose pairs, 8 loadout/armor pairs, mobile, offline download.');
}finally{await browser.close();await new Promise(r=>server.close(r))}
