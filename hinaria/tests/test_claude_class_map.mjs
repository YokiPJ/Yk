import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const raw=readFileSync(new URL('../src/vfx/claudeVfxBridge.js',import.meta.url),'utf8');
// Execute the bridge in isolation. No browser or GPU is needed; the fake engine
// records the same effect ID/coordinates it would pass to the real Claude pack.
const code=raw.replace(/^import\s+.*?;\s*$/gm,'').replace(/\bexport (?=(const|function)\b)/g,'');
const events=[];
const context={THREE:{},console,createVFX:()=>({play:(id,args)=>{events.push({id,args});},list:()=>[],update:()=>{},clear:()=>{},stats:()=>({actors:0,particles:0})})};
vm.runInNewContext(code+'\nthis.api={initClaudeVfx,playClaudeSkill,playClaudeVfx,CLASS_SKILL_VFX};',context);
const {initClaudeVfx,playClaudeSkill,CLASS_SKILL_VFX}=context.api;
initClaudeVfx({scene:{},getHeightAt:(x,z)=>0,renderer:null});
const map={
 kn:['slash_cross','boss_roar','shield','ground_slam'],
 pa:['smite','lightning_sky','aura','beam'],
 so:['fireball','explosion','aura','meteor'],
 dr:['ice_bolt','heal','ice_burst','heal'],
 yo:['slash_fire','shadow_burst','shield','slash_spin']
};
const player={x:1,z:2,mesh:{rotation:{y:0}}};
const enemy={x:6,z:8};
for(const [cls,ids] of Object.entries(map)){
 assert.equal(CLASS_SKILL_VFX[cls].length,4);
 for(let slot=0;slot<4;slot++){
  assert.equal(playClaudeSkill(cls,slot,player,enemy),true);
  const {id,args}=events.at(-1);
  assert.equal(id,ids[slot],cls+' slot '+slot+' effect');
  assert.ok(Number.isFinite(args.pos.x+args.pos.y+args.pos.z));
 }
}
assert.equal(events.length,20,'20 habilidades ligadas ao motor Claude');
const target=events.find(x=>x.id==='smite');
assert.equal(target.args.pos.x,enemy.x,'Paladino smite goes to enemy, not feet of player');
const spell=events.find(x=>x.id==='fireball');
assert.equal(spell.args.pos.x,player.x);
assert.equal(spell.args.target.x,enemy.x);
const healing=events.find(x=>x.id==='heal');
assert.equal(healing.args.pos.x,player.x,'heal is self-cast');
assert.equal(playClaudeSkill('foo',0,player,enemy),false,'no invented class effects');
assert.equal(playClaudeSkill('kn',8,player,enemy),false,'no invented skill slots');
console.log('PASS: 5 classes, 20 habilidades, posições de alvo, autocura e projétil preservadas');
