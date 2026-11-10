/** Regression cases discovered by the whole-game review. Execute production
 * handlers/loops, replacing only rendering, DOM and damage IO. */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {hasLineOfSight} from '../src/combat/forwardHit.js';
const read=file=>readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
const combat=read('combat/combat.js'),loop=read('core/loop.js');
const extract=(source,start,end)=>source.slice(source.indexOf(start),end?source.indexOf(end,source.indexOf(start)):undefined).replaceAll('export function ','function ');
const P={cls:'so',hp:40,max:60,mana:100,mm:100,rl:1,rc:0,path:[],gold:3_000_000_000,mesh:{rotation:{y:0}}};
const state={P,flow:'PLAYING',hist:[{x:13,z:15,hp:96},{},{},{}],getHeightAt:()=>0};
const combatContext={gameState:state,isKnightCombatV2:()=>false,equippedWeapon:()=>({kind:'staff'}),occ:()=>false,
  playClaudeVfx(){},showFloatingText(){},say(){},updateHUD(){},cancelCombatV2(){},Math};
vm.runInNewContext(extract(combat,'export function replay()','/**\n * Projectile')+';this.replay=replay;',combatContext);
combatContext.replay();assert.equal(P.hp,60,'old class history cannot exceed current maximum HP');
assert.equal(P.mana,80);assert.equal(P.rc,30,'Replay still costs mana and has its cooldown');
P.hp=30;P.rc=0;P.mana=100;state.hist[0].hp=50;combatContext.replay();assert.equal(P.hp,50,'ordinary Replay healing preserved');
vm.runInNewContext(extract(combat,'function playerDie()','/**\n * Level up')+';this.die=playerDie;',combatContext);
combatContext.die();assert.equal(P.gold,2_250_000_000,'death removes 25% without signed 32-bit overflow');
P.gold=99;combatContext.die();assert.equal(P.gold,75,'original rounding of small death penalty preserved');

const controls=read('player/controls.js');
const bind=controls.slice(controls.indexOf('    function bindAction('),controls.indexOf('    bindAction(attackV2'));
let actions=0,time=0,allowed=true;const handlers={};
const button={addEventListener(name,fn){handlers[name]=fn;}};
const inputContext={performance:{now:()=>time},gameplayInputAllowed:()=>allowed};
vm.runInNewContext(bind+';this.bind=bindAction;',inputContext);inputContext.bind(button,()=>actions++);
const event=extra=>({preventDefault(){},...extra});
handlers.pointerdown(event({button:0}));time=1500;handlers.click(event({detail:1}));
assert.equal(actions,1,'releasing a long press never generates a second action');
handlers.click(event({detail:0}));assert.equal(actions,2,'keyboard/assistive clicks still work');
handlers.pointerdown(event({button:2}));assert.equal(actions,2,'right click is ignored');
allowed=false;handlers.pointerdown(event({button:0}));handlers.click(event({detail:0}));assert.equal(actions,2,'paused inputs do not act');

const audioSource=read('audio/gameAudio.js').replace(/^import .*;\s*$/gm,'').replaceAll('export function ','function ');
for(const raw of ['null','[]','false','12','"old format"','{broken','{"enabled":false,"volume":0.2}']) {
  const context={BOSS_MUSIC_FILES:{},localStorage:{getItem:()=>raw,setItem(){}},Audio:class{addEventListener(){}},document:{hidden:false}};
  vm.runInNewContext(audioSource+';this.preferences=getAudioPreferences();',context);
  assert.equal(context.preferences.enabled,!raw.includes('"enabled":false'),'bad preferences cannot prevent boot');
  assert.equal(context.preferences.volume,raw.includes('"volume":0.2')?.2:.35);
}

const enemy={kind:'m',x:10,z:10,tx:10,tz:10,hp:100,st:{},cd:0,rp:0,path:[],K:{ag:4,ac:2,dmg:[1,1]}};
const aiState={P:{x:11,z:11,tx:11,tz:11},ents:[enemy],B:[]};
aiState.B[10]=[];aiState.B[11]=[];aiState.B[10][11]=aiState.B[11][10]=1;
let hits=0;
const aiContext={gameState:aiState,hasLineOfSight,near:(a,b)=>Math.max(Math.abs(a.tx-b.tx),Math.abs(a.tz-b.tz)),
  inSafeZone:()=>false,still:()=>true,dealDamage(){hits++;},findPath:()=>null,ri:a=>a,DIRECTIONS_8:[[1,0]],Math};
vm.runInNewContext(extract(loop,'function updateEnemyAI(')+';this.tick=updateEnemyAI;',aiContext);
aiContext.tick(.05);assert.equal(hits,0,'enemy cannot melee through a closed wall corner');
aiState.B=[];enemy.cd=0;aiContext.tick(.05);assert.equal(hits,1,'enemy still attacks with a clear line of sight');

const movement=loop.slice(loop.indexOf('    for (const e of gameState.ents) {'),loop.indexOf('    // Enemy AI'));
let steps=0;enemy.st.stun=1;
const motionContext={gameState:aiState,dt:.05,mx:0,mz:0,movePlayer(){},stepEntity(){steps++;},animateEntity(){}};
vm.runInNewContext(movement,motionContext);assert.equal(steps,0,'stun stops a partially completed tile move immediately');
delete enemy.st.stun;vm.runInNewContext(movement,motionContext);assert.equal(steps,1,'movement resumes after stun');
console.log('PASS review gameplay: Replay bounds, death penalty, long press, corrupt preferences, enemy wall checks and stun movement.');
