import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const file=f=>readFileSync(new URL(f,root),'utf8');
const html=file('index.html'),css=file('assets/ui/mobile-v74.css');
assert.ok(existsSync(new URL('assets/ui/mobile-v74.css',root)));
assert.match(html,/href="assets\/ui\/mobile-v74\.css"/);
assert.match(html,/1\.1\.0 · COMBATE MANUAL \+ VFX\/SFX V2 · STORY/);
for(const id of ['hud','joy','knob','hot','s0','s1','s2','s3','s4','mmw','mm','interact-npc','dialog-panel','house-hint','arsenal-modal','arsenal-btn','ccw']){
 assert.match(html,new RegExp(`id=["']${id}["']`),id+' ausente');
}
for(const selector of ['#hud','#joy','#hot','#mmw','#arsenal-panel','#qj','#quest-quick-toggle']){
 assert.ok(css.includes(selector),'Falta estilo '+selector);
}
assert.match(css,/@media \(pointer:coarse\)/);
assert.match(css, /max-height:540px/);
assert.match(css, /orientation:portrait/);
assert.match(css, /safe-area-inset-bottom/);
assert.doesNotMatch(html, /id=[\"']tg[\"']/,'Target button must be removed');
const dialogueCss=file('assets/ui/dialogue-v78.css');
for (const selector of ['#dialog-panel','#dialog-options','#interact-npc','#house-hint']) assert.ok(dialogueCss.includes(selector),'Falta estilo '+selector);
assert.doesNotMatch(html,/id=[\"'](?:chatb|con|say|chips)[\"']/,'O chat antigo reapareceu');
assert.match(file('src/quest/questUI.js'),/quest-quick-toggle/);
assert.match(file('src/player/player.js'),/skill-label/);
assert.match(file('src/ui/hud.js'),/resizeMinimap\(\);/);
assert.match(file('tools/build-web.mjs'),/assets/);
const release=JSON.parse(file('release.json'));
assert.match(release.apk,/^HINARIA_MOBILE_[0-9.]+_DEBUG\.apk$/);
assert.ok(file('tools/assemble-debug.mjs').includes('release.apk'),'APK uses the current release metadata');
console.log('PASS 1.0.7.9 mobile: CSS responsive, controls, safe areas, quest toggle, offline assets and APK marker');
