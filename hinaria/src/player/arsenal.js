/** HINÁRIA V7: catalog and purchase rules. No graphics or DOM dependencies. */
export const WEAPONS = Object.freeze([
  {id:'kn_basic',cls:'kn',name:'Espada do Viajante',model:'sword',kind:'sword',cost:0,bonus:0,range:1,color:0xe0e7f1},
  {id:'kn_steel',cls:'kn',name:'Espada de Aço',model:'sword_steel',kind:'sword',cost:45,bonus:3,range:1,color:0xc9d8e7},
  {id:'kn_rune',cls:'kn',name:'Lâmina Rúnica',model:'sword_rune',kind:'sword',cost:150,bonus:7,range:1,color:0x5bcaff},
  {id:'kn_sun',cls:'kn',name:'Espada Solar',model:'sword_sun',kind:'sword',cost:330,bonus:12,range:1,color:0xffd76b},
  {id:'pa_basic',cls:'pa',name:'Arco de Madeira',model:'bow',kind:'bow',cost:0,bonus:0,range:5,color:0xe5dc9e},
  {id:'pa_hunter',cls:'pa',name:'Arco do Caçador',model:'bow_hunter',kind:'bow',cost:65,bonus:3,range:5,color:0xd9d3b8},
  {id:'pa_wind',cls:'pa',name:'Arco do Vento',model:'bow_wind',kind:'bow',cost:170,bonus:6,range:6,color:0x82edb9},
  {id:'pa_moon',cls:'pa',name:'Arco Lunar',model:'bow_moon',kind:'bow',cost:360,bonus:10,range:6,color:0x8fa8ff},
  {id:'so_basic',cls:'so',name:'Cajado Aprendiz',model:'staff',kind:'staff',cost:0,bonus:0,range:5,color:0xff7a2a},
  {id:'so_ember',cls:'so',name:'Cajado das Brasas',model:'staff_ember',kind:'staff',cost:70,bonus:3,range:5,color:0xff6735},
  {id:'so_storm',cls:'so',name:'Cajado da Tempestade',model:'staff_storm',kind:'staff',cost:180,bonus:7,range:6,color:0xa3a2ff},
  {id:'so_star',cls:'so',name:'Cajado Estelar',model:'staff_star',kind:'staff',cost:380,bonus:12,range:6,color:0xffd88a},
  {id:'dr_basic',cls:'dr',name:'Cajado do Bosque',model:'staff',kind:'staff',cost:0,bonus:0,range:4,color:0x7de8ff},
  {id:'dr_vine',cls:'dr',name:'Cajado das Vinhas',model:'staff_vine',kind:'staff',cost:60,bonus:3,range:4,color:0x84d98a},
  {id:'dr_frost',cls:'dr',name:'Cajado Glacial',model:'staff_frost',kind:'staff',cost:160,bonus:6,range:5,color:0x8ce9ff},
  {id:'dr_nature',cls:'dr',name:'Cajado da Aurora',model:'staff_nature',kind:'staff',cost:350,bonus:11,range:5,color:0xb6ffa2},
  {id:'kn_replay_axe',cls:'kn',name:'Machado do Replay · Ruptura',model:'replay_axe',kind:'axe',cost:0,bonus:4,range:1.5,color:0xffcf78},
  {id:'pa_replay_axe',cls:'pa',name:'Machado do Replay · Aurora',model:'replay_axe',kind:'axe',cost:0,bonus:3,range:1.5,color:0xf7e0a0},
  {id:'so_replay_axe',cls:'so',name:'Machado do Replay · Runa',model:'replay_axe',kind:'axe',cost:0,bonus:3,range:1.5,color:0xa7a6ff},
  {id:'dr_replay_axe',cls:'dr',name:'Machado do Replay · Raízes',model:'replay_axe',kind:'axe',cost:0,bonus:2,range:1.5,color:0x9bdb89},
  {id:'yo_replay_axe',cls:'yo',name:'Machado Explosivo Flamejante',model:'replay_axe',kind:'axe',cost:0,bonus:5,range:1.5,color:0xff642a}
]);
export const SPECIAL_COST=160;
export const SKILL_UPGRADE_COST=[0,80,170];
export function weaponsForClass(cls){return WEAPONS.filter(w=>w.cls===cls);}
export function ensureArsenal(P){
  if(!Array.isArray(P.ownedWeapons)) P.ownedWeapons=[];
  if(!P.equippedWeapons || typeof P.equippedWeapons!=='object') P.equippedWeapons={};
  if(!P.skillLevels || typeof P.skillLevels!=='object') P.skillLevels={};
  for(const cls of ['kn','pa','so','dr','yo']){
    const starting=weaponsForClass(cls)[0].id;
    if(!P.ownedWeapons.includes(starting)) P.ownedWeapons.push(starting);
    const relic=cls+'_replay_axe';
    if(!P.ownedWeapons.includes(relic)) P.ownedWeapons.push(relic);
    if(!WEAPONS.some(w=>w.id===P.equippedWeapons[cls] && w.cls===cls && P.ownedWeapons.includes(w.id))) P.equippedWeapons[cls]=starting;
    if(!Array.isArray(P.skillLevels[cls])) P.skillLevels[cls]=[1,1,1,0];
  }
  P.weaponId=P.equippedWeapons[P.cls];
  P.bonus=equippedWeapon(P).bonus;
  return P;
}
export function equippedWeapon(P){
  const id=P?.equippedWeapons?.[P.cls];
  return WEAPONS.find(w=>w.id===id && w.cls===P.cls) || weaponsForClass(P?.cls || 'kn')[0];
}
export function buyOrEquip(P,id){
  ensureArsenal(P);
  const w=WEAPONS.find(w=>w.id===id);
  if(!w || w.cls!==P.cls) return {ok:false,message:'Arma indisponível para sua classe.'};
  const owned=P.ownedWeapons.includes(w.id);
  if(!owned && P.gold<w.cost) return {ok:false,message:`Faltam ${w.cost-P.gold} moedas para ${w.name}.`};
  if(!owned){P.gold-=w.cost;P.ownedWeapons.push(w.id);}
  P.equippedWeapons[P.cls]=w.id;
  if(w.kind!=='axe')P.axeAwakeUntil=0; // Unequipping ends current enchantment.
  P.weaponId=w.id;
  P.bonus=w.bonus;
  return {ok:true,message:(owned?'Equipado: ':'Comprou e equipou: ')+w.name+'.'};
}
export function skillLevel(P,slot){return Math.max(0,Math.min(3,P?.skillLevels?.[P.cls]?.[slot] ?? (slot===3?0:1)));}
export function skillCost(P,slot){const lv=skillLevel(P,slot);return lv>=3?0:lv===0?SPECIAL_COST:SKILL_UPGRADE_COST[lv];}
export function buySkill(P,slot){
  ensureArsenal(P);
  if(!Number.isInteger(slot)||slot<0||slot>3)return {ok:false,message:'Habilidade desconhecida.'};
  const lv=skillLevel(P,slot);
  if(lv>=3)return {ok:false,message:'Habilidade no nível máximo.'};
  const cost=skillCost(P,slot);
  if(P.gold<cost)return {ok:false,message:`Faltam ${cost-P.gold} moedas.`};
  P.gold-=cost;P.skillLevels[P.cls][slot]=lv+1;
  return {ok:true,message:`Habilidade evoluiu para nível ${lv+1}!`};
}

/** Persist only the gold, weapons and skill upgrades; the larger world is not saved yet. */
const STORAGE_KEY='hinaria.v7.arsenal.v1';
export function loadArsenalProgress(P){
  try{
    const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    if(!data||typeof data!=='object')return false;
    if(Number.isSafeInteger(data.gold)&&data.gold>=0)P.gold=data.gold;
    if(Array.isArray(data.ownedWeapons))P.ownedWeapons=data.ownedWeapons.filter(id=>WEAPONS.some(w=>w.id===id));
    if(data.equippedWeapons&&typeof data.equippedWeapons==='object')P.equippedWeapons=data.equippedWeapons;
    if(data.skillLevels&&typeof data.skillLevels==='object'){
      P.skillLevels={};
      for(const cls of ['kn','pa','so','dr','yo']){
        const levels=data.skillLevels[cls];
        if(Array.isArray(levels)&&levels.length===4)P.skillLevels[cls]=levels.map((v,i)=>i===3?Math.max(0,Math.min(3,Number(v)||0)):Math.max(1,Math.min(3,Number(v)||1)));
      }
    }
    return true;
  }catch{return false;}
}
export function saveArsenalProgress(P){
  try{
    ensureArsenal(P);
    localStorage.setItem(STORAGE_KEY,JSON.stringify({gold:P.gold,ownedWeapons:P.ownedWeapons,equippedWeapons:P.equippedWeapons,skillLevels:P.skillLevels}));
    return true;
  }catch{return false;}
}
