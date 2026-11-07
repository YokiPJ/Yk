# Parte II — O Eco sob as Cinzas

Teste beta da continuação de HINÁRIA, distribuído em `v1.3.0-beta.1`. O conteúdo usa o mapa 96×96 e preserva a campanha de Vilarrubra. A release beta é separada do canal estável 1.2.2.

## Como iniciar

1. Continue sua aventura ou conclua a campanha principal até **A Coroa dos Quebra-Presas**.
2. Derrote o Rei dos Orcs e entregue essa missão a **Bram**, na vila. Matar o chefe sem entregar a missão ainda não conclui esse requisito.
3. Fale com **Yoki** e aceite **Parte II · A Passagem das Brumas**.

Os marcadores do minimapa e o diário usam as missões reais. As coordenadas abaixo servem como referência de navegação; não exigem comandos ou teleporte.

| Local | Coordenadas do mundo | Uso |
| --- | --- | --- |
| Passagem das Brumas | `(46, 73)` | Entrada da nova trilha na fronteira sul |
| Observatório do Eco | `(56, 79)` | Investigação e encontro com os vigias |
| Santuário da Última Voz | `(58, 89)` | Confronto final da Parte II |

## Sequência jogável

| Missão | Objetivo | Retorno |
| --- | --- | --- |
| A Passagem das Brumas | Descobrir a passagem e o observatório | Yoki |
| A Vigília dos Ossos | Derrotar dois Vigias do Eco e encontrar o santuário | Bram |
| A Última Voz | Derrotar a Sentinela do Eco, de nível 22 | Yoki |

Somente os Vigias da região do Eco contam para a segunda missão; esqueletos de Ardu não avançam esse objetivo. Os encontros são criados enquanto seus objetivos estão ativos. A Sentinela reutiliza o rig do Troll Ancião com variação de aparência e as animações existentes. Não são necessários outro renderizador ou luzes adicionais para a região.

Prepare armas, armadura e habilidades antes do confronto final. O encerramento acontece no retorno a Yoki, com a entrega da missão e a recompensa. Depois, a aventura permanece aberta à exploração.

## Roteiro de teste

1. Confira que a Parte II fica indisponível antes de concluir e entregar **A Coroa dos Quebra-Presas**.
2. Aceite a primeira missão e percorra a trilha até os dois locais. Verifique o avanço dos marcadores e o retorno a Yoki.
3. Aceite a segunda missão em Bram. Derrote um Vigia, salve e use Continuar: o progresso deve manter um inimigo restante. Um esqueleto fora do Eco não deve contar.
4. Complete a investigação do santuário e entregue a missão a Bram.
5. Aceite a missão final com Yoki, enfrente a Sentinela e retorne para concluir a Parte II.
6. Salve e recarregue depois da conclusão. A Sentinela derrotada não deve reaparecer nem conceder a recompensa novamente.

## Geração e diagnóstico

O gerador usa semente padrão 11, registra a semente normalizada e a versão da geração no save e no diagnóstico, e protege as rotas necessárias às entradas e aos objetivos. Gerar novamente a lógica antes dos meshes reinicia os dados; uma cena já construída deve ser recarregada, evitando sobrepor mundos.

Para relatar um problema, abra **Configurações → Diagnóstico** e exporte o JSON. Informe o aparelho, versão do Android/WebView, local do mapa, missão ativa e o que aconteceu. Os testes de navegador e os relatórios da build final ficam em `docs/qa/1.3.0-beta.1/`; não representam medição em um telefone físico.
