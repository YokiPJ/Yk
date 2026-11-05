# HINÁRIA 1.1.0 — FASE 1: A ERA DO COMBATE (implementação incremental)

**BASE:** HINARIA_1080_MESCLADA_STORY_CUTSCENES.zip (Story Expansion: quatro cutscenes + cooldowns fixados).

**ATENÇÃO:** esta é a Fase 0 + Fase 1, **não a atualização integral 1.1.0**. A inteligência dos inimigos V2, eventos de mundo e progressão das habilidades ainda estão desativadas, não foram implementadas nesta entrega. O jogo inicia no combate anterior, por padrão, para permitir rollback imediato.

## Como experimentar

1. Inicie normalmente a HINÁRIA e selecione o **Cavaleiro**.
2. Abra **⚙ Gráficos & Som** e clique em **Combate 2.0 (Cavaleiro): DESLIGADO**.
3. Selecione um inimigo pelo mundo ou botão **Alvo**.
4. **⚔ Golpe** ou tecla **J / Espaço**: golpes manuais. Toque de novo durante os últimos 0,25s do golpe anterior para encadear (1→2→3). Os impactos só aplicam dano na janela do golpe, uma vez por alvo. Sem alvo, a animação ainda funciona, mas não inflige dano.
5. **↪ Esquiva** ou tecla **K**: desvio na direção do analógico/WASD ou para trás se parado. Gasta 28 de stamina, duração de 0,4s, i-frames entre 0,075 e 0,265s e recarga de 0,95s. A colisão do jogo ainda bloqueia paredes.
6. Para voltar ao jogo antigo, desligue o botão nas configurações. **Não há migração de save**; stamina não é persistida nesta fase.

## Arquivos realmente alterados

- `index.html`
- `package.json`
- `src/combat/combat.js`
- `src/combat/combatV2.js`
- `src/combat/combatV2Bridge.js`
- `src/core/config.js`
- `src/core/loop.js`
- `src/player/characterAnimator.js`
- `src/player/controls.js`
- `tests/test_combat_v2_animation.mjs`
- `tests/test_combat_v2_phase1.mjs`
- `tests/test_mobile_controls.cjs`
- `tools/assemble-debug.mjs`
- `tools/build-web.mjs`
- `tools/verify-release.mjs`

Tudo que não aparece na lista permanece byte a byte igual ao arquivo enviado (veja `RESUMO_MESCLA.json`). O modelo do rato, cutscenes, diálogos, quests, recompensas e arsenal não foram alterados.

## Instalação de patch (Codespaces)

O ZIP do patch é para o código base extraído de `HINARIA_1080_MESCLADA_STORY_CUTSCENES.zip` ou para sua pasta que contenha **exatamente esses arquivos**. Não sobrescreva patches divergentes.

```bash
cd /workspaces/Apk
unzip -o HINARIA_110_FASE1_PATCH_CODESPACES.zip
bash HINARIA_1_1_0_FASE1_PATCH/INSTALAR_HINARIA_110_FASE1.sh /workspaces/Apk/HINARIA_1_0_8_0_LIMPA
```

Se a pasta alvo tiver outro nome, passe o caminho correto. O instalador confere SHA-256 de todos os arquivos alterados antes de escrever e salva backup.

## Como compilar a versão completa

```bash
cd HINARIA_1_1_0_COMBATE_FASE1
npm install
npm run build:web
npm run android:sync
npm run android:debug
```

Necessita Android SDK/Gradle configurado no Codespaces. **Nenhum APK foi compilado neste ambiente.**

## Testes

```bash
node --test tests/test_combat_v2_phase1.mjs tests/test_combat_v2_animation.mjs
node tests/test_class_swap_cooldowns.cjs
node tests/test_mobile_controls.cjs
node tests/test_v1080_village_bosses.mjs
node tools/verify-release.mjs
node tools/test-package.mjs
```

Validação efetuada: sintaxe e testes unitários/estáticos. Não foram executados navegador WebGL, Android ou ensaios de FPS. Os scripts antigos `validate_imports.js` e `check_exports.js` da base estão em CommonJS apesar da extensão `.js` dentro de pacote ESM e já não rodam via `node` simples, sem relação com Combate V2. Alguns testes antigos exigem Playwright, não disponível aqui.

## Rollback

- No jogo: desligue **Combate 2.0** nas configurações (volta ao ataque automático sem mudar seus saves).
- No código: restaure os arquivos de `BACKUP_HINARIA_110_FASE1_...` para a pasta raiz; se instalou numa pasta de teste separada, pode simplesmente voltar à pasta original.
- Dados do Arsenal continuam na chave localStorage `hinaria.v7.arsenal.v1` sem alterações.

## Próximas fases

Fase 2: IA de inimigos (FSM e telegraph); Fase 3: eventos do mundo; Fase 4: progressão das habilidades; Fase 5: homologação de gameplay e Android.
