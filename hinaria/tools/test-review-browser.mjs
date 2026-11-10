/** Whole-game regression scenarios using actual mobile input and game systems.
 * Fixtures edit storage, history, rat HP/stun/positions and two collision tiles.
 * These are explicit accelerated scenarios, not a full campaign playthrough. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {chromium} from 'playwright';
const root=resolve(import.meta.dirname,'..'),out=resolve(process.env.HINARIA_REVIEW_ARTIFACTS||join(root,'qa-evidence/review'));
mkdirSync(out,{recursive:true});
const offline=process.argv.includes('--offline');
const server=spawn(process.execPath,['server.js',...(offline?['--offline']:[])],{cwd:root,env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const results=[],errors=[],external=[];let browser,page,build;
const wait=(fn,arg)=>page.waitForFunction(fn,arg,{timeout:60000,polling:100});
const gameTime=()=>page.evaluate(()=>gameState.t);
async function advance(seconds){const start=await gameTime();await wait(({start,seconds})=>gameState.t>=start+seconds,{start,seconds});}
const passed=(name,details={})=>{results.push({name,status:'PASS',...details});console.log('PASS review: '+name);};
async function menu(){await page.locator('#ui-hud-menu-btn').tap();await wait(()=>gameState.flow==='PAUSED');}
async function editClass(cls){
  await menu();await page.locator('[data-action="character"]').tap();
  await page.getByRole('button',{name:'Editar aparência e classe',exact:true}).tap();
  await wait(()=>gameState.flow==='CHARACTER_CREATION');
  await page.locator(`#cls button[data-k="${cls}"]`).tap();await page.locator('#go').tap();
  await wait(()=>gameState.flow==='PLAYING');
}
try {
  const origin=await new Promise((done,fail)=>{
    let log='';const timer=setTimeout(()=>fail(Error('Server startup timeout')),15000);
    server.once('error',fail);server.stdout.on('data',chunk=>{log+=chunk;const m=log.match(/Jogo: http:\/\/localhost:(\d+)\//);if(m){clearTimeout(timer);done('http://127.0.0.1:'+m[1]);}});
  });
  if(offline)build=await(await fetch(origin+'/build-info.json')).json();
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('hinaria-v79-music','null'));
  await context.route(/^https?:/,route=>{
    if(new URL(route.request().url()).origin!==origin){external.push(route.request().url());return route.abort('blockedbyclient');}
    return route.continue();
  });
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url());});
  page.on('dialog',dialog=>dialog.accept());
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await wait(()=>window.HINARIA_BOOT?.state==='ready'&&gameState.flow==='TITLE'&&!document.getElementById('play').disabled);
  passed('cold boot with null audio preferences');
  await page.locator('#title-settings').tap();await page.locator('#perf-quality').selectOption('low');await page.locator('#perf-close').tap();
  await page.locator('#play').tap();await page.locator('#cls button[data-k="so"]').tap();await page.locator('#go').tap();
  await wait(()=>gameState.cutsceneActive||gameState.t>.4);
  if(await page.evaluate(()=>gameState.cutsceneActive))await page.locator('#cs-skip').tap();
  await wait(()=>gameState.flow==='PLAYING'&&!gameState.cutsceneActive);
  assert.equal(await page.evaluate(()=>gameState.P.mana===gameState.P.mm),true);
  passed('new mage starts with full class mana');
  await page.evaluate(()=>{
    const s=gameState,p=s.P;p.hp=40;p.mana=p.mm;p.rl=1;p.rc=0;p.reg=0;
    s.hist=[{x:p.tx,z:p.tz,hp:96},...Array.from({length:3},()=>({x:p.tx,z:p.tz,hp:40}))];
  });
  await page.keyboard.press('4');
  assert.equal(await page.evaluate(()=>gameState.P.hp),60);
  assert.equal(await page.evaluate(()=>HINARIA_FLOW.saveGame().ok),true);
  passed('Replay history from another class stays within maximum HP and remains saveable');
  await menu();await page.locator('[data-action="save"]').tap();
  await page.evaluate(()=>{
    const key='hinaria.fullgame.v1',backup=JSON.parse(localStorage.getItem(key));
    backup.player.gold=321;backup.quests.q={c1_ratos:{s:'active',step:0,n:2}};
    const broken=JSON.parse(JSON.stringify(backup));broken.player.gold=999;broken.quests.q.c1_ratos.step=999;
    localStorage.setItem(key+'.backup',JSON.stringify(backup));localStorage.setItem(key,JSON.stringify(broken));
  });
  assert.equal(await page.evaluate(()=>HINARIA_FLOW.getSaveInfo().source),'backup');
  await page.locator('[data-action="load"]').tap();await wait(()=>gameState.flow==='PLAYING');
  assert.equal(await page.evaluate(()=>gameState.P.gold),321);
  assert.equal(await page.evaluate(()=>HINARIA_FLOW.saveGame().ok),true);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('hinaria.fullgame.v1')).quests.q.c1_ratos.n),2);
  passed('invalid quest step recovers backup and preserves partial quest progress');
  await page.evaluate(()=>{
    const key='hinaria.fullgame.v1',saved=JSON.parse(localStorage.getItem(key));
    for(const name of ['b','st','rl','rc','cd','cds','ownedWeapons','equippedWeapons','skillLevels'])delete saved.player[name];
    localStorage.setItem(key,JSON.stringify(saved));
    Object.assign(gameState.P,{b:{guard:100},st:{burn:10},rl:1,rc:20,cd:1,cds:[4,3,2,1]});
  });
  await menu();await page.locator('[data-action="load"]').tap();await wait(()=>gameState.flow==='PLAYING');
  assert.equal(await page.evaluate(()=>Object.keys(gameState.P.b).length+Object.keys(gameState.P.st).length),0);
  assert.equal(await page.evaluate(()=>gameState.P.rl+gameState.P.rc+gameState.P.cd+gameState.P.cds.reduce((a,b)=>a+b,0)),0);
  passed('older saves reset omitted optional state');
  await page.evaluate(()=>{gameState.P.hp=20;gameState.P.mana=12;gameState.P.reg=0;});
  await editClass('dr');
  assert.equal(await page.evaluate(()=>gameState.P.hp),20);
  assert.ok(await page.evaluate(()=>gameState.P.mana<15),'later class edits cannot refill mana');
  passed('editing an existing character does not refill resources');
  await editClass('kn');
  const fixture=await page.evaluate(()=>{
    const s=gameState,p=s.P,target=s.ents.find(e=>e.kind==='m'&&e.k==='rat'&&e.hp>0);
    if(!target)throw Error('No living rat for fixture');
    let base;
    for(let x=6;x<27&&!base;x++)for(let z=6;z<33&&!base;z++){
      let free=true;for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)if(s.B[x+dx]?.[z+dz])free=false;
      if(free&&s.ZN[x][z]!==0&&s.ZN[x+1][z+1]!==0&&!s.ents.some(e=>e!==p&&e!==target&&Math.hypot(e.x-x,e.z-z)<5))base={x,z};
    }
    if(!base)throw Error('No free field corridor');
    for(const e of s.ents)if(e.kind==='m'){e.st={stun:10000};e.path=[];e.tx=e.x;e.tz=e.z;}
    Object.assign(p,{x:base.x,z:base.z,tx:base.x,tz:base.z,vx:0,vz:0,spd:0,stp:0,cd:0,at:0,path:[],hp:p.max});
    p.mesh.position.set(p.x,s.getHeightAt(p.x,p.z),p.z);p.mesh.rotation.y=0;s.L.set(p.x,0,p.z);
    Object.assign(target,{x:base.x,z:base.z-.8,tx:base.x,tz:base.z-.8,hp:1000,max:1000,cd:10000,path:[]});
    target.mesh.visible=true;target.mesh.position.set(target.x,s.getHeightAt(target.x,target.z),target.z);
    window.reviewFixture={target,base};return {base,time:s.t};
  });
  const cdp=await context.newCDPSession(page),rect=await page.locator('#combat-v2-attack').boundingBox();
  const finger={x:rect.x+rect.width/2,y:rect.y+rect.height/2,id:0,radiusX:2,radiusY:2};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger]});
  await wait(()=>reviewFixture.target.hp<1000);
  await advance(1);
  const beforeRelease=await page.evaluate(()=>reviewFixture.target.hp);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await advance(.7);assert.equal(await page.evaluate(()=>reviewFixture.target.hp),beforeRelease);
  passed('holding and releasing attack produces exactly one strike',{fixture});
  const blocked=await page.evaluate(()=>{gameState.P.cd=.9;gameState.P.mesh.rotation.y=0;return {time:gameState.t,hp:reviewFixture.target.hp};});
  await page.locator('#combat-v2-attack').tap();await advance(.25);
  assert.equal(await page.evaluate(()=>reviewFixture.target.hp),blocked.hp);
  assert.equal(await page.evaluate(()=>gameState.P.mesh.rotation.y),0);
  await wait(()=>gameState.P.cd<=0);await page.locator('#combat-v2-attack').tap();
  await wait(hp=>reviewFixture.target.hp<hp,blocked.hp);await advance(.5);
  passed('Knight combo respects a previous weapon cooldown and resumes afterward');
  const stunned=await page.evaluate(()=>{
    const {target:e,base:b}=reviewFixture;e.x=b.x+.2;e.z=b.z-1;e.tx=b.x+1;e.tz=e.z;e.path=[];e.st={stun:.75};
    e.mesh.position.set(e.x,gameState.getHeightAt(e.x,e.z),e.z);return {x:e.x,z:e.z};
  });
  await advance(.4);
  assert.ok(await page.evaluate(({x,z})=>Math.hypot(reviewFixture.target.x-x,reviewFixture.target.z-z)<1e-8,stunned));
  await wait(x=>reviewFixture.target.x>x+.02,stunned.x);
  passed('stun stops a partial tile move and movement resumes when it expires');
  const wall=await page.evaluate(()=>{
    const s=gameState,{target:e,base:b}=reviewFixture,p=s.P;
    p.x=p.tx=b.x+1;p.z=p.tz=b.z+1;p.vx=p.vz=p.spd=p.stp=0;p.path=[];p.hp=p.max;
    p.mesh.position.set(p.x,s.getHeightAt(p.x,p.z),p.z);
    Object.assign(e,{x:b.x,z:b.z,tx:b.x,tz:b.z,st:{},path:[],cd:0});e.K={...e.K,sp:0};
    e.mesh.position.set(e.x,s.getHeightAt(e.x,e.z),e.z);
    s.B[b.x+1][b.z]=s.B[b.x][b.z+1]=1;return {hp:p.hp};
  });
  await advance(.4);assert.equal(await page.evaluate(()=>gameState.P.hp),wall.hp);
  await page.evaluate(()=>{const {base:b,target:e}=reviewFixture;gameState.B[b.x+1][b.z]=gameState.B[b.x][b.z+1]=0;e.path=[];e.tx=e.x;e.tz=e.z;e.cd=0;});
  await wait(hp=>gameState.P.hp<hp,wall.hp);
  passed('enemy cannot melee through a closed diagonal corner and can attack when it opens');
  await page.evaluate(()=>{
    // Isolate the death penalty from the separate 5-gold discovery reward at
    // the respawn point. These landmarks are already visited in this fixture.
    for(const landmark of gameState.LM)landmark.f=1;
    gameState.P.hp=1;gameState.P.gold=3_000_000_000;reviewFixture.target.cd=0;
  });
  await wait(()=>gameState.P.gold===2_250_000_000&&gameState.P.x===7&&gameState.P.z===8);
  assert.equal(await page.evaluate(()=>gameState.P.hp===gameState.P.max),true);
  assert.equal(await page.evaluate(()=>HINARIA_FLOW.saveGame().ok),true);
  passed('actual enemy damage triggers respawn and a 25% death penalty even above 32-bit gold');
  await page.screenshot({path:join(out,'review-complete.png')});
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
} catch(error) {
  const state=await page?.evaluate(()=>({flow:window.gameState?.flow,boot:window.HINARIA_BOOT,player:gameState?.P&&{x:gameState.P.x,z:gameState.P.z,hp:gameState.P.hp,mana:gameState.P.mana,cd:gameState.P.cd,gold:gameState.P.gold},time:gameState?.t})).catch(()=>null);
  await page?.screenshot({path:join(out,'failure.png')}).catch(()=>{});
  results.push({status:'FAIL',error:error.stack,state});console.error(error);process.exitCode=1;
} finally {
  writeFileSync(join(out,'results.json'),JSON.stringify({status:process.exitCode?'FAIL':'PASS',executedAt:new Date().toISOString(),environment:'Linux Chromium/SwiftShader with mobile touch and explicit fixtures, not a physical Android',offline,build,results,errors,external},null,2)+'\n');
  await browser?.close();server.kill('SIGTERM');
}
