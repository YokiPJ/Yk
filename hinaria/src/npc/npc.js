/**
 * NPC System - Bram (Blacksmith), Yoki (Lore/Replay), Dialogue
 */

import * as THREE from 'three';
import { CONFIG, GAME_IDENTITY } from '../core/config.js';
import { gameState } from '../core/gameState.js';
import { updateHUD } from '../ui/hud.js';
import { CLASSES, POWERS, ARMORS, buildRig, applyAppearance, showFloatingText } from '../player/player.js';
import { near } from '../world/world.js';
import { Q } from '../quest/quests.js';
import { buyOrEquip } from '../player/arsenal.js';

let offer = false;

/**
 * Create Bram (Blacksmith NPC)
 */
export function createBram() {
    const mesh = buildNPCBlacksmith();
    const bram = {
        kind: 'npc',
        name: 'Bram, o Ferreiro',
        tx: 17,
        tz: 9,
        hm: 0,
        mesh,
    };
    return registerNPC(bram);
}

/**
 * Create Yoki (Lore NPC)
 */
export function createYoki() {
    const mesh = buildNPCYoki();
    const yoki = {
        kind: 'npc',
        name: 'Yoki, o Olho-Parado',
        tx: 6,
        tz: 6,
        mesh,
    };
    // Mirror prop
    const rk = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), new THREE.MeshLambertMaterial({ color: 0x7d7a72 }));
    rk.scale.set(1.15, 0.6, 1);
    rk.position.set(6, 0.22, 5.95);
    gameState.scene.add(rk);
    
    const scr = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.04), new THREE.MeshBasicMaterial({ color: 0x2f9a50 }));
    const mir = new THREE.Group();
    const mirrorBack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.05), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    mirrorBack.position.set(0, 0, -0.03);
    mir.add(mirrorBack);
    mir.add(scr);
    mir.position.set(7.1, 0.2, 6.6);
    mir.rotation.set(-0.3, 0.6, 0);
    gameState.scene.add(mir);
    
    const gl = new THREE.PointLight(0x55ff88, 0.7, 3.5);
    gl.position.set(7.1, 0.6, 6.9);
    gameState.scene.add(gl);
    
    return registerNPC(yoki);
}

function buildNPCBlacksmith() {
    const group = buildRig({ skin: 0xd9a97f, hair: 0x5a3b22, cloth: 0x8a5a35, pants: 0x3d3328, w: 'hammer', role: 'blacksmith' });
    const r = group.userData.r;
    if (group.userData.hinariaV2) return group;
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.03), new THREE.MeshLambertMaterial({ color: 0x3a2f28 }));
    apron.position.set(0, 0.88, 0.17);
    r.unit.add(apron);
    const beard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.06), new THREE.MeshLambertMaterial({ color: 0x5a3b22 }));
    beard.position.set(0, -0.1, 0.13);
    r.head.add(beard);
    return group;
}

function buildNPCYoki() {
    const group = buildRig({ skin: 0x6f9a55, hair: null, cloth: 0x56565c, pants: 0x3b3430, belt: 0x2a2118, s: 1.25, w: 'axe', role: 'sage' });
    const r = group.userData.r;
    r.sit = 1;
    if (group.userData.hinariaV2) return group;
    for (const x of [-0.06, 0.06]) {
        const whisker = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.03, 0.1, 4), new THREE.MeshLambertMaterial({ color: 0xeeeadb }));
        whisker.position.set(x, -0.09, 0.15);
        r.head.add(whisker);
    }
    for (const x of [-0.3, 0.3]) {
        const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6), new THREE.MeshLambertMaterial({ color: 0x6b5a3a }));
        shoulder.position.set(x, 1.22, 0);
        r.unit.add(shoulder);
    }
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.05), new THREE.MeshLambertMaterial({ color: 0xeeeadb }));
    collar.position.set(0, 1.18, 0.16);
    r.unit.add(collar);
    return group;
}

function registerNPC(npc) {
    npc.x = npc.tx;
    npc.z = npc.tz;
    npc.mesh.position.set(npc.x, gameState.getHeightAt(npc.x, npc.z), npc.z);
    npc.mesh.userData.e = npc;
    gameState.scene.add(npc.mesh);
    
    const g = document.createElement('div');
    g.className = 'tag tag-npc';
    g.textContent = npc.name;
    document.getElementById('ov').appendChild(g);
    npc.tag = g;
    gameState.ents.push(npc);
    return npc;
}

/**
 * Bram dialogue
 */
export function replyBram(q) {
    if (/^(hi|oi|ola|salve|hello)\b/.test(q)) return 'Salve, forasteiro! Sou Bram, ferreiro de Vilarrubra. Escolha uma opção abaixo para conversar, comprar ou receber uma missão.';
    if (/job|trabalho|oficio/.test(q)) return 'Forjo lâminas e conserto armaduras. Mas ninguém me traz minério de verdade faz anos.';
    if (/name|nome/.test(q)) return 'Bram. Meu pai era Bram, meu avô era Bram. Falta imaginação nesta família.';
    if (/armadura|couro|malha|placas/.test(q)) {
        const a = ARMORS.findIndex((x, i) => i && q.includes(x.k));
        if (a < 1) return 'Tenho <b>couro</b> (60), <b>malha</b> (160) e <b>placas</b> (320). Qual delas?';
        if (gameState.P.ar >= a) return 'Você já veste algo igual ou melhor.';
        if (gameState.P.gold < ARMORS[a].cost) return 'Faltam moedas, forasteiro. Volte depois de caçar.';
        gameState.P.gold -= ARMORS[a].cost;
        gameState.P.ar = a;
        applyAppearance(gameState.P);
        updateHUD();
        return 'Fica bem em você. Isso aguenta uns golpes!';
    }
    if (/trade|comprar|vender|loja|armas|arsenal/.test(q)) { offer = true; return 'Forjo espadas, arcos e cajados! Abra <b>Arsenal</b> no HUD para comprar e equipar armas da sua classe. Armaduras: couro, malha, placas. Use os botões do Arsenal para comprar ou equipar.'; }
    if (offer && /^(yes|sim|s)$/.test(q)) { offer = false; const k={kn:'kn_steel',pa:'pa_hunter',so:'so_ember',dr:'dr_vine'}[gameState.P.cls]; const result=buyOrEquip(gameState.P,k); if(result.ok)applyAppearance(gameState.P); updateHUD(); return result.message; }
    if (offer && /^(no|nao|n)$/.test(q)) { offer = false; return 'Como quiser.'; }
    if (/bye|tchau|adeus/.test(q)) return 'Até logo, e cuidado com os trolls!';
    return 'Hm? Não entendi, forasteiro. Tente <b>job</b>, <b>name</b> ou <b>trade</b>.';
}

/**
 * Yoki dialogue
 */
export function replyYoki(q) {
    if (/^(hi|oi|ola|salve|hello)\b/.test(q)) return 'Hm. Tu chegou. Faz tempo que eu te vejo lutar. Escolha uma opção para saber da minha tribo e do espelho.';
    if (/name|nome/.test(q)) return 'Yoki. Na tribo me chamavam de Olho-Parado. Eu gostava.';
    if (/job|trabalho|oficio/.test(q)) return 'Eu observo. Quem observa lembra. Quem lembra não cai duas vezes do mesmo jeito.';
    if (/tribo|garra|tribe/.test(q)) return 'Garra Cinzenta. Ensinavam a esquecer a dor. Na noite em que os Quebra-Presas desceram, esquecer foi o que nos matou.';
    if (/espelho|caixa|gol|mirror/.test(q)) return 'Achei no fundo da caverna. Mostra um campo verde, gente gritando e uma bola que faz curva. Ninguém morre lá, e a vitória é bonita.';
    if (/habilidade|habilidades|poderes|treinar|train/.test(q)) return 'No botão <b>Arsenal</b> você encontra a aba Habilidades: aprimore seus poderes e desbloqueie o Especial!';
    if (/replay|aprender/.test(q)) { if (gameState.P.rl) return 'Tu já sabe. Agora usa: tecla <b>4</b> ou <b>R</b>.'; gameState.P.rl = 1; document.getElementById('s3').style.display = ''; return 'Replay não é magia. É lembrar de verdade. Toma: a tecla <b>4</b> ou <b>R</b> te leva uns segundos pra trás (20 de mana, 30s de espera).'; }
    if (/de novo|denovo/.test(q)) return 'De novo. Até tu lembrar.';
    if (/bye|tchau|adeus/.test(q)) return 'Vai. Quando cair, eu levanto.';
    return 'Hm. Tenta <b>name</b>, <b>tribo</b>, <b>espelho</b> ou <b>replay</b>.';
}

/**
 * Update NPCs (called each frame)
 */
export function updateNPCs(dt) {
    // Bram looks at player when near
    if (gameState.N) {
        if (near(gameState.P, gameState.N) <= 3) gameState.N.mesh.rotation.y = Math.atan2(gameState.P.x - gameState.N.x, gameState.P.z - gameState.N.z);
        else { gameState.N.mesh.rotation.y = Math.PI / 2; gameState.N.hm -= dt; if (gameState.N.hm < 0) { gameState.N.hm = 1.8; gameState.N.at = 1; } }
    }
    // Yoki always looks at player
    if (gameState.Y) gameState.Y.mesh.rotation.y = Math.atan2(gameState.P.x - gameState.Y.x, gameState.P.z - gameState.Y.z);
    
    // Mirror screen pulse
    if (gameState.scene.getObjectByName('mirrorScreen')) {
        gameState.scene.getObjectByName('mirrorScreen').material.emissive.setHex(Math.sin(gameState.t * 9) > 0 ? 0x2f9a50 : 0x4fd37a);
    }
}

// Store NPC references for the button dialogue system
gameState.N = null;
gameState.Y = null;

export function setNPCRefs(N, Y) {
    gameState.N = N;
    gameState.Y = Y;
}