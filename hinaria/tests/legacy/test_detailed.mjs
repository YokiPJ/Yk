import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

const logs = [];
const errors = [];

page.on('console', msg => {
  const text = msg.text();
  logs.push({ type: msg.type(), text });
  if (msg.type() === 'error') {
    console.log(`❌ CONSOLE ERROR: ${text}`);
  }
});

page.on('pageerror', err => {
  errors.push({ type: 'page', message: err.message, stack: err.stack });
  console.log(`❌ PAGE ERROR: ${err.message}`);
  console.log(`   Stack: ${err.stack}`);
});

page.on('response', async (resp) => {
  const url = resp.url();
  const status = resp.status();
  
  if (status === 404) {
    console.log(`❌ 404: ${url}`);
  }
  
  if (url.includes('main.js')) {
    console.log(`✅ main.js loaded: ${status}`);
  }
});

console.log('🚀 Loading page...');
await page.goto('http://localhost:8080', { waitUntil: 'domcontentloaded', timeout: 30000 });

console.log('⏳ Waiting 8 seconds for initialization...');
await page.waitForTimeout(8000);

// Check DOM state
const state = await page.evaluate(() => {
  return {
    hasCanvas: !!document.querySelector('canvas'),
    hasGameState: !!window.gameState,
    hasRenderer: !!window.gameState?.renderer,
    hasScene: !!window.gameState?.scene,
    hasPlayer: !!window.gameState?.P,
    hasTHREE: typeof THREE !== 'undefined',
    importmapExists: !!document.querySelector('script[type="importmap"]'),
    bodyChildren: document.body.children.length,
    errors: window.lastError || null
  };
});

console.log('\n📊 DOM State:');
console.log('  Canvas:', state.hasCanvas);
console.log('  gameState:', state.hasGameState);
console.log('  renderer:', state.hasRenderer);
console.log('  scene:', state.hasScene);
console.log('  player:', state.hasPlayer);
console.log('  THREE global:', state.hasTHREE);
console.log('  Importmap:', state.importmapExists);
console.log('  Body children:', state.bodyChildren);

console.log('\n📝 Total console logs:', logs.length);
console.log('📝 Total errors:', errors.length);

if (errors.length > 0) {
  console.log('\n❌ Errors:');
  errors.forEach((e, i) => {
    console.log(`\n  Error ${i + 1}:`);
    console.log(`    Type: ${e.type}`);
    console.log(`    Message: ${e.message}`);
    if (e.stack) console.log(`    Stack: ${e.stack.substring(0, 300)}`);
  });
}

console.log('\n✅ Done - keeping browser open for 10 seconds...');
await page.waitForTimeout(10000);
await browser.close();
