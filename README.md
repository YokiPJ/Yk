# HINÁRIA 1.2.2 · Mobile

RPG 3D em Three.js/PixiJS com projeto Android Capacitor, controles touch, saves e laboratórios de animação Java/HTML.

[**Baixar APK e projeto na release 1.2.2**](https://github.com/yorimiguel727-eng/Yk/releases/tag/v1.2.2)

```bash
npm run setup
npm start
```

Abra **http://localhost:8080/studio/** para o projeto completo ou **http://localhost:8080/** para jogar. Requer Node.js 22+. No Windows, execute também `INICIAR_PROJETO.bat`.

## Estrutura

| Pasta | Conteúdo |
| --- | --- |
| `hinaria/src/` | Jogo, renderização, combate, controles, HUD e saves |
| `hinaria/assets/` | Recursos usados pelo jogo |
| `hinaria/android/` | Projeto Gradle/Capacitor |
| `hinaria/studio/` | Quatro laboratórios HTML prontos e seis capturas de cenários |
| `hinaria/tools/` | Builds, verificações, animações Java e preparação de releases |
| `hinaria/tests/` | Suíte atual de regressão; scripts antigos em `legacy/` |
| `hinaria/docs/` | Documentação atual, versões anteriores e evidências QA |
| `hinaria/references/` | Referências de HUD/título e prévias dos modelos |
| `hinaria/downloads/` | JAR pronto e destino local do APK compilado |
| `.github/` | Build contínuo e publicação de anexos verificados |

APKs e ZIPs de distribuição ficam nas Releases. As distribuições antigas continuam disponíveis na [release 1.2.0](https://github.com/yorimiguel727-eng/Yk/releases/tag/v1.2.0) e no histórico Git. As cópias HTML duplicadas dos geradores são reconstruídas por `build:studio`.

## Mobile

- HUD Canvas2D no touch, mantendo o Pixi/WebGL no desktop e as informações DOM acessíveis.
- Perfil automático por memória/CPU informadas pelo navegador; aparelhos de orçamento limitado começam com alvo de 30 FPS. Configurações permitem escolher 30 ou 60 FPS.
- Resolução adaptativa com orçamento de pixels e ajuste após rotação da tela.
- Geometria estática agrupada por chunk/material, sem fundir juntas, armas, transparências ou partes animadas.
- Matrizes fixas das peças rígidas preservadas; pivôs e encaixes de equipamentos continuam animados.
- Leituras de layout dos nomes e do joystick reutilizadas. Mudanças de orientação limpam o toque mantido.
- APK contém somente o jogo; laboratórios e JAR ficam no projeto completo.

Medições e limites: [MOBILE_1.2.2.md](hinaria/docs/MOBILE_1.2.2.md). O jogo mantém seu animador procedural; os clipes Java são ferramentas independentes disponíveis no Studio.

## Build

```bash
npm run build                  # web completa em hinaria/www
npm run build:mobile           # pacote web do jogo, sem laboratórios/JAR
npm run verify                 # regressões, imports, pacote e HTTP
```

Android exige JDK 21, SDK Platform 35 e Build Tools 35.0.0. Configure `JAVA_HOME` e `ANDROID_HOME`, ou abra `hinaria/android` no Android Studio:

```bash
npm run build:android
```

Saída: `hinaria/downloads/HINARIA_MOBILE_1.2.2_DEBUG.apk`, pacote `br.com.hinaria.rpg`, versão 1.2.2, código 4. O build confere todos os recursos do APK contra o manifesto SHA256. Para atualizar uma instalação, o certificado deve coincidir; uma compilação local em outra máquina usa a chave debug dessa máquina.

## Laboratórios e testes visuais

Java exige JDK 17+; reconstrução dos HTMLs exige Python 3 (`python3` no PATH):

```bash
npm run build:animations
npm run build:studio
cd hinaria
npx playwright install chromium
cd ..
npm run test:studio
npm run test:mobile
npm run test:browser -- --offline
```

Execute `build:mobile` antes dos testes do APK e `build` para os testes da distribuição web completa. `CHROMIUM_PATH` seleciona o navegador dos testes do jogo; `HINARIA_CHROMIUM` seleciona o navegador dos laboratórios. Evidências novas ficam em `hinaria/qa-evidence/` e a seleção revisada em `hinaria/docs/qa/1.2.2/`.

O Studio reúne 32 estudos 2D, 12 cenas 3D, sete modelos com dez clipes Java cada e o comparativo dos 12 modelos corrigidos. Vilarrubra permanece como imagem principal da galeria de cenários.

## Publicação

`hinaria/release.json` concentra versão, tag, nome do APK e repositório. Após compilar, verificar e fazer commit:

```bash
npm run release:prepare
```

O comando cria `dist/v1.2.2/` com APK, JAR, projeto ZIP do commit, resultados, capturas e hashes. A automação de `.github/workflows/publish-release.yml` publica o ramo de distribuição `releases/v1.2.2`: cria um draft, envia os anexos, baixa e verifica seus hashes e então publica. Tags/releases existentes de outra publicação são preservadas.

O APK distribuído é debug para testes. A verificação gráfica usa Chromium/SwiftShader e toque emulado; não houve teste em telefone Android físico.
