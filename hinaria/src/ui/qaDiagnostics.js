/** Runtime QA HUD. F3 toggles, diagnostics download contains no account identifiers. */
import { gameState } from '../core/gameState.js';
import { getGraphicsDiagnostics } from './performanceUI.js';
import { getAudioDiagnostics } from '../audio/gameAudio.js';
import { activeCutsceneId } from '../cutscene/cutsceneSystem.js';
let panel=null,body=null,shown=false,elapsed=0,sampleElapsed=0,lastError=null,errors=[];
const samples=[];
const HISTORY_LIMIT=120;
const finite=value=>Number.isFinite(value)?value:null;
const rounded=value=>Number.isFinite(value)?Math.round(value*100)/100:null;
function deviceSnapshot(){
  const nav=globalThis.navigator,win=globalThis.window;
  let webgl=null;
  try {
    const gl=gameState.renderer?.getContext?.();
    if(gl&&!gl.isContextLost())webgl={version:gl.getParameter(gl.VERSION),renderer:gl.getParameter(gl.RENDERER)};
  } catch { /* Context loss and unavailable GL metadata are valid diagnostic states. */ }
  return {platform:nav?.userAgentData?.platform||nav?.platform||null,userAgent:nav?.userAgent||null,
    touchPoints:nav?.maxTouchPoints||0,logicalCores:nav?.hardwareConcurrency||null,
    viewport:win?[win.innerWidth,win.innerHeight]:null,devicePixelRatio:win?.devicePixelRatio||1,webgl};
}
function heapSnapshot(){
  const memory=globalThis.performance?.memory;
  return memory?{usedBytes:finite(memory.usedJSHeapSize),allocatedBytes:finite(memory.totalJSHeapSize),limitBytes:finite(memory.jsHeapSizeLimit)}:null;
}
function record(message){
  lastError=String(message||'Erro desconhecido').slice(0,500);
  errors.push(lastError);if(errors.length>12)errors.shift();
}
function snapshot(){
  const r=gameState.renderer,info=r?.info,P=gameState.P;
  const sceneMeshes=gameState.scene?.children?.length||0;
  const audio=getAudioDiagnostics(),graphics=getGraphicsDiagnostics();
  return {
    version:'1.3.0-beta.1-QA',worldSize:gameState.W,flow:gameState.flow||null,
    worldGeneration:{seed:gameState.worldSeed??null,version:gameState.worldGenerationVersion??null,diagnostics:gameState.worldGenerationDiagnostics??null},
    mapPosition:P?[rounded(P.x),rounded(P.mesh?.position?.y),rounded(P.z)]:null,
    class:P?.cls||null,zone:gameState.insideHouse?'interior':'world',
    fps:graphics.fps,graphics,device:deviceSnapshot(),heap:heapSnapshot(),
    history:samples.map(sample=>({...sample})),historyLimit:HISTORY_LIMIT,
    drawCalls:info?.render?.calls??null,triangles:info?.render?.triangles??null,
    textures:info?.memory?.textures??null,geometries:info?.memory?.geometries??null,
    totalChunks:gameState.worldChunks?.size||0,visibleChunks:gameState.activeChunkCount||0,
    sceneObjects:sceneMeshes,activeEnemies:gameState.ents?.filter(e=>e.kind==='m'&&e.hp>0).length||0,
    cutscene:activeCutsceneId(),audio:{enabled:audio.enabled,unlocked:audio.unlocked,playing:audio.playing},
    lastError,errors:errors.slice(),timestamp:new Date().toISOString()
  };
}
export function diagnosticsSnapshot(){return snapshot();}
export function exportDiagnostic(){
  const json=JSON.stringify(snapshot(),null,2);
  const blob=new Blob([json],{type:'application/json'}),url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download='HINARIA_DIAGNOSTICO.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function toggle(){shown=!shown;if(panel)panel.hidden=!shown; if(shown)refresh();}
function refresh(){
  if(!body)return;
  const s=snapshot();
  body.textContent=[`FPS: ${s.fps} · Draw calls: ${s.drawCalls} · Triângulos: ${s.triangles}`,
    `Geometrias: ${s.geometries} · Texturas: ${s.textures}`,
    `Fluxo medido: ${s.graphics.measuredFlow||'aguardando'} · DPR: ${s.graphics.pixelRatio.toFixed(2)}`,
    `Quadro p50 / p95: ${s.graphics.frameTiming?.p50Ms??'—'} / ${s.graphics.frameTiming?.p95Ms??'—'} ms`,
    `Contexto: ${s.graphics.contextState||'desconhecido'} · Heap JS: ${s.heap?.usedBytes?Math.round(s.heap.usedBytes/1048576)+' MiB':'indisponível'}`,
    `Chunks: ${s.visibleChunks}/${s.totalChunks} · Inimigos: ${s.activeEnemies}`,
    `Posição: ${s.mapPosition?.join(', ')||'—'} · Zona: ${s.zone}`,
    `Cena: ${s.cutscene||'nenhuma'} · Música: ${s.audio.playing.join(', ')||'pausada'}`,
    `Último erro: ${s.lastError||'nenhum registrado'}`].join('\n');
}
export function initDiagnostics(){
  if(document.getElementById('hinaria-qa-panel'))return;
  const style=document.createElement('style');style.textContent=`
  #hinaria-qa-panel{position:fixed;top:7%;left:max(8px,env(safe-area-inset-left));z-index:95;width:min(370px,94vw);background:#101b23ef;color:#e8e2c5;border:1px solid #e2bc67;border-radius:10px;padding:12px;font:12px/1.5 monospace;box-shadow:0 8px 24px #000a}
  #hinaria-qa-panel[hidden]{display:none!important}#hinaria-qa-panel pre{white-space:pre-wrap;word-break:break-word}
  #hinaria-qa-panel button{margin:4px 5px 2px 0;background:#34463f;color:#fff1d6;border:1px solid #baa36f;padding:8px;border-radius:5px;min-height:36px}`;document.head.appendChild(style);
  panel=document.createElement('section');panel.id='hinaria-qa-panel';panel.hidden=true;
  panel.innerHTML='<strong>HINÁRIA · QA / F3</strong><pre id="hinaria-qa-body"></pre><button id="hinaria-qa-export">Baixar diagnóstico JSON</button><button id="hinaria-qa-close">Fechar</button>';
  document.body.appendChild(panel);body=panel.querySelector('pre');
  panel.querySelector('#hinaria-qa-export').addEventListener('click',exportDiagnostic);
  panel.querySelector('#hinaria-qa-close').addEventListener('click',toggle);
  window.addEventListener('keydown',e=>{if(e.key==='F3'){e.preventDefault();toggle();}});
  window.addEventListener('error',e=>record(e.error?.stack||e.message));
  window.addEventListener('unhandledrejection',e=>record(e.reason?.stack||e.reason));
  window.addEventListener('hinaria:graphicscontext',event=>{if(event.detail?.state==='lost')record('Contexto WebGL perdido; jogo pausado para recuperação.');if(shown)refresh();});
  const settings=document.getElementById('perf-panel');
  if(settings){const b=document.createElement('button');b.type='button';b.textContent='🛠 Diagnóstico / FPS';
    b.style.cssText='width:100%;min-height:40px;margin:8px 0';b.addEventListener('click',toggle);settings.appendChild(b);}
  // Can be used in Codespaces console without requiring another window.
  window.HINARIA_QA={snapshot,download:exportDiagnostic,toggle,clearHistory:()=>{samples.length=0;sampleElapsed=0;}};
}
export function tickDiagnostics(dt){
  if(!(dt>0)||!Number.isFinite(dt)||dt>2||globalThis.document?.hidden)return;
  sampleElapsed+=dt;
  if(sampleElapsed>=1){
    sampleElapsed=0;
    const graphics=getGraphicsDiagnostics(),info=gameState.renderer?.info,heap=heapSnapshot();
    samples.push({timestamp:new Date().toISOString(),flow:gameState.flow||null,fps:graphics.fps,
      frameP95Ms:graphics.frameTiming?.p95Ms??null,pixelRatio:graphics.pixelRatio,
      drawCalls:info?.render?.calls??null,triangles:info?.render?.triangles??null,
      geometries:info?.memory?.geometries??null,textures:info?.memory?.textures??null,
      usedHeapBytes:heap?.usedBytes??null,contextState:graphics.contextState||null});
    if(samples.length>HISTORY_LIMIT)samples.splice(0,samples.length-HISTORY_LIMIT);
  }
  if(!shown)return;
  elapsed+=dt;if(elapsed>.4){elapsed=0;refresh();}
}
