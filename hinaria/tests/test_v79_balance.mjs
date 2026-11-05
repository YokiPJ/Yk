import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const combat = read('src/combat/combat.js');
const section = combat.slice(combat.indexOf('export const ENEMY_KINDS'), combat.indexOf('/**\n * Spawn an enemy'));
const code = section.replaceAll('export const ', 'const ').replace('export function ', 'function ');
const ctx = { Math, Error };
vm.createContext(ctx);
vm.runInContext(code + ';this.api={ENEMY_KINDS, SPAWN_ZONES, enemyStatsForZone};', ctx);
const { ENEMY_KINDS, SPAWN_ZONES, enemyStatsForZone } = ctx.api;
const rat = enemyStatsForZone('rat', SPAWN_ZONES[0]);
assert.equal(rat.level, 1);
assert.equal(rat.hp, ENEMY_KINDS.rat.hp);
assert.equal(rat.dmg[0], ENEMY_KINDS.rat.dmg[0]);
const orc = enemyStatsForZone('orc', SPAWN_ZONES.find(z => z.k === 'orc' && z.level === 13));
assert.ok(orc.hp > ENEMY_KINDS.orc.hp);
assert.ok(orc.dmg[1] > ENEMY_KINDS.orc.dmg[1]);
for(const zone of SPAWN_ZONES){
  const stats = enemyStatsForZone(zone.k, zone);
  assert.ok(stats.hp >= 1 && stats.dmg.every(x=>x>=1));
  assert.ok(zone.n >= 1);
}
const boss = SPAWN_ZONES.filter(z => z.boss);
assert.equal(boss.length, 2);
for(const b of boss){
  const x = enemyStatsForZone(b.k, b);
  assert.ok(x.boss && x.hp > enemyStatsForZone(b.k,{level:b.level}).hp * 2);
  assert.ok(x.level >= 10);
}
assert.match(combat,/Nv\. \${e.level}/);
assert.match(combat,/tag-boss/);
assert.match(read('src/core/loop.js'),/tickPerformance\(frameSeconds\)/);
assert.match(read('src/main.js'),/initPerformanceUI\(\)/);
for(const p of ['assets/audio/ambiente-v79.mp3','assets/audio/boss-original-v79.mp3']) assert.ok(existsSync(new URL(p,root)),p);
for (const id of ['perf-open','perf-quality','perf-fps','perf-volume','perf-sound']) assert.match(read('index.html'),new RegExp('id="'+id+'"'));
console.log('PASS 1.0.7.9: boss level/scaling, starting rats balanced, zone spawns, UI settings, mobile/audio files');
