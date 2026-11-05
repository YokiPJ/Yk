import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
const errors = [];

page.on('console', msg => {
  if (msg.type() === 'error') {
    const text = msg.text();
    // Ignore resource loading errors (base64 images, favicon)
    if (!text.includes('ERR_INVALID_URL') && !text.includes('404') && !text.includes('favicon')) {
      errors.push({ type: 'console', text, location: msg.location() });
      console.log('CONSOLE ERROR:', text, msg.location());
    }
  }
});

page.on('pageerror', err => {
  // Ignore resource loading errors
  if (!err.message.includes('ERR_INVALID_URL') && !err.message.includes('404') && !err.message.includes('favicon')) {
    errors.push({ type: 'pageerror', text: err.message, stack: err.stack });
    console.log('PAGE ERROR:', err.message);
    console.log('STACK:', err.stack);
  }
});

const response = await page.goto('http://localhost:8080', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);

// Remove cover screen via JS instead of clicking
await page.evaluate(() => {
  const cover = document.getElementById('cover');
  if (cover) {
    cover.classList.add('out');
    setTimeout(() => cover.remove(), 600);
  }
});

await page.waitForTimeout(2000);

console.log('\n=== Total JS errors:', errors.length, '===');
for (const e of errors) {
  console.log('Type:', e.type);
  console.log('Text:', e.text);
  if (e.stack) console.log('Stack:', e.stack);
  console.log('---');
}

// Check if canvas exists and has content
const canvas = await page.$('canvas');
console.log('Canvas found:', !!canvas);
if (canvas) {
  const box = await canvas.boundingBox();
  console.log('Canvas size:', box);
}

// Check renderer
const renderer = await page.evaluate(() => window.gameState?.renderer);
console.log('Renderer:', !!renderer);

// Check scene
const scene = await page.evaluate(() => window.gameState?.scene);
console.log('Scene:', !!scene);

// Check player
const player = await page.evaluate(() => window.gameState?.P);
console.log('Player:', !!player);

// Check if game is running (t > 0)
const gameTime = await page.evaluate(() => window.gameState?.t);
console.log('Game time:', gameTime);

// Check entities
const ents = await page.evaluate(() => window.gameState?.ents?.length);
console.log('Entities count:', ents);

await page.waitForTimeout(3000);

// Check if game time advances
const gameTime2 = await page.evaluate(() => window.gameState?.t);
console.log('Game time after 3s:', gameTime2, '(delta:', (gameTime2 - gameTime).toFixed(3), ')');

console.log('Done');
await browser.close();