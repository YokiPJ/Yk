import { spawnSync } from 'node:child_process';
import { existsSync, copyFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { javaTrustStore } from './java-trust.mjs';
import { verifyApk } from './verify-apk.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const android=join(root,'android');
const win=process.platform === 'win32';
const gradlew=join(android,win?'gradlew.bat':'gradlew');
if (!existsSync(gradlew)) {
  console.error('Falta android/gradlew. Use npm run android:add na primeira vez.');
  process.exit(1);
}
const args=['--no-daemon','--max-workers=2'];
// Java/Gradle do not automatically honor HTTPS_PROXY. Reuse its host/port,
// keeping credentials in the platform proxy and TLS verification enabled.
const proxyValue=process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxyValue) {
  const proxy=new URL(proxyValue);
  if (!['http:','https:'].includes(proxy.protocol)) throw new Error('Proxy HTTP/HTTPS necessário para Gradle.');
  const port=proxy.port || (proxy.protocol==='https:'?'443':'80');
  for (const scheme of ['http','https']) args.push(`-D${scheme}.proxyHost=${proxy.hostname}`,`-D${scheme}.proxyPort=${port}`);
  // Use the host's trusted CA store when available (includes managed proxy CA).
  // This retains full certificate verification for a separately installed JDK.
  const trustStore=javaTrustStore();
  if (trustStore && existsSync(trustStore)) args.push(`-Djavax.net.ssl.trustStore=${trustStore}`);
}
args.push('assembleDebug');
// Recreate the signed ZIP instead of carrying unused gaps from incremental
// packaging of replaced assets. Keep compilation/dependency caches intact.
rmSync(join(android,'app','build','outputs','apk','debug'),{recursive:true,force:true});
const r=spawnSync(win?'gradlew.bat':gradlew,args,{cwd:android,stdio:'inherit',shell:win});
if (r.error) throw r.error;
if (r.status!==0) process.exit(r.status||1);
const apk=join(android,'app','build','outputs','apk','debug','app-debug.apk');
if (!existsSync(apk)) throw new Error('Gradle terminou sem encontrar app-debug.apk');
const build=verifyApk(apk,join(root,'www'));

const target=join(root,'APK_GERADO','HINARIA_V7_DEBUG.apk');
mkdirSync(dirname(target),{recursive:true});
copyFileSync(apk,target);
const upgraded=join(root,'APK_GERADO','HINARIA_UPGRADE_DEBUG.apk');
copyFileSync(apk,upgraded);
const downloads=join(root,'downloads');
mkdirSync(downloads,{recursive:true});
const release=JSON.parse(readFileSync(join(root,'release.json'),'utf8'));
const integrated=join(downloads,release.apk);
copyFileSync(apk,integrated);
const checksums=spawnSync(process.execPath,[join(root,'tools','refresh-downloads.mjs')],{cwd:root,stdio:'inherit'});
if(checksums.error) throw checksums.error;
if(checksums.status!==0) process.exit(checksums.status||1);
console.log('APK integrado ao projeto: '+integrated);
console.log('HINÁRIA upgrade APK: '+upgraded+' · fingerprint '+build.fingerprint);
console.log('Versão web verificada: '+build.version);
console.log('APK criado em: '+target);
