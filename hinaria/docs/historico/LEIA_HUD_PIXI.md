# HINÁRIA — HUD V2 com PixiJS

Novos: `src/ui/hudPixiV2.js`, `assets/ui/hud-pixi-v2.css`. Alterados: `index.html` (importmap `pixi.js` 8.6.6 + CSS), `src/main.js` (1 import + 1 chamada após o HUD V1), `tools/build-web.mjs` (copia pixi.min.mjs para vendor/), `package.json` (devDependency `pixi.js`).

## O que muda
- Placa de status: retrato redondo (`PORTRAIT` no topo do módulo), barras de HP/MP/XP animadas com rastro de dano, nível e ouro. Cores prata/preto, HP vermelho-sangue, MP azul-aço.
- Habilidades: recarga radial, brilho quando fica pronta, escurece sem mana ou bloqueada.
- Efeitos: brilho no retrato ao levar dano/curar, explosão ao subir de nível, vinheta vermelha pulsando com HP < 30%.
- Botões (☰, missão, habilidades) continuam sendo o DOM original: toque, teclado e handlers não mudam. As barras antigas ficam ocultas no DOM e o jogo segue atualizando.
- Se o Pixi não carregar, o HUD clássico continua (nada é escondido). `window.HINARIA_HUD_PIXI.destroy()` volta ao clássico.

## Executar
npm install && npm run test:package && npm run build:web (copia three, anime.js e pixi para vendor/).

## Não verificado
Não rodei no navegador com o Pixi real (sem rede aqui). Rodei a lógica do módulo com um Pixi de mentira (sem erros) e `node --check`. Confirme a versão pixi.js 8.6.6 no `npm install` e que `node_modules/pixi.js/dist/pixi.min.mjs` existe (o build exige).
