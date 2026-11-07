# HINÁRIA · jogo e ferramentas

Versão 1.3.0-beta.1, Three.js r160, PixiJS 8.6.6 no desktop, Canvas2D para o HUD touch e Capacitor 7 no Android.

O [README principal](../README.md) contém estrutura, instalação, build e publicação. As [otimizações mobile](docs/MOBILE_1.3.0-beta.1.md) têm medições e limitações. O APK beta limita a iluminação da vila, simplifica materiais do cenário e inicia sem exigir import maps no WebView.

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

O modo offline precisa de `www/` gerado e não depende de CDN. O build mobile gera `game.js` como script único com alvo de sintaxe Chrome 80; a web completa mantém módulos ES. Sirva ambos por HTTP, sem abrir por `file://`. Saves pertencem à origem do navegador: trocar domínio/porta ou limpar os dados muda o armazenamento utilizado.

## Parte II

Depois de concluir **A Coroa dos Quebra-Presas** e entregar a missão a Bram, fale com Yoki para iniciar **O Eco sob as Cinzas**. A nova sequência inclui três missões, dois Vigias do Eco e a Sentinela do Eco (Nv. 22). O acesso usa a campanha existente; não substitui o começo de Vilarrubra. Veja [BETA_PARTE_II.md](docs/BETA_PARTE_II.md).

A geração padrão usa a semente 11 e registra semente/versão no diagnóstico e no save. A construção lógica reinicia os dados, protege entradas e corrige a coerência entre vegetação e colisão. Não chame a geração sobre uma cena com meshes ativos; recarregue o mundo.

## Controles

- WASD/setas: mover. Q/E: girar câmera. Roda/pinça: zoom.
- J/Espaço: ataque manual frontal. K: esquiva. 1–3: habilidades; 4: Replay; 5: habilidade adicional do Arsenal.
- R: despertar do machado equipado. F: conversar/interagir. B: Arsenal. L: Crônicas.
- M/Escape ou ☰: menu e pausa. A pausa interrompe IA, projéteis, recargas e movimento.
- Touch: analógico à esquerda e ações à direita; movimento e ataque aceitam dois dedos simultâneos.
- F3 ou Configurações → Diagnóstico: métricas reais, exportação JSON e estado gráfico.

Novo Jogo permite escolher uma das cinco classes. Salvar e Continuar preservam a aventura completa, incluindo o intervalo restante do poder do machado; saves antigos continuam válidos. O perfil automático mobile usa alvo de 30 FPS e mantém a preferência manual de 30/60 FPS sem apagar saves.

O Android requer WebView 80 ou superior e WebGL disponível. A inicialização oferece progresso e Recarregar em caso de erro; componentes antigos recebem uma página de orientação para atualizar WebView/Chrome. O pacote Android usa versão 1.3.0-beta.1, código 6. Consulte `SHA256SUMS.txt` e `MOBILE_TEST_RESULTS.json` da release para tamanho, hash e verificação da assinatura do APK final.

`mobile-assets/audio/` contém as variantes Android das duas músicas de chefes. Os originais continuam em `assets/audio/`; o build confere os hashes antes de substituir as cópias em `www/`. Para gerar novas variantes, instale FFmpeg/FFprobe e execute `python3 tools/prepare-mobile-audio.py`.

Os laboratórios executam em páginas independentes; o jogo mantém seu animador e os encaixes corrigidos da versão 1.2.1. O gerador Java conserva seu snapshot histórico para reproduzir os clipes anteriores.

Veja o [índice da documentação](docs/README.md) e os [créditos das músicas](CREDITOS_MUSICAS_BOSS.md).
