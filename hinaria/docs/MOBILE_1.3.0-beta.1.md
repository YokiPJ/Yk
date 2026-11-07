# HINÁRIA 1.3.0 Beta 1 · Mobile e geração do mundo

## Inicialização Android

O pacote mobile gera um único `game.js` local no formato IIFE, compilado com alvo de sintaxe Chrome 80. O APK inicia sem depender de import maps. A configuração Android exige WebView 80 ou superior e usa uma página local de orientação quando o componente é antigo. WebGL disponível continua sendo necessário; o alvo de compilação não equivale a execução em todas as versões de WebView.

A construção do mundo cede tempo ao navegador entre etapas. O título mostra o progresso e habilita suas ações após preparar os shaders visíveis da vila. Falhas de arquivos, sintaxe, renderer, shaders ou contexto durante a preparação mostram uma mensagem e Recarregar. No mobile, a capa usa a arte CSS existente e mantém um único renderer WebGL de jogo.

## Iluminação e materiais

As decorações do mundo usam um conjunto fixo de duas luzes no perfil econômico ou três nos demais perfis mobile. As fontes mais próximas ocupam esses slots sem mudar sua quantidade durante a caminhada; slots sem uma fonte próxima têm intensidade zero. O brilho emissivo das lanternas permanece. Luzes de personagens e interiores continuam sob controle de suas cenas.

Decorações opacas marcadas como cenário usam Lambert nos perfis leves. A qualidade alta restaura os materiais originais e carrega os mapas de normais sob demanda. Transparências e materiais alterados por callbacks de animação mantêm sua identidade, preservando a água, a fonte e as lanternas. A fusão estática conserva geometria indexada e reutiliza geometrias dos prefabs; equipamentos e partes móveis continuam independentes.

Os meshes rígidos dos ratos usam o descarte por frustum do Three.js. As peças fora da câmera deixam de ser submetidas à renderização; juntas, silhueta e animações permanecem no modelo.

## Perfil mobile e pacote

O alvo automático é 30 FPS em todo mobile; a preferência manual de 30/60 permanece nas configurações. O drawing buffer tem orçamento de até 400.000 pixels no perfil econômico ou 600.000 nos demais perfis mobile, recalculado após redimensionar e girar a tela. O perfil usa os dados de toque, memória e CPUs lógicas disponíveis no navegador. O alvo de apresentação não garante a taxa atingida pelo aparelho.

As duas músicas de chefes têm variantes Android em 96 kbps, 44,1 kHz e estéreo. A geração verifica duração e hashes; os originais completos e seus créditos permanecem em `assets/audio/`. O APK contém somente o jogo. Studio, capturas e JAR ficam no projeto completo.

O arquivo desta beta é `HINARIA_1.3.0_BETA1_DEBUG.apk`, pacote `br.com.hinaria.rpg`, versão 1.3.0-beta.1, código 6. Consulte `SHA256SUMS.txt` e `MOBILE_TEST_RESULTS.json` anexados à release para os valores finais de tamanho, integridade e assinatura. Uma atualização que conserva a mesma assinatura mantém os dados do aplicativo; compilar em outra máquina pode usar outro certificado debug.

## Geração procedural e Parte II

A geração lógica usa semente reinicializada e limpa as coleções antes de construir outro mapa. A semente padrão é 11. Semente normalizada, versão do gerador e diagnóstico das correções ficam disponíveis no estado do jogo; saves novos também registram a identidade do gerador.

As rotas de acesso às portas são protegidas contra o espalhamento de vegetação. Trechos de fronteira abertos pela navegação mantêm coerência entre colisão e objetos visuais. Reparos de acesso removem vegetação procedural necessária, preservando construções, água e proteções das pontes. Um mundo com meshes ativos não pode ser regenerado por cima da cena; é necessário recarregar.

A Parte II ocupa o Vale do Eco na fronteira sul do mapa 96×96. Seus dois Vigias e a Sentinela surgem conforme a necessidade das missões, sem adicionar esses encontros à vila durante o início da campanha. As três missões usam os sistemas existentes de diálogos, exploração, combate e recompensas. Consulte o [roteiro de acesso](BETA_PARTE_II.md).

## Saves e evidências

Saves anteriores continuam aceitos sem os novos campos de geração. O intervalo restante do poder do machado é ancorado no tempo restaurado da aventura; a leitura temporária dos padrões de inimigos é limpa ao iniciar ou carregar outra sessão. A Parte II mantém seus objetivos, encontros e chefe no save completo.

Os resultados consolidados da build beta ficam em [`qa/1.3.0-beta.1/results.json`](qa/1.3.0-beta.1/results.json), com os relatórios correspondentes de navegador, geração e APK. As contagens aprovadas e hashes devem ser lidos nesses arquivos da build final.

Não houve execução em telefone Android físico neste ambiente. Os relatos de falha no GMax 2 com Android 11 e de aproximadamente 14 FPS no Note 12 motivaram a revisão; não são benchmarks executados aqui. Chromium atual, SwiftShader e toque emulado não confirmam FPS para esses aparelhos.

## Resultado da build final

O APK final tem 14.924.470 bytes, 29,38% menor que a distribuição 1.2.2. Na fixture da vila, as chamadas de renderização passaram de 670 para 354 e as luzes pontuais visíveis de 29 para 3. Floresta e ruínas também foram verificadas. Veja a [tabela e os relatórios completos](qa/1.3.0-beta.1/README.md).

Os menus recebem compatibilidade para a ausência de `replaceChildren`; os overlays têm posições físicas antes de `inset`. Os testes ignoram essas APIs e o atalho CSS para exercitar os caminhos antigos no Chromium atual.
