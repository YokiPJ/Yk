import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import {PART2_SPAWNS,PART2_BOSS_VISUALS,part2SpawnTarget} from '../src/content/part2.js';
const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const combat = read('src/combat/combat.js');
const section = combat.slice(combat.indexOf('export const ENEMY_KINDS'), combat.indexOf('/**\n * Spawn an enemy'));
const code = section.replaceAll('export const ', 'const ').replace('export function ', 'function ');
const ctx = { Math, Error, PART2_SPAWNS, PART2_BOSS_VISUALS, part2SpawnTarget };
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
const originalBosses=boss.filter(zone=>!zone.activeQuest);
assert.equal(originalBosses.length,2,'the two original campaign bosses remain');
assert.deepEqual([...originalBosses.map(zone=>zone.bossId)].sort(),['orc_king','troll_ancient']);
const addedBosses=boss.filter(zone=>zone.activeQuest);
assert.equal(addedBosses.length,PART2_SPAWNS.filter(zone=>zone.boss).length);
assert.deepEqual([...addedBosses.map(zone=>zone.bossId)],['sentinela_eco']);
assert.equal(SPAWN_ZONES[SPAWN_ZONES.length-2],PART2_SPAWNS[0],'new zones are appended without shifting legacy save indices');
assert.equal(SPAWN_ZONES[SPAWN_ZONES.length-1],PART2_SPAWNS[1]);
assert.equal(addedBosses[0].activeQuest,'p2_ultima_voz');
assert.equal(addedBosses[0].region,'eco');
for(const b of boss){
  const x = enemyStatsForZone(b.k, b);
  assert.ok(x.boss && x.hp > enemyStatsForZone(b.k,{level:b.level}).hp * 2);
  assert.ok(x.level >= 10);
}
assert.match(combat,/Nv\. \${e.level}/);
assert.match(combat,/tag-boss/);
assert.match(read('src/core/loop.js'),/tickPerformance\(frameSeconds\)/);
assert.match(read('src/core/bootGame.js'),/initPerformanceUI\(\)/);
for(const p of ['assets/audio/ambiente-v79.mp3','assets/audio/boss-original-v79.mp3']) assert.ok(existsSync(new URL(p,root)),p);
for (const id of ['perf-open','perf-quality','perf-fps','perf-volume','perf-sound']) assert.match(read('index.html'),new RegExp('id="'+id+'"'));
console.log('PASS 1.0.7.9: boss level/scaling, starting rats balanced, zone spawns, UI settings, mobile/audio files');
