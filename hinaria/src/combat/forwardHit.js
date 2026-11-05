/** Pure, manual forward-cone hit queries. No aim snapping or persistent target. */
export function hasLineOfSight(state, x0, z0, x1, z1) {
  const distance = Math.hypot(x1-x0,z1-z0);
  if (!Number.isFinite(distance)) return false;
  const steps = Math.ceil(distance/.20);
  for (let i=1;i<steps;i++) {
    const t=i/steps, x=x0+(x1-x0)*t, z=z0+(z1-z0)*t;
    if (Math.hypot(x-x0,z-z0)<.36 || Math.hypot(x-x1,z-z1)<.36) continue;
    if (state?.B?.[Math.round(x)]?.[Math.round(z)]) return false;
  }
  return true;
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
