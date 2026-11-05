import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1360,height:880}});
const errors=[];page.on('pageerror',e=>errors.push('JS: '+e.message));
page.on('console',m=>{if(m.type()==='error')errors.push('Console: '+m.text())});
page.on('requestfailed',r=>errors.push('Request: '+r.url()+' '+r.failure()?.errorText));
try{
const response=await page.goto('http://localhost:8080/',{waitUntil:'domcontentloaded',timeout:25000});
await page.waitForTimeout(6000);
console.log(JSON.stringify({status:response.status(),title:await page.title(),hasCanvas:await page.locator('#wrap canvas').count(),state:await page.evaluate(()=>({time:window.gameState?.t,world:window.gameState?.G?.length,entities:window.gameState?.ents?.length,drawCalls:window.gameState?.renderer?.info?.render?.calls})),errors},null,2));
await page.screenshot({path:'v6_browser_test.png',fullPage:true});
}finally{await browser.close()}
