# Nestra — Initial Application Specification

**Status:** Final implementation specification  
**Target first release:** `0.1.0`  
**Audience:** Codex or another coding agent operating inside the repository  
**Specification language:** English  
**UI languages:** English and Polish

---

## 1. Repository context

The current working directory is already the root of an existing cloned Git repository. It may be empty apart from Git metadata and files created by the hosting platform.

Codex must:

1. inspect the current directory and existing files;
2. preserve valid existing work and Git configuration;
3. create all project files directly in the current repository root.

Codex must not:

- create a nested `nestra/` directory;
- run `git init`;
- replace the repository;
- change or remove the configured Git remote;
- delete files before reviewing them;
- work outside the repository root;
- commit, tag, push, create branches, or open pull requests unless explicitly instructed.

---

## 2. Execution rule: exactly one stage per run

This project must be implemented incrementally.

**One Codex run must execute exactly one implementation stage.**

At the start of every run, Codex must:

1. read this specification;
2. read `AGENTS.md`;
3. read `docs/implementation-status.md`;
4. identify the first incomplete stage;
5. inspect the current implementation;
6. implement only that stage.

At the end of every run, Codex must:

1. run the verification commands for the current stage;
2. update `docs/implementation-status.md`;
3. mark the stage complete only when every criterion passes;
4. record blockers honestly;
5. summarize the work;
6. stop without starting the next stage.

Finishing early is not permission to continue. If the user explicitly requests a later stage while a prerequisite is incomplete, report the dependency instead of silently bypassing it.

---

## 3. Progress tracker

During Stage 1, create `docs/implementation-status.md` containing:

```md
# Nestra implementation status

- [ ] Stage 1 — Repository governance and workspace foundation
- [ ] Stage 2 — Application scaffolding and contracts build
- [ ] Stage 3 — Backend platform foundation
- [ ] Stage 4 — Client platform foundation
- [ ] Stage 5 — Authentication backend
- [ ] Stage 6 — Authentication client
- [ ] Stage 7 — Notes backend
- [ ] Stage 8 — Notes client and autosave
- [ ] Stage 9 — Settings, changelog, logging, and diagnostics
- [ ] Stage 10 — CI, release automation, documentation, and 0.1.0 readiness
```

Each stage section must also show:

- subtasks;
- completion criteria;
- verification commands;
- completion date;
- short implementation notes;
- blockers.

Only the active stage may be updated.

---

## 4. Product overview

Build **Nestra**, a cross-platform personal application. The name is inspired by “nest”: a personal, organized, comfortable place for everyday matters.

Long-term modules:

1. **Notes and shopping**
   - personal notes;
   - shopping lists;
   - reusable shopping-list templates.

2. **Persistent reminders**
   - recurring reminders;
   - repeated notifications until completion;
   - actions such as “Done” and “Remind me again”.

3. **Relaxation**
   - looping ambient sounds;
   - independent volume;
   - simultaneous sounds;
   - saved presets.

Release `0.1.0` implements the foundation and the complete **Notes** module. Shopping, Reminders, and Relax exist only as localized placeholder screens.

---

## 5. Architecture

```text
Expo client
Android / iOS / Web
        │
        ▼
 NestJS REST API
        │
        ▼
   PostgreSQL
```

The Expo web build must remain suitable for a later Tauri wrapper.

Mandatory:

- pnpm monorepo;
- strict TypeScript;
- modular NestJS monolith;
- feature-oriented client modules;
- PostgreSQL and TypeORM migrations;
- shared Zod API contracts;
- English and Polish localization;
- structured logging;
- Developer diagnostics;
- unified product versioning;
- automated release PRs, version bumps, tags, and GitHub Releases.

Excluded from `0.1.0`:

- Next.js;
- microfrontends;
- microservices;
- Tauri;
- WebSockets;
- general offline synchronization;
- push notifications;
- reminder scheduling;
- ambient audio;
- desktop installers and updater;
- Sentry;
- Jest and all automated tests;
- API integration tests;
- E2E tools;
- Turborepo;
- Nx;
- a license file.

Do not add speculative infrastructure for excluded features.

---

## 6. Technology stack

### Client

- Expo;
- React Native;
- Expo Router;
- TypeScript;
- TanStack Query;
- Axios;
- React Hook Form;
- Zod;
- i18next and react-i18next;
- expo-localization;
- expo-secure-store for native auth tokens;
- AsyncStorage for non-sensitive preferences and editor drafts;
- React Native Paper;
- React Native StyleSheet;
- Expo-compatible icons;
- app-owned semantic design tokens and light and dark Material Design 3 themes;
- expo-system-ui for native appearance integration.

Use the latest stable mutually compatible React Native Paper release. Do not use a prerelease or add
a second UI component or styling framework in `0.1.0`.

### API

- NestJS;
- TypeScript;
- PostgreSQL;
- TypeORM;
- Zod;
- nestjs-zod;
- @nestjs/swagger;
- JWT access tokens;
- opaque rotating refresh tokens;
- Argon2id.

### Contracts package

Create private package `@nestra/contracts`. Build it using the latest stable **tsdown** with:

- ESM output;
- CommonJS output;
- declaration files;
- source maps;
- explicit `types`, `import`, and `require` exports;
- `sideEffects: false`;
- watch mode.

The package must remain framework-independent and contain no React, NestJS, TypeORM, Node-only, or browser-only code. It must build before the API and client. Do not use brittle cross-workspace relative imports into its source directory.

---

## 7. Dependency policy

- Use the latest stable mutually compatible versions available at implementation time.
- No beta, canary, RC, nightly, or other prerelease dependencies.
- Verify official documentation and peer dependencies.
- Install Expo-managed packages with:

```bash
pnpm --filter @nestra/client exec expo install <package>
```

- Use pnpm only; do not use npm, npx, Yarn, or Bun.
- Commit `pnpm-lock.yaml`.
- Do not perform unrelated upgrades.
- Record necessary compatibility compromises in an ADR.
- If network access is unavailable, do not guess current versions; report the limitation.

---

## 8. Runtime pinning

During Stage 1:

1. determine the latest active Node.js LTS supported by the selected Expo and NestJS versions;
2. pin Node consistently;
3. pin the exact pnpm version.

Create:

- `engines.node`;
- `packageManager`;
- `.nvmrc`;
- `.node-version`.

Document the exact versions in README. Use Corepack where compatible.

---

## 9. Repository structure

```text
.
├── apps/
│   ├── client/
│   │   ├── app/
│   │   ├── assets/
│   │   ├── src/
│   │   ├── app.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── api/
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── contracts/
│   │   ├── src/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsdown.config.ts
│   └── tsconfig/
│       ├── base.json
│       ├── node.json
│       ├── react-native.json
│       └── package.json
├── infrastructure/
│   ├── .env.example
│   └── docker-compose.yml
├── docs/
│   ├── specifications/
│   │   └── nestra-initial-application.md
│   ├── decisions/
│   │   └── README.md
│   └── implementation-status.md
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release-please.yml
├── .editorconfig
├── .gitignore
├── .nvmrc
├── .node-version
├── .prettierignore
├── .prettierrc.json
├── AGENTS.md
├── CHANGELOG.md
├── README.md
├── eslint.config.mjs
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── release-please-config.json
└── .release-please-manifest.json
```

Package names:

```text
@nestra/client
@nestra/api
@nestra/contracts
@nestra/tsconfig
```

Do not create `@nestra/shared` in `0.1.0`.

The root and every non-published workspace package must set `"private": true`.

---

## 10. AGENTS.md and ADRs

Create a concise `AGENTS.md` that points to this specification and the tracker and repeats:

- existing repository root;
- no `git init`;
- one stage per run;
- pnpm only;
- strict TypeScript;
- no `any`;
- verify before completion;
- no private-data logging;
- no Git writes without explicit approval.

Use lightweight ADRs in `docs/decisions/`, for example:

```text
001-monorepo-and-package-boundaries.md
002-contracts-build-strategy.md
003-authentication-token-strategy.md
004-release-automation.md
```

Each ADR contains status, context, decision, consequences, and alternatives.

---

## 11. Root scripts

```bash
pnpm dev
pnpm dev:client
pnpm dev:web
pnpm dev:android
pnpm dev:ios
pnpm dev:api

pnpm db:start
pnpm db:stop
pnpm db:logs
pnpm db:migrate
pnpm db:migrate:revert
pnpm db:seed

pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check
pnpm typecheck
pnpm build
```

Requirements:

- `pnpm dev` builds contracts once, then runs contracts watch, API watch, and Expo web.
- `pnpm dev:web` uses port `8081`.
- root build order is contracts → API/client.
- no `test` script in `0.1.0`.
- use a simple maintained concurrent-command tool.
- unsupported platform scripts fail clearly.

---

## 12. Product versioning and release automation

The first released version is `0.1.0`. Do not use alpha, beta, or RC suffixes.

The root `package.json` `version` is the single product-version source. It must feed:

- Expo app version;
- client runtime version;
- diagnostics;
- API health response;
- changelog display;
- future Tauri configuration.

Workspace package versions are internal metadata and must not be displayed as the product version.

Native build numbers are separate:

- Android `versionCode`: incrementing integer;
- iOS `buildNumber`: incrementing build identifier.

Their automation is deferred until native build pipelines are introduced.

### Release Please

Configure Release Please in Stage 10, before the first release. Do not wait for Tauri.

On pushes to `main`, it must:

1. analyze Conventional Commits;
2. maintain one release PR;
3. update root `CHANGELOG.md`;
4. update the root product version;
5. create a Git tag when the release PR is merged;
6. create a GitHub Release.

Expected first tag:

```text
v0.1.0
```

Use one repository-wide release component. Configure:

- first release `0.1.0`;
- `v` tag prefix;
- no component name in tags;
- `fix` → patch;
- `feat` → minor;
- pre-1.0 breaking changes must not automatically force `1.0.0`;
- explicit deliberate action before `1.0.0`.

Before Stage 10 is complete:

- validate current Release Please bootstrap behavior from official docs;
- use a dry run or another non-destructive check;
- document the bootstrap in ADR 004;
- verify the first release will be `0.1.0`, not `1.0.0`.

Do not create a local tag.

Use minimal GitHub permissions and pin third-party Actions to reviewed immutable SHAs with version comments.

### Technical changelog

Before first release:

```md
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
```

Do not manually add a dated `0.1.0` heading before the release PR. Release Please owns technical release history.

### In-app release notes

Use curated localized typed release notes:

```ts
export type ReleaseChangeCategory =
  | "added"
  | "changed"
  | "fixed"
  | "removed";

export type ReleaseChange = {
  category: ReleaseChangeCategory;
  descriptionTranslationKey: string;
};

export type ReleaseNote = {
  version: string;
  releaseDate: string;
  titleTranslationKey: string;
  changes: readonly ReleaseChange[];
};
```

Prepare `0.1.0` product notes. Do not parse technical CHANGELOG at runtime.

---

## 13. Application identifiers

Use development identifiers:

```text
Display name: Nestra
Expo slug: nestra
URL scheme: nestra
Android package: com.michalrozek.nestra
iOS bundle identifier: com.michalrozek.nestra
```

Review them before store publication.

---

## 14. Environment files and local networking

Create:

```text
apps/api/.env.example
apps/client/.env.example
infrastructure/.env.example
```

Ignore local `.env` and `.env.local` files.

Infrastructure:

```dotenv
POSTGRES_DB=nestra
POSTGRES_USER=nestra
POSTGRES_PASSWORD=nestra_dev_password
POSTGRES_PORT=5432
```

API:

```dotenv
NODE_ENV=development
API_HOST=0.0.0.0
API_PORT=3000
DATABASE_URL=postgresql://nestra:nestra_dev_password@localhost:5432/nestra
JWT_ACCESS_SECRET=replace_with_a_long_random_secret
JWT_ACCESS_EXPIRES_IN=15m
REFRESH_SESSION_EXPIRES_IN=30d
CORS_ALLOWED_ORIGINS=http://localhost:8081,http://127.0.0.1:8081
```

Client:

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
EXPO_PUBLIC_APPLICATION_ENVIRONMENT=development
EXPO_PUBLIC_SHOW_DEVELOPER_DIAGNOSTICS=true
EXPO_PUBLIC_VERBOSE_LOGGING=true
```

Validate all values with Zod. Parse boolean strings explicitly. No refresh JWT secret exists because refresh tokens are opaque.

The API listens on `0.0.0.0:3000`.

Document:

```text
Web:             http://localhost:3000/api/v1
iOS Simulator:   http://localhost:3000/api/v1
Android Emulator:http://10.0.2.2:3000/api/v1
Physical phone:  http://<LAN-IP>:3000/api/v1
```

Keep the base URL configurable. Document LAN and Windows firewall considerations. Native clients are not browser CORS clients.

Runtime config:

```ts
export const APPLICATION_ENVIRONMENTS = [
  "development",
  "preview",
  "production",
] as const;

export type ApplicationEnvironment =
  (typeof APPLICATION_ENVIRONMENTS)[number];

export type RuntimeConfig = {
  applicationVersion: string;
  environment: ApplicationEnvironment;
  apiBaseUrl: string;
  showDeveloperDiagnostics: boolean;
  isVerboseLoggingEnabled: boolean;
};
```

All four values come from explicit configuration; diagnostics and verbose logging are separate environment variables.

## 15. API and database conventions

Use global prefix:

```text
/api/v1
```

Examples:

```text
/api/v1/auth
/api/v1/notes
/api/v1/health
```

Swagger is available in development at `/docs`, outside the versioned API prefix.

Database conventions:

- plural `snake_case` tables;
- `snake_case` columns;
- camelCase TypeScript properties;
- UUID primary keys;
- `timestamptz` timestamps;
- UTC storage;
- ISO 8601 UTC API strings;
- database foreign keys;
- explicit unique constraints and useful indexes;
- database-generated UUIDs;
- no `synchronize: true`.

Tables:

```text
users
refresh_sessions
notes
```

Use a local TypeORM naming strategy or explicit mappings. Do not add an unmaintained naming-strategy package merely to avoid small local code.

Deleting a user cascades to refresh sessions and notes even though account deletion is not yet exposed.

Docker Compose must provide a named volume, health check, documented port, and development-only credentials.

Use committed TypeORM migrations and dedicated data-source configuration. Provide generate/run/revert scripts. Optional seed data may create one development user and sample notes; it must be repeatable, documented, and never run automatically in production.

---

## 16. Shared contracts and professional Swagger integration

Recommended contracts structure:

```text
packages/contracts/src/
├── auth/
│   ├── login.schema.ts
│   ├── register.schema.ts
│   ├── refresh-session.schema.ts
│   ├── authentication-session-response.schema.ts
│   └── public-user.schema.ts
├── notes/
│   ├── note.schema.ts
│   ├── create-note.schema.ts
│   ├── update-note.schema.ts
│   ├── notes-query.schema.ts
│   └── note-list.schema.ts
├── health/
│   └── health-response.schema.ts
├── common/
│   └── api-error.schema.ts
└── index.ts
```

Rules:

- Zod schemas are the source of truth for public payloads.
- Infer types with `z.infer`.
- Reject unknown request fields consistently.
- Keep entities separate from API contracts.
- Never expose hashes or internal session data.
- Use ISO string schemas for timestamps.
- Keep schemas suitable for OpenAPI.

Use current stable `nestjs-zod` instead of a custom improvised pipe:

- API-local DTO wrapper classes created from shared schemas;
- package-provided Zod validation pipe;
- package-provided serialization interceptor where appropriate;
- `cleanupOpenApiDoc` or its current supported replacement;
- `@nestjs/swagger` operation and response decorators.

Request validation and Swagger schemas must derive from the same Zod definitions. Verify actual generated request and response schemas. A Swagger page that lists endpoints but omits payload shapes is not acceptable.

Do not use `class-validator` or duplicate validation decorators.

If current package APIs differ, preserve the architecture, use supported APIs, and document the adjustment.

---

## 17. Error contract and request IDs

Use:

```ts
export type ValidationIssue = {
  fieldPath: string;
  errorCode: string;
};

export type ApiErrorResponse = {
  statusCode: number;
  errorCode: string;
  message: string;
  validationIssues?: readonly ValidationIssue[];
  requestPath: string;
  requestId?: string;
  timestamp: string;
};
```

Initial error codes:

```text
VALIDATION_FAILED
AUTH_INVALID_CREDENTIALS
AUTH_ACCESS_TOKEN_INVALID
AUTH_REFRESH_TOKEN_INVALID
AUTH_SESSION_EXPIRED
AUTH_EMAIL_ALREADY_REGISTERED
NOTE_NOT_FOUND
INTERNAL_SERVER_ERROR
SERVICE_UNAVAILABLE
```

The client localizes by `errorCode`. Server messages remain safe. Do not expose stack traces, raw DB errors, or ownership information.

Request ID behavior:

- accept a valid incoming `x-request-id` or generate a UUID;
- attach it to request context;
- return it in the response header;
- include it in backend logs and API errors;
- expose the latest request ID in diagnostics;
- do not build distributed tracing.

---

## 18. Health endpoint

Public endpoint:

```text
GET /api/v1/health
```

Contract:

```ts
export type HealthResponse = {
  status: "ok" | "degraded";
  database: "reachable" | "unreachable";
  version: string;
  timestamp: string;
};
```

Check API execution and PostgreSQL connectivity. Return a non-2xx status when the database is unavailable. Do not expose infrastructure details.

Developer diagnostics calls it once when the screen opens and on manual refresh. No polling.

---

## 19. Password and email rules

Use Argon2id through a maintained Node package.

- choose explicit parameters based on current OWASP guidance and runtime performance;
- record parameters in ADR 003;
- do not rely silently on defaults;
- hash only on the server;
- never log passwords.

Password:

- minimum 12 characters;
- maximum 128;
- no forced uppercase/digit/symbol composition;
- registration UI includes confirmation;
- confirmation remains client-only;
- allow paste and password managers.

Email:

1. trim;
2. lowercase;
3. validate;
4. store only normalized value.

Maximum 254 characters. Enforce DB-level uniqueness. Invalid login does not reveal account existence. Duplicate registration may return `AUTH_EMAIL_ALREADY_REGISTERED` as an explicit documented tradeoff.

---

## 20. Authentication architecture

### Access token

JWT payload:

```ts
export type AccessTokenPayload = {
  sub: string;
  sessionId: string;
  iat: number;
  exp: number;
  iss: "nestra-api";
  aud: "nestra-client";
};
```

- default lifetime: 15 minutes;
- signed with `JWT_ACCESS_SECRET`;
- validate issuer and audience;
- include refresh-session ID;
- do not store access-token hashes.

### Refresh token

Use opaque token:

```text
<refreshSessionId>.<randomSecret>
```

- session ID: UUID;
- random secret: at least 32 cryptographically secure bytes, base64url;
- store SHA-256 hash of the complete token;
- compare in constant time;
- rotate after every successful refresh;
- update the hash atomically;
- fixed expiry 30 days from session creation;
- rotation does not extend expiry;
- reject expired, revoked, malformed, mismatched, and old tokens;
- do not revoke a valid session merely because an arbitrary mismatch is submitted.

Advanced replay-family detection is deferred to security hardening.

RefreshSession:

```text
id
userId
tokenHash
expiresAt
revokedAt
createdAt
updatedAt
```

No `deviceName` in `0.1.0`. Device management is future work.

### Auth endpoints

#### Register

```text
POST /api/v1/auth/register
```

Request:

```ts
type RegisterRequest = {
  email: string;
  password: string;
};
```

Create user, create refresh session, and automatically authenticate.

Response `201`:

```ts
type AuthenticationSessionResponse = {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshSessionExpiresAt: string;
};
```

#### Login

```text
POST /api/v1/auth/login
```

Same response. Invalid email and password both return `AUTH_INVALID_CREDENTIALS`.

#### Refresh

```text
POST /api/v1/auth/refresh
```

Request:

```ts
type RefreshRequest = {
  refreshToken: string;
};
```

Validate, rotate atomically, and return `AuthenticationSessionResponse`.

#### Logout

```text
POST /api/v1/auth/logout
```

Request:

```ts
type LogoutRequest = {
  refreshToken: string;
};
```

Idempotent; return `204` whether already invalid or revoked. Do not require a valid access token. Client clears local tokens regardless of network outcome.

#### Current user

```text
GET /api/v1/auth/me
```

Protected by access-token guard; returns `PublicUser`.

---

## 21. Client auth storage and Axios

Storage contract:

```ts
export interface AuthTokenStorage {
  getAccessToken(): Promise<string | null>;
  setAccessToken(accessToken: string): Promise<void>;
  getRefreshToken(): Promise<string | null>;
  setRefreshToken(refreshToken: string): Promise<void>;
  clear(): Promise<void>;
}
```

- native implementation: SecureStore;
- web implementation: localStorage behind the abstraction.

README must warn that web localStorage is a prototype compromise and a public production web release must evaluate `httpOnly`, `Secure`, `SameSite` cookies.

Use one configured Axios instance with typed request functions and interceptors.

Requirements:

- attach access token;
- on eligible `401`, start exactly one refresh;
- concurrent failed requests await the same promise;
- retry each original request at most once;
- never recursively refresh refresh/logout requests;
- save rotated tokens before replay;
- clear auth state if refresh fails;
- preserve safe request IDs;
- update diagnostics;
- never log headers or tokens.

---

## 22. Auth restoration and navigation

At startup:

1. initialize preference storage;
2. read stored tokens;
3. display an initialization screen while auth is unknown;
4. without refresh token, enter unauthenticated routes;
5. with refresh token, attempt one refresh;
6. use the returned user or confirm with `/auth/me`;
7. enter authenticated routes only after success;
8. clear invalid tokens and return to login on auth failure.

Do not flash login for a valid session or create redirect loops.

If the API is unreachable during restoration, show a recoverable state with Retry and Clear local session actions.

Routing:

```text
/ -> /notes when authenticated
/ -> /login when unauthenticated
```

After login or registration, navigate to `/notes`.

Route structure:

```text
app/
├── _layout.tsx
├── (auth)/
│   ├── _layout.tsx
│   ├── login.tsx
│   └── register.tsx
└── (app)/
    ├── _layout.tsx
    ├── notes/
    │   ├── _layout.tsx
    │   ├── index.tsx
    │   ├── new.tsx
    │   └── [noteId].tsx
    ├── shopping.tsx
    ├── reminders.tsx
    ├── relax.tsx
    └── settings/
        ├── _layout.tsx
        ├── index.tsx
        ├── changelog.tsx
        └── developer-diagnostics.tsx
```

No `/settings/language` route.

---

## 23. Responsive client foundation

Main destinations:

```text
Notes
Shopping
Reminders
Relax
Settings
```

Settings has its own icon.

Central breakpoints:

```ts
export const BREAKPOINTS = {
  compact: 0,
  medium: 768,
  expanded: 1200,
} as const;
```

Behavior:

- below 768: bottom tabs, one column;
- 768–1199: left navigation rail, content max width about 960;
- 1200+: left sidebar with icons and labels, content max width about 1200.

Use one responsive route tree and a supported responsive tab-bar position, not separate navigation trees. Use `useWindowDimensions` or equivalent. Store breakpoints in `apps/client/src/theme/breakpoints.ts`. Use React Native Paper with React Native layout APIs; do not add Tailwind or another styling framework.

---

## 24. Localization

Support `en` and `pl`.

- detect system language on first launch;
- unsupported language falls back to English;
- change language directly on Settings;
- persist with AsyncStorage;
- manual choice overrides system language;
- no hardcoded user-facing strings;
- stable feature-oriented keys.

Suggested resources:

```text
src/i18n/en/{common,auth,notes,settings,releases}.ts
src/i18n/pl/{common,auth,notes,settings,releases}.ts
```

Translate navigation, auth, validation, Notes, save states, loading/empty/error states, Settings, diagnostics, changelog, placeholders, and confirmations.

---

## 25. Design scope

Design is not a primary goal of `0.1.0`. Build a clean, accessible, usable foundation only:

- readable contrast;
- accessible touch targets;
- keyboard accessibility on web;
- focus indicators;
- consistent spacing;
- clear states;
- restrained placeholders.

No detailed branding redesign or animation system. Build an application-owned design-system layer
on React Native Paper using customized Material Design 3 light and dark themes, semantic color
roles, typography, spacing, radii, sizes, and only the component variants required by implemented
features. A dedicated visual refinement follows the test foundation.

Appearance behavior:

- support `system`, `light`, and `dark` preferences;
- use `system` by default;
- react to system appearance changes while `system` is selected;
- persist a manual preference with AsyncStorage;
- apply one resolved theme consistently to React Native Paper, Expo Router/React Navigation,
  status bars, navigation surfaces, and native system UI;
- configure Expo for automatic system appearance and use `expo-system-ui` where required;
- expose the appearance selector directly in Settings.

Create central tokens and only used primitives, such as:

```text
Button
TextInput
Screen
Card
Header
EmptyState
LoadingState
ErrorState
ConfirmationDialog
SettingsRow
SectionHeader
SaveStatus
```

Avoid speculative components and boolean-heavy APIs.

Use React Native Paper primitives directly when no product-specific behavior or semantics are
needed. Keep application components for reusable Nestra concepts and composed behavior; do not
create one-to-one wrappers for the entire Paper API.

## 26. Notes backend

Entity:

```text
Note
├── id: UUID
├── userId: UUID
├── title: string
├── content: string
├── isPinned: boolean
├── isArchived: boolean
├── createdAt: timestamptz
└── updatedAt: timestamptz
```

Validation:

- title required, max 120;
- content required, max 20,000;
- trim leading/trailing whitespace from both;
- whitespace-only values invalid;
- PATCH must contain at least one supported field;
- reject unknown fields;
- no tags, rich text, collaboration, pagination, soft delete, or `deletedAt`.

Endpoints:

```text
GET    /api/v1/notes?archived=false
GET    /api/v1/notes?archived=true
GET    /api/v1/notes/:noteId
POST   /api/v1/notes
PATCH  /api/v1/notes/:noteId
DELETE /api/v1/notes/:noteId
```

Server-side archive filtering is mandatory.

Sort on the server:

1. pinned first;
2. most recently updated first within each group.

Archiving must atomically set:

```text
isArchived = true
isPinned = false
```

Archived notes cannot be pinned. Restoring does not restore prior pin state. DELETE is permanent.

Every query and mutation includes authenticated user ID. Missing and foreign-owned notes both return `NOTE_NOT_FOUND`.

---

## 27. Notes client

Support:

- active and archived views;
- create and edit;
- pin/unpin;
- archive/restore;
- permanent delete confirmation;
- refresh;
- loading, empty, recoverable error;
- autosave status.

Use TanStack Query with centralized keys. Do not duplicate server state into a global store or fetch through `useEffect`.

### Autosave

Use autosave, not a Save button.

Server save:

- debounce `800 ms` after the latest valid edit;
- send only changed supported fields;
- do not send unchanged normalized values;
- serialize saves per note;
- prevent stale responses from overwriting newer input;
- display `Saving`, `Saved`, `Save failed`, and `Saved locally`.

Local drafts:

- typed `NoteDraftStorage`;
- AsyncStorage implementation;
- draft write debounce around `150 ms`;
- never log draft content;
- clear draft after confirmed server save;
- recover a newer draft on reopening.

New note:

- starts as a local draft;
- server POST only after normalized title and content are valid;
- after first POST, replace route with `/notes/:noteId`;
- continue with PATCH autosave.

Leaving/backgrounding:

1. flush local draft;
2. flush pending valid server save;
3. await where the platform allows;
4. preserve local draft when server save fails;
5. never silently discard.

If a draft is invalid, show a localized choice to keep the local draft or discard it. Forced OS termination cannot guarantee network completion; local draft storage protects content.

This is narrow editor resilience, not general offline synchronization.

### Initial cross-device sync

No WebSockets or general mutation queue. Another device sees changes after refocus, reopen, manual refresh, or normal query refetch.

---

## 28. Client logging

Create `apps/client/src/infrastructure/logging/`.

```ts
export type LogPrimitive = string | number | boolean | null;

export type LogValue =
  | LogPrimitive
  | readonly LogValue[]
  | { readonly [key: string]: LogValue };

export type LogContext = Readonly<Record<string, LogValue>>;

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(
    message: string,
    error?: unknown,
    context?: LogContext,
  ): void;
}
```

Provide `ConsoleLogger` and exported `logger: Logger`.

Normalize unknown errors safely. Extract only safe name/message, development stack, API error code, and request ID. Do not serialize entire Axios responses, request configs, headers, or arbitrary objects.

Levels:

```text
development: debug, info, warn, error
preview:     info, warn, error
production:  warn, error
```

Production may still use console abstraction until Sentry is added.

Never log passwords, tokens, auth headers, secrets, credential-bearing URLs, note content, drafts, credentials, or full user-generated objects. Direct console calls are forbidden outside logging infrastructure.

Backend uses NestJS logging with request IDs, safe identifiers, and error codes. It does not reuse the client logger contract.

---

## 29. Developer diagnostics

Route:

```text
/settings/developer-diagnostics
```

Visibility comes from `EXPO_PUBLIC_SHOW_DEVELOPER_DIAGNOSTICS`, not inferred build mode.

Show safe data:

### Application

- name;
- product version;
- environment;
- platform;
- OS where safely available.

### API

- base URL;
- current manual health result;
- last successful request timestamp;
- last failed request timestamp;
- safe last error code;
- last request ID;
- last checked timestamp.

### Authentication

- authenticated yes/no;
- access token present yes/no;
- refresh token present yes/no.

Never display values.

### Localization

- selected language;
- detected system language.

### Storage

- auth storage implementation;
- preference storage availability;
- draft storage availability.

Call health once on open and on a manual Refresh action. No polling or raw log viewer.

---

## 30. Settings

Main Settings screen:

### Account

- authenticated email;
- Sign out.

Sign out attempts API logout, then always clears local tokens and auth state and navigates to login.

### Language

- English;
- Polish;
- immediate update;
- persisted choice.

No language sub-route.

### Developer diagnostics

- shown only when configuration allows;
- opens diagnostics route.

### About

- Nestra;
- current product version;
- View changelog.

Shopping, Reminders, and Relax show only localized “Coming in a future version” placeholders with no fake controls.

---

## 31. Deferred security hardening

Future milestone:

- Helmet review;
- rate limiting;
- brute-force protection;
- auth audit logs;
- refresh-token replay-family detection;
- CSP for web/Tauri;
- request body limits;
- dependency scanning;
- production secret management;
- cookie-based production web auth;
- account deletion and session management;
- external security review.

`0.1.0` must still include CORS allow-list, strong JWT secret validation, Argon2id, rotating opaque tokens, ownership enforcement, safe errors, request IDs, and safe logging.

---

## 32. ESLint, Prettier, CI, and README

Use ESLint flat config where supported and Prettier. Avoid duplicated formatting rules.

Scripts:

```bash
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check
```

CI on PRs and pushes to `main`:

```text
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
```

Build contracts, API, and Expo web. No tests, store builds, EAS, Tauri, deployment, or updater. Pin third-party Actions to immutable reviewed SHAs.

README must cover:

1. product and name;
2. current and future features;
3. architecture;
4. stack and repository;
5. prerequisites and pinned Node/pnpm;
6. all environment files;
7. install;
8. PostgreSQL start/stop/logs;
9. migrations and seed;
10. API;
11. Expo Web;
12. Android emulator and physical phone;
13. iOS simulator and macOS requirement;
14. formatting, lint, typecheck, builds;
15. versioning and Release Please;
16. technical vs in-app changelog;
17. web token-storage warning;
18. limitations and troubleshooting;
19. roadmap;
20. license status.

State explicitly that no license has been selected and do not create `LICENSE`.

---

## 33. TypeScript, naming, and architecture rules

- strict TypeScript;
- no `any`;
- use `unknown` and safe narrowing;
- avoid unnecessary assertions;
- infer contracts from Zod;
- readonly where appropriate;
- exhaustive closed-union checks;
- do not weaken types to silence libraries.

Prefer clear names with purpose and units:

```text
applicationVersion
requestDurationMs
lastSuccessfulRequestAt
showDeveloperDiagnostics
isVerboseLoggingEnabled
hasPendingChanges
shouldRetryRequest
```

Keep conventional names such as `id`, `email`, `content`, `isPinned`, `isArchived`, `createdAt`.

Avoid vague names in broad scopes. Boolean names should read naturally with `is`, `has`, `can`, `should`, or `show`.

Architecture:

- thin controllers;
- services hold business logic;
- network calls outside screens;
- no speculative repository abstraction;
- no global state without need;
- no circular dependencies;
- explicit module APIs;
- simple explicit code.

React:

- no query fetching through `useEffect`;
- no duplicate server state;
- stable query keys;
- typed forms;
- explicit loading/error/empty/save states.

Comments are English and explain why.

Use Conventional Commits, for example:

```text
feat(auth): add opaque refresh token rotation
feat(notes): add note autosave
fix(auth): serialize refresh requests
docs: add local setup instructions
```

Do not commit unless explicitly instructed.

---

## 34. Implementation stages and stage definitions of done

## Stage 1 — Repository governance and workspace foundation

Scope:

- inspect repository;
- preserve Git;
- save specification under `docs/specifications/`;
- create AGENTS, tracker, ADR structure;
- pnpm workspace and private root package;
- pin Node/pnpm;
- Git ignore, EditorConfig, ESLint, Prettier;
- initial README structure;
- CHANGELOG with Unreleased.

Done when:

- no nested project and no `git init`;
- remote unchanged;
- root private;
- workspace valid;
- versions pinned;
- tracker shows every stage;
- tooling configs parse;
- no Stage 2 app scaffolding started.

Verify:

```bash
pnpm install
pnpm format:check
pnpm lint
```

Stop.

## Stage 2 — Application scaffolding and contracts build

Scope:

- Expo client;
- Nest API;
- contracts and tsconfig packages;
- tsdown dual build;
- workspace wiring and build order;
- contracts watch;
- Docker PostgreSQL;
- env examples;
- app identifiers and unified version reading.

Done when:

- Expo web starts;
- API builds;
- contracts produce ESM/CJS/d.ts/maps;
- API and client import a sample contract through exports;
- Postgres healthy;
- root build order works;
- no Stage 3 business/platform logic.

Verify:

```bash
pnpm db:start
pnpm build
pnpm typecheck
pnpm dev:web
pnpm dev:api
```

Stop.

## Stage 3 — Backend platform foundation

Scope:

- env validation;
- TypeORM and migrations;
- DB naming;
- `/api/v1`;
- request IDs and common errors;
- health and DB check;
- Zod/Nest/Swagger;
- seed infrastructure;
- contracts-build ADR.

Done when:

- invalid env fails clearly;
- migrations run/revert;
- synchronize disabled;
- health validates and reflects DB;
- Swagger has complete sample schemas;
- request IDs in headers/errors;
- no auth or Notes.

Verify:

```bash
pnpm db:start
pnpm db:migrate
pnpm db:migrate:revert
pnpm db:migrate
pnpm build
pnpm typecheck
```

Inspect `/docs` and `/api/v1/health`. Stop.

## Stage 4 — Client platform foundation

Scope:

- route groups and shells;
- responsive tabs/rail/sidebar;
- breakpoints;
- placeholders;
- i18n and persisted language;
- runtime validation;
- base Axios;
- logger;
- diagnostics foundation;
- stable React Native Paper integration;
- application-owned light and dark Material Design 3 themes and semantic design tokens;
- persisted `system`, `light`, and `dark` appearance preference with `system` as the default;
- used Nestra components composed from Paper primitives.

Done when:

- web port 8081;
- navigation changes by breakpoint;
- language switches and persists;
- fallback English;
- runtime validation works;
- direct console only in logger;
- localized placeholders;
- Paper, navigation, status bar, and native system UI use the same resolved appearance;
- system appearance changes are followed in `system` mode and manual selection persists;
- existing client screens and used primitives render correctly in both light and dark themes;
- no auth or Notes business logic.

Verify:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
pnpm dev:web
```

Resize through all breakpoints. Verify default system appearance, live system changes, persisted
manual light and dark selection, and readable contrast on Web and at least one native target. Stop.

## Stage 5 — Authentication backend

Scope:

- User and RefreshSession;
- migrations;
- Argon2id;
- email normalization;
- JWT access;
- opaque refresh rotation;
- all auth endpoints and guard;
- Swagger;
- auth ADR.

Done when:

- register auto-authenticates;
- login errors generic;
- refresh rotates atomically and old token fails;
- fixed expiry;
- logout idempotent;
- me protected;
- no plaintext secret storage;
- no device name;
- complete Swagger.

Verify:

```bash
pnpm db:migrate
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
```

Exercise endpoints manually through Swagger or HTTP client. Stop.

## Stage 6 — Authentication client

Scope:

- register/login UI;
- confirmation;
- token storage;
- Axios auth and single refresh promise;
- restoration and initialization;
- route protection;
- logout and Account settings.

Done when:

- register/login navigate to notes;
- valid session restores without flash;
- concurrent 401s cause one refresh;
- failed refresh clears state;
- logout clears even offline;
- localized auth errors;
- no token logging.

Verify:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
```

Verify on web and at least one native target. Stop.

## Stage 7 — Notes backend

Scope:

- Note and migration;
- Notes module and endpoints;
- ownership;
- archive filter and sorting;
- archive unpins;
- hard delete;
- contracts and Swagger.

Done when:

- active/archived queries work;
- title/content rules work;
- unknown fields rejected;
- PATCH requires field;
- archive unpins;
- archived cannot pin;
- hard delete;
- foreign user gets NOTE_NOT_FOUND;
- UTC ISO dates;
- no pagination.

Verify:

```bash
pnpm db:migrate
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
```

Exercise with two users. Stop.

## Stage 8 — Notes client and autosave

Scope:

- lists and editors;
- all note actions;
- TanStack Query;
- 800 ms server autosave;
- 150 ms local drafts;
- save serialization;
- stale protection;
- draft recovery and statuses;
- refetch behavior.

Done when:

- actions work;
- requests debounced;
- unchanged input not sent;
- draft protects input;
- leave/background flushes;
- failure retains draft;
- stale response cannot overwrite;
- new note route replaced after POST;
- no general offline queue/WebSocket.

Verify:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
```

Manually test rapid typing, leaving, API failure, retry, background, recovery. Stop.

## Stage 9 — Settings, changelog, logging, and diagnostics

Scope:

- complete Settings;
- language;
- account/logout;
- in-app 0.1.0 notes;
- changelog screen;
- diagnostics and health;
- final logger review;
- version display;
- placeholders.

Done when:

- language directly on Settings;
- no language route;
- logout available;
- release notes prepared;
- diagnostics visibility works;
- health on open/manual refresh;
- no token/note content leaks;
- UI and API version consistent;
- no raw log viewer.

Verify:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
```

Inspect all screens and logs. Stop.

## Stage 10 — CI, release automation, documentation, and 0.1.0 readiness

Scope:

- CI;
- Release Please;
- bootstrap verification;
- release ADR;
- complete README/troubleshooting/roadmap;
- dependency, naming, security, and stage review;
- final builds and release notes.

Done when:

- CI performs install/format/lint/typecheck/build;
- Actions pinned;
- Release Please will automatically create `v0.1.0`;
- bootstrap verified non-destructively;
- root version is source;
- README supports fresh setup;
- all prior stages complete;
- no tests/Tauri/license;
- global readiness passes.

Verify:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
```

Review workflows. Do not create a local tag. Stop.

---

## 35. Global `0.1.0` readiness

The release PR is ready only after all ten stages are checked.

Required:

- repository preserved;
- pnpm monorepo;
- Docker Postgres and migrations;
- web and Android work;
- iOS requirements accurate;
- API, auth, rotation, Notes, autosave, drafts;
- English/Polish;
- responsive navigation;
- Settings, changelog, diagnostics;
- safe logging;
- complete Swagger;
- health;
- format/lint/typecheck/build;
- CI;
- Release Please targeting `v0.1.0`;
- complete README;
- no automated tests;
- no Tauri;
- no license.

---

## 36. Post-0.1.0 roadmap

```text
0.1.1 — Unit testing foundation
- install and configure Jest
- backend service tests
- critical domain tests
- evaluate useful frontend unit-test scope
- add React Native Testing Library only if justified

Dedicated E2E strategy spike
- define critical journeys
- evaluate API, web, Android, and iOS tools
- decide one or multiple tools
- write ADR before installing a framework

0.1.2 — E2E foundation
- implement approved strategy
- cover auth and critical Notes flows

0.1.3 — UI/UX refinement
- visual direction and Nestra branding
- refine the established React Native Paper-based design system
- responsive refinement
- accessibility review

0.1.4 — Observability
- evaluate and add Sentry
- release association
- privacy and data scrubbing

0.2.0 — Shopping lists and templates

Security-hardening milestone
- Helmet
- rate limiting and brute-force protection
- refresh replay detection
- CSP
- body limits
- dependency scanning
- production web auth
- session management

Licensing spike
- compare licenses
- decide open-source intent
- add a license only after explicit decision

0.3.0 — Persistent reminders
0.4.0 — Ambient sound mixer and sound-license review
0.5.0 — WebSockets and offline synchronization
0.6.0 — Tauri, desktop builds, release assets, updater, signing

Before store distribution
- review bundle identifiers
- EAS Build
- native build-number automation
- privacy policy and store metadata

1.0.0 — first stable public release
```

---

## 37. Final Codex instructions

Every run:

1. stay in the existing root;
2. never run `git init`;
3. read the tracker;
4. execute exactly one stage;
5. use pnpm only;
6. use strict TypeScript and no `any`;
7. check current stable compatibility;
8. implement working code;
9. run stage verification;
10. update tracker honestly;
11. do not mark blocked work complete;
12. do not commit/tag/push/open PRs without permission;
13. stop after reporting the stage.

If current package APIs differ, use supported APIs while preserving this architecture and document the difference.

Stage report must include:

- checklist items;
- files changed;
- dependencies;
- ADRs;
- commands;
- verification results;
- manual checks;
- blockers;
- remaining stages;
- suggested next-stage prompt.

Never claim a check passed unless it was executed.
