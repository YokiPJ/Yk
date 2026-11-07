/**
 * Transform the V7 web game to an entirely local Capacitor WebView build.
 * Run after npm install. No CDN or internet needed at game runtime.
 */
import { cpSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { readdirSync, statSync } from 'node:fs';
import { localizeHTML, webDependencies } from './web-dependencies.mjs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {bundleMobile} from './bundle-mobile.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root,'www');
const release=JSON.parse(readFileSync(join(root,'release.json'),'utf8'));
const gameOnly=process.argv.includes('--game-only');
const vendor = join(root,'node_modules','three','build','three.module.js');
if (!existsSync(vendor)) {
  console.error('Three.js local não encontrado. Execute "npm install" antes de "npm run build:web".');
  process.exit(1);
}
for (const name of ['src','assets','index.html','src/vfx/claudeVfx.js','src/vfx/claudeVfxBridge.js']) {
  if (!existsSync(join(root,name))) throw new Error(`Faltando na V7: ${name}`);
}
const htmlFile = join(root,'index.html');
let html=readFileSync(htmlFile,'utf8');
const animeVendor = join(root,'node_modules','animejs','lib','anime.es.js');
if (!existsSync(animeVendor)) {
  console.error('anime.js local não encontrado. Execute "npm install" antes de "npm run build:web".');
  process.exit(1);
}
const pixiVendor = join(root,'node_modules','pixi.js','dist','pixi.min.mjs');
if (!existsSync(pixiVendor)) {
  console.error('pixi.js local não encontrado. Execute "npm install" antes de "npm run build:web".');
  process.exit(1);
}
html = localizeHTML(html);
rmSync(out, {recursive:true,force:true});
mkdirSync(join(out,'vendor'),{recursive:true});
for (const d of ['src','assets',...(!gameOnly?['studio']:[])]) cpSync(join(root,d),join(out,d),{recursive:true});
if(gameOnly){
  const audio=JSON.parse(readFileSync(join(root,'mobile-assets/audio/manifest.json'),'utf8'));
  for(const track of audio.tracks){
    const source=join(root,'assets/audio',track.name),mobile=join(root,'mobile-assets/audio',track.name);
    const sha=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
    if(sha(source)!==track.sourceSHA256||sha(mobile)!==track.mobileSHA256)throw new Error('Atualize a variante de áudio mobile: '+track.name);
    copyFileSync(mobile,join(out,'assets/audio',track.name));
  }
}
// The packaged app cannot contain its own APK. The full project serves it from
// downloads/; a standalone www build keeps only the Java tool download.
if(!gameOnly){
  mkdirSync(join(out,'downloads'),{recursive:true});
  copyFileSync(join(root,'downloads','HinariaMotion.jar'),join(out,'downloads','HinariaMotion.jar'));
  const studioIndex=join(out,'studio','index.html');
  writeFileSync(studioIndex,readFileSync(studioIndex,'utf8').replace(
    `href="../downloads/${release.apk}"`,
    `href="https://github.com/${release.repository}/releases/download/${release.tag}/${release.apk}"`
  ));
}
if(!gameOnly){
  copyFileSync(vendor,join(out,'vendor','three.module.js'));
  copyFileSync(animeVendor,join(out,'vendor','anime.es.js'));
  copyFileSync(pixiVendor,join(out,'vendor','pixi.min.mjs'));
  copyFileSync(join(root,'node_modules',webDependencies['capacitor-core.js']),join(out,'vendor','capacitor-core.js'));
}
copyFileSync(join(root,'webview-error.html'),join(out,'webview-error.html'));
mkdirSync(join(out,'vendor','licenses'),{recursive:true});
for (const [name,license] of Object.entries({three:'three/LICENSE',pixi:'pixi.js/LICENSE',anime:'animejs/LICENSE.md',capacitor:'@capacitor/core/LICENSE'}))
  copyFileSync(join(root,'node_modules',license),join(out,'vendor','licenses',name+'.txt'));
writeFileSync(join(out,'index.html'),html);
const compatibility=gameOnly?await bundleMobile(root,out):{format:'esm',target:'modern',imports:'importmap'};
// Include every source/asset/vendor in release identity, including new UI/save modules.
const manifest = {};
function inventory(dir) {
  for (const name of readdirSync(dir).sort()) {
    const file = join(dir, name);
    if (statSync(file).isDirectory()) inventory(file);
    else manifest[relative(out, file).split('\\').join('/')] = createHash('sha256').update(readFileSync(file)).digest('hex');
  }
}
inventory(out);
const fingerprint = createHash('sha256').update(JSON.stringify(manifest)).digest('hex').slice(0,12);
writeFileSync(join(out,'build-manifest.json'),JSON.stringify(manifest,null,2));
writeFileSync(join(out,'build-info.json'),JSON.stringify({version:release.version,target:gameOnly?'mobile':'full',compatibility,fingerprint,created:new Date().toISOString()},null,2));
console.log('HINÁRIA upgrade · '+Object.keys(manifest).length+' arquivos · SHA256 '+fingerprint);
console.log(`WebView offline: ${out}`);
