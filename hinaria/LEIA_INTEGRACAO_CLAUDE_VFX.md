# HINÁRIA — VFX do Claude como sistema único de combate

O jogo mantém os 34 efeitos da biblioteca original `HINARIA_VFX.zip` em
`src/vfx/claudeVfx.js`. O bridge `src/vfx/claudeVfxBridge.js` mapeia 20 habilidades
existentes de Cavaleiro, Paladino (arco), Feiticeiro, Druida e Yoki sem alterar
regras de dano, mana, colisão, cooldowns ou missões.

Foram removidos do código de execução `src/vfx/skillVfx.js`, `src/vfx/hitVfx.js`,
`src/vfx/vfxJsImpact.js` e o anel procedural de `spawnEffect`.
Não há mais dois sistemas gerando flashes para o mesmo golpe.

Eventos: ataques manuais/cavaleiro V2, acerto/crítico, habilidades aceitas, esquiva,
subida de nível, Replay, despertar do machado e proc do machado.
Projéteis de arco continuam como setas reais; bolas provisórias de mago/druida
ficam invisíveis e servem só como portadoras do timing de dano, sendo o
projétil visual desenhado pelo Claude.

O sistema de atmosfera do mundo não foi removido, pois não é efeito de combate.
Os 16 WAVs e efeitos sonoros continuam. O shader adicional no HUD e sua
dependência `@vfx-js/core` foram removidos também do processo de build Android.

Teste automatizado: `npm run test:qa` (não requer navegador).
Teste de renderização real, GPU, performance mobile e APK continuam pendentes.
