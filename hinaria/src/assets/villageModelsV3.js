/**
 * HINÁRIA · Modelos 3D da vila V3 (100% procedurais, sem arquivos novos).
 * Moinho (pás giram), celeiro, estábulo com cavalo, fonte (água animada), feno, bancos,
 * varal (panos balançam), lenha com machado e quadro de avisos.
 * Cada modelo é fundido em poucas malhas (1 por material); só as partes animadas ficam soltas.
 */
import * as THREE from 'three';
import { addSurface } from './hinariaTextures.js';

// ---------- Materiais (mesmas texturas do restante do jogo) ----------
const FALLBACK = { wood_planks: 0x9a6a3f, bark: 0x5a3b28, rock: 0x8a8d90, cave_rock: 0x5f666c, cobblestone: 0x8d8f8c,
  plaster: 0xe3d3b3, roof_tiles: 0xb74c35, thatch: 0xd7b45a, crate_wood: 0xa97b46, cloth_linen: 0xe2d4b6, cloth_white: 0xf3efe4,
  cloth_blue: 0x3f6aa6, cloth_crimson: 0xb23a3a, canopy_stripes: 0xc85a3c, metal_iron: 0x707980, metal_silver: 0xc0c8c8,
  metal_gold: 0xe0b93f, fur: 0x7a5538, foliage: 0x4f8a45 };
const matCache = new Map();
function M(surface, tint, o = {}) {
  const key = surface + '|' + tint + '|' + JSON.stringify(o);
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({ color: tint ?? FALLBACK[surface] ?? 0xffffff, roughness: o.rough ?? 0.86,
    metalness: o.metal ?? 0, flatShading: true, emissive: o.glow ?? 0x000000, transparent: !!o.alpha, opacity: o.alpha ?? 1 });
  if (surface) addSurface(m, surface, { normal: !o.alpha, strength: 0.18, neutral: tint == null });
  matCache.set(key, m); return m;
}
const wood = M('wood_planks'), woodL = M('wood_planks', 0xe8c89a), woodD = M('bark'), crate = M('crate_wood');
const stone = M('rock'), stoneD = M('cave_rock'), cobble = M('cobblestone'), plaster = M('plaster');
const roofRed = M('roof_tiles'), roofSlate = M('roof_tiles', 0x8e8a96), thatch = M('thatch'), hay = M('thatch', 0xe7c565);
const barnWall = M('wood_planks', 0xb04a38), barnRoof = M('roof_tiles', 0x6a564d);
const iron = M('metal_iron'), gold = M('metal_gold'), paper = M(null, 0xf3e3bd), dark = M(null, 0x20262b);
const water = M(null, 0x5dbfca, { rough: 0.15, metal: 0.1, glow: 0x0e3a40, alpha: 0.85 });

// ---------- Primitivas ----------
const put = (p, geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; p.add(o); return o; };
const box = (p, x, y, z, w, h, d, m) => put(p, new THREE.BoxGeometry(w, h, d), m, x, y, z);
const cyl = (p, x, y, z, rt, rb, h, m, n = 10) => put(p, new THREE.CylinderGeometry(rt, rb, h, n), m, x, y, z);
const cone = (p, x, y, z, r, h, m, n = 8) => put(p, new THREE.ConeGeometry(r, h, n), m, x, y, z);
const ell = (p, x, y, z, sx, sy, sz, m, n = 9) => { const o = put(p, new THREE.SphereGeometry(1, n, Math.max(6, n - 2)), m, x, y, z); o.scale.set(sx, sy, sz); return o; };
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
const UP = new THREE.Vector3(0, 1, 0);
function rod(p, a, b, r, m, n = 6) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va);
  const mid = va.clone().add(vb).multiplyScalar(0.5);
  const o = put(p, new THREE.CylinderGeometry(r, r, d.length(), n), m, mid.x, mid.y, mid.z);
  o.quaternion.setFromUnitVectors(UP, d.normalize()); return o;
}
function prism(p, pts, depth, m, x = 0, y = 0, z = 0) {
  const s = new THREE.Shape(); pts.forEach(([a, b], i) => (i ? s.lineTo(a, b) : s.moveTo(a, b))); s.closePath();
  return put(p, new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }), m, x, y, z - depth / 2);
}
const keep = g => { g.userData.keep = true; return g; };   // grupo animado: não entra na fusão

// ---------- Modelos ----------
function moinho(r, anims) {
  cyl(r, 0, 0.12, 0, 1.3, 1.4, 0.24, stoneD, 12);
  cyl(r, 0, 1.3, 0, 0.95, 1.2, 2.2, stone, 12);
  cyl(r, 0, 2.9, 0, 0.8, 0.95, 1.6, plaster, 12);
  for (const y of [2.3, 2.95, 3.55]) cyl(r, 0, y, 0, 0.9 - (y - 2.1) * 0.09, 0.93 - (y - 2.1) * 0.09, 0.09, woodD, 12);
  cone(r, 0, 4.25, 0, 1.08, 1.0, thatch, 12);
  box(r, 0, 0.62, 1.16, 0.58, 1.1, 0.1, woodD); box(r, 0, 1.22, 1.16, 0.5, 0.12, 0.1, woodD); box(r, 0, 0.1, 1.45, 0.9, 0.2, 0.4, stoneD);
  for (const [x, z, ry] of [[0, 0.9, 0], [0.9, 0, Math.PI / 2], [-0.9, 0, Math.PI / 2]]) { const w = box(r, x, 3.0, z, 0.3, 0.42, 0.08, dark); w.rotation.y = ry; }
  const hub = keep(grp(r, 0, 3.75, 1.15));
  cyl(hub, 0, 0, -0.1, 0.07, 0.07, 0.7, woodD, 8).rotation.x = Math.PI / 2;
  ell(hub, 0, 0, 0.12, 0.2, 0.2, 0.2, iron);
  for (let k = 0; k < 4; k++) {
    const arm = grp(hub, 0, 0, 0.08); arm.rotation.z = (k * Math.PI) / 2;
    box(arm, 0, 1.05, 0, 0.13, 2.1, 0.1, wood);
    box(arm, 0.34, 1.35, 0.03, 0.55, 1.4, 0.03, M('cloth_linen'));
    for (const y of [0.7, 1.1, 1.5, 1.9]) box(arm, 0.34, y, 0.05, 0.57, 0.04, 0.03, woodD);
  }
  anims.push(t => { hub.rotation.z = t * 0.45; });
}

function celeiro(r) {
  const w = 3.6, d = 2.7, h = 1.9, rise = 1.15, y0 = 0.2;
  box(r, 0, 0.1, 0, w + 0.2, 0.2, d + 0.2, stoneD);
  prism(r, [[-w / 2, 0], [w / 2, 0], [w / 2, h], [0, h + rise], [-w / 2, h]], d, barnWall, 0, y0, 0);
  const th = Math.atan2(rise, w / 2), len = Math.hypot(w / 2, rise) + 0.28;
  for (const s of [-1, 1]) { const p = box(r, s * (w / 4 + 0.1), y0 + h + rise / 2 - 0.02, 0, len, 0.13, d + 0.5, barnRoof); p.rotation.z = -s * th; }
  box(r, 0, y0 + h + rise + 0.05, 0, 0.26, 0.1, d + 0.55, woodD);
  const z = d / 2 + 0.03;
  for (const x of [-0.5, 0.5]) box(r, x, y0 + 0.78, z, 0.96, 1.56, 0.08, wood);
  for (const sx of [-1, 1]) { rod(r, [sx * 0.97, y0, z + 0.05], [sx * 0.03, y0 + 1.55, z + 0.05], 0.035, plaster); rod(r, [sx * 0.03, y0, z + 0.05], [sx * 0.97, y0 + 1.55, z + 0.05], 0.035, plaster); }
  box(r, 0, y0 + 1.6, z, 2.1, 0.1, 0.1, plaster); for (const x of [-1.03, 1.03]) box(r, x, y0 + 0.8, z, 0.1, 1.6, 0.1, plaster);
  box(r, 0, y0 + h + 0.3, z, 0.72, 0.62, 0.06, dark); box(r, 0, y0 + h + 0.14, z + 0.04, 0.56, 0.22, 0.06, hay);
  box(r, 0, y0 + h + rise - 0.05, d / 2 + 0.32, 0.1, 0.1, 0.7, woodD); cyl(r, 0, y0 + h + rise - 0.14, d / 2 + 0.6, 0.07, 0.07, 0.1, iron, 8).rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) { box(r, s * (w / 2 + 0.02), y0 + 1.15, 0, 0.06, 0.5, 0.5, dark); box(r, s * (w / 2 + 0.03), y0 + 1.15, 0, 0.05, 0.6, 0.06, plaster); }
  for (const [x, zz, ry] of [[-1.5, d / 2 + 0.5, 0.2], [-0.9, d / 2 + 0.55, -0.1]]) { const b = box(r, x, 0.22, zz, 0.7, 0.4, 0.45, hay); b.rotation.y = ry; }
  box(r, 1.4, 0.3, d / 2 + 0.5, 0.6, 0.6, 0.6, crate);
}

function horse(p, x, z, yaw) {
  const g = grp(p, x, 0, z); g.rotation.y = yaw; const fur = M('fur', 0x7a5538);
  ell(g, 0, 0.8, 0, 0.55, 0.3, 0.27, fur, 10);
  for (const [dx, dz] of [[-0.36, 0.11], [-0.36, -0.11], [0.36, 0.11], [0.36, -0.11]]) { cyl(g, dx, 0.35, dz, 0.045, 0.06, 0.7, fur, 6); box(g, dx, 0.03, dz, 0.1, 0.07, 0.1, dark); }
  rod(g, [0.4, 0.9, 0], [0.74, 1.28, 0], 0.11, fur, 8);
  ell(g, 0.88, 1.3, 0, 0.2, 0.11, 0.1, fur, 8).rotation.z = -0.4;
  for (const dz of [-0.06, 0.06]) cone(g, 0.78, 1.46, dz, 0.035, 0.12, fur, 4);
  rod(g, [0.42, 1.02, 0], [0.7, 1.36, 0], 0.045, dark); rod(g, [-0.52, 0.9, 0], [-0.7, 0.45, 0], 0.05, dark);
}
function estabulo(r) {
  const w = 3.2, d = 2.2;
  box(r, 0, 0.08, 0, w + 0.1, 0.16, d + 0.1, stoneD);
  box(r, 0, 0.98, -d / 2 + 0.06, w, 1.7, 0.12, wood);
  box(r, -w / 2 + 0.06, 0.98, 0, 0.12, 1.7, d, wood);
  box(r, w / 2 - 0.06, 0.5, 0, 0.12, 0.8, d, wood);
  for (const x of [-w / 2 + 0.1, 0, w / 2 - 0.1]) box(r, x, 1.0, d / 2 - 0.08, 0.14, 1.7, 0.14, woodD);
  for (const y of [0.45, 0.95]) box(r, -w / 4, y, d / 2 - 0.08, w / 2 - 0.2, 0.08, 0.08, woodL);
  box(r, 0, 0.6, -0.1, 0.08, 1.0, d - 0.4, wood);
  const roof = box(r, 0, 2.08, 0.02, w + 0.6, 0.13, d + 0.7, roofSlate); roof.rotation.x = 0.2;
  box(r, 0.8, 0.5, -d / 2 + 0.3, 1.0, 0.3, 0.3, woodD); ell(r, 0.85, 0.2, 0.25, 0.5, 0.2, 0.4, hay);
  horse(r, -0.8, 0.05, -Math.PI / 2 + 0.25);
  box(r, 1.9, 0.35, 0.9, 0.5, 0.7, 0.5, crate);
}

function fonte(r, anims) {
  cyl(r, 0, 0.22, 0, 1.18, 1.25, 0.44, cobble, 8); cyl(r, 0, 0.47, 0, 1.28, 1.28, 0.08, stone, 8);
  const pool = put(r, new THREE.CylinderGeometry(1.06, 1.06, 0.04, 16), water, 0, 0.4, 0);
  cyl(r, 0, 0.85, 0, 0.2, 0.28, 0.8, stone, 10); cyl(r, 0, 1.38, 0, 0.64, 0.26, 0.2, stone, 12);
  const bowl = put(r, new THREE.CylinderGeometry(0.56, 0.56, 0.03, 14), water, 0, 1.46, 0);
  cyl(r, 0, 1.72, 0, 0.1, 0.14, 0.45, stone, 8); ell(r, 0, 2.02, 0, 0.17, 0.2, 0.17, stone);
  const fx = keep(grp(r)); const ringMats = [];
  for (let i = 0; i < 2; i++) {
    const mt = new THREE.MeshBasicMaterial({ color: 0xcff4f8, transparent: true, opacity: 0.6 }); ringMats.push(mt);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.014, 6, 28), mt); ring.rotation.x = Math.PI / 2; ring.position.y = 0.43; fx.add(ring); ring.userData.i = i;
  }
  const dropGeo = new THREE.SphereGeometry(0.035, 5, 4), dropMat = new THREE.MeshBasicMaterial({ color: 0xdff8fb, transparent: true, opacity: 0.85 });
  const drops = []; for (let i = 0; i < 10; i++) { const d = new THREE.Mesh(dropGeo, dropMat); fx.add(d); drops.push(d); }
  anims.push(t => {
    pool.position.y = 0.4 + Math.sin(t * 1.4) * 0.008; bowl.position.y = 1.46 + Math.sin(t * 1.9) * 0.006;
    fx.children.forEach(c => { if (c.userData.i === undefined) return; const k = (t * 0.45 + c.userData.i * 0.5) % 1; c.scale.setScalar(0.25 + k * 0.85); ringMats[c.userData.i].opacity = 0.6 * (1 - k); });
    drops.forEach((d, i) => { const k = (t * 0.8 + i / drops.length) % 1, a = i * 2.4; d.position.set(Math.cos(a) * (0.08 + k * 0.5), 2.0 - k * k * 0.55, Math.sin(a) * (0.08 + k * 0.5)); });
  });
}

function feno(r) {
  for (const [x, z, s] of [[-0.6, 0.1, 1], [0.45, -0.25, 0.75]]) { cyl(r, x, 0.3 * s, z, 0.5 * s, 0.62 * s, 0.6 * s, hay, 10); cone(r, x, 0.85 * s, z, 0.5 * s, 0.55 * s, hay, 10); cone(r, x, 1.2 * s, z, 0.08 * s, 0.2 * s, thatch, 6); }
  for (const [x, z, ry] of [[0.3, 0.7, 0.3], [-0.5, -0.8, -0.2], [0.95, 0.35, 0.8]]) {
    const b = grp(r, x, 0.2, z); b.rotation.y = ry; box(b, 0, 0, 0, 0.7, 0.4, 0.45, hay); for (const dx of [-0.2, 0.2]) box(b, dx, 0, 0, 0.04, 0.42, 0.47, woodD);
  }
  rod(r, [1.1, 0.05, -0.4], [0.9, 1.5, -0.55], 0.03, wood); box(r, 0.9, 1.52, -0.55, 0.16, 0.05, 0.05, iron);
}

function banco(r) {
  for (const x of [-0.7, 0.7]) { box(r, x, 0.22, 0, 0.12, 0.44, 0.42, stone); box(r, x, 0.62, -0.18, 0.08, 0.5, 0.08, woodD); box(r, x, 0.62, 0.0, 0.08, 0.05, 0.4, woodD); }
  for (const z of [-0.12, 0.12]) box(r, 0, 0.47, z, 1.8, 0.07, 0.2, wood);
  box(r, 0, 0.74, -0.2, 1.8, 0.16, 0.05, wood); box(r, 0, 0.9, -0.2, 1.8, 0.14, 0.05, wood);
}

function varal(r, anims) {
  for (const x of [-1.15, 1.15]) { box(r, x, 0.8, 0, 0.1, 1.6, 0.1, woodD); box(r, x, 0.04, 0, 0.32, 0.08, 0.32, stone); }
  rod(r, [-1.15, 1.5, 0], [1.15, 1.45, 0], 0.014, dark, 4);
  const mats = [M('cloth_white'), M('cloth_blue'), M('cloth_crimson'), M('cloth_linen')], sw = [];
  for (let i = 0; i < 4; i++) {
    const g = keep(grp(r, -0.78 + i * 0.52, 1.47 - i * 0.012, 0));
    box(g, 0, -0.27, 0, 0.42, i % 2 ? 0.4 : 0.55, 0.025, mats[i]); box(g, -0.15, 0.0, 0, 0.03, 0.06, 0.04, woodL); box(g, 0.15, 0.0, 0, 0.03, 0.06, 0.04, woodL); sw.push(g);
  }
  anims.push(t => sw.forEach((g, i) => { g.rotation.x = Math.sin(t * 1.7 + i * 0.9) * 0.14; g.rotation.z = Math.sin(t * 1.2 + i) * 0.04; }));
}

function lenha(r) {
  for (let row = 0; row < 4; row++) for (let c = 0; c < 5 - row; c++) {
    const lg = cyl(r, 0, 0.12 + row * 0.19, -0.42 + c * 0.21 + row * 0.105, 0.098, 0.098, 1.4, woodD, 8); lg.rotation.z = Math.PI / 2;
    const cap = cyl(r, 0.71, 0.12 + row * 0.19, -0.42 + c * 0.21 + row * 0.105, 0.085, 0.085, 0.02, woodL, 8); cap.rotation.z = Math.PI / 2;
  }
  for (const [x, z] of [[-0.78, -0.55], [-0.78, 0.55], [0.78, -0.55], [0.78, 0.55]]) box(r, x, 0.5, z, 0.08, 1.0, 0.08, woodD);
  const roof = box(r, 0, 1.04, 0, 1.9, 0.07, 1.5, woodD); roof.rotation.x = 0.12;
  cyl(r, 1.45, 0.22, 0.25, 0.28, 0.3, 0.44, woodD, 10); rod(r, [1.42, 0.45, 0.25], [1.62, 0.8, 0.25], 0.025, wood); box(r, 1.38, 0.5, 0.25, 0.18, 0.12, 0.04, iron);
  for (const [x, z, ry] of [[1.2, -0.3, 0.4], [1.75, 0.55, -0.6]]) { const lg = cyl(r, x, 0.1, z, 0.09, 0.09, 0.5, woodD, 8); lg.rotation.z = Math.PI / 2; lg.rotation.y = ry; }
}

function quadro(r) {
  for (const x of [-0.75, 0.75]) { box(r, x, 0.9, 0, 0.12, 1.8, 0.12, woodD); box(r, x, 0.05, 0, 0.34, 0.1, 0.34, stone); }
  box(r, 0, 1.15, 0, 1.7, 0.95, 0.06, wood); box(r, 0, 1.66, 0.03, 1.82, 0.08, 0.1, woodD); box(r, 0, 0.66, 0.03, 1.82, 0.08, 0.1, woodD);
  for (const s of [-1, 1]) { const p = box(r, s * 0.5, 1.9, 0, 1.15, 0.07, 0.6, roofRed); p.rotation.z = -s * 0.35; }
  for (const [x, y, ry, w, h] of [[-0.5, 1.2, 0.06, 0.4, 0.5], [0.05, 1.28, -0.05, 0.38, 0.42], [0.55, 1.12, 0.1, 0.36, 0.5], [-0.05, 0.9, -0.08, 0.5, 0.26]]) {
    const pg = box(r, x, y, 0.045, w, h, 0.012, paper); pg.rotation.z = ry; ell(r, x, y + h / 2 - 0.05, 0.06, 0.025, 0.025, 0.02, M(null, 0xb23a3a), 5);
  }
}

const BUILDERS = { moinho, celeiro, estabulo, fonte, feno, banco, varal, lenha, quadro };
export const VILLAGE_V3_IDS = Object.keys(BUILDERS);

// ---------- Fusão de geometria (1 malha por material; partes animadas ficam soltas) ----------
function inKeep(o, root) { for (let p = o.parent; p && p !== root; p = p.parent) if (p.userData.keep) return true; return false; }
function merge(geos) {
  const a = { position: [], normal: [], uv: [] };
  for (const g of geos) for (const k of Object.keys(a)) { const at = g.getAttribute(k); if (!at) return null; for (let i = 0; i < at.array.length; i++) a[k].push(at.array[i]); }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.Float32BufferAttribute(a.position, 3)); m.setAttribute('normal', new THREE.Float32BufferAttribute(a.normal, 3)); m.setAttribute('uv', new THREE.Float32BufferAttribute(a.uv, 2));
  return m;
}
function batch(root) {
  root.updateMatrixWorld(true);
  const lists = new Map();
  root.traverse(o => { if (!o.isMesh || o.material.transparent || inKeep(o, root)) return; (lists.get(o.material) || lists.set(o.material, []).get(o.material)).push(o); });
  for (const [material, meshes] of lists) {
    if (meshes.length < 2) continue;
    const geos = meshes.map(m => { let g = m.geometry.clone(); g.applyMatrix4(m.matrixWorld); if (g.index) { const n = g.toNonIndexed(); g.dispose(); g = n; } return g; });
    const merged = merge(geos); geos.forEach(g => g.dispose()); if (!merged) continue;
    const mesh = new THREE.Mesh(merged, material); mesh.castShadow = false; mesh.receiveShadow = true; mesh.name = 'VillageV3Batched';
    for (const o of meshes) { o.parent.remove(o); o.geometry.dispose(); }
    root.add(mesh);
  }
  return root;
}

// ---------- Animação ----------
const live = new Set(); let clock = 0;
export function updateVillageModelsV3(dt) {
  if (!live.size) return; clock += dt;
  for (const r of live) if (r.visible) for (const fn of r.userData.anims) fn(clock);
}

export function createVillageModelV3(id) {
  const build = BUILDERS[id]; if (!build) return null;
  const root = new THREE.Group(), anims = [];
  build(root, anims); batch(root);
  root.name = 'HINARIA_V3_' + id; root.userData.environmentId = id;
  if (anims.length) { root.userData.anims = anims; live.add(root); }
  return root;
}

// ---------- Posicionamento automático (só em terreno livre; sólidos bloqueiam as células) ----------
const ROADS = [[[13, 14], [12, 11], [11, 8], [11, 7]], [[15, 15], [18, 15], [21, 15], [24, 15]], [[16, 17], [17, 20], [17, 23], [17, 25]], [[11, 14], [8, 12], [7, 10], [6, 7]]];
const PROTECTED = [[13, 15, 3.4], [17, 9, 2.2], [6, 6, 2.2], [17, 12, 1.2], [17, 15, 1.3], [17, 18, 1.2], [17, 23, 1.2], [21, 15, 1.2], [24, 15, 1.2], [7, 9, 1.2], [10, 14, 1.2]];
const LOW_DECOR = new Set(['flower', 'flowerbed', 'tuft', 'basket', 'sack', 'planter', 'lantern', 'sign']);
function segDist(px, pz, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / l2));
  return Math.hypot(px - (a[0] + t * dx), pz - (a[1] + t * dz));
}
const roadDist = (x, z) => Math.min(...ROADS.flatMap(l => l.slice(1).map((p, i) => segDist(x, z, l[i], p))));

function fits(gs, x, z, hw, hd, yaw, solid) {
  const W = gs.G.length, R = Math.max(hw, hd), c = Math.cos(yaw), s = Math.sin(yaw);
  if (x - R < 1 || z - R < 1 || x + R > W - 2 || z + R > W - 2) return false;
  if (roadDist(x, z) < (solid ? R + 1.0 : R + 0.5)) return false;
  for (let cx = Math.floor(x - R); cx <= Math.ceil(x + R); cx++) for (let cz = Math.floor(z - R); cz <= Math.ceil(z + R); cz++) {
    const lx = (cx - x) * c - (cz - z) * s, lz = (cx - x) * s + (cz - z) * c;
    if (Math.abs(lx) > hw + 0.3 || Math.abs(lz) > hd + 0.3) continue;
    if (gs.B[cx]?.[cz]) return false;
    if (solid ? gs.G[cx][cz] !== 0 : ![0, 1, 2].includes(gs.G[cx][cz])) return false;
  }
  for (const o of gs.OB) { if (!solid && LOW_DECOR.has(o.t)) continue; if (Math.hypot(o.x - x, o.z - z) < R + 0.5 + (o.t === 'oak' || o.t === 'pine' ? 0.3 : 0)) return false; }
  for (const h of gs.HO) if (Math.abs(h.x - x) < h.w / 2 + R && Math.abs(h.z - z) < h.d / 2 + R) return false;
  if (solid) for (const [a, b, rr] of PROTECTED) if (Math.hypot(x - a, z - b) < rr + R * 0.5) return false;
  return true;
}
function blockCells(gs, x, z, hw, hd, yaw) {
  const R = Math.max(hw, hd), c = Math.cos(yaw), s = Math.sin(yaw);
  for (let cx = Math.floor(x - R); cx <= Math.ceil(x + R); cx++) for (let cz = Math.floor(z - R); cz <= Math.ceil(z + R); cz++) {
    const lx = (cx - x) * c - (cz - z) * s, lz = (cx - x) * s + (cz - z) * c;
    if (Math.abs(lx) <= hw + 0.3 && Math.abs(lz) <= hd + 0.3 && gs.B[cx]) gs.B[cx][cz] = 1;
  }
}

// near = onde se prefere; rad = raio de busca; hw/hd = meia-largura/profundidade já na escala final
const PLAN = [
  { id: 'moinho', s: 0.85, solid: 1, hw: 1.2, hd: 1.2, near: [5, 23], rad: 5 },
  { id: 'celeiro', s: 0.8, solid: 1, hw: 1.5, hd: 1.1, near: [24.5, 24.5], rad: 5 },
  { id: 'estabulo', s: 0.8, solid: 1, hw: 1.4, hd: 1.0, near: [25, 9], rad: 5 },
  { id: 'fonte', s: 0.8, solid: 1, hw: 1.1, hd: 1.1, near: [13, 19.8], rad: 4 },
  { id: 'feno', s: 0.8, hw: 0.9, hd: 0.9, near: [22, 22.5], rad: 3 },
  { id: 'feno', s: 0.7, hw: 0.9, hd: 0.9, near: [5, 16.2], rad: 3 },
  { id: 'banco', s: 0.85, hw: 0.8, hd: 0.3, near: [13 + 3.6 * Math.cos(2.6), 15 + 3.6 * Math.sin(2.6)], rad: 1.5 },
  { id: 'banco', s: 0.85, hw: 0.8, hd: 0.3, near: [13 + 3.6 * Math.cos(0.5), 15 + 3.6 * Math.sin(0.5)], rad: 1.5 },
  { id: 'banco', s: 0.85, hw: 0.8, hd: 0.3, near: [13 + 3.6 * Math.cos(4.0), 15 + 3.6 * Math.sin(4.0)], rad: 1.5 },
  { id: 'varal', s: 0.8, hw: 1.0, hd: 0.3, near: [6.5, 19.5], rad: 3 },
  { id: 'varal', s: 0.8, hw: 1.0, hd: 0.3, near: [24.5, 13.5], rad: 3 },
  { id: 'lenha', s: 0.85, hw: 1.1, hd: 0.7, near: [7.5, 12.8], rad: 3 },
  { id: 'lenha', s: 0.85, hw: 1.1, hd: 0.7, near: [20.2, 13.4], rad: 3 },
  { id: 'quadro', s: 0.85, hw: 0.9, hd: 0.3, near: [16.4, 12.9], rad: 2.5 }
];

/** gs = gameState; place(root,x,z,yaw,scale) adiciona à cena. Retorna a lista do que foi posto. */
export function buildVillageDressingV3(gs, place) {
  const placed = [];
  PLAN.forEach((p, idx) => {
    const cands = [];
    for (let dx = -p.rad; dx <= p.rad; dx += 0.5) for (let dz = -p.rad; dz <= p.rad; dz += 0.5) cands.push([p.near[0] + dx, p.near[1] + dz, Math.hypot(dx, dz)]);
    cands.sort((a, b) => a[2] - b[2]);
    for (const [x, z] of cands) {
      const yaw = Math.atan2(13 - x, 15 - z) + (p.id === 'feno' ? idx : 0);
      if (!fits(gs, x, z, p.hw, p.hd, yaw, !!p.solid)) continue;
      const root = createVillageModelV3(p.id); if (!root) break;
      place(root, x, z, yaw, p.s);
      if (p.solid) blockCells(gs, x, z, p.hw, p.hd, yaw);
      placed.push(`${p.id}@${x.toFixed(1)},${z.toFixed(1)}`);
      break;
    }
  });
  return placed;
}
