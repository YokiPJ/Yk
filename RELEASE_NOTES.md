## HINÁRIA 1.2.2 · Mobile

APK Android com otimizações para touch e repositório reorganizado.

### Melhorias

- HUD Canvas2D no mobile; PixiJS mantido no desktop, com fallback DOM.
- Perfil automático e opção de 30/60 FPS; resolução adaptativa com orçamento de pixels.
- Menos chamadas de desenho e recálculos de matrizes, preservando armas, armaduras, capas e animações.
- Leituras de layout reutilizadas e input limpo ao mudar a orientação.
- APK somente com o jogo. Os quatro laboratórios e o gerador Java continuam no projeto completo.
- Fontes, documentação, testes e referências organizados; distribuições binárias ficam nas Releases.

Na fixture de comparação com câmera e DPR iguais: **17,7% menos chamadas de desenho** e **58,7% menos atualizações locais de matriz**. O APK passou de aproximadamente **29,8 MB para 21,1 MB**. As medições gráficas usam Chromium/SwiftShader e não representam FPS medido em telefone físico.

### Arquivos

- **HINARIA_MOBILE_1.2.2_DEBUG.apk**: aplicativo Android, pacote `br.com.hinaria.rpg`, versão 1.2.2, código 4.
- **HINARIA_PROJETO_1.2.2.zip**: código completo do commit da tag, com laboratórios HTML prontos. Execute `npm run setup` e `npm start`.
- **HinariaMotion.jar**: gerador Java 17+.
- **MOBILE_TEST_RESULTS.json** e **SHA256SUMS.txt**: resultados e integridade dos anexos.

O APK é debug para testes, assinado com o mesmo certificado usado nas versões anteriores deste ambiente. Não houve teste em celular físico. Preserve os dados do aplicativo ao atualizar; outra assinatura não pode atualizar uma instalação existente.

### Cenários de Hinária

![Vilarrubra — imagem principal](https://github.com/YokiPJ/Yk/releases/download/v1.2.2/01-vilarrubra.png)

| Ponte Velha | Clareira |
| --- | --- |
| ![Ponte Velha](https://github.com/YokiPJ/Yk/releases/download/v1.2.2/02-ponte-velha.png) | ![Clareira](https://github.com/YokiPJ/Yk/releases/download/v1.2.2/03-clareira.png) |

| Ruínas de Ardu | Caverna Sombria | Acampamento |
| --- | --- | --- |
| ![Ruínas de Ardu](https://github.com/YokiPJ/Yk/releases/download/v1.2.2/04-ruinas-ardu.png) | ![Caverna Sombria](https://github.com/YokiPJ/Yk/releases/download/v1.2.2/05-caverna-sombria.png) | ![Acampamento](https://github.com/YokiPJ/Yk/releases/download/v1.2.2/06-acampamento.png) |

<!-- hinaria-release:v1.2.2:969d646cac29efc6d2413c9fd03fb62082f7013a -->
