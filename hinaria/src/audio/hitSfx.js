/** Som curto de impacto, sem arquivos adicionais; respeita preferências existentes. */
import { getAudioPreferences } from './gameAudio.js';
let ctx=null; let last=0;
export function playHitSfx(type='enemy') {
  if (typeof window === 'undefined') return false;
  const prefs=getAudioPreferences();
  if (!prefs.enabled || prefs.volume<=0) return false;
  const now=performance.now();
  if (now-last<72) return false;
  last=now;
  try {
    const Ctor=window.AudioContext||window.webkitAudioContext;
    if (!Ctor) return false;
    ctx ||= new Ctor({latencyHint:'interactive'});
    if (ctx.state==='suspended') { ctx.resume().catch(()=>{}); return false; }
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    const t=ctx.currentTime;
    osc.type='triangle';
    const base=type==='enemy'?115:180;
    osc.frequency.setValueAtTime(base,t);
    osc.frequency.exponentialRampToValueAtTime(58,t+.11);
    gain.gain.setValueAtTime(Math.min(.075,prefs.volume*.13),t);
    gain.gain.exponentialRampToValueAtTime(.001,t+.125);
    osc.connect(gain).connect(ctx.destination);
    osc.onended=()=>{osc.disconnect();gain.disconnect();};
    osc.start(t);osc.stop(t+.13);
    return true;
  } catch {return false;}
}
