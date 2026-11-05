import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root=resolve(new URL('..', import.meta.url).pathname);
const file=p=>readFileSync(join(root,p),'utf8');
const loader=file('src/assets/hinariaTextures.js');
assert.match(loader,/textureCache/);
assert.match(loader,/THREE\.RepeatWrapping/);
assert.match(loader,/THREE\.SRGBColorSpace/);
for(const name of ['plaster','roof_tiles','wood_planks','foliage','grass','cobblestone','skin_human','skin_orc','skin_troll']){
  assert(existsSync(join(root,`assets/textures/texturas/${name}.png`)));
  assert(existsSync(join(root,`assets/textures/normais/${name}_n.png`)));
}
for(const path of ['src/assets/environmentV2.js','src/world/houseInteriors.js','src/world/world.js','src/player/characterModels.js'])
  assert.match(file(path),/addSurface/,path);
assert.match(file('src/world/world.js'),/decorateTerrainCanvas/);
assert.match(file('src/world/world.js'),/registerChunkVisual/);
console.log('PASS integrated texture paths, caching, terrain and material hooks');
