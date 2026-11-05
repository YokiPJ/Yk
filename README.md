# HINÁRIA · projeto completo 1.2.1

Código editável do jogo, projeto Android, modelos corrigidos e todos os laboratórios de animação no repositório original.

```bash
npm run setup
npm start
```

Abra **http://localhost:8080/studio/** para acessar tudo. O jogo continua em **http://localhost:8080/**. Requer Node.js 22 ou superior. No Windows, também é possível executar `INICIAR_PROJETO.bat`.

## Conteúdo

| Caminho | Conteúdo |
| --- | --- |
| [hinaria/src](hinaria/src) | Jogo completo, HUD, título, saves, combate, ambientes e correções dos 12 modelos |
| [hinaria/studio](hinaria/studio/index.html) | Entrada dos quatro laboratórios e galeria de seis cenários |
| [hinaria/tools/motion-java](hinaria/tools/motion-java/README.md) | Gerador Java 17+, sete modelos e dez clipes por modelo, GLBs e adaptador Three.js |
| [hinaria/tools/motion-3d](hinaria/tools/motion-3d/README.md) | Fontes do laboratório Three.js com 12 cenas 3D |
| [hinaria/tools/motion-ui](hinaria/tools/motion-ui/README.md) | Laboratório HTML/SVG com 32 animações |
| [hinaria/tools/model-review](hinaria/tools/model-review) | Comparativo dos 12 modelos, com fontes e versão histórica para referência |
| [hinaria/android](hinaria/android) | Projeto Capacitor/Gradle para Android |
| [hinaria/downloads](hinaria/downloads) | APK debug 1.2.1 e JAR Java prontos |
| [hinaria/studio/scenery](hinaria/studio/scenery) | Seis capturas de cenários, com Vilarrubra em destaque |

As correções de espada, escudo, cajado, arco, armadura e contato com o chão já estão no jogo. Os laboratórios mantêm execução independente. O jogo preserva seu animador procedural; o adaptador dos GLBs Java está disponível em `tools/motion-java/examples/`.

O laboratório Java conserva o snapshot 1.2.0 usado para criar as animações anteriores. O jogo e o comparativo incluem as correções 1.2.1. O snapshot comprimido, sua procedência e o código do extrator ficam junto do gerador.

## Build e verificação

Na raiz deste repositório:

```bash
npm run build                  # www offline, incluindo os laboratórios
npm run verify                 # regressões + pacote + URLs e downloads
```

Para reconstruir os clipes e os HTMLs, instale também **JDK 17+** e **Python 3**:

```bash
npm run build:animations       # compila Java, gera GLBs e publica os quatro HTMLs
npm --prefix hinaria run test:animations
```

Se o JDK estiver fora do PATH, defina `HINARIA_JDK` com a pasta do JDK. No Windows, o gerador também pode ser compilado por `hinaria/tools/motion-java/build.bat`. Os scripts de montagem dos HTMLs usam o comando `python3`.

Para os testes visuais:

```bash
cd hinaria
npx playwright install chromium
cd ..
npm run test:studio
npm run test:browser -- --offline
```

`HINARIA_CHROMIUM` seleciona o executável dos testes do Studio; `CHROMIUM_PATH` seleciona o navegador dos testes do jogo. Relatórios dos laboratórios são gerados nas respectivas pastas `verification/` e no comparativo em `report.json`.

Para Android, instale **JDK 21**, Android SDK plataforma 35 e Build Tools 35.0.0. Configure `ANDROID_HOME` e `JAVA_HOME` ou abra `hinaria/android` no Android Studio:

```bash
npm run build:android
```

O APK atualizado é gravado em `hinaria/downloads/HINARIA_MODELOS_CORRIGIDOS_1.2.1_DEBUG.apk`. Mantém `br.com.hinaria.rpg`, versão 1.2.1, código 3. A instalação como atualização exige o mesmo certificado da versão instalada. Uma compilação em outra máquina usa a chave debug dessa máquina.

O workflow [HINARIA - verificar e compilar](.github/workflows/hinaria-build.yml) compila web/Java e Android a partir do código do repositório.

## Uso dos arquivos

O código completo está disponível pelo clone ou por **Code → Download ZIP** do repositório. Com o projeto iniciado, `/studio/` oferece botões de download HTTP do APK, JAR e HTMLs.

Os arquivos `HINARIA_UPGRADE_1.2.0.zip` e `HINARIA_UPGRADE_DEBUG_1.2.0.apk` na raiz são a distribuição histórica. O código atual está em `hinaria/`. Consulte [INTEGRACAO_1.2.1.md](hinaria/INTEGRACAO_1.2.1.md) para a estrutura e os resultados da integração. Não houve teste em aparelho Android físico.
