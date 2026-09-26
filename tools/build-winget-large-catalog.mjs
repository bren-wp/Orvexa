import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const target = Number.parseInt(process.env.ORVEXA_LARGE_CATALOG_TARGET || '10500', 10);
const minRequired = Number.parseInt(process.env.ORVEXA_LARGE_CATALOG_MIN || '10001', 10);
const branch = process.env.WINGET_PKGS_REF || 'master';
const manifestsUrl = `https://api.github.com/repos/microsoft/winget-pkgs/contents/manifests?ref=${encodeURIComponent(branch)}`;
const rawManifestBase = `https://raw.githubusercontent.com/microsoft/winget-pkgs/${branch}/manifests`;
const packageIconsRepo = 'memstechtips/package-icons';
const packageIconsRef = process.env.ORVEXA_PACKAGE_ICONS_REF || 'dev';
const packageIconsBranchUrl = `https://api.github.com/repos/${packageIconsRepo}/branches/${packageIconsRef}`;
const packageIconsManifestUrl = `https://raw.githubusercontent.com/${packageIconsRepo}/${packageIconsRef}/manifest.json`;
const headers = { accept: 'application/vnd.github+json', 'user-agent': 'Orvexa-large-catalog-builder' };
if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const categories = JSON.parse(fs.readFileSync(path.join(root, 'shared', 'categories.json'), 'utf8'));
const categoryNames = new Set(categories.map(x => x.name));
const categoryIconByName = new Map(categories.map(x => [x.name, x.icon]));
const outFile = path.join(root, 'shared', 'catalog-large.json');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const normalize = value => String(value || '').trim().replace(/\s+/g, ' ');
const normalizeKey = value => normalize(value).toLowerCase();
const hash = value => crypto.createHash('sha1').update(value).digest('hex').slice(0, 8);
const slug = value => normalize(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'app';
const versionCollator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

function compareWingetVersions(leftValue, rightValue) {
  const left = normalize(leftValue).replace(/^v(?=\d)/i, '');
  const right = normalize(rightValue).replace(/^v(?=\d)/i, '');
  if (left === right) return 0;

  const [leftCore, leftPre = ''] = left.split(/-(.+)/, 2);
  const [rightCore, rightPre = ''] = right.split(/-(.+)/, 2);
  const core = versionCollator.compare(leftCore, rightCore);
  if (core !== 0) return core;
  if (!leftPre && rightPre) return 1;
  if (leftPre && !rightPre) return -1;
  return versionCollator.compare(leftPre, rightPre);
}

async function fetchJson(url, attempt = 1) {
  const response = await fetch(url, { headers });
  if (response.status === 404) return null;
  if (response.status === 403 || response.status === 429 || response.status >= 500) {
    if (attempt < 4) { await sleep(650 * attempt); return await fetchJson(url, attempt + 1); }
  }
  if (!response.ok) return null;
  try { return await response.json(); } catch { return null; }
}

async function fetchText(url, attempt = 1) {
  const response = await fetch(url, { headers });
  if (response.status === 404) return '';
  if (response.status === 403 || response.status === 429 || response.status >= 500) {
    if (attempt < 4) { await sleep(650 * attempt); return await fetchText(url, attempt + 1); }
  }
  if (!response.ok) return '';
  return await response.text();
}

function yamlScalar(text, key) {
  const match = text.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm'));
  if (!match) return '';
  let value = match[1].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return value.trim();
}

function yamlIconUrl(text) {
  const direct = text.match(/^\s*IconUrl:\s*(.+?)\s*$/m);
  if (!direct) return '';
  let value = direct[1].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return /^https:\/\//i.test(value) ? value : '';
}

function splitWingetId(identifier) {
  const parts = identifier.split('.');
  const publisher = parts.shift() || identifier;
  const packageName = parts.join('.') || identifier;
  return { publisher, packageName };
}

function titleFromIdentifier(identifier) {
  const { packageName } = splitWingetId(identifier);
  return normalize(packageName.replace(/[._+-]+/g, ' ')) || identifier;
}

function categoryFor(entry) {
  const hay = `${entry.identifier} ${entry.name} ${entry.publisher} ${entry.description}`.toLowerCase();
  const checks = [
    ['Browsers', /browser|chromium|firefox|brave|vivaldi|opera|edge|tor/],
    ['Messaging', /slack|discord|teams|zoom|telegram|signal|chat|messenger|matrix|mail|thunderbird|whatsapp/],
    ['Media', /video|audio|media|player|music|podcast|vlc|plex|jellyfin|obs|stream|codec|ffmpeg/],
    ['Office', /office|pdf|document|note|writer|spreadsheet|markdown|obsidian|notion|libreoffice|onlyoffice/],
    ['Developer', /developer|code|sdk|ide|git|python|node|java|docker|kubernetes|terminal|shell|api|postman|jetbrains|visual studio|compiler|database|sql|rust|go|dotnet/],
    ['Gaming', /game|gaming|steam|epic games|battle|gog|minecraft|emulator|retroarch/],
    ['Security', /security|password|vpn|auth|encrypt|firewall|malware|antivirus|bitwarden|keepass|keychain|gpg/],
    ['Cloud & Sync', /cloud|sync|drive|dropbox|onedrive|backup|nextcloud|ftp|sftp|rclone/],
    ['Creative', /creative|design|photo|image|paint|vector|figma|blender|cad|3d|drawing|editor|krita|gimp/],
    ['Remote Access', /remote|rdp|vnc|ssh|anydesk|teamviewer|parsec|rustdesk/]
  ];
  return checks.find(([, rx]) => rx.test(hay))?.[0] ?? 'Utilities';
}

async function loadPackageIconIndex() {
  const branchData = await fetchJson(packageIconsBranchUrl);
  const commit = branchData?.commit?.sha || packageIconsRef;
  const manifest = await fetchJson(packageIconsManifestUrl);
  const index = new Map();
  for (const [fileName, meta] of Object.entries(manifest?.icons || {})) {
    for (const id of meta.winget || []) {
      index.set(normalizeKey(id), { url: `https://cdn.jsdelivr.net/gh/${packageIconsRepo}@${commit}/icons/${encodeURIComponent(fileName)}`, source: 'package-icons-curated', name: meta.name || '', sha256: meta.sha256 || '' });
    }
  }
  console.log(`Package-icons index: ${index.size} WinGet mappings from ${packageIconsRepo}@${commit}`);
  return { index, commit };
}

function describeManifestPath(entryPath) {
  const parts = entryPath.split('/');
  const fileName = parts.at(-1) || '';
  const version = normalize(parts.at(-2));
  if (!version) return null;

  const enUs = fileName.match(/^(.*)\.locale\.en-US\.ya?ml$/i);
  if (enUs) return { identifier: enUs[1], version, metadataRank: 0 };

  const locale = fileName.match(/^(.*)\.locale\.[^.]+\.ya?ml$/i);
  if (locale) return { identifier: locale[1], version, metadataRank: 1 };

  if (/\.installer\.ya?ml$/i.test(fileName)) return null;
  const versionManifest = fileName.match(/^(.*)\.ya?ml$/i);
  if (versionManifest) return { identifier: versionManifest[1], version, metadataRank: 2 };

  return null;
}

async function loadCompleteTree(gitUrl, prefix = '') {
  const recursive = await fetchJson(`${gitUrl}?recursive=1`);
  if (!recursive?.tree) return [];

  if (!recursive.truncated) {
    return recursive.tree.map(entry => ({
      ...entry,
      path: prefix ? `${prefix}/${entry.path}` : entry.path
    }));
  }

  const direct = await fetchJson(gitUrl);
  if (!direct?.tree) throw new Error(`Could not expand truncated WinGet tree: ${gitUrl}`);

  const expanded = [];
  for (const entry of direct.tree) {
    const entryPath = prefix ? `${prefix}/${entry.path}` : entry.path;
    if (entry.type === 'blob') {
      expanded.push({ ...entry, path: entryPath });
      continue;
    }

    if (entry.type === 'tree' && entry.url) {
      expanded.push(...await loadCompleteTree(entry.url, entryPath));
    }
  }

  return expanded;
}

async function loadWingetCandidates() {
  const letters = await fetchJson(manifestsUrl);
  if (!Array.isArray(letters)) throw new Error('Could not read WinGet manifests directory.');
  const byId = new Map();
  const directories = letters.filter(x => x.type === 'dir' && x.git_url).sort((a, b) => a.name.localeCompare(b.name));
  console.log(`WinGet manifest root directories: ${directories.length}`);
  for (const directory of directories) {
    const treeEntries = await loadCompleteTree(directory.git_url);
    if (!treeEntries.length) continue;
    let before = byId.size;

    for (const entry of treeEntries) {
      if (entry.type !== 'blob') continue;
      const descriptor = describeManifestPath(entry.path);
      if (!descriptor) continue;

      const { identifier, version, metadataRank } = descriptor;
      if (!/^[A-Za-z0-9.+_-]+(?:\.[A-Za-z0-9.+_-]+)+$/.test(identifier)) continue;

      const rawPath = `${directory.name}/${entry.path}`.split('/').map(encodeURIComponent).join('/');
      const candidate = { identifier, version, rawUrl: `${rawManifestBase}/${rawPath}`, metadataRank };
      const key = normalizeKey(identifier);
      const current = byId.get(key);
      const versionOrder = current ? compareWingetVersions(candidate.version, current.version) : 1;

      if (!current || versionOrder > 0 || (versionOrder === 0 && candidate.metadataRank < current.metadataRank)) {
        byId.set(key, candidate);
      }
    }

    console.log(`WinGet ${directory.name}: +${byId.size - before} IDs from ${treeEntries.length} manifest tree entries`);
  }

  return [...byId.values()].sort((a, b) => a.identifier.localeCompare(b.identifier));
}

function logoFromManifest(meta, curated) {
  if (curated) return { url: curated.url, source: curated.source, status: 'verified', sha256: curated.sha256 };
  if (meta.iconUrl) return { url: meta.iconUrl, source: 'winget-manifest-icon', status: 'verified' };
  const site = meta.packageUrl || meta.publisherUrl;
  if (/^https?:\/\//i.test(site)) {
    try {
      const host = new URL(site).hostname;
      if (host && host.split('.').length > 1) return { url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`, source: 'publisher-site-favicon', status: 'fallback' };
    } catch {}
  }
  return { url: '', source: 'missing-upstream-logo', status: 'missing' };
}

async function buildEntry(candidate, curated) {
  const text = await fetchText(candidate.rawUrl);
  const identifier = yamlScalar(text, 'PackageIdentifier') || candidate.identifier;
  const version = normalize(yamlScalar(text, 'PackageVersion') || candidate.version);
  if (!version) throw new Error(`Missing PackageVersion for ${identifier}`);
  const name = normalize(yamlScalar(text, 'PackageName') || curated?.name || titleFromIdentifier(identifier));
  const { publisher } = splitWingetId(identifier);
  const publisherName = normalize(yamlScalar(text, 'Publisher') || publisher || 'Unknown publisher');
  const description = normalize(yamlScalar(text, 'ShortDescription') || yamlScalar(text, 'Description') || `${name} package from Windows Package Manager.`);
  const meta = { iconUrl: yamlIconUrl(text), packageUrl: yamlScalar(text, 'PackageUrl'), publisherUrl: yamlScalar(text, 'PublisherUrl') };
  const logo = logoFromManifest(meta, curated);
  const category = categoryFor({ identifier, name, publisher: publisherName, description });
  if (!categoryNames.has(category)) throw new Error(`Unknown category ${category}`);
  return { id: slug(identifier), name, publisher: publisherName, category, description: description.slice(0, 220), platforms: ['windows-11', 'windows-10'], architectures: ['x64'], provider: 'winget', wingetId: identifier, versionStrategy: 'latest', version, versionLabel: version, versionSource: 'winget-manifest', versionStatus: 'verified', icon: categoryIconByName.get(category) || 'assets/categories/utilities.svg', logoUrl: logo.url, logoSource: logo.source, logoStatus: logo.status, logoSha256: logo.sha256 || '', popular: false, featured: false, enabled: true, silentInstall: true, website: meta.packageUrl || meta.publisherUrl || '', notes: logo.status === 'verified' ? `Logo resolved from ${logo.source}.` : logo.status === 'fallback' ? 'Logo resolved from publisher/package website favicon because no package icon was exposed.' : 'No upstream package logo was exposed; Orvexa uses the local category icon fallback.' };
}

function syncCuratedVersions(entries, updatedAt) {
  const file = path.join(root, 'shared', 'catalog.json');
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  const latestByWinget = new Map(entries.map(entry => [normalizeKey(entry.wingetId), entry]));
  const byName = new Map();

  for (const entry of entries) {
    const key = normalizeKey(entry.name);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(entry);
  }

  const missing = [];
  let updated = 0;
  let remapped = 0;

  for (const app of catalog.apps || []) {
    if (!app.enabled || app.provider !== 'winget') continue;
    let latest = latestByWinget.get(normalizeKey(app.wingetId));

    if (!latest?.version) {
      const exactNameMatches = byName.get(normalizeKey(app.name)) || [];
      if (exactNameMatches.length === 1) {
        const previousId = app.wingetId;
        latest = exactNameMatches[0];
        app.wingetId = latest.wingetId;
        remapped++;
        console.log(`Curated WinGet ID migrated: ${previousId} -> ${app.wingetId} (${app.name})`);
      }
    }

    if (!latest?.version) {
      missing.push(`${app.wingetId} [${app.name}]`);
      continue;
    }

    app.versionStrategy = 'latest';
    app.version = latest.version;
    app.versionLabel = latest.version;
    app.versionSource = 'winget-manifest';
    app.versionStatus = 'verified';
    updated++;
  }

  if (missing.length) throw new Error(`Could not resolve current WinGet version for curated packages: ${missing.join(', ')}`);
  catalog.revision = Math.max(Number(catalog.revision || 0) + 1, 12);
  catalog.lastUpdated = updatedAt;
  fs.writeFileSync(file, JSON.stringify(catalog, null, 2) + '\n');
  console.log(`Updated ${updated} curated app versions from current WinGet manifests; migrated ${remapped} stale WinGet IDs.`);
}

async function main() {
  console.log(`Fetching WinGet manifests by subtree from ${manifestsUrl}`);
  const [candidates, icons] = await Promise.all([loadWingetCandidates(), loadPackageIconIndex()]);
  console.log(`Candidate package IDs: ${candidates.length}`);
  const allEntries = [];
  const seenIds = new Set();
  let cursor = 0;
  let inspected = 0;
  const concurrency = Number.parseInt(process.env.ORVEXA_LARGE_CATALOG_CONCURRENCY || '32', 10);
  async function worker() {
    while (cursor < candidates.length) {
      const candidate = candidates[cursor++];
      const curated = icons.index.get(normalizeKey(candidate.identifier));
      const entry = await buildEntry(candidate, curated);
      inspected++;

      const baseId = entry.id;
      let id = baseId;
      let collision = 0;
      while (seenIds.has(id)) {
        collision++;
        id = `${baseId}-${hash(`${entry.wingetId}:${collision}`)}`;
      }

      seenIds.add(id);
      allEntries.push(id === entry.id ? entry : { ...entry, id });
      if (inspected % 1000 === 0) console.log(`Large catalog metadata: inspected ${inspected}/${candidates.length}, entries ${allEntries.length}`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const updatedAt = new Date().toISOString();
  syncCuratedVersions(allEntries, updatedAt);

  const seenWinget = new Set();
  const seenNames = new Set();
  const seenVerifiedLogos = new Set();
  const rank = entry => entry.logoStatus === 'verified' ? 0 : entry.logoStatus === 'fallback' ? 1 : 2;
  const entries = [];
  for (const entry of allEntries.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))) {
    const wingetKey = normalizeKey(entry.wingetId);
    const nameKey = normalizeKey(entry.name);
    const verifiedLogoKey = entry.logoStatus === 'verified' ? normalizeKey(entry.logoUrl) : '';
    if (seenWinget.has(wingetKey) || seenNames.has(nameKey)) continue;
    if (verifiedLogoKey && seenVerifiedLogos.has(verifiedLogoKey)) continue;
    seenWinget.add(wingetKey);
    seenNames.add(nameKey);
    if (verifiedLogoKey) seenVerifiedLogos.add(verifiedLogoKey);
    entries.push(entry);
    if (entries.length >= target) break;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  if (entries.length < minRequired) throw new Error(`Generated only ${entries.length} large-catalog entries; required at least ${minRequired}.`);
  const verified = entries.filter(x => x.logoStatus === 'verified').length;
  const fallback = entries.filter(x => x.logoStatus === 'fallback').length;
  const missing = entries.filter(x => x.logoStatus === 'missing').length;
  const output = { schemaVersion: 2, revision: 12, lastUpdated: updatedAt, channel: 'stable-large', source: 'microsoft/winget-pkgs + memstechtips/package-icons', sourceRef: branch, packageIconsRef: icons.commit, versionPolicy: 'Resolve the newest available WinGet manifest version per package at catalog build time and record that exact PackageVersion.', logoPolicy: 'Prefer curated package-icons or WinGet manifest IconUrl. Use publisher-site favicon when available. Keep local category fallback when no upstream logo exists; never pretend fallback is an original logo.', stats: { total: entries.length, verifiedVersions: entries.filter(x => x.versionStatus === 'verified').length, verifiedLogos: verified, faviconFallbackLogos: fallback, missingUpstreamLogos: missing }, apps: entries };
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + '\n');
  console.log(`Wrote ${output.apps.length} apps to ${path.relative(root, outFile)} | verified logos ${verified}, favicon fallbacks ${fallback}, missing upstream ${missing}`);
}

main().catch(error => { console.error(error); process.exit(1); });
