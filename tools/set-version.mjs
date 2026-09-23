import fs from 'node:fs';

const input=(process.argv[2]||'').trim();
if(!/^\d+\.\d+\.\d+(?:-rc\.\d+)?$/.test(input)){
  console.error('Usage: node tools/set-version.mjs <major.minor.patch[-rc.N]>');
  process.exit(2);
}

const [base,pre]=input.split('-');
const [major,minor,patch]=base.split('.').map(Number);
const channel=pre?'rc':'stable';
const rc=pre?Number(pre.split('.')[1]):null;

const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s);

const meta={product:'Orvexa',version:input,baseVersion:base,channel,rc};
write('build/version.json',JSON.stringify(meta,null,2)+'\n');

const pkg=JSON.parse(read('package.json'));
pkg.name='orvexa';
pkg.version=input;
pkg.description='Orvexa software control center';
write('package.json',JSON.stringify(pkg,null,2)+'\n');

let html=read('apps/web/index.html');
html=html.replace(/Version \d+\.\d+\.\d+(?:-rc\.\d+)?/,`Version ${input}`);
write('apps/web/index.html',html);

const product=JSON.parse(read('apps/web/data/product.json'));
product.version=input;
write('apps/web/data/product.json',JSON.stringify(product,null,2)+'\n');

let readme=read('README.md');
readme=readme.replace(/Current version: `?\d+\.\d+\.\d+(?:-rc\.\d+)?`?/,`Current version: ${input}`);
const stableExample=base;
const rcExample=channel==='rc'?input:`${major}.${minor}.${patch+1}-rc.1`;
readme=readme.replace(/node tools\/set-version\.mjs \d+\.\d+\.\d+(?!-rc)/,`node tools/set-version.mjs ${stableExample}`);
readme=readme.replace(/node tools\/set-version\.mjs \d+\.\d+\.\d+-rc\.\d+/,`node tools/set-version.mjs ${rcExample}`);
readme=readme.replace(/Orvexa-Portable-[0-9A-Za-z.\-]+-x64\.exe/g,`Orvexa-Portable-${input}-x64.exe`);
readme=readme.replace(/Orvexa-Portable-[0-9A-Za-z.\-]+-x64\.zip/g,`Orvexa-Portable-${input}-x64.zip`);
readme=readme.replace(/Orvexa-Setup-[0-9A-Za-z.\-]+-x64\.exe/g,`Orvexa-Setup-${input}-x64.exe`);
write('README.md',readme);

let proj=read('apps/windows/Orvexa.App/Orvexa.App.csproj');
proj=proj.replace(/<Version>[^<]+<\/Version>/,`<Version>${input}</Version>`);
proj=proj.replace(/<AssemblyVersion>[^<]+<\/AssemblyVersion>/,`<AssemblyVersion>${major}.${minor}.${patch}.0</AssemblyVersion>`);
proj=proj.replace(/<FileVersion>[^<]+<\/FileVersion>/,`<FileVersion>${major}.${minor}.${patch}.0</FileVersion>`);
write('apps/windows/Orvexa.App/Orvexa.App.csproj',proj);

let manifest=read('apps/windows/Orvexa.App/app.manifest');
manifest=manifest.replace(/assemblyIdentity version="[^"]+"/,`assemblyIdentity version="${major}.${minor}.${patch}.0"`);
write('apps/windows/Orvexa.App/app.manifest',manifest);

let iss=read('installer/Orvexa.iss');
iss=iss.replace(/#define MyAppVersion "[^"]+"/,`#define MyAppVersion "${input}"`);
iss=iss.replace(/OutputBaseFilename=Orvexa-Setup-[^\r\n]+/,`OutputBaseFilename=Orvexa-Setup-${input}-x64`);
write('installer/Orvexa.iss',iss);

let ps=read('installer/build-production.ps1');
ps=ps.replace(/Orvexa-Portable-[0-9A-Za-z.\-]+-x64\.exe/g,`Orvexa-Portable-${input}-x64.exe`);
ps=ps.replace(/Orvexa-Portable-[0-9A-Za-z.\-]+-x64\.zip/g,`Orvexa-Portable-${input}-x64.zip`);
ps=ps.replace(/Orvexa-Setup-[0-9A-Za-z.\-]+-x64\.exe/g,`Orvexa-Setup-${input}-x64.exe`);
write('installer/build-production.ps1',ps);

console.log(`Orvexa ${input} (${channel})`);
