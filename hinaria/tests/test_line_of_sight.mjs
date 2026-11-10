import assert from 'node:assert/strict';
import {hasLineOfSight,findForwardEnemy} from '../src/combat/forwardHit.js';
import {findAttackEnemy} from '../src/combat/attackAim.js';

for(const sx of [-1,1])for(const sz of [-1,1]) {
  const B=Array.from({length:14},()=>Array(14).fill(0));
  B[6+sx][6]=1;B[6][6+sz]=1;
  const P={x:6,z:6,mesh:{rotation:{y:Math.atan2(sx,sz)}}};
  const enemy={kind:'m',hp:100,x:6+sx,z:6+sz};
  const state={B,ents:[enemy]};
  assert.equal(hasLineOfSight(state,P.x,P.z,enemy.x,enemy.z),false,'closed diagonal corner');
  assert.equal(hasLineOfSight(state,enemy.x,enemy.z,P.x,P.z),false,'symmetric corner');
  assert.equal(findAttackEnemy(state,P,4),null,'aim cannot acquire through corners');
  assert.equal(findForwardEnemy(state,P,4),null,'skills cannot acquire through corners');
  B[6+sx][6]=B[6][6+sz]=0;
  assert.equal(hasLineOfSight(state,P.x,P.z,enemy.x,enemy.z),true,'open diagonal stays usable');
  // Half-tile endpoints, including mixed negative directions, must terminate.
  assert.equal(hasLineOfSight(state,6,6,6+sx*.5,6+sz*.5),true);
}
for(const point of [[NaN,0],[Infinity,1],[-Infinity,0]])assert.equal(hasLineOfSight({},...point,1,1),false);
assert.equal(hasLineOfSight({},3,3,3,3),true);

// Independent segment-vs-box oracle, not another grid traversal/sampling loop.
function intersects(x0,z0,x1,z1,x,z) {
  let low=0,high=1;
  for(const [origin,direction,min,max] of [[x0,x1-x0,x-.5,x+.5],[z0,z1-z0,z-.5,z+.5]]) {
    if(direction===0){if(origin<min||origin>max)return false;continue;}
    const a=(min-origin)/direction,b=(max-origin)/direction;
    low=Math.max(low,Math.min(a,b));high=Math.min(high,Math.max(a,b));
    if(low>high)return false;
  }
  return true;
}
let seed=0x48494e41;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
let rays=0;
for(let map=0;map<10;map++) {
  const B=Array.from({length:12},()=>Array.from({length:12},()=>+(random()<.16)));
  for(let i=0;i<80;i++) {
    const points=Array.from({length:4},()=>.05+random()*10.9),[x0,z0,x1,z1]=points;
    let expected=true;
    for(let x=0;x<12;x++)for(let z=0;z<12;z++)if(B[x][z]&&intersects(x0,z0,x1,z1,x,z))expected=false;
    assert.equal(hasLineOfSight({B},...points),expected,'ray agrees with collision boxes');
    assert.equal(hasLineOfSight({B},x1,z1,x0,z0),expected,'reverse ray agrees');rays++;
  }
}
console.log(`PASS line of sight: four closed corners, half-tile endpoints, aim/skills and ${rays} analytic collision comparisons in both directions.`);
