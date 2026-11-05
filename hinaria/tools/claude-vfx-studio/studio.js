import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createVFX } from './vfx.js';

const canvas = document.getElementById('c'), renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0d1018); scene.fog = new THREE.Fog(0x0d1018, 18, 42);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100), camBase = new THREE.Vector3(7, 5.5, -8);
camera.position.copy(camBase);
const controls = new OrbitControls(camera, canvas); controls.target.set(0, 1.2, 3); controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.49;
scene.add(new THREE.HemisphereLight(0x9fb4e0, 0x2a2018, 0.7)); const sun = new THREE.DirectionalLight(0xffe7c0, 0.8); sun.position.set(6, 12, -4); sun.castShadow = true; scene.add(sun);
const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2c3a2a, roughness: 1 })); ground.receiveShadow = true; scene.add(ground);
scene.add(new THREE.GridHelper(40, 40, 0x3a4658, 0x232b38));
function dummy(color, scale = 1) { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 1.1, 12), m); b.position.y = 0.75; const h = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), m); h.position.y = 1.55;
  for (const x of [b, h]) x.castShadow = true; g.add(b, h); g.scale.setScalar(scale); scene.add(g); return g; }
const hero = dummy(0x477dc2), target = dummy(0xb0503a, 1.15); target.position.set(0, 0, 6);
const vfx = createVFX(THREE, scene, { renderer, maxParticles: 3000 });

const CAST = { fireball: 'ranged', ice_bolt: 'ranged', arcane_bolt: 'ranged', beam: 'ranged', lightning: 'ranged', hit: 'target', hit_crit: 'target', explosion: 'target', meteor: 'target', ice_burst: 'target', lightning_sky: 'target', smite: 'target', poison_cloud: 'target', shadow_burst: 'target', ground_slam: 'self', boss_roar: 'self', damage_text: 'targetHigh' };
let color = null, scale = 1, idx = 0, auto = false, autoT = 0;
function cast(id) {
  const mode = CAST[id] || 'self', face = new THREE.Vector3().subVectors(target.position, hero.position).setY(0).normalize(), o = { scale, dir: face };
  if (color !== null) o.color = color; hero.rotation.y = Math.atan2(face.x, face.z);
  if (mode === 'ranged') { o.pos = hero.position.clone().add(new THREE.Vector3(0, 1.4, 0)).addScaledVector(face, 0.6); o.target = target.position.clone().setY(1.3); }
  else if (mode === 'target') o.pos = target.position.clone();
  else if (mode === 'targetHigh') { o.pos = target.position.clone().setY(2.1); o.text = Math.floor(80 + Math.random() * 900); o.crit = Math.random() < 0.3; }
  else o.pos = id.startsWith('slash') ? hero.position.clone().setY(1.3).addScaledVector(face, 0.3) : hero.position.clone();
  vfx.play(id, o);
}
// UI
const list = vfx.list(), groups = [...new Set(list.map(e => e.group))], panel = document.getElementById('list');
for (const g of groups) { const h = document.createElement('h4'); h.textContent = g; panel.appendChild(h);
  for (const e of list.filter(x => x.group === g)) { const b = document.createElement('button'); b.textContent = e.label; b.dataset.id = e.id; b.onclick = () => { idx = list.findIndex(x => x.id === e.id); cast(e.id); }; panel.appendChild(b); } }
const q = id => document.getElementById(id);
q('scale').oninput = e => { scale = +e.target.value; q('sv').textContent = scale.toFixed(1) + '×'; };
q('color').oninput = e => { color = parseInt(e.target.value.slice(1), 16); q('usecolor').checked = true; }; q('usecolor').onchange = e => { if (!e.target.checked) color = null; else color = parseInt(q('color').value.slice(1), 16); };
q('auto').onclick = () => { auto = !auto; q('auto').classList.toggle('on', auto); }; q('clear').onclick = () => vfx.clear();
q('shot').onclick = () => renderer.domElement.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'hinaria_vfx.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); });
addEventListener('keydown', e => { if (e.key === 'ArrowRight') idx = (idx + 1) % list.length; else if (e.key === 'ArrowLeft') idx = (idx + list.length - 1) % list.length; else if (e.key === ' ') { e.preventDefault(); } else return; cast(list[idx].id); });
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let down = null;
canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', e => { if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return; const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); const h = ray.intersectObject(ground)[0]; if (h) target.position.copy(h.point).setY(0); });
function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); } addEventListener('resize', resize); resize();
// loop único
let last = performance.now(), fps = 60, acc = 0; const stats = q('stats'), basePos = new THREE.Vector3();
renderer.setAnimationLoop(now => {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; fps += (1 / Math.max(dt, 1e-3) - fps) * 0.05; controls.update();
  if (auto) { autoT -= dt; if (autoT <= 0) { autoT = 1.9; idx = (idx + 1) % list.length; cast(list[idx].id); } }
  vfx.update(dt); basePos.copy(camera.position); camera.position.add(vfx.shakeOffset); renderer.render(scene, camera); camera.position.copy(basePos);
  acc += dt; if (acc > 0.25) { acc = 0; const s = vfx.stats(), i = renderer.info.render; stats.textContent = `${list[idx].label} · FPS ${fps.toFixed(0)} · partículas ${s.particles} · atores ${s.actors} · draw calls ${i.calls} · tris ${i.triangles}`; }
});
cast(list[0].id);
