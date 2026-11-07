/** One classic script for Android WebViews without import-map support. */
import {build} from 'esbuild';
import {resolve,join} from 'node:path';
import {readFileSync,writeFileSync} from 'node:fs';
export async function bundleMobile(root,out){
  const result=await build({
    entryPoints:[join(root,'src/main.js')],outfile:join(out,'game.js'),bundle:true,
    format:'iife',platform:'browser',target:['chrome80'],minify:true,
    legalComments:'eof',metafile:true,sourcemap:false,define:{__HINARIA_MOBILE_BUILD__:'true'},
    plugins:[{name:'capacitor-local-module',setup(context){
      context.onResolve({filter:/vendor\/capacitor-core\.js$/},()=>({path:resolve(root,'node_modules/@capacitor/core/dist/index.js')}));
    }}]
  });
  const remaining=Object.values(result.metafile.outputs).flatMap(output=>output.imports).filter(item=>item.external);
  if(remaining.length)throw new Error('Build Android contém dependência JS externa: '+JSON.stringify(remaining));
  const htmlFile=join(out,'index.html');
  let html=readFileSync(htmlFile,'utf8').replace(/<script\b[^>]*type=["']importmap["'][^>]*>[\s\S]*?<\/script>/gi,'');
  html=html.replace(/<script\b[^>]*type=["']module["'][^>]*src=["']src\/main\.js["'][^>]*><\/script>/,
    '<script defer src="game.js"></script>');
  if(!html.includes('<script defer src="game.js"></script>'))throw new Error('Não foi possível preparar o entrypoint Android');
  writeFileSync(htmlFile,html);
  return {format:'iife',target:'chrome80',imports:'bundled',bytes:result.metafile.outputs[join(out,'game.js')]?.bytes||Object.values(result.metafile.outputs)[0].bytes};
}
