/** Integration with real world state. Explicit fixtures teleport the player and
 * reduce one boss to 1 HP; actions, damage, rewards, quests and house UI stay real. */
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=process.env.HINARIA_GAMEPLAY_ARTIFACTS||'/tmp/hinaria-gameplay';mkdirSync(out,{recursive:true});
const port=Number(process.env.HINARIA_TEST_PORT||8096),base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['server.js',...(process.argv.includes('--offline')?['--offline']:[])],{cwd:root,env:{...process.env,PORT:String(port)},stdio:'ignore'});
let browser;const results=[];
async function play(page){
  await page.waitForFunction(()=>window.gameState?.flow==='TITLE',null,{timeout:45000});
  await page.locator('#title-settings').click();await page.locator('#perf-quality').selectOption('low');await page.locator('#perf-close').click();
  await page.locator('#play').click();await page.locator('#go').click();
  await page.waitForFunction(()=>gameState.cutsceneActive||gameState.t>.4,null,{timeout:45000});
  if(await page.evaluate(()=>gameState.cutsceneActive))await page.locator('#cs-skip').click();
  await page.waitForFunction(()=>gameState.flow==='PLAYING');
}
try{
  for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:900,height:600},reducedMotion:'reduce'}),errors=[];
  const wait=page.waitForFunction.bind(page);page.waitForFunction=(fn,arg,opt={})=>wait(fn,arg,{polling:100,...opt});
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(base,{waitUntil:'domcontentloaded'});await play(page);
  // Fixture: put the player within interaction radius of the actual Bram entity.
  await page.evaluate(()=>{const s=gameState,p=s.P,n=s.N;p.x=n.x-.8;p.z=n.z;p.tx=Math.round(p.x);p.tz=Math.round(p.z);p.path=[];p.mesh.position.set(p.x,s.getHeightAt(p.x,p.z),p.z);s.L.set(p.x,0,p.z);});
  await page.keyboard.press('f');await page.locator('#dialog-panel').waitFor({state:'visible'});
  assert.match(await page.locator('#dialog-title').innerText(),/Bram/i);
  await page.screenshot({path:join(out,'bram-dialogue.png')});
  const options=await page.locator('#dialog-options button').allTextContents();
  const quests=page.locator('#dialog-options button').filter({hasText:/miss|tarefa|ajud/i}).first();
  if(await quests.count()){await quests.click();const accept=page.locator('#dialog-options button').filter({hasText:/aceit|sim/i}).first();if(await accept.count())await accept.click();}
  const questState=await page.evaluate(async()=>JSON.parse((await import('./src/quest/quests.js')).Q.serialize()));
  assert.ok(Object.keys(questState.q).length>0,'NPC dialogue activates an actual quest');
  await page.locator('#dialog-close-top').click();await page.waitForFunction(()=>gameState.flow==='PLAYING');
  results.push({name:'real Bram dialogue, quest acceptance and close',status:'passed',fixture:'teleported player to actual Bram; all choices via DOM input',options,questState});
  // Fixture: enter a real safe-village house by its actual dialogue action.
  const house=await page.evaluate(()=>{const s=gameState,h=s.HO.find(h=>h.x<30&&h.z<30);if(!h)throw Error('No village house');const p=s.P;p.x=h.x;p.z=h.z+(h.d/2)+1.1;p.tx=Math.round(p.x);p.tz=Math.round(p.z);p.path=[];p.mesh.position.set(p.x,s.getHeightAt(p.x,p.z),p.z);return {x:h.x,z:h.z,w:h.w,d:h.d};});
  await page.keyboard.press('f');
  await page.waitForFunction(()=>gameState.insideHouse===true);
  await page.screenshot({path:join(out,'house-interior.png')});
  await page.locator('#ui-hud-menu-btn').click();await page.locator('#ui1-menu').waitFor({state:'visible'});
  await page.locator('[data-action="save"]').click();
  const savedHouse=await page.evaluate(()=>JSON.parse(localStorage.getItem('hinaria.fullgame.v1')));
  assert.ok(savedHouse.house,'real house interior is part of the save');
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>gameState.flow==='TITLE');
  await page.locator('#title-continue').click();await page.waitForFunction(()=>gameState.insideHouse===true);
  assert.equal(await page.evaluate(()=>gameState.P.cls),savedHouse.player.cls);
  results.push({name:'real house entry/save/reload/Continue restores interior',status:'passed',fixture:'teleported to actual house doorway',house,snapshot:savedHouse.house});
  // Leave through real UI to test cleanup before the combat fixture.
  await page.keyboard.press('f');
  await page.waitForFunction(()=>!gameState.insideHouse&&gameState.flow==='PLAYING');
  await page.waitForTimeout(500);
  const bossFixture=await page.evaluate(()=>{const s=gameState,b=s.ents.find(e=>e.isBoss&&e.hp>0);if(!b)throw Error('No living boss');const p=s.P;p.x=b.x;p.z=b.z-1;p.tx=Math.round(p.x);p.tz=Math.round(p.z);p.path=[];p.cd=0;p.at=0;p.mesh.rotation.y=0;p.mesh.position.set(p.x,s.getHeightAt(p.x,p.z),p.z);b.hp=1;b.cd=10;b.st={stun:10};return {id:b.bossId,gold:p.gold,time:s.t};});
  // Boss encounter intros remain intentional and skippable.
  await page.waitForFunction(time=>gameState.cutsceneActive||gameState.t>time+.5,bossFixture.time,{timeout:45000});
  if(await page.evaluate(()=>gameState.cutsceneActive)){await page.locator('#cs-skip').click();await page.waitForFunction(()=>gameState.flow==='PLAYING');}
  await page.locator('#combat-v2-attack').click();
  await page.waitForFunction(id=>gameState.defeatedBosses.has(id),bossFixture.id,{timeout:30000});
  const deathTime=await page.evaluate(()=>gameState.t);
  await page.waitForFunction(time=>gameState.cutsceneActive||gameState.t>time+1,deathTime,{timeout:45000});
  if(await page.evaluate(()=>gameState.cutsceneActive)){await page.locator('#cs-skip').click();await page.waitForFunction(()=>gameState.flow==='PLAYING');}
  await page.locator('#ui-hud-menu-btn').click();await page.locator('[data-action="save"]').click();
  const defeated=await page.evaluate(()=>JSON.parse(localStorage.getItem('hinaria.fullgame.v1')));
  assert.ok(defeated.world.defeatedBosses.includes(bossFixture.id));
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>gameState.flow==='TITLE');await page.locator('#title-continue').click();
  await page.waitForFunction(()=>gameState.flow==='PLAYING');
  assert.equal(await page.evaluate(id=>gameState.ents.some(e=>e.bossId===id&&e.hp>0),bossFixture.id),false);
  assert.equal(await page.evaluate(()=>gameState.P.gold),defeated.player.gold,'boss restore never repeats reward');
  results.push({name:'explicit frontal boss kill + save/reload does not respawn or reward twice',status:'passed',fixture:'actual boss set to 1 HP/stunned and player teleported in front',bossId:bossFixture.id});
  assert.deepEqual(errors,[]);console.log('PASS 3/3 gameplay round trips (explicit fixtures; actual NPC/quest/house/manual combat/save systems).');
}catch(error){results.push({name:'runner',status:'failed',error:error.stack});console.error(error);process.exitCode=1;}
finally{writeFileSync(join(out,'results.json'),JSON.stringify({executedAt:new Date().toISOString(),results},null,2));await browser?.close();server.kill('SIGTERM');}
