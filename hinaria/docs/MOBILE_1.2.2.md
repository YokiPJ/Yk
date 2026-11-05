# HINÁRIA 1.2.2 · Mobile

## Mudanças

O jogo usa um HUD Canvas2D no touch, sem um segundo contexto WebGL em tela cheia. O desktop continua com PixiJS; números, estados e controles permanecem no DOM. O HUD mantém animações de barras, dano, cura e recargas.

O perfil automático considera toque, memória e quantidade de CPUs lógicas quando o navegador informa esses dados. Até quatro CPUs lógicas ou até 2 GiB informados selecionam o perfil econômico com alvo de 30 FPS; os demais começam com alvo de 60 FPS. Esses valores são limites de apresentação, não uma promessa de FPS. Configurações → Fluidez permite escolher 30 ou 60. A preferência usa a chave de configurações existente, preservando saves.

A resolução adaptativa tem um orçamento mobile de 1.000.000 pixels no drawing buffer e é recalculada ao redimensionar. A adaptação de qualidade considera o alvo de 30/60 para evitar reduzir resolução continuamente quando o jogador escolheu 30 FPS.

Peças opacas e estáticas compatíveis são fundidas por chunk e shader/material; cores distintas viram cores de vértice. Texturas, normais, propriedades PBR, transparências, reflexões de escala e os grupos animados são preservados. As matrizes locais de peças rígidas deixam de ser recalculadas. Juntas, capas, armas, cristais e encaixes continuam dinâmicos.

Nomes e números flutuantes compartilham as leituras de layout em cada atualização. O joystick reutiliza seus limites durante o gesto e libera o input ao mudar a orientação. O título limita animação mobile a 30 FPS e não redesenha continuamente uma imagem estática com movimento reduzido.

## Comparação medida

Mesma posição, câmera, semente, viewport touch 844×390 e DPR 1. O cenário foi pausado por sua interface real. Chromium headless/SwiftShader; dados completos em `qa/1.2.2/benchmark-*.json`.

| Métrica | Referência 1.2.1 | 1.2.2 |
| --- | ---: | ---: |
| Chamadas de desenho do mundo | 814 | 670 (−17,7%) |
| Atualizações locais de matriz por render | 3.278 | 1.354 (−58,7%) |
| Geometrias na GPU | 835 | 670 (−19,8%) |
| Triângulos desenhados | 208.652 | 209.794 (+0,5%) |
| Mediana CPU de submissão, cinco renders aquecidos | 35,0 ms | 13,1 ms |
| HUD touch | Pixi/WebGL | Canvas2D |

A fusão amplia um pouco os limites de culling das peças do mesmo chunk; nessa câmera, isso desenhou 0,5% mais triângulos com 17,7% menos chamadas. O tempo de CPU medido é específico do ambiente de teste e não mede o FPS de um celular físico.

O APK anterior integrado tinha 29,8 MB; o pacote mobile tem aproximadamente 21,1 MB, pois exclui os laboratórios, suas imagens e o JAR. Os laboratórios continuam disponíveis no projeto web completo. Os bytes e hashes exatos ficam em `qa/1.2.2/results.json` e na release.

## Repositório e build

Fontes, assets, projeto Android, ferramentas, documentação, referências e testes ficam em diretórios próprios. Documentos e verificações antigos foram arquivados. APKs/ZIPs antigos saíram do ramo principal e permanecem nas releases e no histórico Git. O projeto ZIP da release é produzido com `git archive` do commit indicado pelo manifesto.

`npm run build` gera a web completa; `npm run build:mobile` gera somente o jogo. `npm run build:android` sempre usa a segunda opção e confere todos os recursos embalados contra SHA256. `release.json` concentra os dados de versão. A automação publica primeiro um draft, verifica os anexos por download e então publica a release.

## Validação

A suíte cobre orçamento de pixels, cadência 30/60, geometria/cor/transformações reais, partes animadas e transparências. O comparativo verifica 12 modelos × 7 poses, equipamentos e armaduras. Os testes de navegador exercitam save, toque, layout, compatibilidade e fallback. Os resultados finais medidos estão em `qa/1.2.2/results.json`.

O APK mantém `br.com.hinaria.rpg`, versão 1.2.2 e código 4, com o mesmo certificado debug usado antes neste ambiente. Instalar uma atualização exige que o certificado da versão instalada coincida. Não houve teste em aparelho Android físico; toque e viewports foram emulados.
