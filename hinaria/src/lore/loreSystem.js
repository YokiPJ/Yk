/** Optional Yoki lore codex. Uses separate versioned localStorage: saves untouched. */
import { gameState } from '../core/gameState.js';
import { Q } from '../quest/quests.js';
const KEY='hinaria.lore.codex.v1';
const ENTRIES=[
 {id:'eco_fronteira',title:'O Eco sob as Cinzas',text:'O chamado além da fronteira não vem dos mortos. O observatório repete uma lembrança, presa ao santuário mesmo depois da queda da coroa.',check:()=>Q.status('p2_passagem')==='done'},
 {id:'eco_ultima_voz',title:'A Última Voz',text:'A sentinela repetia uma luta que já havia terminado. Ao cair, permitiu que a tribo partisse e que os grilos voltassem. Yoki guardou a lembrança sem aprisioná-la.',check:()=>Q.status('p2_ultima_voz')==='done'},
 {id:'origem',title:'A Garra Cinzenta',text:'Na tribo Garra Cinzenta, os orcs eram ensinados a esquecer a dor. Yoki desobedecia: observava cada movimento e guardava cada erro.',check:()=>Q.status('c1_ratos')==='done'},
 {id:'espelho',title:'O Espelho que Não Refletia Rosto',text:'No fundo da Caverna do Esquecimento, um espelho de vidro negro mostrou um campo verde, um camisa 7 e uma bola fazendo uma curva impossível. Nenhum guerreiro morreu.',check:()=>Q.status('c1_espelho')==='done'},
 {id:'bosque',title:'O Bosque das Memórias',text:'Yoki não reconhecia o lugar por seus caminhos: reconhecia pelos passos. Cada trilha era uma lembrança de derrotas que poderiam ensinar.',check:()=>seenLandmark('Bosque das Memórias')},
 {id:'escudo',title:'Marca I — Escudo Partido',text:'O chefe da Garra Cinzenta abriu demais a guarda esquerda. Yoki anotou o erro sem dizer uma palavra.',check:()=>seenLandmark('Marca do Escudo Partido')},
 {id:'gelo',title:'Marca II — Passo no Gelo',text:'O melhor guerreiro confiou no gelo fino. Um passo apressado pesou mais do que qualquer machado.',check:()=>seenLandmark('Marca do Passo no Gelo')},
 {id:'machado',title:'Marca III — Machado Silencioso',text:'Yoki respondeu ao líder dos Quebra-Presas mirando onde ele estaria dois segundos depois. Venceu pela memória, não pela força.',check:()=>seenLandmark('Marca do Machado Silencioso')},
 {id:'gol',title:'A Vitória que Não Mata',text:'O espelho ensinou algo que a Garra Cinzenta não sabia: a vitória podia ser bonita, podia ser lembrada, e ninguém precisava morrer.',check:()=>Q.status('yoki_gol_impossivel')==='done'},
 {id:'replay_axe',title:'O Machado que Aprende',text:'No mundo de Yoki, não existe uma única magia para todos. O machado recebe só um fio de mana e desperta de modo diferente em cada mão. Em Yoki, transforma memória em fogo e explosão.',check:()=>!!gameState.P?.equippedWeapons?.[gameState.P.cls]?.endsWith('_replay_axe')},
 {id:'de_novo',title:'De Novo',text:'Yoki ergue os caídos para que tentem novamente. Não existe replay para apagar a dor: existe replay para aprender com ela.',check:()=>Q.status('yoki_de_novo')==='done'},
];
let unlocked=new Set(),lastScan=0,dialog=null,items=null;
function seenLandmark(name){return !!gameState.LM?.some(l=>l.n===name&&l.f);}
function persist(){try{localStorage.setItem(KEY,JSON.stringify({version:1,entries:[...unlocked]}));}catch{}}
function load(){try{const raw=JSON.parse(localStorage.getItem(KEY)||'{}');if(raw.version===1&&Array.isArray(raw.entries))unlocked=new Set(raw.entries.filter(id=>ENTRIES.some(e=>e.id===id)));}catch{}}
function refresh(){
 if(!dialog||!items)return;
 items.replaceChildren();
 for(const entry of ENTRIES){const card=document.createElement('article');card.style.cssText='padding:9px 0;border-bottom:1px solid #66583f';
   const title=document.createElement('strong');title.textContent=unlocked.has(entry.id)?entry.title:'🔒 Memória desconhecida';card.append(title);
   const text=document.createElement('p');text.style.cssText='line-height:1.5;margin:5px 0';text.textContent=unlocked.has(entry.id)?entry.text:'Explore a fronteira e avance nas missões de Yoki para descobrir.';card.append(text);items.append(card);}
}
function toggle(){if(!dialog)return;dialog.hidden=!dialog.hidden;if(!dialog.hidden)refresh();}
export function initLore(){
 load();if(document.getElementById('hinaria-lore-codex'))return;
 const css=document.createElement('style');css.textContent=`#hinaria-lore-codex{position:fixed;top:0;right:0;bottom:0;left:0;inset:0;z-index:58;background:#0009;display:flex;align-items:center;justify-content:center;padding:20px}#hinaria-lore-codex[hidden]{display:none!important}#hinaria-lore-codex>div{width:min(540px,96vw);max-height:78vh;overflow-y:auto;background:#17212a;color:#efe3c9;border:2px solid #c2a265;padding:18px;border-radius:12px;box-shadow:0 20px 70px #000d}#hinaria-lore-codex button{background:#3d4c43;border:1px solid #ccae73;color:#fff;padding:10px;border-radius:7px}`;document.head.appendChild(css);
 dialog=document.createElement('section');dialog.id='hinaria-lore-codex';dialog.hidden=true;
 const inner=document.createElement('div'),title=document.createElement('h2');title.textContent='📖 Crônicas de Yoki — O Bárbaro do Replay';
 const close=document.createElement('button');close.textContent='Fechar';close.addEventListener('click',toggle);
 items=document.createElement('div');inner.append(title,close,items);dialog.append(inner);document.body.appendChild(dialog);
 const hud=document.getElementById('hud');if(hud){const b=document.createElement('button');b.type='button';b.id='hinaria-lore-button';b.textContent='📖 Crônicas';b.addEventListener('click',toggle);hud.appendChild(b);}
 window.addEventListener('keydown',e=>{if(e.key?.toLowerCase()==='l'&&!e.repeat&&!(gameState.ccOpen||gameState.cutsceneActive||gameState.dialogueOpen)){e.preventDefault();toggle();}else if(e.key==='Escape'&&!dialog.hidden){toggle();}});
}
export function tickLore(dt){
 lastScan+=dt;if(lastScan<.7)return;lastScan=0;
 let dirty=false;
 for(const entry of ENTRIES){if(!unlocked.has(entry.id)&&entry.check()){unlocked.add(entry.id);dirty=true;}}
 if(dirty){persist();if(dialog&&!dialog.hidden)refresh();}
}
export function loreSnapshot(){return [...unlocked];}

/** Full-save integration keeps this module's authoritative unlock set. */
export function restoreLore(entries=[]) {
 unlocked=new Set(entries.filter(id=>ENTRIES.some(e=>e.id===id)));
 lastScan=0;refresh();
}
