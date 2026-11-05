const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const original=fs.readFileSync(path.join(__dirname,'../src/player/controls.js'),'utf8');
let code=original.replace(/^import .*;\s*$/gm,'').replace(/\bexport function\b/g,'function');
code+='\nthis.__test={initControls,getJoystick};\n';
const events={};
function element(id){
 const e={id,style:{},dataset:{},classList:{add(){},remove(){},contains(){return false}},
  onClick:null,addEventListener(name,cb){(events[id+':'+name]??=[]).push(cb)},
  getBoundingClientRect(){return {left:0,top:0,width:120,height:120}},
  setPointerCapture() {}, closest(){return null}};
 return e;
}
const els=Object.fromEntries(['joy','knob','say','chatb','s0','s1','s2','s3','tg','chr','cc','chips','con','combat-v2-quick-toggle'].map(x=>[x,element(x)]));
const canvas=element('canvas');
const gameState={P:{path:[[1,1]],greet:true}, renderer:{domElement:canvas},keys:{},jx:0,jz:0,lastTime:0};
const win={addEventListener(n,cb){(events['window:'+n]??=[]).push(cb)}};
const document={getElementById(id){return els[id]}, addEventListener(n,cb){(events['document:'+n]??=[]).push(cb)},hidden:false};
const sandbox={document,window:win,gameState,performance:{now:()=>0},
  CONFIG:{},KEYS:{MOVEMENT:{},ACTIONS:{}},THREE:{},setChat(){},chipsUI(){},autoTarget(){},say(){},castSkill(){},replay(){},buildCharacterCreatorUI(){},setClass(){},spawnEffect(){},talk(){},findPath(){},requestManualAttack(){},requestCombatV2Dodge(){},requestAxeAwakening(){},toggleCombatV2(){},initCombatV2Preference(){},cancelCombatV2(){},console};
vm.runInNewContext(code,sandbox,{filename:'controls.js'});

const {initControls,getJoystick}=sandbox.__test;
initControls();
function fire(key,event){for(const cb of events[key]||[])cb(event)}
const evt=(id,x,y)=>({pointerId:id,clientX:x,clientY:y,preventDefault(){}});
fire('joy:pointerdown',evt(1,60,60));
assert.equal(getJoystick().x,0);
assert.equal(gameState.jx,0);
fire('joy:pointermove',evt(1,120,60));
assert.equal(gameState.jx,1,'right at full force');
assert.equal(gameState.jz,0);
assert.equal(gameState.P.path.length,0,'manual input cancels path');
fire('joy:pointermove',evt(1,60,0));
assert.equal(gameState.jx,0);
assert.equal(gameState.jz,-1,'up at full force');
fire('joy:pointermove',evt(1,66,60));
assert.equal(gameState.jx,0,'dead zone');
fire('joy:pointermove',evt(1,60,40));
assert.ok(gameState.jz<0 && gameState.jz>-1,'partial force');
fire('joy:pointerup',evt(1,60,40));
assert.equal(gameState.jx,0);
assert.equal(gameState.jz,0);
// A second touch may not steal the pointer. Loss of capture resets speed.
fire('joy:pointerdown',evt(4,120,60));
fire('joy:pointerdown',evt(5,0,60));
assert.equal(gameState.jx,1);
fire('joy:lostpointercapture',evt(4,120,60));
assert.equal(gameState.jx,0);
// The canvas reference must be in scope for pointer handlers.
fire('canvas:pointerdown',evt(2,100,100));
fire('canvas:pointercancel',evt(2,100,100));
// Going to background must release movement even without pointerup.
fire('joy:pointerdown',evt(6,120,60));
document.hidden=true;
fire('document:visibilitychange',{});
assert.equal(gameState.jx,0);
console.log('PASS mobile controls: no TDZ, movement state, dead zone, multitouch, pointer release, background, canvas');
