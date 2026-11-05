// World-layout and accessibility regression for Vilarrubra V4.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const src = readFileSync(new URL('./src/world/world.js', import.meta.url), 'utf8');
const a = src.indexOf('// Seeded random for reproducible world');
const b = src.indexOf('/**\n * Build Three.js meshes for the world');
const part = src.slice(a, b).replaceAll('export const ', 'const ').replaceAll('export function ', 'function ');
const state = { G:[], ZN:[], B:[], OB:[], CLR:[], HO:[], CH:[], LM:[], BRG:[], HS:[] };
const ctx = { CONFIG: { WORLD_SIZE: 64 }, gameState: state, console };
vm.createContext(ctx);
vm.runInContext(part + '\ngenerateWorld();', ctx);
assert.equal(state.G.length, 64);
assert.equal(state.HO.length, 8, 'eight actual village buildings');
assert.equal(state.LM.length, 17);
assert.equal(state.CH.length, 6);
assert.equal(state.B[13][15], 0, 'player spawn must remain free');
for(const [x,z,name] of [[17,9,'Bram'], [6,6,'Yoki'], [17,24,'south gate'], [24,15,'east gate'],[13,15,'square'],[22,46,'bandit camp'],[35,15,'bridge']]) {
  assert.equal(state.B[x][z],0, name+' tile is not blocked');
  assert.equal(state.RC[x*64+z],1,name+' is reachable from player');
}
let paved = 0;
for(let x=9;x<=18;x++) for(let z=12;z<=19;z++) if(state.G[x][z]===2) paved++;
assert.ok(paved>=55,'recognizable central civic square');
const treeCount=state.OB.filter(o=>o.t==='pine'||o.t==='oak').length;
assert.ok(treeCount>150,'forest still populated');
const markets=state.OB.filter(o=>o.t==='stall');
assert.equal(markets.length,2,'two market stalls retained');
console.log(`PASS V4: ${paved} paved square tiles, ${state.HO.length} varied houses, ${treeCount} trees, ${state.LM.length} landmarks, ${markets.length} stalls; all critical routes reachable.`);
