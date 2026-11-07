import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { findForwardEnemy } from '../src/combat/forwardHit.js';
import { AttackAimController } from '../src/combat/attackAim.js';
const source=readFileSync(new URL('../src/combat/combatV2Bridge.js',import.meta.url),'utf8');
const a=source.indexOf('export function requestManualAttack()');
const b=source.indexOf('// Lightweight manual dodge',a);
const code=source.slice(a,b).replace('export function','function');
let checks=0;
for (const cls of ['kn','pa','so','dr','yo']) {
  const P={hp:80,cls,x:10,z:10,lv:1,bonus:0,cd:0,at:0,b:{},path:[],mesh:{rotation:{y:0}}};
  const rear={kind:'m',hp:100,x:10,z:9.6};
  const front={kind:'m',hp:100,x:10,z:11};
  const state={P,flow:'PLAYING',ents:[rear],B:[],t:0,getHeightAt:()=>0};
  let hits=0;
  const context={gameState:state,active:()=>false,freeDodge:{active:false},attackAim:new AttackAimController(),syncCombatClass(){},
    requestCombatV2Attack(){throw new Error('Unexpected opt-in combo');},
    equippedWeapon:()=>({kind:cls==='so'||cls==='dr'?'staff':cls==='pa'?'bow':cls==='yo'?'axe':'sword',range:4}),
    CLASSES:Object.fromEntries(['kn','pa','so','dr','yo'].map(k=>[k,{dmg:[3,3]}])),
    playClaudeVfx(){},ri:a=>a,dealDamage(_P,T){hits++;T.hp--;},fireProjectile(_P,_T,_c,cb){cb();},
    applyAxeImpact(){},showFloatingText(){},Math};
  vm.runInNewContext(code+';this.attack=requestManualAttack;',context);
  assert.equal(context.attack(),true,cls+' rear-only input turns and strikes');
  assert.equal(hits,1,cls+' nearby rear victim receives damage');
  assert.equal(P.mesh.rotation.y,Math.PI,cls+' faces rear enemy');
  P.cd=P.at=0;state.ents=[rear,front];
  assert.equal(context.attack(),true);assert.equal(hits,2);assert.equal(rear.hp,98);
  assert.equal(P.mesh.rotation.y,Math.PI,cls+' nearest enemy wins');
  for (const mode of ['TITLE','PAUSED','DIALOGUE','CUTSCENE','DEAD']) {
    P.cd=P.at=0;state.flow=mode;
    assert.equal(context.attack(),false,cls+' blocked in '+mode);assert.equal(hits,2);
  }
  checks+=10;
}
const wall=[];wall[10]=[];wall[10][11]=1;
assert.equal(findForwardEnemy({ents:[{kind:'m',hp:5,x:10,z:12}],B:wall},{x:10,z:10,mesh:{rotation:{y:0}}},4),null);
console.log('PASS assisted attack: all 5 classes turn toward the nearest enemy; walls and blocked flow modes preserved ('+checks+' class checks).');
