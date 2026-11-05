import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

console.log('🚀 Loading HINÁRIA...');
await page.goto('http://localhost:8080', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

// Force dismiss cover screen with JavaScript
await page.evaluate(() => {
  const cover = document.getElementById('cover');
  if (cover) {
    cover.classList.add('out');
    setTimeout(() => cover.remove(), 100);
  }
});

console.log('✅ Cover dismissed');
await page.waitForTimeout(2000);

// Check if character creator is showing
const ccVisible = await page.evaluate(() => {
  const cc = document.getElementById('cc');
  return cc && window.getComputedStyle(cc.parentElement).display !== 'none';
});

console.log('Character creator visible:', ccVisible);

if (ccVisible) {
  // Select first class and click go
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('#cls button');
    if (buttons[0]) buttons[0].click();
    
    setTimeout(() => {
      const go = document.getElementById('go');
      if (go) go.click();
    }, 100);
  });
  console.log('✅ Character created');
  await page.waitForTimeout(2000);
}

// Check game state
const gameInfo = await page.evaluate(() => {
  const gs = window.gameState;
  return {
    hasRenderer: !!gs?.renderer,
    hasScene: !!gs?.scene,
    hasCamera: !!gs?.camera,
    hasPlayer: !!gs?.P,
    playerExists: !!gs?.P?.g,
    playerPos: gs?.P ? [gs.P.x.toFixed(1), gs.P.z.toFixed(1)] : null,
    sceneChildren: gs?.scene?.children?.length || 0,
    worldSize: gs?.W || 0,
    trees: gs?.trees?.length || 0,
    enemies: gs?.enemies?.length || 0,
    terrain: gs?.terrain ? 'exists' : 'missing',
    water: gs?.water ? 'exists' : 'missing',
    cameraPos: gs?.camera ? [gs.camera.position.x.toFixed(1), gs.camera.position.y.toFixed(1), gs.camera.position.z.toFixed(1)] : null
  };
});

console.log('\n📊 Game State:');
Object.entries(gameInfo).forEach(([key, value]) => {
  console.log(`  ${key}:`, value);
});

// Take screenshot
await page.screenshot({ path: 'G:\\Games\\Dowloadssssssssssssss\\Nova pasta\\game_screenshot.png' });
console.log('\n📸 Screenshot saved');

// Check HUD
const hudInfo = await page.evaluate(() => {
  return {
    health: document.getElementById('hpt')?.textContent,
    level: document.getElementById('lv')?.textContent,
    gold: document.getElementById('gd')?.textContent,
    armor: document.getElementById('arm')?.textContent,
    hudVisible: !!document.getElementById('hud')
  };
});

console.log('\n🎨 HUD:');
Object.entries(hudInfo).forEach(([key, value]) => {
  console.log(`  ${key}:`, value);
});

// Test movement with keyboard
if (gameInfo.playerExists) {
  console.log('\n🎮 Testing movement (W key)...');
  const startPos = gameInfo.playerPos;
  
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(500);
  
  const endPos = await page.evaluate(() => {
    const gs = window.gameState;
    return gs?.P ? [gs.P.x.toFixed(1), gs.P.z.toFixed(1)] : null;
  });
  
  console.log('  Start:', startPos);
  console.log('  End:', endPos);
  console.log('  Moved:', JSON.stringify(startPos) !== JSON.stringify(endPos) ? '✅ YES' : '❌ NO');
}

// Check console for errors
const errors = await page.evaluate(() => {
  return window.testErrors || [];
});

if (errors.length > 0) {
  console.log('\n❌ JavaScript Errors:', errors);
}

console.log('\n✅ Test complete - keeping browser open for 20 seconds...');
console.log('   Manually inspect the game rendering in the browser window.');
await page.waitForTimeout(20000);
await browser.close();
