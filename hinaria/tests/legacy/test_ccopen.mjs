import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

console.log('🚀 Loading HINÁRIA...');
await page.goto('http://localhost:8080', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

// Dismiss cover
await page.evaluate(() => {
  document.getElementById('cover')?.remove();
});
await page.waitForTimeout(1000);

// Check initial state
const initialState = await page.evaluate(() => ({
  ccOpen: window.gameState.ccOpen,
  ccwDisplay: window.getComputedStyle(document.getElementById('ccw')).display
}));
console.log('Initial state:', initialState);

// Click class button
await page.click('#cls button:first-child');
console.log('✅ Class selected');
await page.waitForTimeout(500);

// Click go button
await page.click('#go');
console.log('✅ Go button clicked');
await page.waitForTimeout(1000);

// Check final state
const finalState = await page.evaluate(() => ({
  ccOpen: window.gameState.ccOpen,
  ccwDisplay: window.getComputedStyle(document.getElementById('ccw')).display,
  keysObject: Object.keys(window.gameState.keys),
  playerPos: [window.gameState.P.x, window.gameState.P.z]
}));
console.log('Final state:', finalState);

// Now test movement
console.log('\n🎮 Testing movement...');
await page.keyboard.down('KeyW');
await page.waitForTimeout(1500);
await page.keyboard.up('KeyW');
await page.waitForTimeout(500);

const afterMove = await page.evaluate(() => ({
  playerPos: [window.gameState.P.x, window.gameState.P.z],
  vx: window.gameState.P.vx,
  vz: window.gameState.P.vz
}));
console.log('After movement:', afterMove);
console.log(`Movement: ${finalState.playerPos[0] !== afterMove.playerPos[0] || finalState.playerPos[1] !== afterMove.playerPos[1] ? '✅ WORKS' : '❌ FAILED'}`);

await page.waitForTimeout(10000);
await browser.close();
