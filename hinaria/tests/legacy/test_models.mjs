import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

console.log('🎮 Testing Improved Character Models\n');

await page.goto('http://localhost:8080', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

// Check for any import errors
const errors = await page.evaluate(() => {
    return window.testErrors || [];
});

if (errors.length > 0) {
    console.log('❌ Errors detected:');
    errors.forEach(e => console.log('  -', e));
}

// Dismiss cover and start game
await page.evaluate(() => {
    document.getElementById('cover')?.remove();
    document.querySelectorAll('#cls button')[0]?.click();
    setTimeout(() => document.getElementById('go')?.click(), 100);
});
console.log('✅ Game started');
await page.waitForTimeout(3000);

// Check if models loaded
const modelCheck = await page.evaluate(() => {
    const gs = window.gameState;
    return {
        player: !!gs.P?.mesh,
        playerRig: !!gs.P?.mesh?.userData?.r,
        enemies: gs.ents.filter(e => e.kind === 'm').length,
        npcs: gs.ents.filter(e => e.kind === 'npc').length,
        playerAnimator: !!gs.P?.animator
    };
});

console.log('\n📊 Model Check:');
console.log(`  Player mesh: ${modelCheck.player ? '✅' : '❌'}`);
console.log(`  Player rig: ${modelCheck.playerRig ? '✅' : '❌'}`);
console.log(`  Enemies: ${modelCheck.enemies}`);
console.log(`  NPCs: ${modelCheck.npcs}`);
console.log(`  Animator: ${modelCheck.playerAnimator ? '✅' : '❌'}`);

// Test movement
console.log('\n🎮 Testing movement...');
await page.keyboard.down('KeyW');
await page.waitForTimeout(1000);
await page.keyboard.up('KeyW');

const moved = await page.evaluate(() => {
    const gs = window.gameState;
    return gs.P.z < 15;
});
console.log(`  Movement: ${moved ? '✅ WORKS' : '❌ FAILED'}`);

await page.screenshot({ path: 'G:\\Games\\Dowloadssssssssssssss\\HINARIA_3D_v2_MODELS\\test_models.png' });
console.log('\n📸 Screenshot: test_models.png');

console.log('\n✅ Test complete - browser open for 20 seconds');
await page.waitForTimeout(20000);
await browser.close();
