/** Part II content contract. Data and spawn demand only; no DOM, engine or timers. */
export const PART2_TITLE = 'Parte II — O Eco sob as Cinzas';

export const PART2_LAYOUT = {
  id:'eco', title:PART2_TITLE,
  bounds:{x0:44,z0:70,x1:63,z1:93},
  landmarks:[
    {n:'Passagem das Brumas',x:46,z:73,r:3},
    {n:'Observatório do Eco',x:56,z:79,r:3},
    {n:'Santuário da Última Voz',x:58,z:89,r:4},
  ],
  roads:[{pts:[[44,73],[46,73],[56,79],[58,89]],r:1.1,ty:1}],
  clearings:[[44,73,2.2],[46,73,4],[56,79,4],[58,89,5]],
  // Reuse the existing instanced world props. None allocates a point light.
  props:[
    {t:'pillar',x:43.5,z:71,sy:.65},
    {t:'pillar',x:48.5,z:71,sy:.9},
    {t:'log',x:44,z:76,r:.4},
    {t:'pillar',x:52.5,z:80.5,sy:.8},
    {t:'pillar',x:59.5,z:77.5,sy:1.1},
    {t:'wall',x:54,z:82.5,sy:.55,r:Math.PI/2},
    {t:'altar',x:58,z:93},
    {t:'pillar',x:53,z:89,sy:1.05},
    {t:'pillar',x:63,z:89,sy:.8},
    {t:'rock',x:62,z:93,s:.85},
  ],
};

export const PART2_BOSS_IDS = ['sentinela_eco'];
export const PART2_BOSS_VISUALS = {sentinela_eco:'troll_ancient'};

export const PART2_QUESTS = [
  {
    id:'p2_passagem',part:2,chapter:6,main:true,featured:true,giver:'yoki',pre:['boss_orc'],
    title:'Parte II · A Passagem das Brumas',hint:'Fale com Yoki após concluir A Coroa dos Quebra-Presas',
    desc:'A queda do Rei dos Orcs revelou um eco vindo da fronteira sul. Duas ruínas guardam a origem do chamado.',
    offer:'A coroa caiu, mas o silêncio não voltou. Ouço a tribo nas brumas ao sul, além da velha estrada. Quer descobrir quem ainda responde ao espelho?',
    accept:'Siga a estrada da fronteira até a <b>Passagem das Brumas</b> (46,73). Continue para o <b>Observatório do Eco</b> (56,79) e volte. Não confunda a voz com uma promessa.',
    steps:[
      {type:'discover',target:'Passagem das Brumas',text:'Encontre a Passagem das Brumas na fronteira sul'},
      {type:'discover',target:'Observatório do Eco',text:'Investigue o Observatório do Eco adiante da passagem'},
      {type:'talk',npc:'yoki',text:'Conte a Yoki o que ouviu no observatório',say:'Não é a voz dos mortos. É algo repetindo o que eles disseram. Bram sabe como quebrar os selos que prendem esse eco. Fale com ele.'},
    ],
    reward:{gold:300,xp:400},after:'Parte II iniciada: Bram precisa de ajuda para abrir o caminho do santuário.',
  },
  {
    id:'p2_vigilia',part:2,chapter:6,main:true,featured:true,giver:'bram',pre:['p2_passagem'],
    title:'Parte II · A Vigília dos Ossos',hint:'Fale com Bram sobre os guardas do Vale do Eco',
    desc:'Dois vigias de ossos mantêm os selos do observatório. Somente os guardas do Vale do Eco sustentam essa barreira.',
    offer:'Yoki me contou do canto. Dois vigias de ossos guardam o vale, e suas lâminas sustentam o selo. Eu preparo o aço; você abre o caminho. Aceita?',
    accept:'Volte ao vale e derrote os <b>dois Vigias do Eco</b> perto do observatório. Os esqueletos de Ardu não contam. Depois encontre o <b>Santuário da Última Voz</b> (58,89) e me traga notícias.',
    steps:[
      {type:'kill',target:'skeleton',region:'eco',count:2,text:'Derrote os 2 Vigias do Eco na nova fronteira'},
      {type:'discover',target:'Santuário da Última Voz',text:'Encontre o Santuário da Última Voz no fim da trilha'},
      {type:'talk',npc:'bram',text:'Informe a Bram que os selos foram quebrados',say:'Os selos caíram. Mas o santuário ainda responde. Yoki vai saber o que fazer com a voz que sobrou. Prepare-se: esse guardião é mais forte que os vigias.'},
    ],
    reward:{gold:450,xp:650},after:'O caminho está aberto. Yoki reconheceu o guardião que mantém o eco preso.',
  },
  {
    id:'p2_ultima_voz',part:2,chapter:6,main:true,featured:true,giver:'yoki',pre:['p2_vigilia'],
    title:'Parte II · A Última Voz',hint:'Fale com Yoki para enfrentar a Sentinela do Eco',
    desc:'A Sentinela do Eco repete uma batalha que já terminou. Derrote o guardião e permita que a fronteira encontre silêncio.',
    offer:'A sentinela guarda uma lembrança de derrota. Não deixa ninguém partir porque acredita que a luta ainda continua. Podemos mostrar outro final. Vai enfrentá-la?',
    accept:'Vá ao <b>Santuário da Última Voz</b> e derrote a <b>Sentinela do Eco</b> (Nv. 22). Prepare equipamento e habilidades antes de entrar. Depois volte: uma história só termina quando alguém a conta.',
    steps:[
      {type:'kill',target:'boss:sentinela_eco',count:1,text:'Derrote a Sentinela do Eco no santuário'},
      {type:'talk',npc:'yoki',text:'Volte a Yoki para encerrar a Parte II',say:'Agora eu ouço os grilos. A tribo não voltou, mas já não está presa àquela noite. A sentinela aprendeu outro fim. E nós também. Obrigado por lembrar comigo.'},
    ],
    reward:{gold:1200,xp:1600},after:'Parte II concluída — O Eco sob as Cinzas. A fronteira está em paz. Você pode continuar explorando e salvar sua aventura.',
  },
];

// Append to the existing list: save files store indices of the original zones.
export const PART2_SPAWNS = [
  {id:'eco_guards',region:'eco',activeQuest:'p2_vigilia',k:'skeleton',n:2,x0:50,z0:76,x1:60,z1:83,zn:[5],level:18,title:'Vigia do Eco'},
  {id:'eco_sentinel',region:'eco',activeQuest:'p2_ultima_voz',k:'troll',n:1,x0:56,z0:87,x1:60,z1:91,zn:[5],level:22,boss:true,bossId:'sentinela_eco',title:'Sentinela do Eco'},
];

/** Desired living actors for a quest-gated zone, using a parsed quest snapshot.
 * Remaining kill progress survives load; already defeated guards are not refilled.
 */
export function part2SpawnTarget(zone,questSnapshot) {
  const definition=PART2_QUESTS.find(quest=>quest.id===zone?.activeQuest);
  const record=questSnapshot?.q?.[zone?.activeQuest];
  if(!definition||record?.s!=='active'||!Number.isInteger(record.step)||record.step<0)return 0;
  const step=definition.steps[record.step];
  if(step?.type!=='kill')return 0;
  const target=zone.bossId?'boss:'+zone.bossId:zone.k;
  if(step.target!==target||(step.region&&step.region!==zone.region))return 0;
  const defeated=Number.isFinite(record.n)?Math.max(0,Math.floor(record.n)):0;
  return Math.max(0,Math.min(Math.max(0,Math.floor(zone.n)||0),(step.count||1)-defeated));
}
