# HINÁRIA UI V2 — Sem alvo e botões de combate corrigidos

- Botão **Alvo**, tecla **T**, lock-on, seleção automática, anel vermelho e destaque de alvo removidos.
- Ataque e habilidades resolvem um **inimigo na frente do personagem na hora do input**, verificando distância, cone de direção e obstáculo. Ataque vazio faz animação e aplica cooldown, sem dano.
- Botões **Golpe** e **Esquiva** reagrupados com a barra de habilidades em um dock responsivo. O analógico à esquerda permanece independente.
- **Esquiva por K ou botão** também funciona nas classes sem combo do Cavaleiro, com stamina/recarga, colisão, animação e frames de invulnerabilidade.
- Habilidades extra continuam atrás de + Extras; menu de missões/inventário/visual não mudou.
- Controles: J ou Espaço = Ataque; K = Esquiva; 1–5 = habilidades; M = Menu; F = interagir.

## Validação manual necessária
1. Matar rato e bandido de frente, virar as costas e verificar ausência de dano; bater sem inimigo deve animar.
2. Verificar combo do Cavaleiro, ataques das outras 3 classes, esquiva de todas e bloqueio por parede.
3. Testar botões no Android retrato e paisagem, analógico e ataque simultâneos, barra + Extras, menu e HUD.
4. Conferir que o botão T não funciona e nenhuma entidade recebe anel vermelho ou nome destacado.

Não altera o rato, mapas, missões, modelos 3D, cutscenes, saves ou músicas. Não há teste visual de WebGL no ambiente.
