/**
 * Patches the Prisma-generated client.ts after `prisma generate`.
 *
 * Prisma v7 generates `import.meta.url` in client.ts for ESM support.
 * Node.js v22+ with `require_module` enabled detects `import.meta` in CJS
 * files and loads them via the ESM module job, causing:
 *   "ReferenceError: exports is not defined in ES module scope"
 *
 * In a CJS NestJS project, `__dirname` is already available, so the
 * globalThis assignment is unnecessary.  We replace it with a no-op.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientPath = resolve(__dirname, '../generated/prisma/client.ts');

const ESM_BLOCK = `import { fileURLToPath } from 'node:url'
globalThis['__dirname'] = path.dirname(fileURLToPath(import.meta.url))`;

const CJS_PATCH = `// NOTE (patched for Node.js CJS): __dirname is already defined in CommonJS.
// The import.meta.url line from the original Prisma v7 generated file has been removed
// because Node.js v22+ with require_module detects import.meta and loads the file
// through the ESM module job, breaking CJS usage.`;

let source = readFileSync(clientPath, 'utf8');

if (source.includes('import.meta.url')) {
  source = source.replace(ESM_BLOCK, CJS_PATCH);
  writeFileSync(clientPath, source, 'utf8');
  console.log('✔  Patched generated/prisma/client.ts (removed import.meta.url for CJS compatibility)');
} else {
  console.log('ℹ  generated/prisma/client.ts already patched — skipping');
}
