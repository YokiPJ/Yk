/** Boot progress and early graphics checks; deliberately independent of game imports. */
export function yieldToBrowser() {
  return new Promise(resolve => {
    let done = false;
    const finish = () => { if (!done) { done = true; clearTimeout(timer); resolve(); } };
    // RAF may stop when Android backgrounds the WebView during initialization.
    const timer = setTimeout(finish, 100);
    requestAnimationFrame(() => setTimeout(finish, 0));
  });
}

export function createBootRuntime(state) {
  let renderer = null, graphicsFailure = null, removeGraphicsListener = () => {};
  const assertReady = () => {
    if (state.state === 'failed') throw new Error('Inicialização interrompida. Recarregue para tentar novamente.');
    if (renderer?.getContext().isContextLost()) throw new Error('O contexto WebGL foi perdido durante a preparação.');
  };
  const api = {
    async yield() { assertReady(); await yieldToBrowser(); assertReady(); },
    watchRenderer(value) {
      renderer = value;
      let rejectGraphics;
      graphicsFailure = new Promise((_, reject) => { rejectGraphics = reject; });
      // Loss may occur between phases, before the next race subscribes.
      graphicsFailure.catch(() => {});
      const lost = event => {
        event.preventDefault(); state.contextLost = true;
        rejectGraphics(new Error('O contexto WebGL foi perdido durante a preparação.'));
      };
      const previousShaderError = value.debug.onShaderError;
      const shaderError = (gl, program, vertex, fragment) => {
        state.shaderError = {
          program: gl.getProgramInfoLog(program) || '',
          vertex: gl.getShaderInfoLog(vertex) || '',
          fragment: gl.getShaderInfoLog(fragment) || ''
        };
        const error = new Error('Falha ao compilar os gráficos WebGL neste dispositivo.');
        rejectGraphics(error); throw error;
      };
      value.debug.onShaderError = shaderError;
      renderer.domElement.addEventListener('webglcontextlost', lost);
      removeGraphicsListener = () => {
        value.domElement.removeEventListener('webglcontextlost', lost);
        if (value.debug.onShaderError === shaderError) value.debug.onShaderError = previousShaderError;
      };
      assertReady();
    },
    validateShaders() {
      assertReady();
      const gl = renderer.getContext();
      // Three r160 compileAsync waits for completion without checking link status.
      // Detect failed programs while the loading title still owns the screen.
      for (const program of renderer.info.programs || []) {
        if (!gl.getProgramParameter(program.program, gl.LINK_STATUS))
          renderer.debug.onShaderError(gl, program.program, program.vertexShader, program.fragmentShader);
      }
    },
    async phase(id, label, work) {
      assertReady();
      state.phase = id;
      const status = document.getElementById('title-status');
      if (status) status.textContent = label;
      document.body.dataset.bootPhase = id;
      window.dispatchEvent(new CustomEvent('hinaria:bootprogress', { detail: { phase: id, label } }));
      await yieldToBrowser();
      assertReady();
      const phase = { id, startedAt: performance.now(), status: 'loading' };
      state.phases.push(phase);
      let timeout;
      try {
        const pending = [Promise.resolve().then(work), new Promise((_, reject) => {
          timeout = setTimeout(() => reject(new Error('A preparação demorou demais. Recarregue para tentar novamente.')), 60000);
        })];
        if (graphicsFailure) pending.push(graphicsFailure);
        const result = await Promise.race(pending);
        assertReady(); phase.status = 'ready';
        return result;
      } catch (error) { phase.status = 'failed'; throw error; }
      finally { clearTimeout(timeout); phase.durationMs = Math.round((performance.now() - phase.startedAt) * 100) / 100; }
    },
    complete() {
      assertReady(); removeGraphicsListener();
      state.state = 'ready'; state.readyAt = performance.now();
      state.durationMs = Math.round((state.readyAt - state.startedAt) * 100) / 100;
      document.body.dataset.bootState = 'ready';
      delete document.body.dataset.bootPhase;
    },
    dispose() { removeGraphicsListener(); }
  };
  return api;
}
