# 006 — Desktop authentication storage and runtime hardening

## Status

Accepted

## Context

Issue #41 delivered a working Tauri shell that loads the Expo web client. That web client
resolved authentication storage through the Metro `.web.ts` implementation, which uses
`localStorage`. The product specification and ADR 005 require the desktop runtime to store
authentication secrets in an operating-system-backed or otherwise secured Tauri mechanism and
never reuse the web `localStorage` implementation for those secrets.

The same hardening milestone must keep Tauri capabilities and outbound network access minimal,
document matching hosted-API CORS expectations, and record future ambient-audio cache and
closed-app notification boundaries without implementing those features.

## Decision

### Authentication storage

Desktop authentication secrets are stored in the operating-system credential store through the
Rust `keyring` crate (Windows Credential Manager on the supported Windows x64 target). The Tauri
shell exposes a narrow command set (`get_auth_secret`, `set_auth_secret`, `delete_auth_secret`,
`clear_auth_secrets`) behind an explicit capability permission.

The Expo web bundle used inside Tauri detects the Tauri runtime at module load and selects the
desktop storage adapter behind the existing `AuthTokenStorage` interface. Browser-only web
builds continue to use `localStorage`. Native mobile builds continue to use SecureStore. Sign-out
clears desktop credentials through `clear_auth_secrets` and also removes any leftover web
`localStorage` keys from earlier foundation builds.

### Capabilities and outbound network policy

The default Tauri capability remains minimal: `core:default` plus the auth-secret-storage
permission. No filesystem, shell, notification, or generic HTTP plugin permissions are granted.

Outbound browser requests from the WebView are constrained by Content Security Policy
`connect-src`. Production CSP allow-lists `'self'` (required once `connect-src` is set, otherwise
same-origin fetches are blocked), Tauri IPC, and the configured API origins. Development CSP
additionally allow-lists the Expo Metro origin used by `pnpm dev:desktop`. Changing the hosted
API host requires updating both `EXPO_PUBLIC_API_BASE_URL` and the CSP `connect-src` entries, and
keeping `CORS_ALLOWED_ORIGINS` aligned on the API.

### Future boundaries (documentation only)

- Ambient audio downloads will eventually be cached locally by Tauri for replay performance. That
  cache is a future boundary and is not implemented in this hardening work.
- Notifications that must fire while the application is fully closed require server-side
  scheduling and a delivery provider independent of the running Tauri process. They are not
  implemented here.

## Consequences

- Desktop login sessions survive application restarts without storing tokens in `localStorage`.
- Sign-out removes OS-backed credentials.
- Capability and CSP changes are reviewable in `apps/desktop/src-tauri` rather than scattered
  through presentation code.
- Hosted API CORS documentation and desktop CSP must stay synchronized when origins change.
- Future audio and notification work has explicit non-goals for the hardened `0.1.0` runtime.

## Alternatives considered

- Reusing web `localStorage` inside Tauri was rejected because it leaves secrets readable to
  WebView inspection and violates the specification.
- Tauri Stronghold was rejected for this milestone because it requires managing an encryption
  password or key bootstrap path that is heavier than OS credential storage for two JWT secrets.
- Third-party keyring plugins were rejected in favor of a small set of first-party commands that
  match the existing typed client storage boundary without introducing an additional guest API
  surface.
