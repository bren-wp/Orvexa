import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const target = path.join(root, 'apps', 'web', 'data');
await mkdir(target, { recursive: true });
for (const file of ['catalog.json', 'categories.json', 'config.json']) {
  await cp(path.join(root, 'shared', file), path.join(target, file));
}
console.log('Shared catalog/config synchronized to web.');
