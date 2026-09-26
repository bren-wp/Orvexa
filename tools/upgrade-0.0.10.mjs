import fs from 'node:fs';

const mode = process.argv[2] || 'patch';
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

function patchFiles() {
  replaceAll('tools/build-winget-large-catalog.mjs', [
    ["process.env.ORVEXA_LARGE_CATALOG_TARGET || '5200'", "process.env.ORVEXA_LARGE_CATALOG_TARGET || '10500'"],
    ["process.env.ORVEXA_LARGE_CATALOG_MIN || '5001'", "process.env.ORVEXA_LARGE_CATALOG_MIN || '10001'"],
    ['revision: 9,', 'revision: 10,'],
  ]);

  replaceAll('tools/validate-large-catalog.mjs', [
    ["const allowedLogoSources = new Set(['package-icons-curated', 'winget-run-icon', 'publisher-site-favicon', 'missing-upstream-logo']);", "const allowedLogoSources = new Set(['package-icons-curated', 'winget-manifest-icon', 'winget-run-icon', 'publisher-site-favicon', 'missing-upstream-logo']);"],
    ["if (!Array.isArray(catalog.apps) || catalog.apps.length <= 5000) errors.push('large catalog must contain more than 5000 applications');", "if (!Array.isArray(catalog.apps) || catalog.apps.length < 10001) errors.push('large catalog must contain at least 10,001 applications');"],
    ["if (catalog.revision < 9) errors.push('large catalog revision must be at least 9');", "if (catalog.revision < 10) errors.push('large catalog revision must be at least 10');"],
    ["if (verified < 50) errors.push(`expected at least 50 verified upstream logos, got ${verified}`);", "if (verified < 100) errors.push(`expected at least 100 verified upstream logos, got ${verified}`);"],
    ["if (verified + fallback < 500) errors.push(`expected at least 500 upstream logo/favicons, got ${verified + fallback}`);", "if (verified + fallback < 10001) errors.push(`expected at least 10,001 upstream logo/favicons, got ${verified + fallback}`);"],
  ]);

  replace('apps/windows/Orvexa.App/MainWindow.xaml.cs',
    'const long MaxBundledCatalogBytes=64L*1024*1024;\n    const long MaxBundledProfilesBytes=2L*1024*1024;',
    'const long MaxBundledCatalogBytes=96L*1024*1024;\n    const long MaxBundledProfilesBytes=2L*1024*1024;\n    const int CatalogDisplayLimit=320;');

  replace('apps/windows/Orvexa.App/MainWindow.xaml.cs',
    '        CatalogResults.ItemsSource=visible;\n        CatalogEmptyState.Visibility=visible.Count==0?Visibility.Visible:Visibility.Collapsed;',
    '        var total=visible.Count;\n        var shouldCap=FavoritesOnlyToggle.IsChecked!=true && total>CatalogDisplayLimit;\n        var shown=shouldCap ? visible.Take(CatalogDisplayLimit).ToArray() : visible;\n\n        CatalogResults.ItemsSource=shown;\n        CatalogEmptyState.Visibility=shown.Count==0?Visibility.Visible:Visibility.Collapsed;\n        CatalogCountText.Text=shouldCap\n            ? $"Showing {shown.Count:n0} of {total:n0} trusted apps. Use search to narrow the full catalog."\n            : $"Showing {shown.Count:n0} trusted app(s).";');

  replace('apps/windows/Orvexa.App/MainWindow.xaml',
    '<TextBlock Text="Discover and install high-quality, trusted Windows applications." Style="{StaticResource OrvexaSecondaryTextStyle}"/>',
    '<TextBlock Text="Discover and install high-quality, trusted Windows applications." Style="{StaticResource OrvexaSecondaryTextStyle}"/>\n                            <TextBlock x:Name="CatalogCountText" Text="Catalog loads on demand with validated WinGet package IDs." Style="{StaticResource OrvexaSecondaryTextStyle}" FontSize="12"/>');

  replaceAll('apps/windows/Orvexa.App/MainWindow.xaml', [
    ['<TextBlock Text="All" Foreground="White" FontWeight="SemiBold"/>', '<TextBlock Text="10k+ apps" Foreground="White" FontWeight="SemiBold"/>'],
    ['<TextBlock Text="Browsers"/>', '<TextBlock Text="WinGet-backed"/>'],
    ['<TextBlock Text="Development"/>', '<TextBlock Text="No duplicate IDs"/>'],
    ['<TextBlock Text="Communication"/>', '<TextBlock Text="Logo provenance"/>'],
    ['<TextBlock Text="Multimedia"/>', '<TextBlock Text="Curated + large"/>'],
    ['<TextBlock Text="Utilities"/>', '<TextBlock Text="Favorites"/>'],
    ['<TextBlock Text="Productivity"/>', '<TextBlock Text="Search first"/>'],
    ['<TextBlock Text="Security"/>', '<TextBlock Text="Install gated"/>'],
  ]);

  const productionValidator = [
    "import fs from 'node:fs';",
    "import path from 'node:path';",
    '',
    "const roots = ['apps', 'installer', 'tools'];",
    "const ignoredDirs = new Set(['bin', 'obj', 'node_modules', '.git']);",
    "const allowedExtensions = new Set(['.cs', '.xaml', '.xml', '.json', '.js', '.mjs', '.ps1', '.iss']);",
    'const forbidden = [',
    '  /lorem ipsum/i,',
    '  /todo:\\s/i,',
    '  /fixme:\\s/i,',
    '  /placeholder copy/i,',
    '  /dummy data/i,',
    '  /sample text/i,',
    '  /mockup only/i,',
    '  /not for production/i,',
    '  /dev text/i,',
    '  /development placeholder/i,',
    '];',
    'const findings = [];',
    '',
    'function walk(dir) {',
    '  if (!fs.existsSync(dir)) return;',
    '  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {',
    '    if (ignoredDirs.has(entry.name)) continue;',
    '    const full = path.join(dir, entry.name);',
    '    if (entry.isDirectory()) { walk(full); continue; }',
    '    if (!allowedExtensions.has(path.extname(entry.name).toLowerCase())) continue;',
    "    const text = fs.readFileSync(full, 'utf8');",
    '    for (const rx of forbidden) {',
    '      const match = text.match(rx);',
    "      if (match) findings.push(full + ': ' + match[0]);",
    '    }',
    '  }',
    '}',
    'for (const root of roots) walk(root);',
    'if (findings.length) {',
    "  console.error('Production content validation failed:');",
    "  console.error(findings.join('\\n'));",
    '  process.exit(1);',
    '}',
    "console.log('Production content OK: no blocked placeholder/dev copy found in shipped app, installer, or tools.');",
    ''
  ].join('\n');
  write('tools/validate-production-content.mjs', productionValidator);

  const pkg = JSON.parse(read('package.json'));
  pkg.scripts.qa = 'node --test qa/orvexa.test.mjs qa/ui-parity.test.mjs && node --check apps/web/js/app.js && node --check tools/set-version.mjs && node --check tools/build-winget-large-catalog.mjs && node --check tools/validate-large-catalog.mjs && node --check tools/validate-production-content.mjs && node tools/validate-catalog.mjs && node tools/validate-large-catalog.mjs && node tools/validate-production-content.mjs';
  write('package.json', JSON.stringify(pkg, null, 2) + '\n');
}

function updateDocs() {
  const large = JSON.parse(read('shared/catalog-large.json'));
  const nf = new Intl.NumberFormat('en-US');
  const total = nf.format(large.stats.total);
  const verified = nf.format(large.stats.verifiedLogos);
  const fallback = nf.format(large.stats.faviconFallbackLogos);
  const missing = nf.format(large.stats.missingUpstreamLogos);
  const sourceTotal = nf.format(13883);

  let readme = read('README.md');
  readme = readme
    .replace(/catalog-5200%2B%20apps/g, 'catalog-10000%2B%20apps')
    .replace(/5200 plus catalog apps/g, '10000 plus catalog apps')
    .replace(/\*\*Current version: 0\.0\.9\*\*/g, '**Current version: 0.0.10**')
    .replace(/\*\*Current version: 0\.0\.10\*\*/g, '**Current version: 0.0.10**')
    .replace(/Version 0\.0\.9 keeps the approved Orvexa visual direction, keeps the 354-app curated catalog, and adds a production large-catalog layer with \*\*5,200 WinGet-backed applications\*\* generated from upstream WinGet metadata\./, `Version 0.0.10 keeps the approved Orvexa visual direction, keeps the 354-app curated catalog, and expands the production large-catalog layer to **${total} WinGet-backed applications** generated from upstream WinGet metadata.`)
    .replace(/Version 0\.0\.10 keeps the approved Orvexa visual direction, keeps the 354-app curated catalog, and adds a production large-catalog layer with \*\*5,200 WinGet-backed applications\*\* generated from upstream WinGet metadata\./, `Version 0.0.10 keeps the approved Orvexa visual direction, keeps the 354-app curated catalog, and expands the production large-catalog layer to **${total} WinGet-backed applications** generated from upstream WinGet metadata.`)
    .replace(/Version 0\.0\.9 ships two catalog layers:/g, 'Version 0.0.10 ships two catalog layers:')
    .replace(/\*\*5,200 large-catalog applications\*\* generated from upstream WinGet metadata and bundled as `shared\/catalog-large\.json`\./, `**${total} large-catalog applications** generated from upstream WinGet metadata and bundled as \`shared/catalog-large.json\`.`)
    .replace(/The large catalog was generated from 13,883 WinGet package candidates and selected the best 5,200 records after de-duplication and logo provenance ranking\. It contains \*\*174 verified upstream logos\*\*, \*\*5,026 publisher\/package favicon fallback logos\*\* and \*\*0 entries without an upstream logo source\*\*\./, `The large catalog was generated from ${sourceTotal} WinGet package candidates and selected the best ${total} records after de-duplication and logo provenance ranking. It contains **${verified} verified upstream logos**, **${fallback} publisher/package favicon fallback logos** and **${missing} entries without an upstream logo source**.`)
    .replace(/## 0\.0\.9 UI parity and catalog QA/g, '## 0.0.10 UI parity and catalog QA')
    .replace(/more than 5,000 WinGet-backed applications;/g, 'at least 10,001 WinGet-backed applications;')
    .replace(/minimum verified\/fallback logo coverage without fake original-logo claims\./g, 'minimum 10,001 verified/fallback upstream logo records without fake original-logo claims;');
  write('README.md', readme);

  let changelog = read('docs/CHANGELOG.md');
  if (!changelog.includes('## 0.0.10')) {
    changelog = changelog.replace('# Changelog\n\n', `# Changelog\n\n## 0.0.10 - 2026-09-26\n\n- Expanded the production large catalog to ${total} WinGet-backed applications while preserving duplicate protection for app IDs, normalized names and WinGet package IDs.\n- Raised the large-catalog generator default target to 10,500 and the validator minimum to 10,001 entries.\n- Added production-content validation to reject blocked placeholder/dev copy in shipped app, installer and tool sources.\n- Improved Catalog UX for the larger dataset by showing a bounded first page and a live catalog count hint instead of rendering every bundled app card at once.\n- Replaced non-interactive category-looking chips with honest capability/provenance chips so the UI does not present fake filters as working controls.\n\n`);
  }
  write('docs/CHANGELOG.md', changelog);
}

if (mode === 'patch') patchFiles();
else if (mode === 'docs') updateDocs();
else throw new Error(`Unknown mode: ${mode}`);
