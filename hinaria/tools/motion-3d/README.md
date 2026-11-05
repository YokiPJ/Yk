# ZERO · Motion Studio 3D

Laboratório independente com 12 animações 3D reais. Nenhum arquivo ou recurso do jogo HINÁRIA é modificado ou carregado.

## Abrir e testar

Abra ZERO_MOTION_STUDIO_3D.html no navegador. Three.js r160, OrbitControls, modelos e animações estão embutidos no arquivo. Não precisa de instalação, CDN, internet, modelos externos ou texturas.

Se o navegador bloquear arquivos locais, execute na pasta do HTML:

    python3 -m http.server 8080 --bind 127.0.0.1

Abra http://127.0.0.1:8080/ZERO_MOTION_STUDIO_3D.html.

## Cenas

1. Vilarejo flutuante com moinho e nuvens.
2. Caminhada de robô articulado.
3. Portal dimensional com anéis e partículas.
4. Floresta com vento e folhas.
5. Corrida de robô articulado.
6. Fogueira, luz dinâmica e brasas.
7. Salto com antecipação e aterrissagem.
8. Escudo geodésico.
9. Golpe de espada com arco de energia.
10. Explosão de fragmentos.
11. Escultura orbital.
12. Montagem mecânica em vista explodida.

## Controles

- Mouse: arraste para orbitar; scroll para zoom.
- Touch: arraste com um dedo para orbitar; pinça com dois dedos para zoom.
- Câmera inicial: restaura o enquadramento e interrompe a rotação automática.
- Reproduzir, pausar, repetir, reiniciar e arrastar a linha do tempo.
- Ajustes de duração e velocidade.
- Espaço: reproduz ou pausa. Setas esquerda/direita: deslocam 5% da linha do tempo, fora dos campos de entrada.
- Girar câmera: rotação automática durante a reprodução.
- Ver geometria: alterna os materiais para wireframe.
- Sombras: habilita ou desabilita sombras.
- Qualidade: controla densidade de pixels e resolução das sombras.
- Capturar PNG: exporta a cena 3D atual, com fundo transparente.
- Baixar HTML: salva uma cópia completa do laboratório.

A preferência do sistema por movimento reduzido inicia a reprodução pausada. A aba suspende a atualização visual em segundo plano.

## Código e build

- src/app.js: modelos procedurais, animações, câmera e interface.
- src/index.template.html: layout e estilos.
- vendor/: Three.js r160, OrbitControls e licença MIT.
- build.py: empacotamento em um único HTML, sem dependências Python externas.

Para reconstruir:

    python3 build.py

O build converte os exports locais da biblioteca em um namespace encapsulado e embute os três scripts. Não consulta a rede nem altera os arquivos originais do jogo.

## Verificar manualmente

Pause uma cena, arraste a linha do tempo e confira as poses. Gire a câmera para observar a profundidade. Alterne entre as 12 cenas, teste wireframe e sombras, salve um PNG e baixe outra cópia do HTML.

O relatório automatizado está em verification/report.json; o resumo de resultados está em VERIFY.md.

## Diagnóstico

Se aparecer o aviso de WebGL indisponível, ative a aceleração gráfica do navegador ou tente outro navegador atualizado. A página preserva a opção de baixar o HTML e oferece uma ação para tentar novamente.

Se a renderização estiver lenta, selecione Qualidade → Economia e desative Sombras.

## Licença e origem

Modelos, animações e interface são estudos procedurais próprios. Three.js e OrbitControls são redistribuídos sob a licença MIT, incluída em vendor/THREE-LICENSE.txt e no HTML.

Workflow orientado pela skill zero-web-motion-studio:threejs-webgl do plugin ZERO Web Motion Studio.
