# Nestra

Nestra is a cross-platform personal organization app for notes and related everyday tools. The
name comes from a nest: a personal, organized place for your own information.

The product ships as an Expo client (Android, iOS, Web) and an installable Windows x64 desktop
shell. A NestJS REST API and PostgreSQL form the shared backend. Shared API contracts live in
`@nestra/contracts`.

```text
Expo client (Android / iOS / Web)
                |
                +-- Expo web build --> Tauri desktop (Windows x64)
                |
                v HTTPS
        NestJS API + PostgreSQL
```

Architecture boundaries and trade-offs are in
[ADR 005](docs/decisions/005-desktop-and-hosted-service-architecture.md).

This is an open-source pnpm monorepo: `@nestra/client`, `@nestra/api`, `@nestra/desktop`,
`@nestra/contracts`, and `@nestra/tsconfig`.

## Download

Windows test builds are published on
[GitHub Releases](https://github.com/michalrozek90/nestra/releases). Download Nestra only from that
page. Installers are not yet Windows Authenticode signed, so Windows may show security warnings.
See the [code signing policy](docs/security/code-signing-policy.md) for status and controls.

## Prerequisites

- [Node.js `24.18.0`](https://nodejs.org/en/download) (pinned in `.nvmrc`, `.node-version`, and
  `package.json`)
- [pnpm `11.13.1`](https://pnpm.io/installation) (from `packageManager`)
- [Git](https://git-scm.com/install/)
- [Docker Desktop](https://docs.docker.com/get-started/get-docker/) or Docker Engine with Compose

Desktop development and packaging also need Rust, MSVC C++ tools, and WebView2. Details:
[`docs/deployment/desktop.md`](docs/deployment/desktop.md).

## Quick start

```bash
pnpm install
```

Copy environment templates before running services (examples are never used as live config):

```text
apps/api/.env.example
apps/client/.env.example
apps/client/.env.desktop.example
infrastructure/.env.example
```

```powershell
Copy-Item infrastructure/.env.example infrastructure/.env
Copy-Item apps/api/.env.example apps/api/.env
```

```bash
cp infrastructure/.env.example infrastructure/.env
cp apps/api/.env.example apps/api/.env
```

Replace the API JWT placeholder with a private value of at least 32 characters. Copy the client
example when the client needs runtime configuration. Local `.env` / `.env.local` files are Git
ignored.

Google authentication is disabled by default. Configure the matching `GOOGLE_OAUTH_*` API values,
then set `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=true` only for clients targeting that configured API.
Google authentication uses the system browser; Expo Go is not a supported verification target.
The installed Windows application returns through its dedicated protocol handler and keeps both
the pending handoff verifier and final Nestra session in Windows Credential Manager. Development
and packaged Windows verification steps are in [`docs/deployment/desktop.md`](docs/deployment/desktop.md).

Start PostgreSQL, apply migrations, then run the stack:

```bash
pnpm db:start
pnpm db:migrate
pnpm dev
```

Useful variants:

| Command                             | Purpose                                          |
| ----------------------------------- | ------------------------------------------------ |
| `pnpm dev:web`                      | Expo web on port `8081`                          |
| `pnpm dev:api`                      | NestJS API on `0.0.0.0:3000`                     |
| `pnpm dev:android` / `pnpm dev:ios` | Native clients                                   |
| `pnpm dev:desktop`                  | Tauri desktop against Expo web                   |
| `pnpm db:logs` / `pnpm db:stop`     | Inspect or stop Postgres                         |
| `pnpm db:seed`                      | Development seed (refuses `NODE_ENV=production`) |

Health: `http://localhost:3000/api/v1/health`. Swagger (development only):
`http://localhost:3000/docs`.

API base URL examples for client env files:

```text
Local web / desktop / iOS Simulator:  http://localhost:3000/api/v1
Android Emulator:                     http://10.0.2.2:3000/api/v1
Physical phone:                       http://<LAN-IP>:3000/api/v1
Hosted demo API:                      https://<provider-host>/api/v1
```

Desktop packaging, updater behavior, and auth-storage notes:
[`docs/deployment/desktop.md`](docs/deployment/desktop.md) and
[ADR 006](docs/decisions/006-desktop-auth-storage-and-runtime-hardening.md).

## Quality

pnpm is the only package manager. TypeScript is strict (`any` is not allowed). Do not log
credentials, tokens, note content, or drafts.

```bash
pnpm format
pnpm format:check
pnpm lint
pnpm lint:fix
pnpm typecheck
pnpm build
pnpm verify
pnpm test:api
pnpm test:client
```

`pnpm verify` runs `format:check`, `lint`, product-version sync, `typecheck`, client unit tests, and
`build`. It is the baseline GitHub Actions quality gate. `pnpm test:api` runs API persistence and
related Node tests against local Postgres (`pnpm db:start`); CI also runs that job with a Postgres
service.

## Deployment, CI, and releases

- Hosted API (Render + Neon): [`docs/deployment/hosted-api.md`](docs/deployment/hosted-api.md)
- Desktop shell and packaging: [`docs/deployment/desktop.md`](docs/deployment/desktop.md)
- Release Please, draft releases, and updater assets:
  [`docs/deployment/release.md`](docs/deployment/release.md)
- Code signing: [`docs/security/code-signing-policy.md`](docs/security/code-signing-policy.md)

CI on pull requests and `main` runs the quality gate and the API persistence job
(`.github/workflows/ci.yml`). Separate workflows handle Windows packaging and release-asset
attachment. The root `package.json` version is the product version shared by Expo, Tauri, the
installer, and Release Please (`pnpm check:product-version`).

## Documentation

- [Product and technical specification](docs/specifications/nestra-initial-application.md)
- [Privacy notice](PRIVACY.md)
- [Architecture decisions](docs/decisions/README.md)
- [Contributor / agent instructions](AGENTS.md)
- [Issue intake workflow](docs/workflows/issue-intake-workflow.md)
- [Autonomous agent task workflow](docs/workflows/agent-task-workflow.md)
- [Implementation board](https://github.com/users/michalrozek90/projects/1)

## License

Copyright (C) 2026 Nestra contributors.

Nestra is free software under the
[GNU Affero General Public License version 3](LICENSE) (`AGPL-3.0-only`, no later-version option).
Modified versions offered over a network must make corresponding source available under the same
license. Third-party dependencies remain under their own licenses. See
[ADR 009](docs/decisions/009-open-source-licensing.md).
