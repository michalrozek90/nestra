# Nestra

Nestra is a cross-platform personal application for everyday organization. Its name is inspired
by a nest: a personal, organized, comfortable place for notes, reminders, shopping, and
relaxation.

## Architecture

The target architecture is an Expo client for Android, iOS, and Web, backed by a modular NestJS
REST API and PostgreSQL. Shared public API contracts will live in a framework-independent
`@nestra/contracts` package.

```text
Expo client (Android / iOS / Web)
                |
                v
          NestJS REST API
                |
                v
            PostgreSQL
```

This is a private pnpm monorepo. Planned workspace packages are:

- `@nestra/client`
- `@nestra/api`
- `@nestra/contracts`
- `@nestra/tsconfig`

## Prerequisites

- [Node.js `24.18.0`](https://nodejs.org/en/download) (pinned in `.nvmrc`, `.node-version`, and
  `package.json`)
- [pnpm `11.13.1`](https://pnpm.io/installation) (version declared by `packageManager`)
- [Git](https://git-scm.com/install/)

Node.js 24 is the current LTS line and satisfies the Node requirements of the selected stable
Expo SDK 57 and NestJS 11 lines. Use the exact pinned versions so local and CI behavior remains
consistent.

## Repository setup

```bash
pnpm install
pnpm format:check
pnpm lint
```

Stage 1 does not include runnable client, API, database, migration, or build commands. Those are
introduced only in their assigned implementation stages.

## Development standards

- pnpm is the only package manager.
- TypeScript is strict; `any` is not allowed.
- Run formatting and lint checks before marking a stage complete.
- Never log credentials, tokens, private note content, or drafts.
- Use Conventional Commits when commits are explicitly requested.

Useful Stage 1 commands:

```bash
pnpm format
pnpm format:check
pnpm lint
pnpm lint:fix
```

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
