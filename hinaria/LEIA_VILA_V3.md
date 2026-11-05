# HINÁRIA — Modelos 3D da vila V3

Novo: `src/assets/villageModelsV3.js` (procedural, sem arquivos novos). Alterado: `src/world/world.js` (1 import, 1 bloco após os waymarkers, 1 linha em `updateWorld`).

## Modelos (ids)
moinho (pás giram), celeiro, estabulo (com cavalo), fonte (água, anéis e gotas animados), feno, banco, varal (panos balançam), lenha (com machado), quadro (avisos).
Texturas: as mesmas do jogo (wood_planks, rock, roof_tiles, thatch, cloth_*, fur...). Cada modelo vira poucas malhas (1 por material); só as partes animadas ficam soltas.

## Posicionamento
`PLAN` no fim do módulo: `near` (onde prefere) e `rad` (raio de busca). O código só coloca em terreno livre: fora de estradas, da praça (13,15), dos NPCs, de casas e de props bloqueantes. Moinho, celeiro, estábulo e fonte são sólidos e bloqueiam as células da pegada; os demais não bloqueiam. Se não achar lugar, o modelo é pulado. O console mostra `[Hinária] Modelos da vila V3: ...` com o que foi posto.
Só entra no visual V2 (`?visual=classico` desliga). Se algo falhar, vira aviso no console e o jogo segue.

## Ajustar
Mude `near`, `rad`, `s` (escala) ou apague linhas do `PLAN`. Para um modelo novo, crie a função e registre em `BUILDERS`.

## Não verificado
Sem o Three real aqui: rodei os 9 construtores e o posicionamento com um Three de mentira (sem erros) e `node --check`. O visual, a escala e onde cada um caiu no seu mapa precisam ser conferidos no jogo (o console lista as posições).
