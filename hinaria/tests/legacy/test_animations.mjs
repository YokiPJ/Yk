import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

const errors = [];
page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', err => {
    errors.push(`PAGE ERROR: ${err.message}`);
});

console.log('🎮 Testing Animation States During Actions\n');

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

// Check initial state
const initial = await page.evaluate(() => {
    const P = window.gameState.P;
    return {
        pos: [P.x.toFixed(1), P.z.toFixed(1)],
        vx: P.vx?.toFixed(3),
        vz: P.vz?.toFixed(3),
        spd: P.spd?.toFixed(3),
        animatorState: P.animator?.state,
        phase: P.animator?.phase?.toFixed(1)
    };
});
console.log('\n📊 Initial state:', initial);

// HOLD W and check state DURING movement
console.log('\n🎮 Holding W key for 2 seconds...');
await page.keyboard.down('KeyW');

// Check state every 500ms during movement
for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(500);
    const during = await page.evaluate(() => {
        const P = window.gameState.P;
        return {
            pos: [P.x.toFixed(1), P.z.toFixed(1)],
            vx: P.vx?.toFixed(3),
            vz: P.vz?.toFixed(3),
            spd: P.spd?.toFixed(3),
            animatorState: P.animator?.state,
            phase: P.animator?.phase?.toFixed(1),
            legRot: P.mesh?.userData?.r?.legs?.[0]?.rotation?.x?.toFixed(3),
            armRRot: P.mesh?.userData?.r?.armR?.rotation?.x?.toFixed(3)
        };
    });
    console.log(`  t=${(i+1)*0.5}s: pos=(${during.pos[0]}, ${during.pos[1]}) v=(${during.vx}, ${during.vz}) spd=${during.spd} state=${during.animatorState} phase=${during.phase} legRot=${during.legRot} armRot=${during.armRRot}`);
}

await page.keyboard.up('KeyW');
await page.waitForTimeout(500);

const afterMove = await page.evaluate(() => {
    const P = window.gameState.P;
    return {
        pos: [P.x.toFixed(1), P.z.toFixed(1)],
        animatorState: P.animator?.state,
        phase: P.animator?.phase?.toFixed(1)
    };
});
console.log(`\n  After release: pos=(${afterMove.pos[0]}, ${afterMove.pos[1]}) state=${afterMove.animatorState} phase=${afterMove.phase}`);

// Test attack - check key binding first
console.log('\n⚔️ Testing attack (key 1)...');
const attackResult = await page.evaluate(() => {
    const P = window.gameState.P;
    // Manually trigger skill 0
    if (P.cds[0] === 0) {
        // Simulate what pressing '1' does
        P.cds[0] = 5; // Set cooldown
        P.at = 0.35; // Attack animation timer
        return { triggered: true, at: P.at, cd: P.cds[0] };
    }
    return { triggered: false, cd: P.cds[0] };
});
console.log('  Manual attack trigger:', attackResult);

if (attackResult.triggered) {
    // Check animation state during attack
    await page.waitForTimeout(100);
    for (let i = 0; i < 5; i++) {
        await page.waitForTimeout(100);
        const during = await page.evaluate(() => {
            const P = window.gameState.P;
            return {
                animatorState: P.animator?.state,
                at: P.at?.toFixed(2),
                phase: P.animator?.phase?.toFixed(1),
                armRRot: P.mesh?.userData?.r?.armR?.rotation?.x?.toFixed(3)
            };
        });
        console.log(`  t=${(i+1)*0.1}s: state=${during.animatorState} at=${during.at} phase=${during.phase} armRot=${during.armRRot}`);
    }
}

await page.screenshot({ path: 'G:\\Games\\Dowloadssssssssssssss\\HINARIA_3D_v2_MODELS\\test_anim.png' });
console.log('\n📸 Screenshot: test_anim.png');

console.log('\n❌ Console Errors:', errors.length);
errors.forEach(e => console.log('  -', e));

console.log('\n✅ Test complete - keeping browser open for 30s...');
await page.waitForTimeout(30000);
await browser.close();