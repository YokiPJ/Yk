# HINÁRIA 1.1.0 — COMBATE 2.0 VISÍVEL (Correção de UX)

Base: Fase 1 com Story Expansion e fix de cooldowns.

## Onde está o combate?
- O novo botão **⚔ Combate 2.0: LIGADO** aparece diretamente no HUD, embaixo de Visual e Arsenal.
- Com o **Cavaleiro e uma espada**, aparecem à direita os botões **⚔ Golpe** e **↪ Esquiva**, e a stamina.
- No teclado: **J** ou **Espaço** para golpear; **K** para esquivar.
- Escolha um alvo próximo usando **Alvo**. Pressione Golpe durante o fim da animação para encadear até 3 ataques.
- O mesmo botão no HUD desliga o modo e restaura o ataque automático. A preferência é salva no navegador.
- Paladino, Feiticeiro e Druida continuam com os ataques originais (os quatro pilares da V1.1.0 não estão todos implementados).

## Arquivos alterados em relação à Fase 1 anterior
- index.html — controle acessível no HUD, aviso, layout responsivo
- src/combat/combatV2.js — flag ligada por padrão
- src/combat/combatV2Bridge.js — preferência persistente e feedback visual de estado
- src/player/controls.js — handler do botão novo
- tests/test_combat_v2_phase1.mjs — asserção do default atualizado

Não foram alterados missões, cutscenes, mapa, inventário, models, inimigos ou fórmulas de dano.

## Testes
Executar: `node --test tests/test_combat_v2_phase1.mjs tests/test_combat_v2_animation.mjs`
Mais regressões: `node tests/test_class_swap_cooldowns.cjs && node tests/test_mobile_controls.cjs && node tests/test_v1080_village_bosses.mjs`

**Ainda sem confirmação de visual/WebGL/Android.**
