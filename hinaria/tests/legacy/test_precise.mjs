import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

const failedRequests = [];

page.on('console', msg => {
  if (msg.type() === 'error') {
    console.log(`❌ CONSOLE: ${msg.text()}`);
    console.log(`   Location: ${msg.location().url}:${msg.location().lineNumber}`);
  }
});

page.on('requestfailed', req => {
  const failure = {
    url: req.url(),
    method: req.method(),
    error: req.failure().errorText,
    resourceType: req.resourceType()
  };
  failedRequests.push(failure);
  console.log(`❌ REQUEST FAILED: ${failure.url}`);
  console.log(`   Error: ${failure.error}`);
  console.log(`   Type: ${failure.resourceType}`);
});

page.on('response', async (resp) => {
  if (resp.status() === 404) {
    console.log(`❌ 404: ${resp.url()}`);
    console.log(`   Request: ${resp.request().url()}`);
  }
});

console.log('🚀 Loading...');
await page.goto('http://localhost:8080', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(5000);

// Take screenshot
await page.screenshot({ path: 'G:\\Games\\Dowloadssssssssssssss\\Nova pasta\\screenshot.png', fullPage: false });
console.log('📸 Screenshot saved');

// Check what's rendering
const canvasData = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return null;
  
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, Math.min(100, canvas.width), Math.min(100, canvas.height));
  
  // Check if canvas has non-transparent pixels
  let hasContent = false;
  for (let i = 3; i < imageData.data.length; i += 4) {
    if (imageData.data[i] > 0) {
      hasContent = true;
      break;
    }
  }
  
  return {
    width: canvas.width,
    height: canvas.height,
    hasContent,
    isWebGL: canvas.getContext('webgl') !== null
  };
});

console.log('\n🎨 Canvas:', canvasData);

console.log('\n❌ Failed requests:', failedRequests.length);
failedRequests.forEach(f => {
  console.log(`  - ${f.url} (${f.error})`);
});

await page.waitForTimeout(5000);
await browser.close();
