/** HINÁRIA V7.8 — Interações 100% por botões. Sem chat ou comandos digitados.
 * Botões acionam o motor de missões existente, preservando progresso e recompensas.
 */
import { gameState } from '../core/gameState.js';
import { Q } from '../quest/quests.js';
import { replyBram, replyYoki } from '../npc/npc.js';
import { openArsenal } from './arsenalUI.js';
import { updateHUD } from './hud.js';
import { nearbyHouse, houseLabel, enterHouse, leaveHouse } from '../world/houseInteriors.js';

const RANGE = 3.25;
let panel, backdrop, title, description, actions, prompt, active = null;
let lastNearby = null, previousFocus = null, viewSerial = 0, installed = false;
function interactionBlocked() {
  return gameState.ccOpen || gameState.arsenalOpen || gameState.pauseRequested || gameState.cutsceneActive ||
    ['BOOT','TITLE','PAUSED','DEAD','CHARACTER_CREATION'].includes(gameState.flow);
}
function clearActions() { viewSerial++; actions.replaceChildren(); }
function focusChoices() { actions?.children?.[0]?.focus?.({preventScroll:true}); }
function clearHeldInput() {
  gameState.keys = {}; gameState.jx = gameState.jz = 0;
  gameState.jid = null; gameState.ptr = {}; gameState.pd = null;
  if (gameState.P?.path) gameState.P.path.length = 0;
}
function updateSpeaker(id) {
  if (!ENTRIES[id]) return;
  panel.dataset.speaker = id;
  const badge = panel.querySelector?.('#dialog-speaker-badge');
  if (badge) badge.textContent = id === 'bram' ? 'B' : 'Y';
}
const ENTRIES = {
  bram: { title: 'Bram, o Ferreiro', subtitle: 'Forjo armas e protejo Vilarrubra.' },
  yoki: { title: 'Yoki, o Olho-Parado', subtitle: 'Eu observo. Quem observa, lembra.' },
};

function entity(id) { return id === 'bram' ? gameState.N : id === 'yoki' ? gameState.Y : null; }
function distance(id) {
  const e = entity(id), P = gameState.P;
  return e && P ? Math.hypot(P.x - e.x, P.z - e.z) : Infinity;
}
export function closestNPC() {
  if (!gameState.P) return null;
  const list = ['bram', 'yoki'].filter(id => distance(id) <= RANGE).sort((a,b) => distance(a)-distance(b));
  return list[0] || null;
}
function button(label, handler, type='') {
  const b = document.createElement('button');
  b.type='button'; b.className = `dialog-choice ${type}`.trim(); b.textContent=label;
  const serial = viewSerial, owner = active;
  b.addEventListener('click', event => {
    // Detached choices and double taps cannot submit a quest or purchase twice.
    if (b.disabled || !owner || active !== owner || serial !== viewSerial || interactionBlocked() || distance(owner) > RANGE) return;
    event?.stopPropagation?.();
    b.disabled = true;
    try { handler(); }
    finally { if (serial === viewSerial && active === owner) b.disabled = false; }
  });
  actions.appendChild(b);
  return b;
}
function options(id, message, buttons) {
  title.textContent = ENTRIES[id].title;
  description.innerHTML = message || ENTRIES[id].subtitle;
  clearActions();
  for (const option of buttons) button(option[0], option[1], option[2] || '');
  button('Voltar', () => showMain(id), 'dialog-back');
  button('Fechar ✕', closeDialogue, 'dialog-close');
  focusChoices();
}
function questChoice(id) {
  const markers = Q.markers().filter(m => m.npc === id);
  const turn = markers.find(m=>m.k === 'turn');
  const news = markers.find(m=>m.k === 'new');
  if (turn) return ['✓ Entregar missão', () => {
    const result = Q.talk(id, 'hi');
    options(id, result || 'Missão atualizada!', []);
  }, 'dialog-quest'];
  if (news) return ['★ Receber missão', () => {
    const offer = Q.talk(id, 'missao');
    title.textContent = ENTRIES[id].title;
    description.innerHTML = offer || 'Tenho uma missão para você.';
    clearActions();
    button('✓ Aceitar missão', () => {
      const result = Q.talk(id, 'sim');
      options(id, result || 'Missão aceita!', []);
    }, 'dialog-quest');
    button('Agora não', () => {
      Q.talk(id, 'nao'); showMain(id);
    });
    focusChoices();
  }, 'dialog-quest'];
  return ['★ Minhas missões', () => options(id, Q.talk(id,'missao') || 'Nenhuma missão para entregar agora.', [])];
}
function reply(id, q) { return id === 'bram' ? replyBram(q) : replyYoki(q); }
function info(id, label, q) {
  return [label, () => options(id, reply(id, q), [])];
}
function showMain(id) {
  if (!panel || distance(id) > RANGE || interactionBlocked()) { closeDialogue(); return; }
  updateSpeaker(id);
  title.textContent=ENTRIES[id].title;
  description.textContent=ENTRIES[id].subtitle;
  clearActions();
  const [label, handle, css] = questChoice(id);
  button(label,handle,css);
  if (id === 'bram') {
    button('⚔ Loja de armas e habilidades', () => { closeDialogue(); openArsenal(); }, 'dialog-shop');
    button('🛡 Comprar armadura', () => {
      title.textContent = 'Armaduras de Bram';
      description.textContent = `Seu ouro: ${gameState.P.gold}. Escolha uma armadura:`;
      clearActions();
      for (const [key, caption] of [['couro', 'Couro · 60 ouro'], ['malha','Malha · 160 ouro'], ['placas','Placas · 320 ouro']])
        button(caption,() => { const message = replyBram(key); updateHUD(); options(id,message,[]); });
      button('Voltar',()=>showMain(id));
      focusChoices();
    });
    button(...info(id,'Sobre o ferreiro','job'));
    button(...info(id,'Quem é Bram?','name'));
  } else {
    button(...info(id,'Quem é Yoki?','name'));
    button(...info(id,'História da tribo','tribo'));
    button(...info(id,'O espelho misterioso','espelho'));
    button('🪓 Machado do Replay — o despertar',()=>options(id,
      'Yoki observa a lâmina como quem revê um combate. <b>“Uma gota de mana basta. O machado mostra o que cada portador guarda dentro de si.”</b> '
      +'O poder de Yoki é o <b>Machado Explosivo Flamejante</b>. No Arsenal, equipe o Machado do Replay, '
      +'pressione <b>R</b> ou toque em <b>Despertar</b>, e depois acerte um golpe manual. <b>“De novo.”</b>',[]),'dialog-quest');
    button('✨ Aprender Replay',()=>{
      const result=replyYoki('replay');
      options(id,result,[]);
    }, 'dialog-quest');
    button('⚔ Treinar habilidades',()=>{closeDialogue();openArsenal();},'dialog-shop');
  }
  button('Despedir-se ✕',closeDialogue,'dialog-close');
}
export function openDialogue(id=closestNPC()) {
  if (interactionBlocked()) return false;
  if (gameState.insideHouse) { leaveHouse(); return true; }
  // Standing at a house door takes priority, even when an NPC is nearby.
  if (nearbyHouse()) return enterHouse();
  if (!id || !panel || gameState.ccOpen || gameState.arsenalOpen || distance(id) > RANGE) return false;
  previousFocus = document.activeElement;
  active=id;
  clearHeldInput();
  panel.classList.add('on'); backdrop.classList.add('on');
  panel.setAttribute('aria-hidden','false');
  gameState.dialogueOpen = true;
  if (gameState.P?.path) gameState.P.path.length=0;
  if (gameState.P) gameState.P.greet=false;
  showMain(id);
  panel.querySelector('#dialog-close-top')?.focus({preventScroll:true});
  return true;
}
export function closeDialogue() {
  if (!panel) return;
  const wasOpen = gameState.dialogueOpen;
  active=null; viewSerial++;
  clearHeldInput();
  gameState.dialogueOpen=false;
  panel.classList.remove('on'); backdrop.classList.remove('on');
  panel.setAttribute('aria-hidden','true');
  if (wasOpen && previousFocus?.isConnected !== false) previousFocus?.focus?.({preventScroll:true});
  previousFocus=null;
}
export function updateDialogueUI() {
  if (!panel) return;
  if (active && (distance(active)>RANGE+0.5 || interactionBlocked())) closeDialogue();
  const nearest=closestNPC();
  const house=(!gameState.insideHouse)?nearbyHouse():null;
  const key=gameState.insideHouse?'inside':(house ? 'door:'+house.x+':'+house.z : nearest);
  if (key !== lastNearby) {
    lastNearby=key;
    prompt.textContent=gameState.insideHouse ? '↩ Sair da casa (F)' : house ? `⌂ Entrar: ${houseLabel(house)} (F)` : nearest ? `✦ Conversar com ${ENTRIES[nearest].title} (F)` : '';
  }
  const show=(!!nearest || !!house || gameState.insideHouse) && !interactionBlocked() && !gameState.dialogueOpen;
  prompt.classList.toggle('on',show);
}
export function initDialogueUI() {
  if (installed) return;
  panel=document.getElementById('dialog-panel');
  backdrop=document.getElementById('dialog-shade');
  title=document.getElementById('dialog-title');
  description=document.getElementById('dialog-text');
  actions=document.getElementById('dialog-options');
  prompt=document.getElementById('interact-npc');
  if (!panel || !backdrop || !title || !description || !actions || !prompt) return;
  installed = true;
  panel.setAttribute('role','dialog');
  panel.setAttribute('aria-modal','true');
  panel.setAttribute('aria-labelledby','dialog-title');
  panel.setAttribute('aria-describedby','dialog-text');
  description.setAttribute('aria-live','polite');
  description.setAttribute('aria-atomic','true');
  const head = panel.querySelector?.('#dialog-head');
  if (head && !panel.querySelector?.('#dialog-speaker-badge')) {
    const badge = document.createElement('span');
    badge.id='dialog-speaker-badge'; badge.setAttribute('aria-hidden','true');
    head.prepend?.(badge);
  }
  panel.addEventListener('keydown', event => {
    if (!gameState.dialogueOpen) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeDialogue(); return; }
    if (event.key !== 'Tab') return;
    const choices=[...(panel.querySelectorAll?.('button:not([disabled])') || [])];
    if (!choices.length) return;
    const first=choices[0], last=choices[choices.length-1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  document.addEventListener?.('focusin', event => {
    if (gameState.dialogueOpen && panel.contains && !panel.contains(event.target)) focusChoices();
  });
  prompt.addEventListener('click',()=>openDialogue());
  panel.querySelector('#dialog-close-top').addEventListener('click',closeDialogue);
  backdrop.addEventListener('click',closeDialogue);
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && gameState.dialogueOpen) { e.preventDefault(); closeDialogue(); }
  });
  gameState.dialogueOpen=false;
}
