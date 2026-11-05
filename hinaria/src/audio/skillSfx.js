/**
 * HINARIA 1.0.8.0 — SFX V2 for 16 abilities.
 * Keeps original WAV assets local to the project and obeys game audio prefs.
 */
import { getAudioPreferences } from './gameAudio.js';

const CLASS_IDS = new Set(['kn','pa','so','dr']);
const MAX_VOICES = 8;
const cached = new Map();
const loading = new Map();
const voices = new Set();
let context = null;
let unavailable = false;
let warming = false;

const SFX_META = Object.freeze({
  kn_0:{gain:.78, detune:28}, kn_1:{gain:.92, detune:12}, kn_2:{gain:.66, detune:10}, kn_3:{gain:1.00, detune:8},
  pa_0:{gain:.72, detune:24}, pa_1:{gain:.84, detune:18}, pa_2:{gain:.70, detune:30}, pa_3:{gain:.90, detune:14},
  so_0:{gain:.84, detune:26}, so_1:{gain:1.00, detune:10}, so_2:{gain:.78, detune:22}, so_3:{gain:1.00, detune:8},
  dr_0:{gain:.72, detune:24}, dr_1:{gain:.66, detune:18}, dr_2:{gain:.86, detune:16}, dr_3:{gain:.76, detune:20}
});

function createContext() {
  if (unavailable) return null;
  if (context) return context;
  const AudioCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioCtor) { unavailable = true; return null; }
  try { context = new AudioCtor({ latencyHint:'interactive' }); }
  catch { unavailable = true; return null; }
  return context;
}
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function loadSound(key) {
  if (cached.has(key)) return Promise.resolve(cached.get(key));
  if (loading.has(key)) return loading.get(key);
  const ctx = createContext();
  if (!ctx) return Promise.resolve(null);
  const url = new URL(`../../assets/audio/sfx/${key}.wav`, import.meta.url);
  const task = fetch(url)
    .then(response => {
      if (!response.ok) throw new Error(`SFX HTTP ${response.status}: ${key}`);
      return response.arrayBuffer();
    })
    .then(buffer => ctx.decodeAudioData(buffer))
    .then(decoded => {
      cached.set(key, decoded);
      return decoded;
    })
    .catch(err => {
      console.warn('[HINARIA SFX V2] Falha ao carregar', key, err);
      return null;
    })
    .finally(() => loading.delete(key));
  loading.set(key, task);
  return task;
}
function output(key, buffer) {
  const prefs = getAudioPreferences();
  if (!prefs.enabled || !(prefs.volume > 0) || !context || !buffer) return false;
  const meta = SFX_META[key] || {gain:.8, detune:18};
  try {
    if (voices.size >= MAX_VOICES) {
      const oldest = voices.values().next().value;
      oldest?.stop?.(0);
      voices.delete(oldest);
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.detune.value = (Math.random() * 2 - 1) * meta.detune;

    const gain = context.createGain();
    gain.gain.value = clamp((prefs.volume * .56) * meta.gain, 0, .62);

    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = key.startsWith('so_') || key.startsWith('kn_3') ? 7800 : 9800;
    filter.Q.value = .4;

    source.connect(filter).connect(gain).connect(context.destination);
    voices.add(source);
    source.onended = () => {
      voices.delete(source);
      try { source.disconnect(); filter.disconnect(); gain.disconnect(); } catch {}
    };
    source.start(0);
    return true;
  } catch (err) {
    console.warn('[HINARIA SFX V2] Playback indisponivel', err);
    return false;
  }
}
export function warmupSkillSfx() {
  const ctx = createContext();
  if (!ctx) return;
  ctx.resume().catch(() => {});
  if (warming) return;
  warming = true;
  for (const cls of CLASS_IDS) for (let i=0;i<4;i++) loadSound(`${cls}_${i}`);
}
export function playSkillSfx(cls, index) {
  if (!CLASS_IDS.has(cls) || !Number.isInteger(index) || index < 0 || index > 3) return false;
  const prefs = getAudioPreferences();
  if (!prefs.enabled || !(prefs.volume > 0)) return false;
  const ctx = createContext();
  if (!ctx) return false;
  ctx.resume().catch(() => {});
  const key = `${cls}_${index}`;
  const sound = cached.get(key);
  if (sound) return output(key, sound);
  const started = Date.now();
  loadSound(key).then(buffer => {
    if (buffer && Date.now() - started < 900 && context?.state === 'running') output(key, buffer);
  });
  return true;
}
export function getSkillSfxDiagnostics() {
  return {
    loaded: cached.size,
    activeVoices: voices.size,
    available: !unavailable,
    contextState: context?.state || 'not-created',
    version: 'v2'
  };
}
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', warmupSkillSfx, {once:true, passive:true});
  document.addEventListener('keydown', warmupSkillSfx, {once:true});
}
