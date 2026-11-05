/** HINÁRIA — cenas cinematográficas do mundo, baseadas no travelling da abertura de Vilarrubra.
 * Apenas câmera, títulos e diálogo: missões, inimigos e atributos permanecem intocados.
 */
import { gameState } from '../core/gameState.js';

const h = (x, z, dy) => [x, gameState.getHeightAt(x, z) + dy, z];
/** Volta para o enquadramento original da câmera de seguimento. */
function followPose() {
  const P = gameState.P, zm = gameState.zoom || 1, hd = 8.5 * zm;
  return { p: [P.x + Math.sin(gameState.yaw) * hd, P.mesh.position.y + 10.5 * zm, P.z + Math.cos(gameState.yaw) * hd], l: [P.x, P.mesh.position.y, P.z] };
}
function orbitAround(x, z, headingX, headingZ, by) {
  const d = Math.hypot(headingX, headingZ) || 1;
  const fx = headingX / d, fz = headingZ / d, sx = -fz, sz = fx;
  const point = (forward, side, up) => [x + fx * forward + sx * side, by + up, z + fz * forward + sz * side];
  return { point, look: up => [x, by + up, z] };
}
function bossShots(e, who, title, lines, wide, close) {
  const P = gameState.P;
  const v = orbitAround(e.x, e.z, P.x - e.x, P.z - e.z, e.mesh.position.y);
  const at = v.point, look = v.look;
  // Smaller, elevated orbit on the PLAYER side: keeps the Orc King's cave
  // walls/rocks out of the foreground. The camera pass additionally checks
  // line of sight while the shot interpolates.
  const w = Math.min(7.0, wide[0] * .62), c = Math.min(4.0, close[0] * .78);
  const shots = [
    { dur: 4.0, a: { p: at(w + 1.2, 1.5, 6.6), l: look(1.8) }, b: { p: at(w, 1.0, 5.1), l: look(1.8) } },
    { dur: 3.1, a: { p: at(w, 1.0, 5.1), l: look(1.9) }, b: { p: at(w - 1.0, -1.4, 4.8), l: look(2.0) }, title },
    { dur: 2.8, a: { p: at(c + 1.1, -1.3, 5.0), l: look(2.0) }, b: { p: at(c + .45, -.5, 4.4), l: look(2.2) } },
  ];
  for (const t of lines) shots.push({ dur: 3.4, a: { p: at(c + .45, -.5, 4.4), l: look(2.2) }, b: { p: at(c, .6, 4.3), l: look(2.3) }, say: { who, text: t }, wait: true });
  shots.push({ dur: 1.8, a: { p: at(c, .6, 4.3), l: look(2.3) }, b: followPose() });
  return shots;
}
function victoryShots(context, name, chapter, speech) {
  if (!context || !gameState.P) return null;
  const { x, z } = context;
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  const P = gameState.P;
  const v = orbitAround(x, z, P.x - x, P.z - z, gameState.getHeightAt(x,z));
  const at = v.point, look = v.look;
  return [
    { dur: 3.8, a: { p: at(10, 4.5, 7), l: look(1.1) }, b: { p: at(6, 2.5, 3.6), l: look(1.0) }, title: { big: name, small: 'A batalha terminou' } },
    { dur: 3.3, a: { p: at(6, 2.5, 3.6), l: look(1.0) }, b: { p: at(3.8, -1.7, 2.5), l: look(0.8) }, say: { who: 'Narrador', text: speech }, wait: true },
    { dur: 3.0, a: { p: at(8, 0, 5), l: look(1.0) }, b: { p: at(10, -2.5, 7), l: look(1.0) }, title: { big: chapter, small: 'O caminho de Vilarrubra continua' }, dark: true },
    { dur: 1.8, a: { p: at(10, -2.5, 7), l: look(1.0) }, b: followPose() },
  ];
}

export const SCENES = {
  arrival: {
    build() {
      const N = gameState.N, P = gameState.P; if (!N || !P) return null;
      const f = followPose();
      return { shots: [
        { dur: 5.5, a: { p: h(34, 30, 13), l: h(14, 15, 1) }, b: { p: h(18, 27, 7), l: h(13, 15, 1.5) }, title: { big: 'Vilarrubra', small: 'Um Mundo Além dos Sonhos' } },
        { dur: 4.2, a: { p: h(22, 22, 3.4), l: h(14, 13, 1) }, b: { p: h(17, 18, 2.4), l: h(14, 12, 1.2) }, say: { who: 'Narrador', text: 'Na praça de Vilarrubra, o vento carrega o cheiro de ferro e de lenha. Falta apenas um som.' }, wait: true },
        { dur: 3.4, a: { p: h(N.x + 3.2, N.z + 4.2, 1.9), l: h(N.x, N.z, 1.4) }, b: { p: h(N.x + 2.4, N.z + 3.2, 1.7), l: h(N.x, N.z, 1.5) }, say: { who: 'Bram', text: 'Faz três noites que os grilos calaram. Em Vilarrubra, silêncio nunca foi sinal de paz.' }, wait: true },
        { dur: 3.0, a: { p: h(N.x + 2.4, N.z + 3.2, 1.7), l: h(N.x, N.z, 1.5) }, b: { p: h(N.x + 1.8, N.z + 2.6, 1.6), l: h(N.x, N.z, 1.5) }, say: { who: 'Bram', text: 'Venha me ver, forasteiro. Preciso de alguém que não tenha medo.' }, wait: true },
        { dur: 4.4, a: { p: h(13, 7, 9), l: h(13, 14, 3) }, b: { p: h(13, 6, 12), l: h(13, 14, 4) }, title: { big: 'Capítulo 1', small: 'A Noite Sem Grilos' }, dark: true },
        { dur: 1.8, a: { p: h(13, 6, 12), l: h(13, 14, 4) }, b: f },
      ] };
    },
  },
  yoki: {
    build() {
      const Y = gameState.Y, P = gameState.P;
      if (!Y || !P || gameState.insideHouse) return null;
      const v = orbitAround(Y.x, Y.z, P.x - Y.x, P.z - Y.z, Y.mesh.position.y);
      const at = v.point, look = v.look;
      return { shots: [
        { dur: 4.2, a: { p: at(9, 4, 6.6), l: look(1.0) }, b: { p: at(6, 2.7, 3.7), l: look(1.3) }, title: { big: 'Yoki', small: 'O Bárbaro do Replay' } },
        { dur: 3.1, a: { p: at(5, -2.1, 2.7), l: look(1.2) }, b: { p: at(3.5, -1.2, 2.0), l: look(1.2) }, say: { who: 'Narrador', text: 'Um orc da Garra Cinzenta observa o mundo como quem revive uma batalha que ainda não terminou.' }, wait: true },
        { dur: 3.0, a: { p: at(3.5, -1.2, 2), l: look(1.35) }, b: { p: at(2.4, 0.6, 1.7), l: look(1.4) }, say: { who: 'Yoki', text: 'Na minha tribo, ensinavam a esquecer a dor. Eu lembro de cada golpe.' }, wait: true },
        { dur: 3.2, a: { p: at(2.7, 1.1, 1.7), l: look(1.4) }, b: { p: at(3.3, -0.7, 2.1), l: look(1.4) }, say: { who: 'Yoki', text: 'Uma luta pode terminar diferente. Olha, aprende... e tenta de novo.' }, wait: true },
        { dur: 1.9, a: { p: at(3.3, -0.7, 2.1), l: look(1.4) }, b: followPose() },
      ] };
    },
  },
  bridge: {
    build() {
      const lm = gameState.LM.find(l => l.n === 'Ponte Velha');
      if (!lm || !gameState.P || gameState.insideHouse) return null;
      const { x, z } = lm;
      return { shots: [
        { dur: 5.1, a: { p: h(x + 10, z - 6, 10.5), l: h(x, z, 1.2) }, b: { p: h(x + 5.7, z + 4, 5.0), l: h(x, z, 0.9) }, title: { big: 'Ponte Velha', small: 'O caminho para as Ruínas de Ardu' } },
        { dur: 3.7, a: { p: h(x - 3, z + 6, 3.0), l: h(x, z, 1) }, b: { p: h(x + 2.5, z + 2.4, 2.1), l: h(x + 2, z - 4, 1.5) }, say: { who: 'Narrador', text: 'Além da ponte, a terra muda de cor. Um eco distante parece responder ao Estilhaço de Sonho.' }, wait: true },
        { dur: 3.2, a: { p: h(x + 2, z + 2, 3.2), l: h(x + 5, z, 1.2) }, b: { p: h(x + 5, z - 2, 4.3), l: h(x + 8, z, 1.2) }, say: { who: 'Memória de Yoki', text: '“Observa antes de atacar. Nenhum caminho se revela a quem só sabe correr.”' }, wait: true },
        { dur: 1.8, a: { p: h(x + 5, z - 2, 4.3), l: h(x + 8, z, 1.2) }, b: followPose() },
      ] };
    },
  },
  diary: {
    room: true,
    build() {
      if (!gameState.insideHouse) return null;
      const L = [1.18, 0.74, -1.1], f = (px, py, pz) => [px, py, pz];
      return { shots: [
        { dur: 3.4, a: { p: f(0.2, 2.8, 3.2), l: L }, b: { p: f(1.7, 1.6, 0.9), l: L }, title: { big: 'Cabana Abandonada', small: 'O Diário de Garrick' }, say: { who: 'Cabana Abandonada', text: 'Sobre a mesa, um diário de capa gasta ainda parece morno, como se alguém o tivesse largado agora.' }, wait: true },
        { dur: 2.6, a: { p: f(1.7, 1.6, 0.9), l: L }, b: { p: f(1.45, 1.2, 0.25), l: L }, say: { who: 'Diário de Garrick', text: '“Dia 41. Os grilos calaram. Não é a falta de som que me assusta, é o que vem preencher o silêncio.”' }, wait: true },
        { dur: 2.4, a: { p: f(1.45, 1.2, 0.25), l: L }, b: { p: f(1.3, 1.1, 0.0), l: L }, say: { who: 'Diário de Garrick', text: '“Dia 47. O Coração de Ardu rachou. O Troll Ancião guarda a Pedra-Selo, a leste, e os Quebra-Presas querem o que dorme sob ela.”' }, wait: true },
        { dur: 2.4, a: { p: f(1.3, 1.1, 0.0), l: L }, b: { p: f(0.4, 3.0, 4.2), l: [0, 0.8, 0] }, say: { who: 'Diário de Garrick', text: '“Se alguém ler isto: procure o velho Yoki. Ele conhece o preço do silêncio.”' }, wait: true },
      ] };
    },
    // Só cinematografia: não altera missões, pistas, itens nem progresso da 1.0.8.0.
  },
  // Optional scenes do not grant rewards or mutate quest flags. They are
  // triggered by travel and use the same camera grammar as Vilarrubra's opener.
  yoki_memory: {
    build() {
      const lm=gameState.LM.find(l=>l.n==='Bosque das Memórias');
      if(!lm || !gameState.P || gameState.insideHouse)return null;
      const {x,z}=lm;
      return {shots:[
        {dur:4,a:{p:h(x+8,z+8,7),l:h(x,z,1)},b:{p:h(x+3,z+5,3.2),l:h(x,z,1)},title:{big:'O Espelho na Estrada',small:'Bosque das Memórias'}},
        {dur:3.3,a:{p:h(x+3,z+5,3.2),l:h(x,z,1)},b:{p:h(x-2,z+4,2.7),l:h(x,z,1.2)},say:{who:'Narrador',text:'Um orc observava dois viajantes treinando. Um deles caiu. O orc permaneceu em silêncio.'},wait:true},
        {dur:3,a:{p:h(x-2,z+4,2.7),l:h(x,z,1.2)},b:{p:h(x+2,z+3,2.3),l:h(x,z,1)},say:{who:'Yoki',text:'De novo. Cada queda mostra um movimento que você ainda não viu.'},wait:true},
        {dur:1.8,a:{p:h(x+2,z+3,2.3),l:h(x,z,1)},b:followPose()}
      ]};
    }
  },
  yoki_ashes: {
    build(){
      const lm=gameState.LM.find(l=>l.n==='Alto das Cinzas');if(!lm||!gameState.P||gameState.insideHouse)return null;
      const {x,z}=lm;
      return {shots:[
        {dur:4.5,a:{p:h(x+9,z+8,7),l:h(x,z,0.7)},b:{p:h(x+5,z+4,4),l:h(x,z,0.7)},title:{big:'Replay da Garra Cinzenta',small:'Alto das Cinzas'}},
        {dur:3.1,a:{p:h(x+4,z+3,3),l:h(x-2,z,0.5)},b:{p:h(x-1,z+3,2.5),l:h(x-2,z,0.5)},say:{who:'Memória de Yoki',text:'O chefe abriu a guarda à esquerda. O gelo rangeu sob um passo apressado.'},wait:true},
        {dur:3.1,a:{p:h(x-2,z+4,2.7),l:h(x+2,z,1)},b:{p:h(x+3,z+2,2.4),l:h(x+2,z,1)},say:{who:'Yoki',text:'Tudo que perdi me ensinou onde olhar. Procure três marcas entre as pedras.'},wait:true},
        {dur:1.7,a:{p:h(x+3,z+2,2.4),l:h(x+2,z,1)},b:followPose()}
      ]};
    }
  },
  yoki_goal: {
    build(){
      const lm=gameState.LM.find(l=>l.n==='Refúgio da Trilha Sul');if(!lm||!gameState.P||gameState.insideHouse)return null;
      const {x,z}=lm;
      return {shots:[
        {dur:4,a:{p:h(x+7,z+7,6),l:h(x,z,1)},b:{p:h(x+3,z+4,3),l:h(x,z,1)},title:{big:'O Gol Impossível',small:'Uma lembrança de outro mundo'}},
        {dur:3.4,a:{p:h(x+3,z+4,3),l:h(x,z,1)},b:{p:h(x-1,z+3,2.2),l:h(x,z,1)},say:{who:'Narrador',text:'Um espelho negro mostra um campo verde. Uma esfera descreve uma curva impossível. A multidão celebra: ninguém morreu.'},wait:true},
        {dur:3.4,a:{p:h(x-1,z+3,2.2),l:h(x,z,1)},b:{p:h(x+1,z+2.4,2.4),l:h(x,z,1.2)},say:{who:'Yoki',text:'Aprendi com aquela bola que se pode vencer sem matar. Desde então, procuro outro final para cada luta.'},wait:true},
        {dur:1.8,a:{p:h(x+1,z+2.4,2.4),l:h(x,z,1.2)},b:followPose()}
      ]};
    }
  },
  yoki_troll_tip: {
    build(){
      const e=gameState.ents?.find(x=>x.bossId==='troll_ancient'&&x.hp>0);if(!e||!gameState.P)return null;
      const v=orbitAround(e.x,e.z,gameState.P.x-e.x,gameState.P.z-e.z,e.mesh.position.y);
      return {shots:[
        {dur:3,a:{p:v.point(6.5,1.2,5),l:v.look(1.1)},b:{p:v.point(4.7,-1,4.5),l:v.look(1.4)},title:{big:'Garganta de Pedra',small:'Observe antes de atacar'}},
        {dur:2.8,a:{p:v.point(4.7,-1,4.5),l:v.look(1.4)},b:{p:v.point(5.2,.8,4.8),l:v.look(1.3)},say:{who:'Memória de Yoki',text:'Ele pisa antes de girar. Quando levantar o ombro, esquiva. Não ataque antes de observar.'},wait:true},
        {dur:1.8,a:{p:v.point(5.2,.8,4.8),l:v.look(1.3)},b:followPose()}
      ]};
    }
  },
  troll: {
    build() {
      const e = gameState.ents.find(x => x.bossId === 'troll_ancient' && x.hp > 0); if (!e || !gameState.P) return null;
      const lvl = e.K?.level || 14;
      return { musicBossId: 'troll_ancient', boss: e, shots: bossShots(e, 'Troll Ancião', { big: e.name || 'Troll Ancião', small: `Nível ${lvl} · Guardião da Pedra-Selo` }, ['“Pequeno... humano... Ninguém toca na Pedra-Selo. Ninguém.”'], [9, 3.2], [4.6, 2.2]) };
    },
    onStart() { const e = gameState.ents.find(x => x.bossId === 'troll_ancient'); if (e && gameState.P) e.mesh.rotation.y = Math.atan2(gameState.P.x - e.x, gameState.P.z - e.z); },
  },
  orc: {
    build() {
      const e = gameState.ents.find(x => x.bossId === 'orc_king' && x.hp > 0); if (!e || !gameState.P) return null;
      const lvl = e.K?.level || 20;
      return { musicBossId: 'orc_king', boss: e, shots: bossShots(e, 'Rei dos Orcs', { big: e.name || 'Rei dos Orcs', small: `Nível ${lvl} · Senhor dos Quebra-Presas` }, ['“Então o Silêncio trouxe um verme à minha toca. Que bom. Faz tempo que a coroa não bebe sangue.”', '“Quando eu quebrar o Selo, Ardu inteira vai calar.”'], [11, 3.6], [5.2, 2.0]) };
    },
    onStart() { const e = gameState.ents.find(x => x.bossId === 'orc_king'); if (e && gameState.P) e.mesh.rotation.y = Math.atan2(gameState.P.x - e.x, gameState.P.z - e.z); },
  },
  troll_victory: {
    build(context) {
      const shots = victoryShots(context, 'Troll Ancião derrotado', 'A Pedra-Selo', 'O rugido do Ancião se apaga. Sob o silêncio da montanha, a Pedra-Selo continua aguardando quem compreenda seu segredo.');
      return shots ? { musicBossId: 'troll_ancient', shots } : null;
    },
  },
  orc_victory: {
    build(context) {
      const shots = victoryShots(context, 'O Rei dos Orcs caiu', 'O eco da Garra Cinzenta', 'A coroa dos Quebra-Presas perdeu seu dono. Yoki dizia que toda luta é um replay — e que todo replay pode ter outro final.');
      if(shots){
        shots.splice(shots.length-1,0,{
          dur:3.8,a:shots[1].b,b:shots[2].a,
          say:{who:'Yoki',text:'Se só aprende quem vence, ninguém aprende nada. O rei caiu, mas o que essa luta nos ensinou? De novo.'},wait:true
        });
      }
      return shots ? { musicBossId: 'orc_king', shots } : null;
    },
  },
};

export const BOSS_TRIGGERS = [
  { bossId: 'troll_ancient', scene: 'troll', range: 15 },
  { bossId: 'orc_king', scene: 'orc', range: 15 },
];
