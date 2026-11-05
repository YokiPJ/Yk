# HINÁRIA — UI OVERHAUL V1

- HUD compacta com vida, mana, nível, ouro e objetivo resumido.
- Menu único ☰ / M abre Arsenal, Visual, Missões, Crônicas, Configurações e Mensagens reutilizando os botões e handlers originais.
- Atalho J continua ataque; não abre diário.
- Habilidades s0–s2 visíveis; Replay/s4 aparecem por + Extras.
- Ataque e esquiva preservados; stamina e cooldown preservados.
- Minimapa em tamanho compacto, com inimigos comuns mostrados apenas a curta distância (7 blocos).
- Novo CSS e JS sem dependências NPM adicionais.
- Função opcional `window.HINARIA_UI_V1.open()` no console.
- Não altera saves, combate, modelos, mapa nem missões.

Para testar: npm run test:qa; npm run build:web; npm run android:debug (apenas no ambiente com Android SDK e dependências instaladas).

Limite: checagem estática não equivale a visualização real no navegador ou teste no Android.
