import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const target = Number.parseInt(process.env.ORVEXA_LARGE_CATALOG_TARGET || '5200', 10);
const minRequired = Number.parseInt(process.env.ORVEXA_LARGE_CATALOG_MIN || '5001', 10);
const branch = process.env.WINGET_PKGS_REF || 'master';
const treeUrl = `https://api.github.com/repos/microsoft/winget-pkgs/git/trees/${branch}?recursive=1`;
const packageIconsRepo = 'memstechtips/package-icons';
const packageIconsRef = process.env.ORVEXA_PACKAGE_ICONS_REF || 'dev';
const packageIconsBranchUrl = `https://api.github.com/repos/${packageIconsRepo}/branches/${packageIconsRef}`;
const packageIconsManifestUrl = `https://raw.githubusercontent.com/${packageIconsRepo}/${packageIconsRef}/manifest.json`;
const headers = {
  accept: 'application/vnd.github+json',
  'user-agent': 'Orvexa-large-catalog-builder'
};
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

async function fetchJson(url, attempt = 1) {
  const response = await fetch(url, { headers });
  if (response.status === 404) return null;
  if (response.status === 403 || response.status === 429 || response.status >= 500) {
    if (attempt < 4) {
      await sleep(650 * attempt);
      return await fetchJson(url, attempt + 1);
    }
  }
  if (!response.ok) return null;
  try { return await response.json(); } catch { return null; }
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
  const branch = await fetchJson(packageIconsBranchUrl);
  const commit = branch?.commit?.sha || packageIconsRef;
  const manifest = await fetchJson(packageIconsManifestUrl);
  const index = new Map();
  for (const [fileName, meta] of Object.entries(manifest?.icons || {})) {
    for (const id of meta.winget || []) {
      index.set(normalizeKey(id), {
        url: `https://cdn.jsdelivr.net/gh/${packageIconsRepo}@${commit}/icons/${encodeURIComponent(fileName)}`,
        source: 'package-icons-curated',
        name: meta.name || '',
        sha256: meta.sha256 || ''
      });
    }
  }
  console.log(`Package-icons index: ${index.size} WinGet mappings from ${packageIconsRepo}@${commit}`);
  return { index, commit };
}

async function loadWingetRun(identifier) {
  const { publisher, packageName } = splitWingetId(identifier);
  const url = `https://winget.run/v2/packages/${encodeURIComponent(publisher)}/${encodeURIComponent(packageName)}`;
  const data = await fetchJson(url);
  return data?.Package || data?.package || data || null;
}

function logoFromPackage(identifier, pkg, curated) {
  if (curated) return { url: curated.url, source: curated.source, status: 'verified', sha256: curated.sha256 };
  const icon = pkg?.IconUrl || pkg?.Logo;
  if (typeof icon === 'string' && /^https:\/\//i.test(icon)) return { url: icon, source: 'winget-run-icon', status: 'verified' };
  const homepage = pkg?.Latest?.Homepage || pkg?.latest?.homepage || '';
  if (/^https?:\/\//i.test(homepage)) {
    try {
      const host = new URL(homepage).hostname;
      if (host && host.split('.').length > 1) {
        return { url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`, source: 'publisher-site-favicon', status: 'fallback' };
      }
    } catch {}
  }
  return { url: '', source: 'missing-upstream-logo', status: 'missing' };
}

function buildEntry(identifier, pkg, curated, seenIds) {
  const latest = pkg?.Latest || pkg?.latest || {};
  const name = normalize(latest.Name || latest.name || curated?.name || titleFromIdentifier(identifier));
  const { publisher } = splitWingetId(identifier);
  const publisherName = normalize(latest.Publisher || latest.publisher || publisher || 'Unknown publisher');
  const description = normalize(latest.Description || latest.description || `${name} package from Windows Package Manager.`);
  const logo = logoFromPackage(identifier, pkg, curated);
  const category = categoryFor({ identifier, name, publisher: publisherName, description });
  if (!categoryNames.has(category)) throw new Error(`Unknown category ${category}`);

  const baseId = slug(identifier);
  let id = baseId;
  if (seenIds.has(id)) id = `${baseId}-${hash(identifier)}`;
  return {
    id,
    name,
    publisher: publisherName,
    category,
    description: description.slice(0, 220),
    platforms: ['windows-11', 'windows-10'],
    architectures: ['x64'],
    provider: 'winget',
    wingetId: identifier,
    versionStrategy: 'latest',
    versionLabel: 'Latest via WinGet',
    icon: categoryIconByName.get(category) || 'assets/categories/utilities.svg',
    logoUrl: logo.url,
    logoSource: logo.source,
    logoStatus: logo.status,
    logoSha256: logo.sha256 || '',
    popular: false,
    featured: false,
    enabled: true,
    silentInstall: true,
    website: latest.Homepage || latest.homepage || '',
    notes: logo.status === 'verified'
      ? `Logo resolved from ${logo.source}.`
      : logo.status === 'fallback'
        ? 'Logo resolved from publisher/package website favicon because no package icon was exposed.'
        : 'No upstream package logo was exposed; Orvexa uses the local category icon fallback.'
  };
}

async function main() {
  console.log(`Fetching WinGet tree from ${treeUrl}`);
  const [tree, icons] = await Promise.all([fetchJson(treeUrl), loadPackageIconIndex()]);
  if (!tree?.tree) throw new Error('Could not read WinGet package tree.');

  const identifiers = [...new Set((tree.tree || [])
    .filter(x => x.type === 'blob' && /^manifests\//.test(x.path) && /\.locale\.en-US\.ya?ml$/i.test(x.path))
    .map(x => x.path.split('/').pop()?.replace(/\.locale\.en-US\.ya?ml$/i, '') || '')
    .filter(x => /^[A-Za-z0-9.+_-]+(?:\.[A-Za-z0-9.+_-]+)+$/.test(x)))]
    .sort((a, b) => a.localeCompare(b));

  console.log(`Candidate package IDs: ${identifiers.length}${tree.truncated ? ' (GitHub tree was truncated)' : ''}`);
  const entries = [];
  const seenWinget = new Set();
  const seenNames = new Set();
  const seenIds = new Set();
  let cursor = 0;
  let inspected = 0;
  const concurrency = Number.parseInt(process.env.ORVEXA_LARGE_CATALOG_CONCURRENCY || '32', 10);

  async function worker() {
    while (entries.length < target && cursor < identifiers.length) {
      const identifier = identifiers[cursor++];
      const wingetKey = normalizeKey(identifier);
      if (seenWinget.has(wingetKey)) continue;
      const pkg = await loadWingetRun(identifier);
      const curated = icons.index.get(wingetKey);
      const entry = buildEntry(identifier, pkg, curated, seenIds);
      inspected++;
      const nameKey = normalizeKey(entry.name);
      if (seenNames.has(nameKey) || seenIds.has(entry.id)) continue;
      seenWinget.add(wingetKey);
      seenNames.add(nameKey);
      seenIds.add(entry.id);
      entries.push(entry);
      if (entries.length % 500 === 0) console.log(`Large catalog: ${entries.length}/${target} apps, inspected ${inspected} package IDs`);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  entries.sort((a, b) => a.name.localeCompare(b.name));
  if (entries.length < minRequired) throw new Error(`Generated only ${entries.length} large-catalog entries; required at least ${minRequired}.`);

  const verified = entries.filter(x => x.logoStatus === 'verified').length;
  const fallback = entries.filter(x => x.logoStatus === 'fallback').length;
  const missing = entries.filter(x => x.logoStatus === 'missing').length;
  const output = {
    schemaVersion: 2,
    revision: 9,
    lastUpdated: new Date().toISOString(),
    channel: 'stable-large',
    source: 'microsoft/winget-pkgs + winget.run + memstechtips/package-icons',
    sourceRef: branch,
    packageIconsRef: icons.commit,
    logoPolicy: 'Prefer curated package-icons or winget.run package icons. Use publisher-site favicon when available. Keep local category fallback when no upstream logo exists; never pretend fallback is an original logo.',
    stats: { total: entries.length, verifiedLogos: verified, faviconFallbackLogos: fallback, missingUpstreamLogos: missing },
    apps: entries.slice(0, target)
  };

  fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + '\n');
  console.log(`Wrote ${output.apps.length} apps to ${path.relative(root, outFile)} | verified logos ${verified}, favicon fallbacks ${fallback}, missing upstream ${missing}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
