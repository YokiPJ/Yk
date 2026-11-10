/** Authoritative screen lifecycle and serializable full-game save integration.
 * Dependencies with rendering/DOM side effects are injected once by main.js.
 */
import { gameState } from './gameState.js';
import { readSave, writeSave, getSaveInfo as readSaveInfo, validateSave } from './saveManager.js';

let services = {}, installed = false;
let newCharacterPending = false;
const el = id => globalThis.document?.getElementById(id);
const modes = new Set(['BOOT','TITLE','CHARACTER_CREATION','PLAYING','PAUSED','DIALOGUE','CUTSCENE','DEAD']);
const copy = value => JSON.parse(JSON.stringify(value));

export function resetGameplayInput() {
  gameState.keys = {};
  gameState.jx = gameState.jz = 0;
  gameState.jid = null;
  gameState.ptr = {};
  gameState.pd = null;
  gameState.pdist = 0;
  gameState.lastTime = globalThis.performance?.now() || 0;
  if (gameState.P) {
    gameState.P.path = [];
    gameState.P.vx = gameState.P.vz = gameState.P.spd = 0;
    gameState.P.greet = false;
  }
  globalThis.window?.dispatchEvent(new Event('hinaria:reset-input'));
}

export function transitionTo(mode) {
  if (!modes.has(mode)) throw new Error('Estado de jogo desconhecido: '+mode);
  const previous = gameState.flow;
  if (mode === previous) return mode;
  gameState.flow = mode;
  resetGameplayInput();
  if (globalThis.document?.body) document.body.dataset.gameFlow = mode.toLowerCase();
  const creator = el('ccw');
  if (creator) creator.style.display = mode === 'CHARACTER_CREATION' ? 'flex' : 'none';
  if (globalThis.window) window.dispatchEvent(new CustomEvent('hinaria:flowchange',{detail:{mode,previous}}));
  return mode;
}

function externalModalOpen() {
  return !!(gameState.arsenalOpen || el('qj')?.classList.contains('on') ||
    (el('hinaria-lore-codex') && !el('hinaria-lore-codex').hidden) ||
    (el('perf-panel') && !el('perf-panel').hidden) ||
    (el('ui1-menu') && !el('ui1-menu').hidden) || (el('upgrade-panel') && !el('upgrade-panel').hidden));
}

/** Called before any simulation, also detects legacy modal state changes. */
export function syncGameFlow() {
  if (gameState.flow === 'BOOT' || gameState.flow === 'TITLE') return gameState.flow;
  if (gameState.ccOpen) return transitionTo('CHARACTER_CREATION');
  if (globalThis.document?.hidden || gameState.pauseRequested || externalModalOpen()) return transitionTo('PAUSED');
  if (gameState.dialogueOpen) return transitionTo('DIALOGUE');
  if (gameState.cutsceneActive) return transitionTo('CUTSCENE');
  if (gameState.P?.hp <= 0) return transitionTo('DEAD');
  return transitionTo('PLAYING');
}

export function getFlowMode() { return gameState.flow; }

export function canAcceptGameplayInput() {
  return gameState.flow === 'PLAYING' && !gameState.pauseRequested && !gameState.ccOpen &&
    !gameState.dialogueOpen && !gameState.cutsceneActive && !externalModalOpen() && !globalThis.document?.hidden;
}

export function setPaused(paused) {
  gameState.pauseRequested = !!paused;
  resetGameplayInput();
  syncGameFlow();
  return {ok:true};
}

export function initGameFlow(dependencies = {}) {
  services = {...services,...dependencies};
  newCharacterPending = false;
  if (!installed) {
    installed = true;
    globalThis.document?.addEventListener('visibilitychange', () => {
      resetGameplayInput();
      if (document.hidden && gameState.flow !== 'TITLE' && gameState.flow !== 'BOOT') setPaused(true);
    });
    globalThis.window?.addEventListener('pagehide', resetGameplayInput);
    globalThis.window?.addEventListener('blur', () => {
      if (gameState.flow === 'PLAYING') setPaused(true);
    });
  }
  gameState.ccOpen = false;
  gameState.pauseRequested = false;
  transitionTo('TITLE');
  globalThis.window && (window.HINARIA_FLOW = {startNewGame,continueGame,saveGame,loadGame,returnToTitle,setPaused,getSaveInfo});
  return {ok:true};
}

function closeModals() {
  services.closeDialogue?.();
  services.closeArsenal?.();
  gameState.dialogueOpen = false;
  gameState.arsenalOpen = false;
  for (const id of ['ui1-menu','ui1-menu-backdrop','hinaria-lore-codex','perf-panel','upgrade-panel','upgrade-settings-shade']) {
    const node=el(id); if(node) node.hidden=true;
  }
  if(globalThis.document?.body)document.body.dataset.menuOpen='false';
  el('qj')?.classList.remove('on');
  el('ui-hud-menu-btn')?.setAttribute('aria-expanded','false');
}

function releaseDynamicMesh(mesh) {
  const geometries=new Set(),materials=new Set();
  mesh?.traverse?.(o=>{
    if(o.geometry)geometries.add(o.geometry);
    for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)materials.add(m);
  });
  for(const geometry of geometries)geometry.dispose?.();
  // Texture maps are shared by procedural model caches and stay owned there.
  for(const material of materials)material.dispose?.();
}
function clearTransient() {
  gameState.part2Director?.reset();
  services.leaveHouse?.();
  services.cancelCutscenes?.();
  services.clearVfx?.();
  resetGameplayInput();
  // Pattern reads belong to the current combat encounter, not another session.
  if (gameState.P) delete gameState.P.replayRead;
  for (const p of gameState.pr) if (p.m || p.mesh) {gameState.scene?.remove(p.m || p.mesh);releaseDynamicMesh(p.m || p.mesh);}
  for (const d of gameState.dead) if (d.m) {gameState.scene?.remove(d.m);releaseDynamicMesh(d.m);}
  for (const f of gameState.fl) (f.d || f.el)?.remove?.();
  gameState.pr=[]; gameState.dead=[]; gameState.fl=[]; gameState.hist=[];
  gameState.enemyRespawns=[]; gameState.tgt=null;
}

function clearEnemies() {
  for (const enemy of gameState.ents.filter(e=>e.kind==='m')) {
    gameState.scene?.remove(enemy.mesh); releaseDynamicMesh(enemy.mesh); enemy.tag?.remove();
  }
  gameState.ents=gameState.ents.filter(e=>e.kind!=='m');
}

function resetWorldProgress(world = {}) {
  const discovered=new Set(world.discovered || []), chests=new Set(world.chests || []);
  for (const l of gameState.LM) l.f=discovered.has(l.n)?1:0;
  for (const c of gameState.CH) {
    c.o=chests.has(`${c.x}:${c.z}`)?1:0;
    if(c.lid) c.lid.rotation.x=c.o?-1.2:0;
  }
  gameState.defeatedBosses=new Set(world.defeatedBosses || []);
  gameState.t=Number.isFinite(world.time)?world.time:0;
  gameState.lc=gameState.lz=gameState.zc=-1;
  gameState.mmDrawNeeded=true;
  services.restoreFog?.(world.fog || null);
}

function populateEnemies(world) {
  const zones=services.spawnZones || [];
  if (Array.isArray(world?.enemies)) {
    for (const saved of world.enemies) {
      const zone=zones[saved.zone];
      if(!zone || zone.k!==saved.k || (zone.bossId && gameState.defeatedBosses.has(zone.bossId))) continue;
      const e=services.spawnEnemy?.(saved.k,zone,{restoring:true});
      if(!e) continue;
      const pos=safePosition(saved.x,saved.z,{x:e.x,z:e.z});
      e.x=pos.x;e.z=pos.z;e.tx=Math.round(e.x);e.tz=Math.round(e.z);
      e.hp=Math.max(1,Math.min(e.max,saved.hp));
      e.mesh?.position.set(e.x,gameState.getHeightAt(e.x,e.z),e.z);
      if(e.mesh) e.mesh.rotation.y=Number(saved.rotation)||0;
    }
    gameState.enemyRespawns=(world.respawns || []).filter(r=>zones[r.zone] && zones[r.zone].k===r.kind)
      .map(r=>({kind:r.kind,zone:zones[r.zone],due:gameState.t+r.remaining}));
  } else {
    for (const zone of zones) for(let i=0;i<zone.n;i++) services.spawnEnemy?.(zone.k,zone);
  }
}

function safePosition(x,z,fallback={x:13,z:15}) {
  const valid=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&a>=.5&&b>=.5&&a<gameState.W-1&&b<gameState.W-1 &&
    !gameState.B[Math.round(a)]?.[Math.round(b)];
  if(valid(x,z)) return {x,z};
  const cx=Number.isFinite(x)?Math.round(x):13,cz=Number.isFinite(z)?Math.round(z):15;
  for(let r=1;r<10;r++) for(let dx=-r;dx<=r;dx++) for(let dz=-r;dz<=r;dz++) if(valid(cx+dx,cz+dz)) return {x:cx+dx,z:cz+dz};
  return fallback;
}

export function startNewGame() {
  if(!gameState.P || !services.classes) return {ok:false,error:'O mundo ainda está inicializando.'};
  closeModals(); clearTransient(); clearEnemies();
  const P=gameState.P,c=services.classes.kn;
  gameState.suspendLegacyPersistence=true;
  try {
    services.quests?.reset();
    resetWorldProgress();
    services.restoreLore?.([]);
    services.restoreCutscenes?.([]);
    Object.assign(P,{name:'Aventureiro',cls:'kn',sk:0,ar:0,x:13,z:15,tx:13,tz:15,hp:c.hp,max:c.hp,mana:c.mp,mm:c.mp,
      lv:1,xp:0,gold:0,cd:0,cds:[0,0,0,0],rc:0,rl:0,b:{},st:{},ownedWeapons:[],equippedWeapons:{},skillLevels:{},
      at:0,fl:0,kc:'',rk:0,reg:0,axeAwakeUntil:0,axeAwakeCooldown:0,axeProcNext:0});
    delete P._hinariaDeathProcessed;
    services.ensureArsenal?.(P);
    services.applyAppearance?.(P);
    populateEnemies();
    gameState.yaw=0;gameState.zoom=1;gameState.Z=1;
    gameState.L?.set(P.x,gameState.getHeightAt(P.x,P.z),P.z);
    services.updateHUD?.();services.updateSkillUI?.();services.refreshQuestUI?.();services.resetQuestIntro?.();
    gameState.sessionStarted=true;gameState.ccOpen=true;gameState.pauseRequested=false;
    newCharacterPending=true;
    services.buildCharacterCreatorUI?.();
    transitionTo('CHARACTER_CREATION');
    return {ok:true};
  } catch(error) { newCharacterPending=false; return {ok:false,error:'Não foi possível iniciar: '+error.message}; }
  finally { gameState.suspendLegacyPersistence=false; }
}

export function finishCharacterCreation() {
  if(!gameState.P || !gameState.sessionStarted) return {ok:false,error:'Inicie uma sessão antes de jogar.'};
  if(newCharacterPending){gameState.P.hp=gameState.P.max;gameState.P.mana=gameState.P.mm;newCharacterPending=false;}
  gameState.ccOpen=false;gameState.pauseRequested=false;gameState.sessionStarted=true;
  transitionTo('PLAYING');
  return {ok:true};
}

export function createSaveSnapshot() {
  const P=gameState.P;
  const fields=['cls','sk','ar','x','z','hp','max','mana','mm','lv','xp','gold','rl','rc','cd','cds','b','st','ownedWeapons','equippedWeapons','skillLevels'];
  const player={};
  for (const key of fields) if(P[key]!==undefined) player[key]=copy(P[key]);
  player.cd=Math.max(0,Number(player.cd)||0);
  player.rc=Math.max(0,Number(player.rc)||0);
  player.rotation=Number(P.mesh?.rotation.y)||0;
  player.cameraYaw=Number(gameState.yaw)||0;
  player.axeAwakeRemaining=Math.max(0,(P.axeAwakeUntil||0)-gameState.t);
  player.axeCooldownRemaining=Math.max(0,(P.axeAwakeCooldown||0)-gameState.t);
  player.axeProcRemaining=Math.max(0,(P.axeProcNext||0)-gameState.t);
  const zones=services.spawnZones || [];
  return {
    schemaVersion:1,timestamp:new Date().toISOString(),identity:{name:(P.name||'Aventureiro').slice(0,80)},player,
    quests:JSON.parse(services.quests.serialize()),lore:services.loreSnapshot?.()||[],cutscenes:services.cutsceneSnapshot?.()||[],
    world:{time:gameState.t,seed:gameState.worldSeed||11,generationVersion:gameState.worldGenerationVersion||2,
      discovered:gameState.LM.filter(l=>l.f).map(l=>l.n),chests:gameState.CH.filter(c=>c.o).map(c=>`${c.x}:${c.z}`),
      defeatedBosses:[...gameState.defeatedBosses],fog:services.snapshotFog?.() || [],
      enemies:gameState.ents.filter(e=>e.kind==='m'&&e.hp>0).map(e=>({k:e.k,x:e.x,z:e.z,hp:e.hp,max:e.max,bossId:e.bossId,zone:zones.indexOf(e.zd),rotation:Number(e.mesh?.rotation.y)||0})).filter(e=>e.zone>=0),
      respawns:gameState.enemyRespawns.map(r=>({kind:r.kind,zone:zones.indexOf(r.zone),remaining:Math.max(0,r.due-gameState.t)})).filter(r=>r.zone>=0)},
    house:services.houseSnapshot?.() || null,
    settings:{keys:['hinaria-v79-quality','hinaria.v110.combat_v2_enabled','hinaria-v79-music','hinaria.ui.accessibility.v1']}
  };
}

export function saveGame() {
  if(!gameState.sessionStarted || !gameState.P || gameState.ccOpen) return {ok:false,error:'Crie seu personagem antes de salvar.'};
  if(gameState.cutsceneActive || gameState.dialogueOpen) return {ok:false,error:'Conclua o diálogo ou a cena antes de salvar.'};
  try {
    const result=writeSave(createSaveSnapshot());
    if(result.ok) globalThis.window?.dispatchEvent(new Event('hinaria:savechange'));
    return result;
  } catch(error) { return {ok:false,error:'Falha ao salvar: '+error.message}; }
}

export function getSaveInfo() { return readSaveInfo(); }

export function applySaveSnapshot(data) {
  const checked=validateSave(data);
  if(!checked.ok) return checked;
  data=checked.data;
  if(!gameState.P || !services.classes) return {ok:false,error:'O mundo ainda está inicializando.'};
  if(data.world.seed!==undefined&&data.world.seed!==(gameState.worldSeed||11))
    return {ok:false,error:'Este save usa outra semente de mundo. Reabra o jogo para preparar o mapa correto.'};
  // Reject unknown quest definitions/steps through the real quest engine before touching the scene.
  const before=services.quests.serialize();
  gameState.suspendLegacyPersistence=true;
  try {
    if(!services.quests.restore(JSON.stringify(data.quests))) return {ok:false,error:'Progresso de missões inválido.'};
    closeModals();clearTransient();clearEnemies();resetWorldProgress(data.world);
    const P=gameState.P,saved=data.player,c=services.classes[saved.cls];
    const pos=safePosition(saved.x,saved.z);
    // Older snapshots may omit optional fields; never inherit another session's
    // powers, equipment, effects or cooldowns when restoring them.
    Object.assign(P,{rl:0,rc:0,cd:0,cds:[0,0,0,0],b:{},st:{},ownedWeapons:[],equippedWeapons:{},skillLevels:{},reg:0,stp:0});
    const fields=['cls','lv','xp','gold','rl','rc','cd','cds','b','st','ownedWeapons','equippedWeapons','skillLevels'];
    for(const key of fields) if(saved[key]!==undefined) P[key]=copy(saved[key]);
    P.name=data.identity.name;
    P.sk=Math.max(0,Math.min((services.skinCount||1)-1,saved.sk|0));
    P.ar=Math.max(0,Math.min((services.armorCount||1)-1,saved.ar|0));
    P.max=c.hp+(P.lv-1)*c.up;P.mm=c.mp+(P.lv-1)*c.mu;
    P.hp=Math.max(1,Math.min(P.max,saved.hp));P.mana=Math.max(0,Math.min(P.mm,saved.mana));
    P.x=pos.x;P.z=pos.z;P.tx=Math.round(P.x);P.tz=Math.round(P.z);
    P.b=P.b||{};P.st=P.st||{};P.cds=P.cds||[0,0,0,0];P.at=0;P.fl=0;P.kc='';P.rk=-1;
    P.axeAwakeUntil=gameState.t+(saved.axeAwakeRemaining||0);
    P.axeAwakeCooldown=gameState.t+(saved.axeCooldownRemaining||0);
    P.axeProcNext=gameState.t+(saved.axeProcRemaining||0);
    delete P._hinariaDeathProcessed;
    services.ensureArsenal?.(P);services.applyAppearance?.(P);
    if(P.mesh) P.mesh.rotation.y=Number(saved.rotation)||0;
    gameState.L?.set(P.x,gameState.getHeightAt(P.x,P.z),P.z);
    gameState.yaw=Number(saved.cameraYaw)||0;gameState.Z=0;
    services.restoreLore?.(data.lore||[]);services.restoreCutscenes?.(data.cutscenes||[]);
    populateEnemies(data.world);
    services.updateHUD?.();services.updateSkillUI?.();services.refreshQuestUI?.();
    gameState.ccOpen=false;gameState.pauseRequested=false;gameState.sessionStarted=true;newCharacterPending=false;
    transitionTo('PLAYING');
    if(data.house) services.restoreHouse?.(data.house);
    return {ok:true};
  } catch(error) {
    services.quests.restore(before);
    setPaused(true);
    return {ok:false,error:'Falha ao restaurar: '+error.message};
  } finally { gameState.suspendLegacyPersistence=false; }
}

export function loadGame() {
  const result=readSave();
  return result.ok?applySaveSnapshot(result.data):result;
}
export function continueGame() { return loadGame(); }

export function returnToTitle() {
  closeModals();services.leaveHouse?.();services.cancelCutscenes?.();
  gameState.ccOpen=false;gameState.pauseRequested=false;newCharacterPending=false;
  transitionTo('TITLE');
  return {ok:true};
}
