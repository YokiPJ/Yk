/** Run the entire Part II quest chain through the real pure quest engine. */
import assert from 'node:assert/strict';
import {createQuestSystem} from '../src/quest/questSystem.js';
import {QUESTS} from '../src/quest/questData.js';
import {PART2_TITLE,PART2_LAYOUT,PART2_QUESTS,PART2_SPAWNS,PART2_BOSS_IDS,PART2_BOSS_VISUALS,part2SpawnTarget} from '../src/content/part2.js';

const data=[...QUESTS.filter(quest=>!PART2_QUESTS.some(part=>part.id===quest.id)),...PART2_QUESTS];
const discovered=new Set(),rewards=[],messages=[];
const Q=createQuestSystem(data,{level:()=>30,discovered:name=>discovered.has(name),reward:value=>rewards.push(value),say:message=>messages.push(message)});
const snapshot=()=>JSON.parse(Q.serialize());
const [guards,sentinel]=PART2_SPAWNS;
const demand=zone=>part2SpawnTarget(zone,snapshot());
const accept=(npc,id)=>{
  assert.equal(Q.status(id),'available');
  assert.equal(Q.talk(npc,'missao'),PART2_QUESTS.find(quest=>quest.id===id).offer);
  Q.talk(npc,'sim');assert.equal(Q.status(id),'active');
};
const discover=name=>{discovered.add(name);Q.emit('discover',{n:name});};

assert.equal(PART2_LAYOUT.title,PART2_TITLE);
assert.equal(PART2_LAYOUT.landmarks.length,3);assert.equal(PART2_LAYOUT.clearings.length,4);
assert.deepEqual(PART2_BOSS_IDS,['sentinela_eco']);assert.equal(PART2_BOSS_VISUALS.sentinela_eco,'troll_ancient');
assert.ok(PART2_LAYOUT.props.every(prop=>!['fire','torch','lamp'].includes(prop.t)),'new scenery adds no local lights');
for(const landmark of PART2_LAYOUT.landmarks){
  assert.ok(landmark.x>=PART2_LAYOUT.bounds.x0&&landmark.x<=PART2_LAYOUT.bounds.x1);
  assert.ok(landmark.z>=PART2_LAYOUT.bounds.z0&&landmark.z<=PART2_LAYOUT.bounds.z1);
}
assert.equal(Q.status('p2_passagem'),'locked','new campaign cannot bypass the original final quest');
assert.equal(demand(guards),0);assert.equal(demand(sentinel),0);

const completedOriginal=Object.fromEntries(['c1_ratos','c1_espelho','boss_troll','boss_orc'].map(id=>[id,{s:'done',step:data.find(quest=>quest.id===id).steps.length,n:0}]));
assert.equal(Q.restore(JSON.stringify({v:1,q:completedOriginal,items:{},flags:{}})),true);
assert.equal(Q.status('s1_minerio'),'available','old optional errands remain available');
assert.equal(rewards.length,0,'loading a completed original campaign does not replay rewards');
accept('yoki','p2_passagem');
assert.equal(Q.status('p2_vigilia'),'locked');assert.equal(demand(guards),0);
discover('Passagem das Brumas');discover('Observatório do Eco');
assert.equal(snapshot().q.p2_passagem.step,2);
Q.talk('yoki','hi');assert.equal(Q.status('p2_passagem'),'done');assert.equal(rewards.length,1);
const tracker=Q.tracker().find(item=>item.title===PART2_QUESTS[1].title);
assert.equal(tracker.part,2);assert.equal(tracker.chapter,6);
assert.equal(Q.journal().find(item=>item.id==='boss_orc').part,1,'original quest classification is preserved');

accept('bram','p2_vigilia');assert.equal(demand(guards),2);assert.equal(demand(sentinel),0);
assert.equal(part2SpawnTarget({...guards,region:'ardu'},snapshot()),0,'mismatched encounter region cannot request guards');
Q.emit('kill',{k:'skeleton',region:'ardu'});Q.emit('kill',{k:'skeleton'});Q.emit('kill',{k:'rat',region:'eco'});
assert.equal(snapshot().q.p2_vigilia.n,0,'other regions, missing region and wrong enemies cannot satisfy guards');
Q.emit('kill',{k:'skeleton',region:'eco'});assert.equal(demand(guards),1);
const saved=Q.serialize();
assert.equal(Q.restore(saved),true);assert.equal(demand(guards),1,'reload demands only the remaining guard');assert.equal(rewards.length,1);
Q.emit('kill',{k:'skeleton',region:'eco'});assert.equal(demand(guards),0,'completed kill stage never replenishes guards');
assert.equal(snapshot().q.p2_vigilia.step,1);
discover('Santuário da Última Voz');Q.talk('bram','hi');
assert.equal(Q.status('p2_vigilia'),'done');assert.equal(rewards.length,2);

accept('yoki','p2_ultima_voz');assert.equal(demand(sentinel),1);
Q.emit('kill',{k:'troll',bossId:'troll_ancient',region:'eco'});assert.equal(demand(sentinel),1,'original boss cannot substitute for the sentinela');
Q.emit('kill',{k:'troll',bossId:'sentinela_eco',region:'eco'});assert.equal(demand(sentinel),0);
assert.equal(Q.status('p2_ultima_voz'),'active','victory still requires the actual return dialogue');
assert.equal(Q.restore(Q.serialize()),true);assert.equal(demand(sentinel),0,'reload after victory cannot respawn the boss');
Q.talk('yoki','hi');assert.equal(Q.status('p2_ultima_voz'),'done');assert.equal(rewards.length,3);
assert.ok(messages.some(message=>message.includes('Parte II concluída')),'campaign has a clear conclusion');
assert.equal(Q.journal().find(item=>item.id==='p2_ultima_voz').part,2);
const totalGold=rewards.reduce((sum,reward)=>sum+(reward.gold||0),0);
for(let i=0;i<3;i++){Q.talk('yoki','hi');Q.talk('bram','hi');Q.emit('kill',{k:'troll',bossId:'sentinela_eco',region:'eco'});assert.equal(Q.restore(Q.serialize()),true);}
assert.equal(rewards.length,3);assert.equal(rewards.reduce((sum,reward)=>sum+(reward.gold||0),0),totalGold,'deliveries/reload never duplicate quest rewards');
assert.equal(demand(guards),0);assert.equal(demand(sentinel),0);
for(const malformed of [null,{}, {q:{p2_vigilia:{s:'active',step:-1,n:0}}}, {q:{p2_vigilia:{s:'active',step:99,n:0}}}])assert.equal(part2SpawnTarget(guards,malformed),0);
assert.equal(part2SpawnTarget({},snapshot()),0);
const original=createQuestSystem(data,{level:()=>30});original.start('c1_ratos');
for(let i=0;i<4;i++)original.emit('kill',{k:'rat',region:'anywhere'});
assert.equal(JSON.parse(original.serialize()).q.c1_ratos.step,1,'original kill quests still accept their original enemy globally');
console.log('PASS Part II: three sequential quests, original campaign gate, regional guards, exact spawn demand, return dialogues, save/restore and exactly-once rewards.');
