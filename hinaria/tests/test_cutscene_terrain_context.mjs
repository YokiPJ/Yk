import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameState } from '../src/core/gameState.js';
import { clearBossView } from '../src/cutscene/cameraOcclusion.js';

// Production height sampling with a generated, fully initialized height grid.
gameState.W=64;
gameState.G=Array.from({length:64},()=>Array(64).fill(0));
gameState.HG=new Float32Array(65*65);
for (let i=0;i<gameState.HG.length;i++) gameState.HG[i]=.2;
// Force the exact path that previously crashed: camera-ray intersects a rock.
const blocked=[{t:'rock',x:6,z:10,s:1.2}];
const originalCamera=[12,3,10],boss=[2,1,10];
const terrainHeight=(x,z)=>gameState.getHeightAt(x,z);
const adjusted=clearBossView(originalCamera,boss,blocked,terrainHeight);
assert.equal(adjusted.length,3);
assert(adjusted.every(Number.isFinite));
assert.notDeepEqual(adjusted, originalCamera,'rock must force height sampling and adjusted view');
assert(Math.abs(gameState.getHeightAt(6,10)-.2)<1e-5);

// Original callback was unbound and should fail in strict JS modules when dereferencing HG.
assert.throws(()=>clearBossView(originalCamera,boss,blocked,gameState.getHeightAt),TypeError);
const src=readFileSync(new URL('../src/cutscene/cutsceneSystem.js',import.meta.url),'utf8');
assert(src.includes('const cinematicTerrainHeight = (x, z) => gameState.getHeightAt(x, z);'));
assert(src.includes('clearBossView(P3.p, P3.l, gameState.OB || [], cinematicTerrainHeight)'));
console.log('PASS: camera obstruction with real GameState height method and safe binding');
