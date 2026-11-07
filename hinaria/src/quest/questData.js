/**
 * HINÁRIA — dados das missões (Capítulo 1: "A Noite Sem Grilos").
 * Para criar uma missão nova basta adicionar um objeto aqui; o motor (questSystem.js) não muda.
 * Passos: { type:'kill'|'discover'|'talk', target, count, npc, text, say, give }
 */
import { PART2_QUESTS } from '../content/part2.js';
export const CHAPTER_1 = { id: 'c1', title: 'Capítulo 1 — A Noite Sem Grilos' };

export const QUESTS = [
  {
    id: 'c1_ratos', main: true, chapter: 1, giver: 'bram', featured: true,
    title: 'Ratos Inquietos',
    hint: 'Fale com Bram, o Ferreiro',
    desc: 'Os grilos calaram e os ratos do campo fogem para a vila. Bram quer saber o que os assusta.',
    offer: 'Salve, forasteiro! Eu sou Bram, ferreiro de Vilarrubra. Chegou numa noite esquisita: faz três dias que os grilos calaram e os ratos do campo vêm correndo pra vila, assustados, como se algo os empurrasse. Preciso de alguém que dê um jeito neles e descubra o que os espanta. Topa enfrentar os ratos?',
    accept: 'Bom! Os campos ficam a leste e ao sul da vila. Derrote <b>4 ratos</b> e volte aqui. E olhe bem o que eles carregam.',
    steps: [
      { type: 'kill', target: 'rat', count: 4, text: 'Derrote 4 Ratos nos Campos de Vilarrubra',
        give: 'estilhaco', say: 'Um dos ratos largou um <b>Estilhaço de Sonho</b>: um caco azul que pulsa como um coração. Leve-o a Bram.' },
      { type: 'talk', npc: 'bram', text: 'Mostre o Estilhaço de Sonho a Bram',
        say: 'Por todos os martelos... isto brilha igual ao espelho do Yoki! Fique com estas moedas pelo trabalho. Mostre isso ao velho Olho-Parado, no canto noroeste da vila. Se alguém sabe o que é isto, é ele.' },
    ],
    reward: { gold: 40, xp: 60 },
  },
  {
    id: 'c1_espelho', main: true, chapter: 1, giver: 'yoki', pre: ['c1_ratos'], featured: true,
    title: 'O Brilho no Espelho',
    hint: 'Leve o Estilhaço a Yoki',
    desc: 'O Estilhaço de Sonho reage ao espelho de Yoki. Algo desperta no leste.',
    offer: 'Hm. Tu trouxe algo que canta. Mostra... (o espelho acende em verde) Estilhaço de Sonho. Pedaço do que dorme sob as ruínas de Ardu. Quando ele se mexe, os bichos fogem. Quer investigar o espelho e as ruínas?',
    accept: 'Sobe ao <b>Mirante do Vale</b>, a colina a leste da vila. Depois vai até a <b>Ponte Velha</b>. Olha pro leste e volta me contar o que viu.',
    steps: [
      { type: 'discover', target: 'Mirante do Vale', text: 'Suba ao Mirante do Vale (colina a leste da vila)' },
      { type: 'discover', target: 'Ponte Velha', text: 'Chegue à Ponte Velha e olhe para o leste' },
      { type: 'talk', npc: 'yoki', text: 'Conte a Yoki o que viu',
        say: '...Luz azul nas ruínas. Então já começou. Os Quebra-Presas que destruíram minha tribo também ouvem esse canto. Fica forte, forasteiro: quando chegar ao <b>nível 5</b>, cruze a ponte e entre nas <b>Ruínas de Ardu</b>. O próximo capítulo te espera.' },
    ],
    takes: 'estilhaco',
    reward: { gold: 80, xp: 90 },
    after: 'Capítulo 1 concluído! As Ruínas de Ardu, a nordeste, guardam a origem do canto.',
  },
  {
    id: 's1_minerio', main: false, giver: 'bram', pre: ['c1_ratos'], featured: false,
    title: 'O Minério Perdido',
    desc: 'O carregamento de minério de Bram sumiu perto do Acampamento Abandonado, na floresta ao sul.',
    offer: 'Aproveitando: meu último carregamento de minério sumiu perto do Acampamento Abandonado, na floresta ao sul. Bandidos, certeza. Vá até lá, dê uma lição em <b>2 bandidos</b> e traga notícias. Você aceita? (Recomendo nível 3.)',
    accept: 'Siga a estrada ao sul até a clareira. Cuidado: a floresta é densa e eles são traiçoeiros.',
    steps: [
      { type: 'discover', target: 'Acampamento Abandonado', text: 'Encontre o Acampamento Abandonado (floresta ao sul)' },
      { type: 'kill', target: 'bandit', count: 2, text: 'Derrote 2 Bandidos na floresta' },
      { type: 'talk', npc: 'bram', text: 'Volte a Bram com as notícias',
        say: 'Ha! Sem minério, mas com o respeito de volta. Os bandidos usavam caixas com um sinal estranho... o mesmo das ruínas. Tome estas moedas.' },
    ],
    reward: { gold: 70, xp: 70 },
  },
  {
    id: 'boss_troll', main: true, chapter: 2, giver: 'yoki', pre: ['c1_espelho'], minLevel: 8, featured: true,
    title: 'O Rugido do Ancião', hint: 'Nível 8+ · Fale com Yoki',
    desc: 'O Troll Ancião domina o acampamento ao leste. Prepare-se antes de enfrentá-lo.',
    offer: 'O Troll Ancião domina o caminho do acampamento dos trolls. Ele não é um troll comum. Nível recomendado: 14. Quer enfrentar esse perigo?',
    accept: 'Vá ao Acampamento dos Trolls. Derrote o Troll Ancião e volte para me contar.',
    steps: [
      { type:'discover', target:'Acampamento dos Trolls', text:'Encontre o Acampamento dos Trolls a leste' },
      { type:'kill', target:'boss:troll_ancient', count:1, text:'Derrote o chefe Troll Ancião (Nv. 14)' },
      { type:'talk', npc:'yoki', text:'Volte e conte a Yoki sobre a vitória' }
    ],
    reward: { gold:450, xp:550 }, after:'O caminho para a Caverna Sombria está aberto. Um rei cruel espera no extremo sudeste.'
  },
  {
    id: 'boss_orc', main:true, chapter:3, giver:'bram', pre:['boss_troll'], minLevel:14, featured:true,
    title: 'A Coroa dos Quebra-Presas', hint:'Nível 14+ · Fale com Bram',
    desc:'Enfrente o Rei dos Orcs na Caverna Sombria e salve os caminhos de Vilarrubra.',
    offer:'O Rei dos Orcs lidera os Quebra-Presas. Dizem que nem aço temperado o derruba. Nível recomendado: 20. Você aceita?',
    accept:'Prepare suas melhores armas, encontre a Caverna Sombria e enfrente o Rei dos Orcs.',
    steps: [
      { type:'discover', target:'Caverna Sombria', text:'Encontre a Caverna Sombria no sudeste' },
      { type:'kill', target:'boss:orc_king', count:1, text:'Derrote o chefe Rei dos Orcs (Nv. 20)' },
      { type:'talk', npc:'bram', text:'Informe a Bram que o Rei dos Orcs caiu' }
    ],
    reward:{ gold:900, xp:1150 },after:'Vilarrubra pode respirar em paz... por enquanto.'
  },

  {
    id:'yoki_marcacoes',main:false,chapter:4,giver:'yoki',pre:['c1_espelho'],featured:true,
    title:'As Três Marcas da Garra Cinzenta',hint:'Fale com Yoki sobre o Bosque das Memórias',
    desc:'Yoki quer recuperar três lembranças da noite em que seu povo caiu diante dos Quebra-Presas.',
    offer:'Na Garra Cinzenta, o chefe mandava esquecer. Eu não esqueci. Há três marcas no Alto das Cinzas que ainda contam a verdade. Me ajuda a encontrá-las?',
    accept:'Encontra o Bosque das Memórias. Depois procura três pedras marcadas no Alto das Cinzas. Observa os detalhes, não só os caminhos.',
    steps:[
      {type:'discover',target:'Bosque das Memórias',text:'Encontre o Bosque das Memórias na fronteira sul'},
      {type:'discover',target:'Marca do Escudo Partido',text:'Localize a primeira lembrança no Alto das Cinzas'},
      {type:'discover',target:'Marca do Passo no Gelo',text:'Encontre a marca do guerreiro que pisou no gelo'},
      {type:'discover',target:'Marca do Machado Silencioso',text:'Encontre a marca do último combate'},
      {type:'talk',npc:'yoki',text:'Volte a Yoki com as três lembranças',say:'Eu lembro do escudo, do gelo e do silêncio. Quem esquece um erro acaba repetindo ele. Você prestou atenção.'}
    ],reward:{gold:210,xp:280},after:'Yoki compartilhou o princípio do Replay: desviar é primeiro aprender a observar.'
  },
  {
    id:'yoki_gol_impossivel',main:false,chapter:4,giver:'yoki',pre:['yoki_marcacoes'],featured:false,
    title:'O Gol Impossível',
    desc:'O espelho de Yoki registra uma vitória sem sangue, vinda de outro mundo.',
    offer:'Tenho uma lembrança no espelho... Um campo verde, uma bola curva e gente que vence sem matar. Quer ver onde a memória mais brilha?',
    accept:'Viaja ao Refúgio da Trilha Sul. Lá, o espelho deve revelar a memória com clareza.',
    steps:[
      {type:'discover',target:'Refúgio da Trilha Sul',text:'Visite o Refúgio da Trilha Sul'},
      {type:'talk',npc:'yoki',text:'Fale com Yoki sobre o espelho',say:'Lá, aprendi que a vitória pode ser bonita mesmo quando ninguém morre. Desde então, tento outro final para cada luta.'}
    ],reward:{gold:140,xp:210},after:'A memória do espelho continua pulsando, lembrando que nem todo triunfo exige violência.'
  },
  {
    id:'yoki_de_novo',main:false,chapter:5,giver:'yoki',pre:['yoki_gol_impossivel','boss_orc'],featured:false,
    title:'De Novo',
    desc:'Depois da queda do Rei dos Orcs, Yoki oferece uma última lição aos sobreviventes.',
    offer:'A coroa caiu. Mas o que essa luta ensinou? Vamos até o Alto das Cinzas. Quero que veja o que sobrou.',
    accept:'Volte ao Alto das Cinzas e reflita sobre a memória da tribo.',
    steps:[
      {type:'discover',target:'Alto das Cinzas',text:'Revisite o Alto das Cinzas'},
      {type:'talk',npc:'yoki',text:'Converse com Yoki após a batalha',say:'Se só aprende quem vence, ninguém aprende nada. O que fazemos depois de cair? De novo.'}
    ],reward:{gold:220,xp:320}
  },

];

QUESTS.push(...PART2_QUESTS);
export const NPC_IDS = { bram: 'N', yoki: 'Y' };
