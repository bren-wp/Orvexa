import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const file = path.join(root, 'shared', 'catalog-large.json');
const categories = JSON.parse(fs.readFileSync(path.join(root, 'shared', 'categories.json'), 'utf8'));
const categoryNames = new Set(categories.map(x => x.name));
const errors = [];
const ids = new Set();
const names = new Set();
const wingetIds = new Set();
const logoUrls = new Set();
const allowedLogoSources = new Set(['winget-manifest-icon', 'publisher-site-favicon']);
const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const requireString = (app, key) => {
  if (typeof app[key] !== 'string' || !app[key].trim()) errors.push(`${app.id || 'unknown'}: ${key} is required`);
};

if (!fs.existsSync(file)) {
  console.error('shared/catalog-large.json is missing. Run tools/build-winget-large-catalog.mjs first.');
  process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
if (catalog.schemaVersion !== 2) errors.push('large catalog schemaVersion must be 2');
if (!Array.isArray(catalog.apps) || catalog.apps.length <= 5000) errors.push('large catalog must contain more than 5000 applications');
if (catalog.revision < 9) errors.push('large catalog revision must be at least 9');

for (const app of catalog.apps || []) {
  for (const key of ['id', 'name', 'publisher', 'category', 'description', 'wingetId', 'icon', 'logoUrl', 'logoSource']) requireString(app, key);
  if (!/^[a-z0-9-]+$/.test(app.id || '')) errors.push(`invalid id: ${app.id}`);
  if (!/^[A-Za-z0-9.+_-]+(?:\.[A-Za-z0-9.+_-]+)+$/.test(app.wingetId || '')) errors.push(`${app.id}: invalid wingetId ${app.wingetId}`);
  if (!/^https:\/\//i.test(app.logoUrl || '')) errors.push(`${app.id}: logoUrl must be HTTPS`);
  if (!allowedLogoSources.has(app.logoSource)) errors.push(`${app.id}: unsupported logoSource ${app.logoSource}`);
  if (!categoryNames.has(app.category)) errors.push(`${app.id}: unknown category ${app.category}`);
  if (app.provider !== 'winget') errors.push(`${app.id}: provider must be winget`);
  if (!Array.isArray(app.platforms) || !app.platforms.includes('windows-11') || !app.platforms.includes('windows-10')) errors.push(`${app.id}: platforms must include windows-11 and windows-10`);
  if (!Array.isArray(app.architectures) || !app.architectures.includes('x64')) errors.push(`${app.id}: architectures must include x64`);
  if (app.enabled !== true) errors.push(`${app.id}: large catalog entries must be enabled`);

  const idKey = normalize(app.id);
  const nameKey = normalize(app.name);
  const wingetKey = normalize(app.wingetId);
  const logoKey = normalize(app.logoUrl);

  if (ids.has(idKey)) errors.push(`duplicate id: ${app.id}`);
  if (names.has(nameKey)) errors.push(`duplicate app name: ${app.name}`);
  if (wingetIds.has(wingetKey)) errors.push(`duplicate wingetId: ${app.wingetId}`);
  if (logoUrls.has(logoKey) && app.logoSource === 'winget-manifest-icon') errors.push(`duplicate verified logoUrl: ${app.logoUrl}`);

  ids.add(idKey);
  names.add(nameKey);
  wingetIds.add(wingetKey);
  logoUrls.add(logoKey);
}

const verified = (catalog.apps || []).filter(x => x.logoSource === 'winget-manifest-icon').length;
if (verified < 250) errors.push(`expected at least 250 WinGet-manifest IconUrl logos, got ${verified}`);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Large catalog OK: ${catalog.apps.length} apps, ${verified} verified WinGet IconUrl logos, no duplicate IDs, names or WinGet IDs.`);
