# Changelog

## 0.0.8 — 2026-09-24
- Added `qa/ui-parity.test.mjs` to protect the approved Orvexa mockup direction in automated QA.
- Expanded `npm run qa` so UI parity checks run alongside the existing release QA suite, JavaScript syntax checks and catalog validation.
- Locked the approved navigation order: Home, Catalog, Updates, Installed, This PC, Activity, Settings and About.
- Added regression coverage for the blue/navy Orvexa WinUI design tokens, local SVG asset pipeline and catalog-presentation metadata converters.
- Added regression coverage that primary card actions remain wired to real install, update and uninstall operations rather than decorative mockup controls.
- Updated the README for 0.0.8 and documented the new UI parity QA layer.
- Synchronized package, build, web, WinUI, manifest and Setup version metadata for 0.0.8.

## 0.0.7 — 2026-09-24
- Rebuilt the native WinUI shell to follow the approved Orvexa Home, Catalog, Updates, Installed, This PC, Activity, Settings and About mockups.
- Added the new blue/navy Orvexa design system with shared card, title, secondary text, primary action and secondary action styles.
- Replaced the old purple/checkmark brand mark with the new geometric six-segment white/blue Orvexa identity and aligned the web hero and favicon.
- Linked the existing local catalog SVG artwork into the WinUI build instead of adding remote image dependencies.
- Added bounded catalog-presentation metadata readers and native converters for application icon, description and category.
- Rebuilt Catalog as responsive app cards and wired each card's Install action to the existing confirmed queue.
- Rebuilt Updates and Installed presentation and added real single-item Update and Uninstall actions while retaining multi-select workflows.
- Rebuilt Home as the approved dashboard composition with catalog hero, updates, installed software, device health, quick actions and recommendations.
- Rebuilt This PC, Activity, Settings and About around the approved card hierarchy without inventing unsupported device values or fake settings.
- Added docs/UI-DESIGN.md as the visual implementation contract for future Orvexa development.
- Rebuilt the main README as the marketing and product presentation for the new visual system.
- Preserved the 0.0.6 Portable launch gate so the redesigned application must start successfully before release publication.


## 0.0.6 — 2026-09-24
- Fixed the standalone Portable EXE startup failure reproduced as `XamlParseException` on Windows.
- Stopped renaming WinUI 3 single-file executables after publish; the Portable release name is now assigned during the WinUI app publish itself.
- Split production packaging into a canonical folder-based self-contained publish for Setup/Portable ZIP and a separate single-file publish for Portable EXE.
- Added an app-scoped `PortableAssemblyName` property so only the WinUI executable receives the release filename while `Orvexa.Core` keeps its own assembly identity.
- Removed production PDB sidecars before packaging and reject any remaining unexpected Portable runtime/content sidecar files.
- Fixed the invalid `Icon="Computer"` WinUI navigation symbol that caused Portable startup XAML parsing to fail; This PC now uses the valid `Remote` Symbol.
- Added a real Portable launch smoke test to GitHub CI and the stable release workflow; releases now fail if the Portable process exits during startup.
- Repaired `tools/set-version.mjs`, added a syntax check for it to release QA and made production artifact naming metadata-driven.
- Expanded QA coverage for publish-time naming, Portable sidecars, XAML navigation symbols and release startup gating.


## 0.0.5 — 2026-09-24
- Added a standalone self-contained `Orvexa-Portable-0.0.5-x64.exe` alongside the expanded Portable ZIP and guided Setup executable.
- Hardened the `orvexa://install` parser so oversized requests are rejected instead of silently truncated.
- Rejects ambiguous protocol requests containing multiple `ids=` parameters and rejects the entire request when any package ID is invalid.
- Protocol handoff queue now persists only validated install URIs and enforces its storage cap using actual UTF-8 byte length.
- Expanded release QA with protocol boundary and queue-persistence assertions.
- Upgraded the main GitHub README with stronger product positioning, Orvexa logo/hero artwork, local category and application iconography, release badges, clearer download CTAs and security messaging.
- Added manual `workflow_dispatch` support to the stable release workflow while preserving automatic publishing from `main`.
- Synchronized Windows, web, Setup, Portable and GitHub release metadata for 0.0.5.


## 0.0.4 — 2026-09-23
- Rebuilt the main GitHub README as a product-focused landing page using real Orvexa logo, hero artwork, product icons, catalog icons, release links and architecture/security sections.
- Hardened atomic state reads against file-growth races by enforcing byte limits while streaming the file instead of checking size and then calling `ReadAllText`.
- Made atomic writes more durable with unique `CreateNew` temporary files, UTF-8 without BOM and an explicit flush-to-disk before replacement.
- Reworked crash-log rotation so oversized logs retain only a bounded tail instead of loading the entire file into memory.
- Routed bundled catalog and device-profile reads through the same bounded file infrastructure used by persistent state.
- Improved multi-select favorites so a selection consistently adds all missing favorites or removes all when every selected item is already saved.
- Bounded browser-restored selection/favorite state and catalog search text; removed a duplicate selection UI update and a stale web version fallback.
- Added the missing privacy document referenced by the repository README.
- Fixed the embedded Windows license raw-string syntax error exposed by the real production publish smoke test.
- Fixed production and GitHub Release SHA-256 generation so artifact paths are hashed explicitly instead of relying on unsupported `Get-FileHash` pipeline binding.
- Added an explicit GitHub Actions identity before creating the annotated stable release tag.
- Expanded release QA from 39 to 49 checks, including compile-risk validation for the embedded license source and checksum/tag generation.
- Upgraded CI to smoke-test the full production Windows Portable and Setup build with Inno Setup.
- Added automatic stable GitHub Releases with source, web, QA, Portable, Setup, checksum and version assets.

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
