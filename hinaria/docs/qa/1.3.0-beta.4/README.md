# Evidências da revisão · Beta 4

O relatório principal é [results.json](results.json); as falhas e suas correções estão em [REVISAO_1.3.0-beta.4.md](../../REVISAO_1.3.0-beta.4.md).

A baseline era o commit 0cb2f6a da Beta 3 publicada. Os 56 testes anteriores, nove cenários de interface e quatro da Parte II passaram antes das mudanças. Os registros são baseline-verify.txt, baseline-ui.json e baseline-part2.json. Os dois JSONs de reproduções registram os problemas investigados: Replay acima da vida máxima, descarte de missões incompatíveis, gesto longo duplicado, áudio null, diagonal bloqueada e overflow da penalidade. A posição original de respawn também foi examinada em seis sementes e estava livre; ela foi preservada.

A revisão passou 58 suítes Node, 11 cenários específicos, nove cenários de interface, três round trips de gameplay, quatro cenários da Parte II, cinco classes em combate, sete falhas de boot, duas variantes do bundle e quatro cenários de execução dos ZIPs. As comparações de linha de visão usam um oráculo independente de interseção segmento/caixa; o gerador real é executado em 128 sementes.

O pacote Android e os testes da build compartilham o fingerprint 454ecc6214a7. Todos os 211 recursos web empacotados foram comparados com o manifesto; identidade e assinatura nativas foram verificadas. O certificado coincide com a Beta 3.

O benchmark fixa a câmera e força pixel ratio 1 para contar trabalho de renderização numa cena pausada de 844×390. O HUD usa Canvas2D; a vila mantém 354 draw calls nessa fixture, com duas luzes decorativas ativas no pool econômico. Esses números descrevem trabalho gráfico no SwiftShader, não FPS de um aparelho.

Os ZIPs candidatos contêm os arquivos finais do jogo. A preparação final acrescenta os relatórios QA, e seus arquivos de produção são comparados por conteúdo com a árvore testada antes da publicação. As provas finais de pacote, release e downloads públicos são acrescentadas depois dessa etapa.

Para reproduzir os testes, use npm run verify e os scripts tools/test-review-browser.mjs, tools/test-upgrade-browser.mjs, tools/test-gameplay-roundtrip.mjs, tools/test-part2-browser.mjs, tools/test-attack-aim-browser.mjs, tools/test-bundle-browser.mjs e tools/test-boot-browser.mjs. Os cenários --offline exigem npm run build:mobile; CHROMIUM_PATH pode selecionar um Chromium já instalado. As fixtures e os limites estão declarados nos scripts e relatórios individuais.

Publicação concluída: [v1.3.0-beta.4](https://github.com/YokiPJ/Yk/releases/tag/v1.3.0-beta.4) pelo [workflow](https://github.com/YokiPJ/Yk/actions/runs/42756962262). Os 13 anexos foram baixados e comparados pela automação. O APK e o patch também foram baixados pelas URLs públicas com HTTP 200, tamanho e SHA256 correspondentes. O projeto completo respondeu HTTP 200 em HEAD. Os detalhes estão em release-proof.json, final-package.json e public-downloads.json; a versão 1.2.2 continua como estável.
