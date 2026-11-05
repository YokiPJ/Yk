import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
const root=fileURLToPath(new URL('.',import.meta.url)).replace(/[\\/]$/,'');
await mkdir(root+'/verification',{recursive:true});
const server=createServer(async(req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(await readFile(root+'/ZERO_MOTION_STUDIO_3D.html'))});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.HINARIA_CHROMIUM||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1040},reducedMotion:'reduce'});
 page.on('pageerror',e=>console.log('PAGE ERROR',e.message));
 page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE ERROR',m.text())});
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.waitForTimeout(1000);
 console.log(JSON.stringify(await page.evaluate(()=>window.ZERO3D&&ZERO3D.snapshot())));
 await page.screenshot({path:root+'/verification/initial.png',fullPage:true});
}finally{await browser.close();await new Promise(r=>server.close(r))}
