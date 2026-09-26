import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const write = (file, text) => fs.writeFileSync(file, text);

function replace(file, from, to) {
  const current = read(file);
  if (!current.includes(from)) throw new Error(`${file}: expected text not found: ${from.slice(0, 160)}`);
  write(file, current.replace(from, to));
}

function replaceAll(file, pairs) {
  let current = read(file);
  for (const [from, to] of pairs) {
    if (!current.includes(from)) throw new Error(`${file}: expected text not found: ${from.slice(0, 160)}`);
    current = current.replace(from, to);
  }
  write(file, current);
}

replaceAll('apps/windows/Orvexa.App/MainWindow.xaml.cs', [
  [
    'const int CatalogDisplayLimit=320;',
    'const int CatalogDisplayPageSize=320;\n    int catalogDisplayLimit=CatalogDisplayPageSize;'
  ],
  [
    '            catalogItems=LoadBundledCatalogPackages();\n            if(catalogItems.Count==0)',
    '            catalogItems=LoadBundledCatalogPackages();\n            catalogDisplayLimit=CatalogDisplayPageSize;\n            if(catalogItems.Count==0)'
  ],
  [
    '        InstallSelectedButton.IsEnabled=false;\n        CatalogResults.SelectedItems.Clear();',
    '        catalogDisplayLimit=CatalogDisplayPageSize;\n        InstallSelectedButton.IsEnabled=false;\n        CatalogResults.SelectedItems.Clear();'
  ],
  [
    `        var total=visible.Count;\n        var shouldCap=FavoritesOnlyToggle.IsChecked!=true && total>CatalogDisplayLimit;\n        var shown=shouldCap ? visible.Take(CatalogDisplayLimit).ToArray() : visible;\n\n        CatalogResults.ItemsSource=shown;\n        CatalogEmptyState.Visibility=shown.Count==0?Visibility.Visible:Visibility.Collapsed;\n        CatalogCountText.Text=shouldCap\n            ? $"Showing {shown.Count:n0} of {total:n0} trusted apps. Use search to narrow the full catalog."\n            : $"Showing {shown.Count:n0} trusted app(s).";`,
    `        var total=visible.Count;\n        var effectiveLimit=Math.Max(CatalogDisplayPageSize,catalogDisplayLimit);\n        var shouldPage=FavoritesOnlyToggle.IsChecked!=true && total>effectiveLimit;\n        var shown=shouldPage ? visible.Take(effectiveLimit).ToArray() : visible;\n        catalogDisplayLimit=shown.Count==0?CatalogDisplayPageSize:Math.Max(CatalogDisplayPageSize,shown.Count);\n\n        CatalogResults.ItemsSource=shown;\n        CatalogEmptyState.Visibility=shown.Count==0?Visibility.Visible:Visibility.Collapsed;\n        ShowMoreCatalogButton.Visibility=shouldPage?Visibility.Visible:Visibility.Collapsed;\n        ShowMoreCatalogButton.Content=shouldPage\n            ? $"Show next {Math.Min(CatalogDisplayPageSize,total-shown.Count):n0} apps"\n            : "All visible apps loaded";\n        CatalogCountText.Text=shouldPage\n            ? $"Showing {shown.Count:n0} of {total:n0} trusted apps. Continue in batches or search by name/WinGet ID."\n            : $"Showing {shown.Count:n0} of {total:n0} trusted app(s).";`
  ],
  [
    `    void FavoritesOnly_Click(object sender,RoutedEventArgs e)\n    {\n        CatalogResults.SelectedItems.Clear();\n        ApplyCatalogFilter();\n        QueueStatus.Text=FavoritesOnlyToggle.IsChecked==true?"Showing favorites only.":"Showing all catalog results.";\n    }`,
    `    void ShowMoreCatalog_Click(object sender,RoutedEventArgs e)\n    {\n        catalogDisplayLimit+=CatalogDisplayPageSize;\n        CatalogResults.SelectedItems.Clear();\n        ApplyCatalogFilter();\n        QueueStatus.Text=$"Showing more catalog apps | {catalogDisplayLimit:n0} loaded window.";\n    }\n\n    void ClearCatalogSearch_Click(object sender,RoutedEventArgs e)\n    {\n        SearchBox.Text="";\n        catalogDisplayLimit=CatalogDisplayPageSize;\n        CatalogResults.SelectedItems.Clear();\n        catalogItems=LoadBundledCatalogPackages();\n        if(catalogItems.Count>0) cache.Merge(catalogItems);\n        ApplyCatalogFilter();\n        QueueStatus.Text=catalogItems.Count==0\n            ? "The local catalog could not be loaded."\n            : $"Catalog reset | {catalogItems.Count:n0} trusted packages";\n    }\n\n    void FavoritesOnly_Click(object sender,RoutedEventArgs e)\n    {\n        catalogDisplayLimit=CatalogDisplayPageSize;\n        CatalogResults.SelectedItems.Clear();\n        ApplyCatalogFilter();\n        QueueStatus.Text=FavoritesOnlyToggle.IsChecked==true?"Showing favorites only.":"Showing all catalog results.";\n    }`
  ],
  [
    '            cache.Merge(packages);\n            catalogItems=packages;\n            ApplyCatalogFilter();',
    '            cache.Merge(packages);\n            catalogItems=packages;\n            catalogDisplayLimit=CatalogDisplayPageSize;\n            ApplyCatalogFilter();'
  ]
]);

replaceAll('apps/windows/Orvexa.App/MainWindow.xaml', [
  [
    '<Button Content="Search" Click="Search_Click" Style="{StaticResource OrvexaPrimaryButtonStyle}"/>\n                        <Button Content="Refresh local catalog" Click="BuildIndex_Click" Style="{StaticResource OrvexaSecondaryButtonStyle}"/>',
    '<Button Content="Search" Click="Search_Click" Style="{StaticResource OrvexaPrimaryButtonStyle}"/>\n                        <Button Content="Clear search" Click="ClearCatalogSearch_Click" Style="{StaticResource OrvexaSecondaryButtonStyle}"/>\n                        <Button Content="Refresh local catalog" Click="BuildIndex_Click" Style="{StaticResource OrvexaSecondaryButtonStyle}"/>'
  ],
  [
    '<ToggleButton x:Name="FavoritesOnlyToggle" Content="Favorites only" Click="FavoritesOnly_Click" Style="{StaticResource OrvexaChipStyle}"/>',
    '<ToggleButton x:Name="FavoritesOnlyToggle" Content="Favorites only" Click="FavoritesOnly_Click" Style="{StaticResource OrvexaChipStyle}"/>\n                        <Button x:Name="ShowMoreCatalogButton" Content="Show more apps" Click="ShowMoreCatalog_Click" Visibility="Collapsed" Style="{StaticResource OrvexaSecondaryButtonStyle}"/>'
  ],
  [
    'Try another search or refresh the local catalog.',
    'Try another search, clear the current search, or refresh the local catalog.'
  ]
]);

let qa = read('qa/orvexa.test.mjs');
qa = qa.replace('assert.match(code,/CatalogDisplayLimit=320/);', 'assert.match(code,/CatalogDisplayPageSize=320/);');
if (!qa.includes("large catalog UI pages results instead of rendering every app at once")) {
  const anchor = `test('Catalog opens from bundled curated data before a live search',()=>{\n  assert.match(code,/EnsureCatalogLoaded/);\n  assert.match(code,/catalogSeed\\.FromBundledCatalog/);\n  assert.match(seed,/provider,"winget"/);\n});`;
  if (!qa.includes(anchor)) throw new Error('qa/orvexa.test.mjs: catalog bundled-data test anchor not found');
  qa = qa.replace(anchor, `${anchor}\n\ntest('large catalog UI pages results instead of rendering every app at once',()=>{\n  assert.match(code,/CatalogDisplayPageSize=320/);\n  assert.match(code,/catalogDisplayLimit\\+=CatalogDisplayPageSize/);\n  assert.match(code,/ShowMoreCatalog_Click/);\n  assert.match(code,/ClearCatalogSearch_Click/);\n  assert.match(xaml,/ShowMoreCatalogButton/);\n  assert.match(xaml,/Content="Clear search"/);\n  assert.doesNotMatch(code,/Take\\(CatalogDisplayLimit\\)/);\n});`);
}
write('qa/orvexa.test.mjs', qa);

let changelog = read('docs/CHANGELOG.md');
if (!changelog.includes('## 0.0.11')) {
  changelog = changelog.replace('# Changelog\n\n', `# Changelog\n\n## 0.0.11 - 2026-09-26\n\n- Improved the Windows Catalog UX for the 10,500-app dataset with explicit paged loading instead of a fixed one-page cap.\n- Added a Clear search action that resets the bundled catalog view, clears selections and reloads the trusted local catalog state.\n- Reset catalog paging when switching favorites, refreshing the local catalog or starting a new search so stale selection windows do not leak between modes.\n- Added QA coverage that verifies the large-catalog UI uses Show more paging controls and does not regress to rendering every bundled app at once.\n\n`);
}
write('docs/CHANGELOG.md', changelog);
