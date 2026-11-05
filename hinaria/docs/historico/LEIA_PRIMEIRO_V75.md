# HINÁRIA V7.5 — Rework visual Vilarrubra + Classes

**Base:** V7.4 Mobile; jogo completo para abrir pelo Codespaces ou compilar no Android.

## Melhorias implementadas

- **Cavaleiro**: peitoral/heráldica e placas reforçadas.
- **Paladino (ranger)**: capuz de caçador, armadura de couro mais volumosa, aljava e ombreiras.
- **Feiticeiro (mage)**: manto e saia de túnica volumosos, ombros e gemas arcanas.
- **Druida**: manto florestal, ombreiras de casca, broche e ornamentos botânicos.
- **Yoki (sage)**: ombros e túnica mais robustos, ornamento esmeralda.
- **Bram (blacksmith)**: avental de couro reforçado e rebites.
- **Vila**: telhados inclinados espessos, vigas robustas, detalhes de fachadas e jardim nas janelas, ferraria reforçada.
- **Natureza**: copas e troncos mais volumosos; barracas/lanternas mais encorpadas.
- A malha de colisão, caminhos, localização de portas, missões, Arsenal e HUD não foram alterados.

## Teste rápido no Codespaces

Execute `node tests/test_v75_visual_models.mjs` e `node test_v7_village.mjs`. Para prévia web, depois de `npm install`, execute `node server.js` e abra a porta 8080 (consulte o terminal se diferente). Veja a V7.5 **no jogo** antes de compilar o APK.

## Compilação Android

Envie o ZIP completo para `/workspaces/Apk` e execute `unzip -o HINARIA_V7_5_VILARRUBRA_CLASSES_COMPLETA.zip` e depois `bash INSTALAR_V75_CODESPACES.sh`.

O instalador cria backup da versão atual, instala os arquivos limpos, mantém `android/` (ícone e configurações da sua instalação), executa testes e tenta gerar `APK_GERADO/HINARIA_V7_5_VILARRUBRA_CLASSES.apk`.

**Não é APK já compilado.** É o projeto-fonte. Testes de código **não** substituem testes gráficos/WebGL no Android. A instalação requer Node.js, Java 21, SDK Android e projeto Android do Codespaces já funcional.
