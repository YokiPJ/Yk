/** HINÁRIA — música em loop, alternância ambiente/boss e retorno seguro após pausa.
 * Todas as trilhas são locais ao APK. O catálogo CC0 é opcional: sem instalação,
 * ambos os chefes usam a trilha de boss original já distribuída com a HINÁRIA.
 * A reprodução começa somente após interação do jogador (restrição Android/Chrome).
 */
import { BOSS_MUSIC_FILES } from './bossTrackConfig.js';

const KEY = 'hinaria-v79-music'; // Preservar configurações de usuários antigos.
function readPrefs() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
const prefs = readPrefs();
let enabled = prefs.enabled !== false;
let volume = Number.isFinite(prefs.volume) ? Math.max(0, Math.min(1, prefs.volume)) : 0.35;
let unlocked = false;
let suspended = false;
let activeBoss = false;
let activeBossId = null;
let cinematicBossId = null;
let cinematicVictory = false;
let victoryFinished = false;
let desiredTrack = 'ambient';
let lastState = null;
const rejected = new Set();
const pending = new Set();
const tracks = new Map();
const files = {
  ambient: 'assets/audio/ambiente-v79.mp3',
  boss_default: 'assets/audio/boss-original-v79.mp3',
  victory: 'assets/audio/victory.mp3',
};
if (BOSS_MUSIC_FILES.troll_ancient) files.boss_troll = BOSS_MUSIC_FILES.troll_ancient;
if (BOSS_MUSIC_FILES.orc_king) files.boss_orc = BOSS_MUSIC_FILES.orc_king;

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify({ enabled, volume })); } catch { /* optional */ }
}
function isPageHidden() { return typeof document !== 'undefined' && document.hidden === true; }
function canPlay() { return unlocked && enabled && !suspended && !isPageHidden(); }
function tryPlay(key) {
  const audio = tracks.get(key);
  if (!audio || !canPlay() || rejected.has(key) || pending.has(key) || !audio.paused) return;
  try {
    const result = audio.play();
    if (result?.then) {
      pending.add(key);
      result.then(() => pending.delete(key), () => {
        pending.delete(key);
        rejected.add(key); // Don't spam rejected play() promises every frame.
      });
    }
  } catch { rejected.add(key); }
}
function resetTrack(key) {
  const a = tracks.get(key);
  if (!a) return;
  a.pause();
  a.volume = 0;
  try { a.currentTime = 0; } catch { /* stream may not be ready */ }
}
function handleTrackError(key) {
  // Optional CC0 track fails (e.g. missing file)? Use the bundled boss soundtrack.
  rejected.add(key);
  if (desiredTrack === key && key !== 'boss_default' && key !== 'ambient') {
    if (key === 'victory') victoryFinished = true;
    desiredTrack = key === 'victory' ? 'ambient' : 'boss_default';
    tryPlay(desiredTrack);
  }
}
for (const [key, path] of Object.entries(files)) {
  const a = new Audio(path);
  a.loop = key !== 'victory';
  a.preload = 'none';
  a.volume = 0;
  a.addEventListener('ended', () => {
    if (key === 'victory') {
      // The uploaded Victory.mp3 is a short jingle; play it once per cutscene.
      victoryFinished = true;
      if (lastState) updateGameAudio(lastState);
      return;
    }
    // WebViews should honor .loop, but some audio backends fire ended anyway.
    if (canPlay() && desiredTrack === key) {
      try { a.currentTime = 0; } catch {}
      tryPlay(key);
    }
  });
  a.addEventListener('error', () => handleTrackError(key));
  tracks.set(key, a);
}

/** Força música de boss durante introduções e epílogos, mesmo após sua morte. */
export function setCinematicBossMusic(bossId = null) {
  cinematicBossId = bossId || null;
  if (lastState) updateGameAudio(lastState);
}
/** Dedicated one-shot victory cue overrides boss music only during boss victory scenes. */
export function setCinematicVictoryMusic(active = false) {
  const next = Boolean(active);
  if (next && !cinematicVictory) {
    victoryFinished = false;
    const a = tracks.get('victory');
    if (a) { a.pause(); try { a.currentTime = 0; } catch {} }
  }
  cinematicVictory = next;
  if (lastState) updateGameAudio(lastState);
}
function targetTrack(bossId) {
  if (!bossId) return 'ambient';
  if (bossId === 'troll_ancient' && tracks.has('boss_troll') && !rejected.has('boss_troll')) return 'boss_troll';
  if (bossId === 'orc_king' && tracks.has('boss_orc') && !rejected.has('boss_orc')) return 'boss_orc';
  return 'boss_default';
}
function findNearbyBoss(state) {
  if (!state || state.insideHouse || !state.P || !Array.isArray(state.ents)) return null;
  let closest = null, closestDistance = Infinity;
  for (const e of state.ents) {
    if (!e?.isBoss || !(e.hp > 0)) continue;
    const d = Math.hypot((e.x || 0) - state.P.x, (e.z || 0) - state.P.z);
    // Hysteresis prevents constant switching at the edge of the encounter.
    const radius = e.bossId === activeBossId ? 15 : 12;
    if (d < radius && d < closestDistance) { closest = e; closestDistance = d; }
  }
  return closest;
}
function changeDesired(key) {
  if (key === desiredTrack) return;
  desiredTrack = key;
  // Start each separate encounter from the beginning; continuous looping occurs within it.
  const a = tracks.get(key);
  if (a?.paused) { try { a.currentTime = 0; } catch {} }
  tryPlay(key);
}
function updateVolumes() {
  if (!canPlay()) return;
  for (const [key, a] of tracks) {
    const target = key === desiredTrack ? volume * (key === 'ambient' ? 0.48 : 0.65) : 0;
    if (target > 0) tryPlay(key);
    // Crossfade only at transitions; don't mix ambient under boss indefinitely.
    a.volume = Math.min(1, Math.max(0, a.volume + (target - a.volume) * 0.065));
    if (target === 0 && a.volume < 0.008) {
      a.volume = 0;
      if (!a.paused) a.pause();
    }
  }
}
export function unlockGameAudio() {
  // Called only from input. HTMLAudio and WebAudio cannot autoplay in Android WebView.
  unlocked = true;
  rejected.clear();
  if (!canPlay()) return;
  tryPlay(desiredTrack);
  if (lastState) updateGameAudio(lastState);
}
export function getAudioPreferences() { return { enabled, volume }; }
export function setAudioEnabled(value) {
  enabled = Boolean(value);
  persist();
  if (!enabled) {
    for (const a of tracks.values()) a.pause();
  } else if (canPlay()) {
    tryPlay(desiredTrack);
  }
}
export function setAudioVolume(value) {
  volume = Math.max(0, Math.min(1, Number(value) || 0));
  persist();
}
export function updateGameAudio(state) {
  lastState = state;
  if (!state?.P) return;
  const boss = findNearbyBoss(state);
  activeBoss = Boolean(boss);
  activeBossId = boss?.bossId || null;
  const selected = cinematicVictory
    ? (victoryFinished ? 'ambient' : 'victory')
    : targetTrack(cinematicBossId || activeBossId || (activeBoss ? 'unknown_boss' : null));
  changeDesired(selected);
  updateVolumes();
}
export function pauseGameAudio() {
  suspended = true;
  for (const a of tracks.values()) a.pause();
}
export function resumeGameAudio() {
  suspended = false;
  if (canPlay()) tryPlay(desiredTrack);
}
export function getAudioDiagnostics() {
  return { enabled, volume, unlocked, suspended, activeBoss, activeBossId, cinematicBossId,
    desiredTrack, cinematicVictory, victoryFinished, sources: Object.fromEntries(Object.entries(files)),
    playing: [...tracks.entries()].filter(([, a]) => !a.paused).map(([key]) => key) };
}
