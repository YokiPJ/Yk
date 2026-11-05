/** Instância única do motor de missões + utilidades ligadas ao jogo (sem DOM). */
import { gameState } from '../core/gameState.js';
import { createQuestSystem } from './questSystem.js';
import { QUESTS, NPC_IDS } from './questData.js';

export const Q = createQuestSystem(QUESTS, {
  discovered: n => gameState.LM.some(l => l.n === n && l.f),
  level: () => gameState.P?.lv || 1,
});

/** Posições (mundo) dos alvos atuais — usado pelo minimapa e pelas marcas sobre os NPCs. */
export function questMarkers() {
  const out = [];
  for (const m of Q.markers()) {
    if (m.npc) { const e = gameState[NPC_IDS[m.npc]]; if (e) out.push({ x: e.x, z: e.z, k: m.k, npc: m.npc }); }
    else if (m.lm) { const l = gameState.LM.find(l => l.n === m.lm); if (l) out.push({ x: l.x, z: l.z, k: m.k }); }
  }
  return out;
}
