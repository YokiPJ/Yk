/** Resolve the same local runtime for source checkouts and ready-to-play ZIPs. */
import {statSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {webDependencies} from './web-dependencies.mjs';

const fileExists=path=>{try{const file=statSync(path);return file.isFile()&&file.size>0;}catch{return false;}};
export function runtimeDependency(project,name){
  if(!Object.hasOwn(webDependencies,name))return null;
  const bundled=resolve(project,'vendor',name);
  if(fileExists(bundled))return bundled;
  const installed=resolve(project,'node_modules',webDependencies[name]);
  return fileExists(installed)?installed:null;
}
export function missingRuntimeDependencies(project){
  return Object.keys(webDependencies).filter(name=>!runtimeDependency(project,name));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const project=fileURLToPath(new URL('../',import.meta.url));
  const missing=missingRuntimeDependencies(project);
  if(missing.length){
    if(!process.argv.includes('--quiet'))console.error('Dependências ausentes: '+missing.join(', ')+'. Execute npm run setup na pasta principal.');
    process.exitCode=1;
  }
}
