# Orvexa Security Model

Orvexa treats package metadata as data, never as executable command text.

- Package identifiers are validated against a strict allowlist before package operations.
- WinGet is started directly with `UseShellExecute=false` and `ProcessStartInfo.ArgumentList`; shell command strings are not constructed.
- Install, update and uninstall flows use explicit user actions and in-app confirmation according to the active confirmation policy.
- Uninstall and Update All always require confirmation.
- Long-running child processes have timeouts, cancellation and process-tree termination.
- Captured child-process output is bounded to limit memory growth while redirected pipes continue to be drained.
- Search queries are length-bounded and control characters are removed.
- `orvexa://` activation is restricted to the `install` action, bounded in size and capped at 100 catalog IDs.
- Website selections contain catalog IDs only; the Windows app resolves them through its bundled enabled WinGet catalog before presenting confirmation.
- A second Orvexa launch can hand a validated activation request to the existing application instance without opening a second application window.
- Local JSON state is validated on startup; malformed state is quarantined instead of trusted.
- Crash and activity details redact the current user/profile path and are size-bounded; oversized crash logs retain only a bounded tail.
- Settings, favorites, activity, catalog cache, window state and protocol handoff use byte-bounded streaming reads and durable atomic temporary-file replacement.
- No telemetry transport is implemented.
- Production builds support Authenticode signing and generate SHA-256 checksum manifests.

Third-party packages remain subject to their publishers' licenses, security posture and update mechanisms. Orvexa does not bypass Windows security prompts or package-manager trust decisions.
