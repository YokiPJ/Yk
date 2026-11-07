/** Run the production logical generator: no GPU, DOM or duplicated map formula. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {PART2_LAYOUT,PART2_SPAWNS} from '../src/content/part2.js';

const source=readFileSync(new URL('../src/world/world.js',import.meta.url),'utf8');
const logical=source.slice(source.indexOf('// Seeded random for reproducible world'),source.indexOf('/**\n * Build Three.js meshes for the world'))
  .replaceAll('export const ','const ').replaceAll('export function ','function ');
const W=96,blocking=new Set(['pine','oak','dead','rock','fence','barrel','crate','pillar','wall','well','stall','tent','altar']);
function createContext(spawns=PART2_SPAWNS){
  const state={};
  const context=vm.createContext({CONFIG:{WORLD_SIZE:W},gameState:state,PART2_LAYOUT,PART2_SPAWNS:spawns,console:{log(){}}});
  vm.runInContext(logical,context);
  return {state,run:code=>vm.runInContext(code,context)};
}
const {state,run}=createContext();
const hash=()=>createHash('sha256').update(JSON.stringify({G:state.G,ZN:state.ZN,B:state.B,OB:state.OB,HO:state.HO,CH:state.CH,LM:state.LM,BRG:state.BRG,HG:Array.from(state.HG)})).digest('hex');
assert.equal(run('normalizeWorldSeed(11)'),11);
assert.equal(run('normalizeWorldSeed(0)'),1);
assert.equal(run('normalizeWorldSeed(-11)'),11);
assert.equal(run('normalizeWorldSeed("hinaria-beta")'),run('normalizeWorldSeed("hinaria-beta")'));
for(const invalid of ['1.5','NaN','Infinity','""','"a".repeat(81)','null','{}'])
  assert.throws(()=>run(`generateWorld({seed:${invalid}})`),/semente/);

run('generateWorld({seed:11})');const original=hash();
run('for(let i=0;i<1000;i++){rnd(-3,8);ri(1,9)};generateWorld({seed:11})');
assert.equal(hash(),original,'same seed replaces arrays and reproduces the complete logical world');
assert.equal(state.G.length,W);assert.equal(state.HO.length,8);assert.equal(state.LM.length,26+PART2_LAYOUT.landmarks.length);
assert.equal(state.worldSeed,11);assert.equal(state.worldGenerationVersion,2);
const firstGameplay=Array.from(run('Array.from({length:12},()=>ri(1,99999))'));
run('generateWorld({seed:11});for(let i=0;i<10000;i++){worldRnd(0,1);worldRi(0,255)}');
assert.deepEqual(Array.from(run('Array.from({length:12},()=>ri(1,99999))')),firstGameplay,'texture/layout detail cannot shift gameplay random draws');
run('generateWorld({seed:12})');assert.notEqual(hash(),original,'a different seed produces a different layout');

function independentReachability(){
  const reached=new Uint8Array(W*W),queue=[13*W+15];reached[queue[0]]=1;
  for(let cursor=0;cursor<queue.length;cursor++){
    const cell=queue[cursor],x=Math.floor(cell/W),z=cell%W;
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const a=x+dx,b=z+dz,n=a*W+b;
      if(a<0||b<0||a>=W||b>=W||state.B[a][b]||reached[n])continue;
      reached[n]=1;queue.push(n);
    }
  }
  return reached;
}
const pointsWithin=(x,z,r)=>{const cells=[];for(let a=Math.max(0,Math.floor(x-r));a<=Math.min(W-1,Math.ceil(x+r));a++)for(let b=Math.max(0,Math.floor(z-r));b<=Math.min(W-1,Math.ceil(z+r));b++)if(Math.hypot(x-a,z-b)<r)cells.push(a*W+b);return cells;};
let repairedRoutes=0,frontierVegetationRemoved=0;
const seedReports=[];
for(let seed=1;seed<=128;seed++){
  run(`generateWorld({seed:${seed}})`);
  const reached=independentReachability();
  assert.deepEqual(Array.from(state.RC),Array.from(reached),'RC agrees with independent four-way navigation');
  for(const [x,z] of [[13,15],[17,9],[6,6]])assert.equal(reached[x*W+z],1,`seed ${seed}: NPC/spawn ${x},${z}`);
  for(const house of state.HO){
    const x=Math.round(house.x),z=Math.round(house.z+house.d/2+1);
    assert.equal(reached[x*W+z],1,`seed ${seed}: physical doorway ${house.district}`);
    for(let a=Math.ceil(house.x-house.w/2+.01);a<=Math.floor(house.x+house.w/2-.01);a++)
      for(let b=Math.ceil(house.z-house.d/2+.01);b<=Math.floor(house.z+house.d/2-.01);b++)
        assert.equal(state.B[a][b],1,'designed house footprint is never drilled by route repair');
  }
  for(const landmark of state.LM)assert.ok(pointsWithin(landmark.x,landmark.z,landmark.r).some(cell=>reached[cell]),`seed ${seed}: landmark ${landmark.n}`);
  for(const chest of state.CH){assert.equal(state.B[chest.x][chest.z],1);assert.ok(pointsWithin(chest.x,chest.z,1.8).some(cell=>reached[cell]),`seed ${seed}: chest ${chest.n}`);}
  for(const zone of PART2_SPAWNS){
    let eligible=0;
    for(let x=zone.x0;x<=zone.x1;x++)for(let z=zone.z0;z<=zone.z1;z++)if(reached[x*W+z]&&zone.zn.includes(state.ZN[x][z]))eligible++;
    assert.ok(eligible>=zone.n,`seed ${seed}: safe spawn capacity ${zone.id}`);
  }
  for(let x=0;x<W;x++)for(let z=0;z<W;z++){
    if(state.G[x][z]===3||x===0||z===0||x===W-1||z===W-1)assert.equal(state.B[x][z],1,'river/boundary collision retained');
  }
  for(let x=16;x<=18;x++)for(let z=5;z<=7;z++)assert.equal(state.B[x][z],1,'forge footprint retained');
  for(const bridge of state.BRG){
    const z=Math.round((bridge.z0+bridge.z1)/2);
    for(let x=bridge.x0;x<=bridge.x1;x++){
      assert.equal(reached[x*W+z],1,'bridge crossing stays reachable');
      for(const rail of [bridge.z0,bridge.z1])if(state.G[x][rail]===4)assert.equal(state.B[x][rail],1,'bridge rails retained');
    }
  }
  for(const object of state.OB){
    if(!blocking.has(object.t)||object.nb)continue;
    const x=Math.round(object.x),z=Math.round(object.z);
    assert.equal(state.B[x][z],1,`seed ${seed}: visible ${object.t} agrees with collision at ${x},${z}`);
  }
  for(const [name,x,z] of [['Marca do Escudo Partido',85.5,80],['Marca do Passo no Gelo',88.5,78],['Marca do Machado Silencioso',90,83.5]]){
    const point=state.LM.find(l=>l.n===name);assert.equal(point.x,x);assert.equal(point.z,z);
  }
  repairedRoutes+=state.worldGenerationDiagnostics.routeRepairs.length;
  frontierVegetationRemoved+=state.worldGenerationDiagnostics.frontierVegetationRemoved;
  seedReports.push({seed,...state.worldGenerationDiagnostics,doors:state.HO.length,landmarks:state.LM.length});
}
assert.ok(frontierVegetationRemoved>0,'generated frontier openings remove matching visual blockers');
const beforeGuard=hash();state.ground={isMesh:true};
assert.throws(()=>run('generateWorld({seed:1})'),/geometria/);assert.equal(hash(),beforeGuard,'live-scene guard leaves the logical map intact');state.ground=null;
state.worldChunks=new Map([['0,0',{}]]);assert.throws(()=>run('generateWorld()'),/geometria/);

// Force a narrow separation using real procedural metadata: prune one tree,
// preserve all other trees, and reject immutable walls rather than tunnelling.
const fixture=createContext([]),f=fixture.state;
f.G=Array.from({length:W},()=>Array(W).fill(0));f.B=Array.from({length:W},(_,x)=>Array.from({length:W},(_,z)=>+(x===0||z===0||x===W-1||z===W-1)));
f.HO=[];f.LM=[];f.CH=[];f.OB=[];f.worldSeed=42;f.worldGenerationDiagnostics={};
for(let z=1;z<W-1;z++)f.OB.push({t:'oak',x:14,z,procedural:true});
const structural=f.B.map(row=>row.slice());for(let z=1;z<W-1;z++)f.B[14][z]=1;
fixture.run('globalThis.structuralInput=null');
// The VM receives only the immutable snapshot, not an alternate generator.
fixture.run('globalThis.structuralInput='+JSON.stringify(structural));
fixture.run('ensureWorldRoutes(structuralInput)');
assert.equal(f.worldGenerationDiagnostics.routeVegetationRemoved,1);
assert.equal(f.OB.length,W-3,'repair does not clear all vegetation');
for(let z=1;z<W-1;z++)f.B[14][z]=1;
fixture.run('globalThis.structuralInput='+JSON.stringify(f.B));
assert.throws(()=>fixture.run('ensureWorldRoutes(structuralInput)'),/Nenhuma rota segura/,'immutable walls cannot be drilled');
if(process.env.HINARIA_PROCEDURAL_REPORT)writeFileSync(process.env.HINARIA_PROCEDURAL_REPORT,JSON.stringify({status:'PASS',seeds:128,generatorVersion:2,frontierVegetationRemoved,generatedRouteRepairs:repairedRoutes,forcedRepairRemovedOneTree:true,structuralWallRepairRejected:true,reports:seedReports},null,2)+'\n');
console.log(`PASS procedural generation: 128 seeds, deterministic regeneration and independent RNG, 8 doors, all landmarks/chests, Part II spawns, river/bridge/house collision, visual agreement, safe route repairs (${repairedRoutes} generated repairs; ${frontierVegetationRemoved} frontier blockers removed).`);
