/**
 * HINÁRIA - Main Entry Point
 * Um Mundo Além dos Sonhos
 */

import * as THREE from 'three';
import { CONFIG, GAME_IDENTITY } from './core/config.js';
import { deviceRenderProfile } from './core/renderProfile.js';
import { optimizeStaticChunks, freezeStaticTransforms } from './world/staticBatch.js';
import { initGameFlow } from './core/gameFlow.js';
import { initTitleMenu } from './ui/titleMenu.js';
import { ensureArsenal } from './player/arsenal.js';
import { Q } from './quest/quests.js';
import { closeArsenal } from './ui/arsenalUI.js';
import { closeDialogue } from './ui/dialogueUI.js';
import { houseSnapshot, restoreHouse, leaveHouse } from './world/houseInteriors.js';
import { cutsceneSnapshot, restoreCutscenes, cancelCutscenes } from './cutscene/cutsceneSystem.js';
import { loreSnapshot, restoreLore } from './lore/loreSystem.js';
import { snapshotFog, restoreFog } from './ui/hud.js';
import { refreshQuestUI, resetQuestIntro } from './quest/questUI.js';
import { updateHUD } from './ui/hud.js';
import { gameState } from './core/gameState.js';
import { generateWorld, buildWorldMeshes, updateWorld, getHeightAt, findPath } from './world/world.js';
import { initAssets, MATERIALS, OBJECT_GEOMETRIES, TYPE_MATERIALS } from './assets/procedural.js';
import { installV6Diagnostics } from './world/v6CollisionDebug.js';
import { initUI, say } from './ui/hud.js';
import { buildCharacterCreatorUI } from './player/player.js';
import { createPlayer, applyAppearance, setClass, updateSkillUI, CLASSES, SKINS, ARMORS, POWERS, showFloatingText } from './player/player.js';
import { initControls } from './player/controls.js';
import { initQuestUI } from './quest/questUI.js';
import { initArsenalUI } from './ui/arsenalUI.js';
import { initDialogueUI } from './ui/dialogueUI.js';
import { initLoop } from './core/loop.js';
import { initCutscenePreview } from './cutscene/cutsceneSystem.js';
import { initPerformanceUI, effectivePixelRatio } from './ui/performanceUI.js';
import { initDiagnostics } from './ui/qaDiagnostics.js';
import { initLore } from './lore/loreSystem.js';
import { initHudOverhaulV1 } from './ui/hudOverhaulV1.js';
import { initHudPixiV2 } from './ui/hudPixiV2.js';
import { updateChunkVisibility } from './world/chunkVisibility.js';
import { initializeVisualAtmosphere } from './vfx/worldAtmosphereV3.js';
import { initClaudeVfx, clearClaudeVfx } from './vfx/claudeVfxBridge.js';
import { createBram, createYoki, setNPCRefs } from './npc/npc.js';
import { spawnEnemy, dealDamage, fireProjectile, killEnemy, castSkill, replay, updateProjectiles, updateEffects, ENEMY_KINDS, SPAWN_ZONES } from './combat/combat.js';

// Make gameState globally accessible for debugging
window.gameState = gameState;

// Initialize Three.js
function initThreeJS() {
    const profile=deviceRenderProfile(),MOBILE=profile.mobile;
    
    gameState.renderer = new THREE.WebGLRenderer({
        antialias: !MOBILE,
        powerPreference: 'high-performance'
    });
    gameState.renderer.setPixelRatio(Math.min(devicePixelRatio,profile.initialRatio));
    document.getElementById('wrap').appendChild(gameState.renderer.domElement);
    
    gameState.scene = new THREE.Scene();
    gameState.scene.matrixAutoUpdate=false;
    gameState.scene.background = new THREE.Color(CONFIG.COLORS.BACKGROUND);
    gameState.scene.fog = new THREE.Fog(CONFIG.COLORS.FOG_DEFAULT, 15, 32);
    
    gameState.camera = new THREE.PerspectiveCamera(CONFIG.CAMERA_FOV, 1, CONFIG.CAMERA_NEAR, CONFIG.CAMERA_FAR);
    
    // Lights
    gameState.scene.add(new THREE.HemisphereLight(CONFIG.COLORS.HEMI_SKY, CONFIG.COLORS.HEMI_GROUND, CONFIG.COLORS.HEMI_INTENSITY));
    const sun = new THREE.DirectionalLight(CONFIG.COLORS.SUN_COLOR, CONFIG.COLORS.SUN_INTENSITY);
    sun.position.set(6, 12, 5);
    gameState.scene.add(sun);
    
    // Camera look-at target
    gameState.L = new THREE.Vector3();
    
    // Resize handler
    function handleResize() {
        const wrap = document.getElementById('wrap');
        const vw = wrap.clientWidth;
        const vh = wrap.clientHeight;
        const ratio=effectivePixelRatio();
        if(Math.abs(gameState.renderer.getPixelRatio()-ratio)>.001)gameState.renderer.setPixelRatio(ratio);
        gameState.renderer.setSize(vw, vh, false);
        gameState.camera.aspect = vw / vh;
        gameState.camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial resize
}

// Initialize all systems
async function init() {
    // Set document title
    document.title = `${GAME_IDENTITY.NAME} — ${GAME_IDENTITY.SUBTITLE}`;
    const buildLabel=document.getElementById('hinaria-build');
    if(buildLabel)buildLabel.textContent=`${GAME_IDENTITY.VERSION} · COMBATE MANUAL + VFX/SFX V2 · STORY`;
    
    // Init Three.js
    initThreeJS();
    
    // Generate world
    generateWorld();
    
    // Build world meshes
    buildWorldMeshes();
    for(const marker of gameState.loreMarkers||[])marker.crystal.userData.dynamicTransform=true;
    gameState.staticBatchStats=optimizeStaticChunks(gameState.worldChunks);
    freezeStaticTransforms(gameState.ground);freezeStaticTransforms(gameState.waterMesh);
    
    // V6 diagnostics are opt-in (window.HINARIA_V6.toggleCollision()).
    installV6Diagnostics();

    // Create player
    gameState.P = createPlayer();
    applyAppearance(gameState.P);
    gameState.ents.push(gameState.P);
    initializeVisualAtmosphere(gameState.scene);
    initClaudeVfx(gameState);
    updateChunkVisibility(gameState.P.x, gameState.P.z);
    
    // Create NPCs
    gameState.N = createBram();
    gameState.Y = createYoki();
    setNPCRefs(gameState.N, gameState.Y);
    
    // Spawn enemies
    for (const zone of SPAWN_ZONES) {
        for (let i = 0; i < zone.n; i++) spawnEnemy(zone.k, zone);
    }
    
    // Initialize UI
    initUI();
    initQuestUI();
    initArsenalUI();
    initDialogueUI();
    initPerformanceUI();
    initDiagnostics();
    initLore();
    initCutscenePreview();
    
    // Initialize controls
    initControls();
    
    // UI V1: original handlers stay attached before the compact menu wraps them.
    initHudOverhaulV1();
    // HUD V2 em PixiJS (opcional; se falhar, o HUD clássico continua)
    initHudPixiV2().catch(err => console.warn('[Hinária] HUD Pixi indisponível:', err));

    // One lifecycle authority. UI renderers subscribe to transitions and dispose
    // independently; the world/controls/main loop are initialized exactly once.
    initGameFlow({classes:CLASSES,skinCount:SKINS.length,armorCount:ARMORS.length,
      quests:Q,ensureArsenal,applyAppearance,updateHUD,updateSkillUI,buildCharacterCreatorUI,
      refreshQuestUI,resetQuestIntro,loreSnapshot,restoreLore,snapshotFog,restoreFog,
      cutsceneSnapshot,restoreCutscenes,cancelCutscenes,houseSnapshot,restoreHouse,leaveHouse,
      closeArsenal,closeDialogue,clearVfx:clearClaudeVfx,spawnEnemy,spawnZones:SPAWN_ZONES});
    initTitleMenu();
    // Initialize main loop
    initLoop();
    
    // V7.8: sem chat. O jogador toca em NPCs ou usa Conversar (F).
    say('Chegue perto de Bram ou Yoki e toque em <b>Conversar</b>. Não precisa digitar!', 'sys');

    console.log(`[${GAME_IDENTITY.NAME}] Initialized v${GAME_IDENTITY.VERSION}`);
}

// Start
init().catch(error => {
  console.error('[HINÁRIA] Falha de inicialização:',error);
  gameState.flow='BOOT';gameState.pauseRequested=true;
  const cover=document.getElementById('cover');
  if(cover){cover.hidden=false;cover.classList.remove('out');}
  document.body.dataset.flow='TITLE';document.body.dataset.bootState='failed';
  const status=document.getElementById('title-status');
  if(status){
    status.setAttribute('role','alert');status.setAttribute('aria-live','assertive');
    status.textContent=/webgl|context|renderer/i.test(String(error?.message))
      ? 'Não foi possível iniciar o WebGL. Ative a aceleração gráfica ou use um navegador compatível e tente novamente.'
      : 'Falha ao preparar HINÁRIA. Recarregue para tentar novamente; os detalhes técnicos estão no console.';
  }
  // A failed boot never exposes gameplay controls that were not initialized.
  for(const id of ['play','title-continue','title-settings','title-credits']){
    const button=document.getElementById(id);if(button){button.hidden=true;button.disabled=true;}
  }
  const actions=document.getElementById('title-actions');
  if(actions&&!document.getElementById('boot-retry')){
    const retry=document.createElement('button');retry.id='boot-retry';retry.type='button';retry.textContent='Recarregar';
    retry.addEventListener('click',()=>location.reload());actions.append(retry);retry.focus({preventScroll:true});
  }
});
