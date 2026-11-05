import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

const errors = [];
const warnings = [];

page.on('console', msg => {
    if (msg.type() === 'error') {
        errors.push(msg.text());
    } else if (msg.type() === 'warning') {
        warnings.push(msg.text());
    }
});

page.on('pageerror', err => {
    errors.push(`PAGE ERROR: ${err.message}`);
});

console.log('🎮 Testing Improved Character Models - Console Check\n');

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

// Check console
console.log('\n📋 Console Errors:', errors.length);
errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));

console.log('\n📋 Console Warnings:', warnings.length);
warnings.forEach((w, i) => console.log(`  ${i + 1}. ${w}`));

// Check game state
const state = await page.evaluate(() => {
    const gs = window.gameState;
    const P = gs.P;
    return {
        player: {
            x: P.x,
            z: P.z,
            hp: P.hp,
            max: P.max,
            cls: P.cls,
            hasAnimator: !!P.animator
        },
        renderer: {
            width: gs.renderer.domElement.width,
            height: gs.renderer.domElement.height,
            pixelRatio: gs.renderer.getPixelRatio()
        },
        scene: {
            children: gs.scene.children.length,
            hasGround: !!gs.ground,
            hasWater: !!gs.waterMesh
        },
        enemies: gs.ents.filter(e => e.kind === 'm').length,
        npcs: gs.ents.filter(e => e.kind === 'npc').length,
        time: gs.t
    };
});

console.log('\n📊 Game State:');
console.log(`  Player: (${state.player.x.toFixed(1)}, ${state.player.z.toFixed(1)}) HP: ${state.player.hp}/${state.player.max}`);
console.log(`  Class: ${state.player.cls}`);
console.log(`  Has Animator: ${state.player.hasAnimator ? '✅' : '❌'}`);
console.log(`  Renderer: ${state.renderer.width}x${state.renderer.height} @ ${state.renderer.pixelRatio}`);
console.log(`  Scene children: ${state.scene.children}`);
console.log(`  Enemies: ${state.enemies}`);
console.log(`  NPCs: ${state.npcs}`);

// Test movement with animation state check
console.log('\n🎮 Testing movement with animation...');
await page.keyboard.down('KeyW');
await page.waitForTimeout(1500);
await page.keyboard.up('KeyW');
await page.waitForTimeout(500);

const afterMove = await page.evaluate(() => {
    const gs = window.gameState;
    const P = gs.P;
    return {
        pos: [P.x.toFixed(1), P.z.toFixed(1)],
        animatorState: P.animator?.state,
        phase: P.animator?.phase,
        armRRotX: P.mesh?.userData?.r?.armR?.rotation?.x?.toFixed(3),
        legRotX: P.mesh?.userData?.r?.legs?.[0]?.rotation?.x?.toFixed(3)
    };
});

console.log(`  New position: (${afterMove.pos[0]}, ${afterMove.pos[1]})`);
console.log(`  Animation state: ${afterMove.animatorState || 'none'}`);
console.log(`  Phase: ${afterMove.phase?.toFixed(1) || 'N/A'}`);
console.log(`  Right arm rotation: ${afterMove.armRRotX || 'N/A'}`);
console.log(`  Leg rotation: ${afterMove.legRotX || 'N/A'}`);

// Test attack
console.log('\n⚔️ Testing attack...');
await page.keyboard.press('Digit1');
await page.waitForTimeout(500);

const afterAttack = await page.evaluate(() => {
    const gs = window.gameState;
    const P = gs.P;
    return {
        animatorState: P.animator?.state,
        at: P.at?.toFixed(2),
        cds: P.cds?.map(c => c.toFixed(1))
    };
});

console.log(`  Animation state: ${afterAttack.animatorState || 'none'}`);
console.log(`  Attack timer: ${afterAttack.at || 'N/A'}`);
console.log(`  Cooldowns: [${afterAttack.cds?.join(', ') || 'N/A'}]`);

await page.screenshot({ path: 'G:\\Games\\Dowloadssssssssssssss\\HINARIA_3D_v2_MODELS\\test_detailed.png' });
console.log('\n📸 Screenshot: test_detailed.png');

console.log('\n✅ Test complete - keeping browser open for 30s for visual inspection...');
await page.waitForTimeout(30000);
await browser.close();