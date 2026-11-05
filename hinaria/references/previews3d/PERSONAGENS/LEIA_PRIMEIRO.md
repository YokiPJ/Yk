# HINÁRIA — ELENCO 3D INDIVIDUAL V2

- Abra `index.html` para selecionar o personagem.
- Cada arquivo em `modelos/` é um HTML independente, com suas próprias malhas e interface.
- Modelos novos: Paladino, Feiticeiro, Druida, Bram, Yoki, Bandido, Esqueleto, Troll, Orc e Troll Ancião.
- Cavaleiro: preservada integralmente a demonstração do Claude fornecida pelo usuário.
- Rei dos Orcs: preservada integralmente a V4 aprovada pelo usuário (com machado corrigido).
- Rato: função `buildRat()` copiada literalmente de `src/combat/combat.js` da versão HINÁRIA 1.1.0 enviada nesta conversa. Incluído só para inspeção: NÃO redesenhado.
- Todos usam Three.js r160 carregado por CDN, exigindo internet.
- Os novos modelos são **protótipos**. As animações e o resultado visual 3D precisam ser validados no navegador do usuário.
- Não é um instalador de modelos no jogo. Integração de escala, rigs e desempenho será feita depois da aprovação das capturas.

## Arquivos

Cada personagem possui seu próprio HTML em `modelos/`. O botão de captura nos novos HTML gera `HINARIA_<personagem>_4_ANGULOS.png` usando `WebGLRenderTarget` (sem `preserveDrawingBuffer`).

## Limitações

- Não executei WebGL no navegador nem medi desempenho Android; apenas testes estáticos/sintáticos.
- Os protótipos novos não prometem replicar exatamente o design histórico de cada NPC. Bram e Yoki foram baseados nos nomes/cores/funções encontrados no código do jogo.
- Por compatibilidade, a prévia do rato usa seu próprio controlador de animação, mas o código de construção da malha é original.

## V2 — Correção de armas e identidade de Yoki

- Nos 10 protótipos gerados, cada arma agora nasce num grupo `RightHandGrip` na palma direita, sem depender de deslocamento do ombro.
- Cajados e galhos usam inclinação **para fora do tronco**; machados, arcos, espadas, martelos e clavas têm orientações próprias. Escudos mantêm ligação ao antebraço esquerdo.
- Cavaleiro original do Claude e Rei dos Orcs V4 aprovado não foram redesenhados ou movidos; rato original não foi modificado.
- Yoki foi reconstruído como **orc bárbaro da Garra Cinzenta**: pele verde-acinzentada, cabelo escuro em tranças, armadura de batalha, machado próprio e um **espelho negro com vidro luminoso** preso ao cinto.
- O espelho representa o artefato da Caverna do Esquecimento; o modelo não pressupõe poderes mágicos que a história não descreve.
- Yoki é um protótipo para ser jogável no RPG futuramente. O sistema do jogo não foi editado.
- Testado somente quanto a sintaxe JS, referências estáticas e integridade do ZIP. **A posição visual exata precisa da captura em navegador.**

## Teste recomendado

Abra `modelos/Druida.html`, `modelos/Feiticeiro.html`, `modelos/Orc.html` e `modelos/Yoki.html`, use **Capturar 4 ângulos** e revise o encaixe das armas de frente e de lado.


## V3 — correção de equipamentos
- Ajustado o posicionamento das armas para fora do tronco.
- Espadas inclinadas para frente e para baixo.
- Cajados/galhos reposicionados para não atravessar o corpo.
- Machado, clava, martelo e arco com pegada mais externa na mão direita.
- Cavaleiro com espada corrigida.


## V4 — orientação das armas corrigida
- Invertido o ângulo X das armas em TODOS os modelos 3D.
- Espadas, machados, cajados, martelos, clavas e arco agora apontam para frente de forma natural, em vez de ficar ao contrário.
- Cavaleiro recebeu ajuste específico na espada.
