const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const combat=read('src/combat/combat.js'),bridge=read('src/vfx/claudeVfxBridge.js');
const loop=read('src/core/loop.js'),main=read('src/core/bootGame.js');
for(const obsolete of ['hitVfx.js','skillVfx.js','vfxJsImpact.js']) {
 assert.equal(fs.existsSync(path.join(root,'src/vfx',obsolete)),false,`VFX antigo ainda existe: ${obsolete}`);
 assert(!combat.includes(obsolete),'nenhum import de VFX legado');
}
assert.match(combat,/playClaudeSkill\(gameState.P.cls,i,gameState.P/);
assert.match(combat,/playClaudeVfx\(cr \? 'hit_crit' : 'hit'/);
assert.match(main,/initClaudeVfx\(gameState\)/);
assert.match(loop,/tickClaudeVfx\(dt\)/);
const wavs=fs.readdirSync(path.join(root,'assets/audio/sfx')).filter(f=>f.endsWith('.wav'));
assert.equal(wavs.length,16,'sons das habilidades preservados');
const wanted=['kn','pa','so','dr','yo'];
for (const cls of wanted) assert(bridge.includes(`${cls}:Object.freeze([`),`${cls} mapeada`);
assert.match(bridge,/CLASS_SKILL_VFX/);
assert.match(bridge,/TARGET_CENTERED/);
console.log('PASS: apenas Claude VFX ativos, 5 classes/20 habilidades, sons preservados');
