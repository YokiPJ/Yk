/** Regression suite, runnable with plain Node.js (no Chromium/Playwright required). */
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dir=join(root,'tests');
const tests=readdirSync(dir).filter(x=>/\.([cm]?js|mjs)$/.test(x)).sort();
let failed=0;
for(const file of tests){
 const p=spawnSync(process.execPath,[join(dir,file)],{cwd:root,encoding:'utf8'});
 if(p.status===0)console.log(`PASS ${file}`);
 else {failed++;console.error(`FAIL ${file}\n${p.stderr||p.stdout}`);}
}
console.log(`${tests.length-failed}/${tests.length} testes aprovados.`);
if(failed)process.exitCode=1;
