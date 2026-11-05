# HINÁRIA · Um Mundo Além dos Sonhos

RPG 3D em JavaScript ES modules, Three.js r160 e PixiJS 8.6.6. Versão 1.2.1 com modelos corrigidos, título cinematográfico, HUD de dados reais, pausa completa, save versionado e integração Android Capacitor 7.

O projeto original agora reúne também os quatro laboratórios de animação, o gerador Java e as capturas dos cenários. Veja [INTEGRACAO_1.2.1.md](INTEGRACAO_1.2.1.md). Na raiz do repositório, `npm run setup` e `npm start` iniciam a entrada em `http://localhost:8080/studio/`.

## Jogar a build offline

Pré-requisito: Node.js 22 ou mais recente. Ao usar o clone do repositório, execute `npm ci` e `npm run build:web` nesta pasta para gerar `www/` com bibliotecas e recursos locais.

```sh
node server.js --offline
```

Abra no navegador a porta 8080 da máquina onde o servidor está em execução. Use um navegador com WebGL. O jogo não precisa de CDN nem de internet durante a execução. Não abra `index.html` por `file://`: os módulos e recursos precisam do servidor HTTP. O save fica no armazenamento local da origem usada; trocar domínio/porta ou limpar dados do navegador cria outro armazenamento.

## Desenvolver, verificar e recompilar a versão web

```sh
npm ci
npm start
# Em outro terminal, na mesma pasta:
npm run test:qa
node tools/test-package.mjs
node tools/verify-release.mjs
npm run test:imports
npm run build:web
```

`npm start` serve os fontes atuais e resolve Three/Pixi/anime localmente em `node_modules/`. O modo `--offline` serve exclusivamente a build em `www/`; execute `build:web` novamente após alterar fontes/recursos. `www/build-manifest.json` registra SHA256 de cada arquivo distribuído, e `build-info.json` identifica a versão e o fingerprint.

Teste real de navegador, com Chromium instalado:

```sh
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
CHROMIUM_PATH=/usr/bin/chromium node tools/test-upgrade-browser.mjs --offline
```

No Windows, defina `CHROMIUM_PATH` com o caminho do Chrome/Chromium usando a sintaxe do seu shell. Como alternativa, `npx playwright install chromium` instala o navegador do Playwright. Evidências ficam por padrão na pasta temporária `hinaria-browser`; configure `HINARIA_BROWSER_ARTIFACTS` para preservá-las em outro local. O modo headless usa SwiftShader: seus FPS não representam um telefone nem uma GPU física.

## Controles

- WASD/setas: mover. Q/E: girar câmera. Roda/pinça: zoom.
- J/Espaço: golpe manual frontal. K: esquiva. 1–3: habilidades principais; 4: Replay aprendido com Yoki; 5: habilidade adicional desbloqueada no Arsenal.
- R: despertar do machado quando equipado. F: conversar/interagir. B: Arsenal. L: Crônicas.
- M/Escape ou ☰: menu/retomar. O menu pausa movimento, IA, projéteis, recargas e renascimentos.
- Android/touch: analógico à esquerda, golpe/esquiva/habilidades à direita; suporte a dois dedos simultâneos. Botão Voltar fecha a interface atual ou abre a pausa.
- F3: diagnóstico com FPS, intervalos de quadro, memória disponível, draw calls e chunks visíveis. `?visual=classico`, `?stream=0` e `?cinema=1` continuam disponíveis.

Use **Novo Jogo** para escolher uma das cinco classes. **Salvar jogo** no menu grava a aventura inteira neste dispositivo; **Continuar** aparece apenas quando existe um save completo válido. Há confirmação antes de iniciar outra aventura, carregar ou voltar ao título. Não salve no meio de uma cena/diálogo; finalize-os primeiro. Configurações, Arsenal e progresso legado mantêm suas chaves anteriores.

## Android

O projeto nativo `android/` está incluído. Requisitos: Node 22+, JDK **com javac** 21, Android SDK Platform 35 e Build Tools 34.0.0/35.0.0. O APK é debug, para instalação/teste; não é uma release assinada para a Play Store.

```sh
npm ci
# Exporte os caminhos reais instalados na sua máquina:
export JAVA_HOME=/caminho/do/jdk-21
export ANDROID_HOME=/caminho/do/android-sdk
# Linux x86_64, se precisar instalar o SDK oficial:
bash tools/setup-android-sdk.sh
npm run android:debug
```

Saída: `APK_GERADO/HINARIA_UPGRADE_DEBUG.apk`. O comando sincroniza os recursos e o plugin oficial `@capacitor/app`, compila com Gradle e verifica o fingerprint web dentro do APK para impedir a entrega de build antiga. O wrapper verifica o checksum oficial da distribuição Gradle.

No ambiente na nuvem usado para a build:

```sh
export JAVA_HOME=/workspace/hinaria-java/jdk-21.0.8
export ANDROID_HOME=/workspace/android-sdk
export GRADLE_USER_HOME=/workspace/.gradle-hinaria
npm run android:debug
```

Esses caminhos pertencem à máquina preparada e não são dependências incluídas no ZIP. Fora dela, instale/configure os pré-requisitos. O instalador de SDK mantém a verificação de checksum. Gradle reutiliza o proxy configurado; em um ambiente gerenciado, `tools/java-trust.mjs` incorpora a CA pública fornecida pelo host a um truststore local, preservando a verificação TLS. Nenhuma credencial fica nos arquivos do projeto.

## Diagnóstico

- `javac` ausente: instale o JDK completo e aponte `JAVA_HOME` para ele; um JRE não compila Android.
- `SDK location not found`: configure `ANDROID_HOME` ou `android/local.properties` na sua máquina.
- `Build Tools 34.0.0` ausente: instale essa revisão, além da Platform 35.
- Porta ocupada: defina `PORT` antes de iniciar o servidor.
- Alterações não aparecem em `--offline`/APK: recompile `build:web` ou execute `android:debug`, que sincroniza novamente.
- Falha WebGL: a tela informa o erro e oferece recarga explícita. Se apenas o renderer do título/Pixi falhar, a capa CSS e o HUD DOM continuam utilizáveis. Ative aceleração gráfica para o mundo 3D.
- Save danificado: o carregador tenta o backup validado e informa erros de armazenamento. Não edite chaves legadas para tentar reparar o save completo.

Consulte `CHANGELOG_HINARIA_UPGRADE.md` e `TEST_RESULTS.md` para alterações, validação efetivamente executada e limitações. Créditos originais, músicas e documentação da base permanecem no pacote.
