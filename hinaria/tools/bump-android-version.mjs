/** Bump versionCode so Android accepts a new APK over a previously installed V7. */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
const root=resolve(new URL('../',import.meta.url).pathname);
const f=join(root,'android/app/build.gradle');
if(!existsSync(f))throw new Error('Pasta android/ nao existe: rode npx cap add android primeiro.');
let code=readFileSync(f,'utf8');
const match=code.match(/\bversionCode\s+(\d+)\b/);
if(!match)throw new Error('Nao encontrei versionCode numerico em android/app/build.gradle');
const next=Number(match[1])+1;
code=code.replace(/\bversionCode\s+\d+\b/,`versionCode ${next}`);
writeFileSync(f,code);
console.log(`Android versionCode atualizado: ${match[1]} -> ${next}`);
