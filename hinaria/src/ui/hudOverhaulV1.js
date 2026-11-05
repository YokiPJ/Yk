import { gameState } from '../core/gameState.js';
import { setPaused, getFlowMode, saveGame, loadGame, returnToTitle, getSaveInfo, syncGameFlow } from '../core/gameFlow.js';
import { CLASSES, ARMORS } from '../player/player.js';
import { openUpgradePanel, openSettings, trapFocus } from './titleMenu.js';
import { renderExplorationMap } from './hud.js';
/** HINÁRIA HUD V1. Uses native DOM; wraps existing handlers without replacing them. */
export function initHudOverhaulV1() {
  if (document.body.classList.contains('ui-v1')) return;
  const hud = document.getElementById('hud');
  const hot = document.getElementById('hot');
  const original = id => document.getElementById(id);
  if (!hud || !hot || !original('arsenal-btn') || !original('chr')) return;

  // Keep original controls intact and callable by their original JS event listeners.
  const equipment = original('arm');
  equipment?.closest('.row')?.classList.add('ui-hidden-row');
  original('chr')?.closest('.row')?.classList.add('ui-hidden-row');
  const qtButton = original('quest-quick-toggle');
  if (qtButton) qtButton.textContent = '★ Objetivo ▾';
  // Quest handler itself toggles the class; our listener runs after it.
  qtButton?.addEventListener('click', () => {
    if (qtButton) qtButton.textContent = hud.classList.contains('quest-expanded') ? '★ Objetivo ▴' : '★ Objetivo ▾';
  });

  const menuBtn = document.createElement('button');
  menuBtn.id='ui-hud-menu-btn'; menuBtn.type='button';
  menuBtn.setAttribute('aria-label','Abrir menu da Hinária');
  menuBtn.setAttribute('aria-haspopup','dialog');
  menuBtn.setAttribute('aria-expanded','false');
  menuBtn.title='Menu (M)'; menuBtn.textContent='☰'; hud.append(menuBtn);

  const backdrop = document.createElement('div'); backdrop.id='ui1-menu-backdrop'; backdrop.hidden=true;
  const dialog = document.createElement('section'); dialog.id='ui1-menu';dialog.hidden=true;
  dialog.setAttribute('role','dialog'); dialog.setAttribute('aria-modal','true');
  dialog.setAttribute('aria-label','Menu da Hinária');
  dialog.innerHTML=`<header id="ui1-menu-header"><div><strong>HINÁRIA</strong><small>A aventura está pausada</small></div><button id="ui1-menu-close" type="button" aria-label="Fechar menu">×</button></header>
  <div id="ui1-menu-summary"></div>
  <div id="ui1-menu-grid">
   <button type="button" data-action="character" data-original="chr">✦ Personagem<span>Atributos e aparência</span></button>
   <button type="button" data-original="arsenal-btn">⚔ Arsenal<span>Armas e habilidades</span></button>
   <button type="button" data-original="qbtn">★ Missões<span>Diário e recompensas</span></button>
   <button type="button" data-action="map">◈ Mapa<span>Exploração e locais descobertos</span></button>
   <button type="button" data-original="hinaria-lore-button">📖 Crônicas<span>História de Yoki</span></button>
   <button type="button" data-action="settings" data-original="perf-open">⚙ Configurações<span>Gráficos, som e acessibilidade</span></button>
   <button type="button" data-action="save">Salvar jogo<span>Gravar aventura neste dispositivo</span></button>
   <button type="button" data-action="load">Carregar jogo<span>Restaurar o último save válido</span></button>
   <button type="button" data-action="resume">Retomar<span>Continuar a aventura</span></button>
   <button type="button" data-action="title">Voltar ao título<span>Encerrar esta sessão</span></button>
  </div><div id="ui1-menu-status" role="status" aria-live="polite"></div>
  <p id="ui1-menu-footer">J / Espaço: golpe · K: esquiva · 1–5: habilidades · M / Esc: retomar</p>`;
  document.body.append(backdrop,dialog);
  const closeBtn=dialog.querySelector('#ui1-menu-close');
  let restoreFocus=null;
  function open() {
    if (!dialog.hidden || ['BOOT','TITLE','CHARACTER_CREATION','CUTSCENE','DIALOGUE','DEAD'].includes(getFlowMode()) || document.hidden) return;
    restoreFocus=document.activeElement;
    backdrop.hidden=false;dialog.hidden=false;document.body.dataset.menuOpen='true';
    menuBtn.setAttribute('aria-expanded','true');
    const P=gameState.P;
    dialog.querySelector('#ui1-menu-summary').textContent=P?`${CLASSES[P.cls]?.n||P.cls} · Nível ${P.lv} · Vida ${Math.ceil(P.hp)}/${P.max} · Mana ${Math.ceil(P.mana)}/${P.mm} · ${P.gold} ouro`:'';
    dialog.querySelector('[data-action="load"]').disabled=!getSaveInfo().valid;
    dialog.querySelector('#ui1-menu-status').textContent='';
    setPaused(true);closeBtn.focus({preventScroll:true});
  }
  function close(resume=true) {
    if(dialog.hidden)return;
    backdrop.hidden=true;dialog.hidden=true;document.body.dataset.menuOpen='false';
    menuBtn.setAttribute('aria-expanded','false');
    if(resume)setPaused(false);
    if(resume)(restoreFocus?.isConnected?restoreFocus:menuBtn).focus({preventScroll:true});
  }
  const status=text=>{dialog.querySelector('#ui1-menu-status').textContent=text;};
  function character() {
    close();
    openUpgradePanel('Seu personagem',content=>{
      const P=gameState.P;
      const rows=[['Classe',CLASSES[P.cls]?.n||P.cls],['Nível',P.lv],['Vida',`${Math.ceil(P.hp)} / ${P.max}`],['Mana',`${Math.ceil(P.mana)} / ${P.mm}`],['Experiência',P.xp],['Ouro',P.gold],['Armadura',ARMORS[P.ar]?.n||'Sem armadura']];
      for(const [label,value]of rows){const p=document.createElement('p');p.textContent=`${label}: ${value}`;content.append(p);}
      const change=document.createElement('button');change.type='button';change.textContent='Editar aparência e classe';
      change.addEventListener('click',()=>{document.getElementById('upgrade-panel-close').click();original('chr')?.click();syncGameFlow();});content.append(change);
    });
  }
  function map() {
    close();openUpgradePanel('Mapa da fronteira',content=>{
      const mapCanvas=document.createElement('canvas');
      mapCanvas.setAttribute('role','img');mapCanvas.setAttribute('aria-label','Mapa atual com áreas exploradas, posição do jogador e marcas de missão');
      renderExplorationMap(mapCanvas);content.append(mapCanvas);
      const legend=document.createElement('p');legend.textContent='A névoa preserva as áreas ainda não exploradas. Sua posição, direção e objetivos correspondem ao minimapa da aventura.';content.append(legend);
      const heading=document.createElement('h3');heading.textContent='Locais descobertos';content.append(heading);
      const list=document.createElement('ul'),discovered=gameState.LM.filter(mark=>mark.f);
      if(!discovered.length){const item=document.createElement('li');item.textContent='Explore os arredores de Vilarrubra para revelar locais.';list.append(item);}
      for(const mark of discovered){const item=document.createElement('li');item.textContent=mark.n;list.append(item);}content.append(list);
    });
  }
  menuBtn.addEventListener('click',()=>dialog.hidden?open():close());
  backdrop.addEventListener('click',()=>close());closeBtn.addEventListener('click',()=>close());
  dialog.addEventListener('click',e=>{
    const button=e.target.closest('button');if(!button||button===closeBtn)return;
    const action=button;
    if(action.dataset.original&&!action.dataset.action){const target=original(action.dataset.original);if(target){close();target.click();syncGameFlow();}return;}
    const operation=button.dataset.action;
    if(operation==='character')character();
    else if(operation==='map')map();
    else if(operation==='settings'){close();openSettings();}
    else if(operation==='resume')close();
    else if(operation==='save'){const result=saveGame();status(result.ok?'Aventura salva neste dispositivo.':result.error||'Falha ao salvar.');dialog.querySelector('[data-action="load"]').disabled=!getSaveInfo().valid;}
    else if(operation==='load'){
      if(!confirm('Carregar o último save? O progresso ainda não salvo desta sessão será perdido.'))return;
      const result=loadGame();if(result.ok)close();else status(result.error||'Save indisponível.');
    }else if(operation==='title'){
      if(!confirm('Voltar ao título? Salve primeiro para preservar o progresso desta sessão.'))return;
      close(false);const result=returnToTitle();if(!result.ok){open();status(result.error||'Não foi possível voltar ao título.');}
    }
  });
  const legacyModal=()=>!original('perf-panel')?.hidden||original('qj')?.classList.contains('on')||original('arsenal-modal')?.classList.contains('on')||!original('hinaria-lore-codex')?.hidden||!original('upgrade-panel')?.hidden;
  document.addEventListener('keydown',e=>{
    const name=e.target?.tagName||'';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(name)||e.target?.isContentEditable) return;
    if(!dialog.hidden){
      if(e.key==='Tab'){trapFocus(dialog,e);return;}
      if(e.key==='Escape'||e.key.toLowerCase()==='m'){e.preventDefault();e.stopImmediatePropagation();close();return;}
      if(!['Enter',' '].includes(e.key))e.stopImmediatePropagation();return;
    }
    if((e.key.toLowerCase()==='m'||e.key==='Escape')&&!e.repeat&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!legacyModal()){
      if(['PLAYING','PAUSED'].includes(getFlowMode())){e.preventDefault();e.stopImmediatePropagation();open();}
    }
  },true);
  window.addEventListener('hinaria:flowchange',e=>{
    const mode=e.detail.mode;
    if(['TITLE','CHARACTER_CREATION','CUTSCENE','DIALOGUE'].includes(mode))close(false);
    // Background pauses must expose a real Resume action once the page returns.
    if(mode==='PAUSED')queueMicrotask(()=>{if(!legacyModal()&&!document.hidden)open();});
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&getFlowMode()==='PAUSED'&&!legacyModal())open();});
  document.addEventListener('backbutton',e=>{if(!dialog.hidden){e.preventDefault();close();}else if(!legacyModal()&&getFlowMode()==='PLAYING'){e.preventDefault();open();}});

  // Compose a single responsive combat dock, avoiding two independently
  // positioned layers overlapping on narrow mobile screens.
  const dock=document.createElement('div');
  dock.id='ui-combat-dock';
  dock.setAttribute('aria-label','Controles de combate');
  document.body.append(dock);
  const actions=original('combat-v2-actions');
  if(actions)dock.append(actions);
  dock.append(hot);
  // Visually group the three core skills; moving nodes keeps their JS handlers.
  hot.prepend(original('s0'),original('s1'),original('s2'));
  // Original HTML hides Replay inline; CSS now owns visibility via + Extras.
  if(original('s3')) original('s3').style.display='';

  const extra=document.createElement('button');
  extra.type='button';extra.id='ui-more-skills';
  extra.setAttribute('aria-label','Mostrar habilidades extras');
  extra.setAttribute('aria-expanded','false');
  extra.textContent='+ Extras'; hot.append(extra);
  extra.addEventListener('click',()=>{
    const show=hot.classList.toggle('ui-extras-open');
    extra.setAttribute('aria-expanded',String(show));
    extra.textContent=show?'− Menos':'+ Extras';
    dock.classList.toggle('ui-dock-expanded',show);
  });

  document.body.classList.add('ui-v1');
  window.HINARIA_UI_V1={open,close,version:'1.2-paused-save'};
}
