/** Real Chromium/WebGL integration checks. Run after npm install and build:web.
 * node tools/test-upgrade-browser.mjs [--offline] [--scenario=desktop]
 * HINARIA_BROWSER_ARTIFACTS, HINARIA_TEST_PORT and CHROMIUM_PATH are optional.
 * Every action uses browser input; evaluate only observes state, except the
 * explicitly named context-loss fault injection used to test fallback handling.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = resolve(process.env.HINARIA_BROWSER_ARTIFACTS || join(tmpdir(), 'hinaria-browser'));
const port = Number(process.env.HINARIA_TEST_PORT || 8091);
const offline = process.argv.includes('--offline');
const selection = process.argv.find(arg => arg.startsWith('--scenario='))?.split('=').slice(1).join('=');
const base = `http://127.0.0.1:${port}`;
const results = [];
const diagnostics = [];
let browser, server;
let serverOutput = '';
mkdirSync(artifacts, { recursive: true });

function persistReport(complete) {
  const passed = results.filter(result => result.status === 'passed').length;
  const failed = results.filter(result => result.status === 'failed').length;
  writeFileSync(join(artifacts, 'results.json'), JSON.stringify({
    complete, executedAt: new Date().toISOString(),
    engine: 'Chromium / SwiftShader (software rendering; not an Android device)',
    offline, base, passed, failed, results, diagnostics,
  }, null, 2));
}

async function waitUntil(test, timeout = 20000) {
  const started = Date.now();
  let last;
  while (Date.now() - started < timeout) {
    try { if (await test()) return; } catch (error) { last = error; }
    await new Promise(done => setTimeout(done, 100));
  }
  throw new Error(`Timeout esperando prontidão${last ? `: ${last.message}` : ''}`);
}

async function createPage(options = {}) {
  const { query = '', inject = null, blockPixi = false, ...contextOptions } = options;
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce', ...contextOptions });
  const page = await context.newPage();
  // Observe JS state without depending on a second slow software-rendered frame.
  const waitForState=page.waitForFunction.bind(page);
  page.waitForFunction=(fn,arg,options={})=>waitForState(fn,arg,{polling:100,...options});
  const errors = [], failedRequests = [], externalRequests = [], consoleWarnings = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
    if (message.type() === 'warning') consoleWarnings.push(message.text());
  });
  page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`);
  });
  // Offline tests explicitly deny external requests, exposing any hidden CDN use.
  if (offline || blockPixi) await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (blockPixi && url.pathname.endsWith('/vendor/pixi.min.mjs')) return route.abort('blockedbyclient');
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      if (offline && url.origin !== base) { externalRequests.push(url.href); return route.abort('blockedbyclient'); }
    }
    return route.continue();
  });
  page.on('dialog', dialog => dialog.accept());
  if (inject) await page.addInitScript(inject);
  let response;
  try {
    response = await page.goto(`${base}/${query}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    assert.equal(response.status(), 200);
    await page.waitForFunction(() => window.gameState?.P && window.gameState?.flow === 'TITLE', null, { timeout: 45000 });
    await page.locator('#play').waitFor({ state: 'visible' });
    await page.waitForFunction(() => !document.getElementById('play')?.disabled, null, { timeout: 15000 });
  } catch (error) {
    await page.screenshot({ path: join(artifacts, `startup-failure-${Date.now()}.png`) }).catch(() => {});
    diagnostics.push({ stage: 'startup', query, errors, failedRequests, externalRequests, consoleWarnings });
    await context.close();
    throw new Error(`${error.message}; startup errors: ${errors.join(' | ')}`);
  }
  return { context, page, errors, failedRequests, externalRequests, consoleWarnings };
}

async function screenshot(page, name) {
  await page.screenshot({ path: join(artifacts, `${name}.png`) });
}

async function assertHealthy(session, { expectedFault = false } = {}) {
  assert.deepEqual(session.externalRequests, [], 'build offline tentou acessar origem externa');
  const unexpected = expectedFault
    ? session.errors.filter(message => !/^(?:Failed to load resource: net::ERR_(?:FAILED|BLOCKED_BY_CLIENT)(?:\.Inspector)?|THREE\.WebGLRenderer: Error creating WebGL context\.)$/.test(message))
    : session.errors;
  assert.deepEqual(unexpected, [], 'exceções/erros inesperados no navegador');
  diagnostics.push({
    url: session.page.url(), errors: session.errors,
    failedRequests: session.failedRequests, externalRequests: session.externalRequests,
    consoleWarnings: session.consoleWarnings,
    state: await session.page.evaluate(() => ({
      flow: window.gameState?.flow, time: window.gameState?.t,
      drawCalls: window.gameState?.renderer?.info.render.calls,
      geometries: window.gameState?.renderer?.info.memory.geometries,
      textures: window.gameState?.renderer?.info.memory.textures,
      canvases: [...document.querySelectorAll('canvas')].map(c => c.id || c.parentElement?.id),
      player: window.gameState?.P && { cls: window.gameState.P.cls, hp: window.gameState.P.hp, x: window.gameState.P.x, z: window.gameState.P.z },
      measuredDiagnostics: window.HINARIA_QA?.snapshot?.(),
    })),
  });
}

async function startGame(page, cls = 'kn') {
  await page.locator('#play').click();
  await page.waitForFunction(() => window.gameState.flow === 'CHARACTER_CREATION');
  await page.locator('#ccw').waitFor({ state: 'visible' });
  const classes = await page.locator('#cls button[data-k]').evaluateAll(buttons => buttons.map(button => button.dataset.k));
  assert.deepEqual([...classes].sort(), ['dr', 'kn', 'pa', 'so', 'yo']);
  await page.locator(`#cls button[data-k="${cls}"]`).click();
  assert.equal(await page.evaluate(() => window.gameState.P.cls), cls, 'seleção da classe usa estado real');
  await page.locator('#go').click();
  await page.waitForFunction(() => window.gameState.flow === 'PLAYING');
  await page.locator('#cover').waitFor({ state: 'hidden' });
  await page.locator('#ccw').waitFor({ state: 'hidden' });
  assert.equal(await page.locator('#wrap canvas').count(), 1, 'um renderer de jogo');
  await settleOpening(page);
}

async function settleOpening(page) {
  // Arrival is an intentional scene, not a stuck overlay. Let its real scan
  // execute, then use its real Skip button before testing normal game controls.
  await page.waitForFunction(() => window.gameState.cutsceneActive || window.gameState.t > .4, null, { timeout: 45000 });
  if (await page.evaluate(() => window.gameState.cutsceneActive)) {
    await page.locator('#cs-skip').click();
    await page.waitForFunction(() => window.gameState.flow === 'PLAYING', null, { timeout: 15000 });
    await page.locator('#cs-ui').waitFor({ state: 'hidden' });
  }
}

async function openMenu(page) {
  await page.locator('#ui-hud-menu-btn').click();
  await page.locator('#ui1-menu').waitFor({ state: 'visible' });
  await page.waitForFunction(() => window.gameState.flow === 'PAUSED');
}

async function snapshot(page) {
  return page.evaluate(() => {
    const s = window.gameState, p = s.P;
    return {
      t: s.t, position: [p.x, p.z], hp: p.hp, mana: p.mana,
      cds: [...p.cds], cd: p.cd, replay: p.rc,
      projectiles: s.pr.map(o => [o.x, o.z, o.mesh?.position.x, o.mesh?.position.z]),
      enemies: s.ents.filter(o => o.kind === 'm').map(o => [o.x, o.z, o.hp, o.cd]),
      keys: { ...s.keys }, joystick: [s.jx, s.jz],
    };
  });
}

async function layout(page, ids, pairs = []) {
  const boxes = await page.evaluate(ids => {
    const result = {};
    for (const id of ids) {
      const element = document.getElementById(id);
      if (!element) continue;
      const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
      if (!rect.width || !rect.height || style.display === 'none' || style.visibility === 'hidden') continue;
      result[id] = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }
    return { boxes: result, width: innerWidth, height: innerHeight };
  }, ids);
  for (const id of ids) {
    const b = boxes.boxes[id];
    assert.ok(b, `${id} visível`);
    assert.ok(b.x >= -1 && b.y >= -1 && b.x + b.width <= boxes.width + 1 && b.y + b.height <= boxes.height + 1,
      `${id} fora do viewport: ${JSON.stringify(b)} em ${boxes.width}x${boxes.height}`);
  }
  for (const [a, b] of pairs) {
    const x = boxes.boxes[a], y = boxes.boxes[b];
    const overlapX = Math.min(x.x + x.width, y.x + y.width) - Math.max(x.x, y.x);
    const overlapY = Math.min(x.y + x.height, y.y + y.height) - Math.max(x.y, y.y);
    assert.ok(overlapX <= 1 || overlapY <= 1, `${a} sobrepõe ${b}: ${overlapX.toFixed(1)}x${overlapY.toFixed(1)}`);
  }
  return boxes;
}

async function run(name, fn) {
  if (selection && selection !== name) return;
  console.log(`RUN ${name}`);
  const started = Date.now();
  try {
    await fn();
    results.push({ name, status: 'passed', durationMs: Date.now() - started });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, status: 'failed', durationMs: Date.now() - started, error: error.stack });
    console.error(`FAIL ${name}: ${error.message}`);
  }
  persistReport(false);
}

async function desktop() {
  const session = await createPage();
  const { page } = session;
  try {
    assert.equal(await page.locator('#title-continue').isVisible(), false, 'sem save completo não há Continuar');
    await page.locator('#title-heading').click();
    await page.mouse.click(3, 3);
    assert.equal(await page.evaluate(() => window.gameState.flow), 'TITLE', 'clique genérico não inicia');
    await page.locator('#title-settings').click();
    await page.locator('#perf-panel').waitFor({ state: 'visible' });
    await page.locator('#perf-quality').selectOption('low');
    await page.locator('#perf-fps').check();
    await page.locator('#perf-reduce-motion').check();
    await page.locator('#perf-close').click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('hinaria-v79-quality')).mode), 'low');
    await page.locator('#title-credits').click();
    await page.locator('#upgrade-panel').waitFor({ state: 'visible' });
    assert.match(await page.locator('#upgrade-panel').innerText(), /Créditos|HINÁRIA/i);
    await page.locator('#upgrade-panel-close').click();
    await screenshot(page, 'desktop-title');
    await startGame(page);
    const beforeMove = await snapshot(page);
    await page.keyboard.down('d');
    try {
      await page.waitForFunction(([x,z]) => Math.hypot(window.gameState.P.x-x,window.gameState.P.z-z)>.05,
        beforeMove.position, { timeout: 10000 });
    } finally { await page.keyboard.up('d'); }
    await page.waitForTimeout(150);
    const afterMove = await snapshot(page);
    assert.ok(Math.hypot(afterMove.position[0] - beforeMove.position[0], afterMove.position[1] - beforeMove.position[1]) > 0.05, 'movimento real pelo teclado');
    await page.keyboard.press('j');
    await page.waitForTimeout(50);
    assert.ok(await page.evaluate(() => window.gameState.P.at > 0 || window.gameState.P.cd > 0), 'ataque manual altera estado real');
    await page.keyboard.press('m');
    await page.locator('#ui1-menu').waitFor({ state: 'visible' });
    await page.waitForFunction(() => window.gameState.flow === 'PAUSED');
    const paused = await snapshot(page);
    const pauseFrame = await page.evaluate(() => window.gameState.renderer.info.render.frame);
    await page.keyboard.down('w');
    await page.keyboard.press('1');
    await page.waitForFunction(frame => window.gameState.renderer.info.render.frame >= frame + 2, pauseFrame, { timeout: 15000 });
    await page.keyboard.up('w');
    const pausedLater = await snapshot(page);
    assert.deepEqual(pausedLater, paused, 'pausa congela player/IA/projéteis/recargas e bloqueia input');
    await page.keyboard.press('Tab');
    assert.ok(await page.evaluate(() => document.getElementById('ui1-menu').contains(document.activeElement)), 'foco permanece no menu');
    await page.locator('#ui1-menu [data-action="save"]').click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('hinaria.fullgame.v1')));
    assert.equal(saved.schemaVersion, 1);
    assert.equal(saved.player.cls, 'kn');
    assert.ok(saved.quests && saved.world && saved.identity, 'save completo serializado');
    await screenshot(page, 'desktop-paused');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.gameState.flow === 'PLAYING');
    await page.waitForFunction(previous => window.gameState.t > previous, paused.t, { timeout: 10000 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.gameState?.flow === 'TITLE', null, { timeout: 45000 });
    await page.locator('#title-continue').waitFor({ state: 'visible' });
    // Observe the authoritative transition synchronously: legitimate exploration
    // rewards can occur on the first subsequent simulation tick at this spawn.
    await page.evaluate(() => {
      window.addEventListener('hinaria:flowchange', event => {
        if (event.detail.mode !== 'PLAYING') return;
        const p = window.gameState.P;
        window.__hinariaObservedRestore = JSON.parse(JSON.stringify({
          cls: p.cls, lv: p.lv, xp: p.xp, gold: p.gold, x: p.x, z: p.z, equippedWeapons: p.equippedWeapons,
        }));
      }, { once: true });
    });
    await page.locator('#title-continue').click();
    await page.waitForFunction(() => window.gameState.flow === 'PLAYING');
    await openMenu(page);
    const restored = await page.evaluate(() => window.__hinariaObservedRestore);
    assert.ok(restored, 'transição de restauração observada');
    for (const key of ['cls', 'lv', 'xp', 'gold', 'equippedWeapons']) assert.deepEqual(restored[key], saved.player[key], `restauração de ${key}`);
    assert.ok(Math.hypot(restored.x - saved.player.x, restored.z - saved.player.z) < 0.01, 'posição salva restaurada');
    // Nested native views must retain pause after their parent menu closes.
    await page.locator('#ui1-menu [data-original="arsenal-btn"]').click();
    await page.locator('#arsenal-modal').waitFor({ state: 'visible' });
    const arsenalTime = await page.evaluate(() => window.gameState.t);
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => window.gameState.t), arsenalTime, 'Arsenal mantém pausa');
    await page.locator('#arsenal-close').click();
    await page.locator('#ui-hud-menu-btn').click();
    await page.locator('#ui1-menu').waitFor({ state: 'visible' });
    await page.locator('#ui1-menu [data-original="qbtn"]').click();
    await page.locator('#qj').waitFor({ state: 'visible' });
    const journalTime = await page.evaluate(() => window.gameState.t);
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => window.gameState.t), journalTime, 'Missões mantém pausa');
    await page.locator('#qj .x').click();
    await page.locator('#ui-hud-menu-btn').click();
    await page.locator('#ui1-menu').waitFor({ state: 'visible' });
    await page.locator('#ui1-menu [data-action="title"]').click();
    await page.waitForFunction(() => window.gameState.flow === 'TITLE');
    await page.locator('#cover').waitFor({ state: 'visible' });
    await page.locator('#title-continue').click();
    await page.waitForFunction(() => window.gameState.flow === 'PLAYING');
    assert.equal(await page.locator('#wrap canvas').count(), 1);
    assert.equal(await page.locator('#ui1-menu').count(), 1);
    await screenshot(page, 'desktop-restored');
    await assertHealthy(session);
  } catch (error) {
    await screenshot(page, 'desktop-failure').catch(() => {});
    diagnostics.push({ name: 'desktop-failure', errors: session.errors, failedRequests: session.failedRequests, consoleWarnings: session.consoleWarnings,
      state: await page.evaluate(() => ({flow:window.gameState?.flow,keys:window.gameState?.keys,pauseRequested:window.gameState?.pauseRequested,cutscene:window.gameState?.cutsceneActive,t:window.gameState?.t,position:window.gameState?.P&&[window.gameState.P.x,window.gameState.P.z]})).catch(()=>null) });
    throw error;
  } finally { await session.context.close(); }
}

async function responsive(width, height, cls) {
  const session = await createPage({ viewport: { width, height }, isMobile: width < 900, hasTouch: width < 900 });
  const { page } = session;
  try {
    // Keep software rasterization proportional while exercising the real quality control.
    await page.locator('#title-settings').click();
    await page.locator('#perf-quality').selectOption('low');
    await page.locator('#perf-close').click();
    await layout(page, ['play', 'title-settings', 'title-credits']);
    await screenshot(page, `title-${width}x${height}`);
    await page.locator('#play').click();
    await page.locator('#ccw').waitFor({ state: 'visible' });
    await layout(page, ['cc', 'go']);
    await screenshot(page, `creator-${width}x${height}`);
    await page.locator(`#cls button[data-k="${cls}"]`).click();
    await page.locator('#go').click();
    await page.waitForFunction(() => window.gameState.flow === 'PLAYING');
    await settleOpening(page);
    assert.equal(await page.evaluate(() => window.gameState.P.cls), cls);
    await layout(page, ['hud', 'mmw', 'ui-combat-dock', ...(width < 900 ? ['joy'] : [])],
      [['hud', 'mmw'], ...(width < 900 ? [['joy', 'ui-combat-dock']] : [])]);
    await screenshot(page, `hud-${cls}-${width}x${height}`);
    await openMenu(page);
    await layout(page, ['ui1-menu', 'ui1-menu-close']);
    await screenshot(page, `menu-${width}x${height}`);
    await page.locator('#ui1-menu [data-action="resume"]').click();
    await page.waitForFunction(() => window.gameState.flow === 'PLAYING');
    await assertHealthy(session);
  } catch (error) {
    await screenshot(page, `responsive-failure-${width}x${height}`).catch(() => {});
    diagnostics.push({ name: `responsive-failure-${width}x${height}`, errors: session.errors, consoleWarnings: session.consoleWarnings, state:await page.evaluate(()=>({flow:gameState.flow,time:gameState.t,cutscene:gameState.cutsceneActive,paused:gameState.pauseRequested,hidden:document.hidden})).catch(()=>null) });
    throw error;
  } finally { await session.context.close(); }
}

async function touch() {
  const session = await createPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const { page } = session;
  try {
    await startGame(page, 'yo');
    const cdp = await session.context.newCDPSession(page);
    const joy = await page.locator('#joy').boundingBox();
    const attack = await page.locator('#combat-v2-attack').boundingBox();
    const x = joy.x + joy.width * 0.8, y = joy.y + joy.height * 0.5;
    const ax = attack.x + attack.width / 2, ay = attack.y + attack.height / 2;
    const start = await snapshot(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    await page.waitForTimeout(120);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }, { x: ax, y: ay, id: 2 }] });
    await page.waitForTimeout(80);
    const during = await snapshot(page);
    assert.ok(Math.abs(during.joystick[0]) > 0.2, 'segundo toque não rouba joystick');
    assert.ok(await page.evaluate(() => window.gameState.P.at > 0 || window.gameState.P.cd > 0), 'segundo toque aciona ataque manual');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x, y, id: 1 }] });
    await page.waitForFunction(([ox,oz]) => Math.hypot(window.gameState.P.x-ox,window.gameState.P.z-oz)>.05,
      start.position, { timeout: 10000 });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const end = await snapshot(page);
    assert.ok(Math.hypot(end.position[0] - start.position[0], end.position[1] - start.position[1]) > 0.05, 'movimento enquanto ataca com outro dedo');
    assert.deepEqual(end.joystick, [0, 0], 'soltar toque limpa movimento');
    await screenshot(page, 'touch-yoki');
    await assertHealthy(session);
  } catch (error) {
    await screenshot(page, 'touch-failure').catch(() => {});
    throw error;
  } finally { await session.context.close(); }
}

async function compatibility() {
  const session = await createPage({ query: '?visual=classico&stream=0&cinema=1' });
  try {
    await startGame(session.page, 'dr');
    await session.page.waitForTimeout(200);
    assert.ok(await session.page.evaluate(() => window.gameState.renderer.info.render.calls > 0), 'modo clássico renderiza mundo');
    await screenshot(session.page, 'compatibility-classic');
    await assertHealthy(session);
  } finally { await session.context.close(); }
}

async function fallback() {
  // Controlled fault injection: deny only UI WebGL contexts; the gameplay
  // renderer remains real WebGL. This checks both CSS/DOM fallbacks at startup.
  const session = await createPage({ blockPixi: true, inject: () => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if ((this.id === 'title-three' || this.id === 'hud-pixi-canvas' || this.id === 'hud-pixi') && /webgl/i.test(type)) return null;
      return original.call(this, type, ...args);
    };
  } });
  try {
    assert.equal(await session.page.locator('#title-three').count(), 0, 'falha WebGL da capa usa fallback CSS');
    await startGame(session.page);
    await session.page.waitForTimeout(250);
    assert.equal(await session.page.evaluate(() => document.body.classList.contains('hud-pixi')), false, 'falha import Pixi usa HUD DOM');
    assert.ok(await session.page.evaluate(() => window.gameState.renderer.info.render.calls > 0), 'jogo renderiza com fallback de UI');
    await session.page.locator('#s0').waitFor({ state: 'visible' });
    await openMenu(session.page);
    await session.page.locator('#ui1-menu [data-action="resume"]').click();
    await session.page.waitForFunction(() => window.gameState.flow === 'PLAYING');
    await screenshot(session.page, 'ui-fallback');
    await assertHealthy(session, { expectedFault: true });
  } finally { await session.context.close(); }
}

try {
  persistReport(false);
  server = spawn(process.execPath, ['server.js', ...(offline ? ['--offline'] : [])], {
    cwd: root, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', buffer => { serverOutput += buffer; });
  server.stderr.on('data', buffer => { serverOutput += buffer; });
  server.on('error', error => { serverOutput += error.stack; });
  await waitUntil(async () => {
    if (server.exitCode !== null) throw new Error(`Servidor saiu com ${server.exitCode}: ${serverOutput}`);
    const response = await fetch(base);
    return response.ok;
  });
  const chromiumPath = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
  browser = await chromium.launch({
    headless: true, ...(existsSync(chromiumPath) ? { executablePath: chromiumPath } : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
  });
  await run('desktop', desktop);
  for (const [width, height, cls] of [[360,800,'kn'],[390,844,'pa'],[800,360,'so'],[1280,720,'dr'],[1600,900,'yo']])
    await run(`responsive-${width}x${height}`, () => responsive(width, height, cls));
  await run('touch', touch);
  await run('compatibility', compatibility);
  await run('fallback', fallback);
  assert.ok(results.length, `Cenário desconhecido: ${selection}`);
} catch (error) {
  results.push({ name: 'runner', status: 'failed', error: error.stack });
  console.error(error.stack);
} finally {
  await browser?.close().catch(() => {});
  if (server && server.exitCode === null) server.kill('SIGTERM');
  const passed = results.filter(result => result.status === 'passed').length;
  const failed = results.filter(result => result.status === 'failed').length;
  persistReport(true);
  writeFileSync(join(artifacts, 'server.log'), serverOutput);
  console.log(`${passed}/${results.length} cenários aprovados; ${failed} falhas. Evidências: ${artifacts}`);
  if (failed) process.exitCode = 1;
}
