# HINÁRIA · Upgrade 1.2.0

## Implementação

- Fluxo central BOOT/TITLE/CHARACTER_CREATION/PLAYING/PAUSED/DIALOGUE/CUTSCENE/DEAD, com entrada limpa a cada transição. Pausa retorna antes de qualquer simulação; renderização do mundo suspensa no título e em background.
- Título com artes locais extraídas da referência, crossfade de 1,7 s, parallax, brasas, revelação por letras e descarte de GPU ao sair. Fallback CSS, menu funcional e transições exclusivamente intencionais.
- HUD DOM acessível + Pixi opcional: classe/nível, HP/MP/XP, valores numéricos, rastro de dano, efeitos de cura/vida baixa, ouro/defesa/zona, estados reais e cooldown/mana/unlock dos poderes. Falha de Pixi mantém controles e barras DOM.
- Minimap proporcional com fog, orientação e inimigos próximos; mapa ampliado usa o mundo completo com exploração real. Vida de boss e aviso de golpe baseados nas condições reais de alcance/cooldown/posição.
- Menu existente evoluído: personagem, Arsenal, missões, mapa, Crônicas, ajustes, salvar/carregar, retomar e voltar ao título. Foco preso/restaurado, confirmações e suporte a teclado/toque. Android App plugin trata Voltar, background e saída nativa.
- Save completo `hinaria.fullgame.v1`, versionado e validado: identidade, classe/aparência, atributos, posição/orientação, arsenal, habilidades, recargas, quests, exploração, chests, fog, inimigos/renascimentos, bosses, lore, cenas e interior. Backup de save válido e tratamento de dados corrompidos/armazenamento indisponível. Chaves legadas preservadas.
- Combate continua manual: consulta frontal + alcance + linha de visão, sem giro automático para a vítima. VFX de projéteis já lançados continuam acompanhando a vítima válida. Respawn usa tempo de simulação. Bosses e recompensas são persistidos uma única vez, inclusive ao aceitar sua missão depois da vitória.
- Diálogos com foco e guardas contra botões obsoletos/toque duplicado; atmosfera cacheia bases e respeita movimento reduzido/background; diagnóstico registra amostras limitadas de FPS, quadro, memória e renderização. Recuperação de contexto WebGL mantém pausa e exige retomada explícita.
- Baseline de casas V3 corrigida no recorte do teste, preservando todas as asserções. Modo clássico corrigido: índice local no planter e ordem dos argumentos de três ornamentos que produziam posições/materiais inválidos.
- Dependências travadas em package-lock, servidor de desenvolvimento com bibliotecas locais, distribuição www offline com licenças e manifesto SHA256 de todos os recursos. Projeto nativo Android incluído, SDK helper repetível e build com fingerprint verificado dentro do APK.

## Arquivos originais modificados

- `src/combat/forwardHit.js`
- `src/combat/combat.js`
- `src/combat/combatV2Bridge.js`
- `src/ui/qaDiagnostics.js`
- `src/ui/hudPixiV2.js`
- `src/ui/hudOverhaulV1.js`
- `src/ui/dialogueUI.js`
- `src/ui/hud.js`
- `src/ui/titleScreenThree.js`
- `src/ui/performanceUI.js`
- `src/quest/questUI.js`
- `src/world/houseInteriors.js`
- `src/world/v6Architecture.js`
- `src/vfx/worldAtmosphereV3.js`
- `src/lore/loreSystem.js`
- `src/cutscene/cutsceneSystem.js`
- `src/main.js`
- `src/player/controls.js`
- `src/core/gameState.js`
- `src/core/loop.js`
- `src/core/config.js`
- `assets/ui/title-three.css`
- `assets/ui/hud-pixi-v2.css`
- `assets/ui/dialogue-v78.css`
- `index.html`
- `.gitignore`
- `tests/test_manual_combat_vfx.cjs`
- `tests/test_v76_houses.mjs`
- `tests/test_homing_target_and_vfx.mjs`
- `package.json`
- `tools/assemble-debug.mjs`
- `tools/build-web.mjs`
- `server.js`

## Arquivos novos principais

- `src/core/gameFlow.js`, `src/core/saveManager.js`, `src/ui/titleMenu.js`, `src/ui/hudData.js`.
- `assets/ui/hud-upgrade.css`, `assets/ui/upgrade-menu.css`, `assets/ui/title-reference-01.jpg`, `assets/ui/title-reference-02.jpg`.
- `tests/test_upgrade_*.mjs`: flow/save, fog/HUD, boss HUD/persistência, combate frontal, modo clássico e polimento.
- `tools/web-dependencies.mjs`, `tools/check-imports.mjs`, `tools/java-trust.mjs`, `tools/setup-android-sdk.sh` e os três runners `test-upgrade-browser`, `test-context-recovery`, `test-gameplay-roundtrip`.
- `package-lock.json`, projeto `android/`, distribuição `www/`, documentação, referências fornecidas e `qa-evidence/`.

Nenhum dos 357 arquivos originais foi removido. O ZIP de entrega omite apenas dependências/cache/builds regeneráveis e o APK, fornecido separadamente. `android/app/src/main/assets/public` é regenerado por `npm run android:sync`; `www/` já está incluído completo.
