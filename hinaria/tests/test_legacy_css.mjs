import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {insetOffsets,addInsetFallbacks,stripInsetDeclarations,legacyCSSFiles,insetDeclarations} from '../tools/legacy-css.mjs';
assert.deepEqual(insetOffsets('0'),{top:'0',right:'0',bottom:'0',left:'0'});
assert.deepEqual(insetOffsets('2px auto'),{top:'2px',right:'auto',bottom:'2px',left:'auto'});
assert.deepEqual(insetOffsets('1px 2px 3px'),{top:'1px',right:'2px',bottom:'3px',left:'2px'});
assert.deepEqual(insetOffsets('auto 12px max(18px, env(safe-area-inset-bottom)) 12px !important'),{
  top:'auto !important',right:'12px !important',bottom:'max(18px, env(safe-area-inset-bottom)) !important',left:'12px !important'
});
const decoration='.sample{box-shadow:inset 0 0 4px #000;inset-block:2px;--inset:3px}';
assert.equal(addInsetFallbacks(decoration),decoration);assert.equal(stripInsetDeclarations(decoration).source,decoration);
assert.equal(stripInsetDeclarations(addInsetFallbacks('.overlay{position:fixed;inset:0}')).source,
  '.overlay{position:fixed;top:0;right:0;bottom:0;left:0;}');
let checked=0;
for(const name of legacyCSSFiles){
  const source=readFileSync(new URL('../'+name,import.meta.url),'utf8');
  assert.equal(addInsetFallbacks(source),source,'physical offsets must precede inset: '+name);
  checked+=insetDeclarations(source).length;
}
assert.ok(checked>=20);
console.log(`PASS WebView CSS: ${checked} real declarations in ${legacyCSSFiles.length} files; 1–4 offsets, nested functions and !important; shadows/logical properties preserved.`);
