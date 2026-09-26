import fs from 'node:fs';
import path from 'node:path';

const roots = ['apps', 'installer', 'tools'];
const ignoredDirs = new Set(['bin', 'obj', 'node_modules', '.git']);
const ignoredFiles = new Set(['validate-production-content.mjs', 'upgrade-0.0.10.mjs']);
const allowedExtensions = new Set(['.cs', '.xaml', '.xml', '.json', '.js', '.mjs', '.ps1', '.iss']);
const forbidden = [
  /lorem ipsum/i,
  /todo:\s/i,
  /fixme:\s/i,
  /placeholder copy/i,
  /dummy data/i,
  /sample text/i,
  /mockup only/i,
  /not for production/i,
  /dev text/i,
  /development placeholder/i,
];
const findings = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name) || ignoredFiles.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!allowedExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    const text = fs.readFileSync(full, 'utf8');
    for (const rx of forbidden) {
      const match = text.match(rx);
      if (match) findings.push(full + ': ' + match[0]);
    }
  }
}
for (const root of roots) walk(root);
if (findings.length) {
  console.error('Production content validation failed:');
  console.error(findings.join('\n'));
  process.exit(1);
}
console.log('Production content OK: no blocked placeholder/dev copy found in shipped app, installer, or tools.');
