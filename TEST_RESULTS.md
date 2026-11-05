# HINÁRIA · Resultados executados em 05/11/2026

## Ambiente e identidade

Linux x86_64; Node 24.22.1; npm 11.9.0; Chromium 155 headless com SwiftShader (renderização por software); JDK completo 21.0.8; Android SDK Platform 35, Build Tools 34.0.0/35.0.0; Gradle 8.11.1. Aplicativo `br.com.hinaria.rpg`, versionCode 2, versionName 1.2.0, minSdk 23, targetSdk 35. Fingerprint web/APK: `65a91fc2221f`.

## Verificações finais

| Comando / verificação | Resultado efetivamente observado |
| --- | --- |
| `npm ci --include=dev --no-audit --no-fund` | Passou; 108 pacotes instalados pelo lockfile |
| `node tools/run-qa.mjs` | **43/43 arquivos de teste passaram**, 0 falhas |
| `node tools/test-package.mjs` | Passou |
| `node tools/verify-release.mjs` | Passou; 71 módulos do jogo e imports/assets/IDs preservados |
| `node tools/check-imports.mjs` | Passou; linkage real sem avaliação de DOM, 71 módulos + Three/Pixi/anime |
| `node --check` em fontes/build/server | **85/85** módulos passaram |
| `npm run build:web` | Passou; 203 arquivos no manifesto SHA256, libs/licenças/recursos locais |
| `node tools/test-upgrade-browser.mjs --offline` | **9/9 cenários passaram**, 0 falhas, requisições externas bloqueadas |
| `node tools/test-context-recovery.mjs` | **2/2**: perda/restauração real de contexto com pausa/retomada, e boot sem WebGL com recarga explícita |
| `node tools/test-gameplay-roundtrip.mjs` | **3/3**: NPC/quest, casa/save/reload, boss/save/reload |
| `bash tools/setup-android-sdk.sh` com ANDROID_HOME configurado | Passou novamente sem reinstalar pacotes; comportamento idempotente |
| `npm run android:sync` | Passou; plugin oficial @capacitor/app 7.1.2 sincronizado |
| `npm run android:debug` com JAVA_HOME/ANDROID_HOME/GRADLE_USER_HOME configurados | **BUILD SUCCESSFUL**, 112 tarefas, 24 executadas e 88 up-to-date na build definitiva |
| `apksigner verify --verbose` | Passou; assinaturas v1 e v2 válidas |
| Comparação SHA256 de recursos dentro do APK | **203/203 arquivos web** iguais ao manifesto; fingerprint igual e AppPlugin presente |
| `aapt dump badging` | Identidade/versionCode/versionName/SDKs acima confirmados |
| `adb devices -l` | Nenhum aparelho conectado; APK não instalado nem testado em telefone |

Os 9 cenários offline executaram: desktop com título/configurações/créditos, movimento/golpe manual, pausa completa/foco, save/reload/Continuar e submenus; cinco layouts/classes (360×800 Cavaleiro, 390×844 Paladino, 800×360 Feiticeiro, 1280×720 Druida, 1600×900 Yoki); joystick + ataque com dois toques via CDP; flags `?visual=classico&stream=0&cinema=1`; falha induzida apenas nos renderizadores de UI para verificar CSS/DOM fallback. As cenas de chegada foram puladas pelo botão real antes dos testes de controles.

Nos cenários normais não houve exceções de página, erros de console nem requisições com falha. No cenário de fallback foram esperados e registrados o erro de criação WebGL do título e o bloqueio deliberado de `/vendor/pixi.min.mjs`; o jogo permaneceu utilizável com HUD DOM.

## Natureza dos testes de gameplay

A integração adicional usa fixtures declaradas: teleporte para o Bram/porta de uma casa/boss reais e redução do boss a 1 HP com stun para encurtar a luta. Diálogo, aceite da missão, tecla F, entrada/saída do interior, ataque pelo botão, dano, recompensa, cenas e save/load usam os sistemas de produção. Foi confirmado que a missão `c1_ratos` ficou ativa, o interior restaurou suas coordenadas e `troll_ancient` derrotado não reapareceu nem repetiu ouro após reload. Isto não substitui uma campanha manual completa.

Os testes Node também exercitam as cinco classes, corrupt-save/backup/storage errors, fog completo, restore seguro, boss derrotado antes de aceitar a missão, recompensa uma única vez, respawn por tempo de simulação, cone frontal/paredes/ausência de aim snap, seis distritos clássicos com 647 meshes de geometria finita e o ciclo de vida da atmosfera/diálogos.

## Baseline e falhas investigadas

- Baseline reproduzida: **34/35** QA; `test_v76_houses.mjs` falhava com `envV2 is not defined`. Corrigido o recorte do snippet, sem enfraquecer asserções; em seguida **35/35**.
- O navegador detectou `ReferenceError: e is not defined` num patch intermediário do HUD; corrigido no escopo de telemetria. O boot em delta zero ganhou regressão dedicada.
- O modo clássico revelou `i is not defined` e ornamentos com dimensões/posições/materiais incorretos; corrigidos e cobertos por teste em modo estrito e pelo cenário de compatibilidade offline.
- A primeira execução ampla de navegador terminou **8/9**: houve timeout em 1600×900 durante software rendering concorrente. Reexecução isolada passou **1/1**. O runner passou a observar estado por intervalo e o layout usa o controle real de qualidade baixa. A execução offline final passou **9/9**.
- O teste de restauração inicialmente comparava ouro após um novo tick de exploração legítimo; passou a observar a transição PLAYING síncrona, antes de quaisquer recompensas novas. A quantidade restaurada foi então confirmada.
- A compilação Android inicialmente encontrou apenas JRE, depois Build Tools 34.0.0 ausente. JDK completo e revisões exigidas foram instalados; a build final passou. A CA pública do host é suportada por truststore local, sem desativar TLS ou checksums.

## Limites e verificações não executadas

Não há benchmark em GPU física/telefone nem validação de bateria, termal, foreground/background e botão Voltar em um dispositivo real. O bridge nativo foi implementado e compilado, mas os eventos físicos não foram testados em aparelho. Os snapshots headless finais reportaram FPS entre 1 e 6, por software e em fluxos diferentes; não são um benchmark sustentado, nem evidência de 60 FPS no Android. A medição identifica o flow e guarda amostras reais limitadas.

Não foi executada uma campanha manual completa com os dois bosses, todas as quests e cada habilidade em todos os dispositivos. O boss usado na integração foi o Troll Ancião; as regras de persistência dos dois bosses foram testadas na QA Node. O APK é debug, sem release/AAB/assinatura de publicação. O aviso Gradle sobre flatDir e avisos do apksigner sobre entradas META-INF constam nos logs; as verificações de build/assinatura passaram.

`validate_imports.js` e `check_exports.js` são ferramentas legadas CommonJS conservadas da base; a verificação executada foi `tools/check-imports.mjs`, compatível com ES modules e com o grafo real. O Node imprime um aviso de API experimental para o linkage via VM; isso não é falha.

Logs, JSONs e screenshots reais estão em `qa-evidence/`. As referências fornecidas estão em `references/`. Publicação do ambiente e restauração em uma nova tarefa não foram executadas nem presumidas.

## Configuração reutilizável

Os campos `install_script` e `start_skill` foram salvos no rascunho do ambiente. A instância atual foi validada; a publicação do snapshot e a restauração em uma nova tarefa continuam pendentes. Para disponibilizar a configuração, revise e salve as alterações nas configurações do ambiente e publique-o.
