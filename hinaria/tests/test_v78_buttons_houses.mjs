/** Teste de fluxo dos botões no lugar do chat + entrada/saída das casas. Sem Three.js/GPU. */
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('index.html');
assert.doesNotMatch(html,/id=['"](?:con|chatb|say|chips|log)['"]/);
for(const id of ['dialog-panel','dialog-options','interact-npc','dialog-shade','house-hint']) assert.match(html,new RegExp('id="'+id+'"'));
assert.match(read('src/player/controls.js'),/openDialogue\(\)/);
assert.match(read('src/core/loop.js'),/updateDialogueUI\(\)/);
assert.match(read('src/core/loop.js'),/tickHouse\(/);
class Classes {
  values=new Set();add(s){this.values.add(s)}remove(s){this.values.delete(s)}contains(s){return this.values.has(s)}toggle(s,value){if(value===undefined)value=!this.values.has(s);value?this.values.add(s):this.values.delete(s);return value}
}
function el(id=''){
  return {id,children:[],style:{},classList:new Classes(),listeners:{},textContent:'',innerHTML:'',dataset:{},
    setAttribute(k,v){this[k]=v},appendChild(o){this.children.push(o)},replaceChildren(...children){this.children=children},
    addEventListener(k,cb){this.listeners[k]=cb},click(){this.listeners.click?.()},focus(){},
    querySelector(sel){if(sel==='#dialog-close-top')return nodes['dialog-close-top'];return null}
  };
}
const nodes=Object.fromEntries(['dialog-panel','dialog-shade','dialog-title','dialog-text','dialog-options','dialog-close-top','interact-npc'].map(x=>[x,el(x)]));
const document={getElementById(id){return nodes[id]},createElement(){return el()}};
const winListeners={};
const window={addEventListener(k,fn){winListeners[k]=fn}};
const actions=()=>nodes['dialog-options'].children;
const click=prefix=>{const choice=actions().find(b=>b.textContent.startsWith(prefix));assert.ok(choice,'Botão ausente: '+prefix+' / '+actions().map(b=>b.textContent));choice.click();};
let questStatus='new';const calls=[];let purchases=0;
const Q={markers(){return [{npc:'bram',k:questStatus}]},talk(npc,word){calls.push([npc,word]);if(word==='missao')return 'Ajude a vila e derrote quatro ratos.';if(word==='sim'){questStatus='active';return 'Missão aceita!'}if(word==='hi'){questStatus='completed';return 'Missão entregue!'}return null}};
const P={x:17,z:9,gold:200,path:[],greet:false};
const gameState={P,N:{x:17,z:9},Y:{x:6,z:6},ccOpen:false,arsenalOpen:false,insideHouse:false};
const houses={nearbyHouse(){return null},houseLabel(){return 'Casa'},enterHouse(){return false},leaveHouse(){gameState.insideHouse=false}};
const code=read('src/ui/dialogueUI.js').replace(/^import .*;\s*$/gm,'').replaceAll('export function ','function ');
const ctx={gameState,Q,replyBram:q=>'Bram explica '+q,replyYoki:q=>'Yoki explica '+q,openArsenal:()=>purchases++,updateHUD(){},...houses,document,window,console};
vm.createContext(ctx);
vm.runInContext(code+'\nthis.api={initDialogueUI,openDialogue,closeDialogue,updateDialogueUI,closestNPC};',ctx);
const {initDialogueUI,openDialogue,closeDialogue,updateDialogueUI}=ctx.api;
initDialogueUI();
updateDialogueUI();assert.ok(nodes['interact-npc'].classList.contains('on'));
assert.ok(openDialogue('bram'));assert.ok(gameState.dialogueOpen);
click('★ Receber missão');assert.match(nodes['dialog-text'].innerHTML,/quatro ratos/);
click('✓ Aceitar missão');assert.deepEqual(calls.slice(0,2),[['bram','missao'],['bram','sim']]);
closeDialogue();assert.equal(gameState.dialogueOpen,false);
questStatus='turn';openDialogue('bram');click('✓ Entregar missão');assert.deepEqual(calls.at(-1),['bram','hi']);
closeDialogue();openDialogue('bram');click('⚔ Loja de armas');assert.equal(purchases,1);assert.equal(gameState.dialogueOpen,false);
gameState.P.x=6;gameState.P.z=6;openDialogue('yoki');click('O espelho');assert.match(nodes['dialog-text'].innerHTML,/espelho/);closeDialogue();
gameState.P.x=99;gameState.P.z=99;updateDialogueUI();assert.ok(!nodes['interact-npc'].classList.contains('on'));
// House entry: simulate a near front door and confirm F uses entry/exit route.
gameState.P.x=10;gameState.P.z=20;
ctx.nearbyHouse=()=>({district:'south tavern',x:10,z:19});ctx.houseLabel=()=> 'Taverna';
ctx.enterHouse=()=>{gameState.insideHouse=true;return true;};
updateDialogueUI();assert.ok(nodes['interact-npc'].classList.contains('on'));
assert.match(nodes['interact-npc'].textContent,/Entrar/);
assert.equal(openDialogue(),true);assert.equal(gameState.insideHouse,true);
updateDialogueUI();assert.match(nodes['interact-npc'].textContent,/Sair/);
assert.equal(openDialogue(),true);assert.equal(gameState.insideHouse,false);
console.log('PASS V7.8: sem chat, aceitar/entregar missões, conversa Yoki, loja Bram, proximidade, entrar/sair por botões.');
