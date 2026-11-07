/** Real source-bootstrap fault injection; no Android hardware is simulated. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifacts = resolve(process.env.HINARIA_BOOT_ARTIFACTS || '/tmp/hinaria-boot');
await mkdir(artifacts, { recursive: true });
const server = spawn(process.execPath, ['server.js'], {
  cwd: root, env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'inherit']
});
let browser;
const results = [];
try {
  const origin = await new Promise((done, fail) => {
    let log = '';
    const timer = setTimeout(() => fail(new Error('Servidor não iniciou')), 15000);
    server.once('error', fail);
    server.once('exit', code => { clearTimeout(timer); fail(new Error('Servidor encerrou: ' + code)); });
    server.stdout.on('data', data => {
      log += data;
      const match = log.match(/Jogo: http:\/\/localhost:(\d+)\//);
      if (match) { clearTimeout(timer); done('http://127.0.0.1:' + match[1]); }
    });
  });
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined, headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });

  async function scenario(name, { block, invalidSyntax, inject, retry = false } = {}) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 2.75,
      isMobile: true, hasTouch: true, reducedMotion: 'reduce'
    });
    try {
      const page = await context.newPage();
      const errors = [], external = [];
      page.on('pageerror', error => errors.push(error.message));
      let blockEnabled = true;
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (/^https?:$/.test(url.protocol) && url.origin !== origin) {
          external.push(url.href); return route.abort('blockedbyclient');
        }
        if (blockEnabled && block && url.pathname.endsWith(block)) return route.abort('blockedbyclient');
        if (invalidSyntax && url.pathname.endsWith('/src/core/bootGame.js')) {
          return route.fulfill({ contentType: 'application/javascript', body: 'export function !!! invalid;' });
        }
        return route.continue();
      });
      if (inject) await page.addInitScript(inject);
      await page.addInitScript(() => {
        window.paintedBootPhases = [];
        const frame = () => {
          if (window.HINARIA_BOOT?.state === 'ready' || window.HINARIA_BOOT?.state === 'failed') return;
          const phase = document.body?.dataset.bootPhase;
          if (phase && !window.paintedBootPhases.includes(phase)) window.paintedBootPhases.push(phase);
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      await page.goto(origin, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.body.dataset.bootState === 'failed', null, { timeout: 30000, polling: 50 });
      assert.equal(await page.locator('#title-status').getAttribute('role'), 'alert');
      assert.ok(await page.locator('#boot-retry').isVisible());
      assert.ok(await page.locator('#play').isDisabled());
      assert.ok(await page.locator('#cover').isVisible());
      const failure = await page.evaluate(() => ({ boot: window.HINARIA_BOOT, message: document.getElementById('title-status').textContent }));
      if (/webgl|context|shader/i.test(name)) assert.match(failure.message, /gráficos/);
      if (retry) {
        blockEnabled = false;
        await page.locator('#boot-retry').click();
        await page.waitForFunction(() => document.body.dataset.bootState === 'ready', null, { timeout: 90000, polling: 100 });
        assert.ok(await page.locator('#play').isEnabled());
        assert.equal(await page.locator('#title-three').count(), 0, 'mobile title must retain CSS art without a second WebGL context');
        assert.equal(await page.locator('#wrap canvas').count(), 1);
        const healthy = await page.evaluate(() => ({
          boot: window.HINARIA_BOOT, paintedPhases: window.paintedBootPhases,
          flow: window.gameState.flow, titleBackend: document.getElementById('cover').dataset.titleBackend
        }));
        assert.equal(healthy.flow, 'TITLE'); assert.equal(healthy.titleBackend, 'css');
        assert.ok(healthy.paintedPhases.length >= 5, 'progress must get paint opportunities between boot phases');
        assert.ok(healthy.boot.phases.every(phase => phase.status === 'ready'));
        assert.ok(healthy.boot.phases.some(phase => phase.id === 'shaders'));
        results.push({ name: 'retry reaches mobile title with painted progress', status: 'PASS', ...healthy });
      }
      assert.deepEqual(errors, []); assert.deepEqual(external, []);
      results.push({ name, status: 'PASS', ...failure, errors, external });
      console.log('PASS boot: ' + name);
    } finally { await context.close(); }
  }

  await scenario('missing game dependency is recoverable', { block: '/src/core/gameFlow.js', retry: true });
  await scenario('missing boot runtime is recoverable', { block: '/src/core/bootRuntime.js' });
  await scenario('game syntax error is recoverable', { invalidSyntax: true });
  await scenario('WebGL unavailable keeps DOM retry visible', { inject: () => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return /webgl/i.test(type) ? null : original.call(this, type, ...args);
    };
  } });
  await scenario('context loss during boot stops preparation', { inject: () => {
    addEventListener('hinaria:bootprogress', event => {
      if (event.detail.phase !== 'world') return;
      const gl = window.gameState.renderer.getContext();
      const extension = gl.getExtension('WEBGL_lose_context');
      if (!extension) throw new Error('WEBGL_lose_context unavailable in test browser');
      extension.loseContext();
    });
  } });
  await scenario('GPU shader compilation failure keeps DOM retry visible', { inject: () => {
    for (const Context of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
      if (!Context) continue;
      const original = Context.prototype.shaderSource;
      Context.prototype.shaderSource = function (shader, source) {
        original.call(this, shader, source + '\nFORCED_BOOT_SHADER_COMPILATION_ERROR');
      };
    }
  } });
  await writeFile(artifacts + '/results.json', JSON.stringify({
    status: 'PASS', browser: await browser.version(),
    engine: 'Chromium / SwiftShader; source bootstrap fault injection, not a physical Android phone', results
  }, null, 2) + '\n');
} finally {
  if (browser) await browser.close();
  server.kill(); if (server.exitCode === null) await once(server, 'exit');
}
