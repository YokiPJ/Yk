import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..');
const src=join(root,'src');
const html=readFileSync(join(root,'index.html'),'utf8');
const files=[];
function walk(dir){for(const ent of readdirSync(dir)){const p=join(dir,ent);if(statSync(p).isDirectory())walk(p);else if(p.endsWith('.js'))files.push(p)}}
walk(src);
for(const file of files){
 const code=readFileSync(file,'utf8');
 for (const match of code.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)) {
   const dep=resolve(dirname(file),match[1]);
   assert.ok(existsSync(dep),`Import ausente: ${file} -> ${match[1]}`);
 }
}
for(const id of ['wrap','ov','hud','joy','knob','arsenal-modal','arsenal-btn','arsenal-items','arsenal-gold','s4','interact-npc','dialog-shade','dialog-panel','dialog-options','house-hint']){
 if(id==='qbtn-placeholder')continue;
 assert.ok(html.includes(`id="${id}"`) || html.includes(`id='${id}'`),`Elemento de interface ausente: ${id}`);
}
for(const module of ['src/player/arsenal.js','src/ui/arsenalUI.js','src/ui/hud.js','src/ui/dialogueUI.js','src/world/houseInteriors.js','src/player/controls.js','src/quest/questUI.js']) assert.ok(existsSync(join(root,module)),`Módulo necessário ausente: ${module}`);
for(let i=1;i<=3;i++)assert.ok(existsSync(join(root,`assets/ui/cover_0${i}.jpg`)));
for(let i=1;i<=8;i++)assert.ok(existsSync(join(root,`assets/ui/portrait_0${i}.jpg`)));
assert.ok(html.includes('1.1.0 · COMBATE MANUAL + VFX/SFX V2 · STORY'),'Identificação de versão ausente');
assert.ok(html.includes('id="combat-v2-quick-toggle"') && html.includes('id="combat-v2-actions"'), 'Controles visíveis do Combate 2.0 ausentes');
assert.ok(existsSync(join(root,'tests/test_v1080_village_bosses.mjs')),'Teste V1.0.8.0 ausente');
assert.ok(readFileSync(join(root,'src/quest/questData.js'),'utf8').includes('boss_orc'),'Missão de chefe ausente');
assert.ok(readFileSync(join(root,'src/world/world.js'),'utf8').includes("district: 'abandoned cabin'"),'Cabana remota sem entrada');
assert.ok(!html.includes('id="say"') && !html.includes('id="chatb"') && !html.includes('id="con"'), 'Chat antigo nao foi removido');
console.log(`PASS 1.1.0 Fase 1: ${files.length} módulos JS, imports, UI sem chat, 11 imagens, identidade de build.`);
