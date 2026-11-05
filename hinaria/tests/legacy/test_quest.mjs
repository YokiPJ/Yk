import { createQuestSystem } from './src/quest/questSystem.js';
import { QUESTS } from './src/quest/questData.js';
import assert from 'node:assert/strict';
const log=[],rew=[],disc=new Set();
const Q=createQuestSystem(QUESTS,{say:(h)=>log.push(h),reward:r=>rew.push(r),discovered:n=>disc.has(n)});
const norm=s=>s.toLowerCase();
// estado inicial
assert.equal(Q.status('c1_ratos'),'available');assert.equal(Q.status('c1_espelho'),'locked');assert.equal(Q.status('s1_minerio'),'locked');
assert.ok(Q.tracker()[0].isNew);
// Bram oferece e aceita
let r=Q.talk('bram','hi');assert.match(r,/ratos/);assert.equal(Q.status('c1_ratos'),'available');
r=Q.talk('yoki','hi');assert.equal(r,null); // Yoki sem missão ainda
r=Q.talk('bram','sim');assert.match(r,/4 ratos/);assert.equal(Q.status('c1_ratos'),'active');
// matar ratos / outros monstros não contam
Q.emit('kill',{k:'troll'});assert.equal(Q.tracker()[0].prog,'0/4');
for(let i=0;i<3;i++)Q.emit('kill',{k:'rat'});assert.equal(Q.tracker()[0].prog,'3/4');
Q.emit('kill',{k:'rat'});assert.ok(Q.has('estilhaco'));assert.equal(Q.tracker()[0].text.includes('Bram'),true);
// entrega
r=Q.talk('yoki','hi');assert.equal(r,null);
r=Q.talk('bram','hi');assert.match(r,/Por todos os martelos/);assert.equal(Q.status('c1_ratos'),'done');
assert.deepEqual(rew[0],{gold:40,xp:60});
assert.equal(Q.status('c1_espelho'),'available');assert.equal(Q.status('s1_minerio'),'available');
// Yoki: oferta, recusa, aceite
r=Q.talk('yoki','hi');assert.match(r,/Estilhaço/);r=Q.talk('yoki','nao');assert.match(r,/pressa/);
Q.talk('yoki','missao');r=Q.talk('yoki','sim');assert.match(r,/Mirante/);assert.equal(Q.status('c1_espelho'),'active');
// descoberta fora de ordem não conta; ordem correta sim
Q.emit('discover',{n:'Ponte Velha'});assert.match(Q.tracker().find(t=>t.title==='O Brilho no Espelho').text,/Mirante/);
Q.emit('discover',{n:'Mirante do Vale'});assert.match(Q.tracker().find(t=>t.title==='O Brilho no Espelho').text,/Ponte Velha/);
Q.emit('discover',{n:'Ponte Velha'});assert.match(Q.tracker().find(t=>t.title==='O Brilho no Espelho').text,/Conte a Yoki/);
// serialização e restauração no meio da missão
const snap=Q.serialize();const Q2=createQuestSystem(QUESTS,{});assert.ok(Q2.restore(snap));assert.equal(Q2.status('c1_espelho'),'active');assert.ok(Q2.has('estilhaco'));
assert.equal(Q2.restore('{"v":9}'),false);assert.equal(Q2.restore('lixo'),false);
// conclusão
r=Q.talk('yoki','hi');assert.match(r,/nível 5/);assert.equal(Q.status('c1_espelho'),'done');assert.ok(!Q.has('estilhaco'));
assert.deepEqual(rew[1],{gold:80,xp:90});
// secundária com descoberta prévia (auto-avanço)
disc.add('Acampamento Abandonado');Q.talk('bram','missao');Q.talk('bram','sim');
assert.match(Q.tracker().find(t=>t.title==='O Minério Perdido').text,/2 Bandidos/);
Q.emit('kill',{k:'bandit'});Q.emit('kill',{k:'bandit'});r=Q.talk('bram','hi');assert.match(r,/respeito/);
assert.equal(Q.status('s1_minerio'),'done');assert.equal(Q.markers().length,0);
// pendência cancelada ao falar de outra coisa
const Q3=createQuestSystem(QUESTS,{});Q3.talk('bram','hi');Q3.talk('bram','trade');assert.equal(Q3.talk('bram','sim'),null);
console.log('test_quest: todos os cenários passaram (',rew.length,'recompensas )');
