/** Device budgets use capabilities, not user-agent brands or invented FPS. */
export function deviceRenderProfile(nav = globalThis.navigator, win = globalThis.window) {
  const touch = (nav?.maxTouchPoints || 0) > 0 || !!win?.matchMedia?.('(pointer:coarse)').matches;
  const memory = Number(nav?.deviceMemory) || 0, cores = Number(nav?.hardwareConcurrency) || 0;
  const economy = touch && ((memory > 0 && memory <= 2) || (cores > 0 && cores <= 4));
  return { mobile:touch, economy, initialRatio:economy ? .82 : touch ? .95 : 1.15,
    maxRatio:touch ? 1.12 : 1.45, pixelBudget:touch ? 1_000_000 : 4_000_000,
    targetFPS:economy ? 30 : 60, hudBackend:touch ? 'canvas2d' : 'pixi-webgl' };
}
export function budgetPixelRatio(requested, width, height, dpr, profile) {
  const pixels = Math.max(1, width) * Math.max(1, height);
  return Math.max(.25, Math.min(Number(dpr) || 1, requested, Math.sqrt(profile.pixelBudget / pixels)));
}
/** Fractional cadence retains elapsed simulation time without catch-up bursts. */
export function createFramePacer() {
  let next = null, previousLimit = null;
  return {
    reset() { next = null; previousLimit = null; },
    shouldRender(now, limit) {
      if (!Number.isFinite(now)) return false;
      const interval = 1000 / Math.max(1, Math.min(120, limit || 60));
      if (next === null || previousLimit !== limit) { next = now + interval; previousLimit = limit; return true; }
      if (now + .3 < next) return false;
      next += (Math.floor(Math.max(0, now - next) / interval) + 1) * interval;
      return true;
    }
  };
}
