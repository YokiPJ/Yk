/** Execute the real bridge and combo FSM; replace only browser/render/damage IO. */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { AttackAimController } from '../src/combat/attackAim.js';
import { CombatV2Controller, FEATURE_FLAGS, isKnightCombatV2, setCombatV2Enabled } from '../src/combat/combatV2.js';

const source=readFileSync(new URL('../src/combat/combatV2Bridge.js',import.meta.url),'utf8')
  .replace(/^import .*;$/gm,'').replaceAll('export function ','function ');
const kinds={kn:'sword',pa:'bow',so:'staff',dr:'staff',yo:'axe'};
function fixture(cls='kn',combo=true) {
  FEATURE_FLAGS.ENABLE_COMBAT_V2=combo;
  const P={kind:'p',cls,hp:100,x:10,z:10,lv:1,bonus:0,cd:0,at:0,b:{},path:[],mesh:{rotation:{y:0},position:{set(){}}}};
  const state={P,flow:'PLAYING',ents:[],B:[],t:0,keys:{},yaw:0,getHeightAt:()=>0};
  const hits=[],vfx=[],projectiles=[];
  const controller=new CombatV2Controller();
  const context={gameState:state,AttackAimController,combatV2:controller,FEATURE_FLAGS,isKnightCombatV2,setCombatV2Enabled,
    equippedWeapon:p=>({kind:kinds[p?.cls]||'sword',range:p?.cls==='kn'?1:p?.cls==='yo'?1.5:4}),
    CLASSES:Object.fromEntries(Object.keys(kinds).map(k=>[k,{dmg:[3,3]}])),
    dealDamage(_P,T,damage){hits.push(T);T.hp-=damage;},
    fireProjectile(_P,T,_color,impact){projectiles.push(T);impact();},
    playClaudeVfx(...args){vfx.push(args);},applyAxeImpact(){},showFloatingText(){},say(){},Math};
  vm.runInNewContext(source+';this.api={requestManualAttack,tickCombatV2,getAttackFacing,requestCombatV2Dodge,cancelCombatV2};',context);
  const enemy=(x=10,z=9)=>({kind:'m',hp:100,x,z});
  const tick=(n=1)=>{for(let i=0;i<n;i++)context.api.tickCombatV2(.05);};
  return {P,state,hits,vfx,projectiles,controller,enemy,tick,...context.api};
}
for (const cls of Object.keys(kinds)) {
  const f=fixture(cls,false),T=f.enemy();f.state.ents=[T];
  assert.equal(f.requestManualAttack(),true,cls+' accepts input without a previous frame');
  assert.equal(f.P.mesh.rotation.y,Math.PI,cls+' turns behind itself');
  assert.equal(f.hits.length,1,cls+' deals one hit');
  assert.equal(f.projectiles.length,['pa','so','dr'].includes(cls)?1:0,cls+' retains weapon delivery');
  T.x=9.8;T.z=9.2;
  assert.equal(f.getAttackFacing(),Math.atan2(T.x-f.P.x,T.z-f.P.z),cls+' movement can preserve facing');
  const yaw=f.P.mesh.rotation.y;T.x=11;T.z=10;
  assert.equal(f.requestManualAttack(),false,cls+' respects cooldown');
  assert.equal(f.hits.length,1);assert.equal(f.P.mesh.rotation.y,yaw,'rejected input never snaps');
  f.P.at=0;f.tick();assert.equal(f.getAttackFacing(),null,'attack animation end releases aim');
  for (const flag of ['ccOpen','arsenalOpen','dialogueOpen','insideHouse','cutsceneActive']) {
    f.P.cd=f.P.at=0;f.state[flag]=true;
    assert.equal(f.requestManualAttack(),false,cls+' blocked by '+flag);
    f.state[flag]=false;
  }
}
for(const cls of ['kn','pa']) {
  const f=fixture(cls),T=f.enemy();f.state.ents=[T];
  assert.equal(f.requestCombatV2Dodge(),true,'dodge can be the first input for '+cls);
  assert.equal(f.requestManualAttack(),false,'attack cannot cancel an active dodge for '+cls);
  f.tick();assert.equal(f.getAttackFacing(),null,'first tick preserves dodge direction');
  assert.equal(f.hits.length,0);
}
{
  const f=fixture(),T=f.enemy(),closer=f.enemy(10.4,10);f.state.ents=[T];
  assert.equal(f.requestManualAttack(),true,'first input survives initial class synchronization');
  assert.equal(f.P.mesh.rotation.y,Math.PI);
  assert.equal(f.hits.length,0,'combo impact remains delayed');
  f.tick(3);assert.deepEqual(f.hits,[T]);
  f.state.ents.push(closer);
  assert.equal(f.requestManualAttack(),true,'buffer next combo input');
  assert.equal(f.P.mesh.rotation.y,Math.PI,'buffer does not steal active swing target');
  let guard=0;while(f.controller.stepIndex===0 && guard++<20)f.tick();
  assert.equal(f.controller.stepIndex,1);
  assert.equal(f.P.mesh.rotation.y,Math.PI/2,'queued step acquires nearest enemy');
  f.tick(4);assert.deepEqual(f.hits,[T,closer],'one victim per impact');
  f.tick(20);assert.equal(f.getAttackFacing(),null);
  f.tick(100);assert.equal(f.hits.length,2,'idle frames never start another attack');
}
for (const invalidate of ['dead','removed','range','wall']) {
  const f=fixture(),T=f.enemy();f.state.ents=[T];f.requestManualAttack();
  if(invalidate==='dead')T.hp=0;
  if(invalidate==='removed')f.state.ents=[];
  if(invalidate==='range')T.z=5;
  if(invalidate==='wall'){T.z=11.2;f.state.B[10]=[];f.state.B[10][11]=1;}
  f.tick(12);assert.equal(f.hits.length,0,invalidate+' before impact prevents stale damage');
}
{
  const f=fixture(),T=f.enemy(),next=f.enemy(10.8,10);f.state.ents=[T];f.requestManualAttack();
  T.dead=true;f.state.ents.push(next);f.tick(3);
  assert.deepEqual(f.hits,[next],'invalid victim can be replaced at impact');
  assert.equal(f.P.mesh.rotation.y,Math.PI/2,'replacement is faced before damage');
  f.tick(2);
  assert.equal(f.requestCombatV2Dodge(),true,'dodge still cancels attack recovery');
  assert.equal(f.getAttackFacing(),null,'aim never overrides dodge');
  f.cancelCombatV2();assert.equal(f.getAttackFacing(),null,'reset clears aim');
}
{
  const f=fixture(),T=f.enemy();f.state.ents=[T];f.requestManualAttack();
  const loop=readFileSync(new URL('../src/core/loop.js',import.meta.url),'utf8');
  const move=loop.slice(loop.indexOf('function movePlayer('),loop.indexOf('function checkPlayerBlock('));
  f.state.W=96;f.P.mesh.position={set(){}};
  const context={gameState:f.state,getDodgeMotion:()=>null,getHeightAt:()=>0,checkPlayerBlock:()=>false,
    getAttackFacing:f.getAttackFacing,stepEntity(){throw Error('Unexpected path');},Math};
  vm.runInNewContext(move+';this.move=movePlayer;',context);
  context.move(.05,1,0);
  assert.ok(f.P.x>10,'attack assistance allows movement');
  assert.equal(f.P.mesh.rotation.y,Math.atan2(T.x-f.P.x,T.z-f.P.z),'movement does not overwrite attack facing');
}
console.log('PASS real combat bridge: five classes, combo timing/buffer, one hit, cooldown, stale targets, movement, dodge and input-only attacks.');
