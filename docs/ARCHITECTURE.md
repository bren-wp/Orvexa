# Orvexa architecture

## Windows application

The Windows application lives in `apps/windows/` and uses WinUI 3, .NET 8 and Windows App SDK. The interface is a single `Window` containing a `NavigationView`; product sections switch inside that same window.

The application interface is implemented in WinUI 3 with Windows App SDK.

## Package operations

Package discovery and maintenance use Windows Package Manager through structured `ProcessStartInfo.ArgumentList` calls. Package identifiers and search text are validated before execution. Long operations support cancellation, bounded output capture and timeout handling.

## Local state

Settings, activity, favorites, catalog cache, diagnostics and window dimensions are stored below the current user's local application-data folder. JSON state uses bounded reads/writes and corrupt-state recovery.

## Web application

The public site under `apps/web/` is a separate responsive product surface. It does not execute local package-management commands.
