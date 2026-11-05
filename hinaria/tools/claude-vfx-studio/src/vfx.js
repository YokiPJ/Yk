/**
 * HINÁRIA VFX — biblioteca de efeitos visuais para Three.js 0.160 (sem texturas externas, sem globais).
 *   const vfx = createVFX(THREE, scene, { renderer, maxParticles: 2500 });
 *   vfx.play('slash_fire', { pos, dir, scale: 1 });   // no loop do jogo: vfx.update(dt); camera.position.add(vfx.shakeOffset)
 * Partículas em 2 pools (aditivo + fumaça), malhas leves e geometrias compartilhadas. Determinístico (seed).
 */
export function createVFX(THREE, scene, opts = {}) {
  const V3 = THREE.Vector3, ADD = THREE.AdditiveBlending, maxP = opts.maxParticles || 2500;
  let seed = (opts.seed ?? 1337) >>> 0;
  const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const R = (a, b) => a + (b - a) * rnd(), TAU = Math.PI * 2, clamp01 = x => Math.max(0, Math.min(1, x));
  const eo = k => 1 - Math.pow(1 - clamp01(k), 3), ei = k => clamp01(k) * clamp01(k), sm = k => { k = clamp01(k); return k * k * (3 - 2 * k); };
  const rgb = h => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
  const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return (((A[0] + (B[0] - A[0]) * t) * 255) << 16) | (((A[1] + (B[1] - A[1]) * t) * 255) << 8) | ((A[2] + (B[2] - A[2]) * t) * 255); };
  const root = new THREE.Group(); root.name = 'vfx'; scene.add(root);

  // ---------- partículas (pool em buffers; shader de ponto suave, sem textura) ----------
  const VS = 'attribute float aSize; attribute vec4 aColor; varying vec4 vColor; uniform float uScale; void main(){ vColor=aColor; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=max(0.0,aSize*uScale/max(0.1,-mv.z)); gl_Position=projectionMatrix*mv; }';
  const FS = 'varying vec4 vColor; void main(){ float d=length(gl_PointCoord-0.5)*2.0; float a=1.0-smoothstep(0.0,1.0,d); a*=a; gl_FragColor=vec4(vColor.rgb,vColor.a*a); }';
  const scaleU = { value: 300 };
  function makePS(n, blending) {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 4), siz = new Float32Array(n), vel = new Float32Array(n * 3), age = new Float32Array(n), life = new Float32Array(n);
    const s0 = new Float32Array(n), s1 = new Float32Array(n), c0 = new Float32Array(n * 3), c1 = new Float32Array(n * 3), al = new Float32Array(n * 2), gr = new Float32Array(n), dr = new Float32Array(n);
    for (let i = 0; i < n; i++) pos[i * 3 + 1] = -9999;
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aColor', new THREE.BufferAttribute(col, 4)); geo.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
    const mat = new THREE.ShaderMaterial({ uniforms: { uScale: scaleU }, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; root.add(pts);
    let head = 0, alive = 0;
    function emit(p) {
      for (let k = 0; k < n; k++) { const i = (head + k) % n; if (life[i] <= 0) { head = (i + 1) % n; spawn(i, p); return; } }
      spawn(head, p); head = (head + 1) % n;
    }
    function spawn(i, p) {
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; vel[i * 3] = p.vx || 0; vel[i * 3 + 1] = p.vy || 0; vel[i * 3 + 2] = p.vz || 0;
      life[i] = Math.max(0.05, p.life || 0.6); age[i] = 0; s0[i] = p.s0 ?? 0.3; s1[i] = p.s1 ?? 0; gr[i] = p.g || 0; dr[i] = p.drag || 0; al[i * 2] = p.a0 ?? 1; al[i * 2 + 1] = p.a1 ?? 0;
      const A = rgb(p.c0 ?? 0xffffff), B = rgb(p.c1 ?? p.c0 ?? 0xffffff); c0.set(A, i * 3); c1.set(B, i * 3);
    }
    function update(dt) {
      alive = 0;
      for (let i = 0; i < n; i++) {
        if (life[i] <= 0) continue;
        age[i] += dt; const t = age[i] / life[i];
        if (t >= 1) { life[i] = 0; siz[i] = 0; col[i * 4 + 3] = 0; pos[i * 3 + 1] = -9999; continue; }
        alive++; const dd = Math.max(0, 1 - dr[i] * dt); vel[i * 3] *= dd; vel[i * 3 + 1] = vel[i * 3 + 1] * dd - gr[i] * dt; vel[i * 3 + 2] *= dd;
        pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        siz[i] = s0[i] + (s1[i] - s0[i]) * t; const o = i * 4;
        col[o] = c0[i * 3] + (c1[i * 3] - c0[i * 3]) * t; col[o + 1] = c0[i * 3 + 1] + (c1[i * 3 + 1] - c0[i * 3 + 1]) * t; col[o + 2] = c0[i * 3 + 2] + (c1[i * 3 + 2] - c0[i * 3 + 2]) * t;
        col[o + 3] = al[i * 2] + (al[i * 2 + 1] - al[i * 2]) * t;
      }
      geo.attributes.position.needsUpdate = geo.attributes.aColor.needsUpdate = geo.attributes.aSize.needsUpdate = true;
    }
    return { emit, update, get alive() { return alive; }, pts, geo, mat, clear() { life.fill(0); siz.fill(0); col.fill(0); alive = 0; } };
  }
  const fx = makePS(maxP, ADD), smoke = makePS(Math.floor(maxP / 2), THREE.NormalBlending);

  // ---------- geometrias/materiais compartilhados ----------
  const G = { sphere: new THREE.SphereGeometry(1, 14, 10), ring: new THREE.RingGeometry(0.86, 1, 56), disc: new THREE.CircleGeometry(1, 40), cyl: new THREE.CylinderGeometry(1, 1, 1, 18, 1, true), cone: new THREE.ConeGeometry(1, 1, 7), plane: new THREE.PlaneGeometry(2, 2) };
  G.ring.rotateX(-Math.PI / 2); G.disc.rotateX(-Math.PI / 2); G.cyl.translate(0, 0.5, 0); G.cone.translate(0, 0.5, 0);
  const mats = new Set(), geos = new Set();
  const bm = (color, opacity = 1, extra = {}) => { const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: ADD, depthWrite: false, side: THREE.DoubleSide, ...extra }); mats.add(m); return m; };
  const mk = (g, m, parent = root) => { const o = new THREE.Mesh(g, m); parent.add(o); return o; };
  const lines = []; // linhas de raios
  // ---------- atores (efeitos em andamento) ----------
  const actors = []; let shakeAmp = 0, shakeT = 0, shakeDur = 0; const shakeOffset = new V3();
  function act(dur, fn, clean, delay = 0) { const a = { t: -delay, dur, fn, clean, dead: false, cancel() { this.dead = true; } }; actors.push(a); return a; }
  const shake = (amp, dur = 0.35) => { if (amp > shakeAmp * (shakeT > 0 ? shakeT / shakeDur : 0)) { shakeAmp = amp; shakeDur = dur; shakeT = dur; } };
  const V = (o, d = [0, 0, 0]) => o ? (o.isVector3 ? o.clone() : Array.isArray(o) ? new V3(o[0], o[1], o[2]) : new V3(o.x ?? d[0], o.y ?? d[1], o.z ?? d[2])) : new V3(...d);
  const norm = (o) => { const pos = V(o.pos), dir = V(o.dir, [0, 0, 1]); dir.y = o.flat === false ? dir.y : dir.y; if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1); dir.normalize(); return { pos, dir, target: o.target ? V(o.target) : pos.clone().addScaledVector(dir, 6), color: o.color, sc: o.scale ?? 1, o }; };
  const burst = (ps, n, f) => { for (let i = 0; i < n; i++) ps.emit(f(i)); };
  const radial = (sp, up = 0) => { const a = R(0, TAU), e = R(-0.3, 0.9), c = Math.cos(e); return [Math.cos(a) * c * sp, Math.sin(e) * sp + up, Math.sin(a) * c * sp]; };
  const glowBall = (pos, color, size, dur, opacity = 1) => { const m = bm(color, opacity), s = mk(G.sphere, m); s.position.copy(pos); act(dur, (dt, k) => { s.scale.setScalar(size * (1 - ei(k))); m.opacity = opacity * (1 - k); }, () => { root.remove(s); }); return s; };
  const ringFx = (pos, color, r0, r1, dur, { y = 0.05, op = 0.9, thick = 1, delay = 0 } = {}) => { const m = bm(color, op), s = mk(G.ring, m); s.position.copy(pos); s.position.y += y; act(dur, (dt, k) => { const r = r0 + (r1 - r0) * eo(k); s.scale.set(r, thick, r); m.opacity = op * (1 - ei(k)); }, () => root.remove(s), delay); };

  // ---------- efeito: arco de espada ----------
  function arcGeometry(r, w, arc, seg, rgbHead, rgbTail) {
    const P = [], C = [], I = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, a = (t - 0.5) * arc, taper = Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.04)), 0.7) * (0.35 + 0.65 * t), rw = w * taper;
      for (const s of [-0.5, 0.5]) { const rr = r + s * rw; P.push(Math.sin(a) * rr, (t - 0.5) * 0.12, Math.cos(a) * rr); }
      const al = Math.pow(t, 1.6), cc = [rgbTail[0] + (rgbHead[0] - rgbTail[0]) * t, rgbTail[1] + (rgbHead[1] - rgbTail[1]) * t, rgbTail[2] + (rgbHead[2] - rgbTail[2]) * t];
      C.push(cc[0], cc[1], cc[2], al * 0.15, cc[0], cc[1], cc[2], al);
      if (i < seg) { const k = i * 2; I.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 4)); g.setIndex(I); geos.add(g); return g;
  }
  function slash(o, cfg) {
    const { pos, dir, sc } = norm(o), color = o.color ?? cfg.color, core = cfg.core ?? 0xffffff, seg = 28, arc = (cfg.arc ?? 2.3), r = (cfg.r ?? 1.5) * sc, roll = o.roll ?? cfg.roll ?? -0.45, delay = o.delay || 0;
    const g = new THREE.Group(); g.position.copy(pos); g.rotation.y = Math.atan2(dir.x, dir.z); root.add(g);
    const inner = new THREE.Group(); inner.rotation.z = roll; g.add(inner);
    const g1 = arcGeometry(r, 0.55 * sc, arc, seg, rgb(color), rgb(mix(color, 0x000000, 0.3))), g2 = arcGeometry(r, 0.2 * sc, arc, seg, rgb(core), rgb(core));
    const m1 = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: ADD, depthWrite: false, side: THREE.DoubleSide }), m2 = m1.clone(); mats.add(m1); mats.add(m2);
    const a1 = mk(g1, m1, inner), a2 = mk(g2, m2, inner), tip = new V3(), sparks = cfg.sparks ?? color;
    act(0.45, (dt, k) => {
      const p = eo(k / 0.62), cnt = Math.floor(clamp01(p) * seg) * 6;
      g1.setDrawRange(0, cnt); g2.setDrawRange(0, cnt); const f = k < 0.62 ? 1 : 1 - (k - 0.62) / 0.38; m1.opacity = m2.opacity = f; inner.scale.setScalar(1 + 0.08 * k);
      if (k < 0.7) { const ang = (clamp01(p) - 0.5) * arc; tip.set(Math.sin(ang) * r, 0, Math.cos(ang) * r); g.updateMatrixWorld(true); inner.localToWorld(tip);
        for (let i = 0; i < 2; i++) fx.emit({ x: tip.x, y: tip.y, z: tip.z, vx: R(-1, 1), vy: R(0.2, 1.6) + (cfg.rise || 0), vz: R(-1, 1), life: R(0.25, 0.5), s0: 0.16 * sc, s1: 0, c0: sparks, c1: mix(sparks, 0x000000, 0.5), g: cfg.rise ? -1 : 2.5 }); }
    }, () => { root.remove(g); g1.dispose(); g2.dispose(); mats.delete(m1); mats.delete(m2); m1.dispose(); m2.dispose(); }, delay);
    if (cfg.glow) act(0.3, (dt, k) => {}, null, delay);
  }
  const SLASHES = { slash: { label: 'Corte de espada', color: 0xbfe0ff }, slash_fire: { label: 'Corte flamejante', color: 0xff6a1a, core: 0xffe0a0, sparks: 0xff9a3a, rise: 1.2 }, slash_ice: { label: 'Corte gélido', color: 0x6adfff, core: 0xeaffff, sparks: 0xbaf4ff }, slash_holy: { label: 'Corte sagrado', color: 0xffd86a, core: 0xffffff, sparks: 0xfff2b0 }, slash_dark: { label: 'Corte sombrio', color: 0x8a3aff, core: 0xe0b0ff, sparks: 0xb06aff }, slash_poison: { label: 'Corte venenoso', color: 0x7aff3a, core: 0xe8ffd0, sparks: 0xa0ff60 }, slash_lightning: { label: 'Corte elétrico', color: 0x7ab4ff, core: 0xffffff, sparks: 0xe0f0ff, arc: 2.0 } };

  // ---------- efeitos utilitários ----------
  function hit(o) { const { pos, sc } = norm(o), c = o.color ?? 0xffd27a; glowBall(pos, 0xffffff, 0.45 * sc, 0.16); glowBall(pos, c, 0.8 * sc, 0.26, 0.6);
    burst(fx, 18, () => { const v = radial(R(3, 8) * sc); return { x: pos.x, y: pos.y, z: pos.z, vx: v[0], vy: v[1], vz: v[2], life: R(0.2, 0.5), s0: 0.14 * sc, s1: 0, c0: 0xffffff, c1: c, g: 8, drag: 2 }; });
    const rm = bm(c, 0.9), s = mk(G.sphere, rm); s.position.copy(pos); s.scale.set(0.1, 0.1, 0.02); act(0.2, (dt, k) => { s.scale.setScalar(0.2 + 1.1 * sc * eo(k)); rm.opacity = 0.9 * (1 - k); }, () => root.remove(s)); shake(0.03 * sc, 0.12); }
  function explosion(o) { const { pos, sc } = norm(o), c = o.color ?? 0xff7a1a;
    glowBall(pos.clone().setY(pos.y + 0.4), 0xffffff, 1.6 * sc, 0.25); glowBall(pos.clone().setY(pos.y + 0.5), c, 2.6 * sc, 0.5, 0.7); ringFx(pos, c, 0.3, 4.5 * sc, 0.5, { op: 1 }); ringFx(pos, 0xffffff, 0.2, 3 * sc, 0.35, { op: 0.8 });
    burst(fx, 60, () => { const v = radial(R(2, 9) * sc, 2); return { x: pos.x, y: pos.y + 0.3, z: pos.z, vx: v[0], vy: Math.abs(v[1]) + 1, vz: v[2], life: R(0.4, 0.9), s0: R(0.5, 1.1) * sc, s1: 0.1, c0: 0xffe9a0, c1: c, a0: 1, a1: 0, g: -1.5, drag: 1.5 }; });
    burst(smoke, 18, () => { const v = radial(R(1, 3) * sc, 1.5); return { x: pos.x, y: pos.y + 0.3, z: pos.z, vx: v[0], vy: Math.abs(v[1]) + 0.8, vz: v[2], life: R(0.9, 1.6), s0: 0.7 * sc, s1: 2.2 * sc, c0: 0x4a3a30, c1: 0x15110e, a0: 0.55, a1: 0, g: -0.5, drag: 1.2 }; });
    burst(fx, 24, () => { const v = radial(R(6, 13) * sc, 3); return { x: pos.x, y: pos.y + 0.2, z: pos.z, vx: v[0], vy: Math.abs(v[1]) + 2, vz: v[2], life: R(0.4, 0.9), s0: 0.14 * sc, s1: 0, c0: 0xffd070, c1: 0xff3a0a, g: 14, drag: 0.6 }; }); shake(0.22 * sc, 0.45); }
  function projectile(o, kind) { const { pos, target, sc } = norm(o), c = o.color ?? kind.color, dist = pos.distanceTo(target), speed = o.speed || kind.speed, dur = Math.max(0.15, dist / speed);
    const core = bm(0xffffff, 1), halo = bm(c, 0.55), a = mk(G.sphere, core), b = mk(G.sphere, halo), d = target.clone().sub(pos);
    act(dur, (dt, k) => { const p = pos.clone().addScaledVector(d, k); if (kind.arc) p.y += Math.sin(Math.PI * k) * kind.arc; a.position.copy(p); b.position.copy(p); const pl = 1 + 0.2 * Math.sin(k * 60); a.scale.setScalar(kind.size * 0.55 * sc * pl); b.scale.setScalar(kind.size * 1.2 * sc * pl);
      for (let i = 0; i < 3; i++) fx.emit({ x: p.x + R(-0.1, 0.1), y: p.y + R(-0.1, 0.1), z: p.z + R(-0.1, 0.1), vx: R(-0.6, 0.6), vy: R(-0.3, 1), vz: R(-0.6, 0.6), life: R(0.25, 0.5), s0: kind.size * 0.7 * sc, s1: 0, c0: kind.trail0, c1: c, g: -1 });
      if (kind.smoke && rnd() < 0.5) smoke.emit({ x: p.x, y: p.y, z: p.z, vx: R(-0.3, 0.3), vy: R(0.2, 0.8), vz: R(-0.3, 0.3), life: 0.7, s0: 0.25 * sc, s1: 0.8 * sc, c0: 0x403028, c1: 0x15110e, a0: 0.4, a1: 0 }); },
      () => { root.remove(a); root.remove(b); if (o.onHit) o.onHit(target); kind.land(Object.assign({}, o, { pos: target, color: o.color })); }); }
  function iceBurst(o) { const { pos, sc } = norm(o), c = o.color ?? 0x7de8ff; ringFx(pos, c, 0.4, 3.2 * sc, 0.5); ringFx(pos, 0xffffff, 0.2, 2.2 * sc, 0.35, { op: 0.7 }); glowBall(pos.clone().setY(pos.y + 0.3), c, 1.4 * sc, 0.3, 0.6);
    const n = 11; for (let i = 0; i < n; i++) { const a = (i / n) * TAU + R(-0.2, 0.2), r = (i % 2 ? 0.9 : 1.7) * sc * R(0.8, 1.15), h = R(1.1, 2.2) * sc * (i % 2 ? 0.7 : 1), w = 0.28 * sc * R(0.8, 1.2), m = bm(c, 0.85), m2 = bm(0xffffff, 0.5), s = mk(G.cone, m), s2 = mk(G.cone, m2);
      s.position.set(pos.x + Math.cos(a) * r, pos.y, pos.z + Math.sin(a) * r); s2.position.copy(s.position); s.rotation.set(Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22); s2.rotation.copy(s.rotation);
      act(1.3, (dt, k) => { const up = k < 0.18 ? eo(k / 0.18) * 1.08 : 1.08 - 0.08 * sm((k - 0.18) / 0.1); const f = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1; s.scale.set(w, h * up, w); s2.scale.set(w * 0.45, h * up * 0.9, w * 0.45); m.opacity = 0.85 * f; m2.opacity = 0.5 * f; },
        () => { root.remove(s); root.remove(s2); burst(fx, 4, () => ({ x: s.position.x, y: pos.y + h * 0.5, z: s.position.z, vx: R(-2, 2), vy: R(1, 3), vz: R(-2, 2), life: 0.5, s0: 0.14 * sc, s1: 0, c0: 0xffffff, c1: c, g: 8 })); }, i * 0.025); }
    burst(fx, 40, () => ({ x: pos.x + R(-2, 2) * sc, y: pos.y + R(0, 0.4), z: pos.z + R(-2, 2) * sc, vx: R(-0.4, 0.4), vy: R(0.8, 3), vz: R(-0.4, 0.4), life: R(0.6, 1.2), s0: R(0.1, 0.22) * sc, s1: 0, c0: 0xffffff, c1: c, g: -0.5 })); shake(0.1 * sc, 0.25); }
  function bolt(a, b, color, width, jag) {
    const N = 16, ms = [0, 1, 2].map(() => new THREE.LineBasicMaterial({ color, transparent: true, blending: ADD, depthWrite: false })), gs = [0, 1, 2].map(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((N + 1) * 3), 3)); return g; });
    const ls = gs.map((g, i) => { const l = new THREE.Line(g, ms[i]); l.frustumCulled = false; root.add(l); return l; }); ms[1].color.setHex(0xffffff); ms[2].color.setHex(color);
    const dir = b.clone().sub(a), len = dir.length(), d = dir.clone().normalize(), n1 = new V3(-d.z, 0, d.x).normalize(), n2 = new V3().crossVectors(d, n1).normalize();
    const regen = () => { const pts = []; for (let i = 0; i <= N; i++) { const t = i / N, e = Math.sin(Math.PI * t) * jag * len * 0.05, p = a.clone().addScaledVector(dir, t); if (i > 0 && i < N) { p.addScaledVector(n1, R(-e, e)); p.addScaledVector(n2, R(-e, e)); } pts.push(p); }
      gs.forEach((g, gi) => { const ar = g.attributes.position.array; pts.forEach((p, i) => { ar[i * 3] = p.x + (gi === 2 ? width : gi === 0 ? -width : 0) * 0.04; ar[i * 3 + 1] = p.y; ar[i * 3 + 2] = p.z; }); g.attributes.position.needsUpdate = true; }); };
    regen(); return { regen, ms, dispose() { ls.forEach(l => root.remove(l)); gs.forEach(g => g.dispose()); ms.forEach(m => m.dispose()); } };
  }
  function lightning(o) { const { pos, target, sc } = norm(o), c = o.color ?? 0x8ac4ff, up = o.sky, a = up ? target.clone().add(new V3(R(-1, 1), 12, R(-1, 1))) : pos.clone(), b = target.clone(), main = bolt(a, b, c, 1.2 * sc, 1.6), br = [bolt(a.clone().lerp(b, 0.4), b.clone().add(new V3(R(-2, 2), 0, R(-2, 2))), c, 0.7, 2), bolt(a.clone().lerp(b, 0.6), b.clone().add(new V3(R(-2, 2), 0, R(-2, 2))), c, 0.7, 2)]; let last = 0;
    glowBall(b, 0xffffff, 1.0 * sc, 0.2); ringFx(b, c, 0.2, 2.2 * sc, 0.3); burst(fx, 14, () => { const v = radial(R(3, 7) * sc); return { x: b.x, y: b.y + 0.2, z: b.z, vx: v[0], vy: Math.abs(v[1]) + 1, vz: v[2], life: R(0.2, 0.5), s0: 0.12 * sc, s1: 0, c0: 0xffffff, c1: c, g: 9 }; }); shake(0.12 * sc, 0.25);
    act(0.4, (dt, k) => { last += dt; if (last > 0.05) { last = 0; main.regen(); br.forEach(x => x.regen()); } const f = k < 0.7 ? (0.6 + 0.4 * Math.sin(k * 90)) : 1 - (k - 0.7) / 0.3; main.ms.forEach(m => m.opacity = f); br.forEach(x => x.ms.forEach(m => m.opacity = f * 0.6)); }, () => { main.dispose(); br.forEach(x => x.dispose()); }); }
  function heal(o) { const { pos, sc } = norm(o), c = o.color ?? 0x6aff9a; for (let i = 0; i < 3; i++) ringFx(pos, c, 0.8 * sc, 0.8 * sc, 1.1, { y: 0.05, op: 0.8, delay: i * 0.18 });
    const bm_ = bm(c, 0.0), col = mk(G.cyl, bm_); col.position.copy(pos); act(1.4, (dt, k) => { col.scale.set(0.9 * sc * (1 - 0.3 * k), 3.2 * sc, 0.9 * sc * (1 - 0.3 * k)); bm_.opacity = 0.35 * Math.sin(Math.PI * k); const a = k * TAU * 3; if (rnd() < 0.9) for (let j = 0; j < 2; j++) { const aa = a + j * Math.PI; fx.emit({ x: pos.x + Math.cos(aa) * 0.8 * sc, y: pos.y + k * 2.6 * sc, z: pos.z + Math.sin(aa) * 0.8 * sc, vx: 0, vy: 0.8, vz: 0, life: 0.6, s0: 0.2 * sc, s1: 0, c0: 0xffffff, c1: c, g: -0.2 }); } }, () => root.remove(col)); glowBall(pos.clone().setY(pos.y + 0.8), c, 1.0 * sc, 0.5, 0.35); }
  function smite(o) { const { pos, sc } = norm(o), c = o.color ?? 0xffe08a, m = bm(0xffffff, 0.9), m2 = bm(c, 0.5), b = mk(G.cyl, m), b2 = mk(G.cyl, m2); b.position.copy(pos); b2.position.copy(pos); glowBall(pos.clone().setY(pos.y + 0.3), 0xffffff, 1.6 * sc, 0.35); ringFx(pos, c, 0.3, 3.4 * sc, 0.6); ringFx(pos, 0xffffff, 0.2, 2.2 * sc, 0.4);
    act(0.9, (dt, k) => { const w = k < 0.12 ? eo(k / 0.12) : 1 - sm((k - 0.12) / 0.88); b.scale.set(0.45 * sc * w + 0.02, 14, 0.45 * sc * w + 0.02); b2.scale.set(1.1 * sc * w + 0.02, 14, 1.1 * sc * w + 0.02); m.opacity = 0.9 * (1 - ei(k)); m2.opacity = 0.5 * (1 - k); if (k < 0.5) fx.emit({ x: pos.x + R(-0.8, 0.8) * sc, y: pos.y + R(0, 3), z: pos.z + R(-0.8, 0.8) * sc, vx: 0, vy: R(1, 3), vz: 0, life: 0.6, s0: 0.2 * sc, s1: 0, c0: 0xffffff, c1: c, g: -1 }); }, () => { root.remove(b); root.remove(b2); }); shake(0.18 * sc, 0.35); }
  let runeTex = null;
  function runeTexture() {
    if (runeTex) return runeTex; const doc = opts.document || (typeof document !== 'undefined' ? document : null); if (!doc) return null;
    const cv = doc.createElement('canvas'); cv.width = cv.height = 512; const x = cv.getContext('2d'); x.translate(256, 256); x.strokeStyle = '#fff'; x.fillStyle = '#fff'; x.lineCap = 'round';
    const circ = (r, w) => { x.lineWidth = w; x.beginPath(); x.arc(0, 0, r, 0, TAU); x.stroke(); }; circ(245, 5); circ(228, 2); circ(160, 3); circ(110, 2);
    for (let i = 0; i < 48; i++) { x.save(); x.rotate((i / 48) * TAU); x.lineWidth = i % 4 ? 2 : 4; x.beginPath(); x.moveTo(0, -228); x.lineTo(0, -(i % 4 ? 214 : 200)); x.stroke(); x.restore(); }
    for (let i = 0; i < 12; i++) { x.save(); x.rotate((i / 12) * TAU); x.lineWidth = 3; x.beginPath(); x.moveTo(-14, -196); x.lineTo(0, -178); x.lineTo(14, -196); x.moveTo(0, -178); x.lineTo(0, -166); x.moveTo(-8, -190); x.lineTo(8, -190); x.stroke(); x.restore(); }
    x.lineWidth = 4; for (const n of [5, 7]) { x.beginPath(); for (let i = 0; i <= n; i++) { const a = ((i * 2) % n) / n * TAU - Math.PI / 2, rr = n === 5 ? 160 : 110; i ? x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : x.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.stroke(); }
    x.beginPath(); x.arc(0, 0, 18, 0, TAU); x.fill(); runeTex = new THREE.CanvasTexture(cv); return runeTex;
  }
  function magicCircle(o) { const { pos, sc } = norm(o), c = o.color ?? 0xb06aff, t = runeTexture(), dur = o.duration || 2.2, m = bm(c, 0, t ? { map: t } : {}), m2 = bm(0xffffff, 0, t ? { map: t } : {}), a = mk(G.plane, m), b = mk(G.plane, m2);
    for (const p of [a, b]) { p.rotation.x = -Math.PI / 2; p.position.set(pos.x, pos.y + 0.04, pos.z); } b.position.y += 0.01; if (!t) { a.visible = b.visible = false; ringFx(pos, c, 2 * sc, 2 * sc, dur); }
    act(dur, (dt, k, tt) => { const f = k < 0.15 ? eo(k / 0.15) : k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1, s = 2.3 * sc * (0.6 + 0.4 * eo(k / 0.2)); a.scale.setScalar(s); b.scale.setScalar(s * 0.62); a.rotation.z = tt * 0.7; b.rotation.z = -tt * 1.4; m.opacity = 0.9 * f; m2.opacity = 0.35 * f;
      if (rnd() < 0.8) fx.emit({ x: pos.x + Math.cos(tt * 3) * R(0.5, 2) * sc, y: pos.y + 0.1, z: pos.z + Math.sin(tt * 3) * R(0.5, 2) * sc, vx: 0, vy: R(1, 2.5), vz: 0, life: 0.8, s0: 0.15 * sc, s1: 0, c0: 0xffffff, c1: c, g: -0.3 }); }, () => { root.remove(a); root.remove(b); }); }
  function aura(o) { const { pos, sc } = norm(o), c = o.color ?? 0xffd24a, dur = o.duration || 1.4; ringFx(pos, c, 0.5 * sc, 1.6 * sc, 0.7); ringFx(pos, c, 0.5 * sc, 1.6 * sc, 0.7, { delay: 0.35 });
    act(dur, (dt, k) => { const a = k * TAU * 4; for (let j = 0; j < 3; j++) { const aa = a + (j * TAU) / 3; fx.emit({ x: pos.x + Math.cos(aa) * 0.9 * sc, y: pos.y + k * 2.2 * sc, z: pos.z + Math.sin(aa) * 0.9 * sc, vx: 0, vy: 0.6, vz: 0, life: 0.5, s0: 0.18 * sc, s1: 0, c0: 0xffffff, c1: c, g: -0.2 }); } }); }
  function poison(o) { const { pos, sc } = norm(o), c = o.color ?? 0x6aff3a, dur = o.duration || 2.6; ringFx(pos, c, 0.3, 2.2 * sc, 0.6, { op: 0.5 });
    act(dur, (dt, k) => { const f = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1; for (let i = 0; i < 2; i++) { const a = R(0, TAU), r = Math.sqrt(rnd()) * 1.8 * sc; smoke.emit({ x: pos.x + Math.cos(a) * r, y: pos.y + 0.2, z: pos.z + Math.sin(a) * r, vx: R(-0.2, 0.2), vy: R(0.3, 0.8), vz: R(-0.2, 0.2), life: 1.4, s0: 0.5 * sc, s1: 1.4 * sc, c0: 0x2f7a22, c1: 0x15380f, a0: 0.5 * f, a1: 0 }); } if (rnd() < 0.5) fx.emit({ x: pos.x + R(-1.5, 1.5) * sc, y: pos.y + 0.2, z: pos.z + R(-1.5, 1.5) * sc, vx: 0, vy: R(0.8, 1.6), vz: 0, life: 0.9, s0: 0.14 * sc, s1: 0, c0: 0xd0ff90, c1: c, g: -0.5 }); }); }
  function whirlwind(o) { const { pos, sc } = norm(o), c = o.color ?? 0xcfe8ff, dur = o.duration || 1.2; ringFx(pos, c, 0.5 * sc, 3 * sc, 0.5);
    act(dur, (dt, k) => { for (let i = 0; i < 6; i++) { const h = rnd(), a = k * TAU * 5 + h * 9 + i, r = (0.6 + h * 1.6) * sc; fx.emit({ x: pos.x + Math.cos(a) * r, y: pos.y + 0.1 + h * 2.4 * sc, z: pos.z + Math.sin(a) * r, vx: -Math.sin(a) * 4, vy: 1.2, vz: Math.cos(a) * 4, life: 0.4, s0: 0.2 * sc, s1: 0, c0: 0xffffff, c1: c, g: 0 }); } if (rnd() < 0.4) smoke.emit({ x: pos.x + R(-1, 1) * sc, y: pos.y + 0.1, z: pos.z + R(-1, 1) * sc, vx: R(-1, 1), vy: R(0.2, 0.6), vz: R(-1, 1), life: 0.8, s0: 0.4 * sc, s1: 1.1 * sc, c0: 0x9a9488, c1: 0x504a42, a0: 0.3, a1: 0 }); }); shake(0.06 * sc, 0.4); }
  function slam(o) { const { pos, sc } = norm(o), c = o.color ?? 0xd8b070; ringFx(pos, 0xffffff, 0.3, 5.5 * sc, 0.4, { op: 0.9 }); ringFx(pos, c, 0.3, 4 * sc, 0.6, { delay: 0.05 }); glowBall(pos.clone().setY(pos.y + 0.2), 0xffffff, 1.2 * sc, 0.2);
    burst(smoke, 26, () => { const a = R(0, TAU), s = R(2, 7) * sc; return { x: pos.x, y: pos.y + 0.15, z: pos.z, vx: Math.cos(a) * s, vy: R(0.3, 1.4), vz: Math.sin(a) * s, life: R(0.7, 1.3), s0: 0.5 * sc, s1: 1.8 * sc, c0: 0x8a7a62, c1: 0x3a3228, a0: 0.6, a1: 0, drag: 2.2 }; });
    burst(fx, 26, () => { const a = R(0, TAU), s = R(3, 8) * sc; return { x: pos.x, y: pos.y + 0.1, z: pos.z, vx: Math.cos(a) * s, vy: R(3, 8), vz: Math.sin(a) * s, life: R(0.5, 1), s0: R(0.12, 0.25) * sc, s1: 0.05, c0: 0xffe0a0, c1: 0x8a6a40, g: 18, drag: 0.3 }; });
    const n = 9, ls = []; for (let i = 0; i < n; i++) { const a = (i / n) * TAU + R(-0.2, 0.2), len = R(2, 4.2) * sc, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([pos.x, pos.y + 0.06, pos.z, pos.x + Math.cos(a) * len, pos.y + 0.06, pos.z + Math.sin(a) * len], 3)); const m = new THREE.LineBasicMaterial({ color: 0x2a1c10, transparent: true }); const l = new THREE.Line(g, m); root.add(l); ls.push([l, g, m]); }
    act(1.2, (dt, k) => ls.forEach(([l, g, m]) => { m.opacity = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4; }), () => ls.forEach(([l, g, m]) => { root.remove(l); g.dispose(); m.dispose(); })); shake(0.35 * sc, 0.5); }
  function beam(o) { const { pos, target, sc } = norm(o), c = o.color ?? 0x6ad5ff, d = target.clone().sub(pos), len = d.length(), dn = d.clone().normalize(), m = bm(c, 0.6), m2 = bm(0xffffff, 0.95), a = mk(G.cyl, m), b = mk(G.cyl, m2), q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), dn);
    for (const p of [a, b]) { p.position.copy(pos); p.quaternion.copy(q); } glowBall(pos, c, 0.7 * sc, 0.8, 0.6);
    act(o.duration || 0.9, (dt, k) => { const w = (k < 0.1 ? k / 0.1 : k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1) * (1 + 0.12 * Math.sin(k * 120)); a.scale.set(0.34 * sc * w, len, 0.34 * sc * w); b.scale.set(0.12 * sc * w, len, 0.12 * sc * w); m.opacity = 0.6; for (let i = 0; i < 3; i++) fx.emit({ x: target.x, y: target.y, z: target.z, vx: R(-3, 3), vy: R(0, 4), vz: R(-3, 3), life: 0.4, s0: 0.16 * sc, s1: 0, c0: 0xffffff, c1: c, g: 6 }); if (rnd() < 0.5) fx.emit({ x: pos.x + dn.x * R(0, len), y: pos.y + dn.y * R(0, len), z: pos.z + dn.z * R(0, len), vx: R(-1, 1), vy: R(-1, 1), vz: R(-1, 1), life: 0.4, s0: 0.12 * sc, s1: 0, c0: 0xffffff, c1: c }); }, () => { root.remove(a); root.remove(b); }); glowBall(target, c, 1.1 * sc, 0.5, 0.7); shake(0.08 * sc, 0.8); }
  function levelUp(o) { const { pos, sc } = norm(o), c = o.color ?? 0xffd24a; ringFx(pos, c, 0.5, 3 * sc, 0.8, { op: 1 }); ringFx(pos, 0xffffff, 0.3, 2 * sc, 0.6, { delay: 0.2 }); glowBall(pos.clone().setY(pos.y + 1), 0xffffff, 1.6 * sc, 0.4);
    const m = bm(c, 0.0), col = mk(G.cyl, m); col.position.copy(pos);
    act(1.6, (dt, k) => { col.scale.set(1.1 * sc * (1 - 0.5 * k), 9 * eo(k * 3), 1.1 * sc * (1 - 0.5 * k)); m.opacity = 0.55 * (1 - ei(k)); const a = k * TAU * 4; for (let j = 0; j < 3; j++) { const aa = a + (j * TAU) / 3; fx.emit({ x: pos.x + Math.cos(aa) * 0.9 * sc, y: pos.y + k * 4 * sc, z: pos.z + Math.sin(aa) * 0.9 * sc, vx: 0, vy: 1.6, vz: 0, life: 0.8, s0: 0.22 * sc, s1: 0, c0: 0xffffff, c1: c, g: -0.3 }); } if (rnd() < 0.6) fx.emit({ x: pos.x + R(-1, 1) * sc, y: pos.y + R(0, 1), z: pos.z + R(-1, 1) * sc, vx: 0, vy: R(2, 5), vz: 0, life: 1.0, s0: 0.28 * sc, s1: 0, c0: 0xfff2b0, c1: c }); }, () => root.remove(col)); shake(0.05, 0.3); }
  function teleport(o) { const { pos, sc } = norm(o), c = o.color ?? 0xb06aff; ringFx(pos, c, 2.2 * sc, 0.2, 0.45, { op: 0.9 });
    act(0.45, (dt, k) => { for (let i = 0; i < 6; i++) { const a = R(0, TAU), r = 2 * sc * (1 - k) + 0.2; fx.emit({ x: pos.x + Math.cos(a) * r, y: pos.y + R(0, 2.2) * sc, z: pos.z + Math.sin(a) * r, vx: -Math.cos(a) * 4, vy: 0.5, vz: -Math.sin(a) * 4, life: 0.25, s0: 0.2 * sc, s1: 0, c0: 0xffffff, c1: c }); } },
      () => { glowBall(pos.clone().setY(pos.y + 1), 0xffffff, 1.8 * sc, 0.3); ringFx(pos, c, 0.3, 3.4 * sc, 0.5); burst(fx, 36, () => { const v = radial(R(3, 8) * sc, 2); return { x: pos.x, y: pos.y + 1, z: pos.z, vx: v[0], vy: v[1], vz: v[2], life: R(0.4, 0.8), s0: 0.2 * sc, s1: 0, c0: 0xffffff, c1: c, g: 2, drag: 1.5 }; }); }); }
  function shadow(o) { const { pos, sc } = norm(o), c = o.color ?? 0x8a3aff; ringFx(pos, c, 2.4 * sc, 0.3, 0.5);
    act(0.5, (dt, k) => { for (let i = 0; i < 5; i++) { const a = R(0, TAU), r = 2.2 * sc * (1 - k); smoke.emit({ x: pos.x + Math.cos(a) * r, y: pos.y + R(0.2, 1.6), z: pos.z + Math.sin(a) * r, vx: -Math.cos(a) * 3, vy: 0, vz: -Math.sin(a) * 3, life: 0.35, s0: 0.5 * sc, s1: 0.2, c0: 0x2a1450, c1: 0x0a0414, a0: 0.8, a1: 0 }); } },
      () => { glowBall(pos.clone().setY(pos.y + 1), c, 2 * sc, 0.4, 0.7); ringFx(pos, c, 0.3, 4 * sc, 0.6); burst(smoke, 30, () => { const v = radial(R(2, 6) * sc, 0.5); return { x: pos.x, y: pos.y + 1, z: pos.z, vx: v[0], vy: v[1], vz: v[2], life: R(0.7, 1.3), s0: 0.6 * sc, s1: 1.8 * sc, c0: 0x3a1c6a, c1: 0x0a0414, a0: 0.7, a1: 0, drag: 1.4 }; }); burst(fx, 20, () => { const v = radial(R(3, 7) * sc); return { x: pos.x, y: pos.y + 1, z: pos.z, vx: v[0], vy: v[1], vz: v[2], life: R(0.4, 0.8), s0: 0.16 * sc, s1: 0, c0: 0xe0b0ff, c1: c, drag: 1.2 }; }); shake(0.15 * sc, 0.3); }); }
  function shield(o) { const { pos, sc } = norm(o), c = o.color ?? 0x6ab4ff, dur = o.duration || 1.8, m = bm(c, 0.18), w = bm(0xffffff, 0.35, { wireframe: true }), s = mk(G.sphere, m), s2 = mk(G.sphere, w); s.position.set(pos.x, pos.y + 1.1 * sc, pos.z); s2.position.copy(s.position); ringFx(pos, c, 0.5, 1.8 * sc, 0.5);
    act(dur, (dt, k, t) => { const f = k < 0.1 ? eo(k / 0.1) : k > 0.85 ? 1 - (k - 0.85) / 0.15 : 1, p = 1 + 0.04 * Math.sin(t * 8); s.scale.setScalar(1.3 * sc * f * p); s2.scale.setScalar(1.32 * sc * f * p); s2.rotation.y = t * 0.8; m.opacity = (0.16 + 0.06 * Math.sin(t * 6)) * f; w.opacity = 0.35 * f; }, () => { root.remove(s); root.remove(s2); }); }
  function meteor(o) { const { pos, sc } = norm(o), c = o.color ?? 0xff6a1a, start = pos.clone().add(new V3(6 * sc, 16 * sc, 3 * sc)), delay = 0.7; const tm = bm(0xff3a2a, 0.0), tel = mk(G.ring, tm); tel.position.set(pos.x, pos.y + 0.06, pos.z);
    act(delay, (dt, k) => { tel.scale.set(3.4 * sc, 1, 3.4 * sc); tm.opacity = 0.35 + 0.4 * Math.sin(k * 30) * 0.5 + 0.3 * k; }, () => root.remove(tel));
    act(0.01, () => { }, () => projectile(Object.assign({}, o, { pos: start, target: pos, speed: 26 }), { color: c, trail0: 0xffe0a0, size: 1.0, speed: 26, smoke: true, land: e => explosion(Object.assign({}, e, { scale: 1.5 * sc })) }), delay); }
  function dmgText(o) { const { pos, sc } = norm(o), doc = opts.document || (typeof document !== 'undefined' ? document : null); if (!doc) return; const txt = String(o.text ?? '0'), col = '#' + ('000000' + (o.color ?? 0xffe08a).toString(16)).slice(-6);
    const cv = doc.createElement('canvas'); cv.width = 256; cv.height = 96; const x = cv.getContext('2d'); x.font = 'bold 64px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 10; x.strokeStyle = 'rgba(0,0,0,.85)'; x.strokeText(txt, 128, 50); x.fillStyle = col; x.fillText(txt, 128, 50);
    const tx = new THREE.CanvasTexture(cv), sm_ = new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, depthTest: false }), sp = new THREE.Sprite(sm_); sp.position.copy(pos); root.add(sp); sp.renderOrder = 999;
    act(o.duration || 0.9, (dt, k) => { sp.position.y = pos.y + 1.6 * eo(k) * sc; const s = (k < 0.15 ? 0.6 + 2.2 * k : 1) * (o.crit ? 1.6 : 1) * sc; sp.scale.set(2.2 * s, 0.82 * s, 1); sm_.opacity = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1; }, () => { root.remove(sp); sm_.dispose(); tx.dispose(); }); }
  function roar(o) { const { pos, sc } = norm(o), c = o.color ?? 0xff5a3a; for (let i = 0; i < 4; i++) ringFx(pos, c, 0.5 * sc, 7 * sc, 0.9, { y: 0.3 + i * 0.25, op: 0.7, thick: 1, delay: i * 0.12 }); burst(smoke, 22, () => { const a = R(0, TAU), s = R(4, 9) * sc; return { x: pos.x, y: pos.y + 0.2, z: pos.z, vx: Math.cos(a) * s, vy: R(0, 0.6), vz: Math.sin(a) * s, life: R(0.8, 1.4), s0: 0.6 * sc, s1: 2 * sc, c0: 0x8a7a62, c1: 0x3a3228, a0: 0.5, a1: 0, drag: 2 }; }); shake(0.4 * sc, 0.7); }

  const FX = {};
  for (const k in SLASHES) FX[k] = { label: SLASHES[k].label, group: 'Espada', fn: o => slash(o, SLASHES[k]) };
  FX.slash_cross = { label: 'Corte em X', group: 'Espada', fn: o => { slash({ ...o, roll: -0.8 }, SLASHES.slash_holy); slash({ ...o, roll: 0.8, delay: 0.14 }, SLASHES.slash_holy); } };
  FX.slash_triple = { label: 'Corte triplo', group: 'Espada', fn: o => [-0.9, 0, 0.9].forEach((r, i) => slash({ ...o, roll: r, delay: i * 0.1 }, SLASHES.slash_fire)) };
  FX.slash_spin = { label: 'Giro de espada', group: 'Espada', fn: o => { for (let i = 0; i < 3; i++) slash({ ...o, roll: 0, delay: i * 0.08, dir: new V3(Math.sin(i * 2.09), 0, Math.cos(i * 2.09)) }, { ...SLASHES.slash, arc: 3.4, r: 1.9 }); whirlwind({ ...o, color: 0xcfe8ff }); } };
  FX.hit = { label: 'Impacto', group: 'Espada', fn: hit };
  FX.hit_crit = { label: 'Impacto crítico', group: 'Espada', fn: o => { hit({ ...o, scale: (o.scale ?? 1) * 1.6, color: 0xff5a3a }); ringFx(V(o.pos), 0xffffff, 0.2, 3 * (o.scale ?? 1), 0.3, { y: 1 }); } };
  FX.fireball = { label: 'Bola de fogo', group: 'Magia', fn: o => projectile(o, { color: 0xff6a1a, trail0: 0xffe0a0, size: 0.5, speed: 13, smoke: true, land: explosion }) };
  FX.ice_bolt = { label: 'Lança de gelo', group: 'Magia', fn: o => projectile({ ...o, color: o.color ?? 0x7de8ff }, { color: 0x7de8ff, trail0: 0xffffff, size: 0.4, speed: 16, land: e => { ringFx(V(e.pos), 0x7de8ff, 0.3, 2 * (e.scale ?? 1), 0.4); hit({ ...e, color: 0x9ff0ff }); } }) };
  FX.arcane_bolt = { label: 'Míssil arcano', group: 'Magia', fn: o => projectile({ ...o, color: o.color ?? 0xb06aff }, { color: 0xb06aff, trail0: 0xf0d8ff, size: 0.35, speed: 18, arc: 0.8, land: e => hit({ ...e, color: 0xc89aff }) }) };
  FX.explosion = { label: 'Explosão', group: 'Magia', fn: explosion };
  FX.meteor = { label: 'Meteoro', group: 'Magia', fn: meteor };
  FX.ice_burst = { label: 'Estacas de gelo', group: 'Magia', fn: iceBurst };
  FX.lightning = { label: 'Relâmpago', group: 'Magia', fn: lightning };
  FX.lightning_sky = { label: 'Raio do céu', group: 'Magia', fn: o => lightning({ ...o, sky: true, target: o.pos }) };
  FX.beam = { label: 'Raio de energia', group: 'Magia', fn: beam };
  FX.shadow_burst = { label: 'Explosão sombria', group: 'Magia', fn: shadow };
  FX.poison_cloud = { label: 'Nuvem venenosa', group: 'Magia', fn: poison };
  FX.magic_circle = { label: 'Círculo mágico', group: 'Magia', fn: magicCircle };
  FX.heal = { label: 'Cura', group: 'Suporte', fn: heal };
  FX.smite = { label: 'Julgamento divino', group: 'Suporte', fn: smite };
  FX.aura = { label: 'Aura de buff', group: 'Suporte', fn: aura };
  FX.shield = { label: 'Escudo mágico', group: 'Suporte', fn: shield };
  FX.level_up = { label: 'Subir de nível', group: 'Suporte', fn: levelUp };
  FX.teleport = { label: 'Teleporte', group: 'Suporte', fn: teleport };
  FX.whirlwind = { label: 'Redemoinho', group: 'Físico', fn: whirlwind };
  FX.ground_slam = { label: 'Pancada no chão', group: 'Físico', fn: slam };
  FX.boss_roar = { label: 'Rugido de chefe', group: 'Físico', fn: roar };
  FX.damage_text = { label: 'Número de dano', group: 'Interface', fn: dmgText };

  function play(name, o = {}) { const e = FX[name]; if (!e) throw new Error('VFX desconhecido: ' + name); const before = actors.length; e.fn(o); return { name, cancel() { for (let i = before; i < actors.length; i++) actors[i].dead = true; } }; }
  function update(dt) {
    dt = Math.min(dt, 0.05);
    if (opts.renderer) { const s = opts.renderer.getSize ? opts.renderer.getSize(new THREE.Vector2()) : null; if (s) scaleU.value = s.y * 0.5 * (opts.renderer.getPixelRatio ? opts.renderer.getPixelRatio() : 1); }
    for (let i = actors.length - 1; i >= 0; i--) { const a = actors[i]; if (a.dead) { actors.splice(i, 1); a.clean && a.clean(); continue; } a.t += dt; if (a.t < 0) continue; const k = a.t / a.dur; if (k >= 1) { a.fn(dt, 1, a.t); actors.splice(i, 1); a.clean && a.clean(); } else a.fn(dt, k, a.t); }
    fx.update(dt); smoke.update(dt);
    if (shakeT > 0) { shakeT -= dt; const f = Math.max(0, shakeT / shakeDur) * shakeAmp; shakeOffset.set(R(-1, 1) * f, R(-1, 1) * f, R(-1, 1) * f); } else shakeOffset.set(0, 0, 0);
  }
  function clear() { for (const a of actors.splice(0)) a.clean && a.clean(); fx.clear(); smoke.clear(); shakeT = 0; shakeOffset.set(0, 0, 0); }
  function dispose() { clear(); [fx, smoke].forEach(p => { root.remove(p.pts); p.geo.dispose(); p.mat.dispose(); }); Object.values(G).forEach(g => g.dispose()); mats.forEach(m => m.dispose()); geos.forEach(g => g.dispose()); if (runeTex) runeTex.dispose(); scene.remove(root); }
  return { play, update, clear, dispose, shake, shakeOffset, effects: FX, list: () => Object.entries(FX).map(([id, e]) => ({ id, label: e.label, group: e.group })), stats: () => ({ actors: actors.length, particles: fx.alive + smoke.alive }), root };
}
