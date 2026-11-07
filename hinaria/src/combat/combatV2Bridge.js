/** Integração do modo opt-in com a HINÁRIA original.
 * Centraliza o combate sem duplicar a função dealDamage, cooldowns ou handlers.
 */
import { gameState } from '../core/gameState.js';
import { CLASSES, showFloatingText } from '../player/player.js';
import { equippedWeapon } from '../player/arsenal.js';
import { dealDamage, fireProjectile } from './combat.js';
import { say } from '../ui/hud.js';
import { playClaudeVfx } from '../vfx/claudeVfxBridge.js';
import { AttackAimController } from './attackAim.js';
import { applyAxeImpact } from './replayAxeSystem.js';
import { combatV2, isKnightCombatV2, setCombatV2Enabled, FEATURE_FLAGS } from './combatV2.js';

const active = () => isKnightCombatV2(gameState.P, equippedWeapon(gameState.P));
let previousClass = null;
let previousPlayer = null;
const attackAim = new AttackAimController();
let lastHUD = '';
let lastSwingSerial = 0;
const COMBAT_PREF_KEY = 'hinaria.v110.combat_v2_enabled';
const ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));

function syncCombatClass(P) {
  if (previousPlayer === P && previousClass === P.cls) return;
  combatV2.resetActions();
  freeDodge.active = false;
  attackAim.clear();
  previousPlayer = P;
  previousClass = P.cls;
}

function aimCombo(P) {
  return attackAim.begin(gameState, P, equippedWeapon(P).range + .25, combatV2.eventSerial);
}

/** Movement may continue while a swing faces its victim; dodge owns its direction. */
export function getAttackFacing() {
  const P = gameState.P;
  if (!P || P.hp <= 0 || (gameState.flow && gameState.flow !== 'PLAYING') ||
      gameState.ccOpen || gameState.arsenalOpen || gameState.dialogueOpen ||
      gameState.insideHouse || gameState.cutsceneActive || getDodgeMotion() ||
      !(active() ? combatV2.attacking : P.at > 0)) return null;
  return attackAim.facing(gameState, P);
}

export function requestCombatV2Attack() {
  const P = gameState.P;
  if (!P || (gameState.flow && gameState.flow !== 'PLAYING') || !active() || gameState.ccOpen || gameState.arsenalOpen || gameState.dialogueOpen || gameState.insideHouse || gameState.cutsceneActive) return false;
  syncCombatClass(P);
  if (freeDodge.active || P.hp <= 0 || (P.at > 0 && !combatV2.attacking && !combatV2.isDodging)) return false;
  const ok = combatV2.requestAttack();
  if (ok) {
    // A buffered input belongs to the next swing, not the current victim.
    aimCombo(P);
    P.path.length = 0;
    P.at = 1;
  }
  return ok;
}

/** Ataque por input, com direção automática em qualquer classe. V2 é do Cavaleiro.
 * NUNCA é chamado pelo loop automaticamente; somente pelo input do jogador.
 * Preserva fórmulas, cooldown antigo, projéteis e recompensas originais.
 */
export function requestManualAttack() {
  const P = gameState.P;
  if (!P || (gameState.flow && gameState.flow !== 'PLAYING') || gameState.ccOpen || gameState.arsenalOpen || gameState.dialogueOpen || gameState.insideHouse || gameState.cutsceneActive || P.hp <= 0) return false;
  syncCombatClass(P);
  if (active()) return requestCombatV2Attack();
  if (P.cd > 0 || P.at > 0 || freeDodge.active) return false;
  const weapon = equippedWeapon(P);
  const range = weapon?.range ?? 1;
  // Escolhe e encara o inimigo antes de animar/disparar. Não altera o alcance.
  const T = attackAim.begin(gameState, P, range);
  // An empty swing still animates and consumes its cooldown.
  if (!T) {
    P.cd = weapon?.kind==='sword' ? .76 : weapon?.kind==='bow' ? .86 : weapon?.kind==='axe' ? 1.03 : .94;
    P.at = 1;
    if(P.path) P.path.length=0;
    if(weapon.kind!=='bow') {
      const yaw=Number(P.mesh?.rotation?.y)||0;
      const fx=Math.sin(yaw),fz=Math.cos(yaw);
      playClaudeVfx(weapon.kind==='staff'?'magic_circle':P.cls==='yo'?'slash_fire':'slash',{x:P.x+fx*.82,y:gameState.getHeightAt(P.x+fx*.82,P.z+fz*.82)+(weapon.kind==='staff'?.12:.85),z:P.z+fz*.82,mesh:P.mesh},null,.48);
    }
    return true;
  }
  const dx = T.x - P.x, dz = T.z - P.z;
  P.cd = weapon?.kind==='sword' ? .76 : weapon?.kind==='bow' ? .86 : weapon?.kind==='axe' ? 1.03 : .94;
  P.at = 1;
  // Cajados criam projéteis VFX que seguem o inimigo; espadas/machados exibem o corte NA VÍTIMA.
  if(weapon.kind==='staff') playClaudeVfx(P.cls==='dr'?'ice_bolt':'arcane_bolt',{x:P.x,y:gameState.getHeightAt(P.x,P.z)+1.04,z:P.z,mesh:P.mesh},T,.55);
  else if(weapon.kind!=='bow') playClaudeVfx(P.cls==='yo'?'slash_fire':P.cls==='pa'?'slash_holy':'slash',{x:T.x,y:gameState.getHeightAt(T.x,T.z)+.82,z:T.z,mesh:P.mesh},{x:T.x+dx*.08,y:gameState.getHeightAt(T.x,T.z)+.82,z:T.z+dz*.08},.55);
  if (P.path) P.path.length = 0;
  const c = CLASSES[P.cls];
  const damage = Math.max(1,Math.round((ri(...c.dmg) + P.lv + P.bonus) * (P.b.rage > 0 ? 1.6 : 1)));
  if (weapon.kind==='bow' || weapon.kind==='staff') fireProjectile(P,T,weapon.color || c.pc || c.col, () => gameState.ents.includes(T) && T.hp > 0 && dealDamage(P,T,damage));
  else { dealDamage(P,T,damage); applyAxeImpact({P,target:T,weapon,now:gameState.t,baseDamage:damage,entities:gameState.ents,dealDamage,spawnEffect:(victim,_color,scale)=>playClaudeVfx(P.cls==='yo'?'explosion':P.cls==='dr'?'poison_cloud':P.cls==='pa'?'smite':P.cls==='so'?'magic_circle':'ground_slam',{x:victim.x,y:gameState.getHeightAt(victim.x,victim.z)+.12,z:victim.z},null,.48*Math.min(2,scale||1)),showFloatingText}); }
  return true;
}

// Lightweight manual dodge for non-Knight classes / optional combo disabled.
// Same facing-based direction, collision and invulnerability semantics as combo V2.
const freeDodge = {active:false,elapsed:0,cooldown:0,stamina:100,dir:{x:0,z:0}};
export function getDodgeMotion() {
  if(active() && combatV2.isDodging) return {dir:combatV2.dodgeDir,speed:combatV2.cfg.dodgeSpeed};
  if(freeDodge.active) return {dir:freeDodge.dir,speed:combatV2.cfg.dodgeSpeed};
  return null;
}
export function abortCombatDodgeOnCollision() {
  if(active() && combatV2.isDodging) combatV2.abortDodgeOnCollision();
  if(freeDodge.active) freeDodge.active=false;
}
export function isCombatDodgeActive() { return !!getDodgeMotion(); }
function tickFreeDodge(dt,P) {
  freeDodge.cooldown=Math.max(0,freeDodge.cooldown-dt);
  if(freeDodge.active) {
    freeDodge.elapsed+=dt;
    if(freeDodge.elapsed>=combatV2.cfg.dodgeDuration) freeDodge.active=false;
  }else freeDodge.stamina=Math.min(100,freeDodge.stamina+combatV2.cfg.staminaRegen*dt);
  if(!active()){
    P.combatV2Dodge=freeDodge.active;
    P.combatV2DodgeProgress=freeDodge.active?freeDodge.elapsed/combatV2.cfg.dodgeDuration:0;
  }
}

export function requestCombatV2Dodge() {
  const P = gameState.P;
  if (!P || (gameState.flow && gameState.flow !== 'PLAYING') || gameState.ccOpen || gameState.arsenalOpen || gameState.dialogueOpen || gameState.insideHouse || gameState.cutsceneActive || P.hp<=0) return false;
  syncCombatClass(P);
  if (P.at > 0 && !combatV2.attacking) return false;
  let mx = (+Boolean(gameState.keys.d || gameState.keys.ArrowRight) - +Boolean(gameState.keys.a || gameState.keys.ArrowLeft)) + (gameState.jx || 0);
  let mz = (+Boolean(gameState.keys.s || gameState.keys.ArrowDown) - +Boolean(gameState.keys.w || gameState.keys.ArrowUp)) + (gameState.jz || 0);
  const yaw = gameState.yaw;
  let x = mx * Math.cos(yaw) + mz * Math.sin(yaw);
  let z = -mx * Math.sin(yaw) + mz * Math.cos(yaw);
  if (Math.hypot(x, z) < .1) { x = -Math.sin(P.mesh.rotation.y); z = -Math.cos(P.mesh.rotation.y); }
  const useCombo=active();
  let ok=false;
  if(useCombo) ok=combatV2.requestDodge(x,z);
  else if(!freeDodge.active && freeDodge.cooldown<=0 && freeDodge.stamina>=combatV2.cfg.dodgeCost && P.at<=0) {
    const len=Math.hypot(x,z);
    freeDodge.dir={x:x/len,z:z/len};freeDodge.elapsed=0;freeDodge.active=true;
    freeDodge.cooldown=combatV2.cfg.dodgeCooldown;
    freeDodge.stamina-=combatV2.cfg.dodgeCost;
    ok=true;
  }
  if (ok) {
    attackAim.clear();
    if(P.path)P.path.length=0;
    P.vx = P.vz = 0;
    const dir=useCombo?combatV2.dodgeDir:freeDodge.dir;
    P.mesh.rotation.y = Math.atan2(dir.x, dir.z);
    P.at = 0;
    showFloatingText(P, 'ESQUIVA', '#8feaff');
  }
  return ok;
}

export function tickCombatV2(dt) {
  const P = gameState.P;
  if (!P) { attackAim.clear(); return; }
  syncCombatClass(P);
  tickFreeDodge(dt,P);
  if ((gameState.flow && gameState.flow !== 'PLAYING') || gameState.ccOpen || gameState.arsenalOpen || gameState.dialogueOpen || gameState.insideHouse || gameState.cutsceneActive || P.hp <= 0) {
    combatV2.resetActions(); attackAim.clear(); updateCombatV2HUD(); return;
  }
  if (!active()) { if (combatV2.state !== 'idle') combatV2.resetActions(); if (P.at <= 0) attackAim.clear(); P.combatV2Stage = undefined; updateCombatV2HUD(); return; }
  if (combatV2.attacking) aimCombo(P);
  combatV2.tick(dt, (step, index) => {
    // Um único impacto por golpe. A função de dano original ainda resolve
    // críticos, guarda, morte, XP, drops, recompensas e objetivos.
    const T = attackAim.resolveImpact(gameState, P);
    if (!T) return;
    // VFX do combo no local atingido, não acima da cabeça do jogador.
    playClaudeVfx(index===2?'slash_triple':index===1?'slash_cross':'slash',{x:T.x,y:gameState.getHeightAt(T.x,T.z)+.8,z:T.z,mesh:P.mesh},{x:T.x+(T.x-P.x)*.08,y:gameState.getHeightAt(T.x,T.z)+.8,z:T.z+(T.z-P.z)*.08},.56);
    const c = CLASSES[P.cls];
    const base = ri(...c.dmg) + P.lv + P.bonus;
    const damage = Math.max(1, Math.round(base * step.multiplier * (P.b.rage > 0 ? 1.6 : 1)));
    dealDamage(P, T, damage);
    if (index === 2) showFloatingText(T, 'COMBO 3!', '#ffd76b');
  });
  // tick() can start a queued combo step; it acquires a fresh victim once.
  if (combatV2.attacking) aimCombo(P);
  else attackAim.clear();
  if (combatV2.attacking && combatV2.eventSerial !== lastSwingSerial) {
    lastSwingSerial = combatV2.eventSerial;
    // Evita duplicar VFX: com alvo o corte será disparado pelo evento de impacto.
    if(!attackAim.current(gameState,P)){
      const yaw=Number(P.mesh?.rotation?.y)||0,fx=Math.sin(yaw),fz=Math.cos(yaw);
      playClaudeVfx(combatV2.stepIndex===2?'slash_triple':combatV2.stepIndex===1?'slash_cross':'slash',{x:P.x+fx*.85,y:gameState.getHeightAt(P.x+fx*.85,P.z+fz*.85)+.8,z:P.z+fz*.85,mesh:P.mesh},null,.52);
    }
  }
  P.combatV2Dodge = combatV2.isDodging;
  P.combatV2DodgeProgress = combatV2.isDodging ? combatV2.elapsed / combatV2.cfg.dodgeDuration : 0;
  P.combatV2Stage = combatV2.attacking ? combatV2.stepIndex : undefined;
  if (combatV2.attacking) {
    // Animator existente usa entity.at normalizado; não cria outro loop.
    P.at = Math.max(.015, 1 - combatV2.elapsed / combatV2.step.duration);
  }
  updateCombatV2HUD();
}

export function shouldUseCombatV2() { return active(); }
export function isCombatV2Invulnerable(attacker=null) {
  if(!active())return freeDodge.active && freeDodge.elapsed>=combatV2.cfg.dodgeIFrameStart && freeDodge.elapsed<=combatV2.cfg.dodgeIFrameEnd;
  if(combatV2.invulnerable)return true;
  const P=gameState.P,read=P?.replayRead;
  if(!combatV2.isDodging || !read || !attacker || read.enemyKind!==attacker.k ||
     !(read.expires>gameState.t))return false;
  const cfg=combatV2.cfg;
  const extra=(cfg.dodgeIFrameEnd-cfg.dodgeIFrameStart)*.20;
  return combatV2.elapsed>=cfg.dodgeIFrameStart && combatV2.elapsed<=cfg.dodgeIFrameEnd+extra;
}
export function cancelCombatV2() {
  const wasAttacking = combatV2.attacking;
  attackAim.clear();
  freeDodge.active=false;
  if (combatV2.state !== 'idle') combatV2.resetActions();
  if (gameState.P) {
    gameState.P.combatV2Dodge = false;
    gameState.P.combatV2Stage = undefined;
    if (wasAttacking) gameState.P.at = 0;
  }
  updateCombatV2HUD();
}

export function initCombatV2Preference() {
  // Primeiro acesso: Combate 2.0 ligado no Cavaleiro; escolhas posteriores são respeitadas.
  try {
    const saved = localStorage.getItem(COMBAT_PREF_KEY);
    if (saved !== null) setCombatV2Enabled(saved === 'true');
  } catch { /* localStorage pode estar bloqueado */ }
  lastHUD = '';
  updateCombatV2HUD();
}

export function toggleCombatV2() {
  const flag = setCombatV2Enabled(!FEATURE_FLAGS.ENABLE_COMBAT_V2);
  try { localStorage.setItem(COMBAT_PREF_KEY, String(flag)); } catch { /* opcional */ }
  lastHUD = '';
  say(flag ? 'Combo do Cavaleiro ligado: J para golpear e K para esquivar.' : 'Combo desligado; o ataque continua manual (J).', 'sys');
  updateCombatV2HUD();
  return flag;
}

export function updateCombatV2HUD() {
  if (typeof document === 'undefined') return;
  const enabled = active();
  const panel = document.getElementById('combat-v2-actions');
  if (!panel) return;
  const visible = !!gameState.P && !gameState.ccOpen && !gameState.arsenalOpen && !gameState.dialogueOpen && !gameState.cutsceneActive && !gameState.insideHouse;
  panel.hidden = !visible;
  const axeButton=document.getElementById('replay-axe-awaken');
  if(axeButton && gameState.P){const P=gameState.P,w=equippedWeapon(P);
    axeButton.hidden=w.kind!=='axe';
    if(w.kind==='axe'){const remaining=Math.max(0,(P.axeAwakeUntil||0)-(gameState.t||0));const cool=Math.max(0,(P.axeAwakeCooldown||0)-(gameState.t||0));
      axeButton.dataset.awake=String(remaining>0);
      axeButton.textContent=remaining>0?`🔥 Desperto ${Math.ceil(remaining)}s`:cool>0?`🪓 Recarga ${Math.ceil(cool)}s`:'🔥 Despertar · R';
      axeButton.disabled=remaining>0 || cool>0;
    }
  }
  document.body.classList.toggle('combat-v2-active', visible);
  const on = FEATURE_FLAGS.ENABLE_COMBAT_V2;
  const toggle = document.getElementById('combat-v2-toggle');
  if (toggle) toggle.textContent = `Combo do Cavaleiro: ${on ? 'LIGADO' : 'DESLIGADO'}`;
  const quick = document.getElementById('combat-v2-quick-toggle');
  if (quick) {
    quick.textContent = `⚔ Combo Cavaleiro: ${on ? 'LIGADO' : 'DESLIGADO'}`;
    quick.dataset.enabled = String(on);
    quick.setAttribute('aria-pressed', String(on));
  }
  const hint = document.getElementById('combat-v2-hint');
  if (hint) hint.textContent = enabled ? 'Alvo automático · Combo (J)' : 'Alvo automático · J/Espaço';
  if (!visible) return;
  const attack = document.getElementById('combat-v2-attack');
  if (attack) { attack.hidden = false; attack.textContent = enabled ? '⚔ Golpe' : '⚔ Atacar'; attack.setAttribute('aria-label','Atacar com alvo automático, tecla J ou Espaço'); }
  const dodgeButton = document.getElementById('combat-v2-dodge');
  if (dodgeButton) dodgeButton.hidden = false;
  const staminaUI = document.getElementById('combat-v2-stamina-wrap');
  if (staminaUI) staminaUI.hidden = false;
  const state = enabled ? combatV2.state : (freeDodge.active?'dodge':'idle');
  const step = enabled && combatV2.stepIndex >= 0 && combatV2.attacking ? `Golpe ${combatV2.stepIndex + 1}/3` : 'Pronto';
  const amount = Math.round(enabled ? combatV2.stamina : freeDodge.stamina);
  const cooldown = enabled ? combatV2.dodgeCooldown : freeDodge.cooldown;
  const key = `${amount}|${state}|${step}|${cooldown.toFixed(1)}|${enabled}`;
  if (key === lastHUD) return;
  lastHUD = key;
  const bar = document.getElementById('combat-v2-stamina');
  const label = document.getElementById('combat-v2-label');
  const dodge = document.getElementById('combat-v2-dodge');
  if (bar) bar.style.width = `${Math.max(0, amount)}%`;
  if (label) label.textContent = `${step} · STA ${amount}/100`;
  if (dodge) {
    dodge.disabled = cooldown > 0 || amount < combatV2.cfg.dodgeCost || state==='dodge';
    dodge.setAttribute('aria-label', `Esquiva, stamina ${amount}, recarga ${cooldown.toFixed(1)} s`);
  }
}
