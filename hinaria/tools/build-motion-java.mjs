/** Portable Java build; the runtime and generated GLBs need no JVM libraries. */
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root = fileURLToPath(new URL('./motion-java/', import.meta.url));
function run(tool, args) {
  const executable = process.env.HINARIA_JDK
    ? join(process.env.HINARIA_JDK, 'bin', tool + (process.platform === 'win32' ? '.exe' : '')) : tool;
  const result = spawnSync(executable, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw new Error(`Não foi possível executar ${tool}. Instale JDK 17+ ou defina HINARIA_JDK. ${result.error.message}`);
  if (result.status !== 0) process.exit(result.status || 1);
}
mkdirSync(join(root, 'build/classes'), { recursive: true });
run('javac', ['--release', '17', '-encoding', 'UTF-8', '-d', 'build/classes', 'src/HinariaAnimator.java']);
run('jar', ['--create', '--file', 'HinariaMotion.jar', '--main-class', 'HinariaAnimator', '-C', 'build/classes', '.', '-C', 'assets', 'hinaria-rigs.json.gz']);
run('java', ['-Xmx512m', '-jar', 'HinariaMotion.jar', '--out', 'output', ...process.argv.slice(2)]);
