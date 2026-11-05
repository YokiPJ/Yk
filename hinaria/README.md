# HINÁRIA · jogo e ferramentas

Versão 1.2.2 mobile, Three.js r160, PixiJS 8.6.6 no desktop, Canvas2D para o HUD touch e Capacitor 7 no Android.

O [README principal](../README.md) contém estrutura, instalação, build e publicação. As [otimizações mobile](docs/MOBILE_1.2.2.md) têm medições e limitações.

Nesta pasta:

```bash
npm ci
npm start                  # jogo em http://localhost:8080/
npm run studio             # entrada em http://localhost:8080/studio/
npm run build:web          # pacote web completo
npm run build:mobile       # somente jogo offline
npm run serve:offline      # serve o último pacote www gerado
npm run verify
npm run android:debug
```

O modo offline precisa de `www/` gerado e não depende de CDN. Não abra o jogo por `file://`; os módulos usam HTTP. Saves pertencem à origem do navegador: trocar domínio/porta ou limpar os dados muda o armazenamento utilizado.

## Controles

- WASD/setas: mover. Q/E: girar câmera. Roda/pinça: zoom.
- J/Espaço: ataque manual frontal. K: esquiva. 1–3: habilidades; 4: Replay; 5: habilidade adicional do Arsenal.
- R: despertar do machado equipado. F: conversar/interagir. B: Arsenal. L: Crônicas.
- M/Escape ou ☰: menu e pausa. A pausa interrompe IA, projéteis, recargas e movimento.
- Touch: analógico à esquerda e ações à direita; movimento e ataque aceitam dois dedos simultâneos.
- F3 ou Configurações → Diagnóstico: métricas reais, exportação JSON e estado gráfico.

Novo Jogo permite escolher uma das cinco classes. Salvar e Continuar preservam a aventura completa. As configurações mantêm a chave existente e adicionam a preferência de 30/60 FPS sem apagar saves.

Os laboratórios executam em páginas independentes; o jogo mantém seu animador e os encaixes corrigidos da versão 1.2.1. O gerador Java conserva seu snapshot histórico para reproduzir os clipes anteriores.

Veja o [índice da documentação](docs/README.md) e os [créditos das músicas](CREDITOS_MUSICAS_BOSS.md).
