import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

console.log('🔍 WORLD DIMENSION VERIFICATION\n');

await page.goto('http://localhost:8080', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

await page.evaluate(() => {
  document.getElementById('cover')?.remove();
  document.querySelectorAll('#cls button')[0]?.click();
  setTimeout(() => document.getElementById('go')?.click(), 100);
});
await page.waitForTimeout(3000);

const worldData = await page.evaluate(() => {
  const gs = window.gameState;
  return {
    W: gs.W,
    G_length: gs.G?.length,
    G_0_length: gs.G?.[0]?.length,
    B_length: gs.B?.length,
    HG_length: gs.HG?.length,
    expectedHG: (gs.W + 1) * (gs.W + 1),
    terrain: {
      exists: !!gs.ground,
      geometry: gs.ground?.geometry ? {
        width: gs.ground.geometry.parameters?.width,
        height: gs.ground.geometry.parameters?.height,
        widthSegments: gs.ground.geometry.parameters?.widthSegments,
        heightSegments: gs.ground.geometry.parameters?.heightSegments
      } : null,
      position: gs.ground ? [gs.ground.position.x, gs.ground.position.y, gs.ground.position.z] : null
    },
    enemies: gs.enemies?.map(e => ({
      kind: e.kind,
      pos: [e.x, e.z],
      meshY: e.mesh?.position?.y,
      heightAt: gs.getHeightAt(e.x, e.z)
    })) || [],
    player: {
      pos: [gs.P.x, gs.P.z],
      meshY: gs.P.mesh?.position?.y,
      heightAt: gs.getHeightAt(gs.P.x, gs.P.z)
    },
    renderer: {
      pixelRatio: gs.renderer?.getPixelRatio(),
      size: gs.renderer ? { 
        width: gs.renderer.domElement.width / gs.renderer.getPixelRatio(),
        height: gs.renderer.domElement.height / gs.renderer.getPixelRatio()
      } : null,
      canvas: {
        width: gs.renderer?.domElement?.width,
        height: gs.renderer?.domElement?.height,
        clientWidth: gs.renderer?.domElement?.clientWidth,
        clientHeight: gs.renderer?.domElement?.clientHeight
      }
    }
  };
});

console.log('═'.repeat(70));
console.log('WORLD DIMENSIONS:');
console.log(`  Declared W: ${worldData.W}`);
console.log(`  G array length: ${worldData.G_length}`);
console.log(`  G[0] array length: ${worldData.G_0_length}`);
console.log(`  B array length: ${worldData.B_length}`);
console.log(`  HG array length: ${worldData.HG_length} (expected: ${worldData.expectedHG})`);
console.log(`  ${worldData.W === 64 && worldData.G_length === 64 ? '✅' : '❌'} World is ${worldData.W}×${worldData.W}`);

console.log('\nTERRAIN MESH:');
console.log(`  Exists: ${worldData.terrain.exists ? '✅' : '❌'}`);
if (worldData.terrain.geometry) {
  console.log(`  Geometry: ${worldData.terrain.geometry.width}×${worldData.terrain.geometry.height}`);
  console.log(`  Segments: ${worldData.terrain.geometry.widthSegments}×${worldData.terrain.geometry.heightSegments}`);
  console.log(`  Position: (${worldData.terrain.position.join(', ')})`);
}

console.log('\nENEMY HEIGHT ANALYSIS:');
console.log(`  Total enemies: ${worldData.enemies.length}`);
worldData.enemies.slice(0, 5).forEach((e, i) => {
  console.log(`  Enemy ${i + 1} (${e.kind}):`);
  console.log(`    Position: (${e.pos[0].toFixed(1)}, ${e.pos[1].toFixed(1)})`);
  console.log(`    Mesh Y: ${e.meshY?.toFixed(2)}`);
  console.log(`    Terrain height: ${e.heightAt?.toFixed(2)}`);
  console.log(`    ${Math.abs((e.meshY || 0) - (e.heightAt || 0)) < 0.5 ? '✅' : '❌'} Aligned`);
});

console.log('\nPLAYER HEIGHT:');
console.log(`  Position: (${worldData.player.pos[0].toFixed(1)}, ${worldData.player.pos[1].toFixed(1)})`);
console.log(`  Mesh Y: ${worldData.player.meshY?.toFixed(2)}`);
console.log(`  Terrain height: ${worldData.player.heightAt?.toFixed(2)}`);
console.log(`  ${Math.abs((worldData.player.meshY || 0) - (worldData.player.heightAt || 0)) < 0.5 ? '✅' : '❌'} Aligned`);

console.log('\nRENDERER:');
console.log(`  Pixel ratio: ${worldData.renderer.pixelRatio}`);
console.log(`  Render size: ${worldData.renderer.size?.width}×${worldData.renderer.size?.height}`);
console.log(`  Canvas buffer: ${worldData.renderer.canvas?.width}×${worldData.renderer.canvas?.height}`);
console.log(`  Canvas display: ${worldData.renderer.canvas?.clientWidth}×${worldData.renderer.canvas?.clientHeight}`);
console.log('═'.repeat(70));

await page.screenshot({ path: 'G:\\Games\\Dowloadssssssssssssss\\Nova pasta\\world_regression.png' });
console.log('\n📸 Screenshot saved: world_regression.png');

console.log('\nBrowser open for 20 seconds for visual inspection...');
await page.waitForTimeout(20000);
await browser.close();
