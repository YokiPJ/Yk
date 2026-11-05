import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CombatV2Controller, COMBAT_V2_CONFIG, FEATURE_FLAGS, isKnightCombatV2, setCombatV2Enabled } from '../src/combat/combatV2.js';

const step = (c,seconds,cb=()=>{})=>{for(let i=0;i<Math.round(seconds/.01);i++)c.tick(.01,cb);};

test('Combate 2.0 ligado inicialmente e isolado ao Cavaleiro com espada',()=>{
  assert.equal(FEATURE_FLAGS.ENABLE_COMBAT_V2,true);
  assert.equal(FEATURE_FLAGS.ENABLE_ENEMY_AI_V2,false);
  assert.equal(FEATURE_FLAGS.ENABLE_WORLD_EVENTS_V1,false);
  assert.equal(FEATURE_FLAGS.ENABLE_SKILL_PROGRESSION_V2,false);
  setCombatV2Enabled(true);
  assert.equal(isKnightCombatV2({cls:'kn'}, {kind:'sword'}),true);
  assert.equal(isKnightCombatV2({cls:'pa'}, {kind:'sword'}),false);
  assert.equal(isKnightCombatV2({cls:'kn'}, {kind:'staff'}),false);
  setCombatV2Enabled(false);
});

test('combinação 1-2-3 registra apenas 1 evento de impacto por swing',()=>{
  const c = new CombatV2Controller();
  const hits = [];
  assert.equal(c.requestAttack(),true);
  step(c,.17,(s,i)=>hits.push(i));
  assert.deepEqual(hits,[0]);
  assert.equal(c.requestAttack(),true); // buffer válido nos últimos 250ms
  step(c,.20,(s,i)=>hits.push(i));
  assert.equal(c.stepIndex,1);
  step(c,.22,(s,i)=>hits.push(i));
  assert.equal(c.requestAttack(),true);
  step(c,.22,(s,i)=>hits.push(i));
  assert.equal(c.stepIndex,2);
  step(c,.61,(s,i)=>hits.push(i));
  assert.deepEqual(hits,[0,1,2]);
  assert.equal(c.state,'idle');
});

test('spam no startup não cria ataques extras e não duplica hit',()=>{
  const c=new CombatV2Controller(); let hits=0;
  c.requestAttack();
  assert.equal(c.requestAttack(),false);
  step(c,.08,()=>hits++);
  assert.equal(c.requestAttack(),false);
  step(c,.35,()=>hits++);
  assert.equal(hits,1);
});

test('combo volta ao primeiro golpe após timeout',()=>{
  const c=new CombatV2Controller();
  c.requestAttack();step(c,.36);
  assert.equal(c.state,'idle');
  step(c,1.0);
  c.requestAttack();
  assert.equal(c.stepIndex,0);
});

test('esquiva consome stamina, i-frames finitos, cooldown e regeneração',()=>{
  const c=new CombatV2Controller();
  assert.equal(c.requestDodge(1,0),true);
  assert.equal(c.stamina,100-28);
  assert.equal(c.requestDodge(1,0),false);
  step(c,.06);assert.equal(c.invulnerable,false);
  step(c,.08);assert.equal(c.invulnerable,true);
  step(c,.15);assert.equal(c.invulnerable,false);
  step(c,.13);assert.equal(c.state,'idle');
  assert.equal(c.dodgeCooldown>0,true);
  assert.equal(c.requestDodge(1,0),false);
  step(c,.60);
  assert.equal(c.requestDodge(0,-1),true);
});

test('esquiva cancela recuperação, não startup/active, e aborta ao colidir',()=>{
  const c=new CombatV2Controller();c.requestAttack();
  assert.equal(c.requestDodge(1,0),false);
  step(c,.25);
  assert.equal(c.requestDodge(1,0),true);
  c.abortDodgeOnCollision();
  assert.equal(c.state,'idle');
  assert.equal(c.invulnerable,false);
  assert.equal(c.dodgeCooldown>0,true);
});

test('reset ao pausar elimina invulnerabilidade sem alterar stamina',()=>{
  const c=new CombatV2Controller();c.requestDodge(1,0);step(c,.12);
  const sta=c.stamina;
  c.resetActions();
  assert.equal(c.state,'idle');assert.equal(c.invulnerable,false);assert.equal(c.stamina,sta);
});

test('delta em segundo é limitado: aba em background não salta janelas',()=>{
  const c=new CombatV2Controller();c.requestAttack();c.tick(10);
  assert.equal(c.state,'attack_startup');
  assert.equal(c.elapsed,.05);
});
