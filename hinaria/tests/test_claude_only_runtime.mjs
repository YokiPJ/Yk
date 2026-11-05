import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const load=rel=>readFileSync(new URL('../'+rel,import.meta.url),'utf8');
const root=new URL('../src/vfx/',import.meta.url);
for(const old of ['skillVfx.js','hitVfx.js','vfxJsImpact.js']) assert.equal(existsSync(new URL(old,root)),false);
const bridge=load('src/vfx/claudeVfxBridge.js');
const combat=load('src/combat/combat.js');
const main=load('src/main.js');
const loop=load('src/core/loop.js');
const html=load('index.html');
const build=load('tools/build-web.mjs');
const pkg=load('package.json');
for (const s of [combat,main,loop,html,build,pkg]) {
 assert.doesNotMatch(s,/@vfx-js|vfxJsImpact|skillVfx|hitVfx|playSwingVfx|playHitVfx|playSkillVfx/);
}
assert.match(bridge,/export const CLASS_SKILL_VFX/);
assert.match(build,/src\/vfx\/claudeVfx.js/);
assert.match(build,/src\/vfx\/claudeVfxBridge.js/);
assert.match(combat,/target.hp -= damage/);
assert.match(combat,/playSkillSfx\(gameState.P.cls, i\)/);
assert.match(loop,/tickClaudeVfx\(dt\)/);
console.log('PASS: Claude VFX é o unico runtime de combate, sem dependencia de shader legado, build offline atualizada.');
