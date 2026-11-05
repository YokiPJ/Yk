/** Local development uses installed dependencies; --offline serves only www/. */
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { basename, dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { localizeHTML, webDependencies } from './tools/web-dependencies.mjs';
const project = dirname(fileURLToPath(import.meta.url));
const offline = process.argv.includes('--offline');
const root = offline ? resolve(project, 'www') : project;
const release=JSON.parse(await readFile(resolve(project,'release.json'),'utf8'));
const port = Number(process.env.PORT || 8080);
const mime = { '.html':'text/html; charset=utf-8', '.js':'application/javascript; charset=utf-8',
  '.mjs':'application/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json',
  '.mp3':'audio/mpeg', '.ogg':'audio/ogg', '.wav':'audio/wav', '.png':'image/png', '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.woff':'font/woff',
  '.woff2':'font/woff2', '.ttf':'font/ttf', '.wasm':'application/wasm',
  '.glb':'model/gltf-binary', '.zip':'application/zip', '.jar':'application/java-archive',
  '.apk':'application/vnd.android.package-archive' };
if (offline) {
  try { await stat(resolve(root, 'index.html')); }
  catch { console.error('Pacote offline ausente. Execute npm run build:web.'); process.exit(1); }
}
const server = http.createServer(async (req, res) => {
  try {
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405, { Allow:'GET, HEAD' }); res.end(); return; }
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    let file = resolve(root, rel);
    if (!file.startsWith(root + sep) || rel.split(/[\\/]/).some(p => p.startsWith('.')) || rel.startsWith('node_modules/')) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    if (!offline && pathname.startsWith('/vendor/')) {
      const dependency = webDependencies[pathname.slice('/vendor/'.length)];
      if (!dependency) { res.writeHead(404); res.end('Not Found'); return; }
      file = resolve(project, 'node_modules', dependency);
    }
    let info;
    try{info=await stat(file);}catch(error){
      if(!offline&&error.code==='ENOENT'&&pathname===`/downloads/${release.apk}`){
        res.writeHead(303,{Location:`https://github.com/${release.repository}/releases/download/${release.tag}/${release.apk}`});res.end();return;
      }
      throw error;
    }
    if (info.isDirectory()) {
      if (!pathname.endsWith('/')) { res.writeHead(308, { Location:encodeURI(pathname) + '/' }); res.end(); return; }
      file = resolve(file, 'index.html');
    }
    let content = await readFile(file);
    if (!offline && rel === 'index.html') content = Buffer.from(localizeHTML(content.toString('utf8')));
    res.writeHead(200, { 'Content-Type':mime[extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length':content.length, 'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff',
      ...(pathname.startsWith('/downloads/') ? { 'Content-Disposition':`attachment; filename="${basename(file).replace(/[^a-zA-Z0-9._-]/g, '_')}"` } : {}) });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch (error) {
    const status = error.code === 'ENOENT' || error.code === 'EISDIR' ? 404 : error instanceof URIError ? 400 : 500;
    res.writeHead(status); res.end(status === 404 ? 'Not Found' : status === 400 ? 'Bad Request' : 'Server Error');
    if (status === 500) console.error('[HINÁRIA server]', error.message);
  }
});
server.on('error', error => { console.error('[HINÁRIA server]', error.message); process.exitCode = 1; });
server.listen(port, '0.0.0.0', () => {
  const actualPort=server.address().port;
  console.log(`HINÁRIA ${offline ? 'offline/www' : 'desenvolvimento local'} · porta ${actualPort} · ${root}`);
  console.log(`Jogo: http://localhost:${actualPort}/`);
  if (process.argv.includes('--studio')) console.log(`Projeto completo: http://localhost:${actualPort}/studio/`);
});
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
