# Verificação — HINÁRIA Motion Java

## Exportador Java

Compilado com javac do JDK 21.0.8, usando --release 17. O JAR inclui os dados estáticos de referência e foi executado com heap máximo de 512 MB fora da pasta do projeto.

- Os sete GLBs foram reproduzidos byte a byte, com os mesmos SHA-256.
- Dez clipes por modelo; 70 combinações no total.
- Buffers e chunks alinhados, tempos crescentes e durações consistentes.
- Quaternions normalizados e valores finitos.
- Extremidades de Idle, Walk e Run coincidem.
- Nenhum canal altera o root mundial; movimentos permanecem no rig local.
- Opções inválidas, FPS fora da faixa, modelo inexistente e JSON truncado retornam erro explícito e código de saída não zero.

Relatório: verification/java-data-report.json.

## Formato GLB

Khronos glTF Validator 2.0.0-dev.3.10:

- Sete arquivos validados.
- Zero erros.
- Zero avisos.

O Java removeu triângulos degenerados de área nula encontrados nas geometrias de referência e renormalizou as normais de vértices.

Relatório: output/gltf-validation.json. O manifest registra quantos triângulos foram removidos por modelo.

## Visualizador

Chromium 155 headless com WebGL/SwiftShader. Desktop em 1440×1040; viewport mobile em 390×844, com toque emulado e preferência por movimento reduzido.

- 70 pares de modelo/clipe importados pelo GLTFLoader oficial.
- Alterações reais nas transformações do rig e geometria renderizada.
- Pausa, busca temporal, repetição de Walk e reprodução única de Hit.
- Troca de modelos com contagem estável de geometrias da GPU.
- Órbita da câmera e retorno ao enquadramento inicial.
- Wireframe, sombras, qualidade, busca e filtros.
- Download de GLB com bytes idênticos à saída Java.
- Download e reabertura do HTML completo.
- Layout mobile sem rolagem horizontal da página.
- Zero erros JavaScript, erros no console e solicitações externas.

Relatório: verification/browser-report.json.

Os testes usaram HTTP em localhost. A política do Chromium gerenciado bloqueia navegação file:// neste ambiente; a abertura direta do arquivo não pôde ser verificada aqui. Todos os scripts, GLBs e estilos estão embutidos no HTML.

## Reproduzir os testes

O exportador e o JAR não dependem de Node.js. Somente as ferramentas opcionais de validação usam npm:

    cd tools
    npm ci
    npx playwright install chromium
    cd ..
    python3 tools/verify-data.py
    node tools/validate-glb.mjs
    node tools/verify-preview.mjs

Se necessário, HINARIA_JAVA indica o executável Java para verify-data.py; HINARIA_CHROMIUM indica o executável Chromium para verify-preview.mjs.

## Limites

JDK 17 foi definido como alvo de compilação; a execução foi testada em JDK 21. Firefox, Safari, Windows e aparelhos físicos não foram executados neste ambiente.

As animações usam hierarquia de nós rígidos. Outros esqueletos precisam de adaptação; os testes cobrem os sete modelos fornecidos.

O adaptador opcional examples/HinariaMotionPlayer.mjs foi testado isoladamente: Hit retorna a Idle, Death mantém a pose final, Walk repete, aliases e erros são tratados e o wrapper conserva sua posição no mundo. Relatório: verification/integration-report.json. Nenhum teste aplicou alterações ao jogo.
