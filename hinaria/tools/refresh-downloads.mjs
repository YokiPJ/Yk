/** Refresh checksums after either Java or Android writes a new deliverable. */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const directory = fileURLToPath(new URL('../downloads/', import.meta.url));
const names = readdirSync(directory).filter(name => /\.(apk|jar)$/.test(name)).sort();
const checksums = names.map(name => createHash('sha256').update(readFileSync(join(directory, name))).digest('hex') + '  ' + name + '\n');
writeFileSync(join(directory, 'SHA256SUMS.txt'), checksums.join(''));
console.log(`Downloads: ${names.length} arquivos com SHA256 atualizado.`);
