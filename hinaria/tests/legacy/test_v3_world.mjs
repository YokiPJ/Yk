// Standalone procedural-world regression without graphics or network.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const src = readFileSync(new URL('./src/world/world.js', import.meta.url), 'utf8');
const begin = src.indexOf('// Seeded random for reproducible world');
const end = src.indexOf('/**\n * Build Three.js meshes for the world');
assert.ok(begin > 0 && end > begin);
const part = src.slice(begin, end)
    .replaceAll('export const ', 'const ')
    .replaceAll('export function ', 'function ');
const gs = { G: [], ZN: [], B: [], OB: [], CLR: [], HO: [], CH: [], LM: [], BRG: [], HS: [] };
const context = { CONFIG: { WORLD_SIZE: 64 }, gameState: gs, console };
vm.createContext(context);
vm.runInContext(part + '\ngenerateWorld();', context, { filename: 'world-generator' });
assert.equal(gs.G.length, 64);
assert.equal(gs.G[0].length, 64);
assert.equal(gs.RC.length, 4096);
assert.equal(gs.HG.length, 4225);
assert.equal(gs.LM.length, 17, 'all 17 landmarks retained');
assert.equal(gs.CH.length, 6, 'all six chests retained');
const important = [[13,15], [17,9], [6,6], [28,28], [35,15], [22,46], [50,12], [57,55]];
for (const [x,z] of important) {
  assert.equal(gs.B[x][z], 0, `essential tile ${x},${z} must remain walkable`);
  assert.equal(gs.RC[x*64+z], 1, `essential tile ${x},${z} must be reachable`);
}
// Each landmark must remain visitable from a reachable tile nearby.
for (const lm of gs.LM) {
  let reachable = false;
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
    const x = Math.round(lm.x) + dx, z = Math.round(lm.z) + dz;
    if (x >= 0 && z >= 0 && x < 64 && z < 64 && gs.RC[x*64+z]) reachable = true;
  }
  assert.ok(reachable, `landmark ${lm.n} still has a reachable approach`);
}
for(const o of gs.OB) assert.ok(Number.isFinite(o.x) && Number.isFinite(o.z));
console.log(`PASS: 64x64, ${gs.LM.length} landmarks, ${gs.CH.length} chests, ${gs.HO.length} houses, ${gs.OB.length} objects, essential tiles reachable`);
