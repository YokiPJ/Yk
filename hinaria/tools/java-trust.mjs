/** Preserve JVM TLS validation while trusting the CA injected by the managed host. */
import { existsSync, readFileSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
export function javaTrustStore() {
  if (process.env.HINARIA_JAVA_TRUSTSTORE) return process.env.HINARIA_JAVA_TRUSTSTORE;
  const ca='/usr/local/share/ca-certificates/environment-proxy-ca.crt';
  const system='/etc/ssl/certs/java/cacerts';
  if (!existsSync(ca)) return existsSync(system)?system:null;
  const keytool=process.env.JAVA_HOME?join(process.env.JAVA_HOME,'bin',process.platform==='win32'?'keytool.exe':'keytool'):'keytool';
  const base=existsSync(system)?system:join(process.env.JAVA_HOME||'', 'lib','security','cacerts');
  if(!existsSync(base))throw new Error('Truststore Java ausente. Configure HINARIA_JAVA_TRUSTSTORE.');
  const folder=resolve(dirname(fileURLToPath(import.meta.url)),'../.local/java-trust');
  mkdirSync(folder,{recursive:true});
  const store=join(folder,'cacerts'),stamp=join(folder,'source.sha256');
  const fingerprint=createHash('sha256').update(readFileSync(ca)).update(readFileSync(base)).digest('hex');
  if(!existsSync(store)||!existsSync(stamp)||readFileSync(stamp,'utf8')!==fingerprint){
    copyFileSync(base,store);
    const result=spawnSync(keytool,['-importcert','-noprompt','-alias','hinaria-managed-environment','-file',ca,'-keystore',store,'-storepass','changeit'],{encoding:'utf8'});
    if(result.status!==0)throw new Error('Não foi possível adicionar a CA pública do ambiente ao truststore Java: '+result.stderr);
    writeFileSync(stamp,fingerprint);
  }
  return store;
}
