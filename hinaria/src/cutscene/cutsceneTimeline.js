/**
 * HINÁRIA — linha do tempo de cutscenes (pura: sem THREE/DOM; testável em Node).
 * Cena: { shots: [{ dur, a:{p,l}, b?:{p,l}, say?:{who,text}, title?:{big,small}, wait?:bool, dark?:bool }] }
 * - Tiros sem `wait` avançam sozinhos ao fim de `dur`.
 * - Tiros com `wait` fazem o movimento de câmera e ficam parados no fim, esperando "Continuar".
 */
export const ease = t => (t < 0 ? 0 : t > 1 ? 1 : t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function createRunner(scene) {
  return { scene, i: 0, t: 0, done: !scene || !scene.shots || !scene.shots.length, entered: -1 };
}
export const currentShot = r => (r.done ? null : r.scene.shots[r.i]);

/** Avança o relógio; devolve true se o tiro mudou (para a UI atualizar legenda/título). */
export function stepRunner(r, dt) {
  if (r.done) return false;
  const before = r.i;
  r.t += Math.max(0, Math.min(dt, 0.1));
  const s = r.scene.shots[r.i];
  if (!s.wait && r.t >= s.dur) nextShot(r);
  return r.i !== before || r.done;
}
function nextShot(r) { r.i++; r.t = 0; if (r.i >= r.scene.shots.length) r.done = true; }
/** Botão Continuar: sempre passa ao próximo tiro. */
export function advance(r) { if (!r.done) nextShot(r); }
/** Botão Pular. */
export function skip(r) { r.done = true; }

/** Pose da câmera (posição p, alvo l) interpolada com suavização. */
export function pose(r, out) {
  const s = currentShot(r);
  if (!s) return false;
  const k = ease(s.dur > 0 ? r.t / s.dur : 1), a = s.a, b = s.b || s.a;
  for (let n = 0; n < 3; n++) { out.p[n] = a.p[n] + (b.p[n] - a.p[n]) * k; out.l[n] = a.l[n] + (b.l[n] - a.l[n]) * k; }
  return true;
}
