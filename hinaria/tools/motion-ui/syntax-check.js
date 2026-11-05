
'use strict';
// Cada cena é montada uma única vez. Somente seu render(p) altera os elementos.
// O mesmo relógio governa todos os estudos, inclusive pausa, busca e repetição.
const ORIGINAL_SOURCE='<!doctype html>\n'+document.documentElement.outerHTML;
const TAU=Math.PI*2;
const arrowIcon='<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13L13 3M4 3H13V12"/></svg>';
const playIcon='<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2L14 8L4 14Z" fill="currentColor" stroke="none"/></svg>';
const pauseIcon='<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3V13M11 3V13" stroke-width="3"/></svg>';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*t;
const fract=x=>x-Math.floor(x);
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const out=x=>1-Math.pow(1-clamp(x),3);
const pulse=(p,start=.12,end=.87)=>smooth((p-start)/.15)*(1-smooth((p-end)/.13));
const attr=(node,values)=>{for(const k in values)node.setAttribute(k,String(values[k]))};
const rng=(i,seed=1)=>fract(Math.sin(i*127.1+seed*311.7)*43758.5453123);
const $=id=>document.getElementById(id);
const catalog=[
 ['portal','Efeitos','Portal dimensional','Anéis em contrarrotação, campo de energia e partículas em órbita. Um estudo de rotação e pulsação com profundidade.',['órbita','partículas','transform'],'SVG'],
 ['walk','Personagem','Caminhada','Um robô estilizado com braços e pernas em oposição, contato com o chão e balanço do corpo.',['ciclo','rig 2D','locomoção'],'SVG'],
 ['wind','Cenários','Vento na floresta','Camadas de árvores oscilam com fases diferentes; folhas atravessam o enquadramento.',['paralaxe','vento','vegetação'],'SVG'],
 ['modal','Interface','Janela elástica','Entrada com deslocamento, escala e leve overshoot; a saída usa o mesmo relógio, em sentido inverso.',['overshoot','escala','opacidade'],'HTML'],
 ['heal','Efeitos','Pulso de cura','Anéis ascendentes, cruzes e partículas suaves formam um campo de recuperação.',['pulso','emissão','camadas'],'SVG'],
 ['idle','Personagem','Respiração / idle','Pequenos movimentos de cabeça, peito e braços dão presença ao personagem em repouso.',['idle','respiração','pose'],'SVG'],
 ['rain','Cenários','Chuva e respingos','Chuva em profundidades distintas, deslocamento diagonal e pequenos impactos sobre o chão.',['clima','profundidade','loop'],'SVG'],
 ['toast','Interface','Notificações','Três mensagens entram em sequência com deslocamento e barra de duração sincronizada.',['stagger','feedback','toast'],'HTML'],
 ['run','Personagem','Corrida','Passadas rápidas, inclinação do tronco e rastros de velocidade em um ciclo contínuo.',['corrida','follow-through','ritmo'],'SVG'],
 ['fire','Cenários','Fogueira','Chamas em camadas, brasas ascendentes e luz pulsante. Emissão determinística para buscar qualquer quadro.',['fogo','brasas','luz'],'SVG'],
 ['projectile','Efeitos','Projétil de energia','Antecipação, deslocamento acelerado e impacto com ondas de choque no alvo.',['trajetória','impacto','rastro'],'SVG'],
 ['typewriter','Texto','Máquina de escrever','Revelação caractere a caractere, cursor intermitente e apagamento ao fim do ciclo.',['revelação','cursor','tipografia'],'HTML'],
 ['cards','Interface','Cartas em leque','Três cartões abrem em leque com rotações independentes e movimento suave de retorno.',['stagger','rotação','cards'],'HTML'],
 ['water','Cenários','Água e ondulações','Ondas senoidais, reflexos e círculos que se expandem sobre uma superfície vetorial.',['ondas','reflexo','superfície'],'SVG'],
 ['jump','Personagem','Salto e aterrissagem','Antecipação, arco do salto, alongamento no ar e compressão na aterrissagem.',['squash & stretch','arco','peso'],'SVG'],
 ['explosion','Efeitos','Explosão radial','Flash central controlado, onda de choque e fragmentos que perdem energia com o tempo.',['burst','fragmentos','choque'],'SVG'],
 ['orbit','Loaders','Órbitas sincronizadas','Três trajetórias e satélites com períodos diferentes, sem requisições ou tarefas reais em segundo plano.',['loader','órbita','ritmo'],'SVG'],
 ['nav','Interface','Navegação fluida','Uma pílula percorre os itens de navegação; cada mudança usa interpolação suave.',['navegação','interpolação','estado'],'HTML'],
 ['daynight','Cenários','Dia e noite','O céu muda de cor enquanto sol, lua, estrelas e luzes da vila acompanham o ciclo.',['cor','iluminação','ciclo'],'SVG'],
 ['wave','Texto','Letras em onda','Cada letra recebe sua própria fase de deslocamento, rotação e cor.',['stagger','onda','letras'],'HTML'],
 ['dodge','Personagem','Esquiva / rolamento','Preparação curta, deslocamento lateral e rotação completa antes da recuperação.',['esquiva','rotação','antecipação'],'SVG'],
 ['shield','Efeitos','Escudo energético','Uma malha hexagonal nasce ao redor do núcleo e reage a pulsos que percorrem sua borda.',['hexágonos','barreira','pulso'],'SVG'],
 ['counter','Interface','Contador e gráfico','Valor numérico e barras crescem juntos; a volta ao início faz parte da demonstração.',['dados','contador','easing'],'HTML'],
 ['liquid','Loaders','Preenchimento líquido','Um recipiente circular recebe uma onda animada; o percentual representa somente esta demonstração.',['loader','máscara','onda'],'SVG'],
 ['fog','Cenários','Névoa em camadas','Faixas de névoa se deslocam em velocidades diferentes diante de uma pequena paisagem.',['atmosfera','paralaxe','névoa'],'SVG'],
 ['attack','Personagem','Golpe de espada','O braço antecipa o ataque, descreve o arco do golpe e retorna à pose de guarda.',['combate','arco','recuperação'],'SVG'],
 ['lightning','Efeitos','Raio elétrico','Ramificações vetoriais conectam dois pontos; um pulso moderado de luz enfatiza a descarga.',['eletricidade','ramificações','pulso'],'SVG'],
 ['cta','Interface','Botão / microinteração','Um cursor simula aproximação e clique; o botão comprime e emite um anel de feedback.',['botão','ripple','feedback'],'HTML'],
 ['glitch','Texto','Glitch tipográfico','Faixas de cor e deslocamentos curtos produzem interferência sem flashes de tela inteira.',['glitch','recorte','deslocamento'],'HTML'],
 ['skeleton','Loaders','Skeleton / shimmer','Uma faixa luminosa atravessa um cartão de conteúdo simulado, inteiramente controlada pela linha do tempo.',['loader','shimmer','placeholder'],'HTML'],
 ['reveal','Texto','Revelação editorial','Letras sobem em sequência, cruzam uma máscara e desaparecem com um deslocamento discreto.',['máscara','stagger','editorial'],'HTML'],
 ['dots','Loaders','Pontos sequenciais','Pontos alternam altura, escala e luminosidade em um ciclo simples e contínuo.',['loader','sequência','loop'],'SVG']
].map((d,i)=>({id:d[0],category:d[1],title:d[2],description:d[3],tags:d[4],renderer:d[5],index:i+1}));
const svgDefs='<defs><linearGradient id="warm" x2="0" y2="1"><stop stop-color="#ffe3a4"/><stop offset="1" stop-color="#ff7849"/></linearGradient><linearGradient id="cold" x2="0" y2="1"><stop stop-color="#b2ffe0"/><stop offset="1" stop-color="#3e9c94"/></linearGradient><radialGradient id="halo"><stop stop-color="#ff7849" stop-opacity=".27"/><stop offset="1" stop-color="#ff7849" stop-opacity="0"/></radialGradient><radialGradient id="energy"><stop stop-color="#a6edd1" stop-opacity=".35"/><stop offset="1" stop-color="#a6edd1" stop-opacity="0"/></radialGradient><linearGradient id="sky" x2="0" y2="1"><stop id="sky-top" stop-color="#273d55"/><stop id="sky-bottom" offset="1" stop-color="#587472"/></linearGradient><clipPath id="liquid-clip"><circle cx="400" cy="226" r="88"/></clipPath></defs>';
function svgStage(host,content){
 host.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 460" aria-hidden="true">'+svgDefs+content+'</svg>';
 const root=host.firstElementChild;
 return {root,q:s=>root.querySelector(s),all:s=>Array.from(root.querySelectorAll(s))};
}
function circle(cx,cy,r,fill,extra=''){return '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+fill+'" '+extra+'/>'}
function label(text,x=400,y=410){return '<text x="'+x+'" y="'+y+'" text-anchor="middle" fill="#adc1c7" font-family="monospace" font-size="10" letter-spacing="3">'+text+'</text>'}
function floor(){return '<ellipse cx="400" cy="345" rx="215" ry="33" fill="#091319" opacity=".65"/><path d="M180 345H620M230 370H570" stroke="#536d75" stroke-opacity=".3"/>'}
function robot(){
 return '<g id="robot"><ellipse cx="0" cy="4" rx="42" ry="8" fill="#071117" opacity=".4"/><g id="legL" transform="translate(-13 -51)"><path d="M0 0L0 30L-3 49H13" fill="none" stroke="#93acb2" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><circle r="7" fill="#526e78"/></g><g id="legR" transform="translate(13 -51)"><path d="M0 0L0 30L-3 49H13" fill="none" stroke="#b8d2d2" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><circle r="7" fill="#526e78"/></g><g id="torso"><path d="M-22 -103Q0 -111 22 -103L19 -53Q0 -45 -19 -53Z" fill="#ff7849" stroke="#ffbd96" stroke-width="2"/><path d="M-11 -89H11V-66H-11Z" fill="#242f39"/><circle cy="-78" r="5" fill="#a6edd1"/><g id="armL" transform="translate(-23 -95)"><path d="M0 0L-6 23L-3 44" fill="none" stroke="#9db7bf" stroke-width="11" stroke-linecap="round"/><circle r="8" fill="#eeb089"/></g><g id="armR" transform="translate(23 -95)"><path d="M0 0L6 23L3 44" fill="none" stroke="#c6dad8" stroke-width="11" stroke-linecap="round"/><circle r="8" fill="#ffba8d"/><g id="sword" visibility="hidden"><path d="M3 43L46 -17L52 -32L35 -25L-6 39Z" fill="#bceee1" stroke="#e9fff5" stroke-width="2"/><path d="M-11 32L12 49" stroke="#f0b167" stroke-width="5"/></g></g><g id="head"><rect x="-24" y="-150" width="48" height="41" rx="14" fill="#d1ded7" stroke="#edf5ed" stroke-width="2"/><rect x="-18" y="-139" width="36" height="16" rx="6" fill="#182b34"/><path d="M-10 -132H-6M6 -132H10" stroke="#a6edd1" stroke-width="4" stroke-linecap="round"/><path d="M0 -150V-159" stroke="#d1ded7" stroke-width="3"/><circle cy="-161" r="4" fill="#ff7849"/></g></g></g>';
}
function makeCharacter(id,host){
 const s=svgStage(host,floor()+'<g id="trails">'+[0,1,2,3,4].map(i=>'<path d="M'+(200+i*21)+' '+(220+i*19)+'h70" stroke="#a6edd1" stroke-width="2" opacity=".25"/>').join('')+'</g><ellipse id="shadow" cx="400" cy="344" rx="43" ry="9" fill="#030b10" opacity=".75"/>'+robot()+'<path id="slash" d="M425 150Q535 230 446 314" stroke="#b7ffe1" stroke-width="8" fill="none" stroke-linecap="round"/>'+label('KINETIC / CHARACTER STUDY'));
 const body=s.q('#robot'),torso=s.q('#torso'),legs=[s.q('#legL'),s.q('#legR')],arms=[s.q('#armL'),s.q('#armR')],head=s.q('#head');
 return p=>{
  let x=400,y=341,angle=0,sx=1,sy=1,leg=0,arm=0,lean=0,headY=0,attackAngle=0,slash=0;
  const t=p*TAU;
  if(id==='idle'){sy=1+Math.sin(t)*.018;headY=Math.sin(t)*1.5;arm=Math.sin(t)*3}
  if(id==='walk'){leg=Math.sin(t*2)*30;arm=-leg*.8;y-=Math.abs(Math.sin(t*2))*5;x+=Math.sin(t)*35}
  if(id==='run'){leg=Math.sin(t*4)*54;arm=-leg;lean=11;y-=Math.abs(Math.sin(t*4))*10}
  if(id==='jump'){
   const air=clamp((p-.2)/.5);y-=Math.sin(air*Math.PI)*122;
   const prep=Math.sin(clamp(p/.2)*Math.PI),land=Math.sin(clamp((p-.7)/.2)*Math.PI);
   sy=1-prep*.17-land*.2+Math.sin(air*Math.PI)*.1;sx=1+prep*.1+land*.16;
   leg=Math.sin(air*Math.PI)*23;arm=-Math.sin(air*Math.PI)*45;
  }
  if(id==='dodge'){const d=smooth((p-.15)/.52);x=mix(290,510,d);angle=d*360;const e=Math.sin(clamp((p-.1)/.65)*Math.PI);y-=e*34;sy=1-e*.24;sx=1+e*.15}
  if(id==='attack'){const pre=pulse(p,.08,.72),hit=smooth((p-.29)/.16);attackAngle=(-85+hit*155)*pre;lean=pre*8;x+=hit*pre*20;slash=pulse(p,.35,.5);leg=-pre*15}
  attr(body,{transform:'translate('+x+' '+y+') rotate('+angle+') scale('+sx+' '+sy+')'});
  attr(torso,{transform:'rotate('+lean+' 0 -58)'});attr(head,{transform:'translate(0 '+headY+')'});
  legs.forEach((n,i)=>attr(n,{transform:'translate('+(i?13:-13)+' -51) rotate('+(i?leg:-leg)+')'}));
  arms.forEach((n,i)=>attr(n,{transform:'translate('+(i?23:-23)+' -95) rotate('+(i?(id==='attack'?attackAngle:arm):-arm)+')'}));
  attr(s.q('#shadow'),{cx:x,rx:43-(341-y)*.15,opacity:mix(.8,.3,clamp((341-y)/125))});
  attr(s.q('#sword'),{visibility:id==='attack'?'visible':'hidden'});
  attr(s.q('#slash'),{opacity:slash,transform:'translate('+(x-400)+' 0) scale(1 1)'});
  attr(s.q('#trails'),{opacity:id==='run'?.6+Math.sin(t*4)*.2:0,transform:'translate('+(-fract(p*4)*55)+' 0)'});
 };
}
function tree(x,y,scale=1,color='#3d7268',i=0){
 return '<g class="tree" data-x="'+x+'" data-y="'+y+'" data-scale="'+scale+'"><g class="tree-sway"><path d="M0 0V-75" stroke="#8e7460" stroke-width="9" stroke-linecap="round"/><path d="M0 -95L-38 -35H-22L-48 -5H48L22 -35H38Z" transform="translate(0 -22)" fill="'+color+'" stroke="#b7ead3" stroke-opacity=".12"/><path d="M0 -100V-37" stroke="#c7f1df" stroke-opacity=".15" stroke-width="2"/></g></g>';
}
function village(){
 return '<path d="M215 341Q290 285 400 310T600 335L568 370H245Z" fill="#3b5c59"/><path d="M360 365L393 319H416L432 365" fill="#78948b"/>'+[[310,291,1],[447,277,.85],[520,309,.65]].map((a,i)=>'<g transform="translate('+a[0]+' '+a[1]+') scale('+a[2]+')"><path d="M-36 0V-56H36V0Z" fill="#b7c4b4"/><path d="M-47 -56L0 -94L47 -56Z" fill="'+(i===0?'#ca775c':'#536c83')+'"/><rect x="-7" y="-27" width="14" height="27" rx="3" fill="#263d40"/><rect class="window" x="-26" y="-43" width="11" height="13" rx="2" fill="#ffd78c"/><rect class="window" x="16" y="-43" width="11" height="13" rx="2" fill="#ffd78c"/></g>').join('');
}
function makeWorld(id,host){
 let html='';
 if(['wind','fog','rain'].includes(id)){
  html='<path d="M130 340Q260 300 400 325T680 330L590 375H230Z" fill="#315453" stroke="#74988b" stroke-opacity=".3"/>';
  html+=[[245,313,1.3,'#33594f'],[555,307,1.25,'#355d57'],[330,337,1,'#508875'],[465,344,1,'#4f8977'],[195,340,.7,'#427b6c'],[605,350,.7,'#427b6c']].map(a=>tree(...a)).join('');
 }
 if(id==='wind')html+='<g id="leaves">'+Array.from({length:23},(_,i)=>'<ellipse rx="5" ry="2" fill="'+(i%2?'#b8d2a0':'#ffb08b')+'"/>').join('')+'</g>';
 if(id==='rain')html+='<g id="drops">'+Array.from({length:90},()=>'<path d="M0 0l-6 17" stroke="#b1d7e6" stroke-width="1.5"/>').join('')+'</g><g id="splashes">'+Array.from({length:15},()=>'<ellipse rx="9" ry="2.5" fill="none" stroke="#a6d9d9"/>').join('')+'</g>';
 if(id==='fog')html+='<g id="fog">'+[0,1,2,3,4].map(i=>'<ellipse cx="400" cy="'+(260+i*20)+'" rx="'+(160+i*23)+'" ry="'+(16+i*3)+'" fill="#aecbd0"/>').join('')+'</g>';
 if(id==='fire')html='<ellipse cx="400" cy="300" rx="200" ry="160" fill="url(#halo)"/>'+floor()+'<g transform="translate(400 325)"><path d="M-50 -5L45 15M-44 16L47 -8" stroke="#72574d" stroke-width="17" stroke-linecap="round"/><path d="M-50 -7L45 13M-44 14L47 -10" stroke="#aa7e60" stroke-width="3"/><g id="flames"><path d="M-30 0Q-62 -36 -16 -91Q-18 -65 2 -58Q38 -100 13 -146Q82 -73 41 -28Q40 -7 28 0Z" fill="#ff7849"/><path d="M-19 0Q-34 -28 -6 -61Q-8 -35 9 -28Q33 -64 15 -89Q55 -39 20 0Z" fill="#ffc86f"/><path d="M-8 0Q-18 -21 1 -42Q26 -19 9 0Z" fill="#fff0b6"/></g></g><g id="embers">'+Array.from({length:28},()=>circle(0,0,2,'#ffd18f')).join('')+'</g>';
 if(id==='water')html='<ellipse cx="400" cy="252" rx="232" ry="115" fill="#193942" stroke="#658e94"/><ellipse cx="400" cy="252" rx="214" ry="101" fill="#204b59"/><g id="waves">'+Array.from({length:11},()=>'<path fill="none" stroke="#8cd5cf" stroke-width="1.5"/>').join('')+'</g><g id="ripples">'+Array.from({length:4},()=>'<ellipse cx="400" cy="248" fill="none" stroke="#c3eadd" stroke-width="1.5"/>').join('')+'</g>'+label('SURFACE / CONTINUOUS WAVES');
 if(id==='daynight')html='<rect x="130" y="70" width="540" height="310" rx="160" fill="url(#sky)"/><g id="stars">'+Array.from({length:24},(_,i)=>circle(170+rng(i)*460,90+rng(i,2)*175,1+rng(i,3),'#dff9e8')).join('')+'</g><circle id="sun" r="24" fill="#ffd08d"/><circle id="moon" r="18" fill="#d2ede0"/><path d="M155 300L265 165L380 310L493 199L650 310V340H155Z" fill="#273e4b"/><path d="M155 320L270 245L375 325L550 240L650 320V350H155Z" fill="#355d60"/>'+village()+label('WORLD / TIME OF DAY');
 const s=svgStage(host,html+(id==='fire'?label('ELEMENT / FIRE'):id==='wind'?label('WORLD / WIND'):id==='rain'?label('WORLD / RAIN'):id==='fog'?label('WORLD / FOG'):''));
 const trees=s.all('.tree');
 trees.forEach(n=>attr(n,{transform:'translate('+n.dataset.x+' '+n.dataset.y+') scale('+n.dataset.scale+')'}));
 return p=>{
  const t=p*TAU;
  trees.forEach((n,i)=>attr(n.firstElementChild,{transform:'rotate('+(Math.sin(t+i*.8)*(id==='wind'?6:1.2))+' 0 0)'}));
  if(id==='wind')s.all('#leaves ellipse').forEach((n,i)=>{const f=fract(p*(1+rng(i,4))+rng(i));attr(n,{transform:'translate('+mix(125,680,f)+' '+(135+rng(i,2)*180+Math.sin(t*2+i)*15)+') rotate('+(f*600+i*30)+')',opacity:Math.sin(f*Math.PI)*.85})});
  if(id==='rain'){
   s.all('#drops path').forEach((n,i)=>{const f=fract(p*(3+rng(i,7)*2)+rng(i));attr(n,{transform:'translate('+(140+rng(i,3)*550-f*50)+' '+mix(50,350,f)+')',opacity:.18+rng(i,4)*.5})});
   s.all('#splashes ellipse').forEach((n,i)=>{const f=fract(p*3+rng(i));attr(n,{cx:210+rng(i,2)*380,cy:320+rng(i,5)*43,rx:3+f*9,ry:1+f*3,opacity:(1-f)*.5})});
  }
  if(id==='fog')s.all('#fog ellipse').forEach((n,i)=>attr(n,{transform:'translate('+(Math.sin(t+i)*60)+' '+(Math.cos(t+i)*6)+')',opacity:.08+Math.sin(t+i)*.025}));
  if(id==='fire'){
   s.all('#flames path').forEach((n,i)=>attr(n,{transform:'scale('+(1+Math.sin(t*6+i)*.055)+' '+(1+Math.sin(t*7+i*2)*.08)+')'}));
   s.all('#embers circle').forEach((n,i)=>{const f=fract(p*2+rng(i));attr(n,{cx:400+Math.sin(f*5+i)*(12+f*40),cy:mix(311,115,f),r:mix(2.7,.5,f),opacity:Math.sin(f*Math.PI)})});
  }
  if(id==='water'){
   s.all('#waves path').forEach((n,i)=>{const yy=184+i*14,span=Math.sqrt(Math.max(0,1-Math.pow((yy-252)/100,2)))*195;let d='';for(let x=-span;x<=span;x+=5)d+=(x===-span?'M':'L')+(400+x)+' '+(yy+Math.sin(x*.035+t*2+i)*3);attr(n,{d,opacity:.18+(i%3)*.1})});
   s.all('#ripples ellipse').forEach((n,i)=>{const f=fract(p+i*.25);attr(n,{rx:12+f*145,ry:4+f*44,opacity:(1-f)*.65})});
  }
  if(id==='daynight'){
   const day=(Math.sin(t)+1)/2;
   const color=(a,b)=>'rgb('+a.map((v,i)=>Math.round(mix(v,b[i],day))).join(',')+')';
   attr(s.q('#sky-top'),{'stop-color':color([17,27,48],[83,149,166])});
   attr(s.q('#sky-bottom'),{'stop-color':color([52,65,83],[232,183,140])});
   attr(s.q('#stars'),{opacity:1-day});
   attr(s.q('#sun'),{cx:400+Math.cos(t)*165,cy:230-Math.sin(t)*112,opacity:smooth(day)});
   attr(s.q('#moon'),{cx:400-Math.cos(t)*165,cy:230+Math.sin(t)*112,opacity:1-smooth(day)});
   s.all('.window').forEach(n=>attr(n,{opacity:mix(1,.25,day)}));
  }
 };
}
function makeEffect(id,host){
 let html=floor();
 if(id==='portal')html+='<ellipse cx="400" cy="235" rx="185" ry="150" fill="url(#energy)"/><g id="portal" transform="translate(400 235)"><ellipse rx="91" ry="119" fill="#10292f" stroke="#a6edd1" stroke-width="2"/><g id="outer"><ellipse rx="108" ry="139" fill="none" stroke="#ffb08a" stroke-width="3" stroke-dasharray="72 12 5 18"/><ellipse rx="119" ry="152" fill="none" stroke="#a6edd1" stroke-width="1" stroke-dasharray="3 17"/></g><g id="inner"><ellipse rx="78" ry="104" fill="none" stroke="#77c4b3" stroke-width="3" stroke-dasharray="30 18"/></g><path d="M-35 0L0 -55L35 0L0 55Z" fill="none" stroke="#c9ffe8" stroke-width="2"/></g><g id="particles">'+Array.from({length:30},()=>circle(0,0,2,'#b9ffe2')).join('')+'</g>';
 if(id==='heal')html+='<ellipse cx="400" cy="275" rx="180" ry="135" fill="url(#energy)"/><g id="heal-rings">'+Array.from({length:5},()=>'<ellipse cx="400" fill="none" stroke="#a6edd1" stroke-width="2"/>').join('')+'</g><g id="heal-parts">'+Array.from({length:18},()=>'<path d="M-5 0H5M0 -5V5" stroke="#caffdf" stroke-width="2" stroke-linecap="round"/>').join('')+'</g><g transform="translate(400 233)"><path d="M-13 -41H13V-13H41V13H13V41H-13V13H-41V-13H-13Z" fill="#a6edd1" stroke="#e4fff0" stroke-width="2"/></g>';
 if(id==='projectile')html+='<path d="M190 252H620" stroke="#56727a" stroke-dasharray="4 9" opacity=".5"/><circle cx="615" cy="252" r="32" fill="#263b43" stroke="#5e7780"/><path d="M600 252H630M615 237V267" stroke="#b8cbd0"/><g id="tail">'+Array.from({length:15},()=>circle(0,252,8,'#ff9a68')).join('')+'</g><g id="bolt"><ellipse rx="48" ry="23" fill="url(#halo)"/><path d="M-35 0Q-3 -16 12 0Q-3 16 -35 0Z" fill="#ffb57d"/><circle r="9" fill="#fff0bb"/></g><circle id="impact" cx="615" cy="252" fill="none" stroke="#ffce9d" stroke-width="3"/>';
 if(id==='explosion')html+='<g id="blast-rays">'+Array.from({length:44},()=>'<path d="M0 0h12" stroke="#ffb585" stroke-width="3" stroke-linecap="round"/>').join('')+'</g><circle id="blast-ring" cx="400" cy="242" fill="none" stroke="#ffb384" stroke-width="3"/><circle id="blast-core" cx="400" cy="242" r="48" fill="url(#warm)"/><circle id="blast-light" cx="400" cy="242" r="155" fill="url(#halo)"/>';
 if(id==='shield'){
  html+='<circle cx="400" cy="240" r="137" fill="url(#energy)"/><g id="hexes">';
  for(let row=-2;row<=2;row++)for(let col=-2;col<=2;col++){const x=col*34+(row%2?17:0),y=row*30;if(x*x+y*y<10000){const points=Array.from({length:6},(_,k)=>(x+Math.cos(k*TAU/6)*19)+','+(y+Math.sin(k*TAU/6)*19)).join(' ');html+='<polygon points="'+points+'" fill="#91e9cb" fill-opacity=".05" stroke="#a6edd1" stroke-width="1"/>'}}
  html+='</g><circle id="shield-ring" cx="400" cy="240" r="120" fill="none" stroke="#b7ffe5" stroke-width="2" stroke-dasharray="170 28 10 28"/><path d="M400 199L428 210V241Q427 260 400 276Q373 260 372 241V210Z" fill="#baffde" fill-opacity=".15" stroke="#d0fff0" stroke-width="2"/>';
 }
 if(id==='lightning')html+='<circle cx="250" cy="249" r="48" fill="url(#energy)"/><circle cx="550" cy="249" r="48" fill="url(#halo)"/>'+circle(250,249,14,'#a6edd1')+circle(550,249,14,'#ff9b72')+'<path id="lightning-glow" stroke="#a6edd1" stroke-width="10" stroke-opacity=".1" fill="none" stroke-linejoin="round"/><path id="lightning-main" stroke="#d2ffec" stroke-width="2.5" fill="none" stroke-linejoin="round"/><path id="branch" stroke="#ffb597" stroke-width="1.5" fill="none"/>';
 const s=svgStage(host,html+label('ZERO / '+({portal:'DIMENSIONAL FIELD',heal:'RESTORATION',projectile:'ENERGY PROJECTILE',explosion:'RADIAL BURST',shield:'ENERGY SHIELD',lightning:'ELECTRIC ARC'}[id])));
 return p=>{
  const t=p*TAU;
  if(id==='portal'){
   const e=.8+Math.sin(t)*.07;
   attr(s.q('#portal'),{transform:'translate(400 235) scale('+e+')'});
   attr(s.q('#outer'),{transform:'rotate('+(p*360)+')'});attr(s.q('#inner'),{transform:'rotate('+(-p*360)+')'});
   s.all('#particles circle').forEach((n,i)=>{const a=t+i*TAU/30,rr=118+rng(i)*30;attr(n,{cx:400+Math.cos(a)*rr,cy:235+Math.sin(a)*rr*1.12,r:1+rng(i,2)*2,opacity:.3+(Math.sin(a)+1)*.25})});
  }
  if(id==='heal'){
   s.all('#heal-rings ellipse').forEach((n,i)=>{const f=fract(p+i/5);attr(n,{cy:320-f*160,rx:90*(1-f*.55),ry:25*(1-f*.55),opacity:Math.sin(f*Math.PI)*.8})});
   s.all('#heal-parts path').forEach((n,i)=>{const f=fract(p+rng(i));attr(n,{transform:'translate('+(335+rng(i,2)*130+Math.sin(f*5+i)*12)+' '+(330-f*190)+')',opacity:Math.sin(f*Math.PI)*.7})});
  }
  if(id==='projectile'){
   const flight=clamp((p-.16)/.48),x=mix(190,615,flight*flight),impact=clamp((p-.64)/.3);
   attr(s.q('#bolt'),{transform:'translate('+x+' 252)',opacity:1-smooth(impact/.25)});
   s.all('#tail circle').forEach((n,i)=>attr(n,{cx:x-i*8,cy:252+Math.sin(t*4-i)*2,r:8-i*.45,opacity:clamp(flight*5)*(1-i/15)*.6*(1-smooth(impact/.3))}));
   attr(s.q('#impact'),{r:12+out(impact)*65,opacity:impact>0?(1-impact):0});
  }
  if(id==='explosion'){
   const e=clamp((p-.14)/.72),grow=out(e);
   attr(s.q('#blast-core'),{r:5+grow*65,opacity:p>.14?Math.pow(1-e,3):0});
   attr(s.q('#blast-ring'),{r:8+grow*144,opacity:p>.14?(1-e)*.85:0});
   attr(s.q('#blast-light'),{opacity:p>.14?Math.pow(1-e,2):0});
   s.all('#blast-rays path').forEach((n,i)=>{const a=i*TAU/44,rr=12+grow*(80+rng(i)*100);attr(n,{transform:'translate('+(400+Math.cos(a)*rr)+' '+(242+Math.sin(a)*rr)+') rotate('+(a*180/Math.PI)+') scale('+(1-e)+')',opacity:p>.14?(1-e)*.85:0})});
  }
  if(id==='shield'){
   const q=(Math.sin(t)+1)/2;
   attr(s.q('#shield-ring'),{transform:'rotate('+(p*360)+' 400 240)',r:117+q*4});
   attr(s.q('#hexes'),{transform:'translate(400 240) scale('+(1+q*.025)+')'});
   s.all('#hexes polygon').forEach((n,i)=>attr(n,{opacity:.2+Math.pow((Math.sin(t+i*.5)+1)/2,3)*.6}));
  }
  if(id==='lightning'){
   // O traçado muda em pequenos passos; a luminância permanece moderada.
   const key=Math.floor(p*18),e=.15+.65*Math.pow((Math.sin(t*2)+1)/2,4);
   let d='M250 249';
   for(let i=1;i<15;i++)d+='L'+(250+i*20)+' '+(249+(rng(i,key+2)-.5)*65);
   d+='L550 249';
   attr(s.q('#lightning-main'),{d,opacity:e});attr(s.q('#lightning-glow'),{d,opacity:e*.8});
   attr(s.q('#branch'),{d:'M390 249L420 205L445 216L464 183',opacity:e*.55});
  }
 };
}
function makeInterface(id,host){
 host.innerHTML='<div class="html-demo"></div>';
 const box=host.firstElementChild;let update;
 const q=s=>box.querySelector(s),all=s=>Array.from(box.querySelectorAll(s));
 if(id==='modal'){
  box.innerHTML='<div class="mock-backdrop"></div><div class="mock-window"><div class="mock-icon">✦</div><h3>Uma nova possibilidade.</h3><p>Movimento dá contexto.<br>Uma entrada suave faz toda a diferença.</p><span class="mock-action">Vamos experimentar '+arrowIcon+'</span><span class="mock-ghost">Talvez depois</span></div>';
  update=p=>{const e=pulse(p,.02,.78),v=out(e),overshoot=Math.sin(e*Math.PI)*.07;Object.assign(q('.mock-window').style,{opacity:v,transform:'translateY('+((1-v)*35)+'px) scale('+(mix(.85,1,v)+overshoot)+')'});q('.mock-backdrop').style.opacity=v*.8};
 }
 if(id==='toast'){
  box.innerHTML=[0,1,2].map((_,i)=>'<div class="toast"><div class="check">✓</div><div><strong>'+['Tudo pronto.','Movimento salvo.','Próxima ideia?'][i]+'</strong><small>'+['Seu experimento está no ar.','Uma boa ideia merece outra.','Continue explorando.'][i]+'</small></div><div class="toast-progress"></div></div>').join('');
  update=p=>all('.toast').forEach((n,i)=>{const local=clamp((p-i*.15)/.18),end=1-smooth((p-.82)/.18),e=out(local)*end;n.style.transform='translate('+((1-e)*65)+'px,'+(-75+i*78)+'px)';n.style.opacity=e;n.querySelector('.toast-progress').style.transform='scaleX('+(1-clamp((p-i*.15)/.8))+')'});
 }
 if(id==='nav'){
  box.innerHTML='<div class="nav-demo"><div class="nav-pill"></div><span>Visão geral</span><span>Explorar</span><span>Coleção</span></div>';
  update=p=>{const step=p*3,i=Math.min(2,Math.floor(step)),next=(i+1)%3,f=smooth(clamp((fract(step)-.45)/.4));const pos=mix(i,next,f);q('.nav-pill').style.transform='translateX('+(pos*(q('.nav-demo').clientWidth-18)/3)+'px)';all('.nav-demo span').forEach((n,k)=>n.style.color=Math.abs(pos-k)<.45?'#241912':'#c8d6d9')};
 }
 if(id==='counter'){
  box.innerHTML='<div class="mock-window"><div class="stat-top">ENERGIA CRIATIVA</div><div class="stat-value"><span id="stat-number">0</span><small style="font-size:22px;color:#a6edd1">%</small></div><div class="stat-bars">'+[20,37,28,47,55,45,68,61,70].map(v=>'<i style="height:'+v+'px"></i>').join('')+'</div><p style="margin:12px 0 0">Dados ilustrativos · movimento real.</p></div>';
  update=p=>{const e=out(clamp(p/.64))*(1-smooth((p-.87)/.13));q('#stat-number').textContent=Math.round(e*100);all('.stat-bars i').forEach((n,i)=>n.style.transform='scaleY('+out(clamp((e-i*.045)/.65))+')')};
 }
 if(id==='cards'){
  box.classList.add('cards-demo');
  box.innerHTML=[0,1,2].map((n,i)=>'<div class="fan-card"><small>ESTUDO / 0'+(i+1)+'</small><b>'+['<svg class="card-icon" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 3V45M3 24H45M9 9L39 39M9 39L39 9"/></svg>','<svg class="card-icon" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4L44 24L24 44L4 24Z M24 13L35 24L24 35L13 24Z"/></svg>','<svg class="card-icon" viewBox="0 0 48 48" aria-hidden="true"><path d="M8 40L40 8M10 8H40V38"/></svg>'][i]+'</b><span style="font-size:13px;font-weight:650">'+['Imaginar.','Experimentar.','Mover.'][i]+'</span></div>').join('');
  update=p=>all('.fan-card').forEach((n,i)=>{const e=out(clamp((p-i*.045)/.4))*(1-smooth((p-.82)/.18));n.style.transform='translate('+((i-1)*88*e)+'px,'+(-Math.sin(p*TAU+i)*3*e)+'px) rotate('+((i-1)*22*e)+'deg)';n.style.opacity=.5+e*.5});
 }
 if(id==='cta'){
  box.innerHTML='<div class="cta-wrap"><div class="cta-ripple"></div><div class="cta">Criar movimento <span style="padding-left:15px">'+arrowIcon+'</span></div><div class="cursor"></div></div>';
  update=p=>{const click=clamp((p-.44)/.14),press=Math.sin(click*Math.PI),hover=pulse(p,.15,.7);q('.cta').style.transform='translateY('+(-hover*4)+'px) scale('+(1+hover*.03-press*.09)+')';q('.cursor').style.transform='translate('+((1-out(clamp(p/.4)))*85)+'px,'+((1-out(clamp(p/.4)))*65)+'px)';const r=clamp((p-.5)/.35);q('.cta-ripple').style.transform='scale('+(.4+r*.8)+')';q('.cta-ripple').style.opacity=p>.5?(1-r)*.7:0};
 }
 return update;
}
function makeText(id,host){
 host.innerHTML='<div class="html-demo"><div class="text-demo"></div></div>';
 const box=host.querySelector('.text-demo'),q=s=>box.querySelector(s);
 if(id==='typewriter'){
  box.innerHTML='<div class="type-line"><span id="typed"></span><i class="type-caret"></i></div><div class="text-sub">Ideias ganham movimento.</div>';
  return p=>{const phrase='Vamos criar algo.',v=p<.7?clamp(p/.58):1-clamp((p-.8)/.2);q('#typed').textContent=phrase.slice(0,Math.floor(v*phrase.length));q('.type-caret').style.opacity=(Math.floor(p*12)%2)?0:1};
 }
 if(id==='wave'||id==='reveal'){
  const word=id==='wave'?'MOVIMENTO':'EXPERIMENTE';
  box.innerHTML='<div class="letters '+(id==='reveal'?'reveal':'')+'">'+Array.from(word).map(c=>'<span>'+c+'</span>').join('')+'</div><div class="text-sub">'+(id==='wave'?'Um ritmo para cada letra.':'Uma letra. Um novo começo.')+'</div>';
  const letters=Array.from(box.querySelectorAll('.letters span'));
  return p=>letters.forEach((n,i)=>{
   if(id==='wave'){const a=p*TAU-i*.5;n.style.transform='translateY('+(Math.sin(a)*16)+'px) rotate('+(Math.sin(a)*5)+'deg)';n.style.color=Math.sin(a)>.4?'#a6edd1':'#edf4f1'}
   else{const e=out(clamp((p-i*.035)/.25))*(1-smooth((p-.85)/.15));n.style.transform='translateY('+((1-e)*95)+'px) rotate('+((1-e)*10)+'deg)';n.style.opacity=e}
  });
 }
 if(id==='glitch'){
  box.innerHTML='<div class="glitch">SIGNAL<span aria-hidden="true">SIGNAL</span><span aria-hidden="true">SIGNAL</span></div><div class="text-sub">Interferência controlada.</div>';
  const layers=box.querySelectorAll('.glitch span');
  return p=>{const e=Math.pow((Math.sin(p*TAU*2)+1)/2,10),k=Math.floor(p*30);layers.forEach((n,i)=>{n.style.transform='translate('+((rng(k,i+1)-.5)*24*e)+'px,'+((rng(k,i+3)-.5)*5*e)+'px)';n.style.opacity=e*.85})};
 }
}
function makeLoader(id,host){
 if(id==='skeleton'){
  host.innerHTML='<div class="html-demo"><div class="skeleton"><div class="skeleton-head"><div class="skeleton-circle"></div><div class="skeleton-lines"><div class="skeleton-line" style="width:75%"></div><div class="skeleton-line" style="width:45%"></div></div></div><div class="skeleton-image"></div><div class="skeleton-line" style="margin-top:20px"></div><div class="skeleton-line" style="width:65%"></div></div></div>';
  return p=>host.firstElementChild.style.setProperty('--sweep',mix(-140,140,p)+'%');
 }
 let html='';
 if(id==='orbit')html='<g transform="translate(400 230)"><ellipse rx="114" ry="47" fill="none" stroke="#67868b" transform="rotate(-30)"/><ellipse rx="114" ry="47" fill="none" stroke="#67868b" transform="rotate(30)"/><ellipse rx="114" ry="47" fill="none" stroke="#67868b" transform="rotate(90)"/><circle r="16" fill="#a6edd1"/><g id="satellites">'+[0,1,2].map((_,i)=>circle(0,0,7,['#ff956f','#a6edd1','#e3d3a0'][i])).join('')+'</g></g>'+label('LOADING / ORBITAL');
 if(id==='liquid')html='<circle cx="400" cy="226" r="94" fill="#203b43" stroke="#6d9698"/><g clip-path="url(#liquid-clip)"><path id="liquid-back" fill="#4a9a98"/><path id="liquid-wave" fill="#a6edd1"/></g><text id="liquid-number" x="400" y="235" fill="#eefaf3" stroke="#1b4a4933" stroke-width="1" font-family="system-ui,sans-serif" font-size="32" font-weight="650" text-anchor="middle">0%</text>'+label('LOADING / LIQUID STUDY');
 if(id==='dots')html='<g id="dots">'+[0,1,2,3,4].map((_,i)=>circle(320+i*40,230,10,'#a6edd1')).join('')+'</g>'+label('LOADING / SEQUENCE',400,330);
 const s=svgStage(host,html);
 return p=>{
  const t=p*TAU;
  if(id==='orbit')s.all('#satellites circle').forEach((n,i)=>{const a=t*(i+1),r=(i*60-30)*Math.PI/180,x=Math.cos(a)*114,y=Math.sin(a)*47;attr(n,{cx:x*Math.cos(r)-y*Math.sin(r),cy:x*Math.sin(r)+y*Math.cos(r)})});
  if(id==='dots')s.all('#dots circle').forEach((n,i)=>{const e=(Math.sin(t-i*.8)+1)/2;attr(n,{cy:230-e*24,r:7+e*5,opacity:.3+e*.7,fill:i%2?'#ff9c79':'#a6edd1'})});
  if(id==='liquid'){
   const level=(1-Math.cos(t))*.5,yy=310-level*166;
   for(const [selector,phase,offset] of [['#liquid-back',0,-5],['#liquid-wave',Math.PI,3]]){let d='M300 330L300 '+yy;for(let x=300;x<=500;x+=5)d+='L'+x+' '+(yy+offset+Math.sin(x*.055+t*2+phase)*6);d+='L500 330Z';attr(s.q(selector),{d})}
   s.q('#liquid-number').textContent=Math.round(level*100)+'%';
  }
 };
}
function mountDemo(def,host){
 const factory={Personagem:makeCharacter,Cenários:makeWorld,Efeitos:makeEffect,Interface:makeInterface,Texto:makeText,Loaders:makeLoader}[def.category];
 if(!factory)throw new Error('Categoria desconhecida.');
 const render=factory(def.id,host);
 if(typeof render!=='function')throw new Error('Esta animação não possui renderizador.');
 return render;
}
const state={id:'portal',category:'Todos',query:'',playing:!matchMedia('(prefers-reduced-motion: reduce)').matches,loop:true,speed:1,duration:4,progress:0,render:null,last:0,frames:0,error:null};
const CATEGORIES=['Todos','Interface','Personagem','Cenários','Efeitos','Texto','Loaders'];
let filtered=[];
function announce(message){$('announcement').textContent=message}
function fail(error){
 state.error=error.message||String(error);state.playing=false;
 $('error').textContent='Falha ao renderizar: '+state.error+'. Tente selecionar outra demonstração.';
 $('error').hidden=false;syncPlayback();console.error(error);
}
function syncPlayback(){
 $('play-label').textContent=state.playing?'Pausar':'Reproduzir';
 $('play').setAttribute('aria-label',state.playing?'Pausar animação':'Reproduzir animação');
 $('play').querySelector('.glyph').innerHTML=state.playing?pauseIcon:playIcon;
 $('live').textContent=state.playing?'LIVE':'PAUSADO';
 $('state-value').textContent=state.playing?'LIVE':'PAUSA';
}
function draw(){
 if(!state.render||state.error)return;
 try{state.render(state.progress);state.frames++}catch(error){fail(error);return}
 $('timeline').value=Math.round(state.progress*1000);
 $('timeline').setAttribute('aria-valuetext',Math.round(state.progress*100)+'%');
 $('time').textContent=(state.progress*state.duration).toFixed(2)+' / '+state.duration.toFixed(2)+' s';
 $('progress-value').textContent=Math.round(state.progress*100)+'%';
 $('frame-value').textContent=String(Math.round(state.progress*state.duration*60)).padStart(3,'0');
}
function renderFilters(){
 $('filters').replaceChildren(...CATEGORIES.map(category=>{
  const b=document.createElement('button');b.type='button';b.className='filter';b.textContent=category;
  b.setAttribute('aria-pressed',String(category===state.category));
  b.addEventListener('click',()=>{state.category=category;renderFilters();renderList()});return b;
 }));
}
function renderList(){
 const list=$('demo-list'),scrollTop=list.scrollTop,scrollLeft=list.scrollLeft;
 const focusedId=document.activeElement&&document.activeElement.dataset.demo;
 const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const query=normalize(state.query.trim());
 filtered=catalog.filter(d=>(state.category==='Todos'||d.category===state.category)&&normalize([d.title,d.category,...d.tags].join(' ')).includes(query));
 $('count').textContent=filtered.length+' / '+catalog.length;
 $('demo-list').replaceChildren(...filtered.map(def=>{
  const b=document.createElement('button');b.type='button';b.className='demo-item';b.dataset.demo=def.id;b.setAttribute('aria-current',String(def.id===state.id));
  const number=document.createElement('span');number.className='demo-number mono';number.textContent=String(def.index).padStart(2,'0');
  const content=document.createElement('span'),name=document.createElement('span'),category=document.createElement('span');
  name.className='demo-name';name.textContent=def.title;category.className='demo-cat';category.textContent=def.category;content.append(name,category);
  const mark=document.createElement('span');mark.className='item-mark';mark.innerHTML=arrowIcon;mark.setAttribute('aria-hidden','true');
  b.append(number,content,mark);b.addEventListener('click',()=>selectDemo(def.id));return b;
 }));
 if(!filtered.length){const p=document.createElement('p');p.className='empty';p.textContent='Nenhum estudo encontrado. Tente outra palavra ou categoria.';$('demo-list').append(p)}
 list.scrollTop=scrollTop;list.scrollLeft=scrollLeft;
 if(focusedId){const button=list.querySelector('[data-demo="'+focusedId+'"]');if(button)button.focus({preventScroll:true})}
}
function selectDemo(id,updateHash=true){
 const def=catalog.find(d=>d.id===id);if(!def)return;
 state.id=id;state.progress=0;state.last=0;state.error=null;$('error').hidden=true;
 $('preview-title').textContent=def.title;$('detail-title').textContent=def.title;
 $('detail-category').textContent=def.category+' / '+String(def.index).padStart(2,'0');
 $('preview-id').textContent='ZERO—'+String(def.index).padStart(2,'0');
 $('description').textContent=def.description;$('render-value').textContent=def.renderer;
 $('stage-label').textContent=def.renderer==='SVG'?'ESTUDO VETORIAL / 800 × 460':'ESTUDO DE INTERFACE / HTML + CSS';
 $('preview').setAttribute('aria-label',def.title+'. '+def.description);
 $('tags').replaceChildren(...def.tags.map(text=>{const span=document.createElement('span');span.className='tag';span.textContent=text;return span}));
 try{state.render=mountDemo(def,$('preview'));draw()}catch(error){fail(error)}
 renderList();
 const selected=$('demo-list').querySelector('[data-demo="'+id+'"]');
 if(selected){
  const list=$('demo-list');
  if(matchMedia('(max-width: 650px)').matches)list.scrollLeft=selected.offsetLeft-(list.clientWidth-selected.offsetWidth)/2;
  else if(selected.offsetTop<list.scrollTop||selected.offsetTop+selected.offsetHeight>list.scrollTop+list.clientHeight)list.scrollTop=selected.offsetTop-list.clientHeight/2+selected.offsetHeight/2;
 }
 syncPlayback();announce(def.title+' selecionado.');
 if(updateHash){try{history.replaceState(null,'','#'+id)}catch(_){/* Visualização continua disponível sem histórico. */}}
}
function togglePlay(){if(state.error)return;if(!state.playing&&state.progress>=1)state.progress=0;state.playing=!state.playing;state.last=0;draw();syncPlayback()}
function seek(progress){state.progress=clamp(progress);state.last=0;draw()}
$('search').addEventListener('input',event=>{state.query=event.target.value;renderList()});
$('play').addEventListener('click',togglePlay);
$('restart').addEventListener('click',()=>{seek(0);announce('Animação reiniciada.')});
$('timeline').addEventListener('input',event=>{state.playing=false;seek(Number(event.target.value)/1000);syncPlayback()});
$('loop').addEventListener('change',event=>{state.loop=event.target.checked});
$('speed').addEventListener('change',event=>{state.speed=Number(event.target.value);state.last=0});
$('duration').addEventListener('input',event=>{state.duration=Number(event.target.value);$('duration-value').textContent=state.duration.toFixed(1).replace('.',',')+' s';state.last=0;draw()});
$('theme').addEventListener('click',()=>{const light=$('stage').classList.toggle('light');$('theme').setAttribute('aria-pressed',String(light));$('theme').textContent=light?'Fundo escuro ◑':'Fundo claro ◐'});
$('download').addEventListener('click',()=>{
 const blob=new Blob([ORIGINAL_SOURCE],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='ZERO_MOTION_STUDIO.html';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);announce('Download do laboratório iniciado.');
});
document.addEventListener('keydown',event=>{
 if(event.ctrlKey||event.metaKey||event.altKey||/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(event.target.tagName)||event.target.isContentEditable)return;
 if(event.code==='Space'){event.preventDefault();togglePlay()}
 if(event.code==='ArrowLeft'||event.code==='ArrowRight'){event.preventDefault();state.playing=false;seek(state.progress+(event.code==='ArrowRight'?.05:-.05));syncPlayback()}
});
document.addEventListener('visibilitychange',()=>{state.last=0});
window.addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(catalog.some(d=>d.id===id)&&id!==state.id)selectDemo(id,false)});
function tick(now){
 if(!document.hidden&&state.playing&&!state.error){
  if(state.last){state.progress+=(now-state.last)/1000*state.speed/state.duration;if(state.progress>=1){if(state.loop)state.progress%=1;else{state.progress=1;state.playing=false;syncPlayback()}}}
  state.last=now;draw();
 }else state.last=0;
 requestAnimationFrame(tick);
}
$('reduced-notice').hidden=state.playing;
renderFilters();
selectDemo(catalog.some(d=>d.id===location.hash.slice(1))?location.hash.slice(1):'portal');
requestAnimationFrame(tick);
