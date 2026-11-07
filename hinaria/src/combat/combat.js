import { findForwardEnemy, hasLineOfSight } from './forwardHit.js';
/**
 * Combat System - Attacks, Skills, Damage, Projectiles, Effects
 */

import { Q } from '../quest/quests.js';
import { PART2_SPAWNS, PART2_BOSS_VISUALS, part2SpawnTarget } from '../content/part2.js';
import { notifyBossVictory } from '../cutscene/cutsceneSystem.js';
import { refreshQuestUI } from '../quest/questUI.js';
import * as THREE from 'three';
import {createCharacterVisualV2} from '../modelsV2/index.js';
import { CONFIG, GAME_IDENTITY, DIRECTIONS_8 } from '../core/config.js';
import { gameState } from '../core/gameState.js';
import { CLASSES, POWERS, ARMORS, showFloatingText, buildRig, updateSkillUI } from '../player/player.js';
import { findPath, occ, near, still } from '../world/world.js';
import { say, updateHUD } from '../ui/hud.js';
import { IMPROVED_WEAPON_FACTORIES } from '../player/weaponModels.js';
import { equippedWeapon, skillLevel } from '../player/arsenal.js';
import { updateEntityAnimation } from '../player/characterAnimator.js';
import { playSkillSfx } from '../audio/skillSfx.js';
import { playClaudeVfx, playClaudeSkill } from '../vfx/claudeVfxBridge.js';
import { playHitSfx } from '../audio/hitSfx.js';
import { isCombatV2Invulnerable, cancelCombatV2 } from './combatV2Bridge.js';
import { combatV2, isKnightCombatV2 } from './combatV2.js';

const ri = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const rnd = (a, b) => a + Math.random() * (b - a);

// Enemy kind definitions
export const ENEMY_KINDS = {
    rat: { name: 'Rato', hp: 12, dmg: [1, 2], xp: 8, gold: [1, 3], sp: 0.65, ag: 3, ac: 2.4, rs: 30 },
    bandit: { name: 'Bandido', hp: 28, dmg: [2, 5], xp: 16, gold: [3, 8], sp: 0.95, ag: 5, ac: 2, rs: 25 },
    skeleton: { name: 'Esqueleto', hp: 40, dmg: [3, 6], xp: 24, gold: [5, 12], sp: 0.85, ag: 5, ac: 1.8, rs: 25 },
    troll: { name: 'Troll', hp: 55, dmg: [3, 7], xp: 35, gold: [6, 16], sp: 0.75, ag: 6, ac: 1.6, rs: 15 },
    orc: { name: 'Orc', hp: 120, dmg: [6, 11], xp: 90, gold: [20, 40], sp: 0.7, ag: 6, ac: 1.8, rs: 60 },
};

// Spawn zones
export const SPAWN_ZONES = [
    { k: 'rat', n: 6, x0: 22, z0: 2, x1: 31, z1: 36, zn: [1], level: 1 },
    { k: 'rat', n: 4, x0: 1, z0: 24, x1: 30, z1: 36, zn: [1], level: 1 },
    { k: 'bandit', n: 5, x0: 2, z0: 38, x1: 30, z1: 52, zn: [2], level: 3 },
    { k: 'orc', n: 2, x0: 2, z0: 53, x1: 30, z1: 62, zn: [2], level: 8 },
    { k: 'skeleton', n: 6, x0: 44, z0: 6, x1: 60, z1: 20, zn: [4], level: 5 },
    { k: 'troll', n: 6, x0: 38, z0: 26, x1: 62, z1: 50, zn: [5], level: 9 },
    { k: 'orc', n: 3, x0: 53, z0: 52, x1: 62, z1: 62, zn: [6], level: 13 },
    // Região adicional (96x96): inimigos comuns já existentes, sem chefes nem IDs novos.
    { k: 'bandit', n: 3, x0: 7, z0: 73, x1: 29, z1: 92, zn: [2], level: 4 },
    { k: 'skeleton', n: 3, x0: 72, z0: 5, x1: 92, z1: 23, zn: [4], level: 7 },
    { k: 'troll', n: 3, x0: 72, z0: 35, x1: 92, z1: 62, zn: [5], level: 10 },
    { k: 'orc', n: 3, x0: 79, z0: 66, x1: 93, z1: 92, zn: [5], level: 13 },
    // Chefes são spawns adicionais, não substituem monstros das missões.
    { k: 'troll', n: 1, x0: 40, z0: 28, x1: 60, z1: 48, zn: [5], level: 14, boss: true, bossId: 'troll_ancient', title: 'Troll Ancião' },
    { k: 'orc', n: 1, x0: 53, z0: 53, x1: 62, z1: 62, zn: [6], level: 20, boss: true, bossId: 'orc_king', title: 'Rei dos Orcs' },
    // Append story zones: full saves retain the indices of all existing zones.
    ...PART2_SPAWNS,
];

/**
 * Zone-specific difficulty. Level 1 rats retain their original statistics.
 * Bosses remain threatening without extreme one-shot damage or excessive HP; no player-level scaling,
 * so exploration and levelling still matter and the starting village stays fair.
 */
export function enemyStatsForZone(kind, zone = {}) {
    const base = ENEMY_KINDS[kind];
    if (!base) throw new Error(`Tipo de monstro desconhecido: ${kind}`);
    const level = Math.max(1, Math.min(99, Math.round(zone.level ?? 1)));
    const boss = zone.boss === true;
    const growth = Math.max(0, level - 1);
    const hpFactor = (1 + growth * 0.16) * (boss ? 2.8 : 1);
    const damageFactor = (1 + growth * 0.09) * (boss ? 1.55 : 1);
    const hp = Math.round(base.hp * hpFactor);
    const dmg = base.dmg.map(v => Math.max(1, Math.round(v * damageFactor)));
    const xp = Math.round(base.xp * (1 + growth * 0.12) * (boss ? 4 : 1));
    const gold = base.gold.map(v => Math.round(v * (1 + growth * 0.1) * (boss ? 3 : 1)));
    return { ...base, hp, dmg, xp, gold, name: zone.title || base.name, level, boss };
}

/**
 * Spawn an enemy
 */
export function spawnEnemy(kind, zone, {restoring=false}={}) {
    if (zone.bossId && gameState.defeatedBosses?.has(zone.bossId)) return null;
    if (zone.activeQuest && part2SpawnTarget(zone,JSON.parse(Q.serialize()))<=0) return null;
    const K = enemyStatsForZone(kind, zone);
    let x, z, n = 0;
    do {
        x = ri(zone.x0, zone.x1);
        z = ri(zone.z0, zone.z1);
        n++;
    } while (n < 400 && (occ(x, z) || !gameState.RC[x * gameState.W + z] || !zone.zn.includes(gameState.ZN[x][z]) || (!restoring && Math.hypot(x - gameState.P.tx, z - gameState.P.tz) < 8)));
    if (n >= 400) return null;
    
    const mesh = createEnemyMesh(kind,zone.bossId);
    if (K.boss) mesh.scale.multiplyScalar(1.17);
    const enemy = {
        kind: 'm',
        k: kind,
        K,
        name: K.name,
        level: K.level,
        isBoss: K.boss,
        bossId: zone.bossId || null,
        tx: x,
        tz: z,
        mesh,
        hp: K.hp,
        max: K.hp,
        zd: zone,
        hz: gameState.ZN[x][z],
        cd: 0,
        rp: 0,
        path: [],
        st: {},
        bn: 0,
    };
    return registerEntity(enemy);
}

/**
 * Create enemy mesh
 */
function createEnemyMesh(kind,bossId=null) {
    // Boss-specific models use exact existing entity identifiers; stats/AI/quests unchanged.
    const variant=PART2_BOSS_VISUALS[bossId];
    const bossVisual = (typeof variant==='string'?variant:variant?.model) || (bossId==='troll_ancient'?'troll_ancient':bossId==='orc_king'?'orc_king':null);
    if (bossVisual) {
        const mesh=createCharacterVisualV2(bossVisual);
        if (mesh) {
            if(variant){
                // Palette ownership stays with this boss; shared original models remain intact.
                const materials=new Map(),tint=new THREE.Color(variant.tint??0x709caf);
                mesh.traverse(part=>{
                    if(!part.isMesh)return;
                    const recolor=original=>{
                        if(!materials.has(original)){
                            const material=original.clone();material.color?.lerp(tint,.38);materials.set(original,material);
                        }
                        return materials.get(original);
                    };
                    part.material=Array.isArray(part.material)?part.material.map(recolor):recolor(part.material);
                });
                mesh.name='SentinelaDoEco';
            }
            return mesh;
        }
    }
    // This will use the rig system from player.js
    const rig = buildEnemyRig(kind);
    return rig;
}

/**
 * Build enemy rig (simplified version of player rig)
 */
function buildEnemyRig(kind) {
    const group = new THREE.Group();
    const unit = new THREE.Group();
    const rig = { unit, legs: [], amp: 0.6, tail: null };
    group.add(unit);
    group.userData.r = rig;
    
    switch (kind) {
        case 'rat':
            return buildRat();
        case 'bandit':
            return buildHumanoid({ skin: 0xc99a73, hair: 0x3a2a1a, cloth: 0x4a4a5a, pants: 0x3a3a3a, belt: 0x2a2118, w: 'sword', role: 'bandit' });
        case 'skeleton':
            return buildHumanoid({ skin: 0xd9d6c8, hair: null, cloth: 0x555550, pants: 0x444440, belt: 0x2a2118, w: 'sword', role: 'skeleton' });
        case 'troll':
            return buildHumanoid({ skin: 0x6f8f5f, cloth: 0x6b5a3a, pants: 0x4a3d2a, belt: 0x2a2118, s: 1.5, w: 'club', role: 'troll' });
        case 'orc':
            return buildHumanoid({ skin: 0x5f7a45, hair: null, cloth: 0x5a2f2f, pants: 0x3a2a20, belt: 0x2a2118, s: 1.7, w: 'axe', role: 'orc' });
    }
}

function buildRat() {
    const group = new THREE.Group();
    const unit = new THREE.Group();
    const rig = {unit, legs:[], amp:.55, tail:null, head:null};
    group.userData.r=rig; group.add(unit);
    // Mobile visibility: taller silhouette and higher contrast fur to distinguish from dirt.
    group.scale.setScalar(1.5);
    const fur=new THREE.MeshLambertMaterial({color:0xb79b78,emissive:0x23150a,emissiveIntensity:.22});
    const furLight=new THREE.MeshLambertMaterial({color:0xe1c49e});
    const pink=new THREE.MeshLambertMaterial({color:0xc98d90});
    const black=new THREE.MeshBasicMaterial({color:0x1b1715});
    const white=new THREE.MeshBasicMaterial({color:0xffffff});
    function ell(parent, material, x,y,z, sx,sy,sz,seg=10) {
        const m=new THREE.Mesh(new THREE.SphereGeometry(1,seg,8),material);
        m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;
    }
    // V6 mouse: teardrop torso, lifted snout, oversized expressive ears.
    ell(unit,fur,0,.22,-.04,.205,.18,.34,12);
    ell(unit,furLight,0,.133,.075,.15,.065,.24);
    const head=rig.head=new THREE.Group();head.position.set(0,.24,.24);unit.add(head);
    ell(head,fur,0,0,0,.145,.13,.155);
    ell(head,furLight,0,-.045,.125,.102,.065,.132);
    ell(head,pink,0,-.026,.247,.039,.031,.041,8);
    for(const s of [-1,1]) {
        const ear=ell(head,fur,s*.108,.15,-.033,.084,.115,.045);
        ear.rotation.z=-s*.27;
        const inner=ell(head,pink,s*.108,.16,.006,.059,.083,.02);
        inner.rotation.z=-s*.27;
        ell(head,black,s*.102,.028,.133,.034,.034,.023,8);
        ell(head,white,s*.093,.041,.15,.009,.009,.009,6);
        for(let j=-1;j<=1;j++) {
            const whisker=new THREE.Mesh(new THREE.CylinderGeometry(.003,.003,.20,4),furLight);
            whisker.position.set(s*(.105+.075),-.042+j*.024,.186);
            whisker.rotation.z=s*(Math.PI/2+j*.14);head.add(whisker);
        }
    }
    // 4 animated paws, placed below and to the sides of the body.
    for(const [x,z,phase] of [[-.15,.17,0],[.15,.17,Math.PI],[-.15,-.19,Math.PI],[.15,-.19,0]]) {
        const leg=new THREE.Group();leg.position.set(x,.13,z);leg.userData.p=phase;
        ell(leg,fur,0,-.044,0,.055,.085,.055,8);
        ell(leg,pink,0,-.114,.055,.06,.026,.09,8);
        unit.add(leg);rig.legs.push(leg);
    }
    const tail=rig.tail=new THREE.Group();tail.position.set(0,.20,-.33);unit.add(tail);
    const tailMat=new THREE.MeshLambertMaterial({color:0xb58c87});
    for(let i=0;i<5;i++) {
        const seg=new THREE.Mesh(new THREE.CylinderGeometry(.023-i*.003,.027-i*.003,.18,7),tailMat);
        seg.rotation.x=Math.PI/2+(i*.14);seg.position.set(.03*Math.sin(i*.65),.025*i,-.09-i*.155);
        tail.add(seg);
    }
    const blob=new THREE.Mesh(new THREE.CircleGeometry(.38,12),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.25}));
    blob.rotation.x=-Math.PI/2;blob.position.y=.018;group.add(blob);
    // Rigid pieces inherit their animated joint transforms. Keep Three's
    // bounding-sphere culling so offscreen rats submit no draw calls.
    return group;
}

function buildHumanoid(opts) {
    // Reuse the buildRig from player.js
    return buildRig(opts);
}

/**
 * Register entity in game state
 */
function registerEntity(e) {
    e.x = e.tx;
    e.z = e.tz;
    e.mesh.position.set(e.x, getHeightAt(e.x, e.z), e.z);
    e.mesh.userData.e = e;
    gameState.scene.add(e.mesh);
    
    const g = document.createElement('div');
    g.className = e.isBoss ? 'tag tag-monster tag-boss' : 'tag tag-monster';
    // Every enemy gets a real HP track AND a fill element. In V7 the missing <s>
    // made e.bar null, so health could not update when the enemy took damage.
    const label = document.createElement('span');
    label.className = 'tag-name';
    label.textContent = `${e.isBoss ? '☠ CHEFE · ' : ''}Nv. ${e.level} · ${e.name}`;
    const track = document.createElement('u');
    track.className = 'tag-health-track';
    const fill = document.createElement('s');
    fill.className = 'tag-health-fill';
    track.appendChild(fill);
    g.append(label, track);
    document.getElementById('ov').appendChild(g);
    e.tag = g;
    e.bar = fill;
    e.lastHpShown = -1;
    gameState.ents.push(e);
    return e;
}

function getHeightAt(x, z) {
    return gameState.getHeightAt(x, z);
}

/**
 * Deal damage
 */
export function dealDamage(attacker, target, damage) {
    if (target === gameState.P && isCombatV2Invulnerable(attacker)) {
        showFloatingText(target, 'DESVIO!', '#88eaff');
        playClaudeVfx('teleport',{x:target.x,y:gameState.getHeightAt(target.x,target.z)+.12,z:target.z},null,.35);
        return;
    }
    let cr = 0;
    if (attacker === gameState.P && Math.random() < CONFIG.CRIT_CHANCE) { damage *= CONFIG.CRIT_MULTIPLIER; cr = 1; }
    if (target === gameState.P) damage = Math.max(1, Math.round((damage - ARMORS[gameState.P.ar].def) * (gameState.P.b.guard > 0 ? 0.4 : 1)));
    if (attacker) {
        if (!(attacker.at > 0)) attacker.at = 1;
        if (attacker !== gameState.P) attacker.mesh.rotation.y = Math.atan2(target.x - attacker.x, target.z - attacker.z);
    }
    if (target._hinariaDeathProcessed) return;
    target.fl = 0.18;
    target.hp -= damage;
    target.hp = Math.max(0, target.hp);
    // Yoki's training is unlocked by his optional quest. The first hit teaches
    // the enemy pattern; only a repeated pattern within eight seconds grants
    // a 20% wider dodge window (Knight V2, not unconditional invulnerability).
    if (target === gameState.P && attacker?.kind === 'm' && Q.status('yoki_marcacoes') === 'done') {
        target.replayRead = { enemyKind: attacker.k, expires: gameState.t + 8 };
    }
    // VFX e SFX centralizados: inimigos, ataques manuais e habilidades usam o mesmo dano.
    if (damage > 0) {
        playClaudeVfx(cr ? 'hit_crit' : 'hit',{x:target.x,y:gameState.getHeightAt(target.x,target.z)+.85,z:target.z},null,.60);
        playHitSfx(target === gameState.P ? 'enemy' : 'player');
    }
    if (target === gameState.P && navigator.vibrate) navigator.vibrate(25);
    showFloatingText(target, cr ? damage + '!' : damage, target === gameState.P ? '#ff7a6b' : cr ? '#ffd24a' : '#ffe2a8');
    if (target === gameState.P) { say(`Você perdeu ${damage} de vida${attacker ? ` por um ataque de ${attacker.name}` : ''}.`, 'dmg'); updateHUD(); }
    if (target.hp <= 0) target === gameState.P ? playerDie() : killEnemy(target);
}

/**
 * Kill enemy
 */
export function grantXp(n) {
    gameState.P.xp += n;
    while (gameState.P.xp >= gameState.P.lv * 50) levelUp();
    updateHUD();
}

export function killEnemy(enemy) {
    if (!enemy || enemy._hinariaDeathProcessed || !gameState.ents.includes(enemy)) return;
    enemy._hinariaDeathProcessed = true;
    enemy.hp = 0;
    const K = enemy.K;
    const g = ri(...K.gold);
    gameState.P.gold += g;
    gameState.P.xp += K.xp;
    say(`Você matou um ${K.name}. Ganhou <b>${g} de ouro</b> e <b>${K.xp} de exp</b>.`, 'sys');
    gameState.dead.push({ m: enemy.mesh, entity: enemy, t: 0 });
    enemy.tag.remove();
    gameState.ents.splice(gameState.ents.indexOf(enemy), 1);
    if (gameState.tgt === enemy) gameState.tgt = null;
    // Respawn uses simulation time, so menus/background genuinely freeze it.
    // Boss rewards remain one-time even if killed before accepting their quest.
    if (enemy.isBoss && enemy.bossId) {
        if (!gameState.defeatedBosses) gameState.defeatedBosses = new Set();
        gameState.defeatedBosses.add(enemy.bossId);
    } else if (!enemy.zd?.activeQuest) {
        if (!gameState.enemyRespawns) gameState.enemyRespawns = [];
        gameState.enemyRespawns.push({kind:enemy.k,zone:enemy.zd,due:gameState.t+K.rs});
    }
    while (gameState.P.xp >= gameState.P.lv * 50) levelUp();
    updateHUD();
    // Queue the cinematic before quest callbacks/UI can interrupt the flow.
    // Does not change rewards, boss progression or respawn rules.
    if (enemy.isBoss) notifyBossVictory(enemy);
    Q.emit('kill', { k: enemy.k, bossId: enemy.bossId, region:enemy.zd?.region });
}

/**
 * Player death
 */
function playerDie() {
    cancelCombatV2();
    say('Você caiu. Uma sombra grande se aproxima, te levanta e diz: <b>De novo.</b>', 'npc');
    gameState.P.gold -= gameState.P.gold >> 2;
    gameState.P.hp = gameState.P.max;
    gameState.P.mana = gameState.P.mm;
    gameState.P.axeAwakeUntil = 0; // Death ends the axe's awakened state.
    gameState.P.tx = 7; gameState.P.tz = 8;
    gameState.P.x = 7; gameState.P.z = 8;
    gameState.P.vx = gameState.P.vz = gameState.P.spd = 0;
    gameState.P.stp = 0;
    gameState.P.path = [];
    gameState.P.b = {};
    gameState.hist.length = 0;
    gameState.tgt = null;
    updateHUD();
}

/**
 * Level up
 */
function levelUp() {
    gameState.P.xp -= gameState.P.lv * 50;
    gameState.P.lv++;
    const c = CLASSES[gameState.P.cls];
    gameState.P.max += c.up;
    gameState.P.hp = gameState.P.max;
    gameState.P.mm += c.mu;
    gameState.P.mana = gameState.P.mm;
    playClaudeVfx('level_up',{x:gameState.P.x,y:gameState.getHeightAt(gameState.P.x,gameState.P.z),z:gameState.P.z},null,.72);
    say(`Você avançou para o nível <b>${gameState.P.lv}</b>!`, 'npc');
    refreshQuestUI();
}

/**
 * Cast skill
 */
export function castSkill(i) {
    if ((gameState.flow && gameState.flow !== 'PLAYING') || gameState.pauseRequested || gameState.arsenalOpen || gameState.dialogueOpen || gameState.insideHouse) return;
    if (gameState.ccOpen || gameState.cutsceneActive) return;
    if (isKnightCombatV2(gameState.P, equippedWeapon(gameState.P)) && (combatV2.attacking || combatV2.isDodging)) return;
    const c = CLASSES[gameState.P.cls];
    const p = POWERS[gameState.P.cls][i];
    if (!p || gameState.P.cds[i] > 0) return;
    const skillLv=skillLevel(gameState.P,i);
    if(!skillLv){say('Essa habilidade ainda está bloqueada. Abra Arsenal > Habilidades.', 'sys');return;}
    const weapon=equippedWeapon(gameState.P);
    const reach=weapon.range;
    if (gameState.P.mana < p.mp) { say('Mana insuficiente.', 'sys'); return; }
    
    let T = null;
    if (p.t === 'hit' || (p.t === 'aoe' && !p.self)) {
        T = findForwardEnemy(gameState, gameState.P, reach);
        if (!T) { say('Nenhum inimigo visível ao alcance.', 'sys'); return; }
    }

    gameState.P.mana -= p.mp;
    gameState.P.cds[i] = Math.max(1,p.cd*(1-0.10*(skillLv-1)));
    gameState.P.at = 1;
    // Um único sistema visual: pacote Claude. O som e a mecânica continuam originais.
    playClaudeSkill(gameState.P.cls,i,gameState.P,(p.t==='buff'||p.t==='heal'||p.self)?gameState.P:T);
    playSkillSfx(gameState.P.cls, i);
    
    if (p.t === 'heal') {
        const h = Math.round(gameState.P.max * p.f * (1+.22*(skillLv-1)));
        gameState.P.hp = Math.min(gameState.P.max, gameState.P.hp + h);
        showFloatingText(gameState.P, '+' + h, '#7dff9a');
    } else if (p.t === 'buff') {
        gameState.P.b[p.b] = p.s * (1+.22*(skillLv-1));
        showFloatingText(gameState.P, p.n, '#ffe9a0');
    } else {
        const o = p.self ? gameState.P : T;
        for (const m of gameState.ents.slice()) if (m.kind === 'm' && (p.t === 'hit' ? m === T : near(m, o) <= p.r)) {
            dealDamage(gameState.P, m, Math.round((ri(...c.dmg) + gameState.P.lv + gameState.P.bonus) * p.m * (1+.22*(skillLv-1)) * (gameState.P.b.rage > 0 ? 1.6 : 1)));
            if (p.st && m.hp > 0) m.st[p.st[0]] = p.st[1];
        }
    }
    updateHUD();
    updateSkillUI();
}

/**
 * Replay (time rewind)
 */
export function replay() {
    if ((gameState.flow && gameState.flow !== 'PLAYING') || gameState.pauseRequested || gameState.dialogueOpen || gameState.arsenalOpen || gameState.insideHouse || gameState.cutsceneActive) return;
    if (isKnightCombatV2(gameState.P, equippedWeapon(gameState.P)) && (combatV2.attacking || combatV2.isDodging)) return;
    if (gameState.ccOpen || !gameState.P.rl || gameState.P.rc > 0 || gameState.hist.length < 4) return;
    if (gameState.P.mana < 20) { say('Mana insuficiente.', 'sys'); return; }
    const h = gameState.hist[0];
    gameState.P.mana -= 20;
    gameState.P.rc = 30;
    if (!occ(h.x, h.z, gameState.P)) {
        gameState.P.tx = h.x; gameState.P.tz = h.z;
        gameState.P.x = h.x; gameState.P.z = h.z;
        gameState.P.vx = gameState.P.vz = gameState.P.spd = 0;
        gameState.P.stp = 0;
        gameState.P.path = [];
    }
    gameState.P.hp = Math.max(gameState.P.hp, h.hp);
    playClaudeVfx('teleport',{x:gameState.P.x,y:gameState.getHeightAt(gameState.P.x,gameState.P.z),z:gameState.P.z},null,.85);
    showFloatingText(gameState.P, 'Replay', '#9fc4ff');
    say('<b>Replay:</b> você volta alguns segundos no tempo.', 'npc');
    updateHUD();
}

/**
 * Projectile
 */
export function fireProjectile(from, to, color, onHit) {
    let m;
    if(from===gameState.P && equippedWeapon(from).kind==='bow'){
        m=new THREE.Group();
        const wood=new THREE.MeshBasicMaterial({color:0xe7c998});
        const metal=new THREE.MeshBasicMaterial({color:color||0xe6eaf2});
        const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.4,6),wood);
        shaft.rotation.x=Math.PI/2;
        m.add(shaft);
        const arrowHead=new THREE.Mesh(new THREE.ConeGeometry(.043,.11,6),metal);
        arrowHead.rotation.x=Math.PI/2;
        arrowHead.position.z=.24;
        m.add(arrowHead);
        for(const s of [-1,1]){
            const feather=new THREE.Mesh(new THREE.BoxGeometry(.07,.014,.10),metal);
            feather.position.set(s*.038,0,-.16);
            m.add(feather);
        }
        m.rotation.y=Math.atan2(to.x-from.x,to.z-from.z);
    }else{
        m = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8), new THREE.MeshBasicMaterial({ color: color||0xff7a2a }));
    }
    // Claude handles the visible bolt for staff users; keep this mesh as a
    // timing carrier so collision/damage callbacks remain exactly as before.
    if (from===gameState.P && equippedWeapon(from).kind==='staff') m.visible=false;
    const originY=gameState.getHeightAt(from.x,from.z)+1.04;
    m.position.set(from.x,originY,from.z);
    gameState.scene.add(m);
    gameState.pr.push({m,a:[from.x,from.z],startY:originY,b:to,t:0,f:onHit,
        range:from===gameState.P?equippedWeapon(from).range+1:9});
}

/**
 * Update projectiles
 */
export function updateProjectiles(dt) {
    for(let i=gameState.pr.length-1;i>=0;i--){
        const p=gameState.pr[i];
        const target=p.b;
        // The projectile doesn't retarget or hit enemies that died during flight.
        const alive=target && Number.isFinite(target.x) && Number.isFinite(target.z) &&
          (!(Number.isFinite(target.hp)) || target.hp>0) && !target.dead && !target._hinariaDeathProcessed;
        const originDist=alive?Math.hypot(target.x-p.a[0],target.z-p.a[1]):Infinity;
        const visible=alive && originDist<=p.range+.15 &&
          hasLineOfSight(gameState,p.a[0],p.a[1],target.x,target.z);
        if(!visible){
            gameState.scene.remove(p.m);disposeCombatObject(p.m);gameState.pr.splice(i,1);
            continue;
        }
        p.t=Math.min(1,p.t+Math.max(0,dt)/.34);
        const oldX=p.m.position.x,oldZ=p.m.position.z;
        // Interpolating towards the live enemy curves the arrow/staff carrier
        // as the enemy moves. Arrows remain visible; staff carriers stay hidden.
        const x=p.a[0]+(target.x-p.a[0])*p.t;
        const z=p.a[1]+(target.z-p.a[1])*p.t;
        const y=p.startY+(gameState.getHeightAt(target.x,target.z)+.78-p.startY)*p.t+
            Math.sin(p.t*Math.PI)*.15;
        p.m.position.set(x,y,z);
        if(p.m.rotation && Math.hypot(x-oldX,z-oldZ)>.001)
            p.m.rotation.y=Math.atan2(x-oldX,z-oldZ);
        if(p.t>=1){
            gameState.scene.remove(p.m);disposeCombatObject(p.m);gameState.pr.splice(i,1);
            if(target.hp>0 && !target.dead && !target._hinariaDeathProcessed) p.f?.();
        }
    }
}

/** Dynamic actors own their geometry/materials; cached texture maps stay alive. */
function disposeCombatObject(mesh) {
    const geometries=new Set(),materials=new Set();
    mesh?.traverse?.(o=>{if(o.geometry)geometries.add(o.geometry);
        for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)materials.add(m);});
    for(const g of geometries)g.dispose?.();
    for(const m of materials)m.dispose?.();
}

/**
 * Update effects
 */
export function updateEffects(dt) {
    // Partículas de Claude são atualizadas uma única vez no core/loop.js.
    for (let i = gameState.dead.length - 1; i >= 0; i--) {
        const q = gameState.dead[i];
        q.t += dt;
        if (q.entity) updateEntityAnimation(q.entity, dt);
        if (q.t > 0.5) q.m.scale.setScalar(Math.max(0.01, 1 - (q.t - 0.5) * 2));
        if (q.t > 1) { gameState.scene.remove(q.m); disposeCombatObject(q.m); gameState.dead.splice(i, 1); }
    }
}
