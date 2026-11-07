import assert from 'node:assert/strict';
import { AttackAimController, findAttackEnemy } from '../src/combat/attackAim.js';

const P = { x:10, z:10, mesh:{rotation:{y:0}} };
const enemy = (x,z,extra={}) => ({kind:'m',hp:100,x,z,...extra});
const rear = enemy(10,9), front = enemy(10,11), side = enemy(11,10);
const state = {ents:[rear,front,side],B:[]};
assert.equal(findAttackEnemy(state,P,1),front,'facing breaks equal distance ties');
assert.equal(findAttackEnemy({...state,ents:[rear]},P,1),rear,'full circle acquisition');
assert.equal(findAttackEnemy({...state,ents:[side,rear]},P,1),side,'stable ties');
const nearer = enemy(10,9.5);
assert.equal(findAttackEnemy({...state,ents:[front,nearer]},P,1),nearer,'distance takes priority over facing');
assert.equal(findAttackEnemy(state,P,.5),null,'no extended attack range');
for (const invalid of [enemy(10,11,{hp:0}),enemy(10,11,{dead:true}),enemy(10,11,{_hinariaDeathProcessed:true}),
  enemy(10,11,{kind:'npc'}),enemy(NaN,11),enemy(10,Infinity),enemy(10,10),
  enemy(10,11,{mesh:{visible:false}}),enemy(10,11,{mesh:{parent:{visible:false}}}),null]) {
  assert.equal(findAttackEnemy({...state,ents:[invalid]},P,5),null,'invalid/hidden actors cannot be acquired');
}
for (const range of [0,-1,NaN,Infinity]) assert.equal(findAttackEnemy(state,P,range),null);
assert.equal(findAttackEnemy(state,null,2),null);
assert.equal(findAttackEnemy({},P,2),null);
const wall=[];wall[10]=[];wall[10][11]=1;
assert.equal(findAttackEnemy({ents:[enemy(10,12)],B:wall},P,4),null,'walls block acquisition');

const aim = new AttackAimController();
const x=P.x,z=P.z;
assert.equal(aim.begin({...state,ents:[rear]},P,2,1),rear);
assert.equal(P.mesh.rotation.y,Math.PI,'turns before striking');
assert.equal(P.x,x);assert.equal(P.z,z,'aim never translates player');
const live={ents:[rear,side],B:[]};
assert.equal(aim.begin(live,P,2,1),rear,'same combo swing holds its initial victim');
rear.x=9.8;
assert.equal(aim.facing(live,P),Math.atan2(rear.x-P.x,rear.z-P.z),'tracks a moving victim during a swing');
rear.hp=0;
assert.equal(aim.current(live,P),null);
assert.equal(aim.resolveImpact(live,P),side,'impact re-acquires when initial victim dies');
assert.equal(P.mesh.rotation.y,Math.PI/2);
live.ents=[];
assert.equal(aim.resolveImpact(live,P),null,'removed actors cannot receive ghost hits');
live.ents=[front];
assert.equal(aim.begin(live,P,2,2),front,'next combo step picks a fresh victim');
front.z=15;
assert.equal(aim.facing(live,P),null,'stop tracking enemies outside range');
assert.equal(aim.resolveImpact(live,P),null,'escaping before impact avoids damage');
front.z=12;live.B=wall;
assert.equal(aim.resolveImpact(live,P),null,'new obstruction before impact prevents damage');
aim.clear();
assert.equal(aim.facing(state,P),null,'no persistent lock between attacks');
assert.equal(aim.resolveImpact(state,P),null);
console.log('PASS attack aim: nearest, 360°, ties, visibility, range, walls, moving/dead/removed targets and per-swing lifetime.');
