/** Device budgets use capabilities, not user-agent brands or invented FPS. */
export function deviceRenderProfile(nav = globalThis.navigator, win = globalThis.window) {
  const packagedMobile=typeof __HINARIA_MOBILE_BUILD__!=='undefined'&&__HINARIA_MOBILE_BUILD__;
  const touch = packagedMobile || (nav?.maxTouchPoints || 0) > 0 || !!win?.matchMedia?.('(pointer:coarse)').matches || !!win?.Capacitor?.isNativePlatform?.();
  const memory = Number(nav?.deviceMemory) || 0, cores = Number(nav?.hardwareConcurrency) || 0;
  const economy = touch && ((memory > 0 && memory <= 2) || (cores > 0 && cores <= 4));
  return { mobile:!!touch, economy, initialRatio:economy ? .72 : touch ? .85 : 1.15,
    maxRatio:touch ? 1.0 : 1.45, pixelBudget:touch ? (economy?400_000:600_000) : 4_000_000,
    targetFPS:touch ? 30 : 60, hudBackend:touch ? 'canvas2d' : 'pixi-webgl' };
}
export function budgetPixelRatio(requested, width, height, dpr, profile) {
  const valid=n=>Number.isFinite(n)&&n>0;
  const pixels=(valid(width)?width:1)*(valid(height)?height:1);
  return Math.min(valid(dpr)?dpr:1,valid(requested)?requested:profile.initialRatio,Math.sqrt(profile.pixelBudget/pixels));
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
