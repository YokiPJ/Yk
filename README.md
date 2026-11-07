# HINÁRIA 1.3.0 Beta 1 · O Eco sob as Cinzas

RPG 3D em Three.js/PixiJS com projeto Android Capacitor, controles touch, saves e laboratórios de animação Java/HTML.

[**Baixar o teste beta: APK e projeto completo**](https://github.com/YokiPJ/Yk/releases/tag/v1.3.0-beta.1)

A beta acrescenta a Parte II e revisa a geração procedural. A [versão estável 1.2.2](https://github.com/YokiPJ/Yk/releases/tag/v1.2.2) continua disponível e permanece no canal estável.

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
| `hinaria/mobile-assets/` | Músicas compactadas para Android e manifesto de integridade |
| `hinaria/android/` | Projeto Gradle/Capacitor |
| `hinaria/studio/` | Quatro laboratórios HTML prontos e seis capturas de cenários |
| `hinaria/tools/` | Builds, verificações, animações Java e preparação de releases |
| `hinaria/tests/` | Suíte atual de regressão; scripts antigos em `legacy/` |
| `hinaria/docs/` | Documentação atual, versões anteriores e evidências QA |
| `hinaria/references/` | Referências de HUD/título e prévias dos modelos |
| `hinaria/downloads/` | JAR pronto e destino local do APK compilado |
| `.github/` | Build contínuo e publicação de anexos verificados |

APKs e ZIPs de distribuição ficam nas Releases. As distribuições antigas continuam disponíveis na [release 1.2.0](https://github.com/YokiPJ/Yk/releases/tag/v1.2.0) e no histórico Git. As cópias HTML duplicadas dos geradores são reconstruídas por `build:studio`.

## Parte II e geração procedural

**O Eco sob as Cinzas** continua a campanha na fronteira sul do mapa 96×96. Conclua **A Coroa dos Quebra-Presas**, entregue a vitória a Bram e fale com Yoki para iniciar três missões: exploração das brumas, combate aos Vigias do Eco e confronto com a Sentinela do Eco (Nv. 22). O [guia da beta](hinaria/docs/BETA_PARTE_II.md) traz os locais e o roteiro de teste.

O gerador reinicia os dados e a semente antes de construir o mapa, protege as rotas de portas e mantém obstáculos visuais coerentes com a colisão. A semente padrão é 11; a semente normalizada e a versão do gerador são registradas no save e no diagnóstico. A regeneração da lógica é permitida antes de criar os meshes; um mundo já ativo deve ser recarregado.

## Mobile

- HUD Canvas2D no touch, mantendo o Pixi/WebGL no desktop e as informações DOM acessíveis.
- Alvo automático de 30 FPS no mobile; Configurações permitem escolher 30 ou 60 FPS. O alvo limita a apresentação e não garante FPS medido no aparelho.
- Resolução adaptativa com até 400 mil pixels no perfil econômico ou 600 mil nos demais perfis mobile, recalculada após rotação.
- Luzes locais do cenário limitadas a duas ou três no mobile, com seleção das mais próximas e brilho das lanternas preservado.
- Materiais mais simples nas decorações opacas; mapas de normais carregados ao selecionar qualidade alta. Água, transparências e materiais animados mantêm suas referências.
- Geometria estática agrupada por chunk/material, sem fundir juntas, armas, transparências ou partes animadas.
- Matrizes fixas das peças rígidas preservadas; pivôs e encaixes de equipamentos continuam animados.
- Leituras de layout dos nomes e do joystick reutilizadas. Mudanças de orientação limpam o toque mantido.
- APK contém somente o jogo; laboratórios e JAR ficam no projeto completo.
- Pacote Android com um script local, sem exigir import maps, compilado para a sintaxe do Chrome/WebView 80. A inicialização mostra progresso e oferece Recarregar quando falha.
- Duas músicas de chefes em 96 kbps no APK, mantendo as faixas completas no projeto. Tamanho e SHA256 finais acompanham os anexos da beta.
- Peças dos ratos fora da câmera voltam a usar o descarte por frustum, preservando os modelos e suas animações.
- Os dois Vigias e a Sentinela da Parte II são criados somente quando suas missões precisam deles; não ficam ativos na vila desde a inicialização.

Medições e limites: [MOBILE_1.3.0-beta.1.md](hinaria/docs/MOBILE_1.3.0-beta.1.md). O jogo mantém seu animador procedural; os clipes Java são ferramentas independentes disponíveis no Studio. O carregamento dos saves antigos também restaura o intervalo do poder do machado sem herdar temporizadores de outra sessão.

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

Saída: `hinaria/downloads/HINARIA_1.3.0_BETA1_DEBUG.apk`, pacote `br.com.hinaria.rpg`, versão 1.3.0-beta.1, código 6. O build confere todos os recursos do APK contra o manifesto SHA256. Para atualizar uma instalação, o certificado deve coincidir; uma compilação local em outra máquina usa a chave debug dessa máquina.

As variantes de áudio mobile já estão incluídas. Ao trocar as músicas originais, regenere-as com `python3 hinaria/tools/prepare-mobile-audio.py` antes do build; esse comando exige FFmpeg e FFprobe.

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

Execute `build:mobile` antes dos testes do APK e `build` para os testes da distribuição web completa. `CHROMIUM_PATH` seleciona o navegador dos testes do jogo; `HINARIA_CHROMIUM` seleciona o navegador dos laboratórios. Evidências novas ficam em `hinaria/qa-evidence/` e a seleção revisada em `hinaria/docs/qa/1.3.0-beta.1/`.

O Studio reúne 32 estudos 2D, 12 cenas 3D, sete modelos com dez clipes Java cada e o comparativo dos 12 modelos corrigidos. Vilarrubra permanece como imagem principal da galeria de cenários.

## Publicação

`hinaria/release.json` concentra versão, tag, nome do APK e repositório. Após compilar, verificar e fazer commit:

```bash
npm run release:prepare
```

O comando cria `dist/v1.3.0-beta.1/` com APK, JAR, projeto ZIP do commit, resultados, capturas e hashes. A automação de `.github/workflows/publish-release.yml` publica o ramo de distribuição `releases/v1.3.0-beta.1`: cria um draft, envia os anexos, baixa e verifica seus hashes e então publica. A tag beta exige `prerelease: true` e publica com `make_latest: false`, preservando a release estável. Tags/releases existentes de outra publicação são preservadas.

O APK distribuído é debug para testes. A verificação gráfica usa Chromium/SwiftShader e toque emulado; não houve teste em telefone Android físico.
