/** Part II browser integration. Explicit fixtures finish Part I, teleport the
 * player, and reduce encounter HP; quest actions/combat/persistence stay real. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,join} from 'node:path';
import {chromium} from 'playwright';
import {QUESTS} from '../src/quest/questData.js';
import {PART2_LAYOUT} from '../src/content/part2.js';
import {stripInsetDeclarations} from './legacy-css.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=resolve(process.env.HINARIA_PART2_ARTIFACTS||'/workspace/beta-1.3.0/part2');
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.js','--offline'],{cwd:root,env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
let browser,page,origin,ignoredInsets=0;const results=[],errors=[],external=[],httpErrors=[];
const SAVE='hinaria.fullgame.v1',LEGACY='hinaria.quests.exploration.v2';
const waitTitle=()=>page.waitForFunction(()=>window.HINARIA_BOOT?.state==='ready'&&gameState.flow==='TITLE'&&!document.getElementById('play').disabled,null,{timeout:90000,polling:100});
async function waitPlaying(){
  // Quest callbacks may legitimately queue an original story scene. Use the
  // actual Skip action, then allow another scan before continuing UI actions.
  for(let attempt=0;attempt<4;attempt++){
    const start=await page.evaluate(()=>gameState.t);
    await page.waitForFunction(start=>gameState.cutsceneActive||(gameState.flow==='PLAYING'&&gameState.t>start+.35),start,{timeout:45000,polling:100});
    if(await page.evaluate(()=>gameState.cutsceneActive)){
      await page.locator('#cs-skip').click();continue;
    }
    return;
  }
  throw new Error('Story scenes did not settle after four real Skip actions');
}
const progress=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key))?.quests,LEGACY);
const waitQuest=(id,s,step,n)=>page.waitForFunction(({key,id,s,step,n})=>{
  const record=JSON.parse(localStorage.getItem(key))?.quests?.q?.[id];
  return record?.s===s&&(step===undefined||record.step===step)&&(n===undefined||record.n===n);
},{key:LEGACY,id,s,step,n},{timeout:30000,polling:100});
async function teleport(x,z){
  await page.evaluate(({x,z})=>{
    const s=gameState,p=s.P;p.x=x;p.z=z;p.tx=Math.round(x);p.tz=Math.round(z);
    p.path=[];p.vx=p.vz=p.spd=0;s.jx=s.jz=0;s.keys={};
    p.mesh.position.set(x,s.getHeightAt(x,z),z);s.L.set(x,s.getHeightAt(x,z),z);s.Z=0;
  },{x,z});
}
async function closeDialogue(){
  await page.locator('#dialog-close-top').click();await waitPlaying();
}
async function openNPC(id){
  const position=await page.evaluate(id=>{
    const s=gameState,n=id==='bram'?s.N:s.Y;
    for(const [dx,dz] of [[-.8,0],[1,1],[-1,1],[0,1.2],[1.2,0]]){
      const x=n.x+dx,z=n.z+dz;if(!s.B[Math.round(x)]?.[Math.round(z)])return {x,z};
    }
    throw new Error('No clear NPC approach for '+id);
  },id);
  await teleport(position.x,position.z);await page.keyboard.press('f');
  await page.locator('#dialog-panel').waitFor({state:'visible'});
  assert.match(await page.locator('#dialog-title').innerText(),id==='bram'?/Bram/:/Yoki/);
}
async function acceptQuest(npc,id,offer){
  await openNPC(npc);
  await page.locator('#dialog-options button').filter({hasText:/Receber missão/}).click();
  assert.match(await page.locator('#dialog-text').innerText(),offer);
  await page.locator('#dialog-options button').filter({hasText:/Aceitar missão/}).click();
  await waitQuest(id,'active');await closeDialogue();
}
async function deliver(npc,id){
  await openNPC(npc);
  await page.locator('#dialog-options button').filter({hasText:/Entregar missão/}).click();
  await waitQuest(id,'done');
  const text=await page.locator('#dialog-text').innerText();
  await closeDialogue();return text;
}
async function save(){
  await page.locator('#ui-hud-menu-btn').click();await page.locator('#ui1-menu').waitFor({state:'visible'});
  await page.locator('#ui1-menu [data-action="save"]').click();
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE);
  assert.ok(saved?.world&&saved?.quests,'real Save action writes full snapshot');
  await page.locator('#ui1-menu [data-action="resume"]').click();await waitPlaying();return saved;
}
async function reloadContinue(){
  await page.reload({waitUntil:'domcontentloaded'});await waitTitle();
  await page.locator('#title-continue').click();await waitPlaying();
}
async function visit(landmark,index){
  await teleport(landmark.x,landmark.z);
  await page.waitForFunction(name=>gameState.LM.some(item=>item.n===name&&item.f),landmark.n,{timeout:30000,polling:100});
  const start=await page.evaluate(()=>gameState.t);
  await page.waitForFunction(start=>gameState.t>start+.3,start,{timeout:30000,polling:100});
  await page.screenshot({path:join(out,`0${index}-${['passagem','observatorio','santuario'][index-1]}.png`)});
}
async function killStoryEnemy(id,screenshot){
  const fixture=await page.evaluate(id=>{
    const s=gameState,e=s.ents.find(enemy=>enemy.zd?.id===id&&enemy.hp>0);
    if(!e)throw new Error('No living encounter '+id);
    // Deterministic contact fixture: choose a physically clear front-facing
    // attack line close to the actor, without bypassing the real hit resolver.
    const offsets=[[0,-1],[0,1],[-1,0],[1,0]];
    const offset=offsets.find(([dx,dz])=>!s.B[Math.round(e.x+dx)]?.[Math.round(e.z+dz)]);
    if(!offset)throw new Error('No clear melee approach '+id);
    const p=s.P,x=e.x+offset[0],z=e.z+offset[1];
    p.x=x;p.z=z;p.tx=Math.round(x);p.tz=Math.round(z);p.path=[];p.cd=0;p.at=0;
    p.mesh.rotation.y=Math.atan2(e.x-x,e.z-z);p.mesh.position.set(x,s.getHeightAt(x,z),z);
    s.L.set(x,s.getHeightAt(x,z),z);s.Z=0;s.keys={};s.jx=s.jz=0;
    e.hp=1;e.cd=15;e.st={stun:15};e._part2QaToken=id+'-'+performance.now();
    return {id,token:e._part2QaToken,region:e.zd.region,bossId:e.bossId,name:e.name,position:[e.x,e.z],gold:p.gold,time:s.t};
  },id);
  if(screenshot)await page.screenshot({path:join(out,screenshot)});
  await page.locator('#combat-v2-attack').click();
  await page.waitForFunction(fixture=>{
    if(fixture.bossId)return gameState.defeatedBosses.has(fixture.bossId);
    return !gameState.ents.some(enemy=>enemy._part2QaToken===fixture.token&&enemy.hp>0);
  },fixture,{timeout:30000,polling:100});
  return fixture;
}
try{
  origin=await new Promise((done,fail)=>{
    let log='';const timer=setTimeout(()=>fail(new Error('Server startup timed out')),15000);
    server.once('error',fail);server.stdout.on('data',data=>{log+=data;const found=log.match(/Jogo: http:\/\/localhost:(\d+)\//);if(found){clearTimeout(timer);done('http://127.0.0.1:'+found[1])}});
  });
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1000,height:650},reducedMotion:'reduce'});
  // Android11 stock WebViews may lack this Chrome86 DOM API. Exercise the
  // shipped bootstrap compatibility path throughout the actual campaign test.
  await context.addInitScript(()=>{
    for(const proto of [Element.prototype,Document.prototype,DocumentFragment.prototype])delete proto.replaceChildren;
  });
  await context.route(/^https?:/,async route=>{
    const request=route.request();
    if(new URL(request.url()).origin!==origin){external.push(request.url());return route.abort();}
    if(['document','stylesheet','script'].includes(request.resourceType())){
      const response=await route.fetch(),legacy=stripInsetDeclarations(await response.text());
      ignoredInsets+=legacy.removed;
      return route.fulfill({response,body:legacy.source});
    }
    return route.continue();
  });
  page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
  page.on('response',response=>{if(response.status()>=400)httpErrors.push({url:response.url(),status:response.status()})});
  await page.goto(origin,{waitUntil:'domcontentloaded'});await waitTitle();
  await page.locator('#title-settings').click();await page.selectOption('#perf-quality','low');await page.locator('#perf-close').click();
  await page.locator('#play').click();await page.locator('#go').click();
  await page.waitForFunction(()=>gameState.cutsceneActive||gameState.t>.4,null,{timeout:45000,polling:100});
  if(await page.evaluate(()=>gameState.cutsceneActive))await page.locator('#cs-skip').click();await waitPlaying();
  assert.equal(await page.evaluate(()=>gameState.ents.filter(enemy=>enemy.zd?.region==='eco').length),0,'Part II does not populate the village before its quests');
  const clean=await save();assert.equal(clean.quests.q.p2_passagem,undefined);
  assert.equal(clean.world.seed,11);assert.equal(clean.world.generationVersion,2);
  results.push({name:'new game preserves Part I and keeps Part II encounters gated',status:'PASS',seed:clean.world.seed,generationVersion:clean.world.generationVersion});
  // Explicit test setup, not a claim that Part I was played in this run.
  const mainIds=['c1_ratos','c1_espelho','boss_troll','boss_orc'];
  const completed=Object.fromEntries(QUESTS.filter(quest=>mainIds.includes(quest.id)).map(quest=>[quest.id,{s:'done',step:quest.steps.length,n:0}]));
  const fixture=structuredClone(clean);fixture.identity.name='BetaTester';fixture.player.lv=22;fixture.player.max=1000;fixture.player.hp=1000;fixture.player.gold=5000;fixture.player.x=7;fixture.player.z=8;
  fixture.quests.q=completed;fixture.world.defeatedBosses=['troll_ancient','orc_king'];fixture.world.enemies=fixture.world.enemies.filter(enemy=>!enemy.bossId);fixture.world.respawns=[];
  await page.evaluate(({key,fixture})=>localStorage.setItem(key,JSON.stringify(fixture)),{key:SAVE,fixture});await reloadContinue();
  assert.equal(await page.evaluate(()=>gameState.P.name),'BetaTester');
  await page.waitForFunction(()=>/Parte II/.test(document.getElementById('qb')?.textContent||''),null,{timeout:20000,polling:100});
  assert.equal(await page.evaluate(()=>gameState.ents.filter(enemy=>enemy.zd?.region==='eco').length),0);
  await acceptQuest('yoki','p2_passagem',/coroa caiu|brumas/i);
  await visit(PART2_LAYOUT.landmarks[0],1);await visit(PART2_LAYOUT.landmarks[1],2);
  await waitQuest('p2_passagem','active',2);await deliver('yoki','p2_passagem');
  results.push({name:'Part II exploration, two actual discoveries and Yoki turn-in',status:'PASS',fixture:'Part I main quests completed by explicit save fixture; teleports, real discovery and NPC actions'});
  await acceptQuest('bram','p2_vigilia',/dois vigias|selo/i);
  await page.waitForFunction(()=>gameState.ents.filter(enemy=>enemy.zd?.id==='eco_guards'&&enemy.hp>0).length===2,null,{timeout:45000,polling:100});
  const first=await killStoryEnemy('eco_guards','04-vigia-do-eco.png');await waitQuest('p2_vigilia','active',0,1);
  const halfway=await save();assert.equal(halfway.quests.q.p2_vigilia.n,1);assert.equal(halfway.world.enemies.filter(enemy=>enemy.zone===13).length,1,'the appended guard zone keeps stable index13');
  await reloadContinue();
  const restoredAt=await page.evaluate(()=>gameState.t);
  await page.waitForFunction(time=>gameState.t>time+1.2,restoredAt,{timeout:45000,polling:100});
  assert.equal(await page.evaluate(()=>gameState.ents.filter(enemy=>enemy.zd?.id==='eco_guards'&&enemy.hp>0).length),1,'restoring partial progress never refills defeated guards');
  const restored=await save();assert.equal(restored.quests.q.p2_vigilia.n,1);
  const second=await killStoryEnemy('eco_guards');await waitQuest('p2_vigilia','active',1);
  await visit(PART2_LAYOUT.landmarks[2],3);await waitQuest('p2_vigilia','active',2);await deliver('bram','p2_vigilia');
  results.push({name:'regional guards, manual kills, partial save/Continue and sanctuary discovery',status:'PASS',fixtures:[first,second],halfwayAliveGuards:1,restoredAliveGuards:1});
  await acceptQuest('yoki','p2_ultima_voz',/sentinela|lembrança/i);
  await page.waitForFunction(()=>gameState.ents.some(enemy=>enemy.bossId==='sentinela_eco'&&enemy.hp>0),null,{timeout:45000,polling:100});
  const sentinel=await killStoryEnemy('eco_sentinel','05-sentinela-do-eco.png');await waitQuest('p2_ultima_voz','active',1);
  const ending=await deliver('yoki','p2_ultima_voz');assert.match(ending,/grilos|lembrar|sentinela/i);
  const final=await save();assert.equal(final.quests.q.p2_ultima_voz.s,'done');assert.ok(final.world.defeatedBosses.includes('sentinela_eco'));
  assert.equal(final.world.enemies.some(enemy=>enemy.bossId==='sentinela_eco'),false);
  await reloadContinue();assert.equal(await page.evaluate(()=>gameState.P.gold),final.player.gold,'Continue does not replay story/boss rewards');
  assert.equal(await page.evaluate(()=>gameState.ents.some(enemy=>enemy.bossId==='sentinela_eco'&&enemy.hp>0)),false);
  const finalAgain=await save();assert.equal(finalAgain.quests.q.p2_ultima_voz.s,'done');assert.equal(finalAgain.player.gold,final.player.gold);
  results.push({name:'Sentinela manual kill, real final turn-in and reload without repeated reward',status:'PASS',fixture:sentinel,ending,finalGold:final.player.gold});
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(httpErrors,[]);
  assert.ok(ignoredInsets>=20,'campaign also exercises physical overlay offsets without CSS inset');
  const build=JSON.parse(await readFile(join(root,'www/build-info.json'),'utf8'));
  await writeFile(join(out,'results.json'),JSON.stringify({status:'PASS',executedAt:new Date().toISOString(),browser:await browser.version(),environment:'Current Chromium/SwiftShader, desktop browser; not a physical Android benchmark',compatibilitySetup:{replaceChildrenRemoved:true,ignoredInsetDeclarations:ignoredInsets},build,fixtures:'Part I completion and level22 prepared in an explicit save fixture; teleports and1HP targets accelerate real Part II quest, discovery, manual combat and persistence systems',results,errors,external,httpErrors},null,2)+'\n');
  console.log('PASS Part II: gate, three quest turn-ins, three discoveries, two guards, partial reload, sentinel and one-time ending.');
}catch(error){
  const diagnostic=await page?.evaluate(()=>({boot:window.HINARIA_BOOT,qa:window.HINARIA_QA?.snapshot?.(),flow:window.gameState?.flow,legacy:localStorage.getItem('hinaria.quests.exploration.v2'),save:localStorage.getItem('hinaria.fullgame.v1')})).catch(()=>null);
  await page?.screenshot({path:join(out,'failure.png')}).catch(()=>{});
  await writeFile(join(out,'results.json'),JSON.stringify({status:'FAIL',executedAt:new Date().toISOString(),results,error:error.stack,diagnostic,errors,external,httpErrors},null,2)+'\n');
  throw error;
}finally{await browser?.close();server.kill();if(server.exitCode===null)await once(server,'exit');}
