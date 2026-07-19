# Nestra implementation status

- [x] Stage 1 — Repository governance and workspace foundation
- [x] Stage 2 — Application scaffolding and contracts build
- [x] Stage 3 — Backend platform foundation
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
A follow-up review ensured every standalone client and API development command builds contracts
before startup and excluded Expo's generated type declaration from formatting checks. The
remediation passed `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and `pnpm build`;
`pnpm dev:api` also built contracts first and reached a successful NestJS startup.

### Blockers

None known.

## Stage 3 — Backend platform foundation

### Subtasks

- [x] Validate API environment variables without exposing private values.
- [x] Add TypeORM configuration, plural snake-case naming, a dedicated CLI data source, committed
      migrations, and migration/seed scripts.
- [x] Add `/api/v1`, request IDs, safe common errors, and request logging.
- [x] Add the database-backed health endpoint and shared Zod contracts.
- [x] Integrate nestjs-zod with Swagger payload schemas at development-only `/docs`.
- [x] Record the contracts build strategy in ADR 001 and update setup documentation.

### Completion criteria

- [x] Invalid environment configuration fails explicitly without reporting private values.
- [x] Migrations run, revert, and rerun with `synchronize` disabled.
- [x] Health reports reachable and unreachable database states with the required HTTP status.
- [x] Swagger contains complete health and API error payload schemas.
- [x] Request IDs are accepted or generated and propagate through headers, errors, and safe logs.
- [x] No authentication or Notes logic was added.

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

2026-07-18

### Implementation notes

Added validated NestJS configuration, TypeORM `1.1.0` with PostgreSQL, an explicit migration data
source, a repeatable no-record Stage 3 seed command, shared health/error contracts, request ID
middleware, a safe global exception filter, and the database-backed health module. TypeORM's
automatic schema synchronization and migration-on-start behavior are disabled. The initial
migration establishes the migration history without introducing Stage 5 or Stage 7 tables.

`pnpm db:start`, migration run/revert/rerun, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`,
and `pnpm build` completed successfully. Manual checks confirmed health `200` while PostgreSQL was
reachable, health `503` while it was stopped, request ID propagation and replacement, complete
Swagger response properties at `/docs`, and explicit invalid-environment startup failure.
`pnpm db:seed` also completed successfully. The optional Swagger telemetry install script is
disabled through the pnpm build-script allow-list.

A follow-up code review added lazy, concurrency-safe database initialization with a bounded health
check, automatic compiled entity and migration discovery, a distinct route-not-found error,
production rejection of the example JWT secret, and browser access to the `x-request-id` response
header. A cold start without PostgreSQL returned health `503`, recovered to `200` after the
database started, and migration revert/rerun continued to discover the committed migration.
Table pluralization remains explicit on entity decorators while the naming strategy handles
deterministic snake-case conversion; configured token lifetimes must also be greater than zero.

### Blockers

None known.

## Stage 4 — Client platform foundation

### Subtasks

- [x] Add route groups and one responsive tabs, rail, and sidebar navigation shell.
- [x] Add centralized breakpoints, design tokens, used accessible primitives, and localized
      placeholders.
- [x] Add English and Polish resources, system-language detection, English fallback, and persisted
      manual language selection.
- [x] Add validated runtime configuration, a configured Axios instance, safe logging, and the API
      diagnostics foundation.
- [x] Integrate the latest stable compatible React Native Paper release and record the UI-library
      decision in ADR 002.
- [x] Define the Nestra design-system foundation with semantic tokens and customized Material
      Design 3 light and dark themes.
- [x] Add a persisted `system`, `light`, and `dark` appearance preference, default it to `system`,
      and synchronize Paper, navigation, status bars, and native system UI.
- [x] Migrate current used primitives and screens onto the design system without creating
      speculative or one-to-one wrappers for the entire Paper API.

### Completion criteria

- [x] Web uses port 8081; navigation responds to breakpoints; language persists with English
      fallback; runtime validation and safe logger rules hold; no auth or Notes business logic.
- [ ] The Paper-based design system renders existing screens accessibly in light and dark themes;
      system mode follows device changes; manual light or dark selection persists; navigation and
      native system surfaces use the resolved appearance consistently.

### Verification commands

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
pnpm dev:web
```

Manual: resize through every breakpoint. Verify system, light, and dark appearance behavior on Web
and at least one native target.

### Completion date

Not completed. Initially completed on 2026-07-18 and reopened on 2026-07-18 after expanding the
client-foundation scope. The expanded implementation was completed on 2026-07-19, but native manual
verification remains blocked.

### Implementation notes

Added the Expo Router application and authentication route shells with five responsive main
destinations. The same tab tree renders as bottom tabs below 768 px, an icon-only rail from 768 px,
and an icon-and-label sidebar from 1200 px. Central tokens and only currently used primitives
provide consistent spacing, contrast, keyboard focus, and touch targets.

Added feature-oriented English and Polish i18next resources, first-launch system detection,
AsyncStorage-backed preference persistence, immediate Settings language switching, and English
fallback. Added strict Zod validation for all client runtime values, an Axios instance with safe
diagnostic metadata capture, a redacting environment-aware logger, and a diagnostics foundation
without Stage 9 health behavior. Direct client console calls are restricted to the logger through
ESLint.

Installed Expo-compatible `expo-localization` `~57.0.1`, AsyncStorage `2.2.0`, and
`@expo/vector-icons` `^15.1.1`, plus Axios `^1.18.1`, i18next `^26.3.6`, react-i18next `^17.0.10`,
and Zod `4.4.3`. Expo's dependency compatibility check passed.

`pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` completed successfully.
`pnpm dev:web` built the contracts, started Expo at port 8081, served the Settings route with HTTP
200, and supported the manual browser checks. Headless browser inspection at 600, 900, and 1400 px
confirmed bottom tabs, rail, and sidebar behavior. Browser interaction checks confirmed Polish
system detection, immediate English switching, persisted English after reload, and English fallback
for emulated unsupported `de-DE`. A build with an invalid application environment failed explicitly
and reported only the invalid field name.

A follow-up navigation check corrected the Settings diagnostics action and disabled-diagnostics
fallback to use canonical absolute routes. Browser interaction confirmed that selecting Developer
diagnostics navigates to `/settings/developer-diagnostics` and renders the diagnostics screen.

A native layout follow-up removed the compact tab bar's fixed height and bottom padding so React
Navigation can apply the Android or iOS bottom safe-area inset without placing destinations behind
system navigation controls.

Integrated stable React Native Paper `5.15.3` and the Expo SDK 57-compatible `expo-system-ui`
`57.0.1`. Added application-owned Material Design 3 light and dark themes, semantic color and
typography tokens, a Paper and Expo Router theme provider, synchronized status and root surfaces,
and platform-specific application appearance adapters. ADR 002 records the selected UI and theming
strategy and the verified dependency versions.

Added an AsyncStorage-backed `system`, `light`, and `dark` preference with `system` as the default
and a localized direct selector in Settings. Existing Button, Card, Screen, Header, EmptyState,
SectionHeader, and SettingsRow concepts now compose Paper primitives or consume the Paper theme;
no speculative Paper wrappers were added. Web uses a `matchMedia` external-store subscription so
system appearance changes update immediately, while native uses React Native's application-level
appearance override. Expo configuration introspection confirmed automatic native appearance,
the System UI plugin, the Android automatic UI-style resource, and the iOS `Automatic` setting.

A Stage 4 code-review follow-up made unknown-error logging privacy-safe, made the static Web
initialization shell independent of the build machine's locale, assigned bottom safe-area ownership
to the authentication layout, kept the last failed API error metadata coherent after later
successes, and added an accessible heading hierarchy to current primitives. At that point, the
Paper and appearance work was still pending. `pnpm format:check`, `pnpm lint`, `pnpm typecheck`,
and `pnpm build` passed after the remediation. The static export contained a locale-neutral loading
shell, and the running development server returned HTTP 200 for `/login` and `/settings`.

For the expanded implementation, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`,
and `pnpm dev:web` completed successfully. `expo install --check` reported compatible dependencies,
and the static Web export completed with all routes. Headless browser checks at 600, 900, and 1400
px confirmed a bottom bar, an 88 px icon rail, and a 248 px labeled sidebar. Browser interaction
confirmed persisted manual dark and light choices, live light-to-dark-to-light system changes,
manual light overriding a dark system preference, accessible radio selection state, and persisted
English language selection. The temporary browser profile and verification script were removed
after the checks.

Added a repository-owned `.gitattributes` policy that keeps text files on LF across operating
systems and overrides conflicting global Git checkout conversion settings.

A theming audit against the official Paper, React Navigation, and Expo guidance moved the complete
MD3 light and dark schemes into `colors.ts`, documented semantic color usage in
`docs/client-theming.md`, and reduced the native/Web appearance adapters from four files to two.
The Expo build-time root background is one documented local constant in `app.config.ts`; duplicating
that single value is simpler than maintaining a cross-runtime JSON bridge or adding `tsx` only for
configuration imports. Paper's `adaptNavigationTheme` was evaluated but its current navigation
theme type is incompatible with the required React Navigation 7 font and `ColorValue` shape, so the
six navigation color roles remain explicitly mapped without unsafe assertions.

After the audit, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, Expo public and
introspected config resolution, and `expo install --check` passed. `pnpm dev:web` served Settings
with HTTP 200. The main foreground/background role pairs have WCAG contrast ratios from 6.30:1 to
15.37:1 in the light scheme and from 7.07:1 to 14.17:1 in the dark scheme.

A code-review remediation made appearance changes commit to application state only after
AsyncStorage succeeds, so a failed write keeps the previous selection and can be retried. Language
and appearance storage availability are now tracked independently before being combined for
diagnostics. The language selector also permits retrying a failed persistence attempt for the
already active language.

Settings language and appearance choices now use named radio groups with disabled save states and
one keyboard tab stop per group. The Web implementation supports wrapping arrow-key selection and
focus movement without weakening React Native types; native keeps the same radio-group semantics.
A headless browser check confirmed both group labels, radio checked state, roving tab indexes,
arrow-key selection and focus, persistence after reload, and unchanged selection plus an alert
after a simulated storage failure. `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`,
`pnpm dev:web`, and `expo install --check` passed after the remediation.

### Blockers

Manual native verification is blocked because no Android SDK or `adb` executable is available in
the environment, and iOS cannot be run on this Windows host. Stage 4 must remain incomplete until
the system, light, and dark modes, live system changes, persistence, status bar, navigation
surfaces, and safe-area behavior are checked on an Android or iOS target.

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
