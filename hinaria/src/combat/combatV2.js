/** HINÁRIA 1.1.0 — Fase 1. Controlador determinístico, sem DOM/Three.js.
 * Opt-in; o sistema original de dano, habilidades e animação continua soberano.
 */
export const FEATURE_FLAGS = {
  ENABLE_COMBAT_V2: true,
  ENABLE_ENEMY_AI_V2: false,
  ENABLE_WORLD_EVENTS_V1: false,
  ENABLE_SKILL_PROGRESSION_V2: false,
};

export const COMBAT_V2_CONFIG = Object.freeze({
  steps: Object.freeze([
    Object.freeze({ duration: .35, impactStart: .14, impactEnd: .22, multiplier: 1, label: 'Corte rápido' }),
    Object.freeze({ duration: .42, impactStart: .17, impactEnd: .27, multiplier: 1.15, label: 'Corte lateral' }),
    Object.freeze({ duration: .60, impactStart: .25, impactEnd: .39, multiplier: 1.55, label: 'Finalizador' }),
  ]),
  inputBuffer: .25,
  comboReset: .90,
  staminaMax: 100,
  staminaRegen: 17,
  dodgeCost: 28,
  dodgeDuration: .40,
  dodgeCooldown: .95,
  dodgeSpeed: 5.7,
  dodgeIFrameStart: .075,
  dodgeIFrameEnd: .265,
});

export function isKnightCombatV2(P, weapon) {
  return FEATURE_FLAGS.ENABLE_COMBAT_V2 && P?.cls === 'kn' && weapon?.kind === 'sword';
}

export class CombatV2Controller {
  constructor(config = COMBAT_V2_CONFIG) {
    this.cfg = config;
    this.stamina = config.staminaMax;
    this.dodgeCooldown = 0;
    this.resetActions();
  }
  resetActions() {
    this.state = 'idle';
    this.stepIndex = -1;
    this.elapsed = 0;
    this.sinceLastFinish = Infinity;
    this.buffered = false;
    this.hitFired = false;
    this.dodgeDir = { x: 0, z: 0 };
    this.invulnerable = false;
    this.eventSerial = (this.eventSerial || 0) + 1;
  }
  get isDodging() { return this.state === 'dodge'; }
  get attacking() { return this.state.startsWith('attack_'); }
  get step() { return this.stepIndex >= 0 ? this.cfg.steps[this.stepIndex] : null; }
  requestAttack() {
    if (this.isDodging) return false;
    if (this.attacking) {
      if (this.elapsed >= this.step.duration - this.cfg.inputBuffer && this.elapsed < this.step.duration) {
        this.buffered = true;
        return true;
      }
      return false;
    }
    const next = this.sinceLastFinish <= this.cfg.comboReset && this.stepIndex >= 0
      ? (this.stepIndex + 1) % this.cfg.steps.length : 0;
    this.startStep(next);
    return true;
  }
  startStep(index) {
    this.stepIndex = index;
    this.elapsed = 0;
    this.hitFired = false;
    this.buffered = false;
    this.sinceLastFinish = Infinity;
    this.state = 'attack_startup';
    this.eventSerial++;
  }
  requestDodge(x, z) {
    if (this.isDodging || this.dodgeCooldown > 0 || this.stamina + 1e-6 < this.cfg.dodgeCost) return false;
    // Pode cancelar apenas a recuperação depois da janela de impacto.
    if (this.attacking && this.elapsed < this.step.impactEnd) return false;
    const m = Math.hypot(x, z);
    if (!Number.isFinite(m) || m < 1e-5) return false;
    this.stamina = Math.max(0, this.stamina - this.cfg.dodgeCost);
    this.state = 'dodge';
    this.elapsed = 0;
    this.sinceLastFinish = Infinity;
    this.buffered = false;
    this.dodgeDir = { x: x / m, z: z / m };
    this.dodgeCooldown = this.cfg.dodgeCooldown;
    this.invulnerable = false;
    this.eventSerial++;
    return true;
  }
  tick(dt, onImpact = () => {}) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);
    if (!this.isDodging) this.stamina = Math.min(this.cfg.staminaMax, this.stamina + this.cfg.staminaRegen * dt);
    if (this.state === 'idle') {
      this.sinceLastFinish += dt;
      if (this.sinceLastFinish > this.cfg.comboReset) this.stepIndex = -1;
      this.invulnerable = false;
      return;
    }
    const previous = this.elapsed;
    this.elapsed += dt;
    if (this.isDodging) {
      this.invulnerable = this.elapsed >= this.cfg.dodgeIFrameStart && this.elapsed <= this.cfg.dodgeIFrameEnd;
      if (this.elapsed >= this.cfg.dodgeDuration) {
        this.resetActions();
        // Não reiniciar cooldown da esquiva.
      }
      return;
    }
    const step = this.step;
    if (!step) { this.resetActions(); return; }
    this.state = this.elapsed < step.impactStart ? 'attack_startup'
      : this.elapsed <= step.impactEnd ? 'attack_active' : 'attack_recovery';
    if (!this.hitFired && previous < step.impactStart && this.elapsed >= step.impactStart) {
      this.hitFired = true;
      onImpact(step, this.stepIndex);
    }
    if (this.elapsed >= step.duration) {
      if (this.buffered) this.startStep((this.stepIndex + 1) % this.cfg.steps.length);
      else {
        this.state = 'idle';
        this.elapsed = 0;
        this.sinceLastFinish = 0;
      }
    }
  }
  abortDodgeOnCollision() {
    if (this.isDodging) this.resetActions();
  }
}

export const combatV2 = new CombatV2Controller();

export function setCombatV2Enabled(value) {
  FEATURE_FLAGS.ENABLE_COMBAT_V2 = Boolean(value);
  combatV2.resetActions();
  return FEATURE_FLAGS.ENABLE_COMBAT_V2;
}
