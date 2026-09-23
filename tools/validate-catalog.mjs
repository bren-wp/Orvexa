import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'shared', 'catalog.json'), 'utf8'));
const categories = JSON.parse(fs.readFileSync(path.join(root, 'shared', 'categories.json'), 'utf8'));
const categoryNames = new Set(categories.map(x => x.name));
const ids = new Set();
const errors = [];
if (catalog.schemaVersion !== 1) errors.push('schemaVersion must be 1');
for (const app of catalog.apps || []) {
  if (!/^[a-z0-9-]+$/.test(app.id || '')) errors.push(`invalid id: ${app.id}`);
  if (ids.has(app.id)) errors.push(`duplicate id: ${app.id}`);
  ids.add(app.id);
  if (!categoryNames.has(app.category)) errors.push(`${app.id}: unknown category ${app.category}`);
  if (app.provider !== 'winget') errors.push(`${app.id}: unsupported provider`);
  if (!/^[A-Za-z0-9.+_-]+(?:\.[A-Za-z0-9.+_-]+)+$/.test(app.wingetId || '')) errors.push(`${app.id}: invalid wingetId`);
  const icon = path.join(root, 'apps', 'web', app.icon || '');
  if (!fs.existsSync(icon)) errors.push(`${app.id}: missing icon ${app.icon}`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Catalog OK: ${catalog.apps.length} apps, revision ${catalog.revision}.`);
