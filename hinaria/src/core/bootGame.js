/**
 * HINÁRIA - Main Entry Point
 * Um Mundo Além dos Sonhos
 */

import * as THREE from 'three';
import { CONFIG, GAME_IDENTITY } from './config.js';
import { deviceRenderProfile } from './renderProfile.js';
import { optimizeStaticChunks, freezeStaticTransforms } from '../world/staticBatch.js';
import { initGameFlow } from './gameFlow.js';
import { initTitleMenu } from '../ui/titleMenu.js';
import { ensureArsenal } from '../player/arsenal.js';
import { Q } from '../quest/quests.js';
import { closeArsenal } from '../ui/arsenalUI.js';
import { closeDialogue } from '../ui/dialogueUI.js';
import { houseSnapshot, restoreHouse, leaveHouse } from '../world/houseInteriors.js';
import { cutsceneSnapshot, restoreCutscenes, cancelCutscenes } from '../cutscene/cutsceneSystem.js';
import { loreSnapshot, restoreLore } from '../lore/loreSystem.js';
import { snapshotFog, restoreFog } from '../ui/hud.js';
import { refreshQuestUI, resetQuestIntro } from '../quest/questUI.js';
import { updateHUD } from '../ui/hud.js';
import { gameState } from './gameState.js';
import { readSave } from './saveManager.js';
import { createPart2Director } from '../content/part2Director.js';
import { generateWorld, buildWorldMeshesAsync } from '../world/world.js';
import { installV6Diagnostics } from '../world/v6CollisionDebug.js';
import { initUI, say } from '../ui/hud.js';
import { buildCharacterCreatorUI } from '../player/player.js';
import { createPlayer, applyAppearance, updateSkillUI, CLASSES, SKINS, ARMORS } from '../player/player.js';
import { initControls } from '../player/controls.js';
import { initQuestUI } from '../quest/questUI.js';
import { initArsenalUI } from '../ui/arsenalUI.js';
import { initDialogueUI } from '../ui/dialogueUI.js';
import { initLoop } from './loop.js';
import { initCutscenePreview } from '../cutscene/cutsceneSystem.js';
import { initPerformanceUI, effectivePixelRatio } from '../ui/performanceUI.js';
import { initDiagnostics } from '../ui/qaDiagnostics.js';
import { initLore } from '../lore/loreSystem.js';
import { initHudOverhaulV1 } from '../ui/hudOverhaulV1.js';
import { initHudPixiV2 } from '../ui/hudPixiV2.js';
import { updateChunkVisibility } from '../world/chunkVisibility.js';
import { initializeVisualAtmosphere } from '../vfx/worldAtmosphereV3.js';
import { initClaudeVfx, clearClaudeVfx } from '../vfx/claudeVfxBridge.js';
import { createBram, createYoki, setNPCRefs } from '../npc/npc.js';
import { spawnEnemy, SPAWN_ZONES } from '../combat/combat.js';

// Make gameState globally accessible for debugging
window.gameState = gameState;

// Initialize Three.js
function initThreeJS(boot) {
    const profile=deviceRenderProfile(),MOBILE=profile.mobile;

    gameState.renderer = new THREE.WebGLRenderer({
        antialias: !MOBILE,
        powerPreference: 'high-performance'
    });
    boot.watchRenderer(gameState.renderer);
    gameState.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,profile.initialRatio));
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
        const vw = Math.max(1, wrap.clientWidth || window.innerWidth || 1);
        const vh = Math.max(1, wrap.clientHeight || window.innerHeight || 1);
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
export async function initGame(boot) {
    // Set document title
    document.title = `${GAME_IDENTITY.NAME} — ${GAME_IDENTITY.SUBTITLE}`;
    const buildLabel=document.getElementById('hinaria-build');
    if(buildLabel)buildLabel.textContent=`${GAME_IDENTITY.VERSION} · COMBATE MANUAL + VFX/SFX V2 · STORY`;

    // Init Three.js
    await boot.phase('renderer', 'Preparando os gráficos…', () => initThreeJS(boot));

    // Generate world
    const savedWorld=readSave();
    const worldSeed=savedWorld.ok?savedWorld.data.world.seed||11:11;
    await boot.phase('world', 'Preparando Vilarrubra…', () => generateWorld({seed:worldSeed}));

    // Build world meshes
    await boot.phase('world-meshes', 'Construindo a vila e os caminhos…', () => buildWorldMeshesAsync(boot.yield));
    await boot.phase('world-batches', 'Organizando o mundo…', () => {
        for(const marker of gameState.loreMarkers||[])marker.crystal.userData.dynamicTransform=true;
        gameState.staticBatchStats=optimizeStaticChunks(gameState.worldChunks);
        freezeStaticTransforms(gameState.ground);freezeStaticTransforms(gameState.waterMesh);
    });

    // V6 diagnostics are opt-in (window.HINARIA_V6.toggleCollision()).
    installV6Diagnostics();

    // Create player
    await boot.phase('characters', 'Preparando os personagens…', () => {
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

    });

    // Spawn enemies
    await boot.phase('enemies', 'Preparando os encontros…', async () => {
        for (const zone of SPAWN_ZONES) {
            for (let i = 0; i < zone.n; i++) spawnEnemy(zone.k, zone);
            await boot.yield();
        }

    });

    // Initialize UI
    await boot.phase('interface', 'Preparando a interface e os controles…', () => {
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

    });

    // Compile the visible world before enabling title actions. The title cover
    // remains visible while the driver prepares shaders for the first village frame.
    await boot.phase('shaders', 'Preparando a imagem da vila…', async () => {
      const renderer = gameState.renderer;
      // Three r160 compile() traverses hidden chunks too. This temporary input
      // references visible meshes without changing their real parents/resources.
      const visibleMeshes = new THREE.Group();
      gameState.scene.traverseVisible(object => { if (object.material) visibleMeshes.children.push(object); });
      try {
        if (typeof renderer.compileAsync === 'function')
          await renderer.compileAsync(visibleMeshes, gameState.camera, gameState.scene);
        else renderer.compile(visibleMeshes, gameState.camera, gameState.scene);
        boot.validateShaders();
      } finally { visibleMeshes.children.length = 0; }
    });

    // One lifecycle authority. UI renderers subscribe to transitions and dispose
    // independently; the world/controls/main loop are initialized exactly once.
    initGameFlow({classes:CLASSES,skinCount:SKINS.length,armorCount:ARMORS.length,
      quests:Q,ensureArsenal,applyAppearance,updateHUD,updateSkillUI,buildCharacterCreatorUI,
      refreshQuestUI,resetQuestIntro,loreSnapshot,restoreLore,snapshotFog,restoreFog,
      cutsceneSnapshot,restoreCutscenes,cancelCutscenes,houseSnapshot,restoreHouse,leaveHouse,
      closeArsenal,closeDialogue,clearVfx:clearClaudeVfx,spawnEnemy,spawnZones:SPAWN_ZONES});
    initTitleMenu();
    gameState.part2Director=createPart2Director({state:gameState,quests:Q,spawnEnemy});
    // Initialize main loop
    initLoop();

    // V7.8: sem chat. O jogador toca em NPCs ou usa Conversar (F).
    say('Chegue perto de Bram ou Yoki e toque em <b>Conversar</b>. Não precisa digitar!', 'sys');

    console.log(`[${GAME_IDENTITY.NAME}] Initialized v${GAME_IDENTITY.VERSION}`);
}
