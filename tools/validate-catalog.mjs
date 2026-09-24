import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'shared', 'catalog.json'), 'utf8'));
const categories = JSON.parse(fs.readFileSync(path.join(root, 'shared', 'categories.json'), 'utf8'));
const categoryNames = new Set(categories.map(x => x.name));
const allowedPlatforms = ['windows-11', 'windows-10'];
const allowedArchitectures = ['x64'];
const ids = new Set();
const names = new Set();
const wingetIds = new Set();
const errors = [];

const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

function assertString(app, key) {
  if (typeof app[key] !== 'string' || !app[key].trim()) errors.push(`${app.id || 'unknown'}: ${key} is required`);
}

if (catalog.schemaVersion !== 1) errors.push('schemaVersion must be 1');
if (!Array.isArray(catalog.apps) || catalog.apps.length < 300) errors.push('catalog must contain at least 300 curated apps');

for (const app of catalog.apps || []) {
  assertString(app, 'id');
  assertString(app, 'name');
  assertString(app, 'publisher');
  assertString(app, 'category');
  assertString(app, 'description');
  assertString(app, 'wingetId');
  assertString(app, 'icon');

  if (!/^[a-z0-9-]+$/.test(app.id || '')) errors.push(`invalid id: ${app.id}`);
  if (ids.has(app.id)) errors.push(`duplicate id: ${app.id}`);
  ids.add(app.id);

  const nameKey = normalize(app.name);
  if (names.has(nameKey)) errors.push(`duplicate app name: ${app.name}`);
  names.add(nameKey);

  if (!categoryNames.has(app.category)) errors.push(`${app.id}: unknown category ${app.category}`);
  if (app.provider !== 'winget') errors.push(`${app.id}: unsupported provider`);
  if (!/^[A-Za-z0-9.+_-]+(?:\.[A-Za-z0-9.+_-]+)+$/.test(app.wingetId || '')) errors.push(`${app.id}: invalid wingetId`);

  const wingetKey = normalize(app.wingetId);
  if (wingetIds.has(wingetKey)) errors.push(`duplicate wingetId: ${app.wingetId}`);
  wingetIds.add(wingetKey);

  if (!Array.isArray(app.platforms) || app.platforms.length !== allowedPlatforms.length || allowedPlatforms.some(x => !app.platforms.includes(x))) {
    errors.push(`${app.id}: platforms must be ${allowedPlatforms.join(', ')}`);
  }
  if (!Array.isArray(app.architectures) || app.architectures.length !== allowedArchitectures.length || allowedArchitectures.some(x => !app.architectures.includes(x))) {
    errors.push(`${app.id}: architectures must be ${allowedArchitectures.join(', ')}`);
  }
  if ('architecture' in app) errors.push(`${app.id}: use architectures, not architecture`);

  const icon = path.join(root, 'apps', 'web', app.icon || '');
  if (!fs.existsSync(icon)) errors.push(`${app.id}: missing icon ${app.icon}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Catalog OK: ${catalog.apps.length} apps, revision ${catalog.revision}, no duplicate IDs, names or WinGet IDs.`);
