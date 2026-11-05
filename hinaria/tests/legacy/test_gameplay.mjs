import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

console.log('🚀 Loading HINÁRIA...');
await page.goto('http://localhost:8080', { waitUntil: 'networkidle', timeout: 30000 });

// Wait for game to initialize
await page.waitForTimeout(3000);

// Click play button to dismiss cover
await page.click('#play');
console.log('✅ Clicked play button');

await page.waitForTimeout(2000);

// Check game state
const gameInfo = await page.evaluate(() => {
  const gs = window.gameState;
  return {
    hasRenderer: !!gs?.renderer,
    hasScene: !!gs?.scene,
    hasCamera: !!gs?.camera,
    hasPlayer: !!gs?.P,
    playerPos: gs?.P ? [gs.P.x, gs.P.z] : null,
    sceneChildren: gs?.scene?.children?.length || 0,
    worldSize: gs?.W || 0,
    trees: gs?.trees?.length || 0,
    enemies: gs?.enemies?.length || 0,
    cameraPos: gs?.camera ? [gs.camera.position.x.toFixed(1), gs.camera.position.y.toFixed(1), gs.camera.position.z.toFixed(1)] : null,
    isPlaying: !!gs?.P?.g
  };
});

console.log('\n📊 Game State:');
console.log('  Renderer:', gameInfo.hasRenderer);
console.log('  Scene:', gameInfo.hasScene);
console.log('  Camera:', gameInfo.hasCamera);
console.log('  Player:', gameInfo.hasPlayer);
console.log('  Player position:', gameInfo.playerPos);
console.log('  Scene children:', gameInfo.sceneChildren);
console.log('  World size:', gameInfo.worldSize);
console.log('  Trees:', gameInfo.trees);
console.log('  Enemies:', gameInfo.enemies);
console.log('  Camera position:', gameInfo.cameraPos);
console.log('  Is playing:', gameInfo.isPlaying);

// Take screenshot
await page.screenshot({ path: 'G:\\Games\\Dowloadssssssssssssss\\Nova pasta\\game_screenshot.png' });
console.log('📸 Screenshot saved to game_screenshot.png');

// Test movement
console.log('\n🎮 Testing keyboard movement (W key)...');
await page.keyboard.down('KeyW');
await page.waitForTimeout(1000);
await page.keyboard.up('KeyW');

const newPos = await page.evaluate(() => {
  const gs = window.gameState;
  return gs?.P ? [gs.P.x, gs.P.z] : null;
});

console.log('  New position:', newPos);
console.log('  Position changed:', JSON.stringify(gameInfo.playerPos) !== JSON.stringify(newPos) ? '✅ YES' : '❌ NO');

// Check HUD
const hudInfo = await page.evaluate(() => {
  return {
    health: document.getElementById('hpt')?.textContent,
    level: document.getElementById('lv')?.textContent,
    gold: document.getElementById('gd')?.textContent,
    armor: document.getElementById('arm')?.textContent
  };
});

console.log('\n🎨 HUD Info:');
console.log('  Health:', hudInfo.health);
console.log('  Level:', hudInfo.level);
console.log('  Gold:', hudInfo.gold);
console.log('  Armor:', hudInfo.armor);

console.log('\n✅ Test complete - keeping browser open for 15 seconds...');
await page.waitForTimeout(15000);
await browser.close();
