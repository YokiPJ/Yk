import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

const errors = [];
page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
    else if (msg.type() === 'log' && msg.text().startsWith('[ATTACK_TRACE]')) console.log('  BROWSER:', msg.text());
});
page.on('pageerror', err => {
    errors.push(`PAGE ERROR: ${err.message}`);
});

console.log('🎮 Debug Attack Animation\n');

await page.goto('http://localhost:8080', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

// Dismiss cover and start game
await page.evaluate(() => {
    document.getElementById('cover')?.remove();
    document.querySelectorAll('#cls button')[0]?.click();
    setTimeout(() => document.getElementById('go')?.click(), 100);
});
console.log('✅ Game started');
await page.waitForTimeout(3000);

// Patch determineState to trace attack detection
await page.evaluate(() => {
    const P = window.gameState.P;
    const originalDetermineState = P.animator.determineState.bind(P.animator);
    P.animator.determineState = function(entity) {
        const state = originalDetermineState(entity);
        if (entity.at > 0) {
            console.log('[ATTACK_TRACE] determineState: at=', entity.at.toFixed(3), '-> state=', state);
        }
        return state;
    };
});

// Trigger attack and trace
console.log('\n⚔️ Triggering attack...');
await page.evaluate(() => {
    const P = window.gameState.P;
    P.at = 0.35;
    P.cds[0] = 5;
    console.log('[ATTACK_TRACE] Attack triggered, at=', P.at);
});

// Check state every 50ms for 500ms
for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(50);
    const state = await page.evaluate(() => {
        const P = window.gameState.P;
        return {
            at: P.at,
            animatorState: P.animator?.state,
            armRRot: P.mesh?.userData?.r?.armR?.rotation?.x?.toFixed(3),
            phase: P.animator?.phase?.toFixed(1)
        };
    });
    console.log(`  t=${(i+1)*50}ms: at=${state.at.toFixed(3)} state=${state.animatorState} armRot=${state.armRRot} phase=${state.phase}`);
}

await page.screenshot({ path: 'G:\\Games\\Dowloadssssssssssssss\\HINARIA_3D_v2_MODELS\\test_attack.png' });
console.log('\n📸 Screenshot: test_attack.png');

console.log('\n❌ Console Errors:', errors.length);
errors.forEach(e => console.log('  -', e));

console.log('\n✅ Test complete - keeping browser open for 30s...');
await page.waitForTimeout(30000);
await browser.close();