# Catalog maintenance

Every catalog app record contains:

- `id`: internal immutable Orvexa ID.
- `name`, `publisher`, `description`, `category`.
- `platforms`, `architectures`.
- `provider`: currently `winget`.
- `wingetId`: allowlisted WinGet identifier.
- `versionStrategy`: `latest` by default.
- `versionLabel`: user-facing label such as `Latest via WinGet`.
- `popular`, `featured`, `enabled`.
- `icon`: local path shared by web and desktop.

Do not put a PowerShell command, arbitrary process path or arbitrary installer argument in catalog data.

For package updates, the safest default is to leave `versionStrategy` as `latest`: the installed version is resolved by WinGet at execution time. Catalog revisions are still useful when a package ID changes, an app is withdrawn, a category changes or you want to disable a package quickly.
