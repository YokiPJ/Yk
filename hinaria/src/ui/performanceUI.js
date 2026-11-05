/** Mobile renderer tuning. Changes only pixel ratio, not collision or world logic. */
import { gameState } from '../core/gameState.js';
import { deviceRenderProfile, budgetPixelRatio } from '../core/renderProfile.js';
import { setPaused } from '../core/gameFlow.js';
import { setVisualAtmosphereEnabled } from '../vfx/worldAtmosphereV3.js';
import { unlockGameAudio, setAudioEnabled, setAudioVolume, getAudioPreferences } from '../audio/gameAudio.js';
const KEY = 'hinaria-v79-quality';
let atmosphereEnabled = true;
let mode = 'auto', fpsVisible = false, fps = 0, acc = 0, frames = 0, poorWindows = 0, goodWindows = 0;
let adaptiveRatio = 1.0, installed = false, contextState = 'ready', measuredFlow = null;
let frameLimit='auto';
const deviceProfile=deviceRenderProfile();
// A bounded ring records actual rendered-frame intervals; snapshots sort at most 240 values.
const frameIntervals = new Float64Array(240);
let frameCursor = 0, frameCount = 0, measuredAt = null, contextNotice = null;
function resetFrameMeasurement() {
  acc = frames = frameCursor = frameCount = 0;
  fps = 0; measuredAt = null;
}
function frameStatistics() {
  if (!frameCount) return {samples:0,meanMs:null,p50Ms:null,p95Ms:null,maxMs:null};
  const sorted=Array.from(frameIntervals.subarray(0,frameCount)).sort((a,b)=>a-b);
  const round=n=>Math.round(n*100)/100;
  return {samples:frameCount,meanMs:round(sorted.reduce((sum,n)=>sum+n,0)/frameCount),
    p50Ms:round(sorted[Math.floor((frameCount-1)*.50)]),p95Ms:round(sorted[Math.floor((frameCount-1)*.95)]),maxMs:round(sorted[frameCount-1])};
}
function showContextNotice(restored) {
  if (!contextNotice) {
    contextNotice=document.createElement('section'); contextNotice.id='hinaria-context-notice';
    contextNotice.setAttribute('role','alert');
    contextNotice.style.cssText='position:fixed;inset:auto 12px max(18px,env(safe-area-inset-bottom)) 12px;z-index:180;max-width:520px;margin:auto;padding:16px;background:#171a20f7;border:1px solid #aeb1bd;border-radius:12px;color:#f6f3ee;font:14px/1.6 system-ui;box-shadow:0 15px 50px #000b';
    document.body.append(contextNotice);
  }
  contextNotice.replaceChildren();
  const text=document.createElement('p');text.textContent=restored?'Imagem recuperada. Sua aventura continua pausada.':'A renderização foi interrompida. A aventura está pausada enquanto a imagem é recuperada.';
  contextNotice.append(text);
  if (restored) {
    const resume=document.createElement('button');resume.type='button';resume.textContent='Retomar aventura';
    resume.style.cssText='min-height:44px;padding:8px 18px;background:#363b48;color:#fff;border:1px solid #aeb1bd;border-radius:6px';
    resume.addEventListener('click',()=>{window.HINARIA_UI_V1?.close?.();setPaused(false);contextNotice?.remove();contextNotice=null;});
    contextNotice.append(resume);resume.focus({preventScroll:true});
  }
}
function installContextMonitoring() {
  const canvas=gameState.renderer?.domElement;
  if (!canvas?.addEventListener) return;
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();contextState='lost';resetFrameMeasurement();setPaused(true);showContextNotice(false);
    window.dispatchEvent(new CustomEvent('hinaria:graphicscontext',{detail:{state:'lost'}}));
  });
  canvas.addEventListener('webglcontextrestored',()=>{
    contextState='restored';resetFrameMeasurement();applyGraphicsQuality();showContextNotice(true);
    window.dispatchEvent(new CustomEvent('hinaria:graphicscontext',{detail:{state:'restored'}}));
  });
}
let panel, fpsTag, qualitySelect, fpsSwitch, soundSwitch, volumeSlider;
const caps = { low: 0.72, medium: 1.0, high: 1.45 };
const isMobile = deviceProfile.mobile;
function loadSettings() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (['auto','low','medium','high'].includes(p.mode)) mode = p.mode;
    fpsVisible = p.fpsVisible === true;
    atmosphereEnabled = p.atmosphereEnabled !== false;
    if(['auto','30','60'].includes(p.frameLimit))frameLimit=p.frameLimit;
  } catch { /* local storage optional */ }
}
function saveSettings() { try { localStorage.setItem(KEY, JSON.stringify({ mode, fpsVisible, atmosphereEnabled,frameLimit })); } catch {} }
export function effectivePixelRatio() {
  const wrap=document.getElementById('wrap');
  return budgetPixelRatio(mode==='auto'?adaptiveRatio:caps[mode],wrap?.clientWidth||window.innerWidth||1,
    wrap?.clientHeight||window.innerHeight||1,window.devicePixelRatio||1,deviceProfile);
}
export function getFrameLimit(){return frameLimit==='auto'?deviceProfile.targetFPS:Number(frameLimit);}
export function changeFrameLimit(value){
  if(!['auto','30','60'].includes(value))return;
  frameLimit=value;poorWindows=goodWindows=0;resetFrameMeasurement();saveSettings();
}
export function applyGraphicsQuality() {
  const r = gameState.renderer;
  if (!r || contextState === 'lost') return;
  const next = effectivePixelRatio();
  if (Math.abs(r.getPixelRatio() - next) < 0.02) return;
  r.setPixelRatio(next);
  const wrap = document.getElementById('wrap');
  if (wrap?.clientWidth && wrap?.clientHeight) r.setSize(wrap.clientWidth, wrap.clientHeight, false);
}
export function changeGraphicsMode(value) {
  if (!['auto','low','medium','high'].includes(value)) return;
  mode = value;
  if (mode === 'auto') adaptiveRatio = deviceProfile.initialRatio;
  poorWindows = goodWindows = 0;
  saveSettings(); applyGraphicsQuality();
}
export function tickPerformance(dt) {
  // Frame-based metric, not an invented FPS counter. Ignore paused/hidden spikes.
  if (!(dt > 0) || !Number.isFinite(dt) || dt > 2 || document.hidden || contextState === 'lost') return;
  const flow=gameState.flow||'UNKNOWN';
  if (flow !== measuredFlow) { measuredFlow=flow;resetFrameMeasurement(); }
  frameIntervals[frameCursor]=dt*1000;
  frameCursor=(frameCursor+1)%frameIntervals.length; frameCount=Math.min(frameCount+1,frameIntervals.length);
  measuredAt=performance.now();
  acc += dt; frames++;
  if (acc < 1.25) return;
  fps = Math.round(frames / acc);
  frames = 0; acc = 0;
  if (fpsTag) { fpsTag.textContent = `${fps} FPS`; fpsTag.style.display = fpsVisible ? 'block' : 'none'; fpsTag.style.color = fps < 28 ? '#ff9586' : '#c6f0b0'; }
  // Menu rendering is cheaper than gameplay: never tune quality from a paused/title sample.
  if (mode !== 'auto' || measuredFlow !== 'PLAYING') return;
  // Require sustained FPS, avoiding resolution oscillation on a single bad frame.
  const target=getFrameLimit();
  if (fps < (target<=30?25:34)) { poorWindows++; goodWindows = 0; }
  else if (fps > (target<=30?28:54)) { goodWindows++; poorWindows = 0; }
  else { poorWindows = goodWindows = 0; }
  if (poorWindows >= 2) { adaptiveRatio = Math.max(0.65, adaptiveRatio - 0.14); poorWindows = 0; applyGraphicsQuality(); }
  if (goodWindows >= 7) { adaptiveRatio = Math.min(deviceProfile.maxRatio, adaptiveRatio + 0.08); goodWindows = 0; applyGraphicsQuality(); }
}
export function initPerformanceUI() {
  if (installed) return;
  installed = true;
  installContextMonitoring();
  loadSettings();
  adaptiveRatio = deviceProfile.initialRatio;
  applyGraphicsQuality();
  panel = document.getElementById('perf-panel');
  fpsTag = document.getElementById('fps-tag');
  qualitySelect = document.getElementById('perf-quality');
  fpsSwitch = document.getElementById('perf-fps');
  const atmosphereSwitch=document.getElementById('perf-atmosphere-v3');
  setVisualAtmosphereEnabled(atmosphereEnabled);
  if(atmosphereSwitch){atmosphereSwitch.checked=atmosphereEnabled;
    atmosphereSwitch.addEventListener('change',e=>{atmosphereEnabled=e.target.checked;setVisualAtmosphereEnabled(atmosphereEnabled);saveSettings();});}
  soundSwitch = document.getElementById('perf-sound');
  volumeSlider = document.getElementById('perf-volume');
  qualitySelect.value = mode;
  fpsSwitch.checked = fpsVisible;
  fpsTag.style.display = fpsVisible ? 'block' : 'none';
  const audio = getAudioPreferences();
  soundSwitch.checked = audio.enabled;
  volumeSlider.value = String(Math.round(audio.volume * 100));
  document.getElementById('perf-open').addEventListener('click', () => { unlockGameAudio(); panel.hidden = !panel.hidden; });
  document.getElementById('perf-close').addEventListener('click', () => { panel.hidden = true; });
  qualitySelect.addEventListener('change', e => changeGraphicsMode(e.target.value));
  const frameSelect=document.getElementById('perf-frame-limit');
  if(frameSelect){frameSelect.value=frameLimit;frameSelect.addEventListener('change',e=>changeFrameLimit(e.target.value));}
  fpsSwitch.addEventListener('change', e => { fpsVisible = e.target.checked; fpsTag.style.display = fpsVisible ? 'block' : 'none'; saveSettings(); });
  soundSwitch.addEventListener('change', e => { unlockGameAudio(); setAudioEnabled(e.target.checked); });
  volumeSlider.addEventListener('input', e => { unlockGameAudio(); setAudioVolume(Number(e.target.value) / 100); });
  document.addEventListener('pointerdown', unlockGameAudio, { once: true, passive: true });
  document.addEventListener('keydown', unlockGameAudio, { once: true });
  document.addEventListener('visibilitychange', () => { resetFrameMeasurement(); if (document.hidden) pauseMusic(); else resumeMusic(); });
}
import { pauseGameAudio as pauseMusic, resumeGameAudio as resumeMusic } from '../audio/gameAudio.js';
export function getGraphicsDiagnostics() {
  return {mode,fps,fpsVisible,pixelRatio:gameState.renderer?.getPixelRatio()||0,
    frameLimit:getFrameLimit(),deviceProfile,hud:window.HINARIA_HUD_PIXI?.diagnostics?.()||null,
    contextState,measuredFlow,frameTiming:frameStatistics(),
    sampleAgeMs:measuredAt===null?null:Math.max(0,Math.round(performance.now()-measuredAt))};
}
