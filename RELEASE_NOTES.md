## HINÁRIA 1.3.0 Beta 1 · O Eco sob as Cinzas

Teste beta com a Parte II da campanha, correções da geração procedural e revisão da inicialização e do custo gráfico no mobile. Esta é uma **pré-release**; a versão 1.2.2 permanece no canal estável.

### Parte II

Depois de concluir **A Coroa dos Quebra-Presas** e entregar a missão a Bram, fale com **Yoki** para começar **O Eco sob as Cinzas**.

- Três missões encadeadas: A Passagem das Brumas, A Vigília dos Ossos e A Última Voz.
- Nova trilha na fronteira sul com Passagem das Brumas `(46,73)`, Observatório do Eco `(56,79)` e Santuário da Última Voz `(58,89)`.
- Dois Vigias do Eco e a Sentinela do Eco (Nv. 22), criada com o rig e as animações existentes do Troll Ancião.
- Objetivos regionais: somente os vigias da nova região contam para a missão. Encontros são criados quando suas missões precisam deles.
- Diálogos, marcadores, recompensas, crônicas e progresso integrados ao save completo.

### Geração e mobile

- Semente e dados da geração reinicializados, sem acumular outro mapa nas coleções.
- Rotas de portas protegidas contra vegetação e obstáculos visuais coerentes com os trechos de fronteira abertos pela navegação.
- Identidade do gerador registrada no diagnóstico e nos saves novos; saves antigos continuam aceitos sem esses campos.
- Pacote Android com um script local, sem depender de import maps, compilado para a sintaxe do Chrome 80. WebView mínimo 80 e WebGL disponível continuam necessários.
- Carregamento em etapas, preparação dos shaders e ação Recarregar para falhas de inicialização; capa mobile em CSS.
- Menus compatíveis com a ausência de `replaceChildren` e do atalho CSS `inset` em WebViews antigos.
- Duas ou três luzes decorativas próximas no mobile, materiais mais simples nas decorações opacas e mapas de normais sob demanda na qualidade alta.
- Ratos fora da câmera deixam de forçar a submissão de todas as suas peças, preservando aparência e animações.
- Alvo automático de 30 FPS no mobile, opção manual de 30/60 e orçamento de 400 mil ou 600 mil pixels conforme o perfil.
- Duas músicas de chefes em 96 kbps no Android, com duração preservada e originais completos no projeto.
- Correção do intervalo do poder do machado ao carregar saves e da geometria/material da ferraria no modo clássico.

### Validação da beta

Passaram 54 suítes de regressão, 128 sementes, nove cenários de interface, sete verificações de falhas de inicialização e os testes completos da Parte II. O save parcial restaurou um único Vigia restante e a recompensa final não se repetiu após recarregar.

Na fixture da vila, as chamadas de renderização passaram de 670 para 354 (−47,16%) e as luzes pontuais visíveis de 29 para 3. Essas são contagens no Chromium/SwiftShader, com câmera e resolução iguais; não representam FPS medido nos aparelhos.

### Arquivos e verificação

- **HINARIA_1.3.0_BETA1_DEBUG.apk**: Android, pacote `br.com.hinaria.rpg`, versão 1.3.0-beta.1, código 6.
- **HINARIA_PROJETO_1.3.0-beta.1.zip**: código completo do commit da tag, laboratórios HTML e geradores Java. Execute `npm run setup` e `npm start`.
- **HinariaMotion.jar**: gerador Java 17+ independente do jogo.
- **MOBILE_TEST_RESULTS.json** e **SHA256SUMS.txt**: resultados da build final, tamanho e integridade dos anexos.

O APK é debug para testes. Preserve os dados do aplicativo ao atualizar; o certificado precisa coincidir com o da instalação anterior. A validação da assinatura consta nos resultados anexos. Não houve execução em celular Android físico neste ambiente. As verificações gráficas usam Chromium/SwiftShader e toque emulado; não garantem uma taxa de FPS para um aparelho específico.

O [guia da Parte II](https://github.com/YokiPJ/Yk/blob/v1.3.0-beta.1/hinaria/docs/BETA_PARTE_II.md) contém o acesso e o roteiro de teste.

APK final: **14.924.470 bytes (14,9 MB)**, **29,38% menor** que o da versão 1.2.2. SHA256: `cbf619094348fa2646468546733426b31f9523466f036c98991239f5915d503c`.

### Cenários de Hinária

![Vilarrubra — imagem principal](https://github.com/YokiPJ/Yk/releases/download/v1.3.0-beta.1/01-vilarrubra.png)

| Ponte Velha | Clareira |
| --- | --- |
| ![Ponte Velha](https://github.com/YokiPJ/Yk/releases/download/v1.3.0-beta.1/02-ponte-velha.png) | ![Clareira](https://github.com/YokiPJ/Yk/releases/download/v1.3.0-beta.1/03-clareira.png) |

| Ruínas de Ardu | Caverna Sombria | Acampamento |
| --- | --- | --- |
| ![Ruínas de Ardu](https://github.com/YokiPJ/Yk/releases/download/v1.3.0-beta.1/04-ruinas-ardu.png) | ![Caverna Sombria](https://github.com/YokiPJ/Yk/releases/download/v1.3.0-beta.1/05-caverna-sombria.png) | ![Acampamento](https://github.com/YokiPJ/Yk/releases/download/v1.3.0-beta.1/06-acampamento.png) |

<!-- hinaria-release:v1.3.0-beta.1:8594c8055c63865f693ca85db7b33e813cfc5ffa -->
