import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 720 });

console.log('🚀 Loading HINÁRIA...');
await page.goto('http://localhost:8080', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

// Dismiss cover and create character
await page.evaluate(() => {
  document.getElementById('cover')?.remove();
  const classBtn = document.querySelectorAll('#cls button')[0];
  if (classBtn) classBtn.click();
  setTimeout(() => document.getElementById('go')?.click(), 100);
});
console.log('✅ Game started');
await page.waitForTimeout(3000);

// Comprehensive state check
const state = await page.evaluate(() => {
  const gs = window.gameState;
  return {
    renderer: !!gs.renderer,
    scene: !!gs.scene,
    sceneChildren: gs.scene.children.length,
    terrain: !!gs.ground,
    water: !!gs.waterMesh,
    player: !!gs.P,
    playerMesh: !!gs.P?.g,
    camera: [gs.camera.position.x.toFixed(1), gs.camera.position.y.toFixed(1), gs.camera.position.z.toFixed(1)],
    playerPos: [gs.P.x, gs.P.z],
    trees: gs.trees.length,
    enemies: gs.enemies?.length || 0,
    npcs: gs.ents.filter(e => e.kind === 'npc').length,
    time: gs.t.toFixed(2)
  };
});

console.log('\n📊 GAME STATE:');
console.log(`  Scene: ${state.sceneChildren} objects`);
console.log(`  Terrain: ${state.terrain ? '✅' : '❌'}`);
console.log(`  Water: ${state.water ? '✅' : '❌'}`);
console.log(`  Trees: ${state.trees}`);
console.log(`  Enemies: ${state.enemies}`);
console.log(`  NPCs: ${state.npcs}`);
console.log(`  Player mesh: ${state.playerMesh ? '✅' : '❌'}`);
console.log(`  Camera: (${state.camera.join(', ')})`);
console.log(`  Player: (${state.playerPos.join(', ')})`);
console.log(`  Time: ${state.time}s`);

// Test movement with longer press
console.log('\n🎮 Testing movement (W for 2 seconds)...');
const startPos = state.playerPos;
await page.keyboard.down('KeyW');
await page.waitForTimeout(2000);
await page.keyboard.up('KeyW');
await page.waitForTimeout(500);

const endPos = await page.evaluate(() => {
  const gs = window.gameState;
  return [gs.P.x, gs.P.z];
});

const moved = startPos[0] !== endPos[0] || startPos[1] !== endPos[1];
console.log(`  Start: (${startPos.join(', ')})`);
console.log(`  End: (${endPos.join(', ')})`);
console.log(`  Movement: ${moved ? '✅ WORKING' : '❌ FAILED'}`);

// Test camera rotation
console.log('\n🔄 Testing camera (Q key)...');
await page.keyboard.down('KeyQ');
await page.waitForTimeout(1000);
await page.keyboard.up('KeyQ');
console.log('  Camera rotation: Executed');

// Screenshot
await page.screenshot({ path: 'G:\\Games\\Dowloadssssssssssssss\\Nova pasta\\gameplay_test.png', fullPage: false });
console.log('\n📸 Screenshot: gameplay_test.png');

// Check HUD values
const hud = await page.evaluate(() => ({
  hp: document.getElementById('hpt')?.textContent,
  level: document.getElementById('lv')?.textContent,
  gold: document.getElementById('gd')?.textContent
}));
console.log('\n🎨 HUD:');
console.log(`  HP: ${hud.hp}`);
console.log(`  Level: ${hud.level}`);
console.log(`  Gold: ${hud.gold}`);

console.log('\n✅ ALL TESTS COMPLETE');
console.log('📌 Browser staying open for 30 seconds - VISUALLY VERIFY 3D RENDERING');
await page.waitForTimeout(30000);
await browser.close();
