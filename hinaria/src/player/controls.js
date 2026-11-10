/**
 * Input Controls - Keyboard, Mouse, Touch, Virtual Joystick
 */

import * as THREE from 'three';
import { CONFIG, KEYS } from '../core/config.js';
import { finishCharacterCreation } from '../core/gameFlow.js';
import { gameState } from '../core/gameState.js';
import { say } from '../ui/hud.js';
import { castSkill, replay } from '../combat/combat.js';
import { buildCharacterCreatorUI, setClass } from '../player/player.js';
import { playClaudeVfx } from '../vfx/claudeVfxBridge.js';
import { openDialogue, closeDialogue } from '../ui/dialogueUI.js';
import { inspectHouseObject } from '../world/houseInteriors.js';
import { findPath } from '../world/world.js';
import { openArsenal } from '../ui/arsenalUI.js';
import { requestManualAttack, requestCombatV2Dodge, toggleCombatV2, cancelCombatV2, initCombatV2Preference } from '../combat/combatV2Bridge.js';
import { requestAxeAwakening } from '../combat/replayAxeSystem.js';

let yaw = 0;
let zoom = 1;
let pd = null;
let pdist = 0;
const ptr = {};

const joy = document.getElementById('joy');
const knob = document.getElementById('knob');
const DZ = 0.14;
let jid = null;
let jx = 0;
let jz = 0;
let cvs = null; // Initialized by initControls; shared by pointer handlers
let joystickRect=null;

function gameplayInputAllowed() {
    return (!gameState.flow || gameState.flow === 'PLAYING') && !gameState.pauseRequested &&
      !gameState.ccOpen && !gameState.arsenalOpen && !gameState.dialogueOpen &&
      !gameState.cutsceneActive && !document.hidden;
}
function jset(e) {
    // Magnitude must be computed BEFORE applying the deadzone. The old code
    // referenced `f` inside its own initializer and threw on every touch.
    const r = joystickRect||(joystickRect=joy.getBoundingClientRect());
    const radius = Math.max(1, Math.min(r.width, r.height) / 2);
    const dxRaw = e.clientX - (r.left + r.width / 2);
    const dyRaw = e.clientY - (r.top + r.height / 2);
    const distance = Math.hypot(dxRaw, dyRaw);
    const normalized = Math.min(1, distance / radius);
    const clamped = Math.min(distance, radius);
    const unitX = distance > 1e-6 ? dxRaw / distance : 0;
    const unitZ = distance > 1e-6 ? dyRaw / distance : 0;
    knob.style.transform = `translate3d(${unitX * clamped}px,${unitZ * clamped}px,0)`;
    const magnitude = normalized <= DZ ? 0 : Math.min(1, (normalized - DZ) / (0.9 - DZ));
    jx = unitX * magnitude;
    jz = unitZ * magnitude;
    // The movement loop reads gameState, not these module-local variables.
    gameState.jx = jx;
    gameState.jz = jz;
}
function jreset() {
    joystickRect=null;
    jid = null;
    jx = jz = 0;
    gameState.jx = gameState.jz = 0;
    knob.style.transform = '';
    joy.classList.remove('on');
}

export function initControls() {
    // Keyboard
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', resetInput);
    window.addEventListener('resize',resetInput);
    window.addEventListener('hinaria:reset-input', resetInput);
    
    // Virtual joystick
    joy.addEventListener('pointerdown', onJoyDown);
    joy.addEventListener('pointermove', onJoyMove);
    joy.addEventListener('pointerup', onJoyEnd);
    joy.addEventListener('pointercancel', onJoyEnd);
    joy.addEventListener('lostpointercapture', onJoyEnd);
    joy.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('visibilitychange', () => { if (document.hidden) resetInput(); });
    
    // Mouse / touch camera
    cvs = gameState.renderer.domElement;
    cvs.addEventListener('contextmenu', e => e.preventDefault());
    cvs.addEventListener('pointerdown', onPointerDown);
    cvs.addEventListener('pointermove', onPointerMove);
    cvs.addEventListener('pointerup', onPointerUp);
    cvs.addEventListener('pointercancel', onPointerCancel);
    cvs.addEventListener('lostpointercapture', onPointerCancel);
    cvs.addEventListener('wheel', onWheel, { passive: false });
    
    // Skill buttons
    document.getElementById('s0').onclick = () => gameplayInputAllowed() && castSkill(0);
    document.getElementById('s1').onclick = () => gameplayInputAllowed() && castSkill(1);
    document.getElementById('s2').onclick = () => gameplayInputAllowed() && castSkill(2);
    document.getElementById('s3').onclick = () => gameplayInputAllowed() && replay();
    const specialButton = document.getElementById('s4');
    if(specialButton) specialButton.onclick = () => gameplayInputAllowed() && castSkill(3);
    // Um listener por botão, pointerdown para resposta imediata no Android.
    const attackV2 = document.getElementById('combat-v2-attack');
    const dodgeV2 = document.getElementById('combat-v2-dodge');
    const switchV2 = document.getElementById('combat-v2-toggle');
    const quickV2 = document.getElementById('combat-v2-quick-toggle');
    // Pointerdown: fast mobile response and independent multitouch from the joystick.
    // Keyboard activates buttons via click; a swallowed pointer click cannot attack twice.
    function bindAction(button, action) {
        if (!button) return;
        button.addEventListener('pointerdown', e => {
            if(e.button !== undefined && e.button !== 0) return;
            e.preventDefault();
            if (gameplayInputAllowed()) action();
        });
        button.addEventListener('click', e => {
            // Keyboard click has detail===0. Pointer synthetic click shouldn't duplicate input.
            if(e.detail !== 0){e.preventDefault();return;}
            if (gameplayInputAllowed()) action();
        });
    }
    bindAction(attackV2, requestManualAttack);
    bindAction(dodgeV2, requestCombatV2Dodge);
    bindAction(document.getElementById('replay-axe-awaken'), requestAxeAwakening);
    if (switchV2) switchV2.addEventListener('click', toggleCombatV2);
    if (quickV2) quickV2.addEventListener('click', toggleCombatV2);
    initCombatV2Preference();
    const arsenalButton = document.getElementById('arsenal-btn');
    if(arsenalButton) arsenalButton.onclick = () => openArsenal();
    
    // Character button
    document.getElementById('chr').onclick = () => { if(gameState.flow==='TITLE')return; gameState.ccOpen = true; document.getElementById('ccw').style.display = 'flex'; buildCharacterCreatorUI(); };
    
    // Class/skin selection
    document.getElementById('cc').onclick = onClassSkinClick;
    

}

function onKeyDown(e) {
    if (!gameplayInputAllowed() || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '') || e.target?.isContentEditable) return;
    
    const k = e.key && e.key.length > 1 ? e.key : (e.key || '').toLowerCase();
    
    if (k==='f') { e.preventDefault(); openDialogue(); return; }
    // Arsenal and extra buyable skill.
    if(k==='b'){e.preventDefault();openArsenal();return;}
    if (gameState.insideHouse) {
      if(k==='e'){e.preventDefault();if(!e.repeat)inspectHouseObject();return;}
      if (KEYS.MOVEMENT[k]) { e.preventDefault(); gameState.keys[k]=1; }
      return;
    }
    if(k==='5'){e.preventDefault();castSkill(3);return;}
    if(k==='r'){e.preventDefault();if(!e.repeat)requestAxeAwakening();return;}
    if(k==='j' || k===' '){e.preventDefault();if(!e.repeat)requestManualAttack();return;}
    if(k==='k'){e.preventDefault();if(!e.repeat)requestCombatV2Dodge();return;}
    // Movement
    if (KEYS.MOVEMENT[k]) {
        e.preventDefault();
        if (gameState.P && gameState.P.path) gameState.P.path.length = 0;
        gameState.keys[k] = 1;
        return;
    }
    
    // Actions
    const action = KEYS.ACTIONS[k];
    if (action) {
        e.preventDefault();
        switch (action) {
            case 'skill0': castSkill(0); break;
            case 'skill1': castSkill(1); break;
            case 'skill2': castSkill(2); break;
            case 'replay': replay(); break;
            case 'chat': openDialogue(); break;
            case 'closeChat': closeDialogue(); break;
            case 'camLeft': gameState.keys.q = 1; break;
            case 'camRight': gameState.keys.e = 1; break;
        }
        return;
    }
    
    // Camera rotation keys
    if (k === 'q' || k === 'e') gameState.keys[k] = 1;
}

function onKeyUp(e) {
    const k = e.key && e.key.length > 1 ? e.key : (e.key || '').toLowerCase();
    delete gameState.keys[k];
}

function resetInput() {
    cancelCombatV2();
    jreset();
    for (const k in gameState.keys) delete gameState.keys[k];
    for (const k in ptr) delete ptr[k];
    pd = null;
    pdist = 0;
    gameState.lastTime = performance.now();
}

function onJoyDown(e) {
    if (!gameplayInputAllowed() || jid !== null) return;
    e.preventDefault();
    jid = e.pointerId;
    try { joy.setPointerCapture(e.pointerId); } catch (_) {}
    joy.classList.add('on');
    if (gameState.P) {
        gameState.P.greet = false;
        if (gameState.P.path) gameState.P.path.length = 0;
    }
    jset(e);
}

function onJoyMove(e) {
    if (gameplayInputAllowed() && e.pointerId === jid) jset(e);
}

function onJoyEnd(e) {
    if (e.pointerId === jid) jreset();
}

function onPointerDown(e) {
    if (!cvs || !gameplayInputAllowed()) return;
    try { cvs.setPointerCapture(e.pointerId); } catch (_) {}
    ptr[e.pointerId] = [e.clientX, e.clientY];
    pd = { x: e.clientX, m: Object.keys(ptr).length > 1 ? 2 : 0 };
    pdist = 0;
}

function onPointerMove(e) {
    if (!gameplayInputAllowed()) return;
    if (ptr[e.pointerId]) ptr[e.pointerId] = [e.clientX, e.clientY];
    const ks = Object.keys(ptr);
    if (ks.length > 1) {
        const a = ptr[ks[0]], b = ptr[ks[1]];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pdist) zoom = gameState.zoom = Math.min(1.7, Math.max(0.5, gameState.zoom * pdist / Math.max(1,d)));
        pdist = d;
        if (pd) pd.m = 2;
        return;
    }
    if (!pd) return;
    if (!pd.m && Math.abs(e.clientX - pd.x) > 6) { pd.m = 1; pd.l = pd.x; }
    if (pd.m === 1) { gameState.yaw -= (e.clientX - pd.l) * 0.008; yaw = gameState.yaw; pd.l = e.clientX; }
}

function onPointerUp(e) {
    delete ptr[e.pointerId];
    pdist = 0;
    if (pd && !pd.m) onCanvasClick(e);
    pd = null;
}

function onPointerCancel(e) {
    delete ptr[e.pointerId];
    pdist = 0;
    pd = null;
}

function onCanvasClick(e) {
    if (!gameplayInputAllowed() || gameState.insideHouse) return;
    const r = gameState.renderer.domElement.getBoundingClientRect();
    const mv = new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(mv, gameState.camera);
    
    const targets = [gameState.ground, ...gameState.ents.filter(q => q !== gameState.P).map(q => q.mesh)];
    const hs = ray.intersectObjects(targets, true);
    if (!hs.length) return;
    
    let o = hs[0].object;
    while (o.parent && !o.userData.e) o = o.parent;
    const E = o.userData.e;
    
    if (E && E.kind === 'm') {
        // Touching a monster never locks it. Use Attack/Skills while facing it.
        gameState.P.greet = false;
        return;
    } else if (E) {
        const p = findPath(gameState.P.tx, gameState.P.tz, E.tx, E.tz, gameState.P);
        if (p) { p.pop(); gameState.P.path = p; gameState.P.greet = true; }
    } else {
        const g = hs.find(h => h.object === gameState.ground);
        if (!g) return;
        gameState.P.greet = false;
        const p = findPath(gameState.P.tx, gameState.P.tz, Math.round(g.point.x), Math.round(g.point.z), gameState.P);
        if (p) { gameState.P.path = p; playClaudeVfx('magic_circle',{x:Math.round(g.point.x),y:gameState.getHeightAt(Math.round(g.point.x),Math.round(g.point.z))+.04,z:Math.round(g.point.z)},null,.15); }
    }
}

function onWheel(e) {
    if (!gameplayInputAllowed()) return;
    zoom = gameState.zoom = Math.min(1.7, Math.max(0.5, gameState.zoom + e.deltaY * 0.001));
    e.preventDefault();
}

function onClassSkinClick(e) {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.k) setClass(b.dataset.k, gameState.P.sk);
    else if (b.dataset.s) setClass(gameState.P.cls, +b.dataset.s);
    else if (b.id === 'go') { finishCharacterCreation(); }
    buildCharacterCreatorUI();
}

// Export getters for camera
export function getYaw() { return yaw; }
export function getZoom() { return zoom; }
export function getJoystick() { return { x: jx, z: jz }; }
