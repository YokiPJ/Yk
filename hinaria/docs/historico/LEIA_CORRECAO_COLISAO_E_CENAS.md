# HINÁRIA — hotfix colisão e cutscenes (1.1.0)

Base: HINARIA_110_CUTSCENES_CINEMATICAS_COMPLETA.zip.

- Ponte Velha e Ponte do Sul: bordas sob os corrimãos bloqueadas; centro livre, com altura alinhada ao modelo arqueado e entrada/saída suavizadas. Os visuais clássicos mantêm a altura original.
- Caminhada dos inimigos: verificação da célula de colisão na interpolação, impedindo atravessar obstáculos em diagonais.
- Vitórias Troll Ancião / Rei dos Orcs: evento enfileirado ANTES dos callbacks de missão; prioridade no próximo instante seguro, sem ser descartado se uma interface impedir a execução.
- Botão `🎬 Cenas` em `?cinema=1`: vitórias podem ser pré-visualizadas mesmo sem derrotar o chefe, sem conceder recompensas ou alterar missões.
- Apresentação dos bosses: enquadramentos aproximados pelo lado do jogador e correção de linha de visão contra rochas e penhascos.
- Outros sistemas, efeitos, áudios e modelos preservados.

## Testes executados
- `node --check` dos módulos alterados.
- `node tests/test_cutscene_collision_hotfix.mjs` (passou).
- 22 testes do diretório `tests` (passaram na última rodada antes do pacote; reexecute para conferir).

## Limites
A renderização no navegador, os modelos, o resultado visual da câmera, a reprodução musical e o APK Android não foram verificados neste ambiente. O teste de oclusão usa colisores aproximados e pode precisar de refinamento com screenshots de diferentes posições de chefe.

## Como compilar
`npm install` seguido de `npm run android:add` somente na primeira vez, e depois `npm run android:debug`.

## Debug
No navegador, abrir `/?cinema=1`, selecionar `Vitória contra o Troll` ou `Vitória contra o Rei dos Orcs` para prévia. Essas prévias não alteram progresso. Na partida, derrotar os bosses reais para acionar o gatilho.
