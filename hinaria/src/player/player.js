/**
 * Player Entity & Character System
 * Classes, skills, stats, equipment, leveling, replay
 */

import * as THREE from 'three';
import { CONFIG, GAME_IDENTITY } from '../core/config.js';
import { gameState } from '../core/gameState.js';
import { MATERIALS } from '../assets/procedural.js';
import { buildImprovedRig, attachWeaponToRig, attachShieldToRig } from './characterModels.js';
import {createCharacterVisualV2} from '../modelsV2/index.js';
import { IMPROVED_WEAPON_FACTORIES } from './weaponModels.js';
import { ensureArsenal, equippedWeapon, skillLevel, loadArsenalProgress, saveArsenalProgress } from './arsenal.js';
import { attachReplayAxe, syncReplayAxeVisual } from './replayAxeModel.js';

// Class definitions
export const CLASSES = {
    kn: {
        n: 'Cavaleiro',
        d: 'Corpo a corpo, muita vida',
        hp: 96,
        up: 17,
        rng: 1,
        dmg: [4, 8],
        col: 0xd04a3a,
        cloth: 0x8a2f2f,
        cape: 0x6d1f1f,
        w: 'sword',
        sh: 'shield',
        mp: 40,
        mu: 5,
        mr: 1.5,
    },
    pa: {
        n: 'Paladino',
        d: 'Arco, alcance 5',
        hp: 76,
        up: 14,
        rng: 5,
        dmg: [3, 6],
        col: 0xe0b93f,
        cloth: 0x6b7a3a,
        sh: 'bow',
        sw: 1,
        pc: 0xd9c9a0,
        mp: 60,
        mu: 8,
        mr: 2,
    },
    so: {
        n: 'Feiticeiro',
        d: 'Fogo em área, frágil',
        hp: 60,
        up: 11,
        rng: 5,
        dmg: [3, 9],
        col: 0xff7a2a,
        cloth: 0x6a2fa8,
        w: 'fire',
        sw: 1,
        pc: 0xff7a2a,
        mp: 100,
        mu: 15,
        mr: 3,
    },
    yo: {
        n: 'Yoki',
        d: 'Bárbaro do Replay · machado flamejante',
        hp: 110, up: 16, rng: 1.5, dmg: [5, 9],
        col: 0xff7338, cloth: 0x46534a, cape: 0x523b35,
        w: 'axe', mp: 55, mu: 7, mr: 1.7,
    },
    dr: {
        n: 'Druida',
        d: 'Gelo e cura',
        hp: 68,
        up: 12,
        rng: 4,
        dmg: [2, 6],
        col: 0x7de8ff,
        cloth: 0x2f7a52,
        w: 'ice',
        sw: 1,
        pc: 0x7de8ff,
        mp: 90,
        mu: 12,
        mr: 3,
    },
};

// Powers: 3 per class (keys 1, 2, 3). t: hit | aoe | heal | buff
export const POWERS = {
    yo: [
        { n: 'Corte aprendido', cd: 7, mp: 12, t: 'hit', m: 2.1 },
        { n: 'Marca da Garra', cd: 11, mp: 18, t: 'aoe', self: 1, r: 2.5, m: 1.0, st: ['slow', 2] },
        { n: 'Olho-Parado', cd: 18, mp: 23, t: 'buff', b: 'guard', s: 6 },
        { n: 'Repetir o Final', cd: 22, mp: 32, t: 'aoe', self: 1, r: 2.9, m: 2.0, st: ['burn', 3] },
    ],
    kn: [
        { n: 'Golpe brutal', cd: 6, mp: 15, t: 'hit', m: 2.3 },
        { n: 'Grito de guerra', cd: 12, mp: 20, t: 'aoe', self: 1, r: 3, m: 0.6, st: ['stun', 2] },
        { n: 'Escudo de ferro', cd: 18, mp: 25, t: 'buff', b: 'guard', s: 6 },
        { n: 'Impacto do Rei', cd: 20, mp: 36, t: 'aoe', self: 1, r: 3, m: 2.1, st: ['stun', 2] },
    ],
    pa: [
        { n: 'Tiro certeiro', cd: 5, mp: 15, t: 'hit', m: 2.3 },
        { n: 'Chuva de flechas', cd: 10, mp: 25, t: 'aoe', r: 2, m: 1.4 },
        { n: 'Passo veloz', cd: 14, mp: 15, t: 'buff', b: 'haste', s: 6 },
        { n: 'Rajada Celeste', cd: 18, mp: 32, t: 'aoe', r: 3, m: 2.4 },
    ],
    so: [
        { n: 'Bola de fogo', cd: 5, mp: 15, t: 'hit', m: 1.8, st: ['burn', 4] },
        { n: 'Explosão', cd: 8, mp: 30, t: 'aoe', r: 2, m: 1.8 },
        { n: 'Fúria arcana', cd: 16, mp: 25, t: 'buff', b: 'rage', s: 8 },
        { n: 'Supernova', cd: 22, mp: 42, t: 'aoe', r: 3, m: 2.8, st: ['burn', 4] },
    ],
    dr: [
        { n: 'Raio de gelo', cd: 5, mp: 15, t: 'hit', m: 1.8, st: ['slow', 4] },
        { n: 'Cura', cd: 8, mp: 25, t: 'heal', f: 0.4 },
        { n: 'Nova gélida', cd: 12, mp: 30, t: 'aoe', self: 1, r: 3, m: 1, st: ['slow', 4] },
        { n: 'Florescer', cd: 20, mp: 36, t: 'heal', f: 0.85 },
    ],
};

// Skin tones
export const SKINS = [
    { n: 'Claro', s: 0xf0c8a0, h: 0x5a3b22 },
    { n: 'Moreno', s: 0xc58c5a, h: 0x1d1410 },
    { n: 'Escuro', s: 0x7a4a2e, h: 0x111111 },
    { n: 'Ruivo', s: 0xf3d2b8, h: 0xb5471f },
    { n: 'Orc', s: 0x6f9a55, h: null, sc: 1.08 },
    // Original Vilarrubra HTML portrait skins, stored locally under assets/ui/.
    ...['Shikamaru', 'Respira', 'Seios', 'Impostor', 'Turma 1', 'Turma 2', 'Turma 3', 'Turma 4']
      .map((n, f) => ({ n, s: 0xe0b890, h: 0x2b2019, f })),
];

// Armor tiers
export const ARMORS = [
    { n: 'Túnica', k: '', c: 0, def: 0, cost: 0 },
    { n: 'Couro', k: 'couro', c: 0x7a5230, def: 1, cost: 60 },
    { n: 'Cota de malha', k: 'malha', c: 0x9aa3ad, def: 3, cost: 160 },
    { n: 'Placas', k: 'placas', c: 0xd2d7de, def: 5, cost: 320 },
];

const ri = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const rnd = (a, b) => a + Math.random() * (b - a);

// Sticker geometry for status effects
const stf = (c) => () => {
    const w = new THREE.Group();
    w.position.y = -0.52;
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.5, 6), MATERIALS.vertexColor.clone());
    cyl.position.set(0, 0.3, 0.05);
    w.add(cyl);
    const sph = new THREE.Mesh(new THREE.SphereGeometry(0.09), new THREE.MeshBasicMaterial({ color: c }));
    sph.position.set(0, 1.08, 0.05);
    w.add(sph);
    return w;
};

// Weapon factories
export const WEAPON_FACTORIES = {
    sword: () => {
        const w = new THREE.Group();
        w.position.y = -0.52;
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.62), new THREE.MeshLambertMaterial({ color: 0xdfe4ea }));
        blade.position.set(0, 0, 0.4);
        w.add(blade);
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.05), new THREE.MeshLambertMaterial({ color: 0xc9a227 }));
        guard.position.set(0, 0, 0.1);
        w.add(guard);
        w.add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.14), new THREE.MeshLambertMaterial({ color: 0x5a3b22 })));
        return w;
    },
    shield: () => {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 12), new THREE.MeshLambertMaterial({ color: 0x9b2d2d }));
        w.rotation.z = Math.PI / 2;
        w.position.set(-0.1, -0.35, 0);
        const boss = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6), new THREE.MeshLambertMaterial({ color: 0xc9a227 }));
        boss.position.set(0, 0.04, 0);
        w.add(boss);
        return w;
    },
    bow: () => {
        const w = new THREE.Group();
        const b = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.015, 4, 12, Math.PI), new THREE.MeshLambertMaterial({ color: 0x6b4423 }));
        w.position.y = -0.52;
        b.rotation.z = -Math.PI / 2;
        w.rotation.y = -Math.PI / 2;
        w.add(b);
        w.add(new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.6, 0.01), new THREE.MeshLambertMaterial({ color: 0xeeeeee })));
        return w;
    },
    fire: stf(0xff5a1f),
    ice: stf(0x7de8ff),
    hammer: () => {
        const w = new THREE.Group();
        const h = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 5), new THREE.MeshLambertMaterial({ color: 0x5a3b22 }));
        w.position.y = -0.52;
        h.rotation.x = Math.PI / 2;
        h.position.set(0, 0, 0.22);
        w.add(h);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, 0.13), new THREE.MeshLambertMaterial({ color: 0x777b80 }));
        head.position.set(0, 0, 0.5);
        w.add(head);
        return w;
    },
    axe: () => {
        const w = new THREE.Group();
        const h = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 5), new THREE.MeshLambertMaterial({ color: 0x5a3b22 }));
        w.position.y = -0.52;
        h.rotation.x = Math.PI / 2;
        h.position.set(0, 0, 0.3);
        w.add(h);
        const axeHead = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28, 0.2), new THREE.MeshLambertMaterial({ color: 0x9aa0a6 }));
        axeHead.position.set(0, 0, 0.62);
        w.add(axeHead);
        return w;
    },
    club: () => {
        const w = new THREE.Group();
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.1, 0.8, 6), new THREE.MeshLambertMaterial({ color: 0x6b4a2a }));
        w.position.y = -0.52;
        c.rotation.x = -Math.PI / 2;
        c.position.set(0, 0, 0.4);
        w.add(c);
        return w;
    },
};

/**
 * Build character rig - IMPROVED VERSION with rounded stylized models
 */
export function buildRig(opts) {
    // Map old parameters to new system
    const { skin, hair, cloth, pants, cape, armor, w, sh, sw, s, face, belt, role } = opts;
    
    // Updated independent low-poly studio models, with original rig as reversible fallback.
    const visualId={knight:'kn',ranger:'pa',mage:'so',druid:'dr',blacksmith:'blacksmith',sage:'sage',
        bandit:'bandit',skeleton:'skeleton',troll:'troll',orc:'orc'}[role];
    const updated = visualId ? createCharacterVisualV2(visualId,{skin,hair,scale:s||1,armor,weaponModel:w}) : null;
    if (updated) return updated;

    // Use improved character model builder
    const group = buildImprovedRig({
        skin: skin || 0xd9a97f,
        hair: hair,
        cloth: cloth || 0x8a5a35,
        pants: pants || 0x3d3328,
        belt: belt || 0x2a1a0c,
        cape: cape,
        armor: armor || 0,
        weapon: w,
        shield: sh,
        scale: s || 1,
        face: face,
        role: role || 'adventurer'
    });
    
    const rig = group.userData.r;
    
    // Attach weapons using improved models
    if (w && IMPROVED_WEAPON_FACTORIES[w]) {
        const weaponMesh = IMPROVED_WEAPON_FACTORIES[w]();
        attachWeaponToRig(rig, weaponMesh);
        
        // Set rig properties for animation compatibility
        rig.sw = sw || (w.startsWith('sword') ? 2.1 : 1);
        rig.aim = w.startsWith('bow');
    }
    
    // A bow is a two-handed weapon, not a shield.
    if (sh === 'bow' && !w) {
        const bowMesh = IMPROVED_WEAPON_FACTORIES.bow();
        attachWeaponToRig(rig, bowMesh);
        rig.aim = true;
        rig.sw = 1;
    }
    // Attach shield using improved model
    if (sh && sh !== 'bow' && IMPROVED_WEAPON_FACTORIES[sh]) {
        const shieldMesh = IMPROVED_WEAPON_FACTORIES[sh]();
        attachShieldToRig(rig, shieldMesh);
    }
    
    return group;
}

/**
 * Create player entity
 */
export function createPlayer() {
    const P = {
        kind: 'p',
        name: 'Aventureiro',
        tx: 13,
        tz: 15,
        x: 13,  // Initialize actual position from target
        z: 15,  // Initialize actual position from target
        mesh: new THREE.Group(),
        cls: 'kn',
        sk: 0,
        ar: 0,
        cds: [0, 0, 0, 0],
        ownedWeapons: [], equippedWeapons: {}, skillLevels: {},
        b: {}, // buffs
        rl: 0, // replay learned
        rc: 0, // replay cooldown
        mana: CLASSES.kn.mp,
        mm: CLASSES.kn.mp,
        hp: CLASSES.kn.hp,
        max: CLASSES.kn.hp,
        lv: 1,
        xp: 0,
        gold: 0,
        bonus: 0, // weapon bonus damage
        axeAwakeUntil: 0, axeAwakeCooldown: 0, axeProcNext: 0,
        reg: 0,
        at: 0,
        bt: 0,
        ph: 0,
        fl: 0,
        fv: 0,
        st: {},
        vx: 0,
        vz: 0,
        spd: 0,
        stp: 0,
        path: [],
        greet: false,
        rp: 0,
        cd: 0,
        kc: '',
        rk: 0,
        tag: null,
        bar: null,
    };
    loadArsenalProgress(P);
    ensureArsenal(P);
    return P;
}

/**
 * Apply class and skin to player
 */
export function applyAppearance(P) {
    const c = CLASSES[P.cls];
    ensureArsenal(P);
    const weapon = equippedWeapon(P);
    const s = SKINS[P.sk];
    const y = P.mesh.rotation.y;
    const oldModel=P.mesh;
    gameState.scene.remove(oldModel);
    // Weapons and outfits are rebuilt when equipped: free retired GPU buffers
    // so repeated shopping does not leak memory on Android WebView.
    if(oldModel?.traverse){
        const geos=new Set(),mats=new Set();
        oldModel.traverse(o=>{
            if(o.geometry)geos.add(o.geometry);
            for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)mats.add(m);
        });
        for(const g of geos)g.dispose?.();
        for(const m of mats)m.dispose?.();
    }
    P.mesh = buildRig({
        skin: s.s,
        hair: s.h,
        cloth: c.cloth,
        pants: 0x3d3a52,
        cape: c.cape,
        armor: P.ar,
        w: weapon.model,
        sh: P.cls === 'kn' ? c.sh : null,
        role: ({ kn: 'knight', pa: 'ranger', so: 'mage', dr: 'druid', yo: 'sage' })[P.cls],
        sw: c.sw,
        s: s.sc,
        face: s.f,
    });
    // Replace old weapon geometry on the equipped hand (not an extra loose prop).
    if (weapon.kind === 'axe') attachReplayAxe(P.mesh, P.cls);
    P.mesh.userData.e = P;
    P.mesh.rotation.y = y;
    P.mesh.position.set(P.x, gameState.getHeightAt(P.x, P.z), P.z);
    P.fv = 0;
    gameState.scene.add(P.mesh);
    P.g = P.mesh; // Store mesh reference as 'g' like original
    
    // Update animator rig reference if animator exists
    syncReplayAxeVisual(P);
    if (P.animator && P.mesh.userData.r) {
        P.animator.bindRig(P.mesh.userData.r, P);
    }
}

/**
 * Update skill UI
 */
export function updateSkillUI() {
    const pw = POWERS[gameState.P.cls];
    pw.forEach((p, i) => {
        const b = document.getElementById(i === 3 ? 's4' : 's' + i);
        if (b) {
            const lv=skillLevel(gameState.P,i);
            const cd = Math.max(0, Math.ceil(gameState.P.cds[i] || 0));
            const key = i === 3 ? '5' : String(i + 1);
            // One compact, accessible label for controller/touch, independent of desktop styling.
            b.replaceChildren();
            const number = document.createElement('span'); number.className = 'skill-key'; number.textContent = key;
            const label = document.createElement('span'); label.className = 'skill-label'; label.textContent = p.n;
            b.append(number, label);
            if (cd) { const timer = document.createElement('span'); timer.className = 'skill-cd'; timer.textContent = cd; b.append(timer); }
            b.classList.toggle('skill-locked', !lv);
            b.setAttribute('aria-label', `${key}: ${p.n}, ${lv ? 'nível '+lv : 'bloqueada'}${cd ? ', recarga '+cd+' segundos' : ''}`);
            b.title = lv ? p.mp + ' de mana' : 'Compre na aba Habilidades do Arsenal';
        }
    });
}

/**
 * Set player class and skin
 */
export function setClass(cls, sk) {
    const P = gameState.P;
    if (!Object.prototype.hasOwnProperty.call(CLASSES, cls)) return;
    const changingClass = P.cls !== cls;
    const previousHP = Number.isFinite(P.hp) ? P.hp : 0;
    const previousMana = Number.isFinite(P.mana) ? P.mana : 0;
    P.cls = cls;
    // Yoki is canonically a green-skinned orc; other skin choices stay optional.
    P.sk = cls==='yo' && changingClass && sk===P.sk ? 4 : sk;
    const c = CLASSES[cls];
    P.max = c.hp + (P.lv - 1) * c.up;
    P.hp = Math.max(0, Math.min(previousHP, P.max));
    P.mm = c.mp + (P.lv - 1) * c.mu;
    P.mana = Math.max(0, Math.min(previousMana, P.mm));
    // A recarga pertence ao jogador, não ao visual da classe.
    // Nunca zere cooldowns ao trocar de personagem/classe.
    if (!Array.isArray(P.cds)) P.cds = [0, 0, 0, 0];
    // Elimine buffs da classe anterior, especialmente Passo Veloz.
    if (changingClass) {
        P.b = {};
        P.axeAwakeUntil = 0; // Switching class breaks attunement; recharge is not reset.
        P.kc = ''; // Atualizar HUD na troca
    }
    ensureArsenal(P);
    if (P.tag) P.tag.firstChild.nodeValue = c.n;
    applyAppearance(P);
    updateSkillUI();
    updateHUD();
}

/**
 * Update HUD
 */
export function updateHUD() {
    const P = gameState.P;
    const c = CLASSES[P.cls];
    document.getElementById('hpt').textContent = Math.max(0, P.hp) + ' / ' + P.max;
    document.getElementById('hpb').style.width = Math.max(0, P.hp / P.max * 100) + '%';
    document.getElementById('lv').textContent = P.lv;
    document.getElementById('gd').textContent = P.gold;
    document.getElementById('xpb').style.width = (P.xp / (P.lv * 50)) * 100 + '%';
    document.getElementById('arm').textContent = ARMORS[P.ar].n + ' (+' + ARMORS[P.ar].def + ')';
    document.getElementById('mpb').style.width = (P.mana / P.mm) * 100 + '%';
}

/**
 * Character creator UI
 */
export function buildCharacterCreatorUI() {
    const clsContainer = document.getElementById('cls');
    clsContainer.innerHTML = Object.entries(CLASSES).map(([k, c]) => 
        `<button data-k='${k}' class='${k === gameState.P.cls ? 'on' : ''}'><b>${c.n}</b><br>${c.d}</button>`
    ).join('');
    
    const sknContainer = document.getElementById('skn');
    sknContainer.innerHTML = SKINS.map((s, i) => 
        `<button data-s='${i}' title='${s.n}' class='sw ${i === gameState.P.sk ? 'on' : ''}' style='${s.f != null ? 'background:var(--p' + s.f + ') center/cover' : 'background:linear-gradient(135deg,#' + s.s.toString(16).padStart(6, '0') + ' 55%,#' + (s.h ?? s.s).toString(16).padStart(6, '0') + ' 55%)'}'></button>`
    ).join('');
}

/**
 * Floating damage/heal text
 */
export function showFloatingText(entity, text, color) {
    const d = document.createElement('div');
    d.className = 'fl';
    d.textContent = text;
    d.style.color = color;
    document.getElementById('ov').appendChild(d);
    gameState.fl.push({ d, x: entity.x, z: entity.z, t: 0 });
}

// Animation poses are exclusively managed by characterAnimator.js.
// Legacy animatePlayer was removed to prevent double timer/rig updates.
