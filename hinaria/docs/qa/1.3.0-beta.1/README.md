# Validação · HINÁRIA 1.3.0 Beta 1

54 suítes de regressão, 128 sementes, 80 módulos vinculados, nove cenários de interface, sete falhas de boot induzidas, dois cenários do bundle e três fluxos da campanha original aprovados. A Parte II passou nas três missões, incluindo save parcial, chefe e recompensa única.

O cenário de compatibilidade remove replaceChildren e ignora CSS inset no Chromium atual. WebGL1 é forçado em um cenário do bundle. Isso não equivale a executar Android físico ou o Chromium 80 original.

| Região | Draw calls 1.2.2 → beta | Luzes pontuais |
| --- | ---: | ---: |
| village | 670 → 354 | 29 → 3 |
| forest | 558 → 460 | 16 → 3 |
| ruins | 736 → 425 | 9 → 3 |

Câmera, posição e drawing buffer iguais. A geração revisada muda a decoração; compare o trabalho das cenas entregues. Não é uma medição de FPS em telefone.

APK: 14924470 bytes; SHA256 `cbf619094348fa2646468546733426b31f9523466f036c98991239f5915d503c`. Mesmo certificado debug da distribuição 1.2.2, código 6. Os 210 recursos web foram conferidos contra o manifesto SHA256 do APK.

[Resultados completos](results.json) · [Geração](procedural-generation.json) · [Parte II](part2-browser.json) · [Mobile](mobile-browser.json) · [Assinatura](apk-signature.txt)

A limpeza final de espaços no fonte preservou todos os bytes do bundle e dos recursos usados em execução; [comparação dos manifestos](runtime-equivalence.json). Os relatórios mantêm a identidade observada no teste.
