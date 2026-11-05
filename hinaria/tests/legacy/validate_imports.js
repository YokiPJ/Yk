import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const __dirname=path.dirname(fileURLToPath(import.meta.url));

// Parse ES module imports and exports
function parseImports(content) {
    const imports = [];
    // import { a, b } from 'path'
    const namedImports = content.matchAll(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g);
    for (const match of namedImports) {
        const names = match[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim());
        const from = match[2];
        for (const name of names) {
            imports.push({ name, from, type: 'named' });
        }
    }
    // import a from 'path'
    const defaultImports = content.matchAll(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g);
    for (const match of defaultImports) {
        imports.push({ name: match[1], from: match[2], type: 'default' });
    }
    // import * as name from 'path'
    const namespaceImports = content.matchAll(/import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g);
    for (const match of namespaceImports) {
        imports.push({ name: match[1], from: match[2], type: 'namespace' });
    }
    return imports;
}

function parseExports(content) {
    const exports = new Set();
    // export const NAME = ...
    // export function NAME() ...
    // export class NAME ...
    const declExports = content.matchAll(/export\s+(?:(?:async\s+)?function|const|class|let|var)\s+(\w+)/g);
    for (const match of declExports) {
        exports.add(match[1]);
    }
    // export { NAME, ... }
    const namedExports = content.matchAll(/export\s+\{([^}]+)\}/g);
    for (const match of namedExports) {
        const names = match[1].split(',').map(s => s.trim().split(/\s+as\s+/).at(-1).trim());
        for (const name of names) exports.add(name);
    }
    // export default NAME
    const defaultExports = content.matchAll(/export\s+default\s+(\w+)/g);
    for (const match of defaultExports) {
        exports.add('default');
    }
    return exports;
}

const srcDir = path.join(__dirname, '..', '..', 'src');
const files = [];

function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) walk(full);
        else if (f.endsWith('.js')) files.push(full);
    }
}
walk(srcDir);

console.log('Found', files.length, 'modules:\n');

const exportMap = {};
for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    const rel = path.relative(srcDir, f).replace(/\\/g, '/');
    exportMap[rel] = parseExports(content);
}

let hasErrors = false;

for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    const rel = path.relative(srcDir, f).replace(/\\/g, '/');
    const imports = parseImports(content);
    
    for (const imp of imports) {
        if (imp.from.startsWith('.')) {
            // Resolve relative import
            const importDir = path.dirname(f);
            const resolved = path.resolve(importDir, imp.from);
            
            // Try with .js extension if not present
            let resolvedWithExt = resolved;
            if (!resolved.endsWith('.js')) {
                resolvedWithExt = resolved + '.js';
            }
            
            let resolvedRel;
            if (fs.existsSync(resolved)) {
                resolvedRel = path.relative(srcDir, resolved).replace(/\\/g, '/');
            } else if (fs.existsSync(resolvedWithExt)) {
                resolvedRel = path.relative(srcDir, resolvedWithExt).replace(/\\/g, '/');
            } else {
                console.log(`❌ ${rel}: Cannot find module '${imp.from}' (resolved: ${resolvedWithExt})`);
                hasErrors = true;
                continue;
            }
            
            const exports = exportMap[resolvedRel];
            
            if (!exports) {
                console.log(`❌ ${rel}: Module '${imp.from}' has no exports map (resolvedRel: ${resolvedRel})`);
                hasErrors = true;
            } else if (imp.type !== 'namespace' && !exports.has(imp.type === 'default' ? 'default' : imp.name)) {
                console.log(`❌ ${rel}: Import '${imp.name}' not exported from '${imp.from}' (exports: ${[...exports].join(', ')})`);
                hasErrors = true;
            } else {
                console.log(`✅ ${rel}: ${imp.name} from ${imp.from}`);
            }
        }
    }
}

if (!hasErrors) {
    console.log('\n✅ All imports resolve correctly!');
} else {
    console.log('\n❌ Found import errors!');
    process.exitCode = 1;
}