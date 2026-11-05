/** Link the real ES module graph without evaluating gameplay/browser side effects. */
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
if (!vm.SourceTextModule) {
  const run=spawnSync(process.execPath,['--experimental-vm-modules',fileURLToPath(import.meta.url)],{stdio:'inherit'});
  process.exit(run.status ?? 1);
}
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const modules=new Map();
const bare={three:join(root,'node_modules/three/build/three.module.js'),
  animejs:join(root,'node_modules/animejs/lib/anime.es.js'),
  'pixi.js':join(root,'node_modules/pixi.js/dist/pixi.min.mjs')};
function compile(path) {
  path=resolve(path);
  if(!modules.has(path)) modules.set(path,new vm.SourceTextModule(readFileSync(path,'utf8'),{identifier:pathToFileURL(path).href}));
  return modules.get(path);
}
function dependency(specifier,referrer) {
  const path=specifier.startsWith('.')?resolve(dirname(fileURLToPath(referrer.identifier)),specifier):bare[specifier];
  if(!path)throw new Error('Import não mapeado: '+specifier+' em '+referrer.identifier);
  return compile(path);
}
const files=[];
function walk(dir) {
  for(const e of readdirSync(dir,{withFileTypes:true})){
    const p=join(dir,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.js'))files.push(p);
  }
}
try {
  walk(join(root,'src'));
  for(const file of files)compile(file);
  for(const file of files){const mod=compile(file);if(mod.status==='unlinked')await mod.link(dependency);}
  for(const path of Object.values(bare)){const mod=compile(path);if(mod.status==='unlinked')await mod.link(dependency);}
  console.log(`PASS imports: ${files.length} módulos do jogo e Three/Pixi/anime vinculados; exports estáticos válidos, sem executar DOM.`);
} catch(error) { console.error(error);process.exitCode=1; }
