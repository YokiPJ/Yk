# HINÁRIA 1.1.0 — Cutscenes cinematográficas V2

Esta atualização usa a abertura **Chegada a Vilarrubra** como linguagem visual das demais cenas: travelling, aproximação, letreiros, caixas de diálogo, barras cinematográficas e transição de retorno ao controle.

## Cenas existentes aprimoradas
1. Chegada a Vilarrubra — mantida como referência original (não alterada no conteúdo).
2. Diário de Garrick — enquadramento do interior e título de revelação.
3. Troll Ancião — nova apresentação panorâmica, aproximação e fala.
4. Rei dos Orcs — nova apresentação panorâmica, aproximação e falas.

## Cenas novas
5. Yoki, o Bárbaro do Replay — após concluir Ratos Inquietos, aproximando-se de Yoki.
6. Ponte Velha — ao visitar a ponte durante a missão O Brilho no Espelho.
7. Vitória contra o Troll Ancião — após matar o boss.
8. Vitória contra o Rei dos Orcs — após matar o boss.

## Áudio
Os dois MP3 enviados foram incluídos localmente:
- Troll Ancião: `assets/audio/boss-troll-battle.mp3` (de `Battle.mp3`).
- Rei dos Orcs: `assets/audio/boss-orc-heavy.mp3` (de `heavy_boss_battle_1_bpm200.mp3`).

As músicas tocam em loop e substituem somente o tema de boss correspondente, mantendo `boss-original-v79.mp3` como fallback. O modo de cinema mantém o tema de boss até o encerramento da cena de vitória. Sem necessidade de internet para os MP3.

## Prévia sem alterar progresso
No navegador, acrescente `?cinema=1` ao endereço do jogo, por exemplo `http://localhost:60971/?cinema=1`. Abre-se o botão **🎬 Cenas**. As prévias não são marcadas como assistidas, mas cenas que dependem de NPC, boss ou sala só podem ser abertas quando esses elementos existem. Escape pula a cena; Enter/F ou Continuar avança.

O menu **não aparece no jogo normal** (sem parâmetro `?cinema=1`). As cutscenes de história reais são exibidas uma vez por instalação/navegador conforme o armazenamento já existente, que foi preservado.

## Arquivos existentes alterados
- `src/cutscene/scenes.js`
- `src/cutscene/cutsceneSystem.js`
- `src/audio/gameAudio.js`
- `src/audio/bossTrackConfig.js`
- `src/main.js`
- `src/combat/combat.js`
- `tests/test_music_loop_boss.mjs` (adaptado para as duas novas faixas)

## Arquivos adicionados
- `assets/audio/boss-troll-battle.mp3`
- `assets/audio/boss-orc-heavy.mp3`
- `tests/test_story_cutscenes_extended.mjs`

## Testes realizados
- `node --check` nos módulos alterados: PASS.
- `node tests/test_story_cutscenes_extended.mjs`: PASS (8 cenas, poses, tempo e câmera).
- `node tests/test_music_loop_boss.mjs`: PASS (loop, músicas, troca, fallback e pausa).
- Testes restantes pré-existentes: PASS no ambiente de desenvolvimento.
- ZIP testado em integridade (CRC).

**Não testado:** renderização WebGL real, sincronização visual dos personagens nas animações, build Android, FPS e reprodução dos MP3 no aparelho do usuário. Alguns movimentos de câmera podem precisar de ajuste visual.

## Instalação
**Versão completa:** descompacte em uma pasta nova e use os comandos do projeto:

```bash
npm install
npm run android:add      # somente se a pasta android ainda não existir
npm run android:debug
```

**Patch:** extraia `HINARIA_PATCH_CUTSCENES_V2` em `/workspaces/Apk` e execute:

```bash
bash HINARIA_PATCH_CUTSCENES_V2/INSTALAR_CUTSCENES.sh HINARIA_1_1_0_VISUAL_3D_ATUALIZADA
```

O patch cria backup em `.hinaria_backups/` e **recusa instalar se um arquivo existente divergir da versão-base esperada**. Ele também suporta reaplicação idempotente. Se a tua base já tiver outras alterações, não force a cópia: teste a versão completa separadamente.

As músicas são arquivos fornecidos pelo usuário; nenhuma declaração de licença de terceiros é feita aqui.
