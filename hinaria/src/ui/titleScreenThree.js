/**
 * HINÁRIA · Tela de título em Three.js (V1)
 * - Fundo WebGL com crossfade entre as imagens, desfoque do fundo, Ken Burns, parallax e brasas.
 * - Animação da interface com anime.js (carregado de forma opcional; sem ele usa CSS).
 * - Renderer próprio e descartável: some junto com #cover e libera GPU. Não toca no jogo.
 */
import * as THREE from 'three';

const BLACK = '#000000';
// Somente as duas artes P&B. bg = cor do fade nas bordas (preto, sem desfoque).
const IMAGES = [
  { src: 'assets/ui/title-reference-01.jpg', bg: BLACK, gray: true },
  { src: 'assets/ui/title-reference-02.jpg', bg: BLACK, gray: true }
];
const HOLD_MS = 4200;   // tempo parado em cada imagem
const FADE_MS = 1700;   // duração do crossfade

const BG_VERT = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`;
const BG_FRAG = `
uniform sampler2D uA; uniform sampler2D uB;
uniform float uAspectA, uAspectB, uAspect, uMix, uTime, uFade, uKbA, uKbB, uGrayA, uGrayB;
uniform vec3 uBgA, uBgB;
uniform vec2 uPointer;
varying vec2 vUv;
vec2 coverUv(vec2 uv,float ia,float sa,float z){ vec2 s=sa>ia?vec2(1.0,ia/sa):vec2(sa/ia,1.0); return (uv-0.5)*s/z+0.5; }
vec2 containUv(vec2 uv,float ia,float sa,float z){ vec2 s=sa>ia?vec2(sa/ia,1.0):vec2(1.0,ia/sa); return (uv-0.5)*s/z+0.5; }
vec3 layer(sampler2D t,float ia,float kb,float gray,vec3 bgc){
  vec2 f=containUv(vUv+uPointer*0.014,ia,uAspect,0.92*(1.0+kb*0.06));
  float m=smoothstep(0.0,0.22,f.x)*smoothstep(1.0,0.78,f.x)*smoothstep(0.0,0.22,f.y)*smoothstep(1.0,0.78,f.y);
  vec3 fg=texture2D(t,clamp(f,0.001,0.999)).rgb;
  fg=mix(fg,vec3(dot(fg,vec3(0.2126,0.7152,0.0722))),gray);
  return mix(bgc,fg,m);
}
void main(){
  vec3 c=mix(layer(uA,uAspectA,uKbA,uGrayA,uBgA),layer(uB,uAspectB,uKbB,uGrayB,uBgB),uMix);
  float g=mix(uGrayA,uGrayB,uMix);
  float v=smoothstep(1.05,0.25,length((vUv-0.5)*vec2(uAspect*0.8,1.0)));
  c*=v;
  c=mix(c,c*vec3(1.06,0.98,1.1),0.5*(1.0-g));
  float grain=fract(sin(dot(vUv*vec2(1731.0,911.0)+uTime,vec2(12.9898,78.233)))*43758.5453);
  c+=(grain-0.5)*0.018;
  gl_FragColor=vec4(c*uFade,1.0);
  #include <colorspace_fragment>
}`;
const P_VERT = `attribute float aSeed; uniform float uTime, uPx; varying float vA;
void main(){
  float t=fract(aSeed*7.0+uTime*(0.018+0.03*fract(aSeed*13.0)));
  vec2 p=vec2(position.x+sin(uTime*0.6+aSeed*20.0)*0.03,-1.1+t*2.2);
  vA=sin(t*3.14159)*(0.35+0.65*fract(aSeed*17.0));
  gl_PointSize=uPx*(2.0+5.0*fract(aSeed*31.0));
  gl_Position=vec4(p,0.0,1.0);
}`;
const P_FRAG = `varying float vA; void main(){
  float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.0,d)*vA;
  gl_FragColor=vec4(vec3(0.68,0.19,0.15)*a,a);
}`;

// A single owner controls all title GPU resources, including asynchronous loads.
let active = null;
export function disposeTitleScreenThree() { active?.dispose(); }

export async function initTitleScreenThree() {
  const cover = document.getElementById('cover');
  if (!cover || cover.hidden) return null;
  if (active) return active;
  let stopped = false, raf = 0, renderer, quad, points, resizeObserver;
  const textures = new Set();
  const canvas = document.createElement('canvas');
  canvas.id = 'title-three'; canvas.setAttribute('aria-hidden', 'true');
  const target = new THREE.Vector2(), origin = new THREE.Vector2();
  const motionQuery = matchMedia('(prefers-reduced-motion:reduce)');
  const onMove = event => {
    const rect = cover.getBoundingClientRect();
    if (rect.width && rect.height) target.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
  };
  const onContextLost = event => { event.preventDefault(); dispose(); };
  const dispose = () => {
    if (stopped) return;
    stopped = true; cancelAnimationFrame(raf); resizeObserver?.disconnect();
    cover.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    for (const texture of textures) texture.dispose();
    quad?.geometry.dispose(); quad?.material.dispose();
    points?.geometry.dispose(); points?.material.dispose();
    renderer?.dispose(); renderer?.forceContextLoss(); canvas.remove();
    cover.classList.remove('t3-on'); delete cover.dataset.t3;
    if (active?.dispose === dispose) active = null;
  };
  active = { dispose }; cover.dataset.t3 = '1';
  try {
    // Do not allocate a second probing context: construction is the capability check.
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
  } catch { dispose(); return null; }
  canvas.addEventListener('webglcontextlost', onContextLost);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, matchMedia('(pointer: coarse)').matches ? 1 : 1.5));
  cover.prepend(canvas);
  const loader = new THREE.TextureLoader();
  const load = def => new Promise(resolve => loader.load(def.src, tex => {
    if (stopped) { tex.dispose(); resolve(null); return; }
    textures.add(tex); tex.colorSpace = THREE.SRGBColorSpace;
    resolve({ tex, aspect: tex.image.width / tex.image.height });
  }, undefined, () => resolve(null)));
  const first = await load(IMAGES[0]);
  if (!first || stopped || cover.hidden) { dispose(); return null; }
  const slots = [first];
  load(IMAGES[1]).then(slot => { if (slot && !stopped) slots.push(slot); });
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const u = {
    uA:{value:first.tex}, uB:{value:first.tex}, uAspectA:{value:first.aspect}, uAspectB:{value:first.aspect},
    uGrayA:{value:1}, uGrayB:{value:1}, uBgA:{value:new THREE.Color(BLACK)}, uBgB:{value:new THREE.Color(BLACK)},
    uAspect:{value:1}, uMix:{value:0}, uTime:{value:0}, uFade:{value:.35},
    uKbA:{value:0}, uKbB:{value:0}, uPointer:{value:new THREE.Vector2()}
  };
  quad = new THREE.Mesh(new THREE.PlaneGeometry(2,2), new THREE.ShaderMaterial({ uniforms:u, vertexShader:BG_VERT, fragmentShader:BG_FRAG, depthTest:false, depthWrite:false }));
  scene.add(quad);
  const count = matchMedia('(pointer:coarse)').matches ? 20 : 38;
  const pos = new Float32Array(count*3), seeds = new Float32Array(count);
  for (let i=0; i<count; i++) { pos[i*3] = Math.random()*2-1; seeds[i] = Math.random(); }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geometry.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));
  points = new THREE.Points(geometry,new THREE.ShaderMaterial({ uniforms:{uTime:u.uTime,uPx:{value:renderer.getPixelRatio()}}, vertexShader:P_VERT,fragmentShader:P_FRAG,transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending }));
  points.frustumCulled = false; scene.add(points);
  const resize = () => { if(stopped)return;const w=Math.max(1,cover.clientWidth),h=Math.max(1,cover.clientHeight);renderer.setSize(w,h,false);u.uAspect.value=w/h; };
  resizeObserver = new ResizeObserver(resize); resizeObserver.observe(cover); resize();
  cover.addEventListener('pointermove',onMove,{passive:true}); cover.classList.add('t3-on');
  let last=performance.now(), elapsed=0, age=0, current=0, transition=-1;
  const frame = now => {
    if (stopped) return;
    if (!cover.isConnected || cover.hidden) { dispose(); return; }
    raf=requestAnimationFrame(frame);
    if (document.hidden) { last=now; return; }
    const dt=Math.max(0,(now-last)/1000);last=now;
    const preference=document.documentElement.dataset.reduceMotion;
    const reduce=preference===undefined?motionQuery.matches:preference==='true';
    if (!reduce) { elapsed+=dt;age+=dt; }
    u.uTime.value=elapsed;u.uFade.value=reduce?1:Math.min(1,u.uFade.value+dt/1.4);
    u.uPointer.value.lerp(reduce?origin:target,1-Math.exp(-dt*3));
    u.uKbA.value=reduce?0:(Math.sin(elapsed*.12)*.5+.5);u.uKbB.value=1-u.uKbA.value;
    points.visible=!reduce;
    if (!reduce && slots.length>1 && transition<0 && age>HOLD_MS/1000) {
      const next=(current+1)%slots.length;u.uB.value=slots[next].tex;u.uAspectB.value=slots[next].aspect;transition=0;
    }
    if (transition>=0) {
      transition+=dt;const progress=Math.min(1,transition/(FADE_MS/1000));u.uMix.value=.5-Math.cos(progress*Math.PI)/2;
      if(progress===1){current=(current+1)%slots.length;u.uA.value=slots[current].tex;u.uAspectA.value=slots[current].aspect;u.uMix.value=0;age=0;transition=-1;}
    }
    renderer.render(scene,camera);
  };
  raf=requestAnimationFrame(frame);
  return active;
}

