<p align="center">
  <img src="apps/web/assets/brand/mark.svg" width="104" height="104" alt="Orvexa logo">
</p>

<h1 align="center">Orvexa</h1>

<p align="center">
  <strong>Your Windows software, organized.</strong><br>
  Discover, install, update and remove trusted Windows applications from one clean control center.
</p>

<p align="center">
  <a href="https://github.com/bren-wp/Orvexa/actions/workflows/ci.yml"><img src="https://github.com/bren-wp/Orvexa/actions/workflows/ci.yml/badge.svg?branch=main" alt="Orvexa CI"></a>
  <a href="https://github.com/bren-wp/Orvexa/releases/latest"><img src="https://img.shields.io/github/v/release/bren-wp/Orvexa?display_name=release&label=stable" alt="Latest release"></a>
  <img src="https://img.shields.io/badge/Windows-10%20%7C%2011-0078D4" alt="Windows 10 and 11">
  <img src="https://img.shields.io/badge/catalog-279%20apps-6D5DFC" alt="279 curated apps">
</p>

<p align="center">
  <a href="https://github.com/bren-wp/Orvexa/releases/latest"><strong>Download Orvexa</strong></a>
  ·
  <a href="#why-orvexa">Why Orvexa</a>
  ·
  <a href="#security--privacy">Security & Privacy</a>
  ·
  <a href="#for-developers">For Developers</a>
</p>

<p align="center">
  <img src="apps/web/assets/brand/hero.svg" width="760" alt="Orvexa Windows software control center">
</p>

---

## Windows software management without the clutter

Orvexa is a native Windows control center built for people who want a faster, clearer way to manage everyday software.

Instead of hunting through download pages, remembering which apps need updates, or navigating several Windows screens, Orvexa brings the workflow into **one main window** backed by a curated catalog and WinGet.

**Orvexa 0.0.4** includes a curated catalog of **279 applications** across browsers, development, productivity, media, security, gaming, communication, utilities and more.

<p align="center">
  <img src="apps/web/assets/categories/browsers.svg" width="52" alt="Browsers">
  &nbsp;&nbsp;
  <img src="apps/web/assets/categories/developer.svg" width="52" alt="Developer tools">
  &nbsp;&nbsp;
  <img src="apps/web/assets/categories/office.svg" width="52" alt="Office">
  &nbsp;&nbsp;
  <img src="apps/web/assets/categories/security.svg" width="52" alt="Security">
  &nbsp;&nbsp;
  <img src="apps/web/assets/categories/media.svg" width="52" alt="Media">
  &nbsp;&nbsp;
  <img src="apps/web/assets/categories/gaming.svg" width="52" alt="Gaming">
  &nbsp;&nbsp;
  <img src="apps/web/assets/categories/utilities.svg" width="52" alt="Utilities">
</p>

## Why Orvexa

| | |
|---|---|
| **One control center** | Home, Catalog, Updates, Installed, This PC, Activity, Settings and About stay inside one primary app window. |
| **Curated catalog** | 279 known Windows apps with local icons, searchable metadata and WinGet-backed package identities. |
| **Install with confidence** | Orvexa delegates package operations to WinGet instead of maintaining a private installer ecosystem. |
| **Updates in one place** | Review available upgrades without opening every application separately. |
| **Built for Windows** | Native WinUI 3 interface on .NET 8 and Windows App SDK — not a browser shell. |
| **Local-first state** | Favorites, activity, settings, cache and window state are stored locally with bounded, atomic recovery logic. |
| **No account required** | The core desktop workflow does not require an Orvexa account. |
| **Portable + Setup** | Stable GitHub releases provide both a Portable ZIP and a per-user Setup installer. |

## A catalog built for real Windows setups

Orvexa covers the software people actually use — from browsers and developer tooling to creative apps, communication, cloud sync and system utilities.

<p align="center">
  <img src="apps/web/assets/apps/chrome.svg" width="42" alt="Chrome">
  <img src="apps/web/assets/apps/firefox.svg" width="42" alt="Firefox">
  <img src="apps/web/assets/apps/vscode.svg" width="42" alt="Visual Studio Code">
  <img src="apps/web/assets/apps/git.svg" width="42" alt="Git">
  <img src="apps/web/assets/apps/docker.svg" width="42" alt="Docker">
  <img src="apps/web/assets/apps/7zip-zstd.svg" width="42" alt="7-Zip">
  <img src="apps/web/assets/apps/vlc.svg" width="42" alt="VLC">
  <img src="apps/web/assets/apps/obs.svg" width="42" alt="OBS Studio">
  <img src="apps/web/assets/apps/discord.svg" width="42" alt="Discord">
  <img src="apps/web/assets/apps/steam.svg" width="42" alt="Steam">
  <img src="apps/web/assets/apps/bitwarden.svg" width="42" alt="Bitwarden">
  <img src="apps/web/assets/apps/powertoys.svg" width="42" alt="PowerToys">
</p>

The catalog is validated as part of the release QA pipeline so malformed package entries, missing icons and version drift are caught before a stable release.

## Designed around a simple workflow

**Discover → Select → Install → Update → Maintain**

Orvexa keeps the common software-management journey predictable:

1. Browse or search the curated catalog.
2. Save favorites or select multiple applications.
3. Install through WinGet.
4. Review installed software and available updates.
5. Keep a bounded local activity history for operational visibility.

No duplicate navigation trees. No secondary application windows for normal workflows. No custom package backend to learn.

## Security & privacy

Orvexa is intentionally conservative around package execution and local data.

- Package operations use **WinGet** and curated package identifiers.
- The app does not ship signing certificates, private keys or embedded secrets.
- Local JSON state uses bounded reads and atomic replacement to reduce corruption and memory-abuse risk.
- Protocol activations are queued and bounded instead of using a single overwrite-prone handoff value.
- Corrupt local state can be quarantined rather than repeatedly re-read.
- Crash-log retention is bounded.
- The bundled catalog and device profile data use size-limited reads.
- Production artifacts include SHA-256 checksums.
- Core desktop use does not require telemetry or an Orvexa account.

Read the full documents:

- [Security](docs/SECURITY.md)
- [Privacy](docs/PRIVACY.md)
- [Changelog](docs/CHANGELOG.md)

## Download

### Stable release

Go to **[GitHub Releases](https://github.com/bren-wp/Orvexa/releases/latest)** for the current stable build.

Orvexa 0.0.4 release assets are designed to include:

- `Orvexa-Portable-0.0.4-x64.zip`
- `Orvexa-Setup-0.0.4-x64.exe`
- `Orvexa-0.0.4.zip` — source archive
- `Orvexa-Web-0.0.4.zip`
- `Orvexa-QA-0.0.4.zip`
- `SHA256SUMS.txt`
- `version.json`

The Setup build is per-user and does not require a separate uninstaller executable.

## Release quality

Every stable Orvexa change is expected to pass both static QA and a real Windows production build before merge.

Current 0.0.4 release coverage includes **50 QA checks** for:

- synchronized product/version metadata
- WinUI single-window architecture
- curated catalog integrity
- local-state bounds and recovery behavior
- protocol activation safety
- embedded license compilation risk
- Setup and production checksum generation
- stable-release workflow behavior
- web integrity and local assets
- JavaScript syntax and accessibility-related wiring

The GitHub Windows gate additionally builds the production app, creates the Portable archive, compiles the Inno Setup installer and verifies the expected release artifacts.

## Technology

| Layer | Technology |
|---|---|
| Desktop UI | WinUI 3 |
| Runtime | .NET 8 |
| Windows integration | Windows App SDK |
| Package operations | WinGet |
| Installer | Inno Setup |
| Public web | Static HTML, CSS and JavaScript |
| Catalog | Shared JSON metadata + local SVG assets |
| CI / Release | GitHub Actions |

## Architecture

```text
Orvexa
├─ apps/
│  ├─ windows/        Native WinUI desktop application
│  └─ web/            Public web interface and local assets
├─ shared/            Canonical catalog and device metadata
├─ installer/         Production publish + Setup pipeline
├─ build/             Version and build metadata
├─ tools/             Catalog/version validation tools
├─ qa/                Release regression suite
└─ docs/              Security, privacy and changelog
```

The desktop application is split between reusable core services and the WinUI app layer so package, persistence and catalog behavior can remain separate from presentation logic.

## For developers

### Requirements

- Windows 10/11 for the desktop application
- .NET 8 SDK
- Node.js 22+ for repository QA tools
- Inno Setup 6 for producing the Setup executable

### Run QA

```powershell
npm run qa
```

### Build production artifacts

```powershell
./installer/build-production.ps1
```

The production pipeline restores and publishes the WinUI application, validates native command exit codes, creates the Portable archive, compiles Setup, produces SHA-256 checksums and prepares release metadata.

### Versioning

Stable versions use `0.0.x`; release candidates use `0.0.x-rc.n`.

```powershell
node tools/set-version.mjs 0.0.4
node tools/set-version.mjs 0.0.5-rc.1
```

The version tool synchronizes Windows metadata, web metadata, installer configuration, artifact names and documentation references.

## Contributing

Issues and pull requests are welcome for reproducible bugs, catalog corrections and focused improvements.

When changing catalog or release-sensitive code, run `npm run qa` before opening a pull request. Windows production changes should also pass the GitHub Actions release-build gate.

## Project status

Orvexa is under active development. The current stable line is **0.0.4**.

The project deliberately favors a smaller, reviewable release cadence over large unverified feature drops.

---

<p align="center">
  <img src="apps/web/assets/brand/logo.svg" width="220" alt="Orvexa">
</p>

<p align="center">
  <strong>Clean software management for Windows.</strong>
</p>

<p align="center">
  Built and maintained by <a href="https://brendigo.com">Brendigo</a>.
</p>
