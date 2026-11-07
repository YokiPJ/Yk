const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const loop=read('src/core/loop.js');
const start=loop.indexOf('    tickCombatV2(dt);');
const end=loop.indexOf('    // Greet NPCs',start);
assert(start>0 && end>start);
assert(!/dealDamage\(|fireProjectile\(/.test(loop.slice(start,end)), 'Ataque automático remanescente no loop');
const quest=read('src/quest/questUI.js');
assert(!quest.includes("if (e.key === 'j' || e.key === 'J')"),'Atalho J abre diário ainda');
assert(quest.includes('Diário de Missões'), 'Diário não preservado no botão');
const controls=read('src/player/controls.js');
assert(controls.includes('requestManualAttack()'), 'Entrada manual ausente');
assert(controls.includes("if(k==='j' || k===' ')"), 'J/Espaço ausente');
const bridge=read('src/combat/combatV2Bridge.js');
assert(bridge.includes('function requestManualAttack()'), 'Bridge do golpe não existe');
assert(bridge.includes('if (active()) return requestCombatV2Attack();'), 'Combo do Cavaleiro não preservado');
assert(bridge.includes('gameState.P') || bridge.includes('const P = gameState.P'));
// Executar a função real requestManualAttack com stubs, sem carregar Three/browser.
let core=bridge.slice(bridge.indexOf('export function requestManualAttack()'),bridge.indexOf('// Lightweight manual dodge for non-Knight classes'));
core=core.replace('export function requestManualAttack()','function requestManualAttack()');
const test={P:{hp:40,cls:'pa',x:0,z:0,lv:2,bonus:0,cd:0,at:0,b:{},path:[],mesh:{rotation:{y:0}}},
  getHeightAt:()=>0,ents:[],B:[],ccOpen:false,arsenalOpen:false,dialogueOpen:false,insideHouse:false,cutsceneActive:false,tgt:null};
let hits=0,projectiles=0,combo=0,swing=0;
const enemy={hp:30,x:0,z:1,kind:'m'};test.ents=[enemy];
const sandbox={gameState:test,active:()=>false,combatV2:{},freeDodge:{active:false},syncCombatClass(){},attackAim:{begin:(st,pl,range)=>st.ents.find(e=>e.hp>0 && Math.hypot(e.x-pl.x,e.z-pl.z)<=range) || null},requestCombatV2Attack(){combo++;return true;},
 equippedWeapon(){return {kind:'bow',range:5}},near(a,b){return Math.hypot(a.x-b.x,a.z-b.z)},
 CLASSES:{pa:{dmg:[3,3],col:0xffffff},kn:{dmg:[3,3]},so:{dmg:[3,3],col:0xff7a2a}},ri(a,b){return a},
 playClaudeVfx(){swing++},dealDamage(P,T,d){hits++;T.hp-=d},fireProjectile(P,T,color,cb){projectiles++;cb()},Math};
vm.runInNewContext(core+'\nthis.attack=requestManualAttack;',sandbox);
assert.equal(sandbox.attack(),true);assert.equal(projectiles,1);assert.equal(hits,1);assert.equal(swing,0,'flecha fisica nao deve duplicar efeito de projetil');
assert.equal(sandbox.attack(),false);assert.equal(hits,1,'Cooldown ignorado');
test.P.cd=0;test.P.at=0;test.P.cls='so';
 sandbox.equippedWeapon=()=>({kind:'staff',range:5});
 assert.equal(sandbox.attack(),true,'feiticeiro pode atacar');
 assert.equal(swing,1,'ataque de cajado usa somente Claude');
 test.P.cd=0;test.P.at=0;test.P.cls='kn';sandbox.active=()=>true;
assert.equal(sandbox.attack(),true);assert.equal(combo,1,'Combo original não chamado');
test.cutsceneActive=true;assert.equal(sandbox.attack(),false,'Ataca durante cutscene');
const sfx=read('src/audio/skillSfx.js'),combat=read('src/combat/combat.js');
assert.equal((fs.readdirSync(path.join(root,'assets/audio/sfx')).filter(f=>f.endsWith('.wav'))).length,16);
assert.match(sfx,/version:/,'som do pacote original preservado');
assert.match(combat,/playClaudeSkill\(gameState.P.cls,i,gameState.P/);
assert.match(combat,/playClaudeVfx\(cr \? 'hit_crit' : 'hit'/);
assert(!combat.includes('playSkillVfx('));
assert(!combat.includes('playHitVfx('));
const html=read('index.html');
assert(html.includes('id="combat-v2-stamina-wrap"'));
assert(html.includes('id="combat-v2-attack"'));
console.log('PASS manual combat: 1 VFX por evento, flecha sem projetil mágico duplicado, 16 sons, cooldown e combo preservados.');
