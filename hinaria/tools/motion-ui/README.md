# ZERO Motion Studio

Laboratório independente de animações. Não modifica nem carrega o jogo HINÁRIA.

## Executar

Abra `ZERO_MOTION_STUDIO.html` no Chrome, Edge, Firefox ou Safari atualizado. Não requer instalação, servidor ou internet.

Opcional, para servir em uma rede local:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Abra `http://127.0.0.1:8080/ZERO_MOTION_STUDIO.html`.

## Controles

- Selecione uma das 32 animações ou filtre por categoria e busca.
- Reproduza, pause, reinicie e arraste a linha do tempo.
- Ajuste duração, velocidade e repetição.
- Use Espaço para pausar e ←/→ para avançar ou voltar 5% (fora dos campos de entrada).
- Use “Baixar HTML” para salvar uma cópia completa do laboratório.
- A preferência do sistema por movimento reduzido inicia o laboratório pausado.

Todos os desenhos são vetoriais originais em SVG/HTML/CSS. As animações usam uma linha do tempo JavaScript compartilhada, permitindo pausa e busca em qualquer quadro. Não há bibliotecas, fontes, rastreadores, solicitações externas ou dependências de build. Uma aba em segundo plano suspende a atualização visual.

## Estrutura

- `ZERO_MOTION_STUDIO.html`: interface, estilos, desenhos e motor em um único arquivo.
- `README.md`: instruções.
- `VERIFY.md`: resultados da verificação no navegador.

As cenas de personagem são estudos de movimento com um robô estilizado; os cenários são ilustrações próprias para demonstrar técnicas. Não são capturas nem alterações do jogo.
