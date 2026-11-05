# Verificação — ZERO Motion Studio 3D

## Cobertura

- 12 cenas reais em WebGL, renderizadas em 0%, 8%, 61% e 100% da linha do tempo.
- Capturas em 8% e 61% confirmam mudança visual em cada animação.
- Contagem de triângulos e malhas confirma geometria 3D em todas as cenas.
- Transformações com valores finitos.
- Troca de cenas com contagens estáveis de geometrias, texturas e buffers de instâncias da GPU.
- Pausa, busca temporal, velocidade, duração e repetição.
- Órbita por arraste, zoom por scroll e restauração da câmera.
- Rotação automática da câmera.
- Wireframe, sombras e níveis de qualidade.
- Filtros, busca sem acentos e estado sem resultados.
- Captura de PNG com imagem válida.
- Download e reabertura do HTML completo.
- Layout em 390×844, qualidade inicial econômica e movimento reduzido.
- Perda de contexto WebGL exibe mensagem de recuperação e interrompe a reprodução.
- Zero erros JavaScript e zero requisições externas.

## Ambiente de teste

Chromium headless, WebGL com SwiftShader e viewport desktop de 1440×1040. Three.js r160. Testes servidos somente em localhost, com solicitações externas bloqueadas.

A política do Chromium gerenciado bloqueia a navegação file:// neste ambiente; a abertura direta do arquivo não pôde ser verificada aqui. O HTML usa somente recursos embutidos.

## Limites

Firefox, Safari, GPUs físicas e aparelhos móveis reais não foram testados. O teste mobile usa viewport e recursos de toque emulados. SwiftShader é usado somente no teste; o HTML escolhe o contexto WebGL disponibilizado pelo navegador do usuário.

São demonstrações procedurais; não incluem animações importadas de personagens do jogo.
