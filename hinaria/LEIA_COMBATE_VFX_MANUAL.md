# HINÁRIA — VFX de combate (Claude Only)

Os efeitos V2 antigos (`skillVfx.js`, `hitVfx.js`, `vfxJsImpact.js`) foram removidos do runtime.
Agora somente o Claude VFX (`src/vfx/claudeVfx.js`, `src/vfx/claudeVfxBridge.js`) é acionado
por golpes, dano, críticos, habilidades, esquivas, subir de nível e Replay.

A lógica de dano, cooldowns, combo, SFX, setas reais e UI permanecem independentes.
A atmosfera leve do cenário continua disponível e é visualmente separada do combate.

As 20 habilidades estão mapeadas em `CLASS_SKILL_VFX` no bridge. Os 34 efeitos
continuam disponíveis na biblioteca do Claude, inclusive os não usados automaticamente.
