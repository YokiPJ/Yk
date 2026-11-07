/** Real mobile bundle and inputs. Fixtures relocate two existing rats, give them
 * 1000 HP/stun, and temporarily insert collision tiles for the obstruction case.
 * Production attack/aim, animations, projectiles and damage remain unchanged. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { chromium } from 'playwright';

const root=resolve(import.meta.dirname,'..');
const output=resolve(process.env.HINARIA_AIM_ARTIFACTS||join(root,'qa-evidence/attack-aim'));
mkdirSync(output,{recursive:true});
const offline=process.argv.includes('--offline');
const server=spawn(process.execPath,['server.js',...(offline?['--offline']:[])],{cwd:root,env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
let browser,page;
const results=[];
const until=(page,fn,arg)=>page.waitForFunction(fn,arg,{timeout:60000,polling:100});
async function fixture(page,mode='near') {
  return page.evaluate(mode=>{
    const s=gameState,p=s.P;
    let f=window.aimFixture;
    if(!f) {
      const rats=s.ents.filter(e=>e.kind==='m'&&e.k==='rat'&&e.hp>0).slice(0,2);
      if(rats.length!==2)throw Error('Fixture needs two actual living rats');
      let base;
      for(let x=6;x<27&&!base;x++)for(let z=6;z<27&&!base;z++) {
        let clear=true;
        for(let dx=-1;dx<=1;dx++)for(let dz=-3;dz<=3;dz++)if(s.B[x+dx]?.[z+dz])clear=false;
        if(!clear || s.ents.some(e=>e!==p&&!rats.includes(e)&&Math.hypot(e.x-x,e.z-z)<8))continue;
        base={x,z};
      }
      if(!base)throw Error('No free village corridor for fixture');
      f=window.aimFixture={rear:rats[0],front:rats[1],base,range:{kn:1.25,pa:5,so:5,dr:4,yo:1.5}[p.cls],walls:[]};
    }
    for(const wall of f.walls)s.B[wall.x][wall.z]=wall.old;
    f.walls=[];
    p.x=f.base.x;p.z=f.base.z;p.tx=Math.round(p.x);p.tz=Math.round(p.z);
    p.vx=p.vz=p.spd=p.stp=p.cd=p.at=0;p.path=[];p.mesh.rotation.y=0;
    p.mesh.position.set(p.x,s.getHeightAt(p.x,p.z),p.z);s.L.set(p.x,0,p.z);
    for(const e of s.ents)if(e.kind==='m'){e.st={stun:10000};e.path=[];e.stp=0;e.cd=10000;}
    const near=Math.min(f.range*.6,2),far=Math.min(f.range*.9,3);
    const distances=mode==='far'?[f.range+.6,f.range+1]:mode==='wall'?[Math.min(f.range*.9,2.4),Math.min(f.range*.9,2.4)]:[near,far];
    [f.rear,f.front].forEach((e,i)=>{
      e.hp=e.max=1000;e.x=p.x;e.z=p.z+(i===0?-distances[i]:distances[i]);
      // Keep stunned fixture actors stationary instead of completing a tile step.
      e.tx=e.x;e.tz=e.z;e.mesh.visible=true;
      e.mesh.position.set(e.x,s.getHeightAt(e.x,e.z),e.z);
    });
    if(mode==='wall')for(const dz of [-1,1]){
      const x=f.base.x,z=f.base.z+dz;
      f.walls.push({x,z,old:s.B[x][z]});s.B[x][z]=1;
    }
    return {base:f.base,range:f.range,mode,time:s.t};
  },mode);
}
try {
  const origin=await new Promise((done,fail)=>{
    let log='';const timeout=setTimeout(()=>fail(Error('Server startup timeout')),15000);
    server.once('error',fail);server.stdout.on('data',chunk=>{log+=chunk;const m=log.match(/Jogo: http:\/\/localhost:(\d+)\//);if(m){clearTimeout(timeout);done('http://127.0.0.1:'+m[1]);}});
  });
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  for(const cls of ['kn','pa','so','dr','yo']) {
    const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    const errors=[],external=[];
    await context.route(/^https?:/,route=>{
      if(new URL(route.request().url()).origin!==origin){external.push(route.request().url());return route.abort('blockedbyclient');}
      return route.continue();
    });
    page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    page.on('response',r=>{if(r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url());});
    await page.goto(origin,{waitUntil:'domcontentloaded'});
    await until(page,()=>window.HINARIA_BOOT?.state==='ready'&&window.gameState?.flow==='TITLE'&&!document.getElementById('play').disabled);
    await page.locator('#title-settings').tap();await page.locator('#perf-quality').selectOption('low');await page.locator('#perf-close').tap();
    await page.locator('#play').tap();await until(page,()=>gameState.flow==='CHARACTER_CREATION');
    await page.locator(`#cls button[data-k="${cls}"]`).tap();await page.locator('#go').tap();
    await until(page,()=>gameState.cutsceneActive||gameState.t>.4);
    if(await page.evaluate(()=>gameState.cutsceneActive))await page.locator('#cs-skip').tap();
    await until(page,()=>gameState.flow==='PLAYING'&&!gameState.cutsceneActive);
    const near=await fixture(page);
    await until(page,t=>gameState.t>t+.8,near.time);
    assert.equal(await page.evaluate(()=>aimFixture.rear.hp),1000,'nearby enemy does not trigger idle attacks');
    await page.locator('#combat-v2-attack').tap();
    const yaw=await page.evaluate(()=>gameState.P.mesh.rotation.y);
    assert.ok(Math.abs(Math.abs(yaw)-Math.PI)<.01,cls+' automatically faces the enemy behind');
    await until(page,()=>aimFixture.rear.hp<1000);
    assert.equal(await page.evaluate(()=>aimFixture.front.hp),1000,'farther enemy untouched');
    await until(page,t=>gameState.t>t+1.6,near.time);
    const after=await page.evaluate(()=>({hp:aimFixture.rear.hp,time:gameState.t,projectiles:gameState.pr.length}));
    await until(page,t=>gameState.t>t+.8,after.time);
    assert.equal(await page.evaluate(()=>aimFixture.rear.hp),after.hp,'input causes a single attack');
    await page.screenshot({path:join(output,`aim-${cls}.png`)});
    const wall=await fixture(page,'wall');
    await page.keyboard.press('j');
    await until(page,t=>gameState.t>t+1.1,wall.time);
    assert.deepEqual(await page.evaluate(()=>[aimFixture.rear.hp,aimFixture.front.hp]),[1000,1000],cls+' walls block assistance');
    assert.equal(await page.evaluate(()=>gameState.P.mesh.rotation.y),0,'blocked swing preserves direction');
    const far=await fixture(page,'far');
    await page.keyboard.press('Space');
    await until(page,t=>gameState.t>t+1.1,far.time);
    assert.deepEqual(await page.evaluate(()=>[aimFixture.rear.hp,aimFixture.front.hp]),[1000,1000],cls+' range unchanged');
    assert.equal(await page.evaluate(()=>gameState.P.mesh.rotation.y),0,'out-of-range enemies do not pull aim');
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    results.push({class:cls,status:'PASS',fixture:near,behindYaw:yaw,victimHP:after.hp,checks:['touch auto-turns and damages nearest rear enemy','no idle or repeated attack','J cannot attack through walls','Space respects equipped range'],errors,external});
    console.log('PASS attack aim '+cls+' · touch/J/Space · nearest rear target · walls/range/idle');
    await context.close();page=null;
  }
} catch(error) {
  const state=await page?.evaluate(()=>({flow:window.gameState?.flow,boot:window.HINARIA_BOOT,player:window.gameState?.P&&{x:gameState.P.x,z:gameState.P.z,at:gameState.P.at,cd:gameState.P.cd,yaw:gameState.P.mesh.rotation.y},targets:window.aimFixture&&[aimFixture.rear,aimFixture.front].map(e=>({x:e.x,z:e.z,tx:e.tx,tz:e.tz,hp:e.hp,visible:e.mesh.visible}))})).catch(()=>null);
  await page?.screenshot({path:join(output,'failure.png')}).catch(()=>{});
  results.push({status:'FAIL',error:error.stack,state});console.error(error);process.exitCode=1;
} finally {
  writeFileSync(join(output,'results.json'),JSON.stringify({status:process.exitCode?'FAIL':'PASS',executedAt:new Date().toISOString(),environment:'Chromium/SwiftShader with mobile touch; no physical Android phone',offline,results},null,2)+'\n');
  await browser?.close();server.kill('SIGTERM');
}
