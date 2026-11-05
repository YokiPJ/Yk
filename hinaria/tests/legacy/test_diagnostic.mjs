import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

console.log('🔍 ENEMY & RENDERING DIAGNOSTIC\n');

await page.goto('http://localhost:8080', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

await page.evaluate(() => {
  document.getElementById('cover')?.remove();
  document.querySelectorAll('#cls button')[0]?.click();
  setTimeout(() => document.getElementById('go')?.click(), 100);
});
await page.waitForTimeout(3000);

const diagnostic = await page.evaluate(() => {
  const gs = window.gameState;
  const enemies = gs.ents.filter(e => e.kind === 'm');
  
  return {
    rc: !!gs.RC,
    rcSet: gs.RC ? Array.from(gs.RC).filter(x => x === 1).length : 0,
    totalEnts: gs.ents.length,
    entsByKind: {
      player: gs.ents.filter(e => e.kind === 'p').length,
      npc: gs.ents.filter(e => e.kind === 'npc').length,
      monster: enemies.length
    },
    enemies: enemies.slice(0, 5).map(e => ({
      kind: e.k,
      pos: [e.x, e.z],
      meshPos: [e.mesh.position.x, e.mesh.position.y, e.mesh.position.z],
      inScene: gs.scene.children.includes(e.mesh),
      hasTag: !!e.tag
    })),
    renderer: {
      pixelRatio: gs.renderer.getPixelRatio(),
      drawingBufferWidth: gs.renderer.domElement.width,
      drawingBufferHeight: gs.renderer.domElement.height,
      clientWidth: gs.renderer.domElement.clientWidth,
      clientHeight: gs.renderer.domElement.clientHeight
    },
    sceneObjects: gs.scene.children.length
  };
});

console.log('═'.repeat(70));
console.log('REACHABILITY:');
console.log(`  RC exists: ${diagnostic.rc ? '✅' : '❌'}`);
console.log(`  Reachable cells: ${diagnostic.rcSet}`);

console.log('\nENTITIES:');
console.log(`  Total: ${diagnostic.totalEnts}`);
console.log(`  Player: ${diagnostic.entsByKind.player}`);
console.log(`  NPCs: ${diagnostic.entsByKind.npc}`);
console.log(`  Monsters: ${diagnostic.entsByKind.monster} ${diagnostic.entsByKind.monster > 0 ? '✅' : '❌'}`);

if (diagnostic.enemies.length > 0) {
  console.log('\nENEMY DETAILS:');
  diagnostic.enemies.forEach((e, i) => {
    console.log(`  ${i + 1}. ${e.kind}:`);
    console.log(`     World pos: (${e.pos[0]}, ${e.pos[1]})`);
    console.log(`     Mesh pos: (${e.meshPos[0].toFixed(1)}, ${e.meshPos[1].toFixed(1)}, ${e.meshPos[2].toFixed(1)})`);
    console.log(`     In scene: ${e.inScene ? '✅' : '❌'}`);
    console.log(`     Has tag: ${e.hasTag ? '✅' : '❌'}`);
  });
}

console.log('\nRENDERER (CRITICAL):');
console.log(`  Pixel ratio: ${diagnostic.renderer.pixelRatio}`);
console.log(`  Drawing buffer: ${diagnostic.renderer.drawingBufferWidth}×${diagnostic.renderer.drawingBufferHeight}`);
console.log(`  Display size: ${diagnostic.renderer.clientWidth}×${diagnostic.renderer.clientHeight}`);
const resolutionOK = diagnostic.renderer.drawingBufferWidth >= diagnostic.renderer.clientWidth * 0.8;
console.log(`  ${resolutionOK ? '✅' : '❌'} Resolution ${resolutionOK ? 'OK' : 'TOO LOW - CAUSES BLUR'}`);

console.log('\nSCENE:');
console.log(`  Total objects: ${diagnostic.sceneObjects}`);

console.log('═'.repeat(70));

await page.screenshot({ path: 'G:\\Games\\Dowloadssssssssssssss\\Nova pasta\\diagnostic.png' });
console.log('\n📸 Screenshot: diagnostic.png\n');

console.log('Browser open for 20 seconds...');
await page.waitForTimeout(20000);
await browser.close();
