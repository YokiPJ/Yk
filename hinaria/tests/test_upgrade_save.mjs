import assert from 'node:assert/strict';
import {SAVE_KEY,BACKUP_KEY,SCHEMA_VERSION,validateSave,writeSave,readSave,getSaveInfo} from '../src/core/saveManager.js';

const memory = () => {
  const data = new Map();
  return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),data};
};
const sample = (cls='kn') => ({
  schemaVersion:SCHEMA_VERSION,timestamp:'2026-11-05T15:00:00.000Z',identity:{name:'Viajante'},
  player:{cls,sk:0,ar:1,x:13.5,z:15,rotation:1.4,hp:77,max:100,mana:30,mm:40,lv:3,xp:11,gold:123,
    cds:[0,1.2,0,8],rc:3,ownedWeapons:[`${cls}_basic`,`${cls}_replay_axe`],equippedWeapons:{[cls]:`${cls}_replay_axe`},skillLevels:{[cls]:[1,2,3,1]}},
  world:{discovered:['Vilarrubra'],chests:['14:17'],defeatedBosses:['orc_king'],fog:Array.from({length:9216},(_,i)=>i%256)},
  quests:{v:1,q:{boss_orc:{s:'done',step:1,n:0}},items:{estilhaco:1},flags:{boss:true}},
  lore:['origem'],settings:{quality:'medium'}
});
let checks=0;
const check=(label,fn)=>{fn();checks++;console.log(`PASS ${label}`);};

for (const cls of ['kn','pa','so','dr','yo']) check(`round trip ${cls}: progress, equipment, quests, boss and exploration`,()=>{
  const storage=memory(),snapshot=sample(cls);
  storage.setItem('hinaria.v7.arsenal.v1','legacy-arsenal');
  storage.setItem('hinaria.quests.exploration.v2','legacy-quests');
  assert.equal(writeSave(snapshot,storage).ok,true);
  const restored=readSave(storage);
  assert.equal(restored.ok,true);
  assert.deepEqual(restored.data,snapshot);
  assert.equal(restored.source,'primary');
  assert.equal(getSaveInfo(storage).valid,true);
  assert.equal(storage.getItem('hinaria.v7.arsenal.v1'),'legacy-arsenal');
  assert.equal(storage.getItem('hinaria.quests.exploration.v2'),'legacy-quests');
});
check('detached snapshots do not alias runtime objects',()=>{
  const source=sample(),result=validateSave(source);
  result.data.player.gold=0;
  assert.equal(source.player.gold,123);
});
check('missing and corrupt saves never enable Continue',()=>{
  const storage=memory();
  assert.equal(getSaveInfo(storage).valid,false);
  storage.setItem(SAVE_KEY,'{');
  assert.equal(readSave(storage).ok,false);
  assert.equal(getSaveInfo(storage).valid,false);
});
check('unknown schema is rejected without modifying storage',()=>{
  const storage=memory(),bad=sample();bad.schemaVersion=2;
  storage.setItem(SAVE_KEY,'original');
  assert.equal(writeSave(bad,storage).ok,false);
  assert.equal(storage.getItem(SAVE_KEY),'original');
});
for (const [label,mutate] of [
  ['infinite health',s=>s.player.hp=Infinity],['NaN position',s=>s.player.x=NaN],
  ['negative position',s=>s.player.z=-1],['outside world',s=>s.player.x=96],
  ['health beyond maximum',s=>s.player.hp=101],['mana beyond maximum',s=>s.player.mana=41],
  ['unknown class',s=>s.player.cls='xx'],['negative gold',s=>s.player.gold=-1],
  ['bad skill levels',s=>s.player.skillLevels.kn=[1,1,1,99]],['bad quests',s=>s.quests.q.boss_orc.step=-1],
  ['bad boss identifiers',s=>s.world.defeatedBosses=['unknown']],['bad fog data',s=>s.world.fog=[999]],['incomplete fog dimensions',s=>s.world.fog=[0,1,255]],
  ['functions',s=>s.player.runtime=()=>1],['engine objects',s=>s.player.runtime=new Date()],
  ['cyclic references',s=>s.player.runtime=s],['missing identity',s=>delete s.identity],
  ['invalid timestamp',s=>s.timestamp='yesterday'],['bad cooldown count',s=>s.player.cds=[0]],
  ['invalid house world coordinate',s=>s.house={x:96,z:15,px:0,pz:0,heading:0}],
  ['invalid house interior coordinate',s=>s.house={x:13,z:15,px:3,pz:0,heading:0}],
  ['negative awakening duration',s=>s.player.axeAwakeRemaining=-1],
  ['invalid camera yaw',s=>s.player.cameraYaw='left'],
]) check(`reject ${label}`,()=>{const s=sample();mutate(s);assert.equal(validateSave(s).ok,false);});
check('prototype pollution keys are rejected',()=>{
  const s=sample();s.quests.flags=JSON.parse('{"__proto__":{"polluted":true}}');
  assert.equal(validateSave(s).ok,false);
  assert.equal({}.polluted,undefined);
});
check('storage denial and quota errors produce structured failures',()=>{
  const denied={getItem(){throw new Error('denied');},setItem(){throw new Error('denied');}};
  assert.equal(readSave(denied).ok,false);assert.equal(writeSave(sample(),denied).ok,false);
  assert.equal(getSaveInfo(denied).valid,false);
  assert.equal(writeSave(sample(),{getItem:()=>null,setItem(){throw new Error('quota');}}).ok,false);
  assert.equal(readSave(null).ok,false);
});
check('previous valid save is backed up and corruption recovers from that backup',()=>{
  const storage=memory(),first=sample(),second=sample();second.player.gold=456;
  assert.equal(writeSave(first,storage).ok,true);
  assert.equal(writeSave(second,storage).ok,true);
  assert.deepEqual(JSON.parse(storage.getItem(BACKUP_KEY)),first);
  storage.setItem(SAVE_KEY,'corrupt');
  assert.equal(readSave(storage).source,'backup');
  assert.deepEqual(readSave(storage).data,first);
  assert.equal(getSaveInfo(storage).source,'backup');
});
check('corrupt primary does not poison the valid backup when saving again',()=>{
  const storage=memory(),first=sample();
  storage.setItem(BACKUP_KEY,JSON.stringify(first));storage.setItem(SAVE_KEY,'corrupt');
  const next=sample();next.player.gold=888;
  assert.equal(writeSave(next,storage).ok,true);
  assert.deepEqual(JSON.parse(storage.getItem(BACKUP_KEY)),first);
});
check('dead player state remains structurally valid for flow-layer recovery',()=>{
  const s=sample();s.player.hp=0;assert.equal(validateSave(s).ok,true);
});
check('house coordinates survive storage independently from outdoor player position',()=>{
  const s=sample(),storage=memory();s.house={x:13,z:15,px:.5,pz:-.4,heading:1.2};
  assert.equal(writeSave(s,storage).ok,true);assert.deepEqual(readSave(storage).data.house,s.house);
});
check('runtime timers, monsters, respawns and cinematics round trip',()=>{
  const s=sample(),storage=memory();
  s.player.b={guard:5};s.player.st={burn:2};
  s.world.time=42;
  s.world.enemies=[{k:'troll',x:44,z:35,hp:99,max:160,bossId:'troll_ancient',zone:11,rotation:2.1}];
  s.world.respawns=[{kind:'rat',zone:0,remaining:17}];s.cutscenes=['arrival'];
  assert.equal(writeSave(s,storage).ok,true);assert.deepEqual(readSave(storage).data,s);
  s.world.enemies[0].hp=170;assert.equal(validateSave(s).ok,false);
  s.world.enemies[0].hp=99;s.world.respawns[0].remaining=-1;assert.equal(validateSave(s).ok,false);
});
console.log(`${checks}/${checks} verificações de save aprovadas.`);
