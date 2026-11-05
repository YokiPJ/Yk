/** Executes the production lifecycle and save integration with engine services injected. */
import assert from 'node:assert/strict';
import {gameState,GameState} from '../src/core/gameState.js';
import {initGameFlow,startNewGame,finishCharacterCreation,syncGameFlow,transitionTo,
  setPaused,canAcceptGameplayInput,saveGame,loadGame,getSaveInfo,returnToTitle,
  createSaveSnapshot,applySaveSnapshot} from '../src/core/gameFlow.js';
import {SAVE_KEY} from '../src/core/saveManager.js';
import {createQuestSystem} from '../src/quest/questSystem.js';
import {QUESTS} from '../src/quest/questData.js';
import {ensureArsenal} from '../src/player/arsenal.js';

const originalStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
const clone=value=>JSON.parse(JSON.stringify(value));
const classes={
  kn:{hp:96,mp:40,up:17,mu:5},pa:{hp:76,mp:60,up:14,mu:8},
  so:{hp:60,mp:100,up:11,mu:15},dr:{hp:68,mp:90,up:12,mu:12},yo:{hp:110,mp:55,up:16,mu:7}
};
const mesh=()=>({rotation:{y:0},position:{values:[],set(...values){this.values=values;}}});

function setup() {
  const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))};
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:storage});
  Object.assign(gameState,new GameState());
  gameState.P={name:'Aventureiro',kind:'p',mesh:mesh(),path:[],x:13,z:15,cls:'kn',sk:0,ar:0,
    hp:96,max:96,mana:40,mm:40,lv:1,xp:0,gold:0,cds:[0,0,0,0],cd:0,rc:0,b:{},st:{}};
  gameState.ents=[gameState.P];
  gameState.B=Array.from({length:96},()=>Array(96).fill(0));
  gameState.LM=[{n:'Vilarrubra',f:0},{n:'Ponte Velha',f:0}];
  gameState.CH=[{x:14,z:17,o:0,lid:{rotation:{x:0}}}];
  const removed=[];gameState.scene={remove:item=>removed.push(item)};
  const quests=createQuestSystem(QUESTS,{level:()=>gameState.P.lv,discovered:n=>gameState.LM.some(l=>l.n===n&&l.f)});
  const spawnZones=[{k:'rat',n:1},{k:'troll',n:1,bossId:'troll_ancient'},{k:'orc',n:1,bossId:'orc_king'}];
  let lore=[],cutscenes=[],fog=[],creatorCalls=0;
  function spawnEnemy(k,zone) {
    if(zone.bossId&&gameState.defeatedBosses.has(zone.bossId))return null;
    const e={kind:'m',k,x:22,z:25,tx:22,tz:25,hp:100,max:100,bossId:zone.bossId||null,zd:zone,
      mesh:mesh(),tag:{remove(){}}};
    gameState.ents.push(e);return e;
  }
  const services={classes,skinCount:5,armorCount:5,quests,ensureArsenal,spawnZones,spawnEnemy,
    applyAppearance:P=>P.mesh.position.set(P.x,0,P.z),
    buildCharacterCreatorUI:()=>creatorCalls++,restoreFog:f=>fog=f||[],snapshotFog:()=>fog,
    restoreLore:value=>lore=[...value],loreSnapshot:()=>lore,
    restoreCutscenes:value=>cutscenes=[...value],cutsceneSnapshot:()=>cutscenes,
    closeDialogue:()=>gameState.dialogueOpen=false,closeArsenal:()=>gameState.arsenalOpen=false,
    leaveHouse:()=>gameState.insideHouse=false,cancelCutscenes:()=>gameState.cutsceneActive=false,
    houseSnapshot:()=>null};
  return {storage,services,quests,spawnZones,spawnEnemy,removed,get creatorCalls(){return creatorCalls;}};
}

let checks=0;
function check(label,fn){fn();checks++;console.log(`PASS ${label}`);}
try {
  check('boot reaches title without creating a playable session',()=>{
    const f=setup();assert.equal(gameState.flow,'BOOT');assert.equal(initGameFlow(f.services).ok,true);
    assert.equal(gameState.flow,'TITLE');assert.equal(gameState.ccOpen,false);
    assert.equal(canAcceptGameplayInput(),false);assert.equal(saveGame().ok,false);
    assert.equal(getSaveInfo().valid,false);
  });
  check('new game opens existing creator and only finishing enables gameplay',()=>{
    const f=setup();initGameFlow(f.services);
    assert.equal(startNewGame().ok,true);assert.equal(gameState.flow,'CHARACTER_CREATION');
    assert.equal(gameState.ccOpen,true);assert.equal(f.creatorCalls,1);
    assert.equal(canAcceptGameplayInput(),false);assert.equal(saveGame().ok,false);
    finishCharacterCreation();assert.equal(gameState.flow,'PLAYING');
    assert.equal(gameState.ccOpen,false);assert.equal(canAcceptGameplayInput(),true);
  });
  check('pause/resume clears held keys, joystick, pointer and queued path',()=>{
    const f=setup();initGameFlow(f.services);startNewGame();finishCharacterCreation();
    Object.assign(gameState,{keys:{w:1,j:1},jx:1,jz:-1,jid:12,ptr:{12:[1,2]},pd:{x:1},pdist:30,lastTime:-100});
    Object.assign(gameState.P,{path:[[14,15]],vx:5,vz:3,spd:4,greet:true});
    assert.equal(setPaused(true).ok,true);assert.equal(gameState.flow,'PAUSED');
    assert.equal(canAcceptGameplayInput(),false);assert.deepEqual(gameState.keys,{});
    assert.equal(gameState.jx,0);assert.equal(gameState.jz,0);assert.equal(gameState.jid,null);
    assert.deepEqual(gameState.ptr,{});assert.equal(gameState.pd,null);assert.equal(gameState.pdist,0);
    assert.deepEqual(gameState.P.path,[]);assert.equal(gameState.P.vx,0);assert.equal(gameState.P.vz,0);
    assert.equal(gameState.P.spd,0);assert.equal(gameState.P.greet,false);
    assert.ok(gameState.lastTime>=0&&gameState.lastTime<=performance.now());
    setPaused(false);assert.equal(gameState.flow,'PLAYING');assert.equal(canAcceptGameplayInput(),true);
  });
  check('legacy dialogue, cutscene, arsenal and death states derive consistently',()=>{
    const f=setup();initGameFlow(f.services);startNewGame();finishCharacterCreation();
    gameState.dialogueOpen=true;assert.equal(syncGameFlow(),'DIALOGUE');assert.equal(canAcceptGameplayInput(),false);
    gameState.dialogueOpen=false;gameState.cutsceneActive=true;assert.equal(syncGameFlow(),'CUTSCENE');
    gameState.cutsceneActive=false;gameState.arsenalOpen=true;assert.equal(syncGameFlow(),'PAUSED');
    gameState.arsenalOpen=false;gameState.P.hp=0;assert.equal(syncGameFlow(),'DEAD');
    gameState.P.hp=10;assert.equal(syncGameFlow(),'PLAYING');
    assert.throws(()=>transitionTo('INVALID'),/desconhecido/);
  });
  for(const cls of Object.keys(classes)) check(`save/load production flow restores ${cls}, quests, exploration, bosses and equipment`,()=>{
    const f=setup();initGameFlow(f.services);startNewGame();finishCharacterCreation();
    const c=classes[cls],P=gameState.P;
    Object.assign(P,{name:`Viajante ${cls}`,cls,sk:2,ar:3,lv:4,xp:12,gold:222,x:20.5,z:24.25,
      max:c.hp+3*c.up,hp:55,mm:c.mp+3*c.mu,mana:25,cd:0,cds:[1,2,3,4],rc:7,b:{guard:3},st:{slow:2}});
    ensureArsenal(P);P.equippedWeapons[cls]=`${cls}_replay_axe`;P.skillLevels[cls]=[2,3,1,1];P.mesh.rotation.y=1.23;
    gameState.t=88;P.axeAwakeUntil=94;P.axeAwakeCooldown=105;
    gameState.LM[1].f=1;gameState.CH[0].o=1;gameState.defeatedBosses.add('troll_ancient');
    gameState.ents=gameState.ents.filter(e=>e.bossId!=='troll_ancient');
    const rat=gameState.ents.find(e=>e.k==='rat');rat.hp=33;rat.x=27.5;
    gameState.enemyRespawns=[{kind:'rat',zone:f.spawnZones[0],due:100}];
    f.services.restoreLore(['origem']);f.services.restoreCutscenes(['arrival']);f.services.restoreFog(Array.from({length:9216},(_,i)=>i%256));
    f.quests.start('c1_ratos');f.quests.emit('kill',{k:'rat'});f.quests.emit('kill',{k:'rat'});
    const questBefore=f.quests.serialize();
    assert.equal(saveGame().ok,true);assert.equal(getSaveInfo().valid,true);
    const snapshot=createSaveSnapshot();
    Object.assign(P,{name:'Changed',cls:'kn',lv:1,xp:0,gold:0,x:13,z:15,hp:1,mana:1});
    f.quests.reset();gameState.LM[1].f=0;gameState.CH[0].o=0;
    gameState.defeatedBosses.clear();gameState.t=0;
    assert.equal(loadGame().ok,true);assert.equal(gameState.flow,'PLAYING');
    assert.equal(P.cls,cls);assert.equal(P.name,`Viajante ${cls}`);assert.equal(P.lv,4);assert.equal(P.xp,12);
    assert.equal(P.gold,222);assert.equal(P.x,20.5);assert.equal(P.z,24.25);assert.equal(P.hp,55);assert.equal(P.mana,25);
    assert.equal(P.max,c.hp+3*c.up);assert.equal(P.mm,c.mp+3*c.mu);assert.equal(P.mesh.rotation.y,1.23);
    assert.equal(P.sk,2);assert.equal(P.ar,3);assert.equal(P.equippedWeapons[cls],`${cls}_replay_axe`);
    assert.deepEqual(P.skillLevels[cls],[2,3,1,1]);assert.deepEqual(P.cds,[1,2,3,4]);
    assert.deepEqual(P.b,{guard:3});assert.deepEqual(P.st,{slow:2});assert.equal(P.rc,7);
    assert.equal(P.axeAwakeUntil,94);assert.equal(P.axeAwakeCooldown,105);
    assert.equal(f.quests.serialize(),questBefore);assert.equal(gameState.LM[1].f,1);assert.equal(gameState.CH[0].o,1);
    assert.equal(gameState.CH[0].lid.rotation.x,-1.2);assert.equal(gameState.defeatedBosses.has('troll_ancient'),true);
    assert.equal(gameState.ents.some(e=>e.bossId==='troll_ancient'),false);
    assert.equal(gameState.ents.find(e=>e.k==='rat').hp,33);assert.equal(gameState.ents.find(e=>e.k==='rat').x,27.5);
    assert.deepEqual(gameState.enemyRespawns,[{kind:'rat',zone:f.spawnZones[0],due:100}]);
    assert.deepEqual(f.services.loreSnapshot(),['origem']);assert.deepEqual(f.services.cutsceneSnapshot(),['arrival']);
    assert.deepEqual(f.services.snapshotFog(),Array.from({length:9216},(_,i)=>i%256));assert.deepEqual(createSaveSnapshot().world,snapshot.world);
  });
  check('corrupt storage and incompatible data leave the running session untouched',()=>{
    const f=setup();initGameFlow(f.services);startNewGame();finishCharacterCreation();
    gameState.P.gold=123;f.quests.start('c1_ratos');
    const before=createSaveSnapshot(),entities=gameState.ents.slice();
    f.storage.setItem(SAVE_KEY,'{invalid');assert.equal(loadGame().ok,false);
    assert.equal(gameState.P.gold,123);assert.equal(gameState.flow,'PLAYING');
    assert.deepEqual(gameState.ents,entities);assert.deepEqual(createSaveSnapshot().player,before.player);
    const invalid=clone(before);invalid.player.x=96;assert.equal(applySaveSnapshot(invalid).ok,false);
    assert.equal(f.quests.serialize(),JSON.stringify(before.quests));assert.deepEqual(gameState.ents,entities);
  });
  check('unsafe restored position relocates to unblocked terrain',()=>{
    const f=setup();initGameFlow(f.services);startNewGame();finishCharacterCreation();
    const saved=createSaveSnapshot();saved.player.x=20;saved.player.z=20;gameState.B[20][20]=1;
    assert.equal(applySaveSnapshot(saved).ok,true);assert.notDeepEqual([gameState.P.x,gameState.P.z],[20,20]);
    assert.equal(gameState.B[Math.round(gameState.P.x)][Math.round(gameState.P.z)],0);
  });
  check('save rejects transient cinematics/dialogues without replacing a valid save',()=>{
    const f=setup();initGameFlow(f.services);startNewGame();finishCharacterCreation();
    assert.equal(saveGame().ok,true);const before=f.storage.getItem(SAVE_KEY);
    gameState.cutsceneActive=true;assert.equal(saveGame().ok,false);gameState.cutsceneActive=false;
    gameState.dialogueOpen=true;assert.equal(saveGame().ok,false);
    assert.equal(f.storage.getItem(SAVE_KEY),before);
  });
  check('return to title closes gameplay and clears held input',()=>{
    const f=setup();initGameFlow(f.services);startNewGame();finishCharacterCreation();
    gameState.keys={w:1};gameState.jx=1;gameState.P.path=[[14,15]];
    gameState.arsenalOpen=true;gameState.dialogueOpen=true;
    assert.equal(returnToTitle().ok,true);assert.equal(gameState.flow,'TITLE');
    assert.deepEqual(gameState.keys,{});assert.equal(gameState.jx,0);assert.deepEqual(gameState.P.path,[]);
    assert.equal(gameState.arsenalOpen,false);assert.equal(gameState.dialogueOpen,false);
    assert.equal(canAcceptGameplayInput(),false);
  });
  console.log(`${checks}/${checks} verificações do fluxo aprovadas.`);
} finally {
  if(originalStorage)Object.defineProperty(globalThis,'localStorage',originalStorage);
  else delete globalThis.localStorage;
}
