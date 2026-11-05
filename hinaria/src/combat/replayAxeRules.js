/** Pure replay-axe rules, independent of Three.js and browser DOM. */
export const AXE_POWERS=Object.freeze({
  kn:Object.freeze({name:'Ruptura de Ferro',color:0xffc779,desc:'Atordoa e fere a armadura.'}),
  pa:Object.freeze({name:'Julgamento da Aurora',color:0xffecac,desc:'O golpe recupera uma pequena quantidade de vida.'}),
  so:Object.freeze({name:'Estilhaço Rúnico',color:0xb6a1ff,desc:'O impacto se espalha em uma onda arcana.'}),
  dr:Object.freeze({name:'Raízes da Memória',color:0x9ee8a3,desc:'Enraíza o alvo e cura pequenas feridas.'}),
  yo:Object.freeze({name:'Machado Explosivo Flamejante',color:0xff602e,desc:'Explode e incendeia os inimigos próximos.'})
});
export const AXE_DURATION=12;
export const AXE_COOLDOWN=26;
export const AXE_PROC_INTERVAL=1.8;
export const axeManaCost = P => Math.max(1,Math.ceil((P?.mm||0)*.01));
export function awakenAxe(P,weapon,now){
  if(!P||weapon?.kind!=='axe')return {ok:false,reason:'equip'};
  if(P.hp<=0)return {ok:false,reason:'dead'};
  if((P.axeAwakeUntil||0)>now)return {ok:false,reason:'active'};
  if((P.axeAwakeCooldown||0)>now)return {ok:false,reason:'cooldown'};
  const mana=axeManaCost(P);
  if(P.mana<mana)return {ok:false,reason:'mana',mana};
  P.mana-=mana;
  P.axeAwakeUntil=now+AXE_DURATION;
  P.axeAwakeCooldown=now+AXE_COOLDOWN;
  P.axeProcNext=now;
  return {ok:true,mana,power:AXE_POWERS[P.cls]?.name||'Magia Desconhecida'};
}

/** Runs only after one explicit melee hit. Secondary hits don't recursively proc. */
export function applyAxeImpact({P,target,weapon,now,baseDamage,entities,dealDamage,spawnEffect:fx,showFloatingText:label}){
  if(!P||weapon?.kind!=='axe'||!(P.axeAwakeUntil>now)||!(now>=(P.axeProcNext||0))||!target)return false;
  P.axeProcNext=now+AXE_PROC_INTERVAL;
  const power=AXE_POWERS[P.cls];if(!power)return false;
  if(fx)fx(target,power.color,P.cls==='yo'?2.2:1.4);
  if(label)label(target,power.name,P.cls==='yo'?'#ff9955':'#e9ddac');
  const living=()=>Array.isArray(entities)?entities.filter(e=>e.kind==='m'&&e.hp>0&&!e._hinariaDeathProcessed):[];
  switch(P.cls){
    case 'kn': if(target.hp>0){target.st??={};target.st.stun=Math.max(target.st.stun||0,0.85);}break;
    case 'pa': P.hp=Math.min(P.max,P.hp+Math.max(2,Math.round(P.max*.045)));break;
    case 'so': for(const e of living())if(e!==target&&Math.hypot(e.x-target.x,e.z-target.z)<=1.8)dealDamage(P,e,Math.max(1,Math.round(baseDamage*.30)));break;
    case 'dr': if(target.hp>0){target.st??={};target.st.slow=Math.max(target.st.slow||0,2.5);}P.hp=Math.min(P.max,P.hp+Math.max(1,Math.round(P.max*.025)));break;
    case 'yo':
      if(target.hp>0){target.st??={};target.st.burn=Math.max(target.st.burn||0,3.4);}
      for(const e of living())if(e!==target&&Math.hypot(e.x-target.x,e.z-target.z)<=2.25){
        dealDamage(P,e,Math.max(1,Math.round(baseDamage*.38)));
        if(e.hp>0){e.st??={};e.st.burn=Math.max(e.st.burn||0,2.6);}
      }
      break;
  }
  return true;
}
