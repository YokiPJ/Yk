/** Verify actual project URLs, standalone copies and HTTP download behavior. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = fileURLToPath(new URL('../', import.meta.url));
const release=JSON.parse(await readFile(root+'release.json','utf8'));
const releaseURL=`https://github.com/${release.repository}/releases/download/${release.tag}/${release.apk}`;
const hash = data => createHash('sha256').update(data).digest('hex');
async function server(offline) {
  const child = spawn(process.execPath, ['server.js', ...(offline ? ['--offline'] : []), '--studio'], {
    cwd: root, env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const origin = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error('Servidor não iniciou.')); }, 15000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error('Servidor encerrou: ' + code)); });
    let output = '';
    child.stdout.on('data', data => {
      output += data;
      const match = output.match(/Jogo: http:\/\/localhost:(\d+)\//);
      if (match) { clearTimeout(timer); resolve('http://127.0.0.1:' + match[1]); }
    });
    child.stderr.on('data', data => process.stderr.write(data));
  });
  return { child, origin };
}
for (const offline of [false, true]) {
  const { child, origin } = await server(offline);
  try {
    const build=JSON.parse(await readFile(root+'www/build-info.json','utf8'));
    if(offline&&build.target==='mobile'){
      assert.equal((await fetch(origin+'/')).status,200);
      assert.equal((await fetch(origin+'/src/main.js')).status,200);
      assert.equal((await fetch(origin+'/studio/')).status,404);
      assert.equal((await fetch(origin+'/downloads/HinariaMotion.jar')).status,404);
      console.log('PASS pacote mobile: jogo offline; laboratórios e JAR fora do APK.');
      continue;
    }
    const response = await fetch(origin + '/studio/');
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes('Vilarrubra'));
    const links = [...html.matchAll(/(?:href|src)="([^"#]+)"/g)].map(match => match[1]);
    for (const link of links) {
      const url = new URL(link, origin + '/studio/');
      if(url.href===releaseURL)continue;
      assert.equal(url.origin, origin);
      const head = await fetch(url, { method: 'HEAD', redirect: 'manual' });
      // Enquanto o APK não estiver presente em downloads/, o servidor
      // oferece um redirecionamento para o asset da Release no GitHub.
      // Validamos o destino sem depender de uma Release já publicada.
      if (url.pathname === `/downloads/${release.apk}` && head.status === 303) {
        assert.equal(head.headers.get('location'), releaseURL, link);
        assert.equal(await head.text(), '', 'HEAD must not send a body');
        continue;
      }
      assert.equal(head.status, 200, link);
      assert.ok(Number(head.headers.get('content-length')) > 0, link);
      assert.equal(await head.text(), '', 'HEAD must not send a body');
    }
    const manifest = JSON.parse(await readFile(root + 'studio/manifest.json', 'utf8'));
    for (const lab of Object.values(manifest)) {
      const result = await fetch(origin + '/studio/' + lab.path);
      assert.equal(result.status, 200);
      assert.equal(hash(Buffer.from(await result.arrayBuffer())), lab.sha256);
    }
    const jar = await fetch(origin + '/downloads/HinariaMotion.jar');
    assert.equal(jar.status, 200);
    assert.match(jar.headers.get('content-disposition'), /^attachment;/);
    assert.equal(hash(Buffer.from(await jar.arrayBuffer())), hash(await readFile(root + 'downloads/HinariaMotion.jar')));
    if (!offline) {
      const apk = await fetch(origin + '/downloads/'+release.apk,{redirect:'manual'});
      if(apk.status===303)assert.equal(apk.headers.get('location'),releaseURL);
      else{
        assert.equal(apk.status,200);assert.match(apk.headers.get('content-disposition'),/^attachment;/);
        assert.equal(hash(Buffer.from(await apk.arrayBuffer())),hash(await readFile(root+'downloads/'+release.apk)));
      }
    }
    assert.equal((await fetch(origin + '/studio', { redirect: 'manual' })).status, 308);
    assert.equal((await fetch(origin + '/.git/config')).status, 403);
    assert.equal((await fetch(origin + '/node_modules/playwright/package.json')).status, 403);
    assert.equal((await fetch(origin + '/nao-existe')).status, 404);
    assert.equal((await fetch(origin + '/studio/', { method: 'POST' })).status, 405);
    console.log(`PASS integração ${offline ? 'www offline' : 'projeto'}: jogo, 4 HTMLs, 6 imagens, links e downloads.`);
  } finally {
    child.kill('SIGTERM');
    if (child.exitCode === null) await once(child, 'exit');
  }
}
