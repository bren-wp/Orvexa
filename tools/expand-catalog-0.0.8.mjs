import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const catalogPath = path.join(root, 'shared', 'catalog.json');
const appsDir = path.join(root, 'apps', 'web', 'assets', 'apps');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const now = '2026-09-24T22:05:00+02:00';
const platforms = ['windows-11', 'windows-10'];
const architectures = ['x64'];

const additions = [
  ['chrome-beta','Google Chrome Beta','Google','Browsers','Beta channel of Google Chrome for testing upcoming browser changes.','Google.Chrome.Beta'],
  ['chrome-dev','Google Chrome Dev','Google','Browsers','Development channel of Google Chrome for early browser testing.','Google.Chrome.Dev'],
  ['firefox-developer','Firefox Developer Edition','Mozilla','Browsers','Mozilla browser channel built for web developers.','Mozilla.Firefox.DeveloperEdition'],
  ['firefox-nightly','Firefox Nightly','Mozilla','Browsers','Nightly Mozilla browser builds for testing upcoming Firefox changes.','Mozilla.Firefox.Nightly'],
  ['brave-beta','Brave Beta','Brave Software','Browsers','Beta channel of Brave with upcoming browser features.','Brave.Brave.Beta'],
  ['opera-gx','Opera GX','Opera Software','Browsers','Gaming-focused Opera browser for Windows.','Opera.OperaGX'],
  ['duckduckgo-browser','DuckDuckGo Browser','DuckDuckGo','Browsers','Privacy-focused DuckDuckGo desktop browser.','DuckDuckGo.DesktopBrowser'],
  ['wavebox','Wavebox','Wavebox','Browsers','Productivity browser for web apps and workspaces.','Wavebox.Wavebox'],

  ['microsoft-loop','Microsoft Loop','Microsoft','Office','Collaborative Microsoft workspace for notes, pages and components.','Microsoft.Loop'],
  ['microsoft-todo','Microsoft To Do','Microsoft','Office','Task management and daily planning from Microsoft.','Microsoft.Todos'],
  ['onenote','Microsoft OneNote','Microsoft','Office','Notebook and note-taking client from Microsoft.','Microsoft.OneNote'],
  ['evernote','Evernote','Evernote','Office','Notes, capture and personal knowledge management.','Evernote.Evernote'],
  ['todoist','Todoist','Doist','Office','Task manager for projects, lists and daily planning.','Doist.Todoist'],
  ['anytype','Anytype','Anytype','Office','Local-first notes, documents and personal knowledge workspace.','AnyAssociation.Anytype'],
  ['standard-notes','Standard Notes','Standard Notes','Office','Encrypted notes and writing workspace.','StandardNotes.StandardNotes'],
  ['mendeley-reference-manager','Mendeley Reference Manager','Elsevier','Office','Reference manager for research papers and citations.','Mendeley.ReferenceManager'],
  ['zotero','Zotero','Zotero','Office','Research source manager for citations and document libraries.','DigitalScholar.Zotero'],
  ['jabref','JabRef','JabRef','Office','Bibliography manager for BibTeX and research workflows.','JabRef.JabRef'],

  ['devtoys','DevToys','DevToys','Developer','Offline developer utilities for JSON, encoding, hashing and conversion tasks.','DevToys-app.DevToys'],
  ['devtoys-preview','DevToys Preview','DevToys','Developer','Preview channel of the DevToys developer utility suite.','DevToys-app.DevToys.Preview'],
  ['devhome','Dev Home','Microsoft','Developer','Microsoft developer dashboard and machine setup hub for Windows.','Microsoft.DevHome'],
  ['winget-create','WinGet Create','Microsoft','Developer','Tooling for creating Windows Package Manager manifests.','Microsoft.WingetCreate'],
  ['unigetui','UniGetUI','Martí Climent','Developer','Graphical package manager for WinGet and other package sources.','MartiCliment.UniGetUI'],
  ['nodejs-current','Node.js Current','OpenJS Foundation','Developer','Current Node.js runtime release channel.','OpenJS.NodeJS'],
  ['deno','Deno','Deno Land','Developer','Secure JavaScript, TypeScript and WebAssembly runtime.','DenoLand.Deno'],
  ['bun','Bun','Oven','Developer','Fast JavaScript runtime, bundler and package manager.','Oven-sh.Bun'],
  ['pnpm','pnpm','pnpm','Developer','Fast disk-efficient JavaScript package manager.','pnpm.pnpm'],
  ['yarn','Yarn','Yarn','Developer','JavaScript package manager for Node.js projects.','Yarn.Yarn'],
  ['eclipse-temurin-21','Eclipse Temurin JDK 21','Eclipse Adoptium','Developer','OpenJDK 21 distribution from Eclipse Adoptium.','EclipseAdoptium.Temurin.21.JDK'],
  ['openjdk-17','Microsoft OpenJDK 17','Microsoft','Developer','Microsoft build of OpenJDK 17 for Java development.','Microsoft.OpenJDK.17'],
  ['dotnet-runtime-8','Microsoft .NET Runtime 8','Microsoft','Developer','.NET 8 runtime for running framework-dependent apps.','Microsoft.DotNet.Runtime.8'],
  ['dotnet-desktop-runtime-8','Microsoft .NET Desktop Runtime 8','Microsoft','Developer','.NET 8 desktop runtime for Windows desktop apps.','Microsoft.DotNet.DesktopRuntime.8'],
  ['dotnet-aspnet-runtime-8','ASP.NET Core Runtime 8','Microsoft','Developer','ASP.NET Core 8 runtime for web applications.','Microsoft.DotNet.AspNetCore.8'],
  ['visual-studio-build-tools','Visual Studio Build Tools','Microsoft','Developer','Microsoft C++ and build tools without the full Visual Studio IDE.','Microsoft.VisualStudio.2022.BuildTools'],
  ['msys2','MSYS2','MSYS2','Developer','Unix-like build environment and package manager for Windows.','MSYS2.MSYS2'],
  ['llvm','LLVM','LLVM','Developer','LLVM compiler infrastructure and Clang toolchain.','LLVM.LLVM'],
  ['ninja','Ninja','Ninja-build','Developer','Small build system focused on speed.','Ninja-build.Ninja'],
  ['terraform','Terraform','HashiCorp','Developer','Infrastructure as code CLI for cloud and platform provisioning.','Hashicorp.Terraform'],
  ['packer','Packer','HashiCorp','Developer','Automated machine image builder from HashiCorp.','Hashicorp.Packer'],
  ['vagrant','Vagrant','HashiCorp','Developer','Development environment automation for virtualized workflows.','Hashicorp.Vagrant'],
  ['kubernetes-kubectl','kubectl','Kubernetes','Developer','Kubernetes command line client.','Kubernetes.kubectl'],
  ['helm','Helm','Helm','Developer','Kubernetes package manager.','Helm.Helm'],

  ['powerbi-desktop','Power BI Desktop','Microsoft','Office','Business intelligence reporting and data visualization desktop app.','Microsoft.PowerBI'],
  ['drawio','draw.io Desktop','JGraph','Office','Diagramming app for flowcharts, architecture and process maps.','JGraph.Draw'],
  ['dia','Dia','Dia','Office','Diagram editor for technical drawings and flowcharts.','Dia.Dia'],
  ['pdfsam-basic','PDFsam Basic','Sober Lemur','Office','PDF splitting, merging and page extraction utility.','PDFsam.PDFsam'],
  ['okular','Okular','KDE','Office','Document viewer for PDF, EPUB and other formats.','KDE.Okular'],
  ['texstudio','TeXstudio','TeXstudio','Office','LaTeX editor for technical and academic writing.','TeXstudio.TeXstudio'],
  ['miktex','MiKTeX','MiKTeX','Office','TeX and LaTeX distribution for Windows.','MiKTeX.MiKTeX'],

  ['adobe-creative-cloud','Adobe Creative Cloud','Adobe','Creative','Adobe desktop hub for Creative Cloud applications.','Adobe.CreativeCloud'],
  ['figma','Figma','Figma','Creative','Collaborative interface design desktop client.','Figma.Figma'],
  ['canva','Canva','Canva','Creative','Design and content creation desktop app.','Canva.Canva'],
  ['krita-nightly','Krita Nightly','KDE','Creative','Nightly development channel of Krita.','KDE.Krita.Nightly'],
  ['godot-mono','Godot Mono','Godot Engine','Creative','Godot build with C# / Mono support.','GodotEngine.GodotEngine.Mono'],
  ['openshot','OpenShot Video Editor','OpenShot','Creative','Open-source video editor for Windows.','OpenShot.OpenShot'],
  ['mediainfo','MediaInfo','MediaArea','Media','Technical metadata inspector for audio and video files.','MediaArea.MediaInfo.GUI'],
  ['audacious','Audacious','Audacious','Media','Lightweight music player with playlist support.','AudaciousMediaPlayer.Audacious'],
  ['clementine','Clementine','Clementine','Media','Music player and library manager.','Clementine.Clementine'],

  ['cyberduck','Cyberduck','Cyberduck','Cloud & Sync','Cloud storage, FTP, SFTP and WebDAV browser.','iterate.Cyberduck'],
  ['owncloud','ownCloud Desktop','ownCloud','Cloud & Sync','Desktop sync client for ownCloud servers.','ownCloud.ownCloudDesktop'],
  ['mountainduck','Mountain Duck','iterate','Cloud & Sync','Mount server and cloud storage as local drives.','iterate.MountainDuck'],
  ['duplicati','Duplicati','Duplicati','Cloud & Sync','Encrypted backup client for local and cloud destinations.','Duplicati.Duplicati'],
  ['restic','restic','restic','Cloud & Sync','Fast encrypted backup tool for local and remote storage.','Restic.Restic'],

  ['gpg4win','Gpg4win','GnuPG','Security','GnuPG and Kleopatra package for encryption and signing.','GnuPG.Gpg4win'],
  ['gnupg','GnuPG','GnuPG','Security','OpenPGP encryption and signing command-line tools.','GnuPG.GnuPG'],
  ['kleopatra','Kleopatra','KDE','Security','Certificate manager and graphical encryption frontend.','KDE.Kleopatra'],
  ['age','age','Filippo Valsorda','Security','Simple modern file encryption tool.','FiloSottile.age'],
  ['openssl-light','OpenSSL Light','Shining Light Productions','Security','Lightweight OpenSSL toolkit for Windows.','ShiningLight.OpenSSL.Light'],
  ['nordvpn','NordVPN','Nord Security','Security','VPN client from Nord Security.','NordSecurity.NordVPN'],

  ['mremoteng','mRemoteNG','mRemoteNG','Remote Access','Tabbed remote connection manager for multiple protocols.','mRemoteNG.mRemoteNG'],
  ['rdm-free','Remote Desktop Manager Free','Devolutions','Remote Access','Remote connection manager for RDP, SSH and credentials.','Devolutions.RemoteDesktopManagerFree'],
  ['vnc-viewer','RealVNC Viewer','RealVNC','Remote Access','VNC remote desktop viewer from RealVNC.','RealVNC.VNCViewer'],
  ['nomachine','NoMachine','NoMachine','Remote Access','Remote desktop access and streaming client.','NoMachine.NoMachine'],
  ['barrier','Barrier','Barrier','Remote Access','Share keyboard and mouse across computers.','DebaucheeOpenSourceGroup.Barrier'],

  ['battle-net','Battle.net','Blizzard Entertainment','Gaming','Blizzard game launcher and account client.','Blizzard.BattleNet'],
  ['minecraft-launcher','Minecraft Launcher','Microsoft','Gaming','Launcher for Minecraft Java and Bedrock workflows.','Mojang.MinecraftLauncher'],
  ['multimc','MultiMC','MultiMC','Gaming','Open-source Minecraft instance launcher.','MultiMC.MultiMC'],
  ['steamcmd','SteamCMD','Valve','Gaming','Command-line Steam content tool for servers and automation.','Valve.SteamCMD'],
  ['r2modman','r2modman','ebkr','Gaming','Mod manager for Thunderstore-based games.','ebkr.r2modman'],
  ['modrinth-app','Modrinth App','Modrinth','Gaming','Minecraft modpack and instance manager.','Modrinth.ModrinthApp']
];

function normalizeText(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeApp(app) {
  return {
    id: String(app.id || '').trim(),
    name: String(app.name || '').trim(),
    publisher: String(app.publisher || '').trim(),
    category: String(app.category || '').trim(),
    description: String(app.description || '').trim(),
    platforms,
    architectures,
    provider: 'winget',
    wingetId: String(app.wingetId || '').trim(),
    versionStrategy: 'latest',
    versionLabel: 'Latest via WinGet',
    icon: String(app.icon || `assets/apps/${app.id}.svg`).trim(),
    popular: Boolean(app.popular),
    featured: Boolean(app.featured),
    enabled: app.enabled !== false,
    silentInstall: app.silentInstall !== false,
    website: String(app.website || ''),
    notes: String(app.notes || '')
  };
}

function newApp([id, name, publisher, category, description, wingetId], index) {
  return normalizeApp({
    id,
    name,
    publisher,
    category,
    description,
    wingetId,
    icon: `assets/apps/${id}.svg`,
    popular: index % 9 === 0,
    featured: index % 17 === 0,
    enabled: true,
    silentInstall: true
  });
}

function makeIcon(id, name, category) {
  const initials = name.replace(/[^a-z0-9 ]/gi, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0].toUpperCase()).join('') || 'O';
  const hue = [...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 360;
  const accent = `hsl(${hue} 82% 57%)`;
  const accent2 = `hsl(${(hue + 34) % 360} 88% 44%)`;
  const label = category.replace(/[^a-z]/gi, '').slice(0, 2).toUpperCase() || 'AP';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="${name}">
  <defs>
    <linearGradient id="g" x1="12" y1="10" x2="84" y2="86" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${accent}"/>
      <stop offset="1" stop-color="${accent2}"/>
    </linearGradient>
  </defs>
  <rect width="96" height="96" rx="24" fill="#071326"/>
  <rect x="10" y="10" width="76" height="76" rx="20" fill="url(#g)" opacity=".96"/>
  <path d="M23 65 47 23l26 50H59l-5-10H40l-5 10H23Z" fill="#DBEAFE" opacity=".92"/>
  <text x="48" y="55" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="24" font-weight="800" fill="#0B1B3D">${initials}</text>
  <text x="48" y="78" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="9" font-weight="700" fill="#E0F2FE">${label}</text>
</svg>
`;
}

const seenIds = new Set();
const seenNames = new Set();
const seenWinget = new Set();
const finalApps = [];
let removed = 0;

for (const original of catalog.apps || []) {
  const app = normalizeApp(original);
  const nameKey = normalizeText(app.name);
  const wingetKey = normalizeText(app.wingetId);
  if (!app.id || seenIds.has(app.id) || seenNames.has(nameKey) || seenWinget.has(wingetKey)) {
    removed++;
    continue;
  }
  seenIds.add(app.id);
  seenNames.add(nameKey);
  seenWinget.add(wingetKey);
  finalApps.push(app);
}

let added = 0;
let skipped = 0;
for (const [index, item] of additions.entries()) {
  const app = newApp(item, index);
  const nameKey = normalizeText(app.name);
  const wingetKey = normalizeText(app.wingetId);
  if (seenIds.has(app.id) || seenNames.has(nameKey) || seenWinget.has(wingetKey)) {
    skipped++;
    continue;
  }
  seenIds.add(app.id);
  seenNames.add(nameKey);
  seenWinget.add(wingetKey);
  finalApps.push(app);
  added++;
}

finalApps.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
for (const app of finalApps) {
  const iconPath = path.join(root, 'apps', 'web', app.icon);
  if (!fs.existsSync(iconPath)) {
    fs.mkdirSync(path.dirname(iconPath), { recursive: true });
    fs.writeFileSync(iconPath, makeIcon(app.id, app.name, app.category), 'utf8');
  }
}

const next = {
  schemaVersion: 1,
  revision: Math.max(Number(catalog.revision || 0) + 1, 8),
  lastUpdated: now,
  channel: 'stable',
  apps: finalApps
};

fs.writeFileSync(catalogPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
console.log(`Catalog expanded: ${finalApps.length} apps, ${added} added, ${removed} duplicates removed, ${skipped} skipped.`);
