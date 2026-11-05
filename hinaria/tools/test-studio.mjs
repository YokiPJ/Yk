/** Run each laboratory's browser checks in a separate process/context. */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
for (const file of ['motion-ui/verify.mjs', 'motion-3d/verify.mjs', 'motion-java/tools/verify-preview.mjs', 'model-review/verify.mjs']) {
  console.log(`\nVERIFY ${file}`);
  const status = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['tools/' + file], {
      cwd: root, stdio: 'inherit', env: { ...process.env, HINARIA_CHROMIUM: process.env.HINARIA_CHROMIUM || process.env.CHROMIUM_PATH || '' },
    });
    child.once('error', reject);
    child.once('exit', code => resolve(code ?? 1));
  });
  if (status !== 0) process.exit(status);
}
console.log('PASS: quatro laboratórios integrados.');
