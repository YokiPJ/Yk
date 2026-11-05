# HINÁRIA 1.1.0 — VFX centralizados no alvo + mira teleguiada

Base: `HINARIA_110_CLAUDE_VFX_SEM_VFX_ANTIGOS.zip`.

## Corrigido

- Os cortes das cinco classes, combos do Cavaleiro e skills de alvo agora geram o VFX na posição do **inimigo/impacto**, em vez de sempre na posição do personagem.
- A mira assistida escolhe o inimigo **vivo, mais próximo e com linha de visão**, dentro do alcance equipado, sem exigir mirar perfeitamente na direção dele.
- A seleção é feita **somente quando o jogador aperta atacar ou ativa uma habilidade**: não existe ataque automático, lock-on persistente ou dano fora do alcance.
- Flechas físicas do Paladino acompanham a posição atual do alvo e não acertam se ele morrer, fugir do alcance ou se esconder atrás de uma parede.
- Projéteis visuais (bola de fogo, lança de gelo, míssil arcano) acompanham um inimigo em movimento; desaparecem se o alvo morre ou fica sem linha de visão.
- A Rajada Celeste (beam) agora atualiza sua direção e ocupa corretamente o espaço entre emissor e alvo.
- Auras, defesa, cura e efeitos de chão pessoais **continuam ao redor do jogador de propósito**.
- Sem trocar os IDs de inimigos, dano, quests, classes, inventário, cooldowns ou saves.

## Arquivos modificados

- `src/combat/forwardHit.js` (nova mira assistida com linha de visão; função antiga preservada)
- `src/combat/combatV2Bridge.js` (golpes comuns + combos)
- `src/combat/combat.js` (habilidades e flechas guiadas)
- `src/vfx/claudeVfxBridge.js` (origem, destino e referência móvel)
- `src/vfx/claudeVfx.js` (projéteis dinâmicos e beam)
- `tests/test_manual_combat_vfx.cjs` (stub atualizado)
- `tests/test_homing_target_and_vfx.mjs`, `tests/test_homing_arrows.mjs` e `tests/helpers/mini-three.mjs` (regressões)

## Validação

- `npm run test:qa`: 35/35 testes aprovados.
- Testes originais de 34 efeitos Claude: aprovados, sem vazamento e sem NaN.
- `node --check` dos módulos alterados: aprovado.

## Testar visualmente

1. Execute no navegador pelo servidor local normal do projeto (ou instale dependências e use o fluxo de build habitual).
2. Vá para perto dos inimigos (rato/bandido); teste J/Espaço de cada classe.
3. Movimente-se ao redor do inimigo e atire de arco/cajado, sem apontar exatamente para a direção do alvo.
4. Teste atrás de casas/árvores e fora do alcance — não deve acertar.
5. Teste os combos do Cavaleiro e habilidades de cada classe; confira os VFX no inimigo.
6. No celular, confira FPS durante combates longos.

**Nota:** a renderização real no navegador/Android não foi validada nesta sessão, pois o ambiente de teste não tem o módulo local Three.js instalado e não possui acesso de rede ao CDN. Os testes automatizados de lógica e VFX passaram; aparência e desempenho precisam ser verificados no seu dispositivo.
