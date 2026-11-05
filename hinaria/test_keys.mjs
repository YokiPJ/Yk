import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

console.log('🚀 Loading HINÁRIA...');
await page.goto('http://localhost:8080', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

// Force dismiss everything and start game
await page.evaluate(() => {
  // Remove cover
  document.getElementById('cover')?.remove();
  
  // Select class and close CC
  const classBtn = document.querySelectorAll('#cls button')[0];
  if (classBtn) classBtn.click();
  
  setTimeout(() => {
    const go = document.getElementById('go');
    if (go) go.click();
  }, 100);
});
console.log('✅ Game initialized');
await page.waitForTimeout(3000);

// Check state before movement
const before = await page.evaluate(() => ({
  ccOpen: window.gameState.ccOpen,
  keys: {...window.gameState.keys},
  playerPos: [window.gameState.P.x, window.gameState.P.z],
  chatFocused: document.activeElement === document.getElementById('say')
}));
console.log('\n📊 Before movement:', before);

// Press W and check if it registers
console.log('\n⌨️  Pressing W...');
await page.keyboard.down('KeyW');
await page.waitForTimeout(100);

const during = await page.evaluate(() => ({
  keys: {...window.gameState.keys},
  vx: window.gameState.P.vx,
  vz: window.gameState.P.vz
}));
console.log('During press:', during);

await page.waitForTimeout(2000);

const after = await page.evaluate(() => ({
  keys: {...window.gameState.keys},
  playerPos: [window.gameState.P.x, window.gameState.P.z],
  vx: window.gameState.P.vx,
  vz: window.gameState.P.vz,
  path: window.gameState.P.path
}));
console.log('After 2s:', after);

await page.keyboard.up('KeyW');
await page.waitForTimeout(1000);

const final = await page.evaluate(() => ({
  playerPos: [window.gameState.P.x, window.gameState.P.z]
}));
console.log('Final:', final);

console.log(`\n${JSON.stringify(before.playerPos) !== JSON.stringify(final.playerPos) ? '✅' : '❌'} Movement`);

await page.waitForTimeout(10000);
await browser.close();
