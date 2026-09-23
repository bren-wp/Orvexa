# Orvexa Privacy

Orvexa is designed to keep product state local to the device and does not implement an Orvexa telemetry or analytics transport.

## Windows application

The Windows application can store the following local files under the current user's Orvexa application-data directory:

- settings
- favorites
- activity history
- catalog cache
- window state
- pending protocol activations
- bounded crash diagnostics

These files are used only to provide application behavior on that PC. JSON-backed state uses bounded reads and atomic replacement writes. Corrupt state can be quarantined locally with bounded retention. Activity history is capped, and crash diagnostics are size-bounded and sanitized before they are written.

Orvexa does not intentionally record the Windows account name or the full user-profile path in activity or crash details. Diagnostic text is passed through the local log sanitizer before persistence.

## Package operations

Orvexa delegates package discovery, installation, updates and removal to Windows Package Manager (WinGet). Those operations can contact Microsoft package sources and third-party publisher infrastructure according to WinGet and publisher behavior. That network activity is not Orvexa telemetry and is governed by the relevant providers' policies.

Orvexa does not proxy package downloads through an Orvexa service.

## Website

The static Orvexa web interface stores only product preferences in browser storage, such as:

- selected catalog IDs
- favorite catalog IDs
- theme preference
- selected Windows workflow

Stored IDs are revalidated against the currently loaded enabled catalog and are bounded before use. The website loads its product data and assets from the same web deployment and does not send arbitrary shell commands to Windows.

When a user chooses to open a selection in the Windows app, the browser creates an `orvexa://install?ids=...` URI containing only bounded Orvexa catalog IDs. The Windows application validates and resolves those IDs again against its bundled trusted catalog before offering any package operation.

## Diagnostics and retention

Orvexa activity history is bounded to the most recent local entries. Oversized crash logs are rotated by retaining only a bounded tail, and individual logged details are sanitized and length-limited. Local state can be cleared by removing the Orvexa application-data directory after the application is closed; Activity also has an in-app clear action.

## Build and release data

Signing certificates, private keys, API tokens and other build secrets are not stored in the repository. GitHub release automation uses repository-scoped GitHub Actions permissions and publishes release artifacts generated from the committed source.
