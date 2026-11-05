/**
 * UI System - HUD, Minimap, Notifications, Character Creator, Floating Text
 */

import { Q, questMarkers } from '../quest/quests.js';
import * as THREE from 'three';
import { CONFIG, GAME_IDENTITY, KEYS, DIRECTIONS_8 } from '../core/config.js';
import { gameState } from '../core/gameState.js';
import { saveArsenalProgress, equippedWeapon } from '../player/arsenal.js';
import { CLASSES, SKINS, ARMORS, POWERS, setClass, updateSkillUI, showFloatingText, buildCharacterCreatorUI } from '../player/player.js';
import { deriveHudState, deriveBossEncounter } from './hudData.js';

const ZNM = CONFIG.ZONE_NAMES;
const ATG = CONFIG.ATMOSPHERE_COLORS.map(c => new THREE.Color(c));
const ATc = new THREE.Color(CONFIG.COLORS.FOG_DEFAULT);

// Minimap
let mmBig = false, mmOff = false, mmT = 1, lc = -1, lz = -1, zc = -1, exT = 0;
let mmB, fogC, mmc, mmx, mmw;
let hudElements = null, telemetryTime = 0, previousHud = null;
const text = (element, value) => { if (element && element.textContent !== String(value)) element.textContent = String(value); };

/**
 * Initialize UI
 */
export function initUI() {
    cacheDOM();
    buildStatusPlate();
    buildMinimap();
    buildFogOfWar();
    setupMinimapInteraction();
    setupResponsive();
    resizeMinimap();
    updateHUD();
    buildCharacterCreatorUI();
    
    // Ensure character creator is visible initially
    if (gameState.ccOpen) {
        document.getElementById('ccw').style.display = 'flex';
    }
    
}

function cacheDOM() {
    gameState.dom = {
        hud: document.getElementById('hud'),
        toast: document.getElementById('toast'),
        joy: document.getElementById('joy'),
        knob: document.getElementById('knob'),
        mmw: document.getElementById('mmw'),
        mmc: document.getElementById('mm'),
        mmx: document.getElementById('mmx'),
        hot: document.getElementById('hot'),
        ccw: document.getElementById('ccw'),
        cc: document.getElementById('cc'),
        cls: document.getElementById('cls'),
        skn: document.getElementById('skn'),
        cover: document.getElementById('cover'),
        play: document.getElementById('play'),
        cv: document.getElementById('cv'),
    };
    mmc = gameState.dom.mmc;
    mmx = mmc.getContext('2d');
    mmw = gameState.dom.mmw;
}

/** Small event notifications; there is no chat log or text input in V7.8. */
export function say(html, cls) {
    const toast = gameState.dom?.toast;
    if (!toast) return;
    toast.innerHTML=html;
    toast.dataset.type=cls||'sys';
    toast.style.opacity='1';
    clearTimeout(say.t);
    say.t=setTimeout(()=>{toast.style.opacity='0';}, 3600);
}

/**
 * Update HUD
 */
export function updateHUD() {
    const P = gameState.P;
    if (!P) return;
    document.getElementById('hpt').textContent = Math.max(0, P.hp) + ' / ' + P.max;
    document.getElementById('hpb').style.width = Math.max(0, P.hp / P.max * 100) + '%';
    document.getElementById('lv').textContent = P.lv;
    document.getElementById('gd').textContent = P.gold;
    document.getElementById('xpb').style.width = (P.xp / (P.lv * 50)) * 100 + '%';
    document.getElementById('arm').textContent = ARMORS[P.ar].n + ' (+' + ARMORS[P.ar].def + ')';
    document.getElementById('mpb').style.width = (P.mana / P.mm) * 100 + '%';
    if (!gameState.suspendLegacyPersistence) saveArsenalProgress(P);
    updateHudTelemetry(true);
}

function buildStatusPlate() {
    const hud = gameState.dom.hud;
    if (!hud || hudElements) return;
    const plate = document.createElement('section');
    plate.id = 'hud-statplate'; plate.setAttribute('aria-label', 'Estado do personagem');
    plate.innerHTML = `<header class="hud-identity"><div id="hud-portrait" aria-hidden="true"></div><div class="hud-nameplate"><strong id="hud-class"></strong><span id="hud-level"></span></div></header>
      <div class="hud-meter hud-health"><div class="hud-meter-label"><span>♥ VIDA</span><b id="hud-health-value"></b></div><div id="hud-health-track" class="hud-meter-track" role="progressbar" aria-label="Vida"><i class="hud-meter-trail"></i><i class="hud-meter-fill"></i></div></div>
      <div class="hud-meter hud-mana"><div class="hud-meter-label"><span>◆ MANA</span><b id="hud-mana-value"></b></div><div id="hud-mana-track" class="hud-meter-track" role="progressbar" aria-label="Mana"><i class="hud-meter-fill"></i></div></div>
      <div class="hud-meter hud-experience"><div class="hud-meter-label"><span>✧ EXP</span><b id="hud-xp-value"></b></div><div id="hud-xp-track" class="hud-meter-track" role="progressbar" aria-label="Experiência"><i class="hud-meter-fill"></i></div></div>
      <div class="hud-resources"><span id="hud-gold"></span><span id="hud-defense"></span></div><div id="hud-zone"></div><div id="hud-status" aria-live="polite"></div>`;
    hud.prepend(plate);
    hudElements = {};
    for (const node of plate.querySelectorAll('[id]')) hudElements[node.id] = node;
    hudElements.plate = plate;
    hudElements.skills = ['s0', 's1', 's2', 's4'].map(id => document.getElementById(id));
    hudElements.replay = document.getElementById('s3');
    const bossPanel = document.createElement('section'); bossPanel.id = 'hud-boss-encounter'; bossPanel.hidden = true;
    bossPanel.setAttribute('aria-label', 'Encontro de chefe');
    bossPanel.innerHTML = '<div class="hud-boss-heading"><strong></strong><span></span></div><div class="hud-boss-track" role="progressbar" aria-label="Vida do chefe"><i></i></div><div class="hud-boss-warning" role="status" aria-live="polite"></div>';
    document.body.append(bossPanel);
    hudElements.boss = { panel: bossPanel, name: bossPanel.querySelector('strong'), value: bossPanel.querySelector('.hud-boss-heading span'),
      bar: bossPanel.querySelector('.hud-boss-track'), fill: bossPanel.querySelector('i'), warning: bossPanel.querySelector('.hud-boss-warning') };
    window.addEventListener('hinaria:flowchange', () => updateHudTelemetry(true));
    const toast = gameState.dom.toast;
    toast?.setAttribute('aria-atomic', 'true');
    // The tracker opens the existing journal; its legacy expand button is preserved.
    queueMicrotask(() => {
      const tracker = document.getElementById('qt');
      if (!tracker) return;
      tracker.setAttribute('role', 'button'); tracker.tabIndex = 0;
      tracker.setAttribute('aria-label', 'Abrir diário de missões');
      const open = () => document.getElementById('qbtn')?.click();
      tracker.addEventListener('click', open);
      tracker.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); open(); }
      });
    });
}

/** Called at most ten times per second by either the RPG loop or optional Pixi ticker. */
export function updateHudTelemetry(force = false) {
    const now = performance.now();
    if (!hudElements || (!force && now - telemetryTime < 100)) return previousHud;
    telemetryTime = now;
    const P = gameState.P;
    if (!P) return null;
    const zone = gameState.insideHouse ? 'Interior · Vilarrubra' : ZNM[gameState.ZN[P.tx]?.[P.tz] ?? 0] || 'Vilarrubra';
    const state = deriveHudState(P, { classes: CLASSES, armors: ARMORS, powers: POWERS, skins: SKINS, weapon: equippedWeapon(P) }, zone);
    const e = hudElements;
    text(e['hud-class'], state.className); text(e['hud-level'], `NÍVEL ${state.level}`);
    text(e['hud-health-value'], `${state.hp} / ${state.maxHP}`);
    text(e['hud-mana-value'], `${state.mana} / ${state.maxMP}`);
    text(e['hud-xp-value'], `${state.xp} / ${state.xpMax}`);
    text(e['hud-gold'], `◈ ${state.gold} ouro`); text(e['hud-defense'], `⛨ +${state.defense}`);
    e['hud-defense'].title = `${state.armor} · ${state.weapon}`;
    text(e['hud-zone'], state.zone);
    const status = state.status.map(item => `${item.label} ${item.seconds}s`).join(' · ');
    text(e['hud-status'], status); e['hud-status'].hidden = !status;
    e.plate.classList.toggle('hud-low-health', state.lowHealth);
    if (state.portrait !== previousHud?.portrait || state.classId !== previousHud?.classId) {
      e['hud-portrait'].style.backgroundImage = state.portrait ? `url("${state.portrait}")` : '';
      text(e['hud-portrait'], state.portrait ? '' : state.sigil);
      e['hud-portrait'].dataset.class = state.classId;
    }
    if (previousHud && state.hp > previousHud.hp) {
      e.plate.classList.remove('hud-healed'); void e.plate.offsetWidth; e.plate.classList.add('hud-healed');
    }
    if (previousHud && state.level > previousHud.level) say(`<b>Nível ${state.level}!</b> Sua jornada continua.`, 'level');
    for (const [id, value, maximum, fill] of [
      ['hud-health-track', state.hp, state.maxHP, state.hpRatio],
      ['hud-mana-track', state.mana, state.maxMP, state.mpRatio],
      ['hud-xp-track', state.xp, state.xpMax, state.xpRatio]
    ]) {
      const track = e[id];
      track.style.setProperty('--hud-fill', `${(fill * 100).toFixed(2)}%`);
      track.setAttribute('aria-valuemin', '0'); track.setAttribute('aria-valuemax', String(maximum));
      track.setAttribute('aria-valuenow', String(Math.min(value, maximum)));
    }
    for (let i = 0; i < state.skills.length; i++) {
      const skill = state.skills[i], button = e.skills[i]; if (!button) continue;
      let cost = button.querySelector('.skill-mana');
      if (!cost) { cost = document.createElement('span'); cost.className = 'skill-mana'; button.append(cost); }
      text(cost, skill.locked ? '🔒 Arsenal' : `${skill.manaCost} MP`);
      button.disabled = skill.disabled;
      button.classList.toggle('skill-no-mana', !skill.locked && state.mana < skill.manaCost);
      button.classList.toggle('skill-locked', skill.locked);
      button.setAttribute('aria-label', `${skill.key}: ${skill.name}, ${skill.locked ? 'bloqueada, desbloqueie no Arsenal' : `${skill.manaCost} de mana${skill.cooldown > 0 ? `, recarga ${Math.ceil(skill.cooldown)} segundos` : ', pronta'}`}`);
      button.style.setProperty('--skill-cooldown', `${(skill.cooldownRatio * 100).toFixed(1)}%`);
      if (previousHud?.skills[i]?.cooldown > 0 && skill.cooldown === 0 && !skill.locked) {
        button.classList.remove('skill-ready'); void button.offsetWidth; button.classList.add('skill-ready');
      }
    }
    const replay = e.replay;
    if (replay) {
      if (!replay.querySelector('.skill-label')) {
        replay.replaceChildren();
        const key = document.createElement('span'); key.className = 'skill-key'; key.textContent = '4';
        const label = document.createElement('span'); label.className = 'skill-label'; label.textContent = 'Replay';
        replay.append(key, label);
      }
      let cost = replay.querySelector('.skill-mana');
      if (!cost) { cost = document.createElement('span'); cost.className = 'skill-mana'; replay.append(cost); }
      text(cost, P.rl ? '20 MP' : '🔒 Yoki');
      replay.disabled = !P.rl || P.rc > 0 || P.mana < 20 || gameState.hist.length < 4;
      replay.classList.toggle('skill-locked', !P.rl);
      replay.setAttribute('aria-label', P.rl ? `4: Replay, 20 de mana${P.rc > 0 ? `, recarga ${Math.ceil(P.rc)} segundos` : ''}` : 'Replay bloqueado. Aprenda com Yoki.');
    }
    
    previousHud = state;
    const encounter = deriveBossEncounter(gameState), boss = e.boss;
    boss.panel.hidden = !encounter;
    document.body.classList.toggle('hud-boss-active', !!encounter);
    if (encounter) {
      text(boss.name, encounter.name); text(boss.value, `${encounter.hp} / ${encounter.max}`);
      boss.fill.style.width = `${(encounter.ratio * 100).toFixed(1)}%`;
      boss.bar.setAttribute('aria-valuemin', '0'); boss.bar.setAttribute('aria-valuemax', String(encounter.max));
      boss.bar.setAttribute('aria-valuenow', String(Math.min(encounter.hp, encounter.max)));
      text(boss.warning, encounter.imminent ? '⚠ Golpe iminente · afaste-se ou esquive' : 'ENCONTRO');
      boss.panel.classList.toggle('boss-imminent', encounter.imminent);
    }
    return state;
}

export function getHudVisualState() { return { state: previousHud, elements: hudElements }; }

/**
 * Build minimap base texture
 */
function buildMinimap() {
    mmB = document.createElement('canvas');
    mmB.width = mmB.height = gameState.W * 4;
    const x = mmB.getContext('2d');
    const MC = CONFIG.BIOME_MINIMAP_COLORS;
    for (let i = 0; i < gameState.W; i++) for (let j = 0; j < gameState.W; j++) {
        let c = MC[gameState.G[i][j]];
        if (gameState.G[i][j] === 0 && gameState.ZN[i][j] === 1) c = [70, 108, 50];
        if (gameState.B[i][j] && gameState.G[i][j] !== 3 && gameState.G[i][j] !== 4) c = c.map(v => v * 0.72);
        x.fillStyle = `rgb(${c[0]|0},${c[1]|0},${c[2]|0})`;
        x.fillRect(i * 4, j * 4, 4, 4);
    }
    // Safe zone ellipse
    x.strokeStyle = 'rgba(255,215,100,.9)';
    x.lineWidth = 2;
    x.setLineDash([6, 4]);
    x.beginPath();
    x.ellipse(13.5 * 4, 13 * 4, 11.5 * 4, 10.5 * 4, 0, 0, 7);
    x.stroke();
}

/**
 * Build fog of war canvas
 */
function buildFogOfWar() {
    fogC = document.createElement('canvas');
    fogC.width = fogC.height = gameState.W;
    const fogX = fogC.getContext('2d');
    fogX.fillStyle = 'rgba(6,6,10,.94)';
    fogX.fillRect(0, 0, gameState.W, gameState.W);
}

/** Compact alpha-only exploration payload, excluding canvas/runtime objects. */
export function snapshotFog() {
    if (!fogC) return null;
    const data = fogC.getContext('2d').getImageData(0, 0, gameState.W, gameState.W).data;
    const alpha = new Array(gameState.W * gameState.W);
    for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
    return alpha;
}

export function restoreFog(alpha) {
    if (alpha === null) {
        buildFogOfWar(); lc = lz = -1; mmT = 1; return true;
    }
    if (!Array.isArray(alpha) || alpha.length !== gameState.W * gameState.W ||
        alpha.some(value => !Number.isInteger(value) || value < 0 || value > 255)) return false;
    if (!fogC) buildFogOfWar();
    const context = fogC.getContext('2d');
    const image = context.createImageData(gameState.W, gameState.W);
    for (let i = 0; i < alpha.length; i++) {
        image.data[i * 4] = 6; image.data[i * 4 + 1] = 6; image.data[i * 4 + 2] = 10;
        image.data[i * 4 + 3] = alpha[i];
    }
    context.putImageData(image, 0, 0); lc = lz = -1; mmT = 1;
    return true;
}

/**
 * Reveal fog around position
 */
export function revealFog(x, z, r) {
    if (!isFinite(x) || !isFinite(z) || !isFinite(r)) return;
    const fogX = fogC.getContext('2d');
    fogX.globalCompositeOperation = 'destination-out';
    const g = fogX.createRadialGradient(x + 0.5, z + 0.5, r * 0.55, x + 0.5, z + 0.5, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    fogX.fillStyle = g;
    fogX.fillRect(x - r, z - r, r * 2 + 1, r * 2 + 1);
}

/**
 * Draw minimap
 */
export function drawMinimap() {
    if (mmOff) return;
    drawMapInto(mmx, mmc.width, mmBig);
}

/** Full explored-world map for the pause menu; reads the same authoritative fog. */
export function renderExplorationMap(canvas) {
    if (!canvas || !gameState.P || !mmB || !fogC) return false;
    canvas.width = canvas.height = 384;
    const context = canvas.getContext('2d');
    if (!context) return false;
    drawMapInto(context, canvas.width, true);
    return true;
}

function drawMapInto(mmx, s, full) {
    const ww = full ? gameState.W : 30;
    const u0 = full ? 0 : Math.min(gameState.W - ww, Math.max(0, gameState.P.x + 0.5 - ww / 2));
    const v0 = full ? 0 : Math.min(gameState.W - ww, Math.max(0, gameState.P.z + 0.5 - ww / 2));
    const k = s / ww;
    
    mmx.imageSmoothingEnabled = false;
    mmx.drawImage(mmB, u0 * 4, v0 * 4, ww * 4, ww * 4, 0, 0, s, s);
    mmx.imageSmoothingEnabled = true;
    mmx.drawImage(fogC, u0, v0, ww, ww, 0, 0, s, s);
    
    // Landmarks
    for (const l of gameState.LM) if (l.f || l.n === 'Vila de Vilarrubra' || l.n === 'Ferraria de Bram') {
        const a = (l.x + 0.5 - u0) * k, b = (l.z + 0.5 - v0) * k;
        mmx.fillStyle = '#ffd24a';
        mmx.beginPath();
        mmx.moveTo(a, b - 4);
        mmx.lineTo(a + 3.5, b);
        mmx.lineTo(a, b + 4);
        mmx.lineTo(a - 3.5, b);
        mmx.fill();
    }
    
    // Entities
    for (const e of gameState.ents) {
        if (e === gameState.P) continue;
        const d = Math.max(Math.abs(gameState.P.tx - e.tx), Math.abs(gameState.P.tz - e.tz));
        if (e.kind === 'npc' ? d > 14 : (e.kind !== 'm' || d > 7)) continue;
        mmx.fillStyle = e.kind === 'npc' ? '#6ab0ff' : '#ff5a4a';
        mmx.beginPath();
        mmx.arc((e.x + 0.5 - u0) * k, (e.z + 0.5 - v0) * k, e.kind === 'npc' ? 3 : 2.4, 0, 7);
        mmx.fill();
    }
    
    // Player
    for (const m of questMarkers()) {
        const a = (m.x + 0.5 - u0) * k, b = (m.z + 0.5 - v0) * k;
        if (a < -8 || b < -8 || a > s + 8 || b > s + 8) continue;
        mmx.strokeStyle = '#ffd24a'; mmx.lineWidth = 2; mmx.beginPath(); mmx.arc(a, b, 6 + Math.sin(gameState.t * 6) * 1.5, 0, 7); mmx.stroke();
        mmx.fillStyle = '#ffd24a'; mmx.font = 'bold 10px sans-serif'; mmx.textAlign = 'center'; mmx.fillText(m.k === 'go' ? '>' : '!', a, b + 3.5);
    }
    mmx.save();
    mmx.translate((gameState.P.x + 0.5 - u0) * k, (gameState.P.z + 0.5 - v0) * k);
    mmx.rotate(Math.PI - gameState.P.mesh.rotation.y);
    mmx.fillStyle = '#fff';
    mmx.strokeStyle = '#000';
    mmx.lineWidth = 1;
    mmx.beginPath();
    mmx.moveTo(0, -6);
    mmx.lineTo(4.5, 5);
    mmx.lineTo(-4.5, 5);
    mmx.closePath();
    mmx.fill();
    mmx.stroke();
    mmx.restore();
}

function setupMinimapInteraction() {
    mmc.tabIndex = 0; mmc.setAttribute('role', 'button');
    mmc.onclick = () => { mmBig = !mmBig; resizeMinimap(); };
    mmc.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); mmc.click(); } });
    gameState.dom.mmx.onclick = e => { e.stopPropagation(); mmOff = !mmOff; resizeMinimap(); };
}

function resizeMinimap() {
    const m = Math.min(innerWidth, innerHeight);
    const smallTouch = matchMedia('(pointer: coarse)').matches || (innerWidth <= 900 && innerHeight <= 500);
    const s = mmBig ? Math.round(Math.min(210, m * 0.56)) : Math.round(smallTouch ? Math.min(104, Math.max(64, m * 0.26)) : Math.min(120, Math.max(86, m * 0.22)));
    mmc.width = mmc.height = s;
    mmc.style.width = mmc.style.height = s + 'px';
    // O minimapa deve ter dimensoes explicitas, independente das regras
    // mobile do combate. Isso evita que o wrapper absoluto estique quando
    // uma stylesheet tentar ancorar simultaneamente top e bottom.
    mmw.style.width = mmOff ? '' : s + 'px';
    mmw.style.height = mmOff ? '' : s + 'px';
    mmw.classList.toggle('off', !!mmOff);
    mmw.classList.toggle('map-expanded', !!mmBig && !mmOff);
    gameState.mmBig = mmBig; gameState.mmOff = mmOff;
    gameState.dom.mmx.setAttribute('aria-label', mmOff ? 'Mostrar minimapa' : 'Recolher minimapa');
    gameState.dom.mmx.setAttribute('aria-expanded', String(!mmOff));
    mmc.setAttribute('aria-label', mmBig ? 'Mapa explorado; toque para reduzir' : 'Minimapa; toque para ampliar');
    mmc.setAttribute('aria-expanded', String(mmBig));
    mmT = 1;
}

function setupResponsive() {
    window.addEventListener('resize', () => {
        // The 3D canvas/camera is resized exclusively in main.js using #wrap.
        // Having a second handler here used innerWidth/innerHeight, which can
        // disagree with #wrap on Android and cause floating names/HP to drift.
        resizeMinimap();
    });
}


/**
 * World update (called each frame)
 */
export function updateWorldUI(dt) {
    if (!gameState.P) return;
    updateHudTelemetry();
    const px = gameState.P.tx, pz = gameState.P.tz;
    if (px !== lc || pz !== lz) { lc = px; lz = pz; revealFog(px, pz, CONFIG.FOG_REVEAL_RADIUS); }
    
    const zi = gameState.ZN[px] ? gameState.ZN[px][pz] : 0;
    if (zi !== zc) { zc = zi; if (ZNM[zi]) say(`<b>${ZNM[zi]}</b>`, 'sys'); }
    
    ATc.lerp(ATG[zi], 1 - Math.exp(-dt * 1.6));
    gameState.scene.background.copy(ATc);
    gameState.scene.fog.color.copy(ATc);
    
    // Exploration discoveries
    exT += dt;
    if (exT > 0.2) {
        exT = 0;
        for (const l of gameState.LM) if (!l.f && Math.hypot(gameState.P.x - l.x, gameState.P.z - l.z) < l.r) {
            l.f = 1;
            // Quests/exploration persist separately from mesh hierarchy.
            try { window.dispatchEvent(new Event('hinaria:landmark-discovered')); } catch {}
            gameState.P.gold += 5;
            say(`Você descobriu: <b>${l.n}</b> (+5 de ouro)`, 'npc');
            updateHUD();
            Q.emit('discover', { n: l.n });
            revealFog(Math.round(l.x), Math.round(l.z), CONFIG.FOG_REVEAL_EXPLORE_RADIUS);
        }
        for (const c of gameState.CH) if (!c.o && Math.hypot(gameState.P.x - c.x, gameState.P.z - c.z) < 1.8) {
            c.o = 1;
            try { window.dispatchEvent(new Event('hinaria:chest-opened')); } catch {}
            c.lid.rotation.x = -1.2;
            gameState.P.gold += c.g;
            say(`Você abriu <b>${c.n}</b> e achou <b>${c.g} de ouro</b>!`, 'npc');
            updateHUD();
        }
    }

    mmT += dt;
    if (mmT > 0.1) { mmT = 0; drawMinimap(); }
}

/**
 * Project world position to the visible CSS-pixel overlay.
 * Android WebView renders WebGL into a high-DPI drawing buffer whose dimensions
 * are NOT equal to CSS pixels; using canvas.width/height misplaced every tag.
 * Reuse the vector so this stays inexpensive on phones.
 */
const projectionPoint = new THREE.Vector3();
function project(x, y, z) {
    const canvas = gameState.renderer?.domElement;
    const camera = gameState.camera;
    if (!canvas || !camera) return null;
    const cr = canvas.getBoundingClientRect();
    const overlay = document.getElementById('ov');
    const or = overlay?.getBoundingClientRect() || { left: 0, top: 0 };
    if (cr.width <= 0 || cr.height <= 0) return null;
    projectionPoint.set(x, y, z).project(camera);
    if (!Number.isFinite(projectionPoint.x) || !Number.isFinite(projectionPoint.y) ||
        !Number.isFinite(projectionPoint.z) || projectionPoint.z < -1 || projectionPoint.z > 1) return null;
    return [cr.left - or.left + (projectionPoint.x + 1) * 0.5 * cr.width,
            cr.top - or.top + (1 - projectionPoint.y) * 0.5 * cr.height,
            cr.width, cr.height];
}

/** Update floating damage numbers, respecting screen scale and camera visibility. */
export function updateFloatingText(dt) {
    for (let i = gameState.fl.length - 1; i >= 0; i--) {
        const f = gameState.fl[i];
        f.t += dt;
        const pos = project(f.x, 1.2, f.z);
        f.d.style.display = pos ? '' : 'none';
        if (pos) {
            f.d.style.left = pos[0] + 'px';
            f.d.style.top = (pos[1] - f.t * 40) + 'px';
            f.d.style.opacity = String(Math.max(0, 1 - f.t / 1.1));
        }
        if (f.t > 1.1) { f.d.remove(); gameState.fl.splice(i, 1); }
    }
}

/**
 * Follow the head joint of the *rendered mesh*, not a guessed world height.
 * Scale, terrain, character size, idle/attack animation and rotation are
 * already encoded in this hierarchy. In particular, the rat is scaled 1.5x.
 * The old e.x/e.z + fixed h caused detached labels on mobile.
 * Reuse a vector to avoid generating garbage on each animation frame.
 */
const headWorld = new THREE.Vector3();
function getLabelWorldPosition(e) {
    const head = e.mesh?.userData?.r?.head;
    if (head && typeof head.localToWorld === 'function') {
        // The rat has a smaller head. Human heads are rigged around y=1.45.
        headWorld.set(0, e.k === 'rat' ? 0.19 : 0.29, 0);
        return head.localToWorld(headWorld);
    }
    // Fallback for custom enemies without rigs: use the actual world mesh.
    if (e.mesh && typeof e.mesh.localToWorld === 'function') {
        headWorld.set(0, e.k === 'rat' ? 0.52 : 1.9, 0);
        return e.mesh.localToWorld(headWorld);
    }
    // Minimal test/mock compatibility.
    headWorld.set(e.x, (e.mesh?.position?.y || 0) + (e.k === 'rat' ? 0.68 : 1.75), e.z);
    return headWorld;
}

/** Update NPC names and monster HP, correctly anchored in Android WebView. */
export function updateTags() {
    const camera = gameState.camera;
    camera?.updateMatrixWorld();
    const overlay = document.getElementById('ov');
    const ow = overlay?.clientWidth || window.innerWidth;
    const oh = overlay?.clientHeight || window.innerHeight;
    for (const e of gameState.ents) {
        if (!e.tag) continue;
        const head = getLabelWorldPosition(e);
        const pos = project(head.x, head.y, head.z);
        const visible = !!pos && pos[0] >= -80 && pos[0] <= ow + 80 && pos[1] >= -30 && pos[1] <= oh + 35;
        e.tag.style.display = visible ? '' : 'none';
        if (!visible) continue;
        const left = pos[0].toFixed(1) + 'px';
        const top = pos[1].toFixed(1) + 'px';
        if(e.tag.style.left !== left) e.tag.style.left = left;
        if(e.tag.style.top !== top) e.tag.style.top = top;
        if (e.bar && e.lastHpShown !== e.hp) {
            const max = Number(e.max);
            const ratio = max > 0 && Number.isFinite(e.hp) ? Math.max(0, Math.min(1, e.hp / max)) : 0;
            e.bar.style.width = (ratio * 100).toFixed(1) + '%';
            e.bar.style.backgroundColor = ratio <= 0.25 ? '#ef5555' : ratio <= 0.5 ? '#f2c54b' : '#54d773';
            e.tag.title = `${e.name}: ${Math.max(0, Math.ceil(e.hp))}/${max} HP`;
            e.lastHpShown = e.hp;
        }
    }
}
