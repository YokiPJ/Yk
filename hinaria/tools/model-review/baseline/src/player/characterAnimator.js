/**
 * HINÁRIA — unified procedural character animator.
 * This module owns the rig's animation transforms; the gameplay loop owns
 * attack/damage cooldowns and movement. No independent RAF or Three.js imports.
 */
export const AnimationState = Object.freeze({
    IDLE: 'idle', WALK: 'walk', RUN: 'run', ATTACK: 'attack',
    DAMAGE: 'damage', DEATH: 'death', DODGE: 'dodge'
});

const ATTACK_DURATION = 0.35; // Same time base as entity.at in loop.js
const MOVE_EPS = 0.12;
const approach = (current, target, alpha) => current + (target - current) * alpha;

/** Each animator is tied to ONE displayed rig, not a temporary builder rig. */
export class CharacterAnimator {
    constructor(rig) {
        this.rig = rig;
        this.state = AnimationState.IDLE;
        this.prevState = AnimationState.IDLE;
        this.stateTime = 0;
        this.phase = 0;
        this.lastX = undefined;
        this.lastZ = undefined;
        this.measuredSpeed = 0;
    }

    bindRig(rig, entity) {
        if (rig === this.rig) return;
        this.rig = rig;
        this.state = AnimationState.IDLE;
        this.prevState = AnimationState.IDLE;
        this.stateTime = 0;
        this.phase = 0;
        this.lastX = Number.isFinite(entity?.x) ? entity.x : undefined;
        this.lastZ = Number.isFinite(entity?.z) ? entity.z : undefined;
        this.measuredSpeed = 0;
    }

    measureSpeed(entity, dt) {
        const x = Number.isFinite(entity.x) ? entity.x : 0;
        const z = Number.isFinite(entity.z) ? entity.z : 0;
        let deltaSpeed = 0;
        if (Number.isFinite(this.lastX) && Number.isFinite(this.lastZ) && dt > 0) {
            deltaSpeed = Math.hypot(x - this.lastX, z - this.lastZ) / dt;
        }
        this.lastX = x;
        this.lastZ = z;
        // Positions are authoritative for both click-to-move and monster paths.
        // Do not trust stale vx/vz values when the character is up against a wall.
        const source = entity.kind === 'p' && Number.isFinite(entity.spd)
            ? Math.max(deltaSpeed, entity.spd) : deltaSpeed;
        this.measuredSpeed = approach(this.measuredSpeed, Math.min(12, source),
            Math.min(1, dt * (source > this.measuredSpeed ? 16 : 22)));
        if (this.measuredSpeed < 0.045) this.measuredSpeed = 0;
        return this.measuredSpeed;
    }

    determineState(entity, speed = this.measuredSpeed) {
        if (entity.hp <= 0) return AnimationState.DEATH;
        if (entity.combatV2Dodge) return AnimationState.DODGE;
        if ((entity.at || 0) > 0) return AnimationState.ATTACK;
        if ((entity.fl || 0) > 0.025) return AnimationState.DAMAGE;
        if (speed > 3.2) return AnimationState.RUN;
        if (speed > MOVE_EPS) return AnimationState.WALK;
        return AnimationState.IDLE;
    }

    update(entity, dt) {
        const displayedRig = entity?.mesh?.userData?.r;
        if (displayedRig && displayedRig !== this.rig) this.bindRig(displayedRig, entity);
        const r = this.rig;
        if (!r?.unit || !Array.isArray(r.legs)) return;
        if (!Number.isFinite(dt) || dt <= 0) return;
        dt = Math.min(0.05, dt);

        const speed = this.measureSpeed(entity, dt);
        const next = this.determineState(entity, speed);
        if (next !== this.state) {
            this.prevState = this.state;
            this.state = next;
            this.stateTime = 0;
        } else this.stateTime += dt;

        // Advance gait by actual traveled speed; do not dance when blocked.
        if (next === AnimationState.WALK || next === AnimationState.RUN) {
            this.phase += dt * Math.max(2.5, speed * 2.7);
        }
        const phase = this.phase;
        const t = this.stateTime;
        const restArmR = r.aim ? -0.6 : -0.22;
        const restArmL = r.aim ? -0.95 : -0.22;

        let bodyY = Math.sin(t * 2.3) * 0.011;
        let bodyX = 0, bodyZ = 0;
        let tiltX = 0, tiltY = 0, tiltZ = 0;
        let headX = Math.sin(t * 1.7) * 0.025;
        let headY = Math.sin(t * 1.1) * 0.045;
        let legR = r.sit ? -1.15 : 0;
        let legL = r.sit ? -1.15 : 0;
        let armR = restArmR, armL = restArmL;
        let cape = Math.sin(t * 1.8) * 0.04;
        const amp = r.amp ?? 0.7;

        if (next === AnimationState.WALK || next === AnimationState.RUN) {
            const run = next === AnimationState.RUN;
            const intensity = Math.min(1, speed / (run ? 4.4 : 3.2));
            const stride = Math.sin(phase) * amp * intensity * (run ? 0.9 : 0.6);
            legR = stride;
            legL = -stride;
            armR = restArmR - Math.sin(phase) * (run ? 0.49 : 0.29) * intensity;
            armL = restArmL + (r.aim ? 0 : Math.sin(phase) * (run ? 0.49 : 0.29) * intensity);
            bodyY = Math.abs(Math.sin(phase)) * (run ? 0.075 : 0.035) * intensity;
            tiltX = run ? 0.08 : 0.015;
            headX = run ? 0.09 : 0.03;
            headY = 0;
            cape = (run ? 0.42 : 0.2) + Math.sin(phase) * 0.07;
        } else if (next === AnimationState.ATTACK) {
            // entity.at counts from 1 to 0 over 0.35s; ONE attack per trigger.
            // No manual state reassignment here, which caused repeated attack loops.
            const u = Math.max(0, Math.min(1, 1 - entity.at));
            const strike = Math.sin(u * Math.PI);
            armR = -0.4 - strike * (r.sw || 1.9);
            armL = restArmL - strike * (r.aim ? 0.4 : 0.16);
            tiltY = Math.sin(u * Math.PI) * 0.24;
            tiltX = -strike * 0.1;
            bodyZ = -strike * 0.06;
            headX = -0.07;
            // Apenas a ação manual V2 do Cavaleiro: golpes diferenciados
            // mantendo os pivôs e o animator original.
            if (entity.combatV2Stage === 1) {
                armR = -0.55 - strike * (r.sw || 1.9) * 0.92;
                armL = restArmL - strike * .24;
                tiltY = -strike * .35;
                tiltZ = strike * .10;
            } else if (entity.combatV2Stage === 2) {
                armR = -0.85 - strike * (r.sw || 1.9) * 1.1;
                armL = restArmL - strike * .35;
                tiltX = -strike * .22;
                tiltY = strike * .18;
                bodyZ = -strike * .09;
            }
        } else if (next === AnimationState.DODGE) {
            // Fallback procedural: desvio baixo, sem criar outro mixer/RAF.
            const u = Math.max(0, Math.min(1, entity.combatV2DodgeProgress || 0));
            const ease = Math.sin(u * Math.PI);
            bodyY = -.10 * ease;
            tiltX = -.28 * ease;
            tiltZ = -.13 * ease;
            armR = restArmR - .45 * ease;
            armL = restArmL - .45 * ease;
            cape = -.25 * ease;
        } else if (next === AnimationState.DAMAGE) {
            const recoil = Math.max(0, Math.min(1, (entity.fl || 0) / 0.18));
            bodyX = Math.sin(t * 34) * 0.038 * recoil;
            tiltZ = Math.sin(t * 27) * 0.12 * recoil;
            tiltX = -0.13 * recoil;
            armR += 0.3 * recoil;
            armL += 0.3 * recoil;
            headX = -0.15 * recoil;
        } else if (next === AnimationState.DEATH) {
            const u = Math.min(1, t / 0.68);
            const fall = 1 - Math.pow(1 - u, 3);
            tiltX = 1.38 * fall;
            bodyY = -0.32 * fall;
            bodyZ = -0.22 * fall;
            armR = -0.2 + fall * 1.45;
            armL = -0.2 + fall * 1.2;
            legR = fall * 0.28;
            legL = -fall * 0.2;
            headX = 0.45 * fall;
            cape = fall * -0.2;
        }

        // Smooth transitions; reset ALL axes EVERY frame to avoid stuck poses.
        const a = 1 - Math.exp(-dt * (next === AnimationState.ATTACK || next === AnimationState.DODGE ? 26 : 16));
        const unit = r.unit;
        unit.position.x = approach(unit.position.x, bodyX, a);
        unit.position.y = approach(unit.position.y, bodyY + (r.sit && next !== AnimationState.DEATH ? -0.28 : 0), a);
        unit.position.z = approach(unit.position.z, bodyZ, a);
        unit.rotation.x = approach(unit.rotation.x, tiltX, a);
        unit.rotation.y = approach(unit.rotation.y, tiltY, a);
        unit.rotation.z = approach(unit.rotation.z, tiltZ, a);
        if (r.legs[0]) r.legs[0].rotation.x = approach(r.legs[0].rotation.x, legR, a);
        if (r.legs[1]) r.legs[1].rotation.x = approach(r.legs[1].rotation.x, legL, a);
        for (let i = 2; i < r.legs.length; i++) {
            const target = next === AnimationState.WALK || next === AnimationState.RUN
                ? Math.sin(phase + (r.legs[i].userData.p || 0)) * amp * 0.45 : 0;
            r.legs[i].rotation.x = approach(r.legs[i].rotation.x, target, a);
        }
        if (r.armR) r.armR.rotation.x = approach(r.armR.rotation.x, armR, a);
        if (r.armL) r.armL.rotation.x = approach(r.armL.rotation.x, armL, a);
        if (r.head) {
            r.head.rotation.x = approach(r.head.rotation.x, headX, a);
            r.head.rotation.y = approach(r.head.rotation.y, headY, a);
        }
        if (r.cape) r.cape.rotation.x = approach(r.cape.rotation.x, cape, a);
        if (r.tail) {
            const moving = next === AnimationState.WALK || next === AnimationState.RUN;
            r.tail.rotation.y = approach(r.tail.rotation.y,
                Math.sin(this.phase*0.75) * (moving ? 0.28 : .11), a);
            r.tail.rotation.x = approach(r.tail.rotation.x,
                moving ? -.12 : Math.sin(t*2.2)*.07, a);
        }

        // Optional crystal rotation; material/geometry contains no ticking logic.
        if (r.weapon?.userData?.crystal) r.weapon.userData.crystal.rotation.y += dt * 1.8;
    }
}

export function createAnimator(entity) {
    const rig = entity?.mesh?.userData?.r;
    return rig ? new CharacterAnimator(rig) : null;
}

export function updateEntityAnimation(entity, dt) {
    if (!entity?.mesh?.userData?.r) return;
    if (!entity.animator) entity.animator = createAnimator(entity);
    entity.animator.update(entity, dt);
}
