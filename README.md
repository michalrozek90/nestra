# Nestra

Nestra is a cross-platform personal application for everyday organization. Its name is inspired
by a nest: a personal, organized, comfortable place for notes, reminders, shopping, and
relaxation.

## Architecture

The target architecture is an Expo client for Android, iOS, and Web, backed by a modular NestJS
REST API and PostgreSQL. Shared public API contracts will live in a framework-independent
`@nestra/contracts` package. Stage 2 provides runnable technical scaffolds for each layer; product
features are introduced in later stages.

```text
Expo client (Android / iOS / Web)
                |
                v
          NestJS REST API
                |
                v
            PostgreSQL
```

This is a private pnpm monorepo containing:

- `@nestra/client`
- `@nestra/api`
- `@nestra/contracts`
- `@nestra/tsconfig`

## Prerequisites

- [Node.js `24.18.0`](https://nodejs.org/en/download) (pinned in `.nvmrc`, `.node-version`, and
  `package.json`)
- [pnpm `11.13.1`](https://pnpm.io/installation) (version declared by `packageManager`)
- [Git](https://git-scm.com/install/)
- [Docker Desktop](https://docs.docker.com/get-started/get-docker/) or Docker Engine with Compose

Node.js 24 is the current LTS line and satisfies the Node requirements of the selected stable
Expo SDK 57 and NestJS 11 lines. Use the exact pinned versions so local and CI behavior remains
consistent.

## Repository setup

```bash
pnpm install
```

Local environment templates are committed at:

```text
apps/api/.env.example
apps/client/.env.example
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

Copy the API and client examples to their local `.env` files when those applications need runtime
configuration. Local `.env` and `.env.local` files are ignored by Git.

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
`nestra_postgres_data`. Its checked-in credentials are for local development only. TypeORM,
migrations, and seed commands are introduced in Stage 3.

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

The temporary Stage 2 API route at `http://localhost:3000/` returns the same application metadata
contract imported by the client. The full versioned `/api/v1` platform and health endpoint arrive
in Stage 3.

For simultaneous contracts watch, API watch, and Expo Web development:

```bash
pnpm dev
```

Native development commands are:

```bash
pnpm dev:android
pnpm dev:ios
```

Android requires Android Studio and a configured emulator or device. The iOS simulator requires
macOS and Xcode; `pnpm dev:ios` fails with an explicit message on unsupported platforms.

The configurable API base URLs for later client stages are:

```text
Web:              http://localhost:3000/api/v1
iOS Simulator:    http://localhost:3000/api/v1
Android Emulator: http://10.0.2.2:3000/api/v1
Physical phone:   http://<LAN-IP>:3000/api/v1
```

For a physical phone, the computer and phone must share a network, the API must listen on
`0.0.0.0`, and Windows Firewall must permit the selected private-network port. Native clients do
not use browser CORS, but the URL remains environment-configurable.

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
```

The root product version in `package.json` is the single source used by the Expo configuration and
compiled shared application metadata. Workspace package versions are internal only. Development
identifiers are `nestra`, `com.michalrozek.nestra` for Android, and
`com.michalrozek.nestra` for iOS; they must be reviewed before store publication.

## Documentation

- [Initial application specification](docs/specifications/nestra-initial-application.md)
- [Implementation status](docs/implementation-status.md)
- [Architecture decisions](docs/decisions/README.md)
- [Contributor instructions](AGENTS.md)

## Roadmap

1. Repository and workspace foundation
2. Expo, NestJS, contracts, database, and shared configuration scaffolding
3. Backend and client platform foundations
4. Authentication
5. Notes and resilient autosave
6. Settings, diagnostics, release automation, and `0.1.0` readiness

Post-`0.1.0` milestones cover automated tests, a UI/UX redesign, observability, shopping lists,
reminders, ambient audio, offline synchronization, and a future Tauri desktop wrapper. The
authoritative scope and detailed stage boundaries are in the specification.

## License

No license has been selected. This repository must not be treated as open source unless a license
is chosen explicitly in a later licensing decision.
