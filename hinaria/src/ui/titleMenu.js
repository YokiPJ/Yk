/** Deliberate title actions and shared accessible panels, backed by game systems. */
import { gameState } from '../core/gameState.js';
import { startNewGame, continueGame, getSaveInfo, getFlowMode, setPaused, returnToTitle, syncGameFlow } from '../core/gameFlow.js';
import { initTitleScreenThree, disposeTitleScreenThree } from './titleScreenThree.js';

const PREFS_KEY = 'hinaria.ui.accessibility.v1';
let initialized = false, panel, panelContent, panelHeading, previousFocus, settingsShade;
let titleVisible = false;
const byId = id => document.getElementById(id);
const visible = element => element && !element.hidden && getComputedStyle(element).display !== 'none';

export function trapFocus(root, event) {
  if (event.key !== 'Tab') return;
  const items = [...root.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href],[tabindex="0"]')].filter(el => el.getClientRects().length);
  if (!items.length) { event.preventDefault(); root.focus(); return; }
  const first=items[0],last=items[items.length-1];
  if(event.shiftKey && (document.activeElement===first || !root.contains(document.activeElement))) {event.preventDefault();last.focus();}
  else if(!event.shiftKey && (document.activeElement===last || !root.contains(document.activeElement))) {event.preventDefault();first.focus();}
}

export function closeUpgradePanel() {
  if (!panel || panel.hidden) return;
  panel.hidden=true;panelContent.replaceChildren();
  if (!titleVisible) setPaused(false);
  previousFocus?.focus?.({preventScroll:true});
}

export function openUpgradePanel(title, build) {
  if (!panel) return;
  previousFocus=document.activeElement;
  if (!titleVisible) setPaused(true);
  panelHeading.textContent=title;panelContent.replaceChildren();build(panelContent);
  panel.hidden=false;byId('upgrade-panel-close').focus({preventScroll:true});
}

export function openSettings() {
  const target=byId('perf-panel');
  if (!target) return;
  previousFocus=document.activeElement;
  // Native handler applies the existing audio-unlock and preference behavior.
  if(target.hidden) byId('perf-open')?.click();
  syncGameFlow();
  byId('perf-close')?.focus({preventScroll:true});
}

function installAccessibilitySettings() {
  let prefs={};try {prefs=JSON.parse(localStorage.getItem(PREFS_KEY)||'{}')||{};}catch{}
  let reduce=typeof prefs.reducedMotion==='boolean'?prefs.reducedMotion:matchMedia('(prefers-reduced-motion:reduce)').matches;
  let scale=Number.isFinite(prefs.hudScale)?Math.max(.85,Math.min(1.2,prefs.hudScale)):1;
  const container=byId('perf-panel');
  const motionLabel=document.createElement('label');motionLabel.innerHTML='<span>Reduzir movimento</span><input type="checkbox" id="perf-reduce-motion">';
  const scaleLabel=document.createElement('label');scaleLabel.innerHTML='<span>Tamanho da interface <output id="perf-hud-scale-value"></output></span><input type="range" id="perf-hud-scale" min="85" max="120" step="5">';
  container?.append(motionLabel,scaleLabel);
  const motion=byId('perf-reduce-motion'),slider=byId('perf-hud-scale');
  const apply=()=>{
    document.documentElement.dataset.reduceMotion=String(reduce);
    document.documentElement.classList.toggle('reduce-motion',reduce);
    document.documentElement.style.setProperty('--hinaria-hud-scale',String(scale));
    motion.checked=reduce;slider.value=String(Math.round(scale*100));byId('perf-hud-scale-value').textContent=`${Math.round(scale*100)}%`;
    window.dispatchEvent(new CustomEvent('hinaria:settingschange',{detail:{reducedMotion:reduce,hudScale:scale}}));
  };
  const save=()=>{try{localStorage.setItem(PREFS_KEY,JSON.stringify({reducedMotion:reduce,hudScale:scale}));}catch{/* preference storage is optional */}};
  motion?.addEventListener('change',()=>{reduce=motion.checked;apply();save();});
  slider?.addEventListener('input',()=>{scale=Number(slider.value)/100;apply();save();});apply();
  // A real backdrop prevents clicks from settings reaching the title or gameplay.
  settingsShade=document.createElement('div');settingsShade.id='upgrade-settings-shade';settingsShade.hidden=true;
  settingsShade.addEventListener('click',()=>byId('perf-close')?.click());document.body.append(settingsShade);
  container?.setAttribute('role','dialog');container?.setAttribute('aria-modal','true');
  new MutationObserver(()=>{
    settingsShade.hidden=container.hidden;
    if(container.hidden)previousFocus?.focus?.({preventScroll:true});
  }).observe(container,{attributes:true,attributeFilter:['hidden']});
}

function showCredits() {
  openUpgradePanel('Créditos de HINÁRIA',content=>{
    const description=document.createElement('p');description.textContent='Um Mundo Além dos Sonhos — a aventura de Vilarrubra.';content.append(description);
    const blocks=[
      ['Tecnologia','Three.js r160 · PixiJS 8.6.6 · anime.js 3.2.1 · Capacitor 7. O projeto mantém JavaScript ES modules e os recursos locais da base HINÁRIA.'],
      ['Artes e universo','Personagens, mundo, retratos e recursos fornecidos nos arquivos originais de HINÁRIA. A tela de título utiliza as duas artes incorporadas na referência enviada.'],
      ['Música distribuída','ambiente-v79.mp3 e boss-original-v79.mp3: trilhas fornecidas na base. Direitos e atribuições originais preservados. Os dados completos de música encontram-se em CREDITOS_MUSICAS_BOSS.md, no projeto.'],
      ['Catálogo opcional documentado','Battle Theme — Wolfgang_; Heavy Boss Battle 1 — MintoDog. O catálogo só é ativado pelo instalador opcional descrito nos créditos do projeto.']
    ];
    for(const [name,text] of blocks){const heading=document.createElement('h3');heading.textContent=name;const p=document.createElement('p');p.textContent=text;content.append(heading,p);}
  });
}

function refreshSave() {
  const info=getSaveInfo(),button=byId('title-continue');
  button.hidden=!info.valid;button.disabled=!info.valid;
  if(info.valid){const stamp=new Date(info.timestamp);byId('title-save-caption').textContent=[info.identity?.name||info.className,`Nível ${info.level||1}`,Number.isNaN(stamp.getTime())?'':stamp.toLocaleString('pt-BR')].filter(Boolean).join(' · ');}
}

export function showTitleMenu() {
  const cover=byId('cover');if(!cover)return;
  titleVisible=true;cover.hidden=false;cover.classList.remove('out');document.body.dataset.flow='TITLE';
  refreshSave();byId('title-status').textContent='Uma aventura começa com uma escolha.';
  for(const id of ['play','title-settings','title-credits'])byId(id).disabled=false;
  initTitleScreenThree().catch(error=>console.warn('[HINÁRIA] Título usa arte CSS:',error));
  (visible(byId('title-continue'))?byId('title-continue'):byId('play')).focus({preventScroll:true});
}

export function hideTitleMenu() {
  titleVisible=false;disposeTitleScreenThree();
  const cover=byId('cover');if(cover)cover.hidden=true;
  if(panel&&!panel.hidden){panel.hidden=true;panelContent.replaceChildren();}
  const settings=byId('perf-panel');if(settings)settings.hidden=true;
}

export function initTitleMenu() {
  if(initialized)return;initialized=true;
  panel=document.createElement('section');panel.id='upgrade-panel';panel.hidden=true;
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','upgrade-panel-heading');
  panel.innerHTML='<div class="upgrade-panel-card"><header><h2 id="upgrade-panel-heading"></h2><button id="upgrade-panel-close" type="button" aria-label="Fechar painel">×</button></header><div id="upgrade-panel-content"></div></div>';
  document.body.append(panel);panelHeading=byId('upgrade-panel-heading');panelContent=byId('upgrade-panel-content');
  byId('upgrade-panel-close').addEventListener('click',closeUpgradePanel);
  panel.addEventListener('click',event=>{if(event.target===panel)closeUpgradePanel();});
  const heading=byId('title-heading');
  const title=heading.textContent;heading.setAttribute('aria-label',title);heading.replaceChildren();
  for(const [index,letter]of [...title].entries()){const span=document.createElement('span');span.className='title-letter';span.style.setProperty('--letter',String(index));span.textContent=letter;span.setAttribute('aria-hidden','true');heading.append(span);}
  installAccessibilitySettings();
  byId('play').addEventListener('click',()=>{
    if(getSaveInfo().valid&&!confirm('Iniciar uma nova aventura? O save anterior será substituído quando você salvar o novo jogo.'))return;
    const result=startNewGame();if(!result.ok)byId('title-status').textContent=result.error||'Não foi possível iniciar.';
  });
  byId('title-continue').addEventListener('click',()=>{
    const result=continueGame();if(!result.ok){byId('title-status').textContent=result.error||'Save indisponível.';refreshSave();}
  });
  byId('title-settings').addEventListener('click',openSettings);
  byId('title-credits').addEventListener('click',showCredits);
  window.addEventListener('hinaria:flowchange',event=>{
    const mode=event.detail.mode;document.body.dataset.flow=mode;
    if(mode==='TITLE')showTitleMenu();else if(titleVisible)hideTitleMenu();
  });
  window.addEventListener('storage',refreshSave);
  document.addEventListener('keydown',event=>{
    const root=visible(byId('perf-panel'))?byId('perf-panel'):visible(panel)?panel:titleVisible?byId('cover'):null;
    if(!root)return;
    if(event.key==='Escape'){
      if(root===panel){event.preventDefault();event.stopImmediatePropagation();closeUpgradePanel();}
      else if(root.id==='perf-panel'){event.preventDefault();event.stopImmediatePropagation();byId('perf-close')?.click();}
    }
    trapFocus(root,event);
  },true);
  // Capacitor's optional native App plugin emits backbutton via the host bridge.
  document.addEventListener('backbutton',event=>{
    if(visible(panel)){event.preventDefault();closeUpgradePanel();}
    else if(visible(byId('perf-panel'))){event.preventDefault();byId('perf-close')?.click();}
  });
  if(getFlowMode()==='TITLE')showTitleMenu();
  initNativeBridge().catch(error=>console.warn('[HINÁRIA] Integração nativa opcional:',error.message));
}


/** Native listeners persist with the game instance; browsers never load the plugin. */
async function initNativeBridge() {
  if (!window.Capacitor?.isNativePlatform?.()) return;
  const { registerPlugin } = await import('../../vendor/capacitor-core.js');
  const App = registerPlugin('App');
  const exit = async () => {
    if (!confirm('Sair de HINÁRIA? O progresso ainda não salvo será perdido.')) return;
    try { await App.exitApp(); }
    catch (error) { byId('title-status').textContent='Não foi possível fechar o aplicativo: '+error.message; }
  };
  if(window.Capacitor.getPlatform?.()==='android'){
    const button=document.createElement('button');button.id='title-exit';button.type='button';button.textContent='Sair';
    button.addEventListener('click',exit);byId('title-actions').append(button);
  }
  await App.addListener('backButton',()=>{
    const event=new Event('backbutton',{cancelable:true});document.dispatchEvent(event);
    if(event.defaultPrevented)return;
    if(getFlowMode()==='TITLE'){exit();return;}
    if(getFlowMode()==='CHARACTER_CREATION'){if(confirm('Cancelar a criação do personagem e voltar ao título?'))returnToTitle();return;}
    // Legacy inventory/journal/lore views already implement Escape semantics.
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
    if(getFlowMode()==='PLAYING')setPaused(true);
  });
  await App.addListener('appStateChange',({isActive})=>{
    if(!isActive && !['BOOT','TITLE'].includes(getFlowMode()))setPaused(true);
    else if(isActive && getFlowMode()==='PAUSED')window.HINARIA_UI_V1?.open?.();
  });
}
