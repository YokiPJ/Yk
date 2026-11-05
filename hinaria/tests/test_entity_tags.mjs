/** Regression: HTML overlay coordinates must remain in CSS pixels on HiDPI Android. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const hud = readFileSync(new URL('src/ui/hud.js', root), 'utf8');
const combat = readFileSync(new URL('src/combat/combat.js', root), 'utf8');
const npc = readFileSync(new URL('src/npc/npc.js', root), 'utf8');
const html = readFileSync(new URL('index.html', root), 'utf8');
assert.match(combat, /track\.appendChild\(fill\)/, 'enemy health fill must be inside track');
assert.match(combat, /e\.bar = fill/, 'health fill must be referenced');
assert.match(npc, /tag tag-npc/, 'NPC name has dedicated styling');
assert.match(html, /\.tag s\.tag-health-fill/, 'HP fill style exists');

const suffix = hud.slice(hud.indexOf('const projectionPoint = new THREE.Vector3();'))
  .replaceAll('export function ', 'function ');
class MockVector3 {
  set(x,y,z) { this.x=x;this.y=y;this.z=z; return this; }
  project() { this.x/=10;this.y/=10;this.z/=100;return this; }
}
const makeTag=()=>({style:{},title:'',classList:{toggle(name,on){this[name]=on;}}});
const monster={x:0,z:0,k:'rat',mesh:{position:{y:0}},tag:makeTag(),bar:{style:{}},hp:9,max:12,name:'Rato',lastHpShown:-1};
const npcEntity={x:0,z:0,mesh:{position:{y:0}},tag:makeTag(),name:'Bram'};
const canvas={width:1200,height:900,getBoundingClientRect:()=>({left:20,top:30,width:400,height:300})};
const overlay={clientWidth:400,clientHeight:300,getBoundingClientRect:()=>({left:20,top:30})};
const gameState={renderer:{domElement:canvas},camera:{updateMatrixWorld(){}},ents:[monster,npcEntity],tgt:monster,fl:[]};
const context={THREE:{Vector3:MockVector3},gameState,document:{getElementById:()=>overlay},window:{innerWidth:400,innerHeight:300}};
vm.runInNewContext(suffix+'\nthis.check={project,updateTags,updateFloatingText}',context);
const center=context.check.project(0,0,0);
assert.equal(center[0],200,'center position must use CSS width=400, not pixel buffer=1200');
assert.equal(center[1],150,'center position must use CSS height=300, not pixel buffer=900');
context.check.updateTags();
assert.equal(monster.tag.style.display,'');
assert.equal(monster.bar.style.width,'75.0%');
assert.equal(monster.bar.style.backgroundColor,'#54d773');
assert.equal(monster.tag.classList['tag-targeted'],undefined,'No lock-on target highlight should be applied');
monster.hp=2;
context.check.updateTags();
assert.equal(monster.bar.style.width,'16.7%');
assert.equal(monster.bar.style.backgroundColor,'#ef5555');
monster.x=100;
context.check.updateTags();
assert.equal(monster.tag.style.display,'none','offscreen labels must be hidden');
console.log('PASS V7 Android labels: HiDPI CSS projection, NPC names, health fill, damage, hidden offscreen');
