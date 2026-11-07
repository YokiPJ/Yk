## HINÁRIA 1.3.0 Beta 2 · Inicialização direta no PC

Corrige o erro 404 de `/vendor/three.module.js` e a necessidade de escolher a pasta `hinaria` ao abrir a raiz com um servidor estático. A Parte II, os saves e as otimizações mobile da Beta 1 continuam incluídos.

### Atualizar a Beta 1 com o patch pequeno

1. Feche o servidor anterior com Ctrl+C.
2. Extraia **HINARIA_CORRECAO_INICIO_1.3.0-beta.2.zip** sobre a pasta que contém `INICIAR_PROJETO.bat`, substituindo os arquivos.
3. Abra **INICIAR_PROJETO.bat**. O navegador entra no jogo assim que o servidor estiver pronto.

O patch é destinado ao projeto da Beta 1. Para uma instalação completa, use **HINARIA_PROJETO_1.3.0-beta.2.zip**. Não é necessário apagar os dados do navegador.

### Correções

- Entrada automática da raiz para `hinaria/`, mantendo parâmetros da URL.
- Bibliotecas Three.js, PixiJS, anime.js e Capacitor incluídas localmente no ZIP, com versões fixadas pelo lockfile e licenças.
- Inicializadores conferem os arquivos necessários, em vez de apenas verificar se a pasta node_modules existe.
- O navegador só abre depois de o servidor conseguir iniciar. Conflito na porta 8080 é informado no terminal.
- Retratos usam caminhos relativos, funcionando também quando o jogo está na subpasta hinaria.
- Mensagem de erro no PC orienta a inicialização local; o rodapé identifica a Beta 2 corretamente.

### Arquivos

- **HINARIA_CORRECAO_INICIO_1.3.0-beta.2.zip**: atualização pequena para o projeto Beta 1.
- **HINARIA_PROJETO_1.3.0-beta.2.zip**: projeto completo com bibliotecas locais prontas para jogar; desenvolvimento e build exigem npm run setup.
- **HINARIA_1.3.0_BETA2_DEBUG.apk**: Android, código 7, mesmo certificado debug da Beta 1.
- **HinariaMotion.jar**, **MOBILE_TEST_RESULTS.json** e **SHA256SUMS.txt**: ferramenta Java, validação e integridade.

Pré-release de testes. A versão 1.2.2 permanece como estável. Testes gráficos executados em Chromium/SwiftShader no Linux; não houve execução em celular físico ou do arquivo BAT no Windows.

### Cenários de Hinária

![Vilarrubra — imagem principal](https://github.com/YokiPJ/Yk/releases/download/v1.3.0-beta.2/01-vilarrubra.png)

| Ponte Velha | Clareira |
| --- | --- |
| ![Ponte Velha](https://github.com/YokiPJ/Yk/releases/download/v1.3.0-beta.2/02-ponte-velha.png) | ![Clareira](https://github.com/YokiPJ/Yk/releases/download/v1.3.0-beta.2/03-clareira.png) |

| Ruínas de Ardu | Caverna Sombria | Acampamento |
| --- | --- | --- |
| ![Ruínas de Ardu](https://github.com/YokiPJ/Yk/releases/download/v1.3.0-beta.2/04-ruinas-ardu.png) | ![Caverna Sombria](https://github.com/YokiPJ/Yk/releases/download/v1.3.0-beta.2/05-caverna-sombria.png) | ![Acampamento](https://github.com/YokiPJ/Yk/releases/download/v1.3.0-beta.2/06-acampamento.png) |
