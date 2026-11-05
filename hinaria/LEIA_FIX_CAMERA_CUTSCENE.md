# Hotfix: erro `Cannot read properties of undefined (reading 'HG')`

Base: HINARIA_110_COLISAO_CUTSCENES_CORRIGIDAS_COMPLETA.zip.

A função `clearBossView` recebia o método `gameState.getHeightAt` sem um receiver válido.
O novo callback `cinematicTerrainHeight` mantém o `gameState` ao consultar a altura
do terreno perto das pedras na câmera do Troll Ancião e do Rei dos Orcs.

**Mudança funcional:** somente `src/cutscene/cutsceneSystem.js`, dois trechos.
**Teste novo:** `tests/test_cutscene_terrain_context.mjs` simula rocha bloqueando a câmera.
**Preservados:** cenas, colisão, bosses, missões, combate e sons.

Este hotfix foi validado por sintaxe, teste de terreno/obstáculo e testes automatizados.
Não substitui teste visual de cutscenes e não confirma APK Android.

Para compilar: `npm install && npm run android:debug` na pasta do projeto.
Para teste no navegador: `?cinema=1`, abrir as cenas de vitória de ambos os bosses.
