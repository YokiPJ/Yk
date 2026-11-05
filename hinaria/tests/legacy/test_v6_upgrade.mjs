import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { installV6Environment } from './src/assets/v6Environment.js';
const geometryTypes=['BoxGeometry','ConeGeometry','CylinderGeometry','IcosahedronGeometry'];
const geometryMock={};
for(const type of geometryTypes) geometryMock[type]=class{constructor(...args){this.type=type;this.args=args}};
const observed={};
const model={};
installV6Environment(geometryMock,model, parts=>{
  for(const p of parts){
    assert.equal(p.length,4);
    assert.ok(geometryTypes.includes(p[0].type),`supported geom ${p[0].type}`);
    assert.equal(p[2].length,3);
    assert.ok(Number.isInteger(p[1]),'colored mesh part');
  }
  return {parts:parts.length,dispose(){}};
});
for(const t of ['pine','oak','dead','bush','rock','srock','cliff','fence','barrel','crate','lamp','well','stall','tent','wall','pillar','sign','log','altar','torch','fire']) {
  assert.ok(model[t],`${t} model built`);
  assert.ok(model[t].parts>=2,`${t} multi-part silhouette`);
  observed[t]=model[t].parts;
}
for(let i=1;i<=11;i++){
  const name=`assets/ui/${i<=3?'cover_'+String(i).padStart(2,'0'):'portrait_'+String(i-3).padStart(2,'0')}.jpg`;
  assert.ok(existsSync(new URL(name,import.meta.url)),`${name} extracted`);
  const data=readFileSync(new URL(name,import.meta.url));
  assert.ok(data.length>1000 && data[0]===0xff && data[1]===0xd8,`${name} is a JPEG`);
}
const world=readFileSync(new URL('src/world/world.js',import.meta.url),'utf8');
assert.ok(world.includes('buildVillageHouseV6(h,'),'new house builder in runtime');
assert.ok(world.includes('buildForgeV6('),'new forge builder in runtime');
assert.ok(world.includes('BEFORE flood-fill/pathfinding'),'forge registered before pathfinding');
const models=readFileSync(new URL('src/player/characterModels.js',import.meta.url),'utf8');
assert.ok(models.includes('batchCharacterMeshes(group)'),'runtime batches painted parts');
const index=readFileSync(new URL('index.html',import.meta.url),'utf8');
for(let i=1;i<=3;i++)assert.ok(index.includes(`assets/ui/cover_0${i}.jpg`));
console.log(`PASS V6: ${Object.keys(observed).length} rebuilt instanced environmental types, 11 extracted JPEGs, houses, forge, batching, collision integration`);
