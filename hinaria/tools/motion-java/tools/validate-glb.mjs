import validator from 'gltf-validator';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const manifest=JSON.parse(await readFile(root+'output/manifest.json','utf8')),reports=[];
for(const model of manifest.models){
 const result=await validator.validateBytes(new Uint8Array(await readFile(root+'output/'+model.file)),{uri:model.file,maxIssues:1000});
 reports.push({model:model.id,errors:result.issues.numErrors,warnings:result.issues.numWarnings,infos:result.issues.numInfos,messages:result.issues.messages});
 console.log(model.id+': errors='+result.issues.numErrors+' warnings='+result.issues.numWarnings);
}
await writeFile(root+'output/gltf-validation.json',JSON.stringify({validator:validator.version(),reports},null,2)+'\n');
if(reports.some(r=>r.errors))process.exitCode=1;
