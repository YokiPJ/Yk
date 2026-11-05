import assert from 'node:assert/strict';
import { deriveHudState, ratio } from '../src/ui/hudData.js';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const classes = { kn: { n: 'Cavaleiro' }, pa: { n: 'Paladino' }, so: { n: 'Feiticeiro' }, dr: { n: 'Druida' }, yo: { n: 'Yoki' } };
const powers = Object.fromEntries(Object.keys(classes).map(cls => [cls, [0, 1, 2, 3].map(i => ({ n: `Poder ${i}`, mp: 15, cd: 10 }))]));
const table = { classes, powers, skins: [{}, { f: 2 }], armors: [{ n: 'Túnica', def: 0 }, { n: 'Couro', def: 1 }], weapon: { name: 'Arma equipada' } };
const player = { cls: 'kn', lv: 3, hp: 20, max: 100, mana: 14, mm: 60, xp: 75, gold: 12, ar: 1, sk: 0, cds: [4.5, 0, 0, 0], b: { guard: 3.2, haste: 0 }, st: { burn: 1.4 }, skillLevels: { kn: [1, 1, 1, 0] } };
const original = JSON.stringify(player);
const state = deriveHudState(player, table, 'Vilarrubra');
assert.equal(JSON.stringify(player), original, 'Reading HUD must not mutate gameplay state');
assert.equal(state.className, 'Cavaleiro'); assert.equal(state.lowHealth, true);
assert.equal(state.hpRatio, .2); assert.equal(state.mpRatio, 14 / 60); assert.equal(state.xpRatio, .5);
assert.equal(state.defense, 1); assert.equal(state.weapon, 'Arma equipada'); assert.equal(state.zone, 'Vilarrubra');
assert.deepEqual(state.status, [{ id: 'guard', label: 'Proteção', seconds: 4 }, { id: 'burn', label: 'Queimadura', seconds: 2 }]);
assert.equal(state.skills[0].cooldownRatio, .45); assert.equal(state.skills[0].disabled, true);
assert.equal(state.skills[1].disabled, true, 'Insufficient mana is unavailable');
assert.equal(state.skills[3].locked, true); assert.equal(state.skills[3].key, '5'); assert.equal(state.skills[3].id, 's4');
assert.equal(state.portrait, null, 'Do not show unrelated character art for default class appearances');
for (const cls of Object.keys(classes)) {
  const p = { ...player, cls, mana: 30, sk: 1, cds: [0, 0, 0, 0], skillLevels: { [cls]: [1, 1, 1, 2] } };
  const value = deriveHudState(p, table);
  assert.equal(value.className, classes[cls].n); assert.equal(value.skills[3].locked, false);
  assert.equal(value.skills[0].disabled, false); assert.equal(value.portrait, 'assets/ui/portrait_03.jpg');
}
assert.equal(deriveHudState(null), null);
assert.equal(ratio(2, 0), 0); assert.equal(ratio(NaN, 10), 0); assert.equal(ratio(-1, 10), 0); assert.equal(ratio(15, 10), 1);
assert.equal(deriveHudState({ ...player, hp: 0 }, table).skills[0].disabled, true);
// Exercise the real fog serializer, including corrupt-payload rejection and reset.
const source = readFileSync(new URL('../src/ui/hud.js', import.meta.url), 'utf8');
const start = source.indexOf('export function snapshotFog()');
const end = source.indexOf('/**\n * Reveal fog', start);
let bytes = new Uint8ClampedArray([6, 6, 10, 240, 6, 6, 10, 0, 6, 6, 10, 42, 6, 6, 10, 255]);
let reset = false;
const context = { getImageData: () => ({ data: bytes }), createImageData: () => ({ data: new Uint8ClampedArray(16) }), putImageData: image => { bytes = image.data; } };
const scope = { gameState: { W: 2 }, fogC: { getContext: () => context }, buildFogOfWar: () => { reset = true; }, lc: 0, lz: 0, mmT: 0 };
vm.createContext(scope); vm.runInContext(source.slice(start, end).replaceAll('export function ', 'function '), scope);
assert.deepEqual(Array.from(scope.snapshotFog()), [240, 0, 42, 255]);
assert.equal(scope.restoreFog([10, 20, 30, 40]), true);
assert.deepEqual(Array.from(scope.snapshotFog()), [10, 20, 30, 40]);
for (const corrupt of [[1], [1, 2, 3, 256], [1, 2, 3, -1], [1, 2, 3, 1.5], 'no']) assert.equal(scope.restoreFog(corrupt), false);
assert.equal(scope.restoreFog(null), true); assert.equal(reset, true);
// The first zero-delta frame must initialize UI without relying on telemetry's local scope.
const updateStart = source.indexOf('export function updateWorldUI(dt)');
const updateEnd = source.indexOf('/**\n * Project world position', updateStart);
const world = { gameState: { P: { x: 0, z: 0, tx: 0, tz: 0 }, ZN: [[0]], LM: [], CH: [], scene: { background: { copy() {} }, fog: { color: { copy() {} } } } },
  updateHudTelemetry() {}, revealFog() {}, say() {}, ATc: { lerp() {} }, ATG: [{}], ZNM: ['Vila'],
  CONFIG: { FOG_REVEAL_RADIUS: 3 }, lc: -1, lz: -1, zc: -1, exT: 0, mmT: 0, drawMinimap() {} };
vm.createContext(world); vm.runInContext(source.slice(updateStart, updateEnd).replace('export function ', 'function '), world);
assert.doesNotThrow(() => world.updateWorldUI(0), 'Boot frame must not depend on locals from updateHudTelemetry');
console.log('PASS upgrade HUD: real stats, five classes, mana/cooldown/unlocks, status, portrait mapping, immutable projection, fog roundtrip/corruption/reset.');
