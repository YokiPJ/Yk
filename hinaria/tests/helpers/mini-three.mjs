// Duplo mínimo de Three.js só para testes de lógica em Node (não renderiza).
export class Vector3 { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; this.isVector3 = true; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } setScalar(s) { return this.set(s, s, s); } setY(y) { this.y = y; return this; } clone() { return new Vector3(this.x, this.y, this.z); } copy(v) { return this.set(v.x, v.y, v.z); }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; } sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; } addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
  lerp(v, t) { this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; this.z += (v.z - this.z) * t; return this; } lengthSq() { return this.x ** 2 + this.y ** 2 + this.z ** 2; } length() { return Math.sqrt(this.lengthSq()); }
  normalize() { const l = this.length() || 1; return this.set(this.x / l, this.y / l, this.z / l); } distanceTo(v) { return this.clone().sub(v).length(); }
  crossVectors(a, b) { return this.set(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x); } }
export class Vector2 { constructor(x = 0, y = 0) { this.x = x; this.y = y; } }
export class Quaternion { setFromUnitVectors() { return this; } copy() { return this; } }
class Rot { constructor() { this.x = this.y = this.z = 0; } set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } copy(r) { return this.set(r.x, r.y, r.z); } }
export class Object3D { constructor() { this.position = new Vector3(); this.scale = new Vector3(1, 1, 1); this.rotation = new Rot(); this.quaternion = new Quaternion(); this.children = []; this.visible = true; this.parent = null; this.name = ''; }
  add(o) { o.parent = this; this.children.push(o); return this; } remove(o) { const i = this.children.indexOf(o); if (i >= 0) this.children.splice(i, 1); return this; } updateMatrixWorld() { } localToWorld(v) { return v; } }
export class Group extends Object3D { } export class Mesh extends Object3D { constructor(g, m) { super(); this.geometry = g; this.material = m; } }
export class Points extends Mesh { } export class Line extends Mesh { } export class Sprite extends Mesh { }
export class BufferAttribute { constructor(a, n) { this.array = a; this.itemSize = n; this.count = a.length / n; this.needsUpdate = false; } } export class Float32BufferAttribute extends BufferAttribute { constructor(a, n) { super(new Float32Array(a), n); } }
export class BufferGeometry { constructor() { this.attributes = {}; this.index = null; this.drawRange = { start: 0, count: Infinity }; this.disposed = false; }
  setAttribute(n, a) { this.attributes[n] = a; return this; } setIndex(i) { this.index = i; return this; } setDrawRange(s, c) { this.drawRange = { start: s, count: c }; } rotateX() { return this; } translate() { return this; } dispose() { this.disposed = true; } }
const geo = n => class extends BufferGeometry { constructor(...a) { super(); this.args = a; this.kind = n; } };
export const SphereGeometry = geo('sphere'), RingGeometry = geo('ring'), CircleGeometry = geo('circle'), CylinderGeometry = geo('cyl'), ConeGeometry = geo('cone'), PlaneGeometry = geo('plane');
export class Color { constructor(c) { this.hex = c; } setHex(h) { this.hex = h; return this; } }
class Mat { constructor(o = {}) { Object.assign(this, o); this.opacity = o.opacity ?? 1; this.color = new Color(o.color); this.disposed = false; } clone() { return new this.constructor({ ...this }); } dispose() { this.disposed = true; } }
export class MeshBasicMaterial extends Mat { } export class ShaderMaterial extends Mat { } export class LineBasicMaterial extends Mat { } export class SpriteMaterial extends Mat { }
export class CanvasTexture { constructor(c) { this.canvas = c; } dispose() { } }
export const AdditiveBlending = 2, NormalBlending = 1, DoubleSide = 2;
