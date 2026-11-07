/** Same HUD drawing commands on mobile, using one transparent Canvas2D layer. */
export function createCanvasHudBackend(win = window, doc = document) {
  const canvas = doc.createElement('canvas');
  canvas.id='hud-pixi';
  const ctx = canvas.getContext('2d', { alpha:true, desynchronized:true });
  if (!ctx) throw new Error('Canvas2D indisponível');
  let raf = 0, running = false, last = null, hasPath = false;
  const callbacks = new Set();
  const color = value => '#' + (value >>> 0).toString(16).padStart(6, '0');
  const begin = () => { if (!hasPath) { ctx.beginPath(); hasPath = true; } };
  const graphics = {
    clear() { ctx.clearRect(0, 0, canvas.width, canvas.height); hasPath = false; return this; },
    roundRect(x,y,w,h,r) { begin(); if (ctx.roundRect) ctx.roundRect(x,y,w,h,r); else ctx.rect(x,y,w,h); return this; },
    rect(...args) { begin(); ctx.rect(...args); return this; },
    moveTo(...args) { begin(); ctx.moveTo(...args); return this; },
    lineTo(...args) { begin(); ctx.lineTo(...args); return this; },
    arc(...args) { begin(); ctx.arc(...args); return this; },
    fill(style) { ctx.fillStyle=color(style.color); ctx.globalAlpha=style.alpha??1; ctx.fill(); ctx.globalAlpha=1; hasPath=false; return this; },
    stroke(style) { ctx.strokeStyle=color(style.color); ctx.lineWidth=style.width??1; ctx.globalAlpha=style.alpha??1; ctx.stroke(); ctx.globalAlpha=1; hasPath=false; return this; }
  };
  function resize() {
    canvas.width=Math.max(1,Math.round(win.innerWidth)); canvas.height=Math.max(1,Math.round(win.innerHeight));
    canvas.style.width=win.innerWidth+'px'; canvas.style.height=win.innerHeight+'px';
  }
  const ticker = { deltaMS:0, maxFPS:30, add(fn) { callbacks.add(fn); }, remove(fn) { callbacks.delete(fn); } };
  function frame(now) {
    if (!running) return;
    raf=win.requestAnimationFrame(frame);
    if (last !== null && now-last < 1000/ticker.maxFPS-.3) return;
    ticker.deltaMS=last===null?1000/ticker.maxFPS:Math.min(100,now-last); last=now;
    for (const callback of callbacks) callback(ticker);
  }
  const app = { canvas, ticker, stage:{visible:true},
    start() { if (running) return; running=true;last=null;raf=win.requestAnimationFrame(frame); },
    stop() { running=false;win.cancelAnimationFrame(raf);last=null; },
    destroy() { this.stop();callbacks.clear();win.removeEventListener('resize',resize);canvas.width=canvas.height=1;canvas.remove(); }
  };
  resize();win.addEventListener('resize',resize,{passive:true});
  return { app, graphics, backend:'canvas2d' };
}
