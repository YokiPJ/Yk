/** Dependency-free bootstrap: import/parse failures must leave an actionable title. */
// Android 11 devices can still ship WebView 83: replaceChildren arrived in 86.
// Install the DOM operation used by menus/HUD before any game module executes.
for(const prototype of [globalThis.Element?.prototype,globalThis.DocumentFragment?.prototype]){
  if(!prototype||prototype.replaceChildren)continue;
  Object.defineProperty(prototype,'replaceChildren',{configurable:true,writable:true,value:function(...nodes){
    const fragment=this.ownerDocument.createDocumentFragment();
    fragment.append(...nodes);
    while(this.firstChild)this.removeChild(this.firstChild);
    this.appendChild(fragment);
  }});
}
const bootState = { state: 'loading', phase: 'modules', startedAt: performance.now(), phases: [] };
window.HINARIA_BOOT = bootState;
document.body.dataset.bootState = 'loading';
document.body.dataset.flow = 'TITLE';
let boot;

function failBoot(error) {
  if (bootState.state === 'failed') return;
  bootState.state = 'failed';
  bootState.error = { name: error?.name || 'Error', message: String(error?.message || error) };
  boot?.dispose();
  console.error('[HINÁRIA] Falha de inicialização:', error);
  if (window.gameState) { window.gameState.flow = 'BOOT'; window.gameState.pauseRequested = true; }
  const cover = document.getElementById('cover');
  if (cover) { cover.hidden = false; cover.classList.remove('out'); }
  document.body.dataset.flow = 'TITLE';
  document.body.dataset.bootState = 'failed';
  const status = document.getElementById('title-status');
  if (status) {
    status.setAttribute('role', 'alert'); status.setAttribute('aria-live', 'assertive');
    status.textContent = /webgl|context|renderer|gpu/i.test(bootState.error.message)
      ? 'Não foi possível preparar os gráficos. Feche outros aplicativos e tente recarregar. Se persistir, atualize o Android System WebView e o Chrome.'
      : /import|module|fetch|syntax|specifier|unexpected token/i.test(bootState.error.message)
        ? 'Não foi possível carregar os arquivos do jogo. Tente recarregar. Se persistir no Android, atualize o Android System WebView e o Chrome.'
        : 'Não foi possível preparar HINÁRIA. Recarregue para tentar novamente.';
  }
  for (const id of ['play', 'title-continue', 'title-settings', 'title-credits']) {
    const button = document.getElementById(id);
    if (button) { button.hidden = true; button.disabled = true; }
  }
  const actions = document.getElementById('title-actions');
  if (actions && !document.getElementById('boot-retry')) {
    const retry = document.createElement('button');
    retry.id = 'boot-retry'; retry.type = 'button'; retry.textContent = 'Recarregar';
    retry.addEventListener('click', () => location.reload()); actions.append(retry);
    retry.focus({ preventScroll: true });
  }
}

// There are no static engine imports here: a missing dependency, unsupported
// module or syntax error in any game module is caught by this promise chain.
import('./core/bootRuntime.js').then(async ({ createBootRuntime }) => {
  boot = createBootRuntime(bootState);
  const { initGame } = await boot.phase('modules', 'Carregando os arquivos do jogo…', () => import('./core/bootGame.js'));
  await initGame(boot);
  boot.complete();
}).catch(failBoot);
