import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const xaml=read('apps/windows/Orvexa.App/MainWindow.xaml');
const app=read('apps/windows/Orvexa.App/App.xaml');
const readme=read('README.md');
const ui=read('docs/UI-DESIGN.md');
const csproj=read('apps/windows/Orvexa.App/Orvexa.App.csproj');
const presentation=read('apps/windows/Orvexa.App/CatalogPresentation.cs');

test('approved Orvexa navigation order is preserved',()=>{
  const tags=[...xaml.matchAll(/NavigationViewItem[^>]+Tag="([^"]+)"/g)].map(x=>x[1]);
  assert.deepEqual(tags,['home','catalog','updates','installed','device','activity','settings','about']);
});

test('all approved mockup surfaces exist in the native shell',()=>{
  for(const name of ['HomeView','CatalogView','UpdatesView','InstalledView','DeviceView','ActivityView','SettingsView','AboutView'])
    assert.match(xaml,new RegExp(`x:Name="${name}"`));
});

test('0.0.7 visual system tokens remain available to WinUI',()=>{
  for(const token of ['OrvexaPrimaryBlue','OrvexaDeepBlue','OrvexaNavy','OrvexaSlate','OrvexaBorder','OrvexaCard','OrvexaCardElevated'])
    assert.match(app,new RegExp(`x:Key="${token}"`));
  for(const color of ['#3B82FF','#2563EB','#0B1B3D','#1E293B','#334155','#101C2F'])
    assert.match(app,new RegExp(color.replace('#','\\#')));
});

test('native app uses local brand and application artwork, not remote UI images',()=>{
  assert.match(csproj,/Assets\\Brand\\%\(Filename\)%\(Extension\)/);
  assert.match(csproj,/Assets\\Apps\\%\(Filename\)%\(Extension\)/);
  assert.match(csproj,/Assets\\Categories\\%\(Filename\)%\(Extension\)/);
  assert.match(xaml,/ms-appx:\/\/\/Assets\/Brand\/mark\.svg/);
  assert.match(presentation,/ms-appx:\/\/\/Assets\/Apps\//);
  assert.doesNotMatch(xaml,/https?:\/\//);
});

test('catalog cards are backed by bundled catalog presentation metadata',()=>{
  assert.match(xaml,/PackageIconConverter/);
  assert.match(xaml,/PackageDescriptionConverter/);
  assert.match(xaml,/PackageCategoryConverter/);
  assert.match(presentation,/catalog\.json/);
  assert.match(presentation,/MaxCatalogBytes=16L\*1024\*1024/);
  assert.match(presentation,/TryGetProperty\("description"/);
  assert.match(presentation,/TryGetProperty\("category"/);
  assert.match(presentation,/TryGetProperty\("icon"/);
});

test('primary card actions are wired to real package operations',()=>{
  for(const handler of ['CatalogInstall_Click','UpdateOne_Click','UninstallOne_Click','InstallSelected_Click','UpdateSelected_Click','UpdateAll_Click','UninstallSelected_Click'])
    assert.match(xaml,new RegExp(`Click="${handler}"`));
  const code=read('apps/windows/Orvexa.App/MainWindow.xaml.cs');
  assert.match(code,/winget\.InstallAsync\(item\.Id,true,ct\)/);
  assert.match(code,/winget\.UninstallAsync\(item\.Id,ct\)/);
  assert.match(code,/new QueueService\(winget\)\.RunAsync/);
});

test('README and UI design docs declare generated mockups as direction without creating new image sources',()=>{
  assert.match(readme,/docs\/UI-DESIGN\.md/);
  assert.match(ui,/approved Orvexa mockups generated for Home, Catalog, Updates, Installed, This PC, Activity, Settings, About/);
  assert.match(ui,/do not fabricate hardware values/);
  assert.match(ui,/No fragile Unicode glyphs/);
  assert.doesNotMatch(readme,/imagegen\.png/);
  assert.doesNotMatch(ui,/imagegen\.png/);
});
