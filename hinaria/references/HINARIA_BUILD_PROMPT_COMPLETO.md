build

# [ZERO] HINÁRIA — THREE.JS RPG 3D MASTER UPGRADE PROMPT

**OUTPUT LANGUAGE: Brazilian Portuguese (pt-BR). Keep program identifiers, code and existing asset filenames unchanged.**

## ROLE AND MISSION

You are a senior gameplay engineer, Three.js/WebGL developer, PixiJS UI engineer, technical artist, and Android/Capacitor performance engineer. Your task is to **BUILD, modify, test, and deliver the working HINÁRIA RPG 3D project**, not describe a hypothetical redesign.

**Read every supplied file before writing changes. Preserve what works. Implement a production-quality title menu, gameplay HUD, pause/menu system, and meaningful gameplay polish. Return the actual modified project.**

Work in JavaScript ES modules and keep the existing architecture unless there is a measurable reason to refactor it. Do not port this game to Unity, Godot, React, or another engine.

## INPUT FILES — READ THESE THREE ATTACHMENTS

1. `HINARIA_110_VILA_V3.zip` — the primary HINÁRIA v1.1.0 project; this is the authoritative source tree.
2. `HINÁRIA · Teste do HUD (PixiJS).html` — interactive visual/behavioral reference for the new HUD.
3. `HINÁRIA · Teste da tela de título (Three.js).html` — visual/behavioral reference for the cinematic title menu.

First inventory and inspect the entire ZIP (source, CSS, HTML, scripts, tests, documentation, local images, audio, Android build tools). Read the standalone HTML references too. Their embedded Base64 JPEG artwork is **not byte-identical** to the existing `assets/ui/*.jpg` files; if you want to use the reference artworks, extract them into properly named local assets, rather than assuming those files already exist.

Do not blindly transplant a demo HTML page into `index.html`. Convert relevant behavior into the existing modules, retaining event handlers, UI IDs, accessibility, controls, and rendering lifecycle.

## VERIFIED STARTING-POINT FACTS

- ZIP: 389 entries, 357 actual files, including 67 `src/*.js` modules, tests, web/mobile resources and documentation.
- `package.json`: `three@0.160.0`, `pixi.js@8.6.6`, `animejs@3.2.1`, `@capacitor/core@^7.0.0`, with npm scripts for `build:web`, `test:qa`, `android:sync`, `android:debug`.
- Main entrypoints: `index.html`, `src/main.js`, `src/core/gameState.js`, `src/core/loop.js`.
- World: 96x96, 16x16 visual chunks, Vilarrubra and surrounding fields/forest/ruins/cave, in `src/world/world.js`, `src/assets/villageModelsV3.js`, `src/world/houseInteriors.js`, `src/world/chunkVisibility.js`.
- Playable classes **already defined**: Cavaleiro (`kn`), Paladino (`pa`), Feiticeiro (`so`), Druida (`dr`), Yoki (`yo`). Do not remove or accidentally treat Yoki as unimplemented because an older README says otherwise.
- Existing gameplay: manual forward-facing attacks (`src/combat/forwardHit.js`), combat V2 combo/dodge/iframes, skills and cooldowns, equipment/arsenal, NPCs Bram and Yoki, quests, chronicles/lore, cutscenes, boss battles, animated world dressing, music/VFX/SFX, interiors and minimap/fog of war.
- Current UI is **not absent**: `src/ui/hud.js`, `src/ui/hudOverhaulV1.js`, `src/ui/hudPixiV2.js`, `src/ui/titleScreenThree.js`, `assets/ui/hud-overhaul-v1.css`, `assets/ui/hud-pixi-v2.css`, `assets/ui/title-three.css`. Upgrade and integrate these, avoiding duplicate implementations.
- HUD PixiJS draws a transparent non-interactive layer over original DOM buttons. The original HUD remains as fallback if Pixi cannot initialize.
- Title Three.js module already uses local black-and-white menu artwork, fades, particles, parallax and shader effects, with CSS fallback.
- The current cover has overlapping generic click-to-dismiss behavior in `index.html` and `src/main.js`. Replace this with deliberate menu interactions rather than letting any click accidentally start/hide the game.
- The compact `ui1-menu` currently opens visually, but the main loop only explicitly pauses for character creation, arsenal and dialogue; connect pause/modal states correctly instead of assuming opening the menu freezes gameplay.
- Existing localStorage features include arsenal, quest/exploration, graphics/audio and combat preferences. Preserve their keys and schema unless versioned migrations are implemented.
- Special diagnostic/compatibility flags include `?visual=classico`, `?stream=0`, `?cinema=1` and the opt-in Combat V2 toggle. Do not break them.
- **Baseline verified in Node 22.16.0:** `node tools/run-qa.mjs` = **34/35 passing**. The failing `tests/test_v76_houses.mjs` throws `ReferenceError: envV2 is not defined` because its `vm.runInNewContext` slice now includes the V3 village block referencing `envV2`. Investigate the test fixture against current source; do NOT inject a fake global into production just to quiet the test. `node tools/test-package.mjs` and `node tools/verify-release.mjs` passed. `node --check` passed on 74 source/build modules inspected. These are baseline checks, NOT proof of WebGL/Android runtime quality.

## NON-NEGOTIABLE INVARIANTS

1. Preserve the existing RPG: gameplay, classes, spawn logic, saves, camera, controls, quest progression, story, dialogue, world, houses, audio, animations and the manually triggered combat behavior.
2. Never bring back automatic damage, auto-attack, lock-on rings, automatic target-selection UI or aim snapping removed by the Combat UI V2 update. Hits must remain governed by forward cone/distance/line-of-sight and explicit inputs.
3. Keep collision, chunk culling, cutscene state, class-swap cooldowns, boss one-time rewards and house enter/exit working. No duplicate listeners, canvases, timers, animation loops or WebGL contexts after screen transitions.
4. Build for browser and Android WebView offline. No runtime CDN requirements in the APK. Update `tools/build-web.mjs` whenever assets or modules change. Handle missing visuals/fonts/audio gracefully.
5. Prefer incremental modules and targeted CSS over rewriting all systems. Every new control must do something real; no placeholder menu buttons, empty inventory windows or simulated saves.
6. Keep typography, contrast, safe-area insets, touch hitboxes and screen-reader labels appropriate for mobile.

## IMPLEMENTATION PLAN (EXECUTE, DON'T JUST EXPLAIN)

### P0 — REPAIR BASELINE & TITLE FLOW

- First reproduce and fix the `test_v76_houses.mjs` fixture/source mismatch, then rerun the full QA suite. Also check browser console, asset paths, and app startup; report failures transparently.
- Introduce a consistent UI/game flow for `BOOT`, `TITLE`, `CHARACTER_CREATION`, `PLAYING`, `PAUSED`, `DIALOGUE`, `CUTSCENE`, `DEAD` as needed. Integrate with `gameState` and `src/core/loop.js` rather than creating an unrelated game loop.
- Replace both generic cover-click dismissal listeners with one authoritative transition triggered by **Jogar / Novo Jogo**. Enter the existing character-creation flow if appropriate. Ensure the title renderer disposes GPU textures/materials/events on exit.
- A menu must not register gameplay movement, skills, clicks or taps through its overlay. On resume, reset frame delta and input state to prevent huge simulation steps and stuck movement.

### P1 — PREMIUM CINEMATIC MAIN MENU

Build on `src/ui/titleScreenThree.js` and `assets/ui/title-three.css`, using the supplied title reference HTML for visual direction. HINÁRIA remains subtitled **“Um Mundo Além dos Sonhos.”**

Visual style: luxury dark-fantasy monochrome, charcoal/black backgrounds, polished silver typography, subtle blood-red accents and restrained gold only where intentional. Reference traits: atmospheric black-and-white portraits, soft edge vignetting, cinematic 1.7s-style crossfades, Ken Burns movement, subtle pointer parallax, floating embers, staggered title reveal, premium button hover/focus/tap states. Avoid visual clutter.

Functional buttons:
- **Novo Jogo**: explicit transition to character creation / new session. Require confirmation before overwriting a real save.
- **Continuar**: shown/enabled only if a valid loadable full-game save exists; must restore state, not merely dismiss the cover.
- **Configurações**: working graphics quality, FPS, volume, sound and accessibility/reduced-motion controls connected to existing settings.
- **Créditos**: functional scrollable panel using actual project credit information; don't invent license claims.
- **Sair**: only where the Android host supports a real close action; in browser, use a coherent alternative such as returning to the menu or omit the option, never a dead button.

A responsive loading indicator is allowed only when attached to real initialization/preloading progress or honest stage milestones. Support keyboard, mouse and touch. Keep the CSS fallback if WebGL is unavailable. Preserve original artwork unless replacing with better assets provided or generated by the project; do not hotlink images.

### P2 — PROFESSIONAL IN-GAME HUD (PIXIJS + DOM)

Upgrade `src/ui/hudPixiV2.js`, `src/ui/hudOverhaulV1.js`, `src/ui/hud.js` and associated CSS based on the Pixi standalone reference. Preserve DOM as the interaction layer and PixiJS as the visual layer (`pointer-events: none`). Avoid duplicate DOM buttons or conflicting absolute positions.

Required visible and live data:
- Character portrait matched to class/appearance where valid art exists; class name and level.
- Smooth HP/MP/XP bars with correct numerical values, delayed damage trail, heal pulse and meaningful low-health effect; distinguish colors even with low color perception.
- Stamina bar when combat mode uses it; combat readiness, debuffs/status buffs where actual gameplay states provide data.
- Currency, armor/equipment cues and current-zone label.
- Skill dock for existing 3 primary skills, unlockable extras, and Combat V2 attack/dodge. Show key prompts, correct mana cost, cooldown seconds, radial countdown, disabled/locked state, and ready feedback.
- Compact objective tracker grounded in current quest data; click/tap opens the existing quest journal.
- Existing minimap with correct aspect ratio, fog of war, player facing, landmarks, near enemies only and accessible expand/collapse behavior.
- Nonintrusive toasts, damage text, quest completion and level-up feedback tied to real state changes.

Responsive arrangement:
- Mobile portrait: stats top-left, minimap top-right, joystick bottom-left, attacks/skills bottom-right, with safe-area margins and no overlap.
- Mobile landscape: low-height compact HUD, no clipped buttons or joystick/hotbar collisions.
- Desktop: balanced HUD, optional keyboard hints, scalable interface.
- Touch targets approximately 44 CSS px or larger where feasible.

Do not run heavy DOM queries, texture allocations or Pixi text recreation every frame. Reuse Graphics, Text, sprites and cached layouts; update dirty state and throttle layout reads. Pause nonessential HUD animation when the page is hidden. Keep classic HTML HUD usable if Pixi crashes or WebGL contexts are limited.

### P3 — REAL PAUSE / IN-GAME MENU

Evolve existing `ui1-menu` rather than building a competing overlay. Access by the `☰` HUD button or `M`; use `Escape` to close and preserve existing shortcuts. Animate the transition lightly and freeze gameplay simulation safely while paused (enemy AI, attacks, cooldowns, projectiles, pathing and movement), while rendering the paused scene/UI. Cutscenes and dialogues must retain their own semantics.

Build working sections, reusing existing views and handlers:
- **Personagem**: class, stats, equipment and appearance.
- **Arsenal / Inventário**: current weapons, unlocked skills and existing upgrade/equip interactions; only present inventory features backed by actual state.
- **Missões**: quest journal and current tracked objective.
- **Mapa**: existing minimap/full map and discovered exploration content, with legible UI.
- **Crônicas**: existing Yoki lore pages and unlock rules.
- **Configurações**: quality presets, graphics, FPS, music/SFX, volume, HUD size, motion setting.
- **Salvar / Carregar**: connect to real, validated save manager implementation from P4.
- **Retomar** and **Voltar ao título**: safe state transitions, no leaked listeners/renderers; confirm any potential loss of progress.

Keep menu focus trapped while open, restore focus on close, update ARIA states, support Android back handling, and prevent background clicks.

### P4 — SAVE / LOAD THAT ACTUALLY WORKS

Implement a versioned full-game save (`schemaVersion`, timestamp, identity, class, safe player position/orientation, health/mana/level/XP/currency, equipment/skill unlocks, progression flags, quest state, exploration/landmarks/chests, setting references). Use the current modules' authoritative state and persist only serializable data. Exclude Three.js objects, meshes, DOM nodes, functions, transient effects, runtime pointers and audio nodes.

Do not overwrite or corrupt existing keys such as `hinaria.v7.arsenal.v1`, `hinaria.quests.exploration.v2`, `hinaria.v110.combat_v2_enabled`, and `hinaria-v79-quality`. Add safe migrations/version checks, backups where possible, validation, storage exception handling and graceful missing/corrupt-save behavior. Restore gameplay systems in the correct order. Test save after playing, reloading, changing class, opening houses, completing quests and defeating bosses. Never display **Continuar** until the save truly restores.

### P5 — GAMEPLAY AND WORLD POLISH

Only after P0–P4 are functional, make thoughtful changes that improve feel without rewriting mechanics:
- Smoother acceleration/deceleration and animation blending, responsive camera yaw/zoom and camera occlusion handling, without breaking collision or cutscenes.
- Better enemy combat readability (wind-up, hit reaction, impact timing, stagger if compatible with existing rules) for all classes. Preserve deliberate manual attacks and dodge i-frames.
- More legible boss telegraphs, boss health presentation and encounter feedback for the existing boss fights. Never duplicate boss rewards or victory music.
- Vilarrubra polish: improve the existing procedural windmill, barn, stable, fountain, market, bridges, houses and environmental dressing without blocking paths or changing collision unpredictably. Respect the visual V3 placement system.
- NPC dialogue presentation: polished portraits, readable typography, meaningful response options and robust proximity interaction for Bram/Yoki. Preserve quest conditions and story text unless explicitly improving broken writing.
- Ambient polish: wind/particles, subtle lighting, fog and audio transitions, zone discovery notifications and cutscene fades. Avoid excessive mobile draw calls.
- If a desired feature is absent, implement its real gameplay/data integration or omit it; no decorative mock features.

### P6 — ANDROID / WEBGL PERFORMANCE & STABILITY

Inspect and optimize with measurements from `src/ui/qaDiagnostics.js`, `src/ui/performanceUI.js` and `src/world/chunkVisibility.js`. Keep `?stream=0` as a comparison mode and the existing automatic graphics-quality behavior.

- Minimize draw calls and shader/material variants; use batching/instancing where safe. Keep scene graph updates proportional to visible entities, avoiding per-frame object allocation.
- Keep chunk visibility; do not call it 'real streaming' unless geometry is actually unloaded/reloaded.
- Control DPR, particle count, shadows, antialiasing and rendering load by quality preset and device type.
- Dispose WebGL textures/renderers, geometry, UI ticker subscriptions, event listeners, temporary canvases and audio on transitions. Check for context loss; degrade gracefully.
- Test portrait/landscape, touch multitasking, virtual joystick plus attack simultaneously, Android back/foreground/background, offline first launch and sustained gameplay.
- Do not claim 60 FPS or successful Android APK operation without measurement. Record FPS, draw calls, memory trends and actual device used.

## TEST / VERIFICATION REQUIREMENTS

1. Establish baseline and document it. Specifically fix `tests/test_v76_houses.mjs` without weakening its geometric/waymarker assertions; the current V3 insertion changed the tested snippet scope.
2. Run `node tools/run-qa.mjs`, `node tools/test-package.mjs`, `node tools/verify-release.mjs` and JS syntax/import checks. Add tests for menu actions, title transitions, HUD state changes, pause/resume, save/load, fallback and touch interactions.
3. Run `npm install` then `npm run build:web`; verify `www` does not rely on runtime CDNs and every new local font/image/audio file is copied.
4. Serve the game with `node server.js`; perform actual browser/WebGL interaction tests and capture screenshots/logs if tools allow. Do not pretend Node unit tests validate visual rendering.
5. On a configured Android SDK environment, run `npm run android:sync` and `npm run android:debug`; report whether an APK was actually produced and tested.
6. Manually verify: all five classes; mouse/keyboard + touch; J/Space manual attack, K dodge, 1–5 skills, F dialogue, M menu, L chronicles, R Replay axe; quests, cutscenes, boss rewards, house entrances, minimap, legacy visual/stream modes and save restoration.
7. Confirm that menu, HUD, title and character creator never overlap incorrectly at 360x800, 390x844, 800x360, 1280x720 and a larger desktop viewport (use device emulation as needed).
8. No browser-console exceptions, no blank/black screen after menus/cutscenes, no stuck controls and no duplicate quest rewards.

## ACCEPTANCE CRITERIA

- The project boots normally in browser and works after offline web bundling.
- The start screen is unmistakably upgraded, cinematic and interactive; only intentional buttons launch gameplay.
- The in-game HUD is clearly improved, reflects **real** RPG state and remains usable on mobile.
- The pause/menu screen actually pauses game mechanics and all buttons lead to working features.
- Continuing a saved game truly restores a valid state; existing data stays intact.
- Gameplay systems remain playable, including manual combat, quest progression, Yoki lore, house interiors and bosses.
- Baseline QA regression is fixed; any remaining failure is explicitly disclosed with reproduction details.
- Memory/render resources are cleaned on menu exits and scene transitions.

## DELIVERY CONTRACT

Return **the complete modified project as a downloadable ZIP** (not merely snippets, a patch description or pseudocode). Keep the directory structure and full existing resources. Include all modified/new files, tests and any locally extracted UI assets. Produce a short `CHANGELOG_HINARIA_UPGRADE.md` and a `TEST_RESULTS.md` containing **only tests actually executed**.

In your final answer include:
1. A concise implementation summary and changed-file list.
2. The ZIP download link (and APK only if genuinely built).
3. Actual build commands and prerequisites.
4. QA results with exact pass/fail counts and unresolved issues.
5. How to play on desktop and Android and how to check the new UI.

**Start by inspecting the attached files and code dependencies. Then modify the actual project, test, correct regressions and package the result. Do not stop at an implementation plan. Do not invent API behavior, screenshots, benchmark results, completed tests or APK builds.**
