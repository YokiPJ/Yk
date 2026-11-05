const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../src/player/player.js'),'utf8');
const start=src.indexOf('export function setClass(cls, sk) {');
assert(start>=0);
let open=src.indexOf('{',start), depth=0,end=-1;
for(let i=open;i<src.length;i++) {
 if(src[i]==='{') depth++;
 if(src[i]==='}' && --depth===0) {end=i+1;break;}
}
assert(end>0);
const body=src.slice(start,end).replace('export ','');
let P={cls:'pa',sk:0,lv:2,hp:45,mana:30,cds:[0,0,12,4],b:{haste:5},kc:'',max:100,mm:100};
const gameState={P};
const CLASSES={pa:{hp:75,up:7,mp:100,mu:9},so:{hp:50,up:5,mp:100,mu:5}};
let refresh=0;
const setClass=new Function('gameState','CLASSES','ensureArsenal','applyAppearance','updateSkillUI','updateHUD',`${body}; return setClass;`)(gameState,CLASSES,()=>{},()=>{},()=>{refresh++},()=>{});
setClass('so',0);
assert.deepEqual(P.cds,[0,0,12,4],'troca de classe zerou cooldowns');
assert.deepEqual(P.b,{},'Passo Veloz vazou para outra classe');
assert.equal(P.hp,45,'troca restaurou HP');
assert.equal(P.mana,30,'troca restaurou mana');
P.b={rage:3};setClass('so',1);
assert.deepEqual(P.b,{rage:3},'troca de skin apagou buff da mesma classe');
assert.deepEqual(P.cds,[0,0,12,4],'troca de skin zerou cooldown');
P.cds[2]=9;setClass('pa',1);
assert.equal(P.cds[2],9,'voltar para classe original removeu cooldown');
assert.deepEqual(P.b,{},'buff vazou ao voltar');
console.log('PASS: cooldowns, buff de velocidade, HP/MP e troca de skin');
