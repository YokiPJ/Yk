# HINÁRIA 1.3.0 Beta 4

Esta build integra a [revisão geral](REVISAO_1.3.0-beta.4.md), mantendo o alvo automático, a Parte II e as otimizações mobile anteriores. O APK usa um script local para Chrome/WebView 80, HUD Canvas2D no touch, orçamento de pixels e iluminação limitada na vila. As correções de combate e saves não adicionam renderizadores ou loops de animação.

O toque prolongado gera um golpe; a direção automática respeita cantos e paredes. A IA também verifica esses obstáculos e o atordoamento interrompe deslocamentos em andamento. Recargas sobrevivem à troca de arma, e Replay respeita o máximo de vida da classe atual.

Saves válidos da Beta 3 continuam compatíveis. Etapas de missão incompatíveis são detectadas antes de modificar a aventura; um backup válido é usado quando disponível. A ausência de campos opcionais em saves antigos não transfere estados da sessão atual.

No PC, feche o servidor e extraia o patch da Beta 4 sobre a pasta da Beta 3 que contém `INICIAR_PROJETO.bat`, substituindo os arquivos. Abra o inicializador. O projeto completo inclui as bibliotecas locais. Mantenha a mesma origem e porta do navegador para acessar seus saves.

O APK mantém o pacote `br.com.hinaria.rpg`, versão 1.3.0-beta.4, código 9. Tamanho, hash, certificado e testes constam em [qa/1.3.0-beta.4/results.json](qa/1.3.0-beta.4/results.json). Os testes de navegador não substituem a execução em celular físico.
