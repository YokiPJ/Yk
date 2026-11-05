# HINÁRIA 1.1.0 — Fronteira expandida + jingle de vitória

## O que mudou
- Mapa procedural: 64×64 → **96×96** blocos (2,25 vezes a área).
- A vila, as quests, o spawn do jogador, as duas arenas de boss e os locais antigos mantêm as coordenadas.
- Novos caminhos ao sul e leste, duas travessias adicionais no rio, seis marcos de exploração, acampamentos, ruínas e vegetação.
- Quatro grupos adicionais de inimigos existentes distribuídos na fronteira — sem novos chefes ou mudanças nas missões antigas.
- `assets/audio/victory.mp3` (arquivo fornecido pelo usuário) toca **uma vez** no começo das cenas de vitória do Troll Ancião e do Rei dos Orcs. Ao terminar, retorna à música ambiente. Boss themes permanecem em loop durante o combate.
- Preservado o conserto de câmera `getHeightAt` do último ZIP, o combate manual, os modelos 3D, as cutscenes e os saves.

## Testar
Abra `?cinema=1` e teste as duas cenas de vitória pelo menu 🎬 Cenas, após iniciar o jogo.
Explore ao sul (a partir da Floresta Densa) e a leste (a partir das Ruínas de Ardu).
No Android: `npm install`, `npm run android:add` (apenas na primeira vez), `npm run android:debug`.

## Limitações
- Renderização e trilha no navegador/Android não foram verificadas neste ambiente.
- O aumento de área e de inimigos pode aumentar o uso de memória/FPS; teste no seu aparelho.
- O novo terreno tem descobertas e inimigos, mas não acrescenta uma campanha de quests.
