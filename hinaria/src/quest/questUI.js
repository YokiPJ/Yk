/** HINÁRIA — interface de missões: rastreador, diário (botão), avisos e marcas sobre os NPCs. */
import { gameState } from '../core/gameState.js';
import { say, updateHUD } from '../ui/hud.js';
import { grantXp } from '../combat/combat.js';
import { Q } from './quests.js';
import { CHAPTER_1, QUESTS } from './questData.js';

let qt, qj, qb, qbT = 0, introDone = false, tagKey = '';
const QUEST_SAVE_KEY='hinaria.quests.exploration.v2';
function saveQuests(){
  if(gameState.suspendLegacyPersistence)return;
  try { localStorage.setItem(QUEST_SAVE_KEY,JSON.stringify({
    saveVersion:2,quests:JSON.parse(Q.serialize()),
    discovered:gameState.LM.filter(l=>l.f).map(l=>l.n),
    chests:gameState.CH.filter(c=>c.o).map(c=>`${c.x}:${c.z}`)
  })); }catch(e){console.warn('[HINÁRIA] Save de missões indisponível:',e);}
}
export function restoreQuestProgress(){
  try{
    const record=JSON.parse(localStorage.getItem(QUEST_SAVE_KEY)||'null');
    if(!record || ![1,2].includes(record.saveVersion))return false;
    const discovered=new Set(Array.isArray(record.discovered)?record.discovered:[]);
    for(const l of gameState.LM) if(discovered.has(l.n)) l.f=1;
    const chests=new Set(Array.isArray(record.chests)?record.chests:[]);
    for(const c of gameState.CH) if(chests.has(`${c.x}:${c.z}`)) {c.o=1;if(c.lid)c.lid.rotation.x=-1.2;}
    // Restore old v1 quest payload unchanged. No scene objects in JSON.
    return Q.restore(typeof record.quests==='string'?record.quests:JSON.stringify(record.quests));
  }catch(e){console.warn('[HINÁRIA] Save de missões inválido; iniciando sem alterar o original:',e);return false;}
}
export function saveQuestProgress(){saveQuests();} 

const CSS = `
#qt{margin-top:6px;border-top:1px solid var(--edge);padding-top:4px;font-size:12px;line-height:1.25}
#qt .t{color:var(--gold);font-weight:600}#qt .n{color:#c0392b}#qt .o{opacity:.9}#qt:empty{display:none}
#qj{position:absolute;z-index:30;left:50%;top:50%;transform:translate(-50%,-50%);width:min(520px,94vw);max-height:80vh;display:none;flex-direction:column;padding:10px}
#qj.on{display:flex}#qj h3{margin:0 0 6px;font-size:17px;color:var(--gold)}
#qj .tabs{display:flex;gap:6px;margin-bottom:6px}#qj .tabs button.on{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold)}
#qjl{overflow:auto;flex:1;font-size:13px}#qjl .q{margin-bottom:10px;padding-bottom:6px;border-bottom:1px dashed var(--edge)}
#qjl .q b{color:var(--gold)}#qjl .s{margin:2px 0 0 8px}#qjl .s.d{opacity:.55;text-decoration:line-through}#qjl .s.c{font-weight:600}
#qjl .rw{font-size:12px;opacity:.8}#qj .x{position:absolute;right:8px;top:8px}
#qb{position:absolute;z-index:25;left:50%;top:18%;transform:translateX(-50%);text-align:center;padding:10px 22px;opacity:0;pointer-events:none;transition:opacity .5s;max-width:90vw}
#qb.on{opacity:1}#qb small{display:block;opacity:.7;font-size:12px}#qb b{font-size:19px;color:var(--gold)}
.tag .qm{color:#e0b93f;font-weight:700;text-shadow:0 0 4px #000;margin-right:3px}
`;

export function initQuestUI() {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  qt = document.createElement('div'); qt.id = 'qt'; document.getElementById('hud').appendChild(qt);
  const hud = document.getElementById('hud');
  const quick = document.createElement('button');
  quick.id = 'quest-quick-toggle'; quick.type = 'button';
  quick.setAttribute('aria-expanded', 'false'); quick.textContent = '★ Objetivo ▾';
  quick.addEventListener('click', () => {
    const expanded = hud.classList.toggle('quest-expanded');
    quick.setAttribute('aria-expanded', String(expanded));
    quick.textContent = expanded ? '★ Objetivo ▴' : '★ Objetivo ▾';
  });
  hud.appendChild(quick);
  const row = document.getElementById('chr')?.parentElement;
  if (row) { const b = document.createElement('button'); b.id = 'qbtn'; b.textContent = 'Diário de Missões'; b.onclick = toggleJournal; row.appendChild(b); }
  qj = document.createElement('div'); qj.id = 'qj'; qj.className = 'panel';
  qj.innerHTML = `<button class="x">✕</button><h3>Diário de Missões</h3><div class="tabs"><button data-t="a" class="on">Ativas</button><button data-t="d">Concluídas</button></div><div id="qjl"></div>`;
  document.body.appendChild(qj);
  qb = document.createElement('div'); qb.id = 'qb'; qb.className = 'panel'; document.body.appendChild(qb);
  qj.querySelector('.x').onclick = toggleJournal;
  qj.querySelector('.tabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; qj.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b)); renderJournal(); };
  addEventListener('keydown', e => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    // J reservado ao ataque manual; diário acessível pelo botão e fecha no Escape.
    if (e.key === 'Escape' && qj.classList.contains('on')) toggleJournal();
  });
  Q.setHooks({
    say,
    banner: (kind, title) => { qb.innerHTML = `<small>${kind}</small><b>${title}</b>`; qb.classList.add('on'); qbT = 3.6; },
    reward: r => { if (r.gold) gameState.P.gold += r.gold; if (r.xp) grantXp(r.xp); updateHUD(); },
    changed: () => { reconcileDefeatedBossQuests(); refresh(); saveQuests(); },
  });
  restoreQuestProgress();
  window.addEventListener('hinaria:landmark-discovered',saveQuests);
  window.addEventListener('hinaria:chest-opened',saveQuests);
  refresh();
}

function toggleJournal() { qj.classList.toggle('on'); if (qj.classList.contains('on')) renderJournal(); }

function renderJournal() {
  const done = qj.querySelector('.tabs button.on').dataset.t === 'd';
  const list = Q.journal().filter(j => done ? j.s === 'done' : j.s !== 'done');
  const items = Q.items().length ? `<div class="q"><b>Itens de missão:</b> ${Q.items().map(i => ({ estilhaco: 'Estilhaço de Sonho' }[i] || i)).join(', ')}</div>` : '';
  qj.querySelector('#qjl').innerHTML = (done ? '' : `<div class="q rw">${CHAPTER_1.title}</div>` + items) + (list.length ? list.map(j => `<div class="q"><b>${j.main ? '★ ' : ''}${j.title}</b>${j.s === 'available' ? ' <i>(nova — clique em Conversar)</i>' : ''}<div class="rw">${j.desc}</div>${j.steps.map(s => `<div class="s ${s.done ? 'd' : s.cur ? 'c' : ''}">${s.done ? '✓' : s.cur ? '➤' : '•'} ${s.text} ${s.prog}</div>`).join('')}${j.reward ? `<div class="rw">Recompensa: ${j.reward.gold || 0} de ouro, ${j.reward.xp || 0} de exp</div>` : ''}</div>`).join('') : '<div class="q">Nada por aqui ainda.</div>');
}

function refresh() {
  if (!qt) return;
  qt.innerHTML = Q.tracker().slice(0, 3).map(t => `<div><span class="t">${t.main ? '★ ' : ''}${t.title}</span>${t.isNew ? ' <span class="n">NOVA</span>' : ''}<div class="o">➤ ${t.text} ${t.prog}</div></div>`).join('');
  if (qj && qj.classList.contains('on')) renderJournal();
  markTags();
}

/** "!" dourado ao lado do nome de NPCs com missão disponível ou pronta para entregar. */
function markTags() {
  const m = Q.markers().filter(x => x.npc && (x.k === 'new' || x.k === 'turn')), key = m.map(x => x.npc + x.k).join();
  if (key === tagKey) return; tagKey = key;
  for (const [id, e] of [['bram', gameState.N], ['yoki', gameState.Y]]) {
    if (!e || !e.tag) continue;
    e.tag.innerHTML = (m.some(x => x.npc === id) ? '<span class="qm">!</span>' : '') + e.name;
  }
}

/** Chamado a cada frame (barato): esconde avisos e dispara a abertura da história. */
export function questTick(dt) {
  if (qbT > 0) { qbT -= dt; if (qbT <= 0) qb.classList.remove('on'); }
  if (!introDone && !gameState.ccOpen && gameState.N) {
    introDone = true;
    qb.innerHTML = `<small>HINÁRIA — Vilarrubra</small><b>${CHAPTER_1.title}</b>`; qb.classList.add('on'); qbT = 5;
    say('Faz três noites que os grilos calaram em Vilarrubra. Os ratos fogem dos campos, os cães uivam para o leste e o ar tem um cheiro de ferro e sonho.', 'npc');
    say('Bram, o ferreiro, mandou chamar você. Ele fica ao lado da casa grande, ao norte. Chegue perto e use o botão <b>Conversar</b> para falar com ele.', 'npc');
    markTags();
  }
}

/** Recompute unlocks whenever the player levels up. */
export function refreshQuestUI() { refresh(); }

export function resetQuestIntro() { introDone=false; qbT=0; tagKey=''; qb?.classList.remove('on'); refresh(); }

let reconcilingBosses=false;
/** Historical victories still satisfy a later accepted quest, without a second
 * enemy spawn or combat reward. A restore never replays reward callbacks. */
export function reconcileDefeatedBossQuests() {
  if(reconcilingBosses || gameState.suspendLegacyPersistence || !gameState.defeatedBosses?.size)return;
  reconcilingBosses=true;
  try {
    for(const [bossId,id,k] of [['troll_ancient','boss_troll','troll'],['orc_king','boss_orc','orc']]) {
      if(!gameState.defeatedBosses.has(bossId) || Q.status(id)!=='active')continue;
      const state=JSON.parse(Q.serialize()).q[id],definition=QUESTS.find(q=>q.id===id);
      const step=definition?.steps[state?.step];
      if(step?.type==='kill' && step.target==='boss:'+bossId)Q.emit('kill',{k,bossId});
    }
  } finally {reconcilingBosses=false;}
}
