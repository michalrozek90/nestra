# Nestra

Nestra is a cross-platform personal application for everyday organization. Its name is inspired
by a nest: a personal, organized, comfortable place for notes, reminders, shopping, and
relaxation.

## Architecture

The target architecture keeps one Expo client for Android, iOS, Web, and an installable Windows
x64 desktop application. Tauri consumes the Expo web build, while a modular NestJS REST API and
PostgreSQL remain the shared backend. Shared public API contracts live in the
framework-independent `@nestra/contracts` package. The first desktop artifact will be one
per-user NSIS setup executable named `Nestra_{version}_x64-setup.exe`.

```text
Expo client (Android / iOS / Web)
                |
                +-- Expo web build --> Tauri desktop (Windows x64)
                |                            |
                +----------------------------+
                              |
                              v HTTPS
                    NestJS API on Render
                              |
                              v TLS
                    PostgreSQL on Neon
```

The initial hosted environment uses a Render Free Web Service in Frankfurt and Neon Free
PostgreSQL in a compatible European region, so the API remains available while the developer
computer is offline. A short cold start and the provider-assigned HTTPS endpoint are accepted
initially; a custom domain is not required. The deployment remains portable through a normal
container, standard PostgreSQL, controlled migrations, and configuration-owned provider URLs.

Cloudflare R2 is reserved for a future curated ambient-audio catalog. Audio will be delivered
directly to clients and cached locally by Tauri, while PostgreSQL stores composition metadata.
User audio uploads and notifications that work while the application is fully closed remain
future work. See
[ADR 005](docs/decisions/005-desktop-and-hosted-service-architecture.md) for the accepted
boundaries, trade-offs, and migration path.

This is a private pnpm monorepo containing:

- `@nestra/client`
- `@nestra/api`
- `@nestra/desktop`
- `@nestra/contracts`
- `@nestra/tsconfig`

## Prerequisites

- [Node.js `24.18.0`](https://nodejs.org/en/download) (pinned in `.nvmrc`, `.node-version`, and
  `package.json`)
- [pnpm `11.13.1`](https://pnpm.io/installation) (version declared by `packageManager`)
- [Git](https://git-scm.com/install/)
- [Docker Desktop](https://docs.docker.com/get-started/get-docker/) or Docker Engine with Compose

For the Windows desktop shell (`pnpm dev:desktop` / `pnpm build:desktop`), also install:

- [Rust via rustup](https://rustup.rs/)
- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the
  **Desktop development with C++** workload
- [WebView2 Evergreen Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) when it is
  not already present

Details are in [`docs/deployment/desktop.md`](docs/deployment/desktop.md).

Node.js 24 is the current LTS line and satisfies the Node requirements of the selected stable
Expo SDK 57 and NestJS 11 lines. Use the exact pinned versions so local and CI behavior remains
consistent.

## Repository setup

```bash
pnpm install
```

The API password hashing dependency `argon2` requires a native build during installation. Its install
script is enabled in `pnpm-workspace.yaml`. If API startup reports that no native build was found for
`argon2`, rerun `pnpm install` or `pnpm rebuild argon2`.

Local environment templates are committed at:

```text
apps/api/.env.example
apps/client/.env.example
apps/client/.env.desktop.example
infrastructure/.env.example
```

Environment examples are templates and are never used directly by application or infrastructure
scripts. Before using the database commands, create the ignored local infrastructure environment
file.

PowerShell:

```powershell
Copy-Item infrastructure/.env.example infrastructure/.env
```

macOS or Linux:

```bash
cp infrastructure/.env.example infrastructure/.env
```

Copy the API example to `apps/api/.env` before running the API, migrations, or seed command, and
replace the JWT placeholder with a private value of at least 32 characters. Copy the client
example when the client needs runtime configuration. Local `.env` and `.env.local` files are
ignored by Git. API startup fails with field names, but never private values, when configuration
is missing or invalid. Preview and production environments reject the committed JWT placeholder.

## PostgreSQL

Start the PostgreSQL 18.4 development container and wait for its health check:

```bash
pnpm db:start
```

Inspect or stop it with:

```bash
pnpm db:logs
pnpm db:stop
```

The database is exposed on `localhost:5432` and persisted in the named Docker volume
`nestra_postgres_data`. Its checked-in credentials are for local development only.

Run, revert, and run the committed TypeORM migrations with:

```bash
pnpm db:migrate
pnpm db:migrate:revert
pnpm db:migrate
```

Generate a migration after changing persistence metadata:

```bash
pnpm db:migrate:generate
```

Run the repeatable development seed infrastructure with:

```bash
pnpm db:seed
```

Stage 3 does not create application seed records because users and notes are introduced later.
The seed command refuses to run when `NODE_ENV=production`.

## Run the scaffolds

Build contracts, API, and the Expo web export in dependency order:

```bash
pnpm build
pnpm typecheck
```

Each standalone development command builds the contracts package once before starting its target.

Start the Expo web client on port 8081:

```bash
pnpm dev:web
```

Start the NestJS API on `0.0.0.0:3000`:

```bash
pnpm dev:api
```

The versioned health endpoint is available at `http://localhost:3000/api/v1/health`. In
development, Swagger UI is available outside the versioned prefix at `http://localhost:3000/docs`.
Both successful and degraded health responses are documented from the shared Zod contract. The
API can start while PostgreSQL is unavailable, report `503 degraded`, and reconnect on a later
health check.

For simultaneous contracts watch, API watch, and Expo Web development:

```bash
pnpm dev
```

Formatting, linting, type-checking, and build commands can run while `pnpm dev` remains active.
The development and verification processes overwrite their generated artifacts without deleting
the shared contracts or API output directories. Do not manually remove either `dist` directory
while the development watchers are running. If any development watcher exits, the root command
stops the remaining watchers instead of leaving a partially running environment. The command also
exits if the API does not start within 30 seconds or remains unavailable for 15 seconds after it
has started.

Native development commands are:

```bash
pnpm dev:android
pnpm dev:ios
```

Android requires Android Studio and a configured emulator or device. The iOS simulator requires
macOS and Xcode; `pnpm dev:ios` fails with an explicit message on unsupported platforms.

### Desktop (Windows)

After installing the Rust, MSVC, and WebView2 prerequisites documented in
[`docs/deployment/desktop.md`](docs/deployment/desktop.md):

```bash
pnpm dev:desktop
```

That command prepares Expo web on port `8081` and opens the Tauri development window. It uses
`apps/client/.env` for the typed API base URL. Point that file at the local NestJS API or at the
hosted demonstration HTTPS URL.

Create the desktop production environment file before packaging:

```powershell
Copy-Item apps/client/.env.desktop.example apps/client/.env.desktop
```

```bash
pnpm build:desktop
```

`pnpm build:desktop` exports the Expo web client with `.env.desktop` and produces the per-user
NSIS installer `Nestra_{version}_x64-setup.exe`, where `{version}` is the root `package.json`
product version. Local output defaults to
`%LOCALAPPDATA%\nestra\desktop-cargo-target\release\bundle\nsis\`. Signing and release publishing
remain separate tasks. Packaging details and the clean-machine smoke test live in
[`docs/deployment/desktop.md`](docs/deployment/desktop.md).

The configurable API base URLs for client runtimes are:

```text
Local web / desktop dev:  http://localhost:3000/api/v1
Hosted demo API:          https://<provider-assigned-host>/api/v1
iOS Simulator:            http://localhost:3000/api/v1
Android Emulator:         http://10.0.2.2:3000/api/v1
Physical phone:           http://<LAN-IP>:3000/api/v1
```

For a physical phone, the computer and phone must share a network, the API must listen on
`0.0.0.0`, and Windows Firewall must permit the selected private-network port. Native clients do
not use browser CORS, but the URL remains environment-configurable.

### Authentication storage

Native builds store authentication tokens in the platform-protected SecureStore. The web client
uses `localStorage` as a prototype compromise, isolated behind the same typed storage interface.
Before any public production web release, replace or reassess this approach and evaluate server-set
cookies with the `httpOnly`, `Secure`, and `SameSite` attributes.

The Tauri desktop runtime never selects that web `localStorage` path for authentication secrets.
It stores tokens in the operating-system credential store through a narrow Tauri command boundary.
Details are in [`docs/deployment/desktop.md`](docs/deployment/desktop.md) and
[ADR 006](docs/decisions/006-desktop-auth-storage-and-runtime-hardening.md).

## Development standards

- pnpm is the only package manager.
- TypeScript is strict; `any` is not allowed.
- Run formatting and lint checks before marking a stage complete.
- Never log credentials, tokens, private note content, or drafts.
- Use Conventional Commits when commits are explicitly requested.

Quality commands:

```bash
pnpm format
pnpm format:check
pnpm lint
pnpm lint:fix
pnpm typecheck
pnpm build
pnpm verify
```

`pnpm verify` runs `format:check`, `lint`, `typecheck`, and `build` in sequence. It is the same command used by the baseline GitHub Actions quality gate.

## Hosted API (Render + Neon)

The demonstration API runs as a container on a Render Free Web Service (Frankfurt) with Neon Free
PostgreSQL in a compatible European region. Provider-assigned HTTPS and a short cold start are
accepted for the family/demo phase. A custom domain is not required for `0.1.0`.

Operator steps, environment variables, migration procedure, free-tier limits, and the upgrade path
to an always-on service are documented in
[`docs/deployment/hosted-api.md`](docs/deployment/hosted-api.md).

Build the production API image locally before deploying:

```bash
pnpm docker:api:build
```

Secrets belong only in provider dashboards. Never commit them or paste them into GitHub issues.

## Continuous integration

The baseline quality gate workflow in `.github/workflows/ci.yml` runs on pull requests and pushes to `main`. It installs dependencies with `pnpm install --frozen-lockfile`, then runs `pnpm verify`.

The Windows packaging workflow in `.github/workflows/desktop-package.yml` runs on the same events
(and `workflow_dispatch`) on `windows-latest`. It installs Rust, copies
`apps/client/.env.desktop.example` to `.env.desktop`, runs `pnpm build:desktop`, and uploads
`Nestra_{version}_x64-setup.exe` as a workflow artifact.

CI assumptions:

- Node.js `24.18.0` and pnpm `11.13.1`, matching the pinned repository versions.
- No PostgreSQL, Docker, or local `.env` files are required for the quality gate. API compilation does not boot the server or connect to a database.
- The Expo web build in the quality gate uses the public `EXPO_PUBLIC_*` values from `apps/client/.env.example`. Diagnostics and verbose logging stay disabled there.
- `argon2` compiles its native binding during dependency installation on the Ubuntu runner.
- The quality-gate workflow runs `pnpm verify` only. Desktop packaging is a separate Windows job and does not publish releases.
- Desktop packaging requires Windows MSVC tooling, WebView2, and the Rust stable toolchain on the runner (or a local Windows machine for `pnpm build:desktop`).

The root product version in `package.json` is the single source used by the Expo configuration,
compiled shared application metadata, Tauri configuration, and Windows installer metadata.
Workspace package versions are internal only. Development identifiers are `nestra`,
`com.michalrozek.nestra` for Android, and `com.michalrozek.nestra` for iOS; they must be reviewed
before store publication.

## Documentation

- [`0.1.0` product and technical specification](docs/specifications/nestra-initial-application.md)
- [Hosted API deployment (Render + Neon)](docs/deployment/hosted-api.md)
- [Desktop shell (Tauri)](docs/deployment/desktop.md)
- [Implementation board](https://github.com/users/michalrozek90/projects/1)
- [Architecture decisions](docs/decisions/README.md)
- [Contributor instructions](AGENTS.md)
- [Autonomous agent task workflow](docs/workflows/agent-task-workflow.md)

Start or resume the autonomous GitHub issue workflow with the repository alias:

```text
/work #10
/work https://github.com/michalrozek90/nestra/issues/10
```

The alias works in Cursor Agent Chat, the Codex extension in Cursor, and the native Codex application. The workflow source of truth is `docs/workflows/agent-task-workflow.md`.

## Roadmap

1. Repository and workspace foundation
2. Expo, NestJS, contracts, database, and shared configuration scaffolding
3. Backend foundation and a client platform foundation with a React Native Paper-based design
   system and persisted system, light, and dark appearance modes
4. Authentication
5. Notes and resilient autosave
6. Settings and diagnostics
7. Desktop and hosted-service architecture, CI, Render/Neon deployment, Tauri integration,
   security hardening, Windows packaging, and `0.1.0` release readiness

Post-`0.1.0` milestones cover automated tests, refinement of the established design system and
product branding, observability, shopping lists, server-scheduled reminders, R2-backed ambient
audio, offline synchronization, and desktop distribution hardening such as updates, signing, and
additional operating systems. The authoritative scope and detailed boundaries are in the
specification.

## License

No license has been selected. This repository must not be treated as open source unless a license
is chosen explicitly in a later licensing decision.
