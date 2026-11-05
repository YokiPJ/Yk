/** Execute production polish modules against deterministic DOM/renderer adapters. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
  .replace(/^import .*;\s*$/gm,'').replace(/export (function|const|class) /g,'$1 ');
function execute(path,context,names){
  vm.createContext(context);vm.runInContext(source(path)+'\nthis.api={'+names.join(',')+'};',context);return context.api;
}
function bus(){
  const listeners=new Map();
  return {addEventListener(name,handler){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(handler);},
    removeEventListener(name,handler){listeners.get(name)?.delete(handler);},
    emit(name,event={}){for(const handler of listeners.get(name)||[])handler(event);},
    count(){return [...listeners.values()].reduce((sum,list)=>sum+list.size,0);}};
}

// Frame statistics retain real intervals, keep bounded memory and identify the measured mode.
{
  const document={hidden:false},gameState={flow:'PLAYING',renderer:{getPixelRatio:()=>1}};
  const context={gameState,document,navigator:{maxTouchPoints:0},matchMedia:()=>({matches:false}),performance:{now:()=>1000},
    window:{devicePixelRatio:1},setPaused(){},setVisualAtmosphereEnabled(){},console};
  const api=execute('src/ui/performanceUI.js',context,['tickPerformance','getGraphicsDiagnostics']);
  for(let i=0;i<400;i++)api.tickPerformance(.02);
  let result=api.getGraphicsDiagnostics();
  assert.equal(result.fps,50);assert.equal(result.frameTiming.samples,240);
  assert.equal(result.frameTiming.p50Ms,20);assert.equal(result.frameTiming.p95Ms,20);
  const before=result.frameTiming.samples;document.hidden=true;api.tickPerformance(.03);
  assert.equal(api.getGraphicsDiagnostics().frameTiming.samples,before);
  document.hidden=false;api.tickPerformance(NaN);api.tickPerformance(Infinity);api.tickPerformance(-1);
  assert.equal(api.getGraphicsDiagnostics().frameTiming.samples,before);
  gameState.flow='PAUSED';api.tickPerformance(.05);result=api.getGraphicsDiagnostics();
  assert.equal(result.measuredFlow,'PAUSED');assert.equal(result.frameTiming.samples,1);
  assert.equal(result.fps,0,'a previous gameplay FPS must not masquerade as a pause measurement');
  console.log('PASS frame timing: measured intervals, mode isolation, hidden/invalid samples and 240-frame bound');
}

// Diagnostics sample even when their panel is closed, without retaining unbounded data.
{
  const gameState={flow:'PLAYING',W:96,P:{x:1.234,z:2.345,mesh:{position:{y:.25}}},scene:{children:[]},ents:[],
    renderer:{info:{render:{calls:10,triangles:20},memory:{textures:2,geometries:3}}}};
  const context={gameState,document:{hidden:false},window:{innerWidth:390,innerHeight:844,devicePixelRatio:2},
    navigator:{platform:'test',maxTouchPoints:1},performance:{memory:{usedJSHeapSize:100,totalJSHeapSize:200,jsHeapSizeLimit:300}},
    getGraphicsDiagnostics:()=>({fps:50,pixelRatio:1,contextState:'ready',frameTiming:{p95Ms:20}}),
    getAudioDiagnostics:()=>({enabled:true,unlocked:false,playing:[]}),activeCutsceneId:()=>null,console};
  const api=execute('src/ui/qaDiagnostics.js',context,['tickDiagnostics','diagnosticsSnapshot']);
  for(let i=0;i<150;i++)api.tickDiagnostics(1);
  let result=api.diagnosticsSnapshot();
  assert.equal(result.history.length,120);assert.equal(result.historyLimit,120);
  assert.equal(result.history[0].drawCalls,10);assert.equal(result.heap.usedBytes,100);
  assert.deepEqual(Array.from(result.device.viewport),[390,844]);
  result.history[0].drawCalls=999;assert.equal(api.diagnosticsSnapshot().history[0].drawCalls,10);
  context.document.hidden=true;gameState.renderer.info.render.calls=99;api.tickDiagnostics(1);
  assert.equal(api.diagnosticsSnapshot().history.at(-1).drawCalls,10);
  delete context.performance.memory;assert.equal(api.diagnosticsSnapshot().heap,null);
  console.log('PASS diagnostics: actual renderer/heap values, independent sampling, defensive copies and 120-sample bound');
}

// Ambient motion uses cached bases, honors live accessibility/visibility changes and releases listeners.
{
  const events=bus(),docEvents=bus(),mediaEvents=bus();let sineCalls=0,made=null;
  const math=Object.create(Math);math.sin=value=>{sineCalls++;return Math.sin(value);};
  class Geometry{attributes={};setAttribute(name,value){this.attributes[name]=value;}getAttribute(name){return this.attributes[name];}dispose(){this.disposed=true;}}
  class Attribute{constructor(array,size){this.array=array;this.itemSize=size;this.needsUpdate=false;}}
  class Material{constructor(options){Object.assign(this,options);}dispose(){this.disposed=true;}}
  class Points{constructor(geometry,material){this.geometry=geometry;this.material=material;this.position={set(){}};made=this;}}
  const document={...docEvents,hidden:false,documentElement:{dataset:{}}};
  const context={THREE:{BufferGeometry:Geometry,BufferAttribute:Attribute,PointsMaterial:Material,Points,AdditiveBlending:2},
    window:events,document,navigator:{maxTouchPoints:0},matchMedia:()=>({...mediaEvents,matches:false}),Math:math,console};
  const api=execute('src/vfx/worldAtmosphereV3.js',context,['initializeVisualAtmosphere','tickVisualAtmosphere','disposeVisualAtmosphere']);
  const scene={add(object){object.parent={remove(){}};}};
  api.initializeVisualAtmosphere(scene);const particle=made;sineCalls=0;
  api.tickVisualAtmosphere({x:1,z:2},.05,1);
  assert.equal(sineCalls,52,'26 desktop particles use only two animated sine terms each; seeded bases are cached');
  assert.equal(particle.geometry.getAttribute('position').needsUpdate,true);
  events.emit('hinaria:settingschange',{detail:{reducedMotion:true}});assert.equal(particle.visible,false);
  sineCalls=0;api.tickVisualAtmosphere({x:1,z:2},.05,2);assert.equal(sineCalls,0);
  events.emit('hinaria:settingschange',{detail:{reducedMotion:false}});assert.equal(particle.visible,true);
  document.hidden=true;docEvents.emit('visibilitychange');assert.equal(particle.visible,false);
  document.hidden=false;docEvents.emit('visibilitychange');assert.equal(particle.visible,true);
  api.disposeVisualAtmosphere();assert.equal(particle.geometry.disposed,true);assert.equal(particle.material.disposed,true);
  assert.equal(events.count()+docEvents.count()+mediaEvents.count(),0,'dispose releases every listener');
  api.initializeVisualAtmosphere(scene);assert.notEqual(made,particle,'a disposed atmosphere can initialize again');api.disposeVisualAtmosphere();
  console.log('PASS atmosphere: cached procedural work, reduced motion/background suspension, disposal and restart');
}

// Production dialogue must reject obsolete buttons, preserve focus and block interaction in paused/title modes.
{
  const docEvents=bus(),window=bus();let document,questCalls=0;
  function node(id=''){
    const events=bus(),classes=new Set();
    return {id,children:[],dataset:{},style:{},disabled:false,isConnected:true,textContent:'',innerHTML:'',...events,
      classList:{add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name),toggle(name,on){on?classes.add(name):classes.delete(name);}},
      setAttribute(name,value){this[name]=value;},appendChild(child){this.children.push(child);},replaceChildren(...children){this.children=children;},
      focus(){document.activeElement=this;},querySelector(selector){return selector==='#dialog-close-top'?nodes['dialog-close-top']:null;},
      querySelectorAll(){return [nodes['dialog-close-top'],...this.children];},contains(target){return target===this||this.children.includes(target);},click(){events.emit('click',{stopPropagation(){}});}};
  }
  const nodes=Object.fromEntries(['dialog-panel','dialog-shade','dialog-title','dialog-text','dialog-options','dialog-close-top','interact-npc'].map(id=>[id,node(id)]));
  const initial=node('initial');document={...docEvents,activeElement:initial,getElementById:id=>nodes[id],createElement:()=>node()};
  const gameState={flow:'PLAYING',P:{x:17,z:9,path:[],gold:0},N:{x:17,z:9},Y:{x:6,z:6},keys:{w:1},jx:1};
  const context={gameState,document,window,Q:{markers:()=>[{npc:'bram',k:'new'}],talk:(_npc,word)=>{if(word==='sim')questCalls++;return 'Missão';}},
    replyBram:()=>'',replyYoki:()=>'',openArsenal(){},updateHUD(){},nearbyHouse:()=>null,houseLabel:()=>'',enterHouse:()=>true,leaveHouse(){},console};
  const api=execute('src/ui/dialogueUI.js',context,['initDialogueUI','openDialogue','closeDialogue']);
  api.initDialogueUI();const listeners=window.count();api.initDialogueUI();assert.equal(window.count(),listeners);
  assert.equal(nodes['dialog-panel'].role,'dialog');assert.equal(nodes['dialog-panel']['aria-modal'],'true');
  assert.equal(api.openDialogue('bram'),true);assert.equal(gameState.jx,0);assert.deepEqual(Object.keys(gameState.keys),[]);
  nodes['dialog-options'].children[0].click();const accept=nodes['dialog-options'].children[0];
  accept.click();accept.click();assert.equal(questCalls,1,'the old accept choice cannot submit twice after rerender');
  api.closeDialogue();assert.equal(document.activeElement,initial);accept.click();assert.equal(questCalls,1);
  gameState.flow='TITLE';assert.equal(api.openDialogue('bram'),false);
  gameState.flow='PAUSED';assert.equal(api.openDialogue('bram'),false);
  gameState.flow='PLAYING';gameState.P.x=99;assert.equal(api.openDialogue('bram'),false);
  console.log('PASS dialogue: semantic modal, idempotent init, held-input clearing, stale choice guard, focus restoration and proximity');
}
