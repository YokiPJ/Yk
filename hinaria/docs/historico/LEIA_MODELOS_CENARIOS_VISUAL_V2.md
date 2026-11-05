# HINÁRIA 1.1.0 — Pacote Visual V2 (experimental)

Esta é uma integração incremental da versão 1.1.0 com combate manual, cutscenes, efeitos e minimapa. Os sistemas de gameplay e os saves foram preservados.

## O que foi integrado

- 12 modelos de personagens independentes extraídos dos HTMLs aprovados: Cavaleiro, Paladino, Feiticeiro, Druida, Bram, Yoki, Bandido, Esqueleto, Troll, Orc, Troll Ancião e Rei dos Orcs.
- Modelo do Rato continua com a fábrica original sem alterações.
- Cada personagem mantém pivôs de cabeça, dois braços, pernas e arma; os modelos seguem o animador original.
- Casas, casarão/taverna, ferraria, ponte e alguns props de Vilarrubra usam versões procedurais 3D do estúdio de ambientes.
- Os 28 prefabs de ambiente estão no módulo `src/assets/environmentV2.js`. Nem todos possuem um correspondente no mapa atual — não foram criados novos objetos interativos, missões ou colisores.
- Materiais geram texturas procedurais 128×128 px de madeira, telhado, pedra e folhagem, sem CORS, sem CDN extra, sem arquivos de texturas de terceiros.
- Prefabs estáticos são combinados por material, e peças rígidas de personagens são combinadas por articulação para reduzir draw calls.
- Objetos repetidos no mundo continuam renderizados com InstancedMesh; não se substituiu toda vegetação por centenas de meshes individuais.

## Como abrir

Em Codespaces/Linux: `npm install`, `npm run build:web`; depois servir `www` com servidor de arquivos estáticos ou compilar com `npm run android:debug` (com Android SDK/Gradle configurados).

## Rollback sem editar arquivos

No navegador, abra com o parâmetro `?visual=classico` (por exemplo `http://localhost:64749/?visual=classico`). Isso reativa o visual original no próximo carregamento; gameplay, saves e colisores não mudam.

Para desligar apenas um dos sistemas na inicialização, configure `window.HINARIA_MODELOS_V2=false` ou `window.HINARIA_CENARIOS_V2=false` antes do script de entrada do jogo.

## Segurança e limitações

- Não altera IDs de missões, pontos de spawn, inventário, cooldowns, save e controles.
- Não modifica o Rato.
- A textura do terreno e a maior parte da vegetação instanciada preservam as geometrias antigas, recebendo acabamento procedural.
- Existem diferenças de escala e de equipamento em relação aos modelos antigos. Uma revisão visual no Android é necessária.
- A troca de classe/arma deve ser inspecionada visualmente; se um equipamento especial não aparecer corretamente, ative `?visual=classico` até correção.
- Não foi possível baixar o npm nem compilar o APK neste ambiente; 19 testes de regressão e verificações de sintaxe passaram.
