/**
 * HINÁRIA — sistema reutilizável de cutscenes (câmera Three.js + legendas por botões).
 * Bloqueia movimento/entrada via gameState.cutsceneActive, guarda cenas vistas em localStorage,
 * devolve a câmera ao jogador com transição suave e funciona por toque, teclado e botão Pular.
 */
import * as THREE from 'three';
import { gameState } from '../core/gameState.js';
import { insideCabin } from '../world/houseInteriors.js';
import { getGraphicsDiagnostics } from '../ui/performanceUI.js';
import { createRunner, currentShot, stepRunner, advance, skip, pose, ease } from './cutsceneTimeline.js';
import { SCENES, BOSS_TRIGGERS } from './scenes.js';
import { clearBossView } from './cameraOcclusion.js';
import { setCinematicBossMusic, setCinematicVictoryMusic, updateGameAudio } from '../audio/gameAudio.js';
import { Q } from '../quest/quests.js';

let run = null, def = null, ui = null, lastDt = 0.016, blend = null, scan = 0;
let pendingVictory = null, lastVictoryContext = null;
const VICTORY_SPAWNS = Object.freeze({
  troll_victory: { x: 52, z: 35 },
  orc_victory: { x: 58, z: 59 },
});
const sceneNames = Object.freeze({ arrival: 'Chegada a Vilarrubra', yoki: 'Yoki — Bárbaro do Replay', bridge: 'Ponte Velha', yoki_memory:'O Espelho na Estrada', yoki_ashes:'Replay da Garra Cinzenta', yoki_goal:'O Gol Impossível', yoki_troll_tip:'Antes do Troll Ancião', diary: 'Diário de Garrick', troll: 'Troll Ancião', orc: 'Rei dos Orcs', troll_victory: 'Vitória contra o Troll', orc_victory: 'Vitória contra o Rei dos Orcs' });
// Persistência isolada: não escreve nas missões, arsenal ou saves já existentes.
const SEEN_KEY = 'hinaria.v1080.story-cutscenes-only.v1';
const seen = new Set();
try {
  const saved = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
  if (Array.isArray(saved)) for (const id of saved) if (typeof id === 'string') seen.add(id);
} catch (_) { /* modo privado ou armazenamento indisponível */ }
function hasSeen(id) { return seen.has(id); }
function markSeen(id) {
  seen.add(id);
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen])); } catch (_) {}
}

const P3 = { p: [0, 0, 0], l: [0, 0, 0] }, _v = new THREE.Vector3(), _q = new THREE.Quaternion();
// Keep GameState as the receiver when sampling terrain during boss camera occlusion.
const cinematicTerrainHeight = (x, z) => gameState.getHeightAt(x, z);

const CSS = `
#cs-ui{position:fixed;top:0;right:0;bottom:0;left:0;inset:0;z-index:60;display:none;pointer-events:auto;touch-action:manipulation;-webkit-user-select:none;user-select:none}
#cs-ui.on{display:block}
#cs-ui .bar{position:absolute;left:0;right:0;height:11vh;background:#000;transition:transform .45s ease}
#cs-ui .top{top:0;transform:translateY(-100%)}#cs-ui .bot{bottom:0;transform:translateY(100%)}
#cs-ui.on.show .top,#cs-ui.on.show .bot{transform:none}
#cs-ui.lite .bar{transition:none}
#cs-dark{position:absolute;top:0;right:0;bottom:0;left:0;inset:0;background:#000;opacity:0;transition:opacity .6s}#cs-dark.on{opacity:.55}
#cs-title{position:absolute;left:0;right:0;top:34%;text-align:center;color:#f4e8cb;text-shadow:0 2px 12px #000;opacity:0;transition:opacity .7s;padding:0 8vw}
#cs-title.on{opacity:1}#cs-title b{display:block;font-size:clamp(26px,7vw,54px);letter-spacing:2px;color:#edc37e}#cs-title span{display:block;margin-top:8px;font-size:clamp(14px,3.6vw,22px)}
#cs-box{position:absolute;left:50%;bottom:calc(11vh + 14px);transform:translateX(-50%);width:min(620px,92vw);box-sizing:border-box;background:linear-gradient(160deg,#343629f2,#191d1cf2);color:#f4e8cb;border:2px solid #c19b5b;border-radius:12px;padding:10px 14px;box-shadow:0 10px 36px #000c;display:none}
#cs-box.on{display:block}#cs-who{color:#edc37e;font-weight:700;font-size:14px;margin-bottom:4px}#cs-text{font-size:15px;line-height:1.4;min-height:2.8em}
#cs-act{display:flex;gap:8px;justify-content:flex-end;margin-top:8px}
#cs-act button,#cs-skip{min-height:44px;min-width:44px;padding:8px 14px;border-radius:10px;border:2px solid #edc37e;background:#5d4830;color:#fff1c7;font-weight:700;font-size:14px;touch-action:manipulation}
#cs-skip{position:absolute;right:max(10px,env(safe-area-inset-right,0px));top:calc(max(10px,env(safe-area-inset-top,0px)) + 11vh);background:#2b2f2dcc;border-color:#9aa39c;color:#e8e2cf}
#cs-preview-button{position:fixed;top:6px;left:50%;transform:translateX(-50%);z-index:55;background:#171e29d9;border:1px solid #dcb66f;color:#f9dfaa;border-radius:8px;padding:7px 12px;min-height:35px}
#cs-preview-panel{position:fixed;z-index:56;left:50%;top:52px;transform:translateX(-50%);max-height:75dvh;overflow:auto;width:min(370px,90vw);padding:12px;background:#171e29f5;color:#e7d5b1;border:1px solid #dcb66f;border-radius:12px;box-shadow:0 8px 32px #000b;display:none}
#cs-preview-panel.open{display:block}#cs-preview-panel button{background:#343e43;color:#fff5dc;border:1px solid #777053;border-radius:8px;min-height:40px;padding:7px;width:100%;margin:4px 0}
#cs-preview-panel small{display:block;font-size:11px;color:#c7b48e}`;

function buildUI() {
  if (ui) return;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'cs-ui'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Cena');
  el.innerHTML = '<div id="cs-dark"></div><div class="bar top"></div><div class="bar bot"></div><div id="cs-title"><b></b><span></span></div>' +
    '<button id="cs-skip" type="button">Pular ⏭</button><div id="cs-box"><div id="cs-who"></div><div id="cs-text"></div><div id="cs-act"><button id="cs-next" type="button">Continuar ▶</button></div></div>';
  document.body.appendChild(el);
  ui = { el, dark: el.querySelector('#cs-dark'), title: el.querySelector('#cs-title'), box: el.querySelector('#cs-box'), who: el.querySelector('#cs-who'), text: el.querySelector('#cs-text'), next: el.querySelector('#cs-next') };
  ui.next.addEventListener('click', e => { e.stopPropagation(); onContinue(); });
  el.querySelector('#cs-skip').addEventListener('click', e => { e.stopPropagation(); skipCutscene(); });
  el.addEventListener('pointerdown', e => { if (e.target === el || e.target === ui.dark || e.target.closest('#cs-box') === ui.box && e.target !== ui.next) { const s = run && currentShot(run); if (s && s.wait) onContinue(); } });
  window.addEventListener('keydown', e => {
    if (!run) return;
    const k = e.key;
    if (k === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); skipCutscene(); }
    else if (k === 'Enter' || k === ' ' || k === 'f' || k === 'F') { e.preventDefault(); e.stopImmediatePropagation(); onContinue(); }
    else e.stopImmediatePropagation();
  }, true);
}

function lite() { try { return getGraphicsDiagnostics().mode === 'low'; } catch { return false; } }
function showShot() {
  const s = currentShot(run); if (!s) return;
  ui.title.classList.toggle('on', !!s.title);
  if (s.title) { ui.title.querySelector('b').textContent = s.title.big || ''; ui.title.querySelector('span').textContent = s.title.small || ''; }
  ui.dark.classList.toggle('on', !!s.dark);
  const say = !!s.say; ui.box.classList.toggle('on', say);
  if (say) { ui.who.textContent = s.say.who || ''; ui.text.textContent = s.say.text || ''; ui.next.style.display = s.wait ? '' : 'none'; }
}

/** Inicia a cena `id`. Retorna false se já assistida, ativa, ou se os pré-requisitos falham. */
export function playCutscene(id, { preview = false, context = null } = {}) {
  const d = SCENES[id];
  if (!d || run || gameState.cutsceneActive || (!preview && hasSeen(id))) return false;
  let scene; try { scene = d.build(context); } catch (e) { console.warn('[cutscene] erro ao montar', id, e); return false; }
  if (!scene) return false;
  buildUI();
  def = { id, preview, ...d, scene };
  if (lite()) for (const s of scene.shots) s.dur *= 0.75;
  run = createRunner(scene);
  gameState.cutsceneActive = true;
  gameState.keys = {}; gameState.jx = gameState.jz = 0;
  if (gameState.P?.path) gameState.P.path.length = 0;
  gameState.tgt = null; blend = null;
  const isVictoryScene = id === 'troll_victory' || id === 'orc_victory';
  setCinematicBossMusic(isVictoryScene ? null : (scene.musicBossId || null));
  setCinematicVictoryMusic(isVictoryScene);
  ui.el.classList.toggle('lite', lite()); ui.el.classList.add('on'); setTimeout(() => { if (run) ui.el.classList.add('show'); }, 16);
  try { def.onStart && def.onStart(); } catch (e) { console.warn('[cutscene]', e); }
  showShot();
  return true;
}
export const isCutsceneActive = () => !!run;
export const activeCutsceneId = () => (def ? def.id : null);

function onContinue() { if (!run) return; advance(run); afterChange(true); }
export function skipCutscene() { if (!run) return; skip(run); afterChange(true); }
function afterChange(changed) {
  if (!run) return;
  if (run.done) finish(); else if (changed) showShot();
}
function finish() {
  if (!run) return;
  const cam = (gameState.insideHouse && def.room) ? null : gameState.camera;
  blend = { t: 0, cam: null, p: new THREE.Vector3(), q: new THREE.Quaternion(), has: false };
  const lastCam = gameState.insideHouse ? null : cam; if (lastCam) { blend.p.copy(lastCam.position); blend.q.copy(lastCam.quaternion); blend.has = true; }
  const d = def; run = null; def = null;
  if (d && !d.preview && !d.failed) markSeen(d.id);
  gameState.cutsceneActive = false;
  setCinematicBossMusic(null);
  setCinematicVictoryMusic(false);
  ui.el.classList.remove('show'); setTimeout(() => { if (!run) ui.el.classList.remove('on'); }, 460);
  ui.box.classList.remove('on'); ui.title.classList.remove('on'); ui.dark.classList.remove('on');
  try { d.onEnd && d.onEnd(); } catch (e) { console.warn('[cutscene]', e); }
}


/** Chamado apenas após a morte real de um boss; não concede XP nem altera missões. */
export function notifyBossVictory(boss) {
  if (!boss?.isBoss) return;
  const id = boss.bossId === 'troll_ancient' ? 'troll_victory' : boss.bossId === 'orc_king' ? 'orc_victory' : null;
  if (!id || hasSeen(id)) return;
  pendingVictory = { id, context: { x: boss.x, z: boss.z }, elapsed: 0 };
  lastVictoryContext = pendingVictory;
}

/** Prévia voluntária sem mexer no progresso nem no histórico das cenas vistas. */
export function previewCutscene(id) {
  // Preview mode works even before a boss has been defeated. It is purely
  // cinematographic and never grants quest rewards or marks anything as seen.
  let context = lastVictoryContext?.id === id ? lastVictoryContext.context : null;
  if (!context && VICTORY_SPAWNS[id]) {
    const kind = id === 'orc_victory' ? 'orc_king' : 'troll_ancient';
    const alive = gameState.ents?.find(e => e.bossId === kind);
    context = alive ? { x: alive.x, z: alive.z } : VICTORY_SPAWNS[id];
  }
  return playCutscene(id, { preview: true, context });
}

/** Menu de teste disponível apenas via ?cinema=1 (não aparece na versão normal). */
export function initCutscenePreview() {
  if (typeof location === 'undefined' || !new URLSearchParams(location.search).has('cinema') || document.getElementById('cs-preview-button')) return;
  const button = document.createElement('button'); button.id = 'cs-preview-button'; button.type = 'button'; button.textContent = '🎬 Cenas';
  const panel = document.createElement('div'); panel.id = 'cs-preview-panel';
  const heading = document.createElement('strong'); heading.textContent = 'Testar cutscenes (sem marcar como assistidas)'; panel.appendChild(heading);
  for (const [id, label] of Object.entries(sceneNames)) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
    b.addEventListener('click', () => { panel.classList.remove('open'); if (!previewCutscene(id)) { const msg = document.getElementById('cs-preview-message'); if (msg) msg.textContent = 'Cena indisponível agora: aproxime-se do NPC/boss ou entre no local correspondente.'; } });
    panel.appendChild(b);
  }
  const note = document.createElement('small'); note.id = 'cs-preview-message'; note.textContent = 'As cenas dependem dos locais reais. Pular = Esc.'; panel.appendChild(note);
  button.addEventListener('click', () => panel.classList.toggle('open'));
  document.body.append(button, panel);
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
}

/** Chamado todo frame com o tempo real (d0). Também detecta a chegada aos chefes. */
export function cutsceneTick(d0) {
  lastDt = d0;
  if (run) {
    try { updateGameAudio(gameState); const changed = stepRunner(run, d0); afterChange(changed); }
    catch (error) { console.error('[HINÁRIA] Sequência cinematográfica interrompida:',error); if (def) def.failed=true; finish(); }
    return;
  }
  if (pendingVictory) pendingVictory.elapsed += Math.max(0, d0);
  // Boss victory has priority over new encounters. Quest popups, the pause
  // between animations and leaving the arena must not silently drop it.
  // If a blocking UI is up, retain the pending scene until it becomes safe.
  if (pendingVictory && pendingVictory.elapsed >= 0.75 && gameState.P &&
      !gameState.ccOpen && !gameState.insideHouse && !gameState.dialogueOpen && !gameState.arsenalOpen) {
    const q = pendingVictory;
    if (playCutscene(q.id, { context: q.context })) { pendingVictory = null; return; }
    if (hasSeen(q.id)) pendingVictory = null;
  }
  scan += d0;
  if (scan > 0.3) {
    scan = 0;
    if (gameState.P && !gameState.ccOpen && !gameState.dialogueOpen && !gameState.arsenalOpen) {
      // Cutscene de chegada: primeira vez após fechar o criador.
      if (!hasSeen('arrival') && !gameState.insideHouse && gameState.N) {
        playCutscene('arrival'); return;
      }
      // Diário da Story Expansion: disparado uma única vez ao entrar na cabana.
      // Sem criar itens ou alterar as missões originais da 1.0.8.0.
      if (!hasSeen('diary') && insideCabin()) {
        playCutscene('diary'); return;
      }
      if (gameState.insideHouse) return;
      // Victory queues are handled above, without requiring this scan/UI branch.
      for (const t of BOSS_TRIGGERS) {
        if (hasSeen(t.scene)) continue;
        const e = gameState.ents.find(x => x.bossId === t.bossId && x.hp > 0);
        if (e && Math.hypot(e.x - gameState.P.x, e.z - gameState.P.z) < t.range) { if (playCutscene(t.scene)) return; }
      }
      // Side-story encounters. These only run once, after the previous
      // quest chapter; the standard cutscenes have priority on each scan.
      const P=gameState.P;
      const at=name=>gameState.LM.find(l=>l.n===name);
      const closeTo=(name,r=4.2)=>{const l=at(name);return !!l && Math.hypot(P.x-l.x,P.z-l.z)<r;};
      if (!hasSeen('yoki_memory') && Q.status('c1_espelho')==='done' && closeTo('Bosque das Memórias',4.0)) {
        if(playCutscene('yoki_memory'))return;
      }
      if (!hasSeen('yoki_ashes') && Q.status('yoki_marcacoes')==='active' && closeTo('Alto das Cinzas',5)) {
        if(playCutscene('yoki_ashes'))return;
      }
      if (!hasSeen('yoki_goal') && Q.status('yoki_gol_impossivel')==='active' && closeTo('Refúgio da Trilha Sul',4.1)) {
        if(playCutscene('yoki_goal'))return;
      }
      if (!hasSeen('yoki_troll_tip') && Q.status('c1_espelho')==='done' && !hasSeen('troll') &&
          gameState.ents.some(e=>e.bossId==='troll_ancient'&&e.hp>0&&Math.hypot(P.x-e.x,P.z-e.z)<10)) {
        if(playCutscene('yoki_troll_tip'))return;
      }
      // Novo encontro com Yoki quando a missão dos ratos já terminou.
      if (!hasSeen('yoki') && gameState.Y && Q.status('c1_ratos') === 'done' && Math.hypot(gameState.Y.x - gameState.P.x, gameState.Y.z - gameState.P.z) < 5.3) {
        if (playCutscene('yoki')) return;
      }
      // Ponte Velha: só durante a investigação do espelho, sem mudar quests.
      const bridge = gameState.LM.find(l => l.n === 'Ponte Velha');
      if (!hasSeen('bridge') && bridge && Q.status('c1_espelho') === 'active' && Math.hypot(bridge.x - gameState.P.x, bridge.z - gameState.P.z) < 4.7) {
        playCutscene('bridge');
      }
    }
  }
}

/** Aplica a pose cinematográfica (ou a transição de volta) a uma câmera, depois do posicionamento normal. */
export function cutsceneCameraPass(cam) {
  if (!cam) return;
  if (run) {
    try {
      if (!pose(run, P3)) return;
      const bossScene = def && ['orc','troll','orc_victory','troll_victory','yoki_after_orc'].includes(def.id);
      const position = bossScene ? clearBossView(P3.p, P3.l, gameState.OB || [], cinematicTerrainHeight) : P3.p;
      if (![...position, ...P3.l].every(Number.isFinite)) throw new Error('Pose de câmera cinematográfica inválida');
      cam.position.set(position[0], position[1], position[2]); cam.lookAt(P3.l[0], P3.l[1], P3.l[2]);
    } catch (error) {
      // Never strand players behind black bars when a cinematic fails.
      console.error('[HINÁRIA] Falha na câmera de cutscene, retornando ao jogo:', error);
      if (def) def.failed = true;
      try { finish(); } catch (cleanupError) {
        console.error('[HINÁRIA] Falha ao finalizar cutscene:', cleanupError);
        run = null; def = null; gameState.cutsceneActive = false;
        setCinematicBossMusic(null); setCinematicVictoryMusic(false);
        ui?.el.classList.remove('on','show');
      }
    }
  } else if (blend) {
    blend.t += lastDt / 0.9;
    if (blend.has && cam === gameState.camera) {
      const k = ease(blend.t);
      _v.copy(cam.position); cam.position.lerpVectors(blend.p, _v, k);
      _q.copy(cam.quaternion); cam.quaternion.copy(blend.q).slerp(_q, k);
    }
    if (blend.t >= 1) blend = null;
  }
}

/** Save only narrative unlocks, never camera/render objects or an active runner. */
export function cutsceneSnapshot() { return [...seen]; }
export function cancelCutscenes() {
 run=null;def=null;blend=null;pendingVictory=null;lastVictoryContext=null;scan=0;
 gameState.cutsceneActive=false;
 if(ui) {ui.el.classList.remove('show','on');ui.box.classList.remove('on');ui.title.classList.remove('on');ui.dark.classList.remove('on');}
 setCinematicBossMusic(null);setCinematicVictoryMusic(false);
}
export function restoreCutscenes(ids=[]) {
 cancelCutscenes();seen.clear();
 for(const id of ids) if(typeof id==='string' && SCENES[id]) seen.add(id);
}
