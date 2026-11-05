/** Transparent, disposable Pixi visuals. The DOM owns every label, value and input. */
import { gameState } from '../core/gameState.js';
import { getHudVisualState, updateHudTelemetry } from './hud.js';
import { deviceRenderProfile } from '../core/renderProfile.js';
import { createCanvasHudBackend } from './hudCanvasBackend.js';

let initializing = null;
export function initHudPixiV2() {
  if (window.HINARIA_HUD_PIXI) return Promise.resolve(window.HINARIA_HUD_PIXI);
  if (initializing) return initializing;
  initializing = createHud().finally(() => { initializing = null; });
  return initializing;
}

async function createHud() {
  const hud = document.getElementById('hud');
  if (!hud || !document.body.classList.contains('ui-v1')) return null;
  let app;
  try {
    const mobile=deviceRenderProfile().mobile;
    let graphics,backend;
    if(mobile){const result=createCanvasHudBackend();app=result.app;graphics=result.graphics;backend=result.backend;}
    else {
      const { Application, Graphics } = await import('pixi.js');
      app = new Application();
      await app.init({ backgroundAlpha: 0, antialias: false, autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 1.5), resizeTo: window, preference: 'webgl' });
      graphics=new Graphics();app.stage.addChild(graphics);backend='pixi-webgl';
    }
    const canvas = app.canvas;
    canvas.id = 'hud-pixi'; canvas.setAttribute('aria-hidden', 'true');
    document.body.append(canvas);
    const danger = document.createElement('div');
    danger.id = 'hud-danger'; danger.setAttribute('aria-hidden', 'true'); document.body.append(danger);
    const tracks = ['hud-health-track', 'hud-mana-track', 'hud-xp-track'].map(id => document.getElementById(id));
    const buttons = ['s0', 's1', 's2', 's4'].map(id => document.getElementById(id));
    const meterRects = tracks.map(() => ({ x: 0, y: 0, w: 0, h: 0 }));
    const skillRects = buttons.map(() => ({ x: 0, y: 0, w: 0, h: 0, visible: false }));
    const visual = { hp: 0, mp: 0, xp: 0, trail: 0, lastHP: null, lastLevel: null,
      hit: 0, heal: 0, level: 0, time: 0, layoutAge: 1, visible: false };
    const previousCooldowns = [0, 0, 0, 0], ready = [0, 0, 0, 0];
    let destroyed = false;
    const reducedMotion = () => document.documentElement.dataset.reduceMotion === 'true' || matchMedia('(prefers-reduced-motion: reduce)').matches;
    function readRect(element, output) {
      if (!element) { output.w = 0; return; }
      const rect = element.getBoundingClientRect();
      output.x = rect.left; output.y = rect.top; output.w = rect.width; output.h = rect.height;
    }
    function refreshLayout() {
      const rect = hud.getBoundingClientRect(), css = getComputedStyle(hud);
      visual.visible = rect.width > 0 && css.display !== 'none' && css.visibility !== 'hidden' && parseFloat(css.opacity) > .05;
      for (let i = 0; i < tracks.length; i++) readRect(tracks[i], meterRects[i]);
      for (let i = 0; i < buttons.length; i++) {
        readRect(buttons[i], skillRects[i]);
        skillRects[i].visible = skillRects[i].w > 0 && getComputedStyle(buttons[i]).visibility !== 'hidden';
      }
    }
    const invalidate = () => { visual.layoutAge = 1; };
    const observer = new ResizeObserver(invalidate); observer.observe(hud);
    const dock = document.getElementById('ui-combat-dock'); if (dock) observer.observe(dock);
    function drawMeter(rect, fill, ghost, color, light, flash) {
      if (rect.w <= 2 || rect.h <= 2) return;
      const x = rect.x + 1, y = rect.y + 1, w = rect.w - 2, h = rect.h - 2, radius = Math.min(2, h / 2);
      if (ghost > fill + .002) graphics.roundRect(x, y, w * ghost, h, radius).fill({ color: 0xe8e2d0, alpha: .7 });
      if (fill > .001) {
        const fw = Math.max(.1, w * fill);
        graphics.roundRect(x, y, fw, h, Math.min(radius, fw / 2)).fill({ color });
        if (h > 3 && fw > 2) graphics.rect(x + 1, y + 1, fw - 2, 1).fill({ color: light, alpha: .65 });
        if (flash > .01) graphics.rect(x, y, fw, h).fill({ color: 0xb4e4c6, alpha: flash * .7 });
      }
    }
    function frame(ticker) {
      try {
        if (destroyed) return;
        const dt = Math.min(.07, ticker.deltaMS / 1000);
        const state = updateHudTelemetry() || getHudVisualState().state;
        visual.time += dt; visual.layoutAge += dt;
        if (visual.layoutAge >= .25) { visual.layoutAge = 0; refreshLayout(); }
        const show = visual.visible && !!state && !document.hidden && !['BOOT', 'TITLE', 'CHARACTER_CREATION'].includes(gameState.flow);
        app.stage.visible = show; graphics.clear();
        if (!state || !show) { danger.style.opacity = '0'; return; }
        const reduce = reducedMotion();
        if (visual.lastHP === null) { visual.hp = visual.trail = state.hpRatio; visual.mp = state.mpRatio; visual.xp = state.xpRatio; }
        else if (state.hp < visual.lastHP) visual.hit = 1;
        else if (state.hp > visual.lastHP) visual.heal = 1;
        if (visual.lastLevel !== null && state.level > visual.lastLevel) visual.level = 1;
        visual.lastHP = state.hp; visual.lastLevel = state.level;
        const k = reduce ? 1 : 1 - Math.exp(-dt * 15);
        visual.hp += (state.hpRatio - visual.hp) * k;
        visual.mp += (state.mpRatio - visual.mp) * k;
        visual.xp += (state.xpRatio - visual.xp) * k;
        visual.trail = reduce || visual.trail <= visual.hp ? visual.hp
          : visual.trail + (visual.hp - visual.trail) * (1 - Math.exp(-dt * 2)) * (visual.hit > .45 ? 0 : 1);
        drawMeter(meterRects[0], visual.hp, visual.trail, 0xb33a4c, 0xea9296, visual.heal);
        drawMeter(meterRects[1], visual.mp, visual.mp, 0x5a85b1, 0xadcce3, 0);
        drawMeter(meterRects[2], visual.xp, visual.xp, 0xbab299, 0xf0e7cf, visual.level);
        const pulse = reduce ? .3 : .3 + Math.sin(visual.time * 4) * .12;
        danger.style.opacity = String(state.lowHealth ? pulse : Math.min(.24, visual.hit * .24));
        for (let i = 0; i < state.skills.length; i++) {
          const skill = state.skills[i], rect = skillRects[i];
          if (previousCooldowns[i] > 0 && skill.cooldown === 0 && !skill.locked) ready[i] = 1;
          previousCooldowns[i] = skill.cooldown;
          if (rect.visible) {
            const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2, radius = Math.min(rect.w, rect.h) / 2 - 2;
            if (!skill.locked && skill.cooldownRatio > 0) {
              // No per-frame textures, text objects, DOM creation or polygon arrays.
              graphics.moveTo(cx, cy).lineTo(cx, cy - radius)
                .arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + skill.cooldownRatio * Math.PI * 2)
                .lineTo(cx, cy).fill({ color: 0x020308, alpha: .42 });
              graphics.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + skill.cooldownRatio * Math.PI * 2)
                .stroke({ width: 1.5, color: 0xd3d0c5, alpha: .75 });
            }
            if (!reduce && ready[i] > .01) graphics.roundRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2, 9)
              .stroke({ width: 2, color: 0xe7debd, alpha: ready[i] });
          }
          ready[i] = Math.max(0, ready[i] - dt * 2.4);
        }
        visual.hit = Math.max(0, visual.hit - dt * 2.6);
        visual.heal = Math.max(0, visual.heal - dt * 2.5);
        visual.level = Math.max(0, visual.level - dt * 1.4);
      } catch (error) {
        console.warn('[Hinária] Falha visual no HUD; mantendo interface DOM.', error);
        queueMicrotask(destroy);
      }
    }
    function visibility() {
      if (destroyed) return;
      if (document.hidden || ['TITLE', 'BOOT', 'CHARACTER_CREATION'].includes(gameState.flow)) {
        app.stop(); canvas.style.visibility = 'hidden'; danger.style.opacity = '0';
      } else { invalidate(); canvas.style.visibility = ''; app.start(); }
    }
    function contextLost(event) {
      event.preventDefault(); console.warn('[Hinária] Contexto Pixi perdido; HUD DOM ativo.');
      queueMicrotask(destroy);
    }
    function destroy() {
      if (destroyed) return;
      destroyed = true; observer.disconnect();
      window.removeEventListener('resize', invalidate);
      window.removeEventListener('hinaria:settingschange', invalidate);
      window.removeEventListener('hinaria:flowchange', visibility);
      document.removeEventListener('visibilitychange', visibility);
      canvas.removeEventListener('webglcontextlost', contextLost);
      document.body.classList.remove('hud-pixi');
      app.ticker.remove(frame); app.stop(); danger.remove();
      app.destroy(true, { children: true });
      if (window.HINARIA_HUD_PIXI?.destroy === destroy) delete window.HINARIA_HUD_PIXI;
    }
    window.addEventListener('resize', invalidate, { passive: true });
    window.addEventListener('hinaria:settingschange', invalidate);
    window.addEventListener('hinaria:flowchange', visibility);
    document.addEventListener('visibilitychange', visibility);
    canvas.addEventListener('webglcontextlost', contextLost);
    app.ticker.maxFPS = 30; app.ticker.add(frame);
    updateHudTelemetry(true); refreshLayout();
    document.body.classList.add('hud-pixi');
    const api = { destroy, refresh: invalidate, version: '4-mobile-canvas',
      diagnostics:()=>({backend,width:canvas.width,height:canvas.height,maxFPS:app.ticker.maxFPS}) };
    window.HINARIA_HUD_PIXI = api;
    visibility(); return api;
  } catch (error) {
    document.body.classList.remove('hud-pixi');
    try { app?.destroy(true, { children: true }); } catch { /* renderer might not have initialized */ }
    document.getElementById('hud-pixi')?.remove(); document.getElementById('hud-danger')?.remove();
    console.warn('[Hinária] Pixi indisponível; HUD DOM mantido.', error); return null;
  }
}
