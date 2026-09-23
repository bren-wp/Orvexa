import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const exists=rel=>fs.existsSync(path.join(root,rel));

const pkg=json('package.json');
const meta=json('build/version.json');
const product=json('apps/web/data/product.json');
const html=read('apps/web/index.html');
const js=read('apps/web/js/app.js');
const css=read('apps/web/css/app.css');
const xaml=read('apps/windows/Orvexa.App/MainWindow.xaml');
const code=read('apps/windows/Orvexa.App/MainWindow.xaml.cs');
const proj=read('apps/windows/Orvexa.App/Orvexa.App.csproj');
const installer=read('installer/Orvexa.iss');
const build=read('installer/build-production.ps1');
const versionTool=read('tools/set-version.mjs');
const protocol=read('apps/windows/Orvexa.Core/ProtocolService.cs');
const cache=read('apps/windows/Orvexa.Core/CatalogCacheService.cs');
const seed=read('apps/windows/Orvexa.Core/CatalogSeedService.cs');
const atomic=read('apps/windows/Orvexa.Core/AtomicFile.cs');
const health=read('apps/windows/Orvexa.Core/HealthService.cs');
const crashLog=read('apps/windows/Orvexa.Core/CrashLogService.cs');
const favorites=read('apps/windows/Orvexa.Core/FavoritesService.cs');
const license=read('apps/windows/Orvexa.Core/LicenseService.cs');
const ci=read('.github/workflows/ci.yml');
const releaseWorkflow=read('.github/workflows/release.yml');
const catalog=json('apps/web/data/catalog.json');
const categories=json('apps/web/data/categories.json');
const packs=json('apps/web/data/packs.json').packs;
const osCatalog=json('apps/web/data/os-catalog.json').systems;
const manifest=json('apps/web/manifest.webmanifest');
const readmeDoc=read('README.md');

test('release metadata is synchronized',()=>{
  const v=meta.version;
  assert.match(v,/^\d+\.\d+\.\d+(?:-rc\.\d+)?$/);
  assert.equal(pkg.version,v);
  assert.equal(product.version,v);
  assert.match(proj,new RegExp(`<Version>${v.replaceAll('.','\\.')}<\\/Version>`));
  assert.ok(installer.includes(`MyAppVersion "${v}"`));
  assert.ok(build.includes(`Orvexa-Portable-${v}-x64.exe`));
  assert.ok(build.includes(`Orvexa-Portable-${v}-x64.zip`));
  assert.ok(build.includes(`Orvexa-Setup-${v}-x64.exe`));
  assert.ok(read('README.md').includes(`Current version: ${v}`));
  assert.ok(read('README.md').includes(`node tools/set-version.mjs ${meta.baseVersion}`));
});

test('central version tool supports RC releases and updates web metadata',()=>{
  assert.match(versionTool,/-rc\\\./);
  assert.match(versionTool,/product\.version=input/);
  assert.match(versionTool,/channel=pre\?'rc':'stable'/);
});

test('product-facing brand is Orvexa only',()=>{
  for(const surface of [html,xaml,installer,JSON.stringify(pkg)])
    assert.doesNotMatch(surface,/Orvexa\s+(Native|Suite)|Native\s+Orvexa|Suite\s+Orvexa/i);
});

test('Windows UI remains WinUI 3 and avoids forbidden desktop stacks',()=>{
  assert.match(proj,/<UseWinUI>true<\/UseWinUI>/);
  const core=fs.readdirSync(path.join(root,'apps/windows/Orvexa.Core'))
    .filter(x=>x.endsWith('.cs'))
    .map(x=>read('apps/windows/Orvexa.Core/'+x)).join('\n');
  assert.doesNotMatch(core+code+xaml,/Microsoft\.Win32|System\.Windows\.Forms|WebView|DllImport|user32\.dll|kernel32\.dll|HwndSource/i);
});

test('single-window navigation destinations are unique',()=>{
  const tags=[...xaml.matchAll(/NavigationViewItem[^>]+Tag="([^"]+)"/g)].map(x=>x[1]);
  assert.deepEqual(tags,['home','catalog','updates','installed','device','activity','settings','about']);
  assert.equal(new Set(tags).size,tags.length);
});

test('all named XAML elements are unique',()=>{
  const names=[...xaml.matchAll(/x:Name="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(new Set(names).size,names.length);
});

test('all XAML UI handlers exist in code-behind',()=>{
  for(const attr of ['Click','SelectionChanged','KeyDown','TextChanged']){
    const handlers=[...xaml.matchAll(new RegExp(attr+'="([^"]+)"','g'))].map(x=>x[1]);
    for(const handler of handlers)
      assert.match(code,new RegExp('\\b'+handler.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*\\('));
  }
});

test('Windows UI has explicit empty states for major result surfaces',()=>{
  for(const name of ['CatalogEmptyState','UpdatesEmptyState','InstalledEmptyState','ActivityEmptyState'])
    assert.match(xaml,new RegExp('x:Name="'+name+'"'));
});

test('Catalog opens from bundled curated data before a live search',()=>{
  assert.match(code,/EnsureCatalogLoaded/);
  assert.match(code,/catalogSeed\.FromBundledCatalog/);
  assert.match(seed,/provider,"winget"/);
});

test('broken one-character catalog seeding is removed',()=>{
  assert.doesNotMatch(code,/var seeds=new\[\]\{"a","b","c"/);
});

test('live search discoveries merge into the bounded cache',()=>{
  assert.match(code,/cache\.Merge\(live\)/);
  assert.match(cache,/MaxPackages=20000/);
  assert.match(cache,/MaxFileBytes=16L\*1024\*1024/);
});

test('Installed and Updates filter locally without new scans',()=>{
  assert.match(xaml,/UpdateSearchBox_TextChanged/);
  assert.match(xaml,/InstalledSearchBox_TextChanged/);
  assert.match(code,/ApplyUpdateFilter/);
  assert.match(code,/ApplyInstalledFilter/);
});

test('local JSON state uses bounded atomic file infrastructure',()=>{
  assert.match(atomic,/TryReadText/);
  assert.match(atomic,/Guid\.NewGuid/);
  assert.match(atomic,/File\.Move\(tmp,path,true\)/);
  for(const file of ['SettingsService.cs','FavoritesService.cs','ActivityService.cs','WindowStateService.cs','CatalogCacheService.cs','ProtocolService.cs'])
    assert.match(read('apps/windows/Orvexa.Core/'+file),/AtomicFile/);
});

test('System Health preserves cancellation and reports WinGet version',()=>{
  assert.match(health,/catch\(OperationCanceledException\) \{ throw; \}/);
  assert.match(health,/WingetVersion/);
  assert.match(code,/h\.WingetVersion/);
});

test('protocol activation is bounded, allowlisted and capped',()=>{
  assert.match(protocol,/MaxUriLength=8192/);
  assert.match(protocol,/uri\.Scheme,"orvexa"/);
  assert.match(protocol,/uri\.Host,"install"/);
  assert.match(protocol,/requested\.Length==0 \|\| requested\.Length>100/);
  assert.match(protocol,/PackagePolicy\.IsSafeId/);
  assert.match(code,/catalogResolver\.Resolve/);
});

test('pending protocol activation waits until UI is free and activates existing window',()=>{
  assert.match(code,/activationHandling \|\| Busy\.IsActive \|\| confirmationOpen/);
  assert.match(code,/Activate\(\)/);
});

test('destructive package operations remain confirmed in-app',()=>{
  assert.match(code,/PackageAction\.Uninstall/);
  assert.match(code,/PackageAction\.UpdateAll/);
  assert.match(code,/ContentDialog/);
  assert.match(code,/DefaultButton=ContentDialogButton\.Close/);
});

test('Windows UI avoids fragile symbol glyphs',()=>{
  assert.doesNotMatch(xaml+code,/[✓□×⌘→★☆…·]/);
});

test('Setup is an explicit per-user step-by-step wizard',()=>{
  assert.match(installer,/DefaultDirName=\{localappdata\}\\Programs\\Orvexa/);
  assert.match(installer,/PrivilegesRequired=lowest/);
  assert.match(installer,/WizardStyle=modern/);
  assert.match(installer,/DisableWelcomePage=no/);
  assert.match(installer,/DisableDirPage=no/);
  assert.match(installer,/DisableReadyPage=no/);
  assert.match(installer,/DisableFinishedPage=no/);
  assert.match(installer,/LicenseFile=LICENSE\.txt/);
  assert.match(installer,/AppMutex=Orvexa\.Application/);
});

test('Setup does not recursively wipe the install directory on uninstall',()=>{
  assert.doesNotMatch(installer,/\[UninstallDelete\]/);
});

test('production build explicitly checks native command failures and artifacts',()=>{
  assert.match(build,/Assert-NativeSuccess "dotnet restore"/);
  assert.match(build,/Assert-NativeSuccess "dotnet single-file publish"/);
  assert.match(build,/Orvexa\.App\.exe was not produced/);
  assert.match(build,/Portable archive was not produced/);
  assert.match(build,/Setup\.exe was not produced/);
});

test('production checksums hash explicit artifact paths',()=>{
  assert.match(build,/ForEach-Object \{ Get-FileHash -LiteralPath \$_ -Algorithm SHA256 \}/);
  assert.doesNotMatch(build,/@\(\$portable,\$setup\) \| Get-FileHash/);
});

test('web has unique IDs',()=>{
  const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(new Set(ids).size,ids.length);
});

test('static JavaScript ID references exist in HTML',()=>{
  const ids=new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]));
  const refs=[...js.matchAll(/\$\('#([^']+)'\)/g)].map(x=>x[1]);
  for(const id of refs) assert.ok(ids.has(id),'Missing HTML id: '+id);
});

test('web has no inline style or inline script blocks',()=>{
  assert.doesNotMatch(html,/<style\b/i);
  assert.doesNotMatch(html,/<script(?![^>]*\bsrc=)[^>]*>/i);
});

test('web has a real responsive mobile navigation',()=>{
  assert.match(html,/id="mobileNavToggle"/);
  assert.match(js,/toggleMobileNav/);
  assert.match(css,/\.main-nav\.open/);
});

test('web catalog renders incrementally and caps protocol selections',()=>{
  assert.match(js,/const PAGE_SIZE = 48/);
  assert.match(js,/const MAX_SELECTION = 100/);
  assert.match(js,/slice\(0, state\.visibleLimit\)/);
});

test('web stores Windows workflow and cycles System Light Dark themes',()=>{
  assert.match(js,/os: 'orvexa:os'/);
  assert.match(js,/theme: 'orvexa:theme'/);
  assert.match(js,/const order = \['system', 'light', 'dark'\]/);
});

test('changing Windows workflow refreshes categories packs and catalog',()=>{
  const start=js.indexOf('function selectOs');
  const end=js.indexOf('function updateOsUi');
  const body=js.slice(start,end);
  assert.match(body,/renderCategories\(\)/);
  assert.match(body,/renderPacks\(\)/);
  assert.match(body,/renderCatalog\(\)/);
  assert.match(body,/pruneSelectionForOs/);
});

test('web validates protocol download asset and Microsoft URLs',()=>{
  assert.match(js,/safeProtocol/);
  assert.match(js,/safeDownloadPath/);
  assert.match(js,/safeMicrosoftUrl/);
  assert.match(js,/status === 404 \|\| response\.status === 410/);
});

test('web download is same-origin and points to Setup alias',()=>{
  assert.equal(json('apps/web/data/config.json').download.windowsUrl,'downloads/Orvexa-Setup-x64.exe');
  assert.match(build,/Copy-Item \$setup \(Join-Path \$webDownloads "Orvexa-Setup-x64\.exe"\)/);
});

test('all catalog app icons exist locally',()=>{
  for(const app of catalog.apps){
    if(app.icon) assert.ok(exists('apps/web/'+app.icon),app.id+' missing '+app.icon);
  }
});

test('every catalog category exists in category metadata',()=>{
  const names=new Set(categories.map(x=>x.name));
  for(const app of catalog.apps) assert.ok(names.has(app.category),app.id+' unknown category '+app.category);
});

test('every pack ID points to an enabled catalog app',()=>{
  const ids=new Set(catalog.apps.filter(x=>x.enabled).map(x=>x.id));
  for(const pack of packs)
    for(const id of pack.apps) assert.ok(ids.has(id),pack.id+' missing '+id);
});

test('Windows media links use HTTPS Microsoft hosts',()=>{
  for(const item of osCatalog.filter(x=>x.type==='Windows')){
    const url=new URL(item.url);
    assert.equal(url.protocol,'https:');
    assert.ok(url.hostname==='microsoft.com'||url.hostname.endsWith('.microsoft.com'));
  }
});

test('PWA icon files exist locally',()=>{
  for(const icon of manifest.icons) assert.ok(exists('apps/web/'+icon.src),icon.src);
});

test('production web has no obsolete desktop bridge',()=>{
  assert.doesNotMatch(html+js,/orvexaDesktop|desktop-titlebar|desktop-only|electron/i);
});


test('protocol handoff uses a bounded multi-activation queue',()=>{
  assert.match(protocol,/MaxPendingActivations=8/);
  assert.match(protocol,/activation\.json/);
  assert.match(protocol,/TakeLast\(MaxPendingActivations\)/);
  assert.match(protocol,/Orvexa\.ProtocolQueue/);
});

test('recovery never reads local state without file-size bounds',()=>{
  const recovery=read('apps/windows/Orvexa.Core/RecoveryService.cs');
  assert.match(recovery,/StateLimits/);
  assert.match(recovery,/AtomicFile\.TryReadText/);
  assert.doesNotMatch(recovery,/File\.ReadAllText/);
});

test('catalog cache normalizes data after reading persisted state',()=>{
  assert.match(cache,/Normalize\(parsed\.Packages/);
});


test('atomic reads stay bounded even if a file grows during the read',()=>{
  assert.match(atomic,/new FileStream\(/);
  assert.match(atomic,/total>maxBytes/);
  assert.match(atomic,/StrictUtf8/);
  assert.doesNotMatch(atomic,/File\.ReadAllText/);
  assert.match(atomic,/stream\.Flush\(flushToDisk:true\)/);
});

test('bundled Windows data is read through bounded file infrastructure',()=>{
  assert.match(code,/TryReadBundledData/);
  assert.match(code,/MaxBundledCatalogBytes=16L\*1024\*1024/);
  assert.match(code,/MaxBundledProfilesBytes=2L\*1024\*1024/);
  assert.doesNotMatch(code,/File\.ReadAllText|File\.ReadAllTextAsync/);
});

test('crash log rotation never loads the entire oversized log into memory',()=>{
  assert.match(crashLog,/RotateAtBytes=1024L\*1024/);
  assert.match(crashLog,/KeepTailBytes=256\*1024/);
  assert.match(crashLog,/source\.Seek\(-keep,SeekOrigin\.End\)/);
  assert.doesNotMatch(crashLog,/ReadAllBytes/);
});

test('multi-select favorites use a deterministic add or remove action',()=>{
  assert.match(favorites,/public bool Set\(string id,bool isFavorite\)/);
  assert.match(code,/selected\.Any\(x=>!current\.Contains\(x\.Id\)\)/);
  assert.match(xaml,/Content="Add to favorites"/);
  assert.doesNotMatch(xaml,/Content="Toggle favorite"/);
});

test('web bounds stored sets and catalog search input',()=>{
  assert.match(js,/const MAX_FAVORITES = 5000/);
  assert.match(js,/const MAX_QUERY_LENGTH = 120/);
  assert.match(js,/readSet\(STORAGE\.selection, MAX_SELECTION\)/);
  assert.match(js,/slice\(0, MAX_QUERY_LENGTH\)/);
  assert.match(html,/id="searchInput"[^>]+maxlength="120"/);
});

test('stable releases are built and published by GitHub Actions',()=>{
  assert.match(releaseWorkflow,/branches: \[ main \]/);
  assert.match(releaseWorkflow,/contents: write/);
  assert.match(releaseWorkflow,/build-production\.ps1/);
  assert.match(releaseWorkflow,/gh release create/);
  assert.match(releaseWorkflow,/actions\/upload-artifact@v4/);
  assert.match(releaseWorkflow,/Orvexa-Setup-\$version-x64\.exe/);
});

test('CI smoke-tests the same production Windows release pipeline',()=>{
  assert.match(ci,/Windows release build smoke test/);
  assert.match(ci,/choco install innosetup/);
  assert.match(ci,/build-production\.ps1/);
  assert.match(ci,/SHA256SUMS\.txt/);
});


test('GitHub stable release hashes assets explicitly and can create an annotated tag',()=>{
  assert.match(releaseWorkflow,/ForEach-Object \{ Get-FileHash -LiteralPath \$_\.FullName -Algorithm SHA256 \}/);
  assert.doesNotMatch(releaseWorkflow,/\$assets \| Get-FileHash/);
  assert.match(releaseWorkflow,/git config user\.name \"github-actions\[bot\]\"/);
  assert.match(releaseWorkflow,/git config user\.email/);
});

test('embedded Windows license uses a valid multiline raw string',()=>{
  assert.match(license,/Text=>"""\r?\nORVEXA SOFTWARE LICENSE AGREEMENT/);
  assert.doesNotMatch(license,/Text=>"""ORVEXA/);
  assert.match(license,/\r?\n""";/);
});

test('README local image references resolve inside the repository',()=>{
  const refs=[...readmeDoc.matchAll(/src="([^"]+\.(?:svg|png|jpg|jpeg|webp))"/gi)]
    .map(match=>match[1])
    .filter(ref=>!ref.startsWith('http://')&&!ref.startsWith('https://'));
  assert.ok(refs.length>=10,'README should use real local Orvexa artwork');
  for(const ref of refs){
    assert.equal(exists(ref),true,'Missing README asset: '+ref);
  }
});


test('protocol rejects oversized, ambiguous and invalid install requests instead of truncating them',()=>{
  assert.match(protocol,/idParameters\.Length!=1/);
  assert.match(protocol,/requested\.Length==0 \|\| requested\.Length>100/);
  assert.match(protocol,/requested\.Any\(x=>!PackagePolicy\.IsSafeId\(x\)\)/);
  assert.doesNotMatch(protocol,/\.Take\(100\)/);
});

test('protocol queue persists only validated install URIs and enforces its UTF-8 byte cap',()=>{
  assert.match(protocol,/if\(!TryParseInstall\(value,out _\)\) return;/);
  assert.match(protocol,/Encoding\.UTF8\.GetByteCount\(json\)<=MaxQueueBytes/);
});


test('stable release can also be started manually without changing the automatic main release path',()=>{
  assert.match(releaseWorkflow,/push:\s*\n\s*branches: \[ main \]/);
  assert.match(releaseWorkflow,/workflow_dispatch:/);
});


test('standalone Portable EXE is built with its final filename and published as a release asset',()=>{
  assert.match(build,/\$portableBaseName="Orvexa-Portable-\$version-x64"/);
  assert.match(build,/PortableAssemblyName=\$portableBaseName/);
  assert.match(build,/PublishSingleFile=true/);
  assert.match(build,/IncludeNativeLibrariesForSelfExtract=true/);
  assert.match(build,/IncludeAllContentForSelfExtract=true/);
  assert.match(build,/published executable is renamed after publishing/);
  assert.doesNotMatch(build,/Copy-Item \$setupAppExe \$portableExe/);
  assert.match(ci,/Orvexa-Portable-\$version-x64\.exe/);
  assert.match(releaseWorkflow,/Orvexa-Portable-\$version-x64\.exe/);
});


test('portable publish rejects unexpected sidecar files and keeps folder ZIP separate',()=>{
  assert.match(build,/unexpected external runtime\/content files/);
  assert.match(build,/Compress-Archive/);
  assert.match(build,/\$setupPublish\\\*/);
  assert.match(build,/Copy without renaming/);
});


test('Portable assembly naming is scoped to the WinUI app project only',()=>{
  assert.match(proj,/PortableAssemblyName/);
  assert.match(proj,/AssemblyName Condition=/);
  assert.match(build,/PortableAssemblyName=\$portableBaseName/);
  assert.doesNotMatch(build,/\/p:AssemblyName=\$portableBaseName/);
});


test('production publish disables debug sidecars for Portable and Setup outputs',()=>{
  assert.match(build,/DebugType=None/);
  assert.match(build,/DebugSymbols=false/);
  assert.match(build,/unexpected external runtime\/content files/);
});


test('production packaging strips PDB metadata before sidecar validation',()=>{
  assert.match(build,/PDB files are debugging metadata/);
  assert.match(build,/Filter \*\.pdb \| Remove-Item -Force/);
  assert.match(build,/Portable publish produced unexpected external runtime\/content files/);
});
