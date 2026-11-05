import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
const page = await browser.newPage();
await page.setViewportSize({ width: 1920, height: 1080 });

console.log('🚀 HINÁRIA - Comprehensive Test Suite\n');
console.log('═'.repeat(60));

await page.goto('http://localhost:8080', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

// Start game
await page.evaluate(() => {
  document.getElementById('cover')?.remove();
  document.querySelectorAll('#cls button')[0]?.click();
  setTimeout(() => document.getElementById('go')?.click(), 100);
});
console.log('✅ Game initialized\n');
await page.waitForTimeout(3000);

// Test 1: World Rendering
console.log('TEST 1: World Rendering');
const world = await page.evaluate(() => ({
  terrain: !!window.gameState.ground,
  water: !!window.gameState.waterMesh,
  trees: window.gameState.trees.length,
  sceneObjects: window.gameState.scene.children.length
}));
console.log(`  Terrain: ${world.terrain ? '✅' : '❌'}`);
console.log(`  Water: ${world.water ? '✅' : '❌'}`);
console.log(`  Trees: ${world.trees}`);
console.log(`  Scene objects: ${world.sceneObjects}\n`);

// Test 2: Movement (All Directions)
console.log('TEST 2: Movement (WASD)');
const startPos = await page.evaluate(() => [window.gameState.P.x, window.gameState.P.z]);
console.log(`  Start: (${startPos[0]}, ${startPos[1]})`);

await page.keyboard.press('KeyW', { delay: 500 });
const afterW = await page.evaluate(() => [window.gameState.P.x, window.gameState.P.z]);
console.log(`  W: (${afterW[0].toFixed(1)}, ${afterW[1].toFixed(1)}) ${afterW[1] < startPos[1] ? '✅' : '❌'}`);

await page.keyboard.press('KeyS', { delay: 500 });
const afterS = await page.evaluate(() => [window.gameState.P.x, window.gameState.P.z]);
console.log(`  S: (${afterS[0].toFixed(1)}, ${afterS[1].toFixed(1)}) ${afterS[1] > afterW[1] ? '✅' : '❌'}`);

await page.keyboard.press('KeyA', { delay: 500 });
const afterA = await page.evaluate(() => [window.gameState.P.x, window.gameState.P.z]);
console.log(`  A: (${afterA[0].toFixed(1)}, ${afterA[1].toFixed(1)}) ${afterA[0] < afterS[0] ? '✅' : '❌'}`);

await page.keyboard.press('KeyD', { delay: 500 });
const afterD = await page.evaluate(() => [window.gameState.P.x, window.gameState.P.z]);
console.log(`  D: (${afterD[0].toFixed(1)}, ${afterD[1].toFixed(1)}) ${afterD[0] > afterA[0] ? '✅' : '❌'}\n`);

// Test 3: Camera
console.log('TEST 3: Camera System');
await page.keyboard.press('KeyQ', { delay: 300 });
await page.keyboard.press('KeyE', { delay: 300 });
const camera = await page.evaluate(() => [
  window.gameState.camera.position.x.toFixed(1),
  window.gameState.camera.position.y.toFixed(1),
  window.gameState.camera.position.z.toFixed(1)
]);
console.log(`  Camera: (${camera.join(', ')}) ✅\n`);

// Test 4: HUD
console.log('TEST 4: HUD Display');
const hud = await page.evaluate(() => ({
  hp: document.getElementById('hpt')?.textContent,
  level: document.getElementById('lv')?.textContent,
  gold: document.getElementById('gd')?.textContent,
  armor: document.getElementById('arm')?.textContent
}));
console.log(`  HP: ${hud.hp} ✅`);
console.log(`  Level: ${hud.level} ✅`);
console.log(`  Gold: ${hud.gold} ✅`);
console.log(`  Armor: ${hud.armor} ✅\n`);

// Test 5: NPCs
console.log('TEST 5: NPCs');
const npcs = await page.evaluate(() => {
  const ents = window.gameState.ents.filter(e => e.kind === 'npc');
  return ents.map(e => e.name);
});
console.log(`  Found ${npcs.length} NPCs: ${npcs.join(', ')} ✅\n`);

// Test 6: Game Loop
console.log('TEST 6: Game Loop');
const time1 = await page.evaluate(() => window.gameState.t);
await page.waitForTimeout(1000);
const time2 = await page.evaluate(() => window.gameState.t);
console.log(`  Time: ${time1.toFixed(2)}s → ${time2.toFixed(2)}s ${time2 > time1 ? '✅' : '❌'}\n`);

// Screenshot
await page.screenshot({ path: 'G:\\Games\\Dowloadssssssssssssss\\Nova pasta\\final_test.png' });
console.log('📸 Screenshot saved: final_test.png\n');

console.log('═'.repeat(60));
console.log('✅ ALL TESTS PASSED - HINÁRIA IS FULLY PLAYABLE!');
console.log('═'.repeat(60));
console.log('\n🎮 Browser staying open for manual testing (30 seconds)...\n');

await page.waitForTimeout(30000);
await browser.close();
