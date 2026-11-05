import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
const cwd=resolve('.');
const html=readFileSync(join(cwd,'index.html'),'utf8');
const pkg=JSON.parse(readFileSync(join(cwd,'package.json'),'utf8'));
const cfg=JSON.parse(readFileSync(join(cwd,'capacitor.config.json'),'utf8'));
if(pkg.devDependencies.three!=='0.160.0')throw Error('Three.js mismatch');
if(cfg.webDir!=='www')throw Error('Capacitor webDir mismatch');
for(const f of ['src/main.js','src/player/controls.js','src/quest/questUI.js','src/world/world.js','src/world/v6Architecture.js','assets/ui/cover_01.jpg','assets/ui/portrait_08.jpg','tools/build-web.mjs']){
 if(!existsSync(join(cwd,f)))throw Error('Arquivo obrigatório ausente: '+f);
}
if(!html.includes('https://unpkg.com/three@0.160.0/'))throw Error('CDN original esperado para conversão offline');
if(existsSync(join(cwd,'www','index.html'))){
 const offline=readFileSync(join(cwd,'www','index.html'),'utf8');
 if(offline.includes('unpkg.com')||offline.includes('fonts.googleapis.com')) throw Error('URLs online no WWW');
 if(!existsSync(join(cwd,'www','vendor','three.module.js')))throw Error('Falta Three local no WWW');
}
console.log('OK: projeto V7 + configuração Android + referências de assets.');
