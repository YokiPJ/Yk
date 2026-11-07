/** Attack assistance: acquire on input/impact, never start an attack or move actors. */
import { hasLineOfSight } from './forwardHit.js';

function visible(mesh) {
  for (let node = mesh; node; node = node.parent) if (node.visible === false) return false;
  return true;
}

function canAim(state, player, range) {
  return !!player && Number.isFinite(player.x) && Number.isFinite(player.z) &&
    Number.isFinite(range) && range > 0 && Array.isArray(state?.ents);
}

function eligible(state, player, target, range) {
  if (!target || target === player || target.kind !== 'm' || !(target.hp > 0) ||
      target.dead || target._hinariaDeathProcessed || !Number.isFinite(target.x) ||
      !Number.isFinite(target.z) || !visible(target.mesh)) return false;
  const distance = Math.hypot(target.x - player.x, target.z - player.z);
  return distance >= .0001 && distance <= range + .001 &&
    hasLineOfSight(state, player.x, player.z, target.x, target.z);
}

/** Full circle, nearest valid enemy. Facing breaks equal-distance ties. */
export function findAttackEnemy(state, player, range) {
  if (!canAim(state, player, range)) return null;
  const yaw = Number(player.mesh?.rotation?.y) || 0;
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  let result = null, bestDistance = Infinity, bestFacing = -Infinity;
  for (const target of state.ents) {
    if (!eligible(state, player, target, range)) continue;
    const dx = target.x - player.x, dz = target.z - player.z;
    const distance = Math.hypot(dx, dz), facing = (dx * fx + dz * fz) / distance;
    if (distance < bestDistance - 1e-6 || (Math.abs(distance - bestDistance) <= 1e-6 && facing > bestFacing)) {
      result = target; bestDistance = distance; bestFacing = facing;
    }
  }
  return result;
}

/** Short-lived aim for one swing. The combo keeps its victim until impact. */
export class AttackAimController {
  constructor() { this.clear(); }
  clear() { this.player = null; this.target = null; this.range = 0; this.serial = null; }
  begin(state, player, range, serial = null) {
    if (serial !== null && this.player === player && this.serial === serial) return this.current(state, player);
    this.player = player; this.range = range; this.serial = serial;
    this.target = findAttackEnemy(state, player, range);
    this.face(state, player);
    return this.target;
  }
  current(state, player) {
    return this.player === player && canAim(state, player, this.range) &&
      state.ents.includes(this.target) && eligible(state, player, this.target, this.range) ? this.target : null;
  }
  resolveImpact(state, player) {
    if (this.player !== player) return null;
    this.target = this.current(state, player) || findAttackEnemy(state, player, this.range);
    this.face(state, player);
    return this.target;
  }
  facing(state, player) {
    const target = this.current(state, player);
    return target ? Math.atan2(target.x - player.x, target.z - player.z) : null;
  }
  face(state, player) {
    const yaw = this.facing(state, player);
    if (yaw !== null && player.mesh?.rotation) player.mesh.rotation.y = yaw;
  }
}
