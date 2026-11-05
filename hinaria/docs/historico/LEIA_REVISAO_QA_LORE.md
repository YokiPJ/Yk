# HINÁRIA 1.1.0 — revisão QA + lore do Yoki

**Base:** HINARIA_110_CASAS_AVANCADAS_BALANCE_COMPLETA.zip. Esta atualização é uma cópia separada do jogo, não altera diretamente os arquivos do Codespaces. **Não é um APK compilado.**

## Estabilidade corrigida / reforçada

- `GameState.getHeightAt()` agora rejeita amostras ausentes, não finitas e mapas de altura não preenchidos (evita câmera `NaN`).
- Cenas são marcadas como assistidas **quando terminam**, não ao começar. Em erros de sequência/câmera, um fallback remove barras pretas e devolve o controle; a cena falha continua disponível para nova tentativa.
- Morte de boss/inimigo é processada uma vez só, com HP normalizado em zero; XP e vitória não duplicam por hits no mesmo frame.
- `houseInteriors`: proteção de estado de transição, clone de avatar sem copiar `userData` circular, e fade visual leve em entrada/saída.
- IA de inimigos distantes interrompe movimentação e busca de caminho quando estão a mais de 38 unidades; combate próximo mantém timing original.
- A câmera de boss passa a tentar enquadramentos laterais e mais altos quando rochas obstruem a visão (solução **aproximada**; não usa raycast exato).
- Adicionado um favicon embutido, eliminando o 404 comum.

## Novos sistemas

- **Chunks visuais 16×16**: InstancedMeshes de cenário e casas são agrupados; 3×3 blocos perto do jogador ficam visíveis por padrão. Ao executar uma cutscene, todos os grupos aparecem temporariamente. Desative pela URL `?stream=0` para comparação. **Não há descarregamento de geometria da RAM/GPU**; trata-se de *culling por grupo*, uma fase segura anterior ao streaming completo.
- **Diagnóstico F3** ou `Configurações → 🛠 Diagnóstico / FPS`: FPS, draw calls, triângulos, materiais, chunks e erros recentes. Baixa `HINARIA_DIAGNOSTICO.json` sem dados de conta pessoais.
- **Save de quests/exploração**: chave nova `hinaria.quests.exploration.v2`, com estado das missões, marcos descobertos e baús abertos. Continua separado de `hinaria-v79-music` e dos dados do arsenal. Saves anteriores são preservados; não existe migração completa de uma carreira/posição do jogador ainda.
- **Crônicas de Yoki**: botão `📖 Crônicas` no HUD ou tecla `L`. Oito páginas de história desbloqueadas pela exploração e missões, salvas sem objetos Three.js.

## História e jogabilidade

Três novas missões **opcionais** de Yoki, sem alterar o roteiro principal existente:
1. **As Três Marcas da Garra Cinzenta**: Bosque das Memórias e três pedras memoriais no Alto das Cinzas.
2. **O Gol Impossível**: visita ao Refúgio da Trilha Sul e retorno ao Yoki.
3. **De Novo**: epílogo do Yoki depois do Rei dos Orcs.

Quatro novas cutscenes no estilo da abertura: **O Espelho na Estrada**, **Replay da Garra Cinzenta**, **O Gol Impossível** e **Antes do Troll Ancião**. A cena de vitória do Rei dos Orcs ganhou uma fala final do Yoki. Podem ser revisitadas em `?cinema=1`.

**Disciplina de Replay:** ao concluir as três marcas, o Cavaleiro no modo Combate V2 ganha +20% de duração na janela de invulnerabilidade da esquiva **apenas para um tipo de inimigo que já o atingiu nos últimos oito segundos**. Não acrescenta ataques automáticos ou altera a classe de Yoki.

## Testes / limitações

`npm run test:qa` (ou `node tools/run-qa.mjs`): **25/25 testes Node passaram neste ambiente** (24 originais + 1 novo). Todos os módulos `src/*.js` passaram `node --check`.

**Não houve teste de navegador/WebGL/Android nesta sessão.** O ambiente não conseguiu instalar dependências npm sem acesso ao registro. Portanto renderização, colisões no dispositivo, desempenho e exportação APK precisam ser validados no Codespaces/celular.

### Sugestão de roteiro de teste manual

1. Faça backup da pasta anterior. Abra o jogo, feche o criador, explore Vilarrubra, passe por duas pontes, entre e saia de uma casa 20 vezes.
2. Ative `?cinema=1` e reveja Rei/Troll, vitórias e cenas novas do Yoki; confira se não há tela preta.
3. Teste mata-boss com ataque normal e habilidade, HP exatamente zero, jingle de vitória sem dupla reprodução.
4. Explore o mapa 96×96, confira pedras memoriais e as quests do Yoki. Aperte `L`, abra as Crônicas; recarregue a aba e teste persistência.
5. Aperte `F3` e baixe o diagnóstico. Compare `?stream=0` (sem culling de chunks) com a versão normal.
6. Rode no Android e teste pelo menos 20 minutos; FPS médio e máximo não bastam, confira engasgos e aumento de memória.

## Itens da pesquisa que ainda requerem desenvolvimento específico

- Raycaster exato para câmera + material transparente em objetos bloqueadores (o atual é heurístico).
- Streaming real com descarregamento/carregamento assíncrono de geometrias, não só ocultação de grupos.
- LOD e atlas de materiais generalizados com medição de draw calls antes/depois.
- Sistema completo de perfil/save com migração de versões antigas e posição de jogador.
- Yoki como quinta classe jogável e IA de boss com novas fases.
- Teste visual automatizado e validação APK/Android em aparelhos físicos.

Esses itens **não estão afirmados como implementados**. Recomenda-se fazê-los em uma fase seguinte, com testes e screenshots reais; forçar tudo numa única alteração sem validação traz risco alto de regressões.
