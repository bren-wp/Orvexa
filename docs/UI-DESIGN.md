# Orvexa UI design specification

This document is the implementation contract for the visual redesign introduced after 0.0.6.

## Canonical direction

The approved Orvexa mockups generated for Home, Catalog, Updates, Installed, This PC, Activity, Settings, About, brand assets and iconography define the intended product appearance. New UI work should preserve that direction instead of introducing an alternate theme.

Orvexa remains a native WinUI 3 application. The visual target is Windows 11 quality and behavior, not a web shell, Electron surface, WinForms/WPF recreation or classic Win32 layout.

## Brand

- Primary blue: `#3B82FF`
- Deep blue: `#2563EB`
- Navy: `#0B1B3D`
- Card: `#101C2F`
- Elevated card: `#14233A`
- Border: `#334155`
- Muted text: `#94A3B8`
- Surface text: `#F8FAFC`
- Success: `#4ADE80`
- Warning: `#FBBF24`
- Danger: `#FB7185`

The mark is a six-segment geometric Orvexa ring with white, light-blue and deep-blue facets. The same mark is used in the Windows shell, web branding and README.

## Shell

- One primary window.
- Dark navy application canvas.
- Expanded left navigation with Orvexa mark and wordmark.
- Navigation order is fixed: Home, Catalog, Updates, Installed, This PC, Activity, Settings, About.
- Selected navigation uses a blue rounded highlight.
- Content uses 12px card radii and subtle 1px cool-blue borders.
- Main headings are approximately 30px and semibold.
- Body copy uses muted blue-gray text.
- Primary actions use Primary Blue with white text.
- Secondary actions use dark elevated surfaces with a thin border.
- No fragile Unicode glyphs for core navigation or commands; use WinUI SymbolIcon or local SVG.

## Home

The Home page is a dashboard:
1. Trusted App Catalog hero card.
2. Available Updates card.
3. Installed Applications card.
4. Device Health card.
5. Quick Actions card.
6. Recommended Tools strip.

The catalog hero uses the strongest blue gradient in the product and real local app icons.

## Catalog

- Search lives in the page header.
- Category chips sit directly below the header.
- Results use responsive cards, not a dense default ListView.
- Each card shows local application icon, name, description, category, Windows compatibility, version and install action.
- Selection still supports multi-install and favorites.
- Metadata comes from the bundled canonical catalog; do not duplicate descriptions in XAML.

## Updates

- Header and search match the approved mockup.
- Summary cards communicate the update workflow.
- The update list shows app icon, name, installed version, available version and explicit Update action.
- Update Selected and Update All remain confirmation-gated.
- Empty state is visually explicit.

## Installed

- Header search and action toolbar.
- Rows show application icon, name/package ID, current version and source.
- Destructive actions remain explicit and confirmation-gated.
- Never render an action as functional if the backing operation does not exist.

## This PC

- Device overview hero.
- Quick Actions card.
- System and health cards below.
- Display only system data Orvexa can collect safely with the existing architecture; do not fabricate hardware values to mimic mockup text.

## Activity

- Summary-style cards at the top.
- Local bounded history below.
- Rows expose package, action, result, time and bounded detail.
- No remote telemetry is introduced for the sake of the design.

## Settings

Settings use grouped cards matching the mockup. Only backed settings are interactive. Current persisted controls include theme, automatic refresh, install confirmations and search-result limit. New toggles must not be added as decorative fake settings.

## About

- Large brand hero using the Orvexa mark.
- Version, Technologies and License cards.
- About and Privacy/Security content.
- Product copy must remain production-facing and contain no developer placeholder language.

## Data and icon sources

Application icons are loaded from the existing local `apps/web/assets/apps` SVG set and are linked into the WinUI build. Presentation metadata is read from the same bounded bundled `catalog.json` used by Orvexa package logic.

## Release gate

A visual change is not complete until:
- repository QA passes;
- WinUI production publish succeeds;
- Setup and Portable artifacts are produced;
- the Portable EXE launch smoke test succeeds.

The generated visual mockups are a design target, but launchability and real functionality take precedence over fake UI.
