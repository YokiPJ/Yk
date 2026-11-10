## HINÁRIA 1.3.0 Beta 4 · Revisão geral e correções

Revisão dos sistemas de inicialização, combate, controles mobile, saves, missões, interiores, mundo procedural e renderização. O alvo automático da Beta 3 e a Parte II continuam incluídos.

### Correções

- O jogo inicia mesmo se a preferência de áudio contiver JSON null ou um formato inválido.
- Novos personagens recebem vida e mana completas da classe escolhida. Editar uma aventura existente não cura nem repõe mana.
- Replay respeita o máximo de vida atual, inclusive após trocar de classe, permitindo salvar normalmente.
- Soltar um toque prolongado não gera um golpe extra. Teclado e acessibilidade continuam funcionando.
- O combo do Cavaleiro respeita a recarga restante de outra arma.
- Linha de visão percorre a grade de colisões e impede a passagem por cantos fechados. A IA confirma obstáculos antes de golpear.
- Inimigos atordoados param imediatamente, inclusive entre duas células do mapa.
- Saves com etapas de missão incompatíveis são detectados antes de alterar a aventura; um backup válido é usado quando disponível.
- Campos opcionais ausentes em saves antigos recebem valores iniciais, sem herdar estados de outra sessão.
- A penalidade de 25% de ouro na morte funciona também acima do limite de 32 bits.

### Arquivos

- **HINARIA_1.3.0_BETA4_DEBUG.apk**: Android, versão 1.3.0-beta.4, código 9, mantendo o certificado debug das betas anteriores.
- **HINARIA_REVISAO_GERAL_1.3.0-beta.4.zip**: patch para o projeto Beta 3. Feche o servidor e extraia sobre a pasta que contém INICIAR_PROJETO.bat, substituindo arquivos. Abra o inicializador.
- **HINARIA_PROJETO_1.3.0-beta.4.zip**: projeto completo com bibliotecas locais. Extraia e abra INICIAR_PROJETO.bat (Windows) ou INICIAR_PROJETO.sh (Linux/macOS). Requer Node.js 22+.
- **MOBILE_TEST_RESULTS.json** e **SHA256SUMS.txt**: resultados, tamanho e integridade dos anexos.
- **HinariaMotion.jar**: ferramenta Java independente, preservada.

Os saves válidos permanecem compatíveis. No navegador, mantenha a mesma origem e porta para acessar sua aventura. O relatório detalhado está em hinaria/docs/REVISAO_1.3.0-beta.4.md dentro do projeto.

Pré-release de testes, mantendo a 1.2.2 no canal estável. As validações gráficas usam Chromium/SwiftShader no Linux, com toque emulado e fixtures explícitas; não houve execução em celular físico nem campanha manual completa. Consulte MOBILE_TEST_RESULTS.json para a cobertura e os limites.

### Cenários de Hinária

![Vilarrubra — imagem principal](https://github.com/YokiPJ/Yk/releases/download/v1.3.0-beta.4/01-vilarrubra.png)

| Ponte Velha | Clareira |
| --- | --- |
| ![Ponte Velha](https://github.com/YokiPJ/Yk/releases/download/v1.3.0-beta.4/02-ponte-velha.png) | ![Clareira](https://github.com/YokiPJ/Yk/releases/download/v1.3.0-beta.4/03-clareira.png) |

| Ruínas de Ardu | Caverna Sombria | Acampamento |
| --- | --- | --- |
| ![Ruínas de Ardu](https://github.com/YokiPJ/Yk/releases/download/v1.3.0-beta.4/04-ruinas-ardu.png) | ![Caverna Sombria](https://github.com/YokiPJ/Yk/releases/download/v1.3.0-beta.4/05-caverna-sombria.png) | ![Acampamento](https://github.com/YokiPJ/Yk/releases/download/v1.3.0-beta.4/06-acampamento.png) |
