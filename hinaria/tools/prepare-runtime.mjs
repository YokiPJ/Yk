/** Package pinned browser libraries and their licenses without node_modules. */
import {readFileSync,copyFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {webDependencies} from './web-dependencies.mjs';

export function prepareRuntime(project,output){
  const lock=JSON.parse(readFileSync(join(project,'package-lock.json'),'utf8'));
  const packages={'three.module.js':'three','anime.es.js':'animejs','pixi.min.mjs':'pixi.js','capacitor-core.js':'@capacitor/core'};
  const licenses={three:'LICENSE',animejs:'LICENSE.md','pixi.js':'LICENSE','@capacitor/core':'LICENSE'};
  const manifest={schemaVersion:1,files:{}};
  for(const [name,relative] of Object.entries(webDependencies)){
    const pkg=packages[name],directory=join(project,'node_modules',pkg);
    const installed=JSON.parse(readFileSync(join(directory,'package.json'),'utf8')).version;
    if(installed!==lock.packages['node_modules/'+pkg]?.version)throw new Error('Dependência fora do lockfile: '+pkg);
    for(const [source,target] of [[join(project,'node_modules',relative),name],[join(directory,licenses[pkg]),'licenses/'+pkg.replace('/','-')+'.txt']]){
      const destination=join(output,target);mkdirSync(dirname(destination),{recursive:true});copyFileSync(source,destination);
      const bytes=readFileSync(destination);manifest.files[target]={package:pkg,version:installed,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
    }
  }
  writeFileSync(join(output,'runtime-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  return manifest;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const output=process.argv[2];if(!output)throw new Error('Informe a pasta de destino do runtime.');
  const manifest=prepareRuntime(fileURLToPath(new URL('../',import.meta.url)),resolve(output));
  console.log('Runtime local preparado: '+Object.keys(manifest.files).length+' arquivos e licenças.');
}
