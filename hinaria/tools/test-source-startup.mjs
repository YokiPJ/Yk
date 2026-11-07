/** Fresh source ZIPs must play without node_modules or selecting a folder. */
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,stat,rm,access} from 'node:fs/promises';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,extname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {unzipSync} from 'fflate';
import {chromium} from 'playwright';

const project=fileURLToPath(new URL('../',import.meta.url));
const archive=process.env.HINARIA_SOURCE_ARCHIVE,patch=process.env.HINARIA_PATCH_ARCHIVE,previous=process.env.HINARIA_PREVIOUS_ARCHIVE;
assert.ok(archive,'Set HINARIA_SOURCE_ARCHIVE to the source ZIP under test');
const out=resolve(process.env.HINARIA_STARTUP_ARTIFACTS||project+'qa-evidence/source-startup');await mkdir(out,{recursive:true});
const temp=await mkdtemp(join(tmpdir(),'HINARIA teste inicio ')),results=[];let browser;
async function extract(file,root){
  for(const [name,bytes] of Object.entries(unzipSync(await readFile(file)))){
    const target=resolve(root,name);assert.ok(target.startsWith(root+sep),'archive cannot escape its folder');
    if(name.endsWith('/'))await mkdir(target,{recursive:true});
    else {await mkdir(dirname(target),{recursive:true});await writeFile(target,bytes);}
  }
}
async function verifyRuntime(root){
  await assert.rejects(access(join(root,'hinaria/node_modules')));
  const vendor=join(root,'hinaria/vendor'),manifest=JSON.parse(await readFile(join(vendor,'runtime-manifest.json'),'utf8'));
  for(const [name,entry] of Object.entries(manifest.files)){
    const bytes=await readFile(join(vendor,name));assert.equal(bytes.length,entry.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);
  }
  assert.equal(Object.keys(manifest.files).length,8,'four libraries and four licenses');
}
async function staticHost(root){
  const mime={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.ttf':'font/ttf','.mp3':'audio/mpeg','.wav':'audio/wav'};
  const server=createServer(async(req,res)=>{
    try{
      let file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
      if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
      if((await stat(file)).isDirectory())file=join(file,'index.html');
      res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(await readFile(file));
    }catch{res.writeHead(404);res.end('Not Found');}
  });
  await new Promise(done=>server.listen(0,'127.0.0.1',done));
  return {origin:'http://127.0.0.1:'+server.address().port,close:()=>new Promise(done=>server.close(done))};
}
async function nodeHost(root){
  const child=spawn(process.execPath,['server.js'],{cwd:join(root,'hinaria'),env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
  const origin=await new Promise((done,fail)=>{
    let log='';const timer=setTimeout(()=>fail(Error('Server startup timeout: '+log)),15000);
    child.once('error',fail);child.once('exit',code=>{clearTimeout(timer);fail(Error('Server exited '+code+': '+log));});
    child.stderr.on('data',b=>log+=b);child.stdout.on('data',b=>{log+=b;const m=log.match(/Jogo: http:\/\/localhost:(\d+)/);if(m){clearTimeout(timer);done('http://127.0.0.1:'+m[1]);}});
  });
  return {origin,close:async()=>{child.kill();if(child.exitCode===null)await once(child,'exit');}};
}
async function play(root,name,custom=false){
  await verifyRuntime(root);const host=await(custom?nodeHost(root):staticHost(root));
  const context=await browser.newContext({viewport:{width:1280,height:720},reducedMotion:'reduce'}),errors=[],external=[];
  try{
    await context.route(/^https?:/,route=>{if(new URL(route.request().url()).origin===host.origin)return route.continue();external.push(route.request().url());return route.abort();});
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    const bad=[];page.on('response',response=>{if(response.status()>=400)bad.push({url:response.url(),status:response.status()});});
    await page.goto(host.origin+'/?visual=classico&stream=0',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.HINARIA_BOOT?.state==='ready'||window.HINARIA_BOOT?.state==='failed',null,{timeout:90000,polling:100});
    assert.equal(await page.evaluate(()=>HINARIA_BOOT.state),'ready',JSON.stringify(await page.evaluate(()=>HINARIA_BOOT)));
    const url=new URL(page.url());assert.equal(url.pathname,custom?'/':'/hinaria/');assert.equal(url.searchParams.get('visual'),'classico');
    const vendorURL=host.origin+(custom?'':'/hinaria')+'/vendor/three.module.js';assert.equal((await fetch(vendorURL)).status,200);
    await page.locator('#play').click();await page.locator('#go').click();
    await page.waitForFunction(()=>gameState.cutsceneActive||gameState.t>.4,null,{timeout:45000,polling:100});
    if(await page.evaluate(()=>gameState.cutsceneActive))await page.locator('#cs-skip').click();
    await page.waitForFunction(()=>gameState.flow==='PLAYING'&&!gameState.cutsceneActive,null,{timeout:30000,polling:100});
    const position=await page.evaluate(()=>[gameState.P.x,gameState.P.z]);
    await page.keyboard.down('w');await page.waitForFunction(([x,z])=>Math.hypot(gameState.P.x-x,gameState.P.z-z)>.05,position,{timeout:15000,polling:100});await page.keyboard.up('w');
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(bad,[]);
    await page.screenshot({path:join(out,name+'.png')});
    results.push({name,status:'PASS',withoutNodeModules:true,urlPath:url.pathname,threeStatus:200,checks:['root opens game automatically','local pinned libraries and licenses','classic game boots','real movement','no external or failed request']});
    console.log('PASS source startup: '+name);
  }finally{await context.close();await host.close();}
}
try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const full=join(temp,'full');await extract(archive,full);
  await play(full,'full-static-root');await play(full,'full-node-server',true);
  if(patch&&previous){const updated=join(temp,'patched');await extract(previous,updated);await extract(patch,updated);await play(updated,'patch-over-previous-beta');}
  // A partial node_modules folder must not be mistaken for installed libraries.
  await rm(join(full,'hinaria/vendor'),{recursive:true});await mkdir(join(full,'hinaria/node_modules'));
  const child=spawn(process.execPath,['server.js'],{cwd:join(full,'hinaria'),env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});let log='';
  child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);const [code]=await once(child,'exit');
  assert.equal(code,1);assert.match(log,/three\.module\.js/);assert.match(log,/npm run setup/);assert.doesNotMatch(log,/Jogo: http/);
  results.push({name:'partial dependencies fail clearly before opening browser',status:'PASS'});
  await writeFile(join(out,'results.json'),JSON.stringify({status:'PASS',browser:await browser.version(),environment:'Chromium/SwiftShader on Linux; Windows batch file not executed',results},null,2)+'\n');
}catch(error){await writeFile(join(out,'results.json'),JSON.stringify({status:'FAIL',results,error:error.stack},null,2)+'\n');throw error;}
finally{await browser?.close();await rm(temp,{recursive:true,force:true});}
