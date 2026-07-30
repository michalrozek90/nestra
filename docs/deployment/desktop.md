# Desktop shell (Tauri)

This document covers the Windows desktop shell that packages the existing Expo web client through
Tauri. Architecture decisions live in
[ADR 005](../decisions/005-desktop-and-hosted-service-architecture.md) and
[ADR 006](../decisions/006-desktop-auth-storage-and-runtime-hardening.md).

## What this package does

`@nestra/desktop` is a thin Tauri shell. It does not introduce a separate desktop UI. The Expo web
export from `@nestra/client` is the only feature surface.

- `pnpm dev:desktop` starts Expo web on port `8081` and opens a Tauri window against that URL.
- `pnpm build:desktop` builds the Expo web export with the desktop environment file, then produces
  the per-user NSIS Windows x64 installer. Signing, public release publication, and automatic
  updates remain separate work; draft release-candidate attachment is documented in
  [`release.md`](./release.md).

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

## Identity, version, and installer metadata

| Value                  | Source                                                                        |
| ---------------------- | ----------------------------------------------------------------------------- |
| Product name           | `productName`: `Nestra` in `apps/desktop/src-tauri/tauri.conf.json`           |
| Main binary            | `mainBinaryName`: `Nestra` → installed `Nestra.exe`                           |
| Application identifier | `com.michalrozek.nestra`                                                      |
| Product version        | Root `package.json` `version`, referenced by Tauri as `../../../package.json` |
| Publisher              | `Nestra`                                                                      |
| Installer mode         | Per-user NSIS (`installMode`: `currentUser`)                                  |
| Installer icon         | `apps/desktop/src-tauri/icons/icon.ico` (provisional Nestra brand mark)       |

The expected installer file name is:

```text
Nestra_{version}_x64-setup.exe
```

Example for the current root product version `0.0.0`:

```text
Nestra_0.0.0_x64-setup.exe
```

`pnpm build:desktop` fails if that artifact is missing after the Tauri build.

Workspace package versions under `apps/` and `packages/` are internal metadata and must not be used
as the product or installer version.

## Packaging outputs

Local builds write Cargo artifacts to `%LOCALAPPDATA%\nestra\desktop-cargo-target` by default so
Expo Metro does not watch rustc temporary files inside the monorepo. Override with
`CARGO_TARGET_DIR` when needed (CI does this).

Tauri still produces the NSIS installer under the Cargo target directory (first match wins):

```text
%CARGO_TARGET_DIR%\release\bundle\nsis\Nestra_{version}_x64-setup.exe
%CARGO_TARGET_DIR%\x86_64-pc-windows-msvc\release\bundle\nsis\Nestra_{version}_x64-setup.exe
```

After a successful local `pnpm build:desktop`, the finished installer is also copied to:

```text
D:\Nestra-setup\Nestra_{version}_x64-setup.exe
```

Override that convenience copy with `NESTRA_INSTALLER_OUTPUT_DIR`. CI skips the copy unless that
variable is set, and continues to upload from `CARGO_TARGET_DIR`.

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

`pnpm build:desktop` temporarily replaces `apps/client/.env` with `.env.desktop` during the Expo
web export (Expo reads `.env` for `EXPO_PUBLIC_*` values) and restores the original file afterwards.
Always clear-rebuild when changing the hosted API URL so Metro does not keep a stale bundle.

Icon fonts (`Ionicons`, Material Community Icons) come from the installed `@expo/vector-icons`
package. Web/desktop bootstrap (`load-icon-fonts.web.ts`) embeds those fonts as base64 (generated
before export), registers them with the browser `FontFace` API from raw bytes, and syncs
expo-font's cache via blob URLs using a known glyph from each font as its readiness probe. Native
uses the package-provided font maps through expo-font's normal asset pipeline
(`load-icon-fonts.ts`) and does not embed the base64 payload. CSP `connect-src` includes `'self'`;
`font-src` allows `blob:` for the expo-font cache sync URLs.

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

## Continuous integration packaging

The workflow `.github/workflows/desktop-package.yml` builds the Windows x64 installer on
`windows-latest` for pushes to `main` and manual `workflow_dispatch` runs. It does not run on
pull requests, so PR review stays on the faster quality gate; use `workflow_dispatch` when you
need an installer artifact before merge.

It reuses the baseline CI conventions from `.github/workflows/ci.yml`:

- Node.js from `.nvmrc` and pnpm `11.13.1`
- `pnpm install --frozen-lockfile`
- pinned third-party Actions by commit SHA
- minimal `contents: read` permissions

Packaging-specific steps:

1. Install the stable Rust toolchain with the `x86_64-pc-windows-msvc` target.
2. Cache Cargo artifacts with `Swatinem/rust-cache`.
3. Copy `apps/client/.env.desktop.example` to `apps/client/.env.desktop` (never commit the copy).
4. Run `pnpm build:desktop`.
5. Upload `Nestra_{version}_x64-setup.exe` as a workflow artifact (14-day retention).

CI sets `CARGO_TARGET_DIR` to `apps/desktop/src-tauri/target` inside the checked-out workspace so
caching and artifact upload paths stay predictable. The quality-gate workflow does **not** compile
Rust or produce installers.

## Clean-machine smoke test

Run this checklist against a freshly built `Nestra_{version}_x64-setup.exe` and the hosted API from
[#47](https://github.com/michalrozek90/nestra/issues/47) / [`hosted-api.md`](./hosted-api.md). Prefer
a clean Windows user profile or a machine that does not already have Nestra installed.

Prerequisites:

- Hosted API HTTPS URL is reachable; a short first-request cold start after idle is acceptable.
- Hosted `CORS_ALLOWED_ORIGINS` includes `http://tauri.localhost`.
- Installer was built with `.env.desktop` pointing at that hosted API.

| Step            | Expectation                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Install      | Run the NSIS setup without elevation. Installation completes for the current user.                                                                           |
| 2. Launch       | Start Nestra from the Start Menu or desktop shortcut. No Expo/Metro development server is required.                                                          |
| 3. Cold start   | The first API call after hosted idle may take several seconds; the UI should recover once the API wakes.                                                     |
| 4. Authenticate | Register or sign in against the hosted API while the developer coding machine can be offline.                                                                |
| 5. Notes        | Create, open, edit, and save at least one owned note.                                                                                                        |
| 6. Restart      | Quit the application fully and reopen it. The authenticated session is restored from OS credential storage without storing tokens in browser `localStorage`. |
| 7. Sign-out     | Sign out removes desktop credentials; a subsequent launch requires authentication again.                                                                     |
| 8. Uninstall    | Remove Nestra through Windows Apps & features (or the NSIS uninstaller). The application no longer launches from the previous shortcuts.                     |

Do not paste tokens, note content, or provider secrets into issues, PR comments, or logs while recording smoke-test results.

## Future platform boundaries (not implemented)

These boundaries are recorded so later work does not invent ad-hoc desktop behavior:

- **Ambient audio cache:** curated recordings will download from object storage (or its CDN) and
  Tauri may cache files locally for fast replay and offline use. Caching, licensing, playback, and
  compositions are out of scope for this packaging work.
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

`pnpm verify` does not compile Rust or produce installers. Run desktop packaging locally on Windows
after the prerequisites above are installed, or download the CI workflow artifact.

## Out of scope

- Installer signing, automatic updates, and public GitHub Release publication without explicit
  operator approval
- Ambient audio caching, notifications, and related platform plugins
- macOS or Linux packaging

Release Please version preparation, draft release-candidate attachment, rollback, and the
publication gate are documented in [`release.md`](./release.md).
