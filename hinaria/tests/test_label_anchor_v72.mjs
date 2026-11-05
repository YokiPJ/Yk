import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const hud=readFileSync(new URL('src/ui/hud.js',root),'utf8');
const html=readFileSync(new URL('index.html',root),'utf8');
assert.match(hud,/head\.localToWorld\(headWorld\)/,'Name must follow 3D head, not fixed world height');
assert.doesNotMatch(hud,/const h = e\.k === 'rat'/,'No hardcoded projection heights');
assert.match(html,/1\.1\.0 · COMBATE MANUAL \+ VFX\/SFX V2 · STORY/);
const responsive=hud.slice(hud.indexOf('function setupResponsive()'),hud.indexOf('/**\n * Auto-target nearest enemy'));
assert.doesNotMatch(responsive,/renderer\.setSize|camera\.aspect/,'Main owns canvas sizing');
const body=hud.slice(hud.indexOf('const projectionPoint = new THREE.Vector3();')).replaceAll('export function ','function ');
class MockVector3 {
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  project(){this.x/=10;this.y/=10;this.z/=100;return this;}
}
const tag=()=>({style:{},classList:{toggle(){}}});
let actualHeadOffset=[0,0,0];
const ratHead={localToWorld(v){v.x=4+actualHeadOffset[0]+v.x;v.y=2+actualHeadOffset[1]+v.y;v.z=3+actualHeadOffset[2]+v.z;return v;}};
const rat={x:999,z:999,k:'rat',mesh:{userData:{r:{head:ratHead}},position:{y:0}},tag:tag(),bar:{style:{}},hp:6,max:12,name:'Rato'};
const canvas={getBoundingClientRect:()=>({left:20,top:30,width:400,height:300})};
const overlay={getBoundingClientRect:()=>({left:20,top:30}),clientWidth:400,clientHeight:300};
const state={ents:[rat],renderer:{domElement:canvas},camera:{updateMatrixWorld(){}},fl:[]};
const ctx={THREE:{Vector3:MockVector3},gameState:state,document:{getElementById:()=>overlay},window:{innerWidth:400,innerHeight:300}};
vm.runInNewContext(body+'\nthis.check={updateTags,project,getLabelWorldPosition}',ctx);
ctx.check.updateTags();
const pos1=Number.parseFloat(rat.tag.style.left);
const y1=Number.parseFloat(rat.tag.style.top);
assert.equal(pos1,280,'Rat label should follow head world x=4 not outdated entity x=999');
assert.equal(rat.bar.style.width,'50.0%');
actualHeadOffset=[2,1,0];
ctx.check.updateTags();
assert.equal(Number.parseFloat(rat.tag.style.left),320,'Rat label follows head movement');
assert.ok(Number.parseFloat(rat.tag.style.top)<y1,'Rat label follows head height');
console.log('PASS V7.4: name sticks to 3D rat head when moving, HP update, single resize owner, visible build ID.');
