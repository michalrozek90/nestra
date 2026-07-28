# Desktop shell (Tauri)

This document covers the Windows desktop shell that packages the existing Expo web client through
Tauri. Architecture decisions live in
[ADR 005](../decisions/005-desktop-and-hosted-service-architecture.md) and
[ADR 006](../decisions/006-desktop-auth-storage-and-runtime-hardening.md).

## What this package does

`@nestra/desktop` is a thin Tauri shell. It does not introduce a separate desktop UI. The Expo web
export from `@nestra/client` is the only feature surface.

- `pnpm dev:desktop` starts Expo web on port `8081` and opens a Tauri window against that URL.
- `pnpm build:desktop` builds the Expo web export with the desktop environment file, then runs the
  Tauri Windows packaging command (per-user NSIS target). Signing, release publishing, and
  automatic updates remain separate work.

## Prerequisites (Windows)

Install these before running desktop commands:

1. Repository Node.js `24.18.0` and pnpm `11.13.1` (see the root README).
2. [Rust via rustup](https://rustup.rs/) (stable toolchain).
3. [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the
   **Desktop development with C++** workload.
4. [WebView2 Evergreen Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) (usually
   already present on current Windows 10/11 installs).

Restart the terminal after installing Rust or the C++ tools so `cargo`, `rustc`, and the MSVC
environment are visible.

Desktop commands refuse non-Windows hosts with an explicit error.

## API configuration boundary

The client reads the API base URL only through typed runtime configuration
(`apps/client/src/config/runtime-config.ts`) from `EXPO_PUBLIC_API_BASE_URL`. Screens and feature
modules must not hard-code hosting provider hostnames.

| Environment file                                    | Purpose                                               |
| --------------------------------------------------- | ----------------------------------------------------- |
| `apps/client/.env.example` → `.env`                 | Local development (typically `http://localhost:3000`) |
| `apps/client/.env.desktop.example` → `.env.desktop` | Desktop production web export against the hosted API  |

Copy the desktop example before the first packaged build:

```powershell
Copy-Item apps/client/.env.desktop.example apps/client/.env.desktop
```

The checked-in desktop example points at the current provider-assigned HTTPS API from the hosted
demo deployment. Changing hosts is a configuration change, not a UI change.

For `pnpm dev:desktop`, use `apps/client/.env`. Point that file at the local API while iterating,
or at the hosted HTTPS URL when the developer machine should not run NestJS.

## Authentication storage

Desktop authentication secrets use the operating-system credential store (Windows Credential
Manager) through Tauri commands. The Expo web bundle detects the Tauri runtime and selects that
adapter behind `AuthTokenStorage`. Browser-only web builds still use `localStorage`; the Tauri
runtime must never persist auth tokens there.

Sign-out clears the OS-backed credentials. Developer diagnostics report the active storage
implementation as `OSCredentialStore` inside Tauri and `localStorage` in a normal browser.

## Capabilities and outbound network policy

The default capability grants only:

- `core:default`
- `allow-auth-secret-storage` (read/write/clear auth secrets in the OS credential store)

No filesystem, shell, notification, or generic HTTP plugin permissions are enabled.

WebView outbound access is further constrained by Content Security Policy in
`apps/desktop/src-tauri/tauri.conf.json`:

- production `csp` allow-lists Tauri IPC and the configured API origins only;
- `devCsp` additionally allow-lists Expo Metro on port `8081` (including WebSocket) and the script
  sources Metro needs during `pnpm dev:desktop`.

| Target                                                         | Purpose                                       |
| -------------------------------------------------------------- | --------------------------------------------- |
| `ipc:` / `http://ipc.localhost`                                | Tauri IPC                                     |
| `https://nestra-api-nkr9.onrender.com`                         | Hosted API origin from `.env.desktop.example` |
| `http://localhost:3000` / `http://127.0.0.1:3000`              | Local API during development                  |
| `http://localhost:8081` / `ws://localhost:8081` (and loopback) | Expo Metro for `pnpm dev:desktop` (`devCsp`)  |

When the hosted API host changes, update `EXPO_PUBLIC_API_BASE_URL`, the CSP `connect-src` entry,
and hosted `CORS_ALLOWED_ORIGINS` together.

## CORS origins for the hosted API

Browser and Tauri WebView clients are subject to CORS. Configure `CORS_ALLOWED_ORIGINS` on the
hosted API to include the exact origins you use:

| Client mode                      | Origin to allow          |
| -------------------------------- | ------------------------ |
| Expo web / Tauri `dev:desktop`   | `http://localhost:8081`  |
| Packaged Tauri WebView (Windows) | `http://tauri.localhost` |

Native mobile clients are not browser CORS clients.

## Logging and private data

Client logging sanitizes tokens, credentials, note content, drafts, and complete private
request/response payloads. Desktop hardening does not add Rust or JavaScript paths that log
authentication secrets.

## Future platform boundaries (not implemented)

These boundaries are recorded so later work does not invent ad-hoc desktop behavior:

- **Ambient audio cache:** curated recordings will download from object storage (or its CDN) and
  Tauri may cache files locally for fast replay and offline use. Caching, licensing, playback, and
  compositions are out of scope for this hardened runtime.
- **Closed-app notifications:** reminders that must fire while Nestra is fully closed require a
  server-side scheduler or worker and a replaceable delivery-provider adapter. They must not depend
  on a timer inside the Tauri process.

See ADR 005 and ADR 006 for the accepted rationale.

## Commands

From the repository root:

```bash
pnpm install
pnpm dev:desktop
pnpm build:desktop
```

`pnpm verify` does not compile Rust or produce installers. Run desktop commands locally on Windows
after the prerequisites above are installed.

Desktop Cargo output is written to `%LOCALAPPDATA%\nestra\desktop-cargo-target` so Expo Metro does
not watch rustc temporary files inside the monorepo during `pnpm dev:desktop`.

## Out of scope for packaging follow-up

- Installer signing, Release Please desktop publishing, and automatic updates
- Ambient audio caching, notifications, and related platform plugins
