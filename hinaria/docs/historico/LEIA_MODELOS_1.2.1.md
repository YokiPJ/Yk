# HINÁRIA 1.2.1 — modelos e equipamentos

Correção aplicada ao código do jogo. O APK Android, o projeto e o comparativo HTML são entregues separadamente.

## Correções

- Os 12 modelos V2 usam pontos de fixação na palma e no antebraço.
- O Cavaleiro ataca com o braço que realmente carrega sua espada.
- Espadas, cajados, arcos, martelos, clavas e machados têm origens de empunhadura definidas.
- O machado do Replay substitui a arma anterior no mesmo braço animado.
- Armas verticais recebem um giro no encaixe da mão durante o golpe, mantendo o cabo na palma.
- O Paladino usa o arco com as duas mãos e não conserva um escudo sobre a mão de apoio.
- Armas evoluídas selecionadas no Arsenal passam a aparecer nos modelos V2.
- Os quatro níveis de armadura recebem acabamento distinto; a armadura segue os pivôs dos membros.
- Todas as partes da capa acompanham a animação e partem de trás do torso.
- Pés usam um deslocamento de repouso consistente com o chão.
- Os modelos clássicos de fallback também usam encaixes de mão e armaduras ligadas aos membros.
- O avatar dentro das casas mantém cópias independentes dos novos pivôs e restrições.
- A troca de aparência também libera a geometria de partículas da arma retirada.

Personagens: Cavaleiro, Paladino, Feiticeiro, Druida, Bram, Yoki, Bandido, Esqueleto, Troll, Orc, Troll Ancião e Rei dos Orcs.

## Instalar no Android

Baixe o arquivo HINARIA_MODELOS_CORRIGIDOS_1.2.1_DEBUG.apk entregue no chat e instale no aparelho.

Identidade: br.com.hinaria.rpg, versionName 1.2.1, versionCode 3. O APK é uma compilação debug, com o mesmo certificado debug da versão 1.2.0 desta sessão. Não foi executado em aparelho físico.

## Conferir visualmente

Abra HINARIA_MODELOS_ANTES_DEPOIS.html no navegador. Selecione personagem, movimento, equipamento e armadura; arraste para girar a câmera e use a barra para conferir as poses.

O HTML é independente e contém as bibliotecas e os construtores antes/depois embutidos. Não carrega nem modifica saves do jogo.

## Executar o projeto

Requisitos: Node.js 22+ e npm.

    npm ci
    npm run build:web
    npm run serve:offline

Abra o endereço mostrado pelo servidor. O ZIP contém o projeto e os assets originais. Saídas geradas como node_modules, www e caches Gradle são reconstruídas por esses comandos; não são necessárias para conferir o HTML independente ou instalar o APK já pronto.

## Android a partir do código

Requer JDK 21 e Android SDK compatível com o projeto. Configure JAVA_HOME e ANDROID_HOME, depois:

    npm run android:sync
    npm run android:debug

O build verifica se o fingerprint do conteúdo web coincide com o conteúdo empacotado no APK.

## Testes

    npm run test:qa
    node tools/test-upgrade-browser.mjs --offline
    node tools/test-gameplay-roundtrip.mjs --offline

O teste específico de modelos utiliza Three.js real e cobre 12 rigs em sete poses, 21 equipamentos, quatro armaduras, dez fallbacks clássicos e a independência do clone dentro das casas.

Consulte MODELOS_QA para os resultados executados. A validação gráfica usa Chromium/SwiftShader; não representa um teste de desempenho em GPU física ou celular.

## Origem

O upload atual excedeu o limite de transferência de 32 MiB. O trabalho partiu da cópia local HINARIA_UPGRADE_1.2.0 já presente nesta sessão. A identidade byte a byte com o novo upload não pôde ser verificada.

Não houve publicação no GitHub. Os arquivos são entregues por links de download no chat.
