/** Runtime adapter for replay-axe combat rules. The logic is tested separately. */
import { gameState } from '../core/gameState.js';
import { equippedWeapon } from '../player/arsenal.js';
import { showFloatingText } from '../player/player.js';
import { playClaudeVfx } from '../vfx/claudeVfxBridge.js';
import { say, updateHUD } from '../ui/hud.js';
import { syncReplayAxeVisual } from '../player/replayAxeModel.js';
import { AXE_POWERS, awakenAxe } from './replayAxeRules.js';
export { AXE_POWERS, AXE_DURATION, AXE_COOLDOWN, AXE_PROC_INTERVAL, axeManaCost, awakenAxe, applyAxeImpact } from './replayAxeRules.js';
export function requestAxeAwakening(){
  const P=gameState.P;
  if(!P||gameState.ccOpen||gameState.arsenalOpen||gameState.dialogueOpen||gameState.cutsceneActive||gameState.insideHouse)return false;
  const now=gameState.t||0,weapon=equippedWeapon(P);
  const r=awakenAxe(P,weapon,now);
  if(!r.ok){if(r.reason==='mana')say(`Precisa de ${r.mana} de mana para despertar o machado.`, 'sys');return false;}
  playClaudeVfx(P.cls==='yo'?'slash_fire':P.cls==='pa'?'aura':P.cls==='so'?'magic_circle':P.cls==='dr'?'aura':'shield',{x:P.x,y:gameState.getHeightAt(P.x,P.z)+.15,z:P.z,mesh:P.mesh},null,.75);
  showFloatingText(P,'DESPERTAR!','#ffdfab');
  say(`O Machado do Replay despertou: <b>${r.power}</b>! Custou ${r.mana} de mana.`, 'npc');
  syncReplayAxeVisual(P,now);updateHUD();return true;
}
export function tickReplayAxe(P,now){if(P)syncReplayAxeVisual(P,now);}
