/** One import-map conversion for the development server and offline APK build. */
export const webDependencies = {
  'three.module.js': 'three/build/three.module.js',
  'anime.es.js': 'animejs/lib/anime.es.js',
  'pixi.min.mjs': 'pixi.js/dist/pixi.min.mjs',
  'capacitor-core.js': '@capacitor/core/dist/index.js'
};
export function localizeHTML(html) {
  const mappings = {
    'https://unpkg.com/three@0.160.0/build/three.module.js': './vendor/three.module.js',
    'https://unpkg.com/three@0.160.0/build/': './vendor/',
    'https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.es.js': './vendor/anime.es.js',
    'https://cdn.jsdelivr.net/npm/pixi.js@8.6.6/dist/pixi.min.mjs': './vendor/pixi.min.mjs'
  };
  for (const [remote, local] of Object.entries(mappings)) html = html.replaceAll(remote, local);
  html = html.replace(/<link\b[^>]*href=["']https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>/g, '');
  if (/https?:\/\/(?:unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net)/.test(html)) {
    throw new Error('Uma dependência externa não foi convertida para o pacote local.');
  }
  return html;
}
