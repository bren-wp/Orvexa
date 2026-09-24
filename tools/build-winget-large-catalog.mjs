import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const target = Number.parseInt(process.env.ORVEXA_LARGE_CATALOG_TARGET || '5200', 10);
const minRequired = Number.parseInt(process.env.ORVEXA_LARGE_CATALOG_MIN || '5001', 10);
const branch = process.env.WINGET_PKGS_REF || 'master';
const treeUrl = `https://api.github.com/repos/microsoft/winget-pkgs/git/trees/${branch}?recursive=1`;
const rawBase = `https://raw.githubusercontent.com/microsoft/winget-pkgs/${branch}/`;
const headers = {
  'accept': 'application/vnd.github+json',
  'user-agent': 'Orvexa-large-catalog-builder'
};
if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const categories = JSON.parse(fs.readFileSync(path.join(root, 'shared', 'categories.json'), 'utf8'));
const categoryNames = new Set(categories.map(x => x.name));
const fallbackIcon = 'assets/categories/utilities.svg';
const outFile = path.join(root, 'shared', 'catalog-large.json');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const normalize = value => String(value || '').trim().replace(/\s+/g, ' ');
const normalizeKey = value => normalize(value).toLowerCase();
const hash = value => crypto.createHash('sha1').update(value).digest('hex').slice(0, 8);
const slug = value => normalize(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80) || 'app';

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

function logoCandidate(iconUrl, packageUrl, publisherUrl) {
  if (/^https:\/\//i.test(iconUrl)) return { url: iconUrl, source: 'winget-manifest-icon' };
  const site = /^https?:\/\//i.test(packageUrl) ? packageUrl : /^https?:\/\//i.test(publisherUrl) ? publisherUrl : '';
  if (!site) return null;
  try {
    const host = new URL(site).hostname;
    if (!host || host.split('.').length < 2) return null;
    return { url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`, source: 'publisher-site-favicon' };
  } catch {
    return null;
  }
}

function categoryFor(entry) {
  const hay = `${entry.identifier} ${entry.name} ${entry.publisher} ${entry.description}`.toLowerCase();
  const checks = [
    ['Browsers', /browser|chromium|firefox|brave|vivaldi|opera|edge|tor/],
    ['Messaging', /slack|discord|teams|zoom|telegram|signal|chat|messenger|matrix|mail|thunderbird/],
    ['Media', /video|audio|media|player|music|podcast|vlc|plex|jellyfin|obs|stream|codec/],
    ['Office', /office|pdf|document|note|writer|spreadsheet|markdown|obsidian|notion|libreoffice|onlyoffice/],
    ['Developer', /developer|code|sdk|ide|git|python|node|java|docker|kubernetes|terminal|shell|api|postman|jetbrains|visual studio|compiler|database|sql/],
    ['Gaming', /game|gaming|steam|epic games|battle|gog|minecraft|emulator|retroarch/],
    ['Security', /security|password|vpn|auth|encrypt|firewall|malware|antivirus|bitwarden|keepass|keychain/],
    ['Cloud & Sync', /cloud|sync|drive|dropbox|onedrive|backup|nextcloud|ftp|sftp/],
    ['Creative', /creative|design|photo|image|paint|vector|figma|blender|cad|3d|drawing|editor/],
    ['Remote Access', /remote|rdp|vnc|ssh|anydesk|teamviewer|parsec|rustdesk/]
  ];
  return checks.find(([, rx]) => rx.test(hay))?.[0] ?? 'Utilities';
}

async function fetchJson(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  return await response.json();
}

async function fetchText(url, attempt = 1) {
  const response = await fetch(url, { headers });
  if (response.status === 404) return '';
  if (response.status === 403 || response.status === 429 || response.status >= 500) {
    if (attempt < 4) {
      await sleep(800 * attempt);
      return await fetchText(url, attempt + 1);
    }
  }
  if (!response.ok) return '';
  return await response.text();
}

function parseManifest(text) {
  const identifier = yamlScalar(text, 'PackageIdentifier');
  const name = yamlScalar(text, 'PackageName');
  const publisher = yamlScalar(text, 'Publisher') || 'Unknown publisher';
  const description = yamlScalar(text, 'ShortDescription') || yamlScalar(text, 'Description') || `${name || identifier} package from WinGet.`;
  const packageUrl = yamlScalar(text, 'PackageUrl');
  const publisherUrl = yamlScalar(text, 'PublisherUrl');
  const iconUrl = yamlIconUrl(text);
  if (!/^[A-Za-z0-9.+_-]+(?:\.[A-Za-z0-9.+_-]+)+$/.test(identifier)) return null;
  if (!name || name.length > 120) return null;
  const logo = logoCandidate(iconUrl, packageUrl, publisherUrl);
  if (!logo) return null;
  return { identifier, name, publisher, description, packageUrl, publisherUrl, logoUrl: logo.url, logoSource: logo.source };
}

async function main() {
  console.log(`Fetching WinGet tree from ${treeUrl}`);
  const tree = await fetchJson(treeUrl);
  const files = (tree.tree || [])
    .filter(x => x.type === 'blob' && /^manifests\//.test(x.path) && /\.locale\.en-US\.ya?ml$/i.test(x.path))
    .sort((a, b) => a.path.localeCompare(b.path));

  console.log(`Candidate locale manifests: ${files.length}${tree.truncated ? ' (GitHub tree was truncated)' : ''}`);
  const entries = [];
  const seenWinget = new Set();
  const seenNames = new Set();
  const seenIds = new Set();
  let cursor = 0;
  let inspected = 0;
  const concurrency = Number.parseInt(process.env.ORVEXA_LARGE_CATALOG_CONCURRENCY || '24', 10);

  async function worker(workerId) {
    while (entries.length < target && cursor < files.length) {
      const current = files[cursor++];
      const raw = `${rawBase}${current.path.split('/').map(encodeURIComponent).join('/')}`;
      const text = await fetchText(raw);
      inspected++;
      if (!text) continue;
      const parsed = parseManifest(text);
      if (!parsed) continue;
      const wingetKey = normalizeKey(parsed.identifier);
      const nameKey = normalizeKey(parsed.name);
      if (seenWinget.has(wingetKey) || seenNames.has(nameKey)) continue;

      const baseId = slug(parsed.identifier);
      let id = baseId;
      if (seenIds.has(id)) id = `${baseId}-${hash(parsed.identifier)}`;
      if (seenIds.has(id)) continue;

      const category = categoryFor(parsed);
      if (!categoryNames.has(category)) throw new Error(`Unknown category ${category}`);

      seenWinget.add(wingetKey);
      seenNames.add(nameKey);
      seenIds.add(id);
      entries.push({
        id,
        name: parsed.name,
        publisher: parsed.publisher,
        category,
        description: parsed.description.slice(0, 220),
        platforms: ['windows-11', 'windows-10'],
        architectures: ['x64'],
        provider: 'winget',
        wingetId: parsed.identifier,
        versionStrategy: 'latest',
        versionLabel: 'Latest via WinGet',
        icon: fallbackIcon,
        logoUrl: parsed.logoUrl,
        logoSource: parsed.logoSource,
        originalLogoVerified: parsed.logoSource === 'winget-manifest-icon',
        popular: false,
        featured: false,
        enabled: true,
        silentInstall: true,
        website: parsed.packageUrl || parsed.publisherUrl || '',
        notes: parsed.logoSource === 'winget-manifest-icon'
          ? 'Logo URL sourced from the official WinGet manifest metadata.'
          : 'Logo URL resolved from the package or publisher website favicon when WinGet did not expose an IconUrl.'
      });

      if (entries.length % 500 === 0) console.log(`Large catalog: ${entries.length}/${target} apps, inspected ${inspected} manifests`);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, (_, index) => worker(index)));
  entries.sort((a, b) => a.name.localeCompare(b.name));
  if (entries.length < minRequired) {
    throw new Error(`Generated only ${entries.length} large-catalog entries; required at least ${minRequired}.`);
  }

  const output = {
    schemaVersion: 2,
    revision: 9,
    lastUpdated: new Date().toISOString(),
    channel: 'stable-large',
    source: 'microsoft/winget-pkgs',
    sourceRef: branch,
    logoPolicy: 'Use WinGet manifest IconUrl when available; otherwise resolve package/publisher website favicon URL. Entries without any upstream logo URL are excluded.',
    apps: entries.slice(0, target)
  };

  fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + '\n');
  console.log(`Wrote ${output.apps.length} apps to ${path.relative(root, outFile)}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
