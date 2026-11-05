import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

const store = new Map();
globalThis.localStorage = {getItem: key => store.get(key) || null, setItem: (k,v) => store.set(k,v)};
globalThis.document = { hidden: false };
const made = [];
class FakeAudio extends EventEmitter {
  constructor(src) { super(); this.src=src; this.loop=false; this.paused=true; this.volume=1; this.currentTime=0; this.plays=0; made.push(this); }
  addEventListener(event, fn) { this.on(event, fn); }
  play() { this.plays++; this.paused=false; return Promise.resolve(); }
  pause() { this.paused=true; }
}
globalThis.Audio = FakeAudio;
const music = await import('../src/audio/gameAudio.js');
const ambient = made.find(x=>x.src.includes('ambiente-v79'));
const fallback = made.find(x=>x.src.includes('boss-original'));
const troll = made.find(x=>x.src.includes('boss-troll-battle'));
const orc = made.find(x=>x.src.includes('boss-orc-heavy'));
const victory = made.find(x=>x.src.includes('victory.mp3'));
assert(victory,'Victory.mp3 belongs to the offline soundtrack');
assert.equal(made.length,5,'ambient, fallback, two boss themes and Victory.mp3');
assert(made.filter(x=>x!==victory).every(x=>x.loop),'ambient and boss music loops');
assert.equal(victory.loop,false,'victory cue must not repeat');
const state = {insideHouse:false,P:{x:0,z:0},ents:[]};
music.updateGameAudio(state);
assert.equal(ambient.plays,0,'no autoplay before unlock');
music.unlockGameAudio(); await Promise.resolve();
for(let i=0;i<100;i++) music.updateGameAudio(state);
assert(!ambient.paused && ambient.volume>0,'ambient starts after user gesture');
state.ents=[{isBoss:true,bossId:'troll_ancient',x:4,z:0,hp:100}];
for(let i=0;i<100;i++) music.updateGameAudio(state);
await Promise.resolve();
assert(!troll.paused && troll.volume>0,'troll has Battle.mp3');
assert(ambient.paused, 'ambient faded for boss');
assert.equal(music.getAudioDiagnostics().activeBossId,'troll_ancient');
troll.pause(); troll.emit('ended');
assert(!troll.paused,'loop restarts if audio engine emits ended');
state.ents=[{isBoss:true,bossId:'orc_king',x:4,z:0,hp:100}];
for(let i=0;i<100;i++) music.updateGameAudio(state);
await Promise.resolve();
assert(!orc.paused && orc.volume>0,'orc has heavy boss theme');
assert(troll.paused,'troll theme faded out');
state.ents[0].hp=0;
music.setCinematicBossMusic('orc_king');
for(let i=0;i<90;i++) music.updateGameAudio(state);
assert(!orc.paused,'boss intro keeps boss music even when hp=0');
music.setCinematicBossMusic(null);
music.setCinematicVictoryMusic(true);
for(let i=0;i<90;i++) music.updateGameAudio(state);
assert.equal(music.getAudioDiagnostics().desiredTrack,'victory');
assert(!victory.paused,'Victory.mp3 plays at the beginning of the victory cutscene');
await Promise.resolve();
victory.pause(); victory.emit('ended');
await Promise.resolve();
assert.equal(music.getAudioDiagnostics().desiredTrack,'ambient','after the jingle, ambient returns');
music.setCinematicVictoryMusic(false);

for(let i=0;i<120;i++) music.updateGameAudio(state);
assert(!ambient.paused,'ambient returns after victory');
assert(orc.paused,'boss music fades out');
// Errors on optional boss audio must fall back to local original.
state.ents=[{isBoss:true,bossId:'orc_king',x:4,z:0,hp:100}];
orc.emit('error', new Error('simulated local file missing'));
for(let i=0;i<120;i++) music.updateGameAudio(state);
await Promise.resolve();
assert(!fallback.paused,'local fallback when boss mp3 is missing');
music.pauseGameAudio(); assert(made.every(a=>a.paused),'background pauses all');
music.resumeGameAudio(); assert(!fallback.paused,'foreground resumes');
music.setAudioEnabled(false); assert(made.every(a=>a.paused),'mute pauses all');
music.setAudioEnabled(true); await Promise.resolve(); music.updateGameAudio(state); assert(!fallback.paused,'unmute resumes');
music.setAudioVolume(.22); assert.equal(music.getAudioPreferences().volume,.22);
console.log('PASS: five local audio tracks, looping boss themes, victory once, fallback, mute and resume');
