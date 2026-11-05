import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const w = readFileSync(new URL('./src/world/world.js', import.meta.url), 'utf8');
const part = w.slice(w.indexOf('// Seeded random for reproducible world'), w.indexOf('/**\n * Build Three.js meshes for the world'))
   .replaceAll('export const ', 'const ').replaceAll('export function ','function ');
const st={G:[],ZN:[],B:[],OB:[],CLR:[],HO:[],CH:[],LM:[],BRG:[],HS:[]};
vm.runInNewContext(part+'\ngenerateWorld();',{CONFIG:{WORLD_SIZE:64},gameState:st,console});
const safe=[['Praça',13,15],['Bram',17,9],['Yoki',6,6],['Saída sul',17,24],['Via leste',24,15]];
for(const [label,x,z] of safe){assert.equal(st.B[x][z],0,`${label} blocked`);assert.equal(st.RC[x*64+z],1,`${label} unreachable`)}
const vila=st.OB.filter(o=>o.district);
const lanterns=vila.filter(o=>o.t==='lantern');
const stalls=vila.filter(o=>o.t==='stall');
const oldTorches=st.OB.filter(o=>o.t==='torch'&&o.x<27&&o.z<27);
assert.equal(oldTorches.length,0,'all old village torches must be removed');
assert.ok(lanterns.length>=9,'lighting of all districts');
assert.equal(stalls.length,2,'north and south market stalls');
assert.equal(st.HO.length,8,'seven village houses plus remote cabin');
assert.equal(st.LM.length,17);assert.equal(st.CH.length,6);
for(const o of vila){assert.ok(o.district,'all organized props need district names')}
for(const o of lanterns)assert.equal(o.nb,1,'thin lanterns must not block full walking tiles');
assert.equal(st.B[15][12],1);assert.equal(st.B[16][12],1);
assert.equal(st.B[10][18],1);assert.equal(st.B[11][18],1);
for (const h of st.HO.filter(h=>h.district)) {
  const x=Math.round(h.x),z=Math.round(h.z+h.d/2+1);
  assert.equal(st.B[x][z],0,`${h.district} doorway blocked`);
  assert.equal(st.RC[x*64+z],1,`${h.district} doorway unreachable`);
}
const ps=readFileSync(new URL('./src/player/player.js',import.meta.url),'utf8');
assert.match(ps,/hp:\s*CLASSES\.kn\.hp/);assert.match(ps,/max:\s*CLASSES\.kn\.hp/);
const combat=readFileSync(new URL('./src/combat/combat.js',import.meta.url),'utf8');
assert.match(combat,/buildRig, updateSkillUI/);
const quest=readFileSync(new URL('./src/ui/dialogueUI.js',import.meta.url),'utf8');
assert.match(quest,/Aceitar missão/);assert.match(quest,/Entregar missão/);assert.match(quest,/Q\.talk\(id, 'sim'\)/);assert.match(quest,/Q\.talk\(id, 'hi'\)/);
console.log('PASS V7 Vilarrubra:',vila.length,'organized props,',lanterns.length,'new lanterns,',stalls.length,'market stalls, no old torches, all quest routes and stats OK');
