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
console.log('✅ Cover dismissed');
await page.waitForTimeout(1000);

// Complete character creation
const ccDone = await page.evaluate(() => {
  const cc = document.getElementById('cc');
  if (!cc || window.getComputedStyle(cc.parentElement).display === 'none') {
    return true; // Already done
  }
  
  // Select first class
  const classBtn = document.querySelectorAll('#cls button')[0];
  if (classBtn) classBtn.click();
  
  // Wait a bit then click go
  setTimeout(() => {
    const go = document.getElementById('go');
    if (go) go.click();
  }, 100);
  
  return false;
});

if (!ccDone) {
  console.log('✅ Character created');
  await page.waitForTimeout(3000); // Wait for spawn
}

// Comprehensive state check
const state = await page.evaluate(() => {
  const gs = window.gameState;
  const P = gs?.P;
  
  return {
    // Core objects
    renderer: !!gs?.renderer,
    scene: !!gs?.scene,
    camera: !!gs?.camera,
    
    // Player
    playerObject: !!P,
    playerMesh: !!P?.g,
    playerX: P?.x,
    playerZ: P?.z,
    playerHP: P?.hp,
    playerMaxHP: P?.mh,
    playerLevel: P?.lv,
    
    // World
    worldSize: gs?.W,
    terrain: !!gs?.terrain,
    water: !!gs?.water,
    trees: gs?.trees?.length,
    enemies: gs?.enemies?.length,
    sceneChildren: gs?.scene?.children?.length,
    
    // Camera
    cameraX: gs?.camera?.position?.x,
    cameraY: gs?.camera?.position?.y,
    cameraZ: gs?.camera?.position?.z,
    
    // HUD
    hudHP: document.getElementById('hpt')?.textContent,
    hudLevel: document.getElementById('lv')?.textContent,
    hudGold: document.getElementById('gd')?.textContent,
    hudArmor: document.getElementById('arm')?.textContent
  };
});

console.log('\n📊 GAME STATE:');
console.log('─'.repeat(50));
console.log('Core:');
console.log(`  Renderer: ${state.renderer ? '✅' : '❌'}`);
console.log(`  Scene: ${state.scene ? '✅' : '❌'} (${state.sceneChildren} children)`);
console.log(`  Camera: ${state.camera ? '✅' : '❌'} at (${state.cameraX?.toFixed(1)}, ${state.cameraY?.toFixed(1)}, ${state.cameraZ?.toFixed(1)})`);

console.log('\nPlayer:');
console.log(`  Object: ${state.playerObject ? '✅' : '❌'}`);
console.log(`  Mesh: ${state.playerMesh ? '✅' : '❌'}`);
console.log(`  Position: ${state.playerX !== undefined ? `(${state.playerX}, ${state.playerZ})` : '❌ Not set'}`);
console.log(`  HP: ${state.playerHP}/${state.playerMaxHP}`);
console.log(`  Level: ${state.playerLevel}`);

console.log('\nWorld:');
console.log(`  Size: ${state.worldSize}x${state.worldSize}`);
console.log(`  Terrain: ${state.terrain ? '✅' : '❌'}`);
console.log(`  Water: ${state.water ? '✅' : '❌'}`);
console.log(`  Trees: ${state.trees}`);
console.log(`  Enemies: ${state.enemies}`);

console.log('\nHUD:');
console.log(`  HP Display: ${state.hudHP}`);
console.log(`  Level: ${state.hudLevel}`);
console.log(`  Gold: ${state.hudGold}`);
console.log(`  Armor: ${state.hudArmor}`);
console.log('─'.repeat(50));

// Take screenshot
await page.screenshot({ path: 'G:\\Games\\Dowloadssssssssssssss\\Nova pasta\\game_screenshot.png' });
console.log('\n📸 Screenshot saved: game_screenshot.png');

// Test if player can move
if (state.playerX !== undefined) {
  console.log('\n🎮 Testing movement...');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1000);
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(500);
  
  const newPos = await page.evaluate(() => {
    const P = window.gameState?.P;
    return { x: P?.x, z: P?.z };
  });
  
  const moved = newPos.x !== state.playerX || newPos.z !== state.playerZ;
  console.log(`  Result: ${moved ? '✅ Player moved' : '❌ No movement'}`);
  console.log(`  Old: (${state.playerX}, ${state.playerZ})`);
  console.log(`  New: (${newPos.x}, ${newPos.z})`);
}

console.log('\n✅ Test complete - browser will stay open for 20 seconds');
console.log('   Manually check if 3D world is rendering correctly');
await page.waitForTimeout(20000);
await browser.close();
