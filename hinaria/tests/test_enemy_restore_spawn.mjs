/** Actual production spawn eligibility: restoration relaxes distance only. */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {PART2_SPAWNS,part2SpawnTarget} from '../src/content/part2.js';

const source=readFileSync(new URL('../src/combat/combat.js',import.meta.url),'utf8');
const start=source.indexOf('export function spawnEnemy('),end=source.indexOf('/**\n * Create enemy mesh',start);
assert.ok(start>=0&&end>start,'production spawn function is extracted intact');
const state={W:96,P:{tx:13,tz:15},RC:new Uint8Array(96*96).fill(1),ZN:Array.from({length:96},()=>new Uint8Array(96).fill(5)),defeatedBosses:new Set()};
let blocked=false,progress={v:1,q:{},items:{},flags:{}},meshes=0;
const bindings={gameState:state,part2SpawnTarget,Q:{serialize:()=>JSON.stringify(progress)},Math,JSON,
  ri:(lo,hi)=>lo,occ:()=>blocked,
  enemyStatsForZone:(kind,zone)=>({name:zone.title||kind,hp:40,level:zone.level||1,boss:!!zone.boss}),
  createEnemyMesh(){meshes++;return {scale:{multiplyScalar(){}}};},registerEntity:enemy=>enemy};
const spawn=vm.runInNewContext(source.slice(start,end).replace('export ','')+'\nspawnEnemy',bindings);
const closeZone={k:'rat',n:1,x0:14,x1:14,z0:15,z1:15,zn:[5],level:1};
assert.equal(spawn('rat',closeZone),null,'ordinary spawning keeps the eight-tile safety distance');
assert.equal(meshes,0,'rejected candidates do not allocate meshes');
const restored=spawn('rat',closeZone,{restoring:true});
assert.ok(restored);assert.deepEqual([restored.tx,restored.tz],[14,15]);assert.equal(meshes,1);
blocked=true;assert.equal(spawn('rat',closeZone,{restoring:true}),null,'restoring cannot bypass physical collision');blocked=false;
state.RC[14*96+15]=0;assert.equal(spawn('rat',closeZone,{restoring:true}),null,'restoring cannot bypass reachability');state.RC[14*96+15]=1;
assert.equal(spawn('rat',{...closeZone,zn:[4]},{restoring:true}),null,'restoring cannot spawn on an incompatible biome');

const guardZone={...PART2_SPAWNS[0],x0:14,x1:14,z0:15,z1:15};
assert.equal(spawn('skeleton',guardZone,{restoring:true}),null,'restoring still respects the Part II quest gate');
progress.q.p2_vigilia={s:'active',step:0,n:1};
assert.ok(spawn('skeleton',guardZone,{restoring:true}),'remaining quest guard can be restored beside the player');
progress.q.p2_vigilia={s:'active',step:1,n:0};
assert.equal(spawn('skeleton',guardZone,{restoring:true}),null,'finished guard objective never recreates its encounter');

const bossZone={...PART2_SPAWNS[1],x0:14,x1:14,z0:15,z1:15};
progress.q.p2_ultima_voz={s:'active',step:0,n:0};assert.ok(spawn('troll',bossZone,{restoring:true}));
state.defeatedBosses.add('sentinela_eco');assert.equal(spawn('troll',bossZone,{restoring:true}),null,'restoring cannot recreate a historically defeated boss');
console.log('PASS production enemy restore: distance relaxation, collision/biome/reachability safety, Part II quest demand and defeated-boss gate.');
