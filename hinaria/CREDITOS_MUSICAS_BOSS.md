# HINÁRIA — música e chefes

## Incluído no ZIP
- `assets/audio/ambiente-v79.mp3`: trilha ambiente que já estava na base enviada. Repetição contínua enquanto explora.
- `assets/audio/boss-original-v79.mp3`: trilha de boss original da base enviada; toca em ambos os chefes como fallback.

Não alteramos direitos ou atribuições das trilhas que já estavam no projeto.

## Músicas externas encontradas (opcionais, não incluídas por padrão)
1. **Troll Ancião — Battle Theme**, de **Wolfgang_**, licença **CC0**, MP3.
   Fonte: https://lpc.opengameart.org/content/battle-theme-0
2. **Rei dos Orcs — Heavy Boss Battle 1**, de **MintoDog**, licença **CC0**, OGG (pronta para looping).
   Fonte: https://opengameart.org/content/heavy-boss-battle-1

CC0 permite usar no jogo sem obrigatoriedade de crédito; manter esta lista é recomendado.

### Instalação no Codespaces (com internet)
Dentro da pasta do jogo:

```bash
bash tools/instalar-musicas-boss-cc0.sh
npm run android:debug
```

O script baixa e verifica os dois áudios e habilita suas entradas no catálogo `src/audio/bossTrackConfig.js`. Caso o download falhe, a música padrão do projeto continua disponível. Sem executar o script, **nenhuma faixa externa será incluída no APK**.

A trilha começa após o primeiro clique ou toque, como exigido por navegadores/Android. Música ambiente e boss usam loop contínuo; a troca é feita com fade curto ao se aproximar/afastar de um chefe vivo. Não há streaming remoto obrigatório.
