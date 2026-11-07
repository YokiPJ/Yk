/** Physical offset fallbacks for WebViews predating the CSS inset shorthand. */
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

export const legacyCSSFiles=[
  'index.html','assets/ui/dialogue-v78.css','assets/ui/hud-overhaul-v1.css',
  'assets/ui/hud-pixi-v2.css','assets/ui/hud-upgrade.css','assets/ui/title-three.css',
  'assets/ui/upgrade-menu.css','src/cutscene/cutsceneSystem.js','src/lore/loreSystem.js',
  'src/ui/performanceUI.js','src/world/houseInteriors.js'
];

/** Split only outside functions: max(18px, env(...)) is one offset value. */
export function insetOffsets(value){
  const important=/\s*!important\s*$/i.test(value)?' !important':'';
  const text=value.replace(/\s*!important\s*$/i,'').trim();
  const values=[];let depth=0,quote='',token='';
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quote){token+=c;if(c==='\\'&&i+1<text.length)token+=text[++i];else if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"){quote=c;token+=c;continue;}
    if(c==='(')depth++;else if(c===')')depth--;
    if(depth<0)throw new Error('Unbalanced inset value: '+value);
    if(/\s/.test(c)&&depth===0){if(token){values.push(token);token='';}}
    else token+=c;
  }
  if(token)values.push(token);
  if(depth||quote||values.length<1||values.length>4)throw new Error('Invalid inset offsets: '+value);
  const [top,right=top,bottom=top,left=right]=values;
  return {top:top+important,right:right+important,bottom:bottom+important,left:left+important};
}

/** Only a property named inset; box-shadow inset and logical insets are untouched. */
export function insetDeclarations(source){
  const declarations=[],pattern=/(^|[;{])([ \t\r\n]*)inset\s*:/g;
  let match;
  while((match=pattern.exec(source))){
    const start=match.index+match[1].length+match[2].length,valueStart=pattern.lastIndex;
    let end=valueStart,depth=0,quote='';
    for(;end<source.length;end++){
      const c=source[end];
      if(quote){if(c==='\\')end++;else if(c===quote)quote='';continue;}
      if(c==='"'||c==="'"){quote=c;continue;}
      if(c==='(')depth++;else if(c===')')depth--;
      if(depth===0&&(c===';'||c==='}'))break;
    }
    const value=source.slice(valueStart,end).trim(),offsets=insetOffsets(value);
    const physical=Object.entries(offsets).map(([key,offset])=>key+':'+offset+';').join('');
    declarations.push({start,end,value,physical});pattern.lastIndex=end;
  }
  return declarations;
}

export function addInsetFallbacks(source){
  let result='',cursor=0;
  for(const item of insetDeclarations(source)){
    result+=source.slice(cursor,item.start);
    if(!source.slice(0,item.start).trimEnd().endsWith(item.physical))result+=item.physical;
    result+=source.slice(item.start,item.end);cursor=item.end;
  }
  return result+source.slice(cursor);
}

/** Test-only browser transport transform: simulate a parser that ignores inset. */
export function stripInsetDeclarations(source){
  let result='',cursor=0,removed=0;
  for(const item of insetDeclarations(source)){
    result+=source.slice(cursor,item.start);cursor=item.end;removed++;
  }
  return {source:result+source.slice(cursor),removed};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const root=fileURLToPath(new URL('../',import.meta.url)),write=process.argv.includes('--write');
  let declarations=0,changed=0;
  for(const name of legacyCSSFiles){
    const file=root+name,source=readFileSync(file,'utf8'),next=addInsetFallbacks(source);
    declarations+=insetDeclarations(source).length;
    if(next!==source){changed++;if(write)writeFileSync(file,next);else console.error('Missing physical fallback: '+name);}
  }
  if(changed&&!write)process.exitCode=1;
  console.log(`${changed&&!write?'FAIL':'PASS'} legacy CSS: ${declarations} inset declarations, ${legacyCSSFiles.length} files, ${changed} ${write?'updated':'missing'}.`);
}
