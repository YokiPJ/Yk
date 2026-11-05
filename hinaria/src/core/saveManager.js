/** Versioned full-game persistence. This module deliberately has no engine/DOM dependencies. */
export const SAVE_KEY = 'hinaria.fullgame.v1';
export const BACKUP_KEY = `${SAVE_KEY}.backup`;
export const SCHEMA_VERSION = 1;
const MAX_BYTES = 2 * 1024 * 1024;
const CLASSES = Object.freeze({kn:'Cavaleiro',pa:'Paladino',so:'Feiticeiro',dr:'Druida',yo:'Yoki'});
const ENEMY_KINDS = new Set(['rat','bandit','skeleton','troll','orc']);
const BOSS_IDS = new Set(['troll_ancient','orc_king']);
const dangerous = new Set(['__proto__', 'prototype', 'constructor']);
const own = (value, name) => Object.prototype.hasOwnProperty.call(value, name);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const number = (value, min = 0, max = 1e12) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const integer = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) && value >= min && value <= max;
const text = (value, max = 160) => typeof value === 'string' && value.length > 0 && value.length <= max;
const strings = (value, max = 10000) => Array.isArray(value) && value.length <= max && value.every(item => text(item));
const fail = error => ({ok:false,error});

// Reject exotic objects, cycles, non-JSON values and prototype keys before copying.
function checkJSON(root) {
  const seen = new WeakSet();
  let nodes = 0;
  function visit(value, depth) {
    if (++nodes > 50000 || depth > 14) throw new Error('Save excede os limites de estrutura.');
    if (value === null || typeof value === 'boolean') return;
    if (typeof value === 'string') {
      if (value.length > 16384) throw new Error('Texto do save excede o limite.');
      return;
    }
    if (typeof value === 'number' && Number.isFinite(value)) return;
    if (typeof value !== 'object' || (!Array.isArray(value) && !record(value))) throw new Error('Save contém dados não serializáveis.');
    if (seen.has(value)) throw new Error('Save contém referências circulares.');
    seen.add(value);
    if (Array.isArray(value) && value.length > 10000) throw new Error('Lista do save excede o limite.');
    for (const key of Object.keys(value)) {
      if (dangerous.has(key)) throw new Error('Save contém uma chave inválida.');
      visit(value[key], depth + 1);
    }
    seen.delete(value);
  }
  visit(root, 0);
}

/** Validate, detach and normalize data before a caller changes the running world. */
export function validateSave(value) {
  try {
    checkJSON(value);
    if (!record(value)) return fail('Formato de save inválido.');
    if (value.schemaVersion !== SCHEMA_VERSION) return fail('Versão de save incompatível.');
    if (!text(value.timestamp, 40) || !Number.isFinite(Date.parse(value.timestamp))) return fail('Data do save inválida.');
    if (!record(value.identity) || !text(value.identity.name, 80)) return fail('Identidade do personagem inválida.');
    const p = value.player;
    if (!record(p) || !own(CLASSES, p.cls)) return fail('Classe do personagem inválida.');
    if (!number(p.x, 0, 95.999999) || !number(p.z, 0, 95.999999)) return fail('Posição do personagem fora do mundo.');
    if (!number(p.max, 1) || !number(p.hp, 0, p.max) || !number(p.mm) || !number(p.mana, 0, p.mm)) return fail('Vida ou mana inválida.');
    if (!integer(p.lv, 1, 10000) || !integer(p.xp) || !integer(p.gold)) return fail('Progressão do personagem inválida.');
    for (const key of ['sk','ar']) if (own(p,key) && !integer(p[key],0,32)) return fail('Aparência do personagem inválida.');
    if ((own(p,'cameraYaw') && !number(p.cameraYaw,-1e9,1e9)) || (own(p,'rotation') && !number(p.rotation,-1e9,1e9))) return fail('Orientação do personagem inválida.');
    if (own(p,'need') && !number(p.need,1)) return fail('Experiência necessária inválida.');
    if (own(p,'cds') && (!Array.isArray(p.cds) || p.cds.length !== 4 || !p.cds.every(v=>number(v)))) return fail('Recargas inválidas.');
    for (const key of ['rc','cd','reg','axeAwakeUntil','axeAwakeCooldown','axeProcNext','axeAwakeRemaining','axeCooldownRemaining']) {
      if (own(p,key) && !number(p[key])) return fail('Temporizador do personagem inválido.');
    }
    if (own(p,'ownedWeapons') && !strings(p.ownedWeapons,512)) return fail('Arsenal inválido.');
    if (own(p,'equippedWeapons') && (!record(p.equippedWeapons) || Object.entries(p.equippedWeapons).some(([cls,id])=>!own(CLASSES,cls)||!text(id)))) return fail('Equipamento inválido.');
    if (own(p,'skillLevels') && (!record(p.skillLevels) || Object.entries(p.skillLevels).some(([cls,levels])=>!own(CLASSES,cls)||!Array.isArray(levels)||levels.length!==4||!levels.every(v=>integer(v,0,3))))) return fail('Habilidades inválidas.');
    for (const key of ['b','st']) if (own(p,key) && (!record(p[key]) || !Object.values(p[key]).every(v=>number(v)))) return fail('Efeitos do personagem inválidos.');
    const w = value.world;
    if (!record(w) || !strings(w.discovered) || !strings(w.chests) || !strings(w.defeatedBosses,16)) return fail('Exploração do mundo inválida.');
    if (w.defeatedBosses.some(id=>!BOSS_IDS.has(id))) return fail('Progresso de chefes inválido.');
    if (own(w,'fog') && (!Array.isArray(w.fog) || (w.fog.length!==0 && w.fog.length!==9216) || !w.fog.every(v=>integer(v,0,255)))) return fail('Mapa explorado inválido.');
    if (own(w,'time') && !number(w.time)) return fail('Tempo do mundo inválido.');
    if (own(w,'enemies')) {
      if (!Array.isArray(w.enemies) || w.enemies.length>300) return fail('Inimigos do mundo inválidos.');
      for (const enemy of w.enemies) {
        if (!record(enemy) || !ENEMY_KINDS.has(enemy.k) || !number(enemy.x,0,95.999999) || !number(enemy.z,0,95.999999)
          || !number(enemy.max,1) || !number(enemy.hp,0,enemy.max) || !integer(enemy.zone,0,255)
          || (enemy.bossId !== null && !BOSS_IDS.has(enemy.bossId)) || !number(enemy.rotation,-1e9,1e9)) return fail('Estado de inimigo inválido.');
      }
    }
    if (own(w,'respawns')) {
      if (!Array.isArray(w.respawns) || w.respawns.length>300 || w.respawns.some(r=>!record(r)||!ENEMY_KINDS.has(r.kind)||!integer(r.zone,0,255)||!number(r.remaining))) return fail('Renascimento de inimigo inválido.');
    }
    const q = value.quests;
    if (!record(q) || q.v !== 1 || !record(q.q) || !record(q.items) || !record(q.flags)) return fail('Missões inválidas.');
    for (const state of Object.values(q.q)) {
      if (!record(state) || !['active','done'].includes(state.s) || !integer(state.step,0,1000) || !integer(state.n,0,1e9)) return fail('Etapa de missão inválida.');
    }
    if (own(value,'lore') && !strings(value.lore,256)) return fail('Crônicas inválidas.');
    if (own(value,'cutscenes') && !strings(value.cutscenes,256)) return fail('Cenas vistas inválidas.');
    if (own(value,'house') && value.house !== null) {
      const h=value.house;
      if(!record(h) || !number(h.x,0,95.999999) || !number(h.z,0,95.999999) ||
        !number(h.px,-2.65,2.65) || !number(h.pz,-2.4,2.4) || !number(h.heading,-1e9,1e9)) return fail('Interior da casa inválido.');
    }
    if (own(value,'settings') && !record(value.settings)) return fail('Referências de configuração inválidas.');
    const json = JSON.stringify(value);
    if (json.length > MAX_BYTES) return fail('Save excede o limite de armazenamento.');
    return {ok:true,data:JSON.parse(json)};
  } catch (error) { return fail(error instanceof Error ? error.message : 'Save inválido.'); }
}

function parseSave(raw) {
  if (typeof raw !== 'string' || !raw) return fail('Nenhum save completo disponível.');
  if (raw.length > MAX_BYTES) return fail('Save excede o limite de armazenamento.');
  try { return validateSave(JSON.parse(raw)); }
  catch { return fail('Save corrompido: JSON inválido.'); }
}
function getStorage(storage) {
  const target = storage === undefined ? globalThis.localStorage : storage;
  if (!target || typeof target.getItem !== 'function' || typeof target.setItem !== 'function') throw new Error('Armazenamento local indisponível.');
  return target;
}

/** A corrupt primary is recoverable only if its backup independently validates. */
export function readSave(storage) {
  try {
    const target = getStorage(storage);
    const primary = parseSave(target.getItem(SAVE_KEY));
    if (primary.ok) return {...primary,source:'primary'};
    const backup = parseSave(target.getItem(BACKUP_KEY));
    if (backup.ok) return {...backup,source:'backup',warning:primary.error};
    return primary;
  } catch { return fail('Não foi possível acessar o armazenamento local.'); }
}

/** Keep the previous valid full save without touching any legacy keys. */
export function writeSave(value, storage) {
  const checked = validateSave(value);
  if (!checked.ok) return checked;
  try {
    const target = getStorage(storage);
    const previousRaw = target.getItem(SAVE_KEY);
    if (parseSave(previousRaw).ok) target.setItem(BACKUP_KEY,previousRaw);
    target.setItem(SAVE_KEY,JSON.stringify(checked.data));
    return {ok:true,data:checked.data};
  } catch { return fail('Não foi possível salvar: verifique o espaço e a permissão do armazenamento local.'); }
}

export function getSaveInfo(storage) {
  const result = readSave(storage);
  if (!result.ok) return {valid:false,error:result.error};
  return {valid:true,timestamp:result.data.timestamp,identity:result.data.identity,
    className:CLASSES[result.data.player.cls],level:result.data.player.lv,
    source:result.source,...(result.warning?{warning:result.warning}:{})};
}
