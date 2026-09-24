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
const allowedLogoSources = new Set(['package-icons-curated', 'winget-run-icon', 'publisher-site-favicon', 'missing-upstream-logo']);
const allowedLogoStatuses = new Set(['verified', 'fallback', 'missing']);
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
  for (const key of ['id', 'name', 'publisher', 'category', 'description', 'wingetId', 'icon', 'logoSource', 'logoStatus']) requireString(app, key);
  if (!/^[a-z0-9-]+$/.test(app.id || '')) errors.push(`invalid id: ${app.id}`);
  if (!/^[A-Za-z0-9.+_-]+(?:\.[A-Za-z0-9.+_-]+)+$/.test(app.wingetId || '')) errors.push(`${app.id}: invalid wingetId ${app.wingetId}`);
  if (!allowedLogoSources.has(app.logoSource)) errors.push(`${app.id}: unsupported logoSource ${app.logoSource}`);
  if (!allowedLogoStatuses.has(app.logoStatus)) errors.push(`${app.id}: unsupported logoStatus ${app.logoStatus}`);
  if (app.logoStatus !== 'missing' && !/^https:\/\//i.test(app.logoUrl || '')) errors.push(`${app.id}: non-missing logoUrl must be HTTPS`);
  if (app.logoStatus === 'missing' && app.logoUrl) errors.push(`${app.id}: missing upstream logo must not claim a logoUrl`);
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
  if (logoKey && logoUrls.has(logoKey) && app.logoStatus === 'verified') errors.push(`duplicate verified logoUrl: ${app.logoUrl}`);

  ids.add(idKey);
  names.add(nameKey);
  wingetIds.add(wingetKey);
  if (logoKey) logoUrls.add(logoKey);
}

const verified = (catalog.apps || []).filter(x => x.logoStatus === 'verified').length;
const fallback = (catalog.apps || []).filter(x => x.logoStatus === 'fallback').length;
const missing = (catalog.apps || []).filter(x => x.logoStatus === 'missing').length;
if (verified < 50) errors.push(`expected at least 50 verified upstream logos, got ${verified}`);
if (verified + fallback < 500) errors.push(`expected at least 500 upstream logo/favicons, got ${verified + fallback}`);
if (missing >= catalog.apps.length) errors.push('all large catalog entries are missing upstream logos');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Large catalog OK: ${catalog.apps.length} apps, ${verified} verified logos, ${fallback} favicon fallbacks, ${missing} local category fallbacks, no duplicate IDs, names or WinGet IDs.`);
