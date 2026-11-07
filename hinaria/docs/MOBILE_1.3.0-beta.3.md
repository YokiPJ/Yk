# HINÁRIA 1.3.0 Beta 3 · Alvo automático

O botão Atacar e as teclas J/Espaço escolhem o inimigo vivo mais próximo dentro do alcance da arma e viram o personagem antes de golpear. A busca cobre 360 graus, verifica obstáculos e ignora mortos, NPCs e modelos ocultos. Distâncias iguais favorecem quem já está à frente.

O combo do Cavaleiro mantém uma vítima por golpe e confirma sua validade no instante do impacto. Caso ela morra, desapareça, fique bloqueada ou saia do alcance, o impacto procura outra vítima válida. O próximo golpe da sequência faz uma nova seleção. Um comando antecipado para o combo seguinte não muda o alvo do golpe atual.

As cinco classes e todas as armas básicas usam a assistência. Flechas e cajados mantêm seus projéteis e seus tempos de impacto; o Machado do Replay mantém seus poderes. O movimento continua livre e a esquiva controla sua própria direção. A assistência termina com o golpe e depende de um comando de ataque. Dano, alcance, recargas, habilidades e formato do save permanecem compatíveis.

As correções de inicialização da [Beta 2](MOBILE_1.3.0-beta.2.md), a Parte II e as otimizações da [Beta 1](MOBILE_1.3.0-beta.1.md) continuam incluídas.

No PC, feche o servidor anterior e extraia o patch sobre a pasta da Beta 2 que contém `INICIAR_PROJETO.bat`, substituindo arquivos. Abra esse inicializador. Use a mesma origem e porta para acessar seus saves existentes. O ZIP completo também contém as bibliotecas locais para executar o jogo.

Validação: [resultados da Beta 3](qa/1.3.0-beta.3/results.json). Os testes de navegador usam Chromium/SwiftShader com toque emulado, sem substituir o teste em celular físico.
