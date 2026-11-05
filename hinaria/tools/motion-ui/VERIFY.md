# Verificação — ZERO Motion Studio

## Resultado

32/32 demonstrações verificadas no Chromium 155.0.8059.79 headless, com viewport de desktop de 1440×1040. Layout mobile verificado em 390×844.

- Cada demonstração foi renderizada em 0%, 8%, 61% e 100% do ciclo.
- A comparação de capturas em 8% e 61% confirmou mudança visual em todas as 32 cenas.
- Nenhum atributo de geometria continha NaN, Infinity ou referências indefinidas.
- Pausa congelou a imagem; arrastar a linha do tempo atualizou o quadro.
- Repetição, fim sem repetição, duração, velocidade e reinício passaram.
- Filtros, pesquisa sem acentos e estado sem resultados passaram.
- Atalhos de teclado não interferiram na edição do campo de busca.
- O botão de download gerou outro HTML completo, reaberto com as 32 demonstrações.
- A preferência por movimento reduzido iniciou o laboratório pausado.
- Layout mobile sem rolagem horizontal da página.
- Zero erros JavaScript e zero requisições externas.

Os testes usaram HTTP em localhost, com bloqueio das requisições externas no navegador de teste. A política do Chromium gerenciado deste ambiente bloqueia navegação file://; essa modalidade não pôde ser validada aqui. O HTML usa somente recursos embutidos, sem imports, fetch, arquivos vizinhos ou CDN.

## Executar localmente

Abra ZERO_MOTION_STUDIO.html em um navegador atualizado. Se o navegador corporativo bloquear arquivos locais, execute na pasta do arquivo:

    python3 -m http.server 8080 --bind 127.0.0.1

Depois abra http://127.0.0.1:8080/ZERO_MOTION_STUDIO.html.

## Limites

Validação automatizada executada somente no Chromium. Firefox, Safari e aparelhos físicos não foram testados. As cenas são estudos vetoriais próprios, sem integração ao jogo.
