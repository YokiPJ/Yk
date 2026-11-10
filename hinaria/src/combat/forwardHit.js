/** Pure, manual forward-cone hit queries. No aim snapping or persistent target. */
export function hasLineOfSight(state, x0, z0, x1, z1) {
  const dx = x1 - x0, dz = z1 - z0;
  if (![x0,z0,x1,z1,dx,dz].every(Number.isFinite)) return false;
  const blocked = (x,z) => !!state?.B?.[x]?.[z];
  let x = Math.floor(x0 + .5), z = Math.floor(z0 + .5);
  const endX = Math.floor(x1 + .5), endZ = Math.floor(z1 + .5);
  const sx = Math.sign(dx), sz = Math.sign(dz);
  const stepX = dx ? Math.abs(1 / dx) : Infinity;
  const stepZ = dz ? Math.abs(1 / dz) : Infinity;
  let nextX = dx ? (x + (sx > 0 ? .5 : -.5) - x0) / dx : Infinity;
  let nextZ = dz ? (z + (sz > 0 ? .5 : -.5) - z0) / dz : Infinity;
  // Visit every crossed collision tile. A diagonal ray also touches both sides
  // of a corner, exactly as navigation does; sampling skipped those side walls.
  while (true) {
    if (blocked(x,z)) return false;
    if (x === endX && z === endZ) return true;
    const crossing = Math.min(nextX,nextZ);
    if (crossing > 1) return !blocked(endX,endZ);
    const corner = Math.abs(nextX - nextZ) < 1e-10;
    if (corner && (blocked(x + sx,z) || blocked(x,z + sz))) return false;
    // An endpoint exactly on a boundary belongs to its rounded tile. Never
    // step beyond it (negative diagonals can otherwise overshoot that tile).
    if (crossing >= 1 - 1e-12) return !blocked(endX,endZ);
    if (corner) {
      x += sx; z += sz; nextX += stepX; nextZ += stepZ;
    } else if (nextX < nextZ) {
      x += sx; nextX += stepX;
    } else {
      z += sz; nextZ += stepZ;
    }
  }
}

/** Select a victim only at an explicit strike/cast, inside range and facing cone. */
export function findForwardEnemy(state, player, range, arcCos = 0) {
  if (!player || !Number.isFinite(player.x) || !Number.isFinite(player.z) ||
      !Number.isFinite(range) || range<=0 || !Number.isFinite(arcCos)) return null;
  const facing = Number(player.mesh?.rotation?.y) || 0;
  const fx=Math.sin(facing), fz=Math.cos(facing);
  let result=null, best=Infinity;
  for (const e of state?.ents || []) {
    if (e.kind!=='m' || !(e.hp>0) || e.dead || e._hinariaDeathProcessed ||
        !Number.isFinite(e.x) || !Number.isFinite(e.z)) continue;
    const dx=e.x-player.x, dz=e.z-player.z, d=Math.hypot(dx,dz);
    if (d>range+.001 || d<.0001) continue;
    const forward=(dx*fx+dz*fz)/d;
    if (forward<arcCos || !hasLineOfSight(state,player.x,player.z,e.x,e.z)) continue;
    const score=d+(1-forward)*.13;
    if (score<best) { best=score; result=e; }
  }
  return result;
}

// Compatibility export for older integrations; applies exactly the same cone.
export const findGuidedEnemy = findForwardEnemy;
