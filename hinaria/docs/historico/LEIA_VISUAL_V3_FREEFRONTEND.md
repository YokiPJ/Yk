# HINÁRIA — Visual V3 (referência FreeFrontend)

**Base:** HINÁRIA 1.1.0 Machado do Replay + Yoki. **Sem alterar combate, missões, saves, colisão ou rato.**

Referências pesquisadas em https://freefrontend.com/three-js/: `Interactive 3D Baked Room Concept` (iluminação econômica e detalhes de superfície); efeitos de partículas com geometria agrupada / instancing. A implementação é ORIGINAL: não copia o código ou assets de demos de terceiros.

## Alterações
- `src/vfx/worldAtmosphereV3.js`: poeira mágica discreta perto do jogador (uma Points draw call, 14 partículas em touch / 26 em desktop, padrão ativo).
- `src/player/replayAxeModel.js`: partículas coloridas acompanhando o machado desperto, sem novos eventos de combate, apenas efeito estético.
- `src/world/houseInteriors.js`: textura gerada offline para tábuas/madeira, brilho de janela sem sombra dinâmica extra, recursos descartados ao sair.
- `src/ui/performanceUI.js` + `index.html`: opção ✨ Atmosfera V3 em Gráficos & Som, persistida junto das preferências.
- `src/main.js` + `src/core/loop.js`: integração com o mesmo render loop, sem outro requestAnimationFrame.
- `tools/build-web.mjs`: as alterações entram no identificador da build offline.

## Testar
1. Dentro do jogo, abra Gráficos & Som e desligue/ligue ✨ Atmosfera V3.
2. Equipe o Machado do Replay, pressione R (despertar), veja as fagulhas e a lâmina animada.
3. Entre em uma casa, confira tábuas, luz da janela e animação interna, saia e entre novamente.
4. Pressione F3 e compare FPS/draw calls em antes/depois.
5. Compile no Codespaces: `npm install`, `npm run test:qa`, `npm run android:add` (apenas primeira vez) e `npm run android:debug`.

O visual em WebGL real e o desempenho em Android ainda exigem verificação em dispositivo. O jogo deve funcionar offline no APK após `build:web` com as dependências instaladas.
