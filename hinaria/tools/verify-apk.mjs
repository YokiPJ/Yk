/** Inspect the real APK on Windows/Linux/macOS without an external unzip tool. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { unzipSync } from 'fflate';

export function verifyApk(apkPath, webDirectory) {
  const expected = JSON.parse(readFileSync(join(webDirectory, 'build-info.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(join(webDirectory, 'build-manifest.json'), 'utf8'));
  const entries = unzipSync(readFileSync(apkPath), { filter: file => file.name.startsWith('assets/public/') });
  const decoder = new TextDecoder();
  function entry(name) {
    const bytes = entries['assets/public/' + name];
    assert.ok(bytes, 'APK incompleto: ' + name);
    return bytes;
  }
  const packed = JSON.parse(decoder.decode(entry('build-info.json')));
  assert.equal(packed.version, expected.version, 'APK desatualizado: versão web diferente');
  assert.equal(packed.fingerprint, expected.fingerprint, 'APK desatualizado: fingerprint web diferente');
  assert.equal(packed.target,'mobile','O APK precisa usar a build mobile, sem laboratórios');
  assert.ok(!Object.keys(manifest).some(name=>name.startsWith('studio/')||name.endsWith('.jar')),'Ferramentas de desenvolvimento não devem entrar no APK');
  assert.deepEqual(JSON.parse(decoder.decode(entry('build-manifest.json'))), manifest, 'Manifesto diferente no APK');
  for (const [name, digest] of Object.entries(manifest)) {
    assert.equal(createHash('sha256').update(entry(name)).digest('hex'), digest, 'Conteúdo diferente no APK: ' + name);
  }
  console.log(`PASS APK: ${Object.keys(manifest).length} arquivos verificados · ${packed.version} · SHA256 ${packed.fingerprint}`);
  return packed;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const release=JSON.parse(readFileSync(join(root,'release.json'),'utf8'));
  verifyApk(process.argv[2] || join(root, 'downloads',release.apk), join(root, 'www'));
}
