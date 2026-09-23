# Changelog

## 0.0.3 — 2026-09-23
- Replaced the single-value protocol handoff file with a bounded multi-activation queue protected by a cross-process mutex.
- Added bounded recovery reads for every persisted JSON state file and retained bounded corruption quarantine.
- Normalized and revalidated catalog-cache content after reading persisted state.
- Added repository-local QA scripts, a version-neutral 39-test suite and GitHub Actions QA/Windows build workflows.
- Added a production `.gitignore` covering build outputs, local diagnostics, environment files and signing material.
- Extended centralized version synchronization to README distribution artifact names.
- Refreshed project documentation for the current security, privacy, build and versioning architecture.

## 0.0.2 — 2026-09-23
- Rebuilt and polished the public Orvexa website with responsive mobile navigation, accessible focus states, improved dark/light themes and production download UX.
- Added scalable catalog rendering in 48-item increments instead of rendering the entire catalog at once.
- Enforced the 100-app browser-to-Orvexa handoff limit and prunes incompatible selections when switching Windows workflows.
- Added catalog sorting, search clearing, reset filters, live result counts, persistent Windows selection and System/Light/Dark theme behavior.
- Hardened web-generated asset, download, protocol and Microsoft-link handling.
- Fixed stale category counts and pack compatibility when changing the selected Windows workflow.
- Fixed the Windows local-catalog refresh bug where one-character WinGet seed searches could never populate the cache.
- The Windows Catalog now opens immediately with the bundled validated Orvexa catalog and merges later live WinGet discoveries into the bounded local cache.
- Added local Installed and Updates filters without additional WinGet scans.
- Added explicit empty states for Catalog, Updates, Installed and Activity.
- Improved recommendation rows by resolving device recommendations to trusted catalog names before opening Catalog search.
- Centralized bounded atomic local-state I/O for Settings, Favorites, Activity, Window State, Catalog Cache and protocol handoff.
- Improved System Health cancellation behavior and WinGet version reporting.
- Hardened Orvexa Setup as a per-user step-by-step wizard with explicit Welcome, destination, license, Ready and Finish pages.
- Removed recursive uninstall cleanup that could delete unrelated files placed inside the application directory.
- Hardened the production build script with explicit restore/publish/compiler exit checks and artifact existence validation.
- Extended centralized versioning so web product metadata follows stable and RC releases automatically.

## 0.0.1 — 2026-09-23
- Standardized the product brand to Orvexa and reset the public release sequence to 0.0.1.
- Added stable and RC versioning support such as 0.0.2 and 0.0.2-rc.1 from one release command.
- Polished the single-window WinUI 3 interface, responsive action groups and selection-aware controls.
- Added Catalog favorites, actionable recommendations, Settings reset, in-app license viewer and persistent system-health details.
- Hardened cancellation, confirmation reentrancy, startup recovery, storage fallbacks and single-instance coordination.
- Removed application-source dependencies on Microsoft.Win32 registry APIs and legacy desktop UI interop.
- Added a bounded Orvexa protocol handoff from the public website to the existing Orvexa window.
- Protocol catalog IDs are resolved through the bundled enabled WinGet allowlist before any installation is offered.
- Added per-user protocol registration to Orvexa Setup and automatic removal on uninstall.
- Rebuilt the public website without the obsolete desktop bridge and hidden desktop shell.
- Added local PWA icons and removed external visual dependencies.
- Expanded click-by-click QA for navigation, handlers, selections, confirmations, protocol activation, web controls and release naming.
