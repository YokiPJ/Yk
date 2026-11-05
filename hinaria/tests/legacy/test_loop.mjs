import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

console.log('🚀 Loading HINÁRIA...');
await page.goto('http://localhost:8080', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

// Dismiss cover
await page.evaluate(() => {
  const cover = document.getElementById('cover');
  if (cover) {
    cover.classList.add('out');
    setTimeout(() => cover.remove(), 100);
  }
});
await page.waitForTimeout(1000);

// Complete character creation
await page.evaluate(() => {
  const classBtn = document.querySelectorAll('#cls button')[0];
  if (classBtn) classBtn.click();
  
  setTimeout(() => {
    const go = document.getElementById('go');
    if (go) go.click();
  }, 100);
});
console.log('✅ Character created');
await page.waitForTimeout(3000);

// Check loop state
const loopState = await page.evaluate(() => {
  const gs = window.gameState;
  return {
    animationFrameRunning: !!gs._loopRunning,
    time: gs.t,
    playerMeshInScene: gs.scene?.children.some(c => c.userData?.e === gs.P),
    ccOpen: gs.ccOpen,
    terrainMesh: !!gs.ground,
    waterMesh: !!gs.waterMesh,
    cameraPosition: [gs.camera.position.x, gs.camera.position.y, gs.camera.position.z],
    playerPosition: [gs.P.x, gs.P.z],
    sceneChildren: gs.scene.children.length
  };
});

console.log('\n🔄 Game Loop State:');
console.log('  Animation frame:', loopState.animationFrameRunning);
console.log('  Time:', loopState.time);
console.log('  CC Open:', loopState.ccOpen);
console.log('  Player in scene:', loopState.playerMeshInScene);
console.log('  Terrain mesh:', loopState.terrainMesh);
console.log('  Water mesh:', loopState.waterMesh);
console.log('  Camera:', loopState.cameraPosition);
console.log('  Player:', loopState.playerPosition);
console.log('  Scene children:', loopState.sceneChildren);

// Wait and check if time is advancing
await page.waitForTimeout(1000);
const timeAfter = await page.evaluate(() => window.gameState.t);
console.log(`\n⏱️  Time advancement: ${loopState.time} → ${timeAfter} (${timeAfter > loopState.time ? '✅ Running' : '❌ Stopped'})`);

// Take screenshot
await page.screenshot({ path: 'G:\\Games\\Dowloadssssssssssssss\\Nova pasta\\game_visual.png' });
console.log('📸 Screenshot: game_visual.png');

console.log('\n✅ Keeping browser open for manual inspection (20s)');
await page.waitForTimeout(20000);
await browser.close();
