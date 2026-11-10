/**
 * Main Game Loop
 */

import * as THREE from 'three';
import { syncGameFlow } from './gameFlow.js';
import { CONFIG, GAME_IDENTITY, DIRECTIONS_8 } from './config.js';
import { gameState } from './gameState.js';
import { updateWorld, getHeightAt, findPath, occ, near, still, inSafeZone, stepEntity, ri, rnd } from '../world/world.js';
import { updateNPCs } from '../npc/npc.js';
import { openDialogue, updateDialogueUI } from '../ui/dialogueUI.js';
import { tickHouse } from '../world/houseInteriors.js';
import { questTick } from '../quest/questUI.js';
import { cutsceneTick, cutsceneCameraPass } from '../cutscene/cutsceneSystem.js';
import { updateProjectiles, updateEffects, dealDamage, fireProjectile, ENEMY_KINDS, SPAWN_ZONES, spawnEnemy } from '../combat/combat.js';
import { updateWorldUI, updateFloatingText, updateTags, say, updateHUD as updateHUDFromUI } from '../ui/hud.js';
import { CLASSES, POWERS, ARMORS, updateSkillUI } from '../player/player.js';
import { updateEntityAnimation } from '../player/characterAnimator.js';
import { equippedWeapon } from '../player/arsenal.js';
import { tickPerformance, getFrameLimit } from '../ui/performanceUI.js';
import { createFramePacer } from './renderProfile.js';
import { tickDiagnostics } from '../ui/qaDiagnostics.js';
import { tickLore } from '../lore/loreSystem.js';
import { updateChunkVisibility } from '../world/chunkVisibility.js';
import { updateGameAudio } from '../audio/gameAudio.js';
import { combatV2 } from '../combat/combatV2.js';
import { tickCombatV2, cancelCombatV2, getDodgeMotion, abortCombatDodgeOnCollision, getAttackFacing } from '../combat/combatV2Bridge.js';
import { tickReplayAxe } from '../combat/replayAxeSystem.js';
import { hasLineOfSight } from '../combat/forwardHit.js';
import { tickVisualAtmosphere } from '../vfx/worldAtmosphereV3.js';
import { tickClaudeVfx } from '../vfx/claudeVfxBridge.js';

export function initLoop() {
    // Initial HUD
    updateWorldUI(0);
    
    gameState.lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

let lastLoopError=0;
const framePacer=createFramePacer();
function renderWorld(){
    gameState.worldLightBudget?.update(gameState.P?.x,gameState.P?.z);
    gameState.renderer.render(gameState.scene,gameState.camera);
}
function gameLoop(now){
    const limit=['PAUSED','DIALOGUE','DEAD'].includes(gameState.flow)?Math.min(30,getFrameLimit()):getFrameLimit();
    if(!framePacer.shouldRender(now,limit)){requestAnimationFrame(gameLoop);return;}
    try { return tickGameFrame(now); }
    catch(error){
        // A single asset/UI error must not permanently stop animation frames.
        if(now-lastLoopError>2500){console.error('[HINÁRIA] Frame interrompido; retomando:',error);lastLoopError=now;}
        gameState.lastTime=now;
        requestAnimationFrame(gameLoop);
    }
}
function tickGameFrame(now) {
    const frameSeconds = Math.max(0, (now - gameState.lastTime) / 1000);
    const d0 = Math.min(0.05, frameSeconds);
    const mode = syncGameFlow();
    const dt = mode === 'PLAYING' ? d0 : 0;
    gameState.lastTime = now;
    // The opaque title owns a disposable renderer. Never draw the entire world
    // behind it, and never spend GPU work while the WebView is backgrounded.
    if (mode === 'BOOT' || mode === 'TITLE' || document.hidden) {
        gameState.renderer.info?.reset?.();
        tickPerformance(frameSeconds);
        tickDiagnostics(frameSeconds);
        requestAnimationFrame(gameLoop);
        return;
    }
    // Pause before AI, cooldowns, world callbacks and respawn queues. A zero-dt
    // AI pass can still inflict damage when an enemy cooldown is already zero.
    if (['BOOT','TITLE','PAUSED','DIALOGUE','DEAD','CHARACTER_CREATION'].includes(mode)) {
        if (gameState.insideHouse) tickHouse(0);
        else {
            if (mode === 'CHARACTER_CREATION') updateCamera(d0);
            renderWorld();
        }
        updateDialogueUI();
        tickPerformance(frameSeconds);
        tickDiagnostics(frameSeconds);
        requestAnimationFrame(gameLoop);
        return;
    }
    cutsceneTick(d0);
    syncGameFlow();
    // Durante a cinematografia, preserva integralmente a simulação do jogo:
    // sem movimentação, ataques automáticos, IA, missões ou cooldowns avançando.
    if (gameState.cutsceneActive) {
        updateChunkVisibility(gameState.P?.x,gameState.P?.z,true);
        cancelCombatV2();
        if (gameState.insideHouse) tickHouse(0);
        else {
            cutsceneCameraPass(gameState.camera);
            renderWorld();
        }
        tickPerformance(frameSeconds);
        tickDiagnostics(frameSeconds);
        requestAnimationFrame(gameLoop);
        return;
    }
    if (gameState.insideHouse) {
        cancelCombatV2();
        updateGameAudio(gameState);
        tickHouse((gameState.ccOpen || gameState.arsenalOpen || gameState.dialogueOpen) ? 0 : d0);
        updateDialogueUI();
        tickPerformance(frameSeconds);
        tickDiagnostics(frameSeconds);
        requestAnimationFrame(gameLoop);
        return;
    }
    gameState.t += dt;
    gameState.part2Director?.tick(dt);
    for (let i=gameState.enemyRespawns.length-1;i>=0;i--) {
        const pending=gameState.enemyRespawns[i];
        if(pending.due<=gameState.t) {
            gameState.enemyRespawns.splice(i,1);
            spawnEnemy(pending.kind,pending.zone);
        }
    }
    
    // Cooldowns
    gameState.P.cd = Math.max(0, gameState.P.cd - dt);
    for (let i = 0; i < 4; i++) gameState.P.cds[i] = Math.max(0, gameState.P.cds[i] - dt);
    for (const k in gameState.P.b) if ((gameState.P.b[k] -= dt) <= 0) delete gameState.P.b[k];
    
    // Mana regen
    const c = CLASSES[gameState.P.cls];
    const weapon = equippedWeapon(gameState.P);
    const attackRange = weapon.range;
    gameState.P.mana = Math.min(gameState.P.mm, gameState.P.mana + c.mr * dt);
    tickReplayAxe(gameState.P,gameState.t);
    
    // Input movement - get joystick values from controls
    let mx = (gameState.keys.d || gameState.keys.ArrowRight ? 1 : 0) - (gameState.keys.a || gameState.keys.ArrowLeft ? 1 : 0) + (gameState.jx || 0);
    let mz = (gameState.keys.s || gameState.keys.ArrowDown ? 1 : 0) - (gameState.keys.w || gameState.keys.ArrowUp ? 1 : 0) + (gameState.jz || 0);
    const q = Math.hypot(mx, mz);
    if (q > 1) { mx /= q; mz /= q; }
    if (gameState.ccOpen) mx = mz = 0;
    const man = mx !== 0 || mz !== 0;
    
    // No persistent target selection or enemy ring; aim lives only during a swing.
    gameState.tgt = null;

    // Ataques exigem input; a direção é assistida durante o golpe.
    // O loop só avança a FSM do Combo V2, que requer input explícito de ataque.
    tickCombatV2(dt);

    // Greet NPCs
    if (gameState.P && gameState.P.greet && gameState.P.path && (near(gameState.P, gameState.N) <= 2 || near(gameState.P, gameState.Y) <= 2) && !gameState.P.path.length) {
        gameState.P.greet = false;
        openDialogue();
    }
    
    // Update all entities; avoid full rig pose calculations for faraway mobs.
    for (const e of gameState.ents) {
        if (e === gameState.P) {
            movePlayer(dt, mx, mz);
        } else if (e.kind === 'm') {
            // Distant mobs are dormant; near mobs retain original full-rate movement.
            if (!(e.st?.stun > 0) && Math.hypot(e.x-gameState.P.x,e.z-gameState.P.z) < 36)
                stepEntity(e, dt, 3.2 * e.K.sp * (e.st.slow > 0 ? 0.5 : 1));
        }
        if (e.kind !== 'm' || e.isBoss || Math.hypot(e.x - gameState.P.x, e.z - gameState.P.z) < 19)
            animateEntity(e, dt);
    }
    
    // Enemy AI
    updateEnemyAI(dt);
    
    // HP regen
    gameState.P.reg = (gameState.P.reg || 0) + dt;
    if (gameState.P.reg > 3) { gameState.P.reg = 0; if (gameState.P.hp < gameState.P.max) { gameState.P.hp++; updateHUDFromUI(); } }
    
    // Camera
    updateCamera(dt);
    
    // Update skill buttons
    const kc = gameState.P.cds.map(Math.ceil).join();
    if (kc !== gameState.P.kc) { gameState.P.kc = kc; updateSkillUI(); }
    
    // Replay history
    gameState.hT += dt;
    if (gameState.hT >= 0.25) { 
        gameState.hT = 0; 
        if (gameState.hist && gameState.P) gameState.hist.push({ x: gameState.P.tx, z: gameState.P.tz, hp: gameState.P.hp }); 
        if (gameState.hist && gameState.hist.length > 16) gameState.hist.shift(); 
    }
    
    // Replay cooldown
    gameState.P.rc = Math.max(0, gameState.P.rc - dt);
    const rk = Math.ceil(gameState.P.rc);
    if (rk !== gameState.P.rk) { gameState.P.rk = rk; { const btn=document.getElementById('s3');
        if(btn){btn.replaceChildren(); const k=document.createElement('span'); k.className='skill-key';k.textContent='4';
        const n=document.createElement('span');n.className='skill-label';n.textContent='Replay';btn.append(k,n);
        if(rk>0){const c=document.createElement('span');c.className='skill-cd';c.textContent=rk;btn.append(c);}
        btn.setAttribute('aria-label','Replay'+(rk>0? ', recarga '+rk+' segundos':'')); } } }
    
    // Enemy status effects
    for (const m of gameState.ents.slice()) if (m.kind === 'm') {
        for (const k in m.st) if ((m.st[k] -= dt) <= 0) delete m.st[k];
        if (m.st.stun) m.path = [];
        if (m.st.burn) { m.bn = (m.bn || 0) + dt; if (m.bn >= 0.6) { m.bn = 0; dealDamage(null, m, 2 + gameState.P.lv); } }
    }
    
    // World & UI
    updateWorld(dt);
    tickVisualAtmosphere(gameState.P, dt, gameState.t);
    updateChunkVisibility(gameState.P?.x,gameState.P?.z,gameState.cutsceneActive);
    updateWorldUI(dt);
    tickLore(dt);
    updateProjectiles(dt);
    updateEffects(dt);
    tickClaudeVfx(dt);
    updateFloatingText(dt);
    updateNPCs(dt);
    questTick(dt);
    updateDialogueUI();
    // Labels follow 3D heads on EVERY rendered frame, not at 11 FPS while
    // the game runs at 60 FPS. No forced 90 ms snap/jitter on camera pan.
    updateTags();
    updateGameAudio(gameState);
    tickPerformance(frameSeconds);
    tickDiagnostics(frameSeconds);
    
    // Render
    cutsceneCameraPass(gameState.camera);
    renderWorld();
    requestAnimationFrame(gameLoop);
}

function movePlayer(dt, mx, mz) {
    const P = gameState.P;
    P.vx = P.vx || 0; P.vz = P.vz || 0; P.spd = P.spd || 0;
    
    if (gameState.ccOpen || dt <= 0) { P.vx = P.vz = 0; P.spd = 0; P.stp = 0; return; }
    // Movimento de esquiva na MESMA validação de colisão usada ao andar.
    const dodgeMotion=getDodgeMotion();
    if (dodgeMotion) {
        const dx = dodgeMotion.dir.x * dodgeMotion.speed * dt;
        const dz = dodgeMotion.dir.z * dodgeMotion.speed * dt;
        let moved = false;
        if (!checkPlayerBlock(P.x + dx, P.z)) { P.x += dx; moved = true; }
        if (!checkPlayerBlock(P.x, P.z + dz)) { P.z += dz; moved = true; }
        P.tx = Math.round(P.x); P.tz = Math.round(P.z);
        P.mesh.position.set(P.x, getHeightAt(P.x, P.z), P.z);
        P.vx = P.vz = 0; P.spd = moved ? dodgeMotion.speed : 0;
        P.stp = 0;
        if (!moved) abortCombatDodgeOnCollision();
        return;
    }
    
    const vmax = 4.6 * (P.b.haste > 0 ? 1.6 : 1);
    const ox = P.x, oz = P.z;
    const mg = Math.hypot(mx, mz);
    let tvx = 0, tvz = 0;
    
    if (mg > 0.001) {
        if (P.path && P.path.length) P.path.length = 0;
        const s = Math.sin(gameState.yaw), c = Math.cos(gameState.yaw);
        const k = Math.min(1, mg) / mg * vmax;
        tvx = (mx * c + mz * s) * k;
        tvz = (-mx * s + mz * c) * k;
    }
    
    if (mg > 0.001 || P.vx || P.vz) {
        P.stp = 0;
        const dx = tvx - P.vx, dz = tvz - P.vz, dl = Math.hypot(dx, dz);
        const ac = (mg > 0.001 ? 30 : 34) * dt;
        if (dl <= ac || dl < 1e-4) { P.vx = tvx; P.vz = tvz; }
        else { P.vx += dx / dl * ac; P.vz += dz / dl * ac; }
        if (mg <= 0.001 && Math.abs(P.vx) + Math.abs(P.vz) < 0.05) P.vx = P.vz = 0;
        
        let nx = P.x + P.vx * dt;
        if (!checkPlayerBlock(nx, P.z)) P.x = nx; else { P.vx = 0; }
        let nz = P.z + P.vz * dt;
        if (!checkPlayerBlock(P.x, nz)) P.z = nz; else { P.vz = 0; }
        
        P.tx = Math.round(P.x); P.tz = Math.round(P.z);
        
        if (P.vx * P.vx + P.vz * P.vz > 0.16) {
            let da = Math.atan2(P.vx, P.vz) - P.mesh.rotation.y;
            da = Math.atan2(Math.sin(da), Math.cos(da));
            P.mesh.rotation.y += da * Math.min(1, dt * 14);
        }
        P.mesh.position.set(P.x, getHeightAt(P.x, P.z), P.z);
    } else if (P.path && P.path.length || P.stp) {
        P.stp = 1;
        stepEntity(P, dt, vmax);
        if (!P.path.length && Math.hypot(P.tx - P.x, P.tz - P.z) < 0.001) P.stp = 0;
    }
    const attackFacing = getAttackFacing();
    if (attackFacing !== null) P.mesh.rotation.y = attackFacing;
    
    P.spd += (Math.hypot(P.x - ox, P.z - oz) / dt - P.spd) * Math.min(1, dt * 18);
    if (P.spd < 0.02) P.spd = 0;
}

function checkPlayerBlock(x, z) {
    const PR = 0.28;
    const x0 = Math.floor(x - PR + 0.5), x1 = Math.floor(x + PR + 0.5);
    const z0 = Math.floor(z - PR + 0.5), z1 = Math.floor(z + PR + 0.5);
    for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
        if (cx < 0 || cz < 0 || cx >= gameState.W || cz >= gameState.W || gameState.B[cx][cz]) return true;
        for (let i = 0; i < gameState.ents.length; i++) {
            const e = gameState.ents[i];
            if (e !== gameState.P && e.tx === cx && e.tz === cz && !(Math.abs(gameState.P.x - cx) < 0.5 + PR && Math.abs(gameState.P.z - cz) < 0.5 + PR)) return true;
        }
    }
    return false;
}

function animateEntity(e, dt) {
    // Apply pose BEFORE advancing timers so an attack lasts the full 0.35 s.
    updateEntityAnimation(e, dt);
    e.at = Math.max(0, (e.at || 0) - dt / 0.35);
    e.fl = Math.max(0, (e.fl || 0) - dt);

    // Status effect color tinting (preserved from original)
    const bf = e.b || {}, st = e.st || {}, v = e.fl > 0 ? 0x882222 : st.stun > 0 ? 0x666600 : st.burn > 0 ? 0x662200 : st.slow > 0 ? 0x113a66 : bf.guard > 0 ? 0x223a77 : bf.rage > 0 ? 0x772200 : 0;
    if (v !== e.fv) { 
        e.fv = v; 
        e.mesh.traverse(o => { 
            const m = o.material; 
            if (m && !m.userData.g && m.emissive) m.emissive.setHex(v); 
        }); 
    }
}

function updateCamera(dt) {
    gameState.L.lerp(new THREE.Vector3(gameState.P.x, gameState.P.mesh.position.y, gameState.P.z), 1 - Math.pow(0.85, dt * 60));
    gameState.Z += ((gameState.ccOpen ? 1 : 0) - gameState.Z) * Math.min(1, dt * 5);
    gameState.yaw += ((gameState.keys.e ? 1 : 0) - (gameState.keys.q ? 1 : 0)) * dt * 1.8;
    const zm = 1 + (gameState.zoom - 1) * (1 - gameState.Z);
    const hd = (8.5 - 4.9 * gameState.Z) * zm;
    gameState.camera.position.set(
        gameState.L.x + Math.sin(gameState.yaw) * hd,
        gameState.L.y + (10.5 - 7.9 * gameState.Z) * zm,
        gameState.L.z + Math.cos(gameState.yaw) * hd
    );
    gameState.camera.lookAt(gameState.L.x, gameState.L.y + 0.9 * gameState.Z, gameState.L.z);
    
    if (gameState.ccOpen) gameState.P.mesh.rotation.y += dt * 0.9;
}

function updateEnemyAI(dt) {
    for (const m of gameState.ents.slice()) if (m.kind === 'm' && !m.st.stun) {
        // Preserve close-combat timing. Far mobs do not run pathfinding every frame.
        const worldDistance=Math.hypot(m.x-gameState.P.x,m.z-gameState.P.z);
        if (worldDistance > 38) { m.path=[]; continue; }
        m.cd -= dt;
        const d = near(m, gameState.P);
        if (d <= 1 && !inSafeZone(m.tx, m.tz) && hasLineOfSight(gameState,m.x,m.z,gameState.P.x,gameState.P.z)) {
            m.path = [];
            if (m.cd <= 0 && still(m)) { m.cd = m.K.ac; dealDamage(m, gameState.P, ri(...m.K.dmg)); }
        } else if (d <= m.K.ag && !inSafeZone(m.tx, m.tz)) {
            m.cd = Math.max(m.cd, 0.8);
            m.rp -= dt;
            if (m.rp <= 0) {
                m.rp = 0.45;
                const p = findPath(m.tx, m.tz, gameState.P.tx, gameState.P.tz, m);
                if (p) { p.pop(); m.path = p; }
            }
        } else if (m.path && !m.path.length && Math.random() < dt * 0.5) {
            const q = DIRECTIONS_8[ri(0, 3)];
            const wx = m.tx + q[0], wz = m.tz + q[1];
            if (gameState.ZN[wx] && gameState.ZN[wx][wz] === m.hz) m.path = [[wx, wz]];
        }
    }
}
