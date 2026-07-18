# Nestra implementation status

- [x] Stage 1 — Repository governance and workspace foundation
- [x] Stage 2 — Application scaffolding and contracts build
- [ ] Stage 3 — Backend platform foundation
- [ ] Stage 4 — Client platform foundation
- [ ] Stage 5 — Authentication backend
- [ ] Stage 6 — Authentication client
- [ ] Stage 7 — Notes backend
- [ ] Stage 8 — Notes client and autosave
- [ ] Stage 9 — Settings, changelog, logging, and diagnostics
- [ ] Stage 10 — CI, release automation, documentation, and 0.1.0 readiness

## Stage 1 — Repository governance and workspace foundation

### Subtasks

- [x] Inspect the existing repository and preserve Git configuration.
- [x] Store the authoritative specification in `docs/specifications/`.
- [x] Add contributor instructions, this tracker, and the ADR structure.
- [x] Create the private pnpm workspace and root package.
- [x] Pin exact Node.js and pnpm versions.
- [x] Add Git ignore, EditorConfig, ESLint, and Prettier configuration.
- [x] Add the initial README and Unreleased changelog.
- [x] Execute all Stage 1 verification commands.

### Completion criteria

- [x] The existing repository root and Git remote are preserved; no nested project exists.
- [x] The root package is private and the pnpm workspace is valid.
- [x] Runtime and package-manager versions are pinned consistently.
- [x] All ten stages are represented in this tracker.
- [x] Tooling configuration parses and all verification commands pass.
- [x] No Stage 2 application scaffolding has started.

### Verification commands

```bash
pnpm install
pnpm format:check
pnpm lint
```

### Completion date

2026-07-17

### Implementation notes

Node.js `24.18.0` is the current LTS and meets the documented minimums for stable Expo SDK 57
and NestJS 11. pnpm is pinned to `11.13.1`. The original `origin` remote was inspected and left
unchanged. The product version remains `0.0.0` until the first `0.1.0` release is prepared. The
specification copy matches the supplied source byte-for-byte. Dependency installation,
`format:check`, and `lint` completed successfully through the pinned pnpm version provided by
Corepack.

### Blockers

None known.

## Stage 2 — Application scaffolding and contracts build

### Subtasks

- [x] Scaffold Expo client, NestJS API, contracts, and shared tsconfig packages.
- [x] Build contracts as ESM, CommonJS, declarations, and source maps with tsdown.
- [x] Wire workspace scripts, Docker PostgreSQL, environment examples, identifiers, and version
      reading.

### Completion criteria

- [x] Expo Web starts on port 8081 and produces a static export.
- [x] The NestJS API builds, starts in watch mode, and imports the sample contract through package
      exports.
- [x] Contracts produce ESM, CommonJS, declaration files, and source maps; the client imports the
      same contract through package exports.
- [x] PostgreSQL starts and reports healthy through Docker Compose.
- [x] Root build ordering is contracts, API, then client, and the combined development command
      starts contracts watch, API watch, and Expo Web.
- [x] No Stage 3 environment validation, TypeORM, API platform, health, or Swagger logic was added.

### Verification commands

```bash
pnpm db:start
pnpm build
pnpm typecheck
pnpm dev:web
pnpm dev:api
```

### Completion date

2026-07-18

### Implementation notes

Created private Expo, NestJS, contracts, and tsconfig workspace packages. Expo SDK `57.0.7`
selected its compatible React Native and Router dependencies through `expo install`. Contracts use
tsdown `0.22.9` with conditional ESM/CommonJS exports and root-version replacement at build time.
The API and client both returned application metadata version `0.0.0`; Expo identifiers and static
web configuration were inspected. `pnpm build`, `pnpm typecheck`, `pnpm dev:web`, `pnpm dev:api`,
and the combined `pnpm dev` were executed successfully. Compose configuration resolves PostgreSQL
`18.4-alpine`, port 5432, a health check, and the `nestra_postgres_data` named volume.
PostgreSQL was pulled, started, and reached healthy status using Docker Desktop's Hyper-V backend.

### Blockers

None known.

## Stage 3 — Backend platform foundation

### Subtasks

- [ ] Add API environment validation, TypeORM migrations and naming, versioned API routing,
      request IDs, safe errors, health, Swagger/Zod integration, and seed infrastructure.

### Completion criteria

- [ ] Environment failures are explicit; migrations run and revert; health checks the database;
      Swagger includes payload schemas; request IDs propagate; no auth or Notes logic exists.

### Verification commands

```bash
pnpm db:start
pnpm db:migrate
pnpm db:migrate:revert
pnpm db:migrate
pnpm build
pnpm typecheck
```

Manual: inspect `/docs` and `/api/v1/health`.

### Completion date

Not completed.

### Implementation notes

Not started.

### Blockers

None known.

## Stage 4 — Client platform foundation

### Subtasks

- [ ] Add responsive route shells, localized placeholders, persisted i18n, validated runtime
      configuration, Axios, safe logging, diagnostics foundation, tokens, and used primitives.

### Completion criteria

- [ ] Web uses port 8081; navigation responds to breakpoints; language persists with English
      fallback; runtime validation and safe logger rules hold; no auth or Notes business logic.

### Verification commands

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
pnpm dev:web
```

Manual: resize through every breakpoint.

### Completion date

Not completed.

### Implementation notes

Not started.

### Blockers

None known.

## Stage 5 — Authentication backend

### Subtasks

- [ ] Implement users, refresh sessions, migrations, Argon2id, JWT access, rotating opaque refresh
      tokens, auth endpoints, guard, Swagger, and the authentication ADR.

### Completion criteria

- [ ] Registration authenticates; login is generic; refresh rotates atomically; logout is
      idempotent; protected identity works; secrets are never stored in plaintext; Swagger is
      complete.

### Verification commands

```bash
pnpm db:migrate
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
```

Manual: exercise every auth endpoint through Swagger or an HTTP client.

### Completion date

Not completed.

### Implementation notes

Not started.

### Blockers

None known.

## Stage 6 — Authentication client

### Subtasks

- [ ] Add localized registration and login, token storage, serialized Axios refresh, session
      restoration, route protection, logout, and Account settings.

### Completion criteria

- [ ] Auth navigation and restoration work without flashes; concurrent 401 responses use one
      refresh; failure and logout clear local state; errors are localized; tokens are never logged.

### Verification commands

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
```

Manual: verify on Web and at least one native target.

### Completion date

Not completed.

### Implementation notes

Not started.

### Blockers

None known.

## Stage 7 — Notes backend

### Subtasks

- [ ] Add Note persistence, migration, contracts, owned CRUD, archive filtering and sorting,
      pin/archive invariants, hard deletion, and complete Swagger schemas.

### Completion criteria

- [ ] Active and archived queries, validation, ownership hiding, archive-unpin behavior, permanent
      deletion, and UTC ISO timestamps meet the specification without pagination.

### Verification commands

```bash
pnpm db:migrate
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
```

Manual: exercise the API with two users.

### Completion date

Not completed.

### Implementation notes

Not started.

### Blockers

None known.

## Stage 8 — Notes client and autosave

### Subtasks

- [ ] Add Notes lists and editors, TanStack Query actions, serialized 800 ms server autosave,
      150 ms local drafts, stale-response protection, recovery, and save statuses.

### Completion criteria

- [ ] Note actions work; saves are minimal and debounced; local drafts protect failed or interrupted
      edits; new notes transition safely; no general offline queue or WebSockets are added.

### Verification commands

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
```

Manual: test rapid typing, navigation, API failure, retry, backgrounding, and draft recovery.

### Completion date

Not completed.

### Implementation notes

Not started.

### Blockers

None known.

## Stage 9 — Settings, changelog, logging, and diagnostics

### Subtasks

- [ ] Complete Settings, direct language switching, logout, localized `0.1.0` release notes,
      changelog, health-backed diagnostics, safe logging review, version display, and placeholders.

### Completion criteria

- [ ] Settings and diagnostics meet visibility and refresh rules; versions match; all displays and
      logs are safe; no raw log viewer or secret values are exposed.

### Verification commands

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
```

Manual: inspect every relevant screen and application log.

### Completion date

Not completed.

### Implementation notes

Not started.

### Blockers

None known.

## Stage 10 — CI, release automation, documentation, and 0.1.0 readiness

### Subtasks

- [ ] Add pinned CI, Release Please and bootstrap validation, the release ADR, complete setup and
      troubleshooting documentation, and final dependency, naming, security, and readiness review.

### Completion criteria

- [ ] CI runs install, formatting, lint, typecheck, and build; Release Please will create `v0.1.0`;
      root versioning and documentation are complete; all previous stages pass; no tests, Tauri, or
      license are added.

### Verification commands

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
```

Manual: review workflow permissions, immutable action pins, and Release Please bootstrap behavior.

### Completion date

Not completed.

### Implementation notes

Not started.

### Blockers

None known.
