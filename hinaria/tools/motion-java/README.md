# HINÁRIA Motion Java

Exportador Java de animações 3D reais, baseado nos modelos e pivôs da versão local HINARIA_UPGRADE_1.2.0. Pacote independente; o jogo e a release existente não foram alterados.

## O que foi entregue

- src/HinariaAnimator.java: exportador completo, somente biblioteca padrão do Java.
- HinariaMotion.jar: executável com os dados dos sete modelos embutidos.
- output/: sete GLBs, cada um com dez clipes.
- HINARIA_MOTION_JAVA_PREVIEW.html: visualizador offline com todos os modelos e clipes embutidos.
- assets/: geometria de referência e proveniência.
- examples/HinariaMotionPlayer.mjs: adaptador opcional para Three.js.
- verification/: resultados dos testes.

O Java calcula todos os keyframes e grava geometria, materiais, hierarquia e animações no GLB. O HTML usa Three.js somente para importar e reproduzir esses dados; não recria as poses com fórmulas JavaScript.

## Modelos do jogo

Cavaleiro, Paladino, Feiticeiro, Druida, Bandido, Esqueleto e Orc. Os modelos foram extraídos das fábricas reais de src/modelsV2 e passaram pelo mesmo batching por articulação usado pelo jogo.

| Clipe | Ação | Duração | Reprodução padrão |
|---|---|---:|---|
| Idle | Repouso | 2,80 s | Ciclo |
| Walk | Andar | 0,90 s | Ciclo |
| Run | Correr | 0,60 s | Ciclo |
| Attack | Ataque | 0,35 s | Uma vez |
| AttackHeavy | Ataque pesado | 0,60 s | Uma vez |
| Hit | Receber dano | 0,42 s | Uma vez |
| Block | Defender | 0,80 s | Uma vez |
| Dodge | Esquiva | 0,55 s | Uma vez |
| Jump | Salto | 0,90 s | Uma vez |
| Death | Morte | 1,10 s | Uma vez, mantém pose |

Attack preserva a duração de 0,35 s do controlador original. Hit acrescenta recuperação à janela de impacto original de 0,18 s. Os clipes têm nomes comuns nos sete modelos; amplitude e braço principal são adaptados a cada rig.

No Cavaleiro, a espada original é filha de armL. A exportação acompanha esse pivô real, enquanto o CharacterAnimator original aciona armR no ataque.

## Testar agora

Abra HINARIA_MOTION_JAVA_PREVIEW.html no navegador. Selecione o modelo e a animação. Arraste para girar a câmera; use scroll ou pinça para zoom.

O visualizador oferece pausa, velocidade, linha do tempo, repetição, câmera inicial, wireframe, sombras, qualidade, captura PNG e download do GLB do modelo selecionado.

Se o navegador bloquear arquivos locais, execute na pasta do pacote:

    python3 -m http.server 8080 --bind 127.0.0.1

Abra http://127.0.0.1:8080/HINARIA_MOTION_JAVA_PREVIEW.html.

## Executar o Java

O JAR pronto requer Java 17+. Não exige Maven, Gradle, Node.js ou internet.

    java -Xmx512m -jar HinariaMotion.jar --out output

Exportar somente o Cavaleiro:

    java -Xmx512m -jar HinariaMotion.jar --model cavaleiro --fps 60 --out output

Opções:

- --model: all, cavaleiro, paladino, feiticeiro, druida, bandido, esqueleto ou orc.
- --fps: densidade dos keyframes, de 15 a 120; padrão 60.
- --out: pasta de saída.
- --input: snapshot JSON alternativo no mesmo contrato de assets/hinaria-rigs.json.gz.
- --help: ajuda.

## Compilar

Requer JDK 17+ com javac e jar no PATH.

Linux/macOS:

    bash build.sh

Windows:

    build.bat

Também é possível indicar o diretório do JDK pela variável HINARIA_JDK. Exemplo no PowerShell:

    $env:HINARIA_JDK = "C:\Program Files\Eclipse Adoptium\jdk-21"
    .\build.bat

Execução direta do fonte, sem compilar previamente:

    java -Xmx512m src/HinariaAnimator.java --input assets/hinaria-rigs.json.gz --out output

Para reconstruir o HTML depois de gerar novos GLBs, use Python 3, somente biblioteca padrão:

    python3 build_preview.py

## Formato e integração

Cada GLB segue glTF 2.0 e contém materiais PBR, malhas, nós articulados e animation channels com translação, rotação quaternion XYZW e escala. As rotações são normalizadas e as extremidades dos ciclos contínuos coincidem.

O root do modelo não recebe tracks; o controlador deve movimentar um wrapper no mundo. As pequenas translações de impacto, salto e respiração pertencem ao nó local HINARIA_body.

assets/rig-contract.json descreve o contrato e o braço principal de cada modelo. O contrato de pivôs é HINARIA_body, HINARIA_head, HINARIA_armR, HINARIA_armL, HINARIA_legR e HINARIA_legL, mais as partes de capa existentes. O mapeamento usa as referências reais userData.r; não pressupõe nomes de ossos.

O módulo opcional examples/HinariaMotionPlayer.mjs carrega um GLB, oferece play/update/dispose, faz transições e retorna ao Idle depois das ações, exceto Death. Ele não foi instalado no jogo. Sua aplicação precisa fornecer Three.js e chamar update no loop existente.

Não execute o animador procedural antigo e um AnimationMixer sobre os mesmos pivôs ao mesmo tempo. Dano, colisão, vida, movimento, inputs e save continuam sendo responsabilidades do jogo.

## Alcance de “universal”

As dez ações compartilham o contrato semântico dos sete humanoides fornecidos. São animações de uma hierarquia de peças rígidas, compatível com a estrutura atual do HINÁRIA. Não há deformação de vértices por skinning, captura de movimento nem retargeting automático para esqueletos externos. Outro rig exige seu próprio mapeamento, bind pose e proporções.

## Validação

Os sete GLBs passaram no Khronos glTF Validator com zero erros e zero avisos. O visualizador importou os 70 pares de modelo/clipe com o GLTFLoader oficial. O JAR foi executado fora da pasta do projeto e reproduziu os GLBs byte a byte.

Consulte VERIFY.md e os relatórios JSON para a cobertura e as limitações.

## Origem e licenças

O upload atual ultrapassou o limite de transferência de 32 MiB; foi utilizada a cópia local da release 1.2.0 construída anteriormente nesta conversa. Os arquivos de referência inspecionados coincidem com essa cópia local; a identidade byte a byte com o novo upload não pôde ser verificada.

assets/provenance.json registra os hashes dos fontes originais inspecionados. O exportador remove triângulos degenerados de área nula e normaliza normais antes de gravar o GLB, sem editar os modelos originais.

Three.js, OrbitControls, GLTFLoader e BufferGeometryUtils são redistribuídos sob licença MIT, em preview/vendor/THREE-LICENSE.txt e no HTML.

Trabalho orientado pela skill zero-web-motion-studio:java-3d-animations do ZERO Web Motion Studio.
