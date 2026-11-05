/** Mobile-friendly arsenal UI. Purchases use the authoritative game-state gold. */
import { gameState } from '../core/gameState.js';
import { POWERS, applyAppearance, updateSkillUI } from '../player/player.js';
import { WEAPONS, weaponsForClass, ensureArsenal, equippedWeapon, buyOrEquip, buySkill, skillCost, skillLevel } from '../player/arsenal.js';
import { updateHUD, say } from './hud.js';
let tab='weapons';let installed=false;
const el=id=>document.getElementById(id);
export function openArsenal(){
  if(gameState.ccOpen || !gameState.P)return;
  ensureArsenal(gameState.P);
  el('arsenal-modal').classList.add('on');
  gameState.arsenalOpen=true;
  renderArsenal();
}
export function closeArsenal(){el('arsenal-modal')?.classList.remove('on');gameState.arsenalOpen=false;}
export function renderArsenal(){
  if(!el('arsenal-modal')?.classList.contains('on'))return;
  const P=gameState.P;
  ensureArsenal(P);
  el('arsenal-gold').textContent=`${P.gold} 🪙`;
  el('arsenal-tabs').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
  if(tab==='weapons'){
    el('arsenal-items').innerHTML=weaponsForClass(P.cls).map(w=>{
      const owned=P.ownedWeapons.includes(w.id), active=equippedWeapon(P).id===w.id;
      const label=active?'Equipada':owned?'Equipar':`Comprar ${w.cost} 🪙`;
      return `<div class="ars-item"><div class="desc"><b>${w.name}</b><small>+${w.bonus} dano · alcance ${w.range} · ${w.kind==='bow'?'Arco com flecha':w.kind==='staff'?'Cajado mágico':w.kind==='axe'?'Machado mágico · R para despertar':'Espada'}</small></div><button data-weapon="${w.id}" ${active?'disabled':''}>${label}</button></div>`;
    }).join('');
  }else{
    el('arsenal-items').innerHTML=POWERS[P.cls].map((skill,i)=>{
      const level=skillLevel(P,i),price=skillCost(P,i),max=level>=3;
      return `<div class="ars-item"><div class="desc"><b>${skill.n}</b><small>${level?'Nível '+level:'🔒 Bloqueada'} · Mana ${skill.mp} · recarga ${skill.cd}s</small></div><button data-skill="${i}" ${max?'disabled':''}>${max?'Máximo':level===0?`Desbloquear ${price} 🪙`:`Melhorar ${price} 🪙`}</button></div>`;
    }).join('');
  }
}
export function initArsenalUI(){
  if(installed)return;installed=true;
  el('arsenal-close').addEventListener('click',closeArsenal);
  el('arsenal-modal').addEventListener('pointerdown',e=>{if(e.target===el('arsenal-modal'))closeArsenal();});
  el('arsenal-tabs').addEventListener('click',e=>{const button=e.target.closest('button[data-tab]');if(!button)return;tab=button.dataset.tab;el('arsenal-msg').textContent='';renderArsenal();});
  el('arsenal-items').addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b||b.disabled)return;
    const P=gameState.P;
    let result;
    if(b.dataset.weapon){result=buyOrEquip(P,b.dataset.weapon);if(result.ok)applyAppearance(P);}
    if(b.dataset.skill!=null){result=buySkill(P,Number(b.dataset.skill));if(result?.ok)updateSkillUI();}
    if(!result)return;
    el('arsenal-msg').textContent=result.message;
    if(result.ok){updateHUD();say(result.message,'sys');}
    renderArsenal();
  });
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&el('arsenal-modal')?.classList.contains('on')){e.preventDefault();closeArsenal();}});
}
