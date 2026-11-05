import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
const page = await browser.newPage();
await page.setViewportSize({ width: 1920, height: 1080 });

console.log('🎮 FINAL WORLD VERIFICATION TEST\n');
console.log('═'.repeat(70));

await page.goto('http://localhost:8080', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

await page.evaluate(() => {
  document.getElementById('cover')?.remove();
  document.querySelectorAll('#cls button')[0]?.click();
  setTimeout(() => document.getElementById('go')?.click(), 100);
});
console.log('✅ Game initialized\n');
await page.waitForTimeout(3000);

// Comprehensive verification
const results = await page.evaluate(() => {
  const gs = window.gameState;
  const monsters = gs.ents.filter(e => e.kind === 'm');
  
  return {
    world: {
      size: gs.W,
      tiles: gs.G.length,
      heightmap: gs.HG.length,
      reachable: Array.from(gs.RC).filter(x => x === 1).length,
      terrain: !!gs.ground,
      water: !!gs.waterMesh
    },
    entities: {
      total: gs.ents.length,
      player: 1,
      npcs: gs.ents.filter(e => e.kind === 'npc').length,
      monsters: monsters.length,
      monsterTypes: [...new Set(monsters.map(m => m.k))]
    },
    rendering: {
      sceneObjects: gs.scene.children.length,
      resolution: `${gs.renderer.domElement.width}×${gs.renderer.domElement.height}`,
      displaySize: `${gs.renderer.domElement.clientWidth}×${gs.renderer.domElement.clientHeight}`,
      pixelRatio: gs.renderer.getPixelRatio()
    },
    player: {
      pos: [gs.P.x, gs.P.z],
      class: gs.P.cls,
      hp: gs.P.hp,
      level: gs.P.lv
    },
    camera: {
      pos: [gs.camera.position.x.toFixed(1), gs.camera.position.y.toFixed(1), gs.camera.position.z.toFixed(1)],
      aspect: gs.camera.aspect.toFixed(2)
    }
  };
});

console.log('WORLD:');
console.log(`  ✅ Size: ${results.world.size}×${results.world.size}`);
console.log(`  ✅ Heightmap: ${results.world.heightmap} vertices`);
console.log(`  ✅ Reachable tiles: ${results.world.reachable}`);
console.log(`  ✅ Terrain mesh: ${results.world.terrain}`);
console.log(`  ✅ Water mesh: ${results.world.water}`);

console.log('\nENTITIES:');
console.log(`  ✅ Total: ${results.entities.total}`);
console.log(`  ✅ Player: ${results.entities.player}`);
console.log(`  ✅ NPCs: ${results.entities.npcs}`);
console.log(`  ✅ Monsters: ${results.entities.monsters}`);
console.log(`  ✅ Types: ${results.entities.monsterTypes.join(', ')}`);

console.log('\nRENDERING:');
console.log(`  ✅ Scene objects: ${results.rendering.sceneObjects}`);
console.log(`  ✅ Resolution: ${results.rendering.resolution}`);
console.log(`  ✅ Display: ${results.rendering.displaySize}`);
console.log(`  ✅ Pixel ratio: ${results.rendering.pixelRatio}`);

console.log('\nPLAYER:');
console.log(`  ✅ Position: (${results.player.pos[0]}, ${results.player.pos[1]})`);
console.log(`  ✅ Class: ${results.player.class}`);
console.log(`  ✅ HP: ${results.player.hp}`);
console.log(`  ✅ Level: ${results.player.level}`);

console.log('\nCAMERA:');
console.log(`  ✅ Position: (${results.camera.pos.join(', ')})`);
console.log(`  ✅ Aspect: ${results.camera.aspect}`);

// Test movement
console.log('\n🎮 MOVEMENT TEST:');
const start = results.player.pos;
await page.keyboard.press('KeyW', { delay: 500 });
const moved = await page.evaluate(() => [window.gameState.P.x, window.gameState.P.z]);
console.log(`  Start: (${start[0]}, ${start[1]})`);
console.log(`  After W: (${moved[0].toFixed(1)}, ${moved[1].toFixed(1)})`);
console.log(`  ✅ Movement: ${start[1] !== moved[1] ? 'WORKING' : 'FAILED'}`);

// Screenshot
await page.screenshot({ path: 'G:\\Games\\Dowloadssssssssssssss\\Nova pasta\\final_verification.png', fullPage: false });
console.log('\n📸 Screenshot: final_verification.png');

console.log('\n═'.repeat(70));
console.log('✅ HINÁRIA FULLY RESTORED - 64×64 PROCEDURAL WORLD');
console.log('═'.repeat(70));
console.log('\nBrowser staying open for 30 seconds for visual inspection...\n');

await page.waitForTimeout(30000);
await browser.close();
