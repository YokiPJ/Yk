# HINÁRIA — Tela de título em Three.js (V1)

Arquivos novos: `src/ui/titleScreenThree.js`, `assets/ui/title-three.css`, `assets/ui/hinata_01.jpg`, `assets/ui/hinata_02.jpg`.
Alterados: `index.html` (importmap `animejs` + CSS), `src/main.js` (1 import + 1 chamada), `tools/build-web.mjs` (copia anime.es.js para vendor/), `package.json` (devDependency `animejs` 3.2.1).

## O que faz
- Fundo WebGL dentro do `#cover`: crossfade (1,7 s) entre 5 imagens, fundo desfocado, Ken Burns, parallax do ponteiro, brasas (56 partículas; 28 em touch) e vinheta.
- Título em letras com entrada escalonada e botão Jogar pulsando (anime.js). Sem anime.js, usa fade CSS.
- Renderer próprio, pausa com a aba oculta e é descartado quando o `#cover` some. Não altera combate, mapa, saves ou missões.
- `prefers-reduced-motion`: sem drift, parallax ou animação de letras.
- Sem WebGL ou erro no carregamento: a capa CSS original continua.

## Trocar imagens
Edite `IMAGES` no topo de `titleScreenThree.js` (HOLD_MS/FADE_MS ajustam tempos).

## Executar
npm install && npm run test:package && npm run build:web (o build copia three e anime.js para vendor/, sem CDN).
Dev: servir a pasta (node server.js) e abrir no navegador.

## Não verificado
Não rodei no navegador (sem rede para three/anime neste ambiente). Verificados: node --check nos módulos, test-package e compilação dos 4 shaders em WebGL real (Chromium headless).

## Tipografia (V2)
Fontes Cinzel Decorative (título) e Cinzel (resto), via Google Fonts (online). Cores: prata/branco-osso, cinza e vermelho-sangue só no hover do botão. Letras metálicas com brilho passando uma a uma. Offline/APK: ponha os .woff2 em assets/fonts/ e descomente os @font-face no fim de title-three.css; sem isso cai em Georgia/serif. O HUD dentro do jogo continua em Pixelify Sans.
