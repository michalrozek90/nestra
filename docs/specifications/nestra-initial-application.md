# Nestra — 0.1.0 Product and Technical Specification

**Status:** Final product and technical specification
**Target first release:** `0.1.0`
**Audience:** Nestra contributors and implementation agents
**Specification language:** English
**UI languages:** English and Polish

---

## 1. Product overview

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

## 2. Architecture

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

## 3. Technology stack

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

## 4. Dependency policy

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

## 5. Runtime pinning

Repository runtime setup must:

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

## 6. Repository structure

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
│   └── decisions/
│       └── README.md
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

## 7. Architecture decision records

Use lightweight ADRs in `docs/decisions/`, for example:

```text
001-monorepo-and-package-boundaries.md
002-contracts-build-strategy.md
003-authentication-token-strategy.md
004-release-automation.md
```

Each ADR contains status, context, decision, consequences, and alternatives.

---

## 8. Root scripts

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

## 9. Product versioning and release automation

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

Configure Release Please before the first release. Do not wait for Tauri.

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

Before release automation is considered complete:

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

## 10. Application identifiers

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

## 11. Environment files and local networking

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

## 12. API and database conventions

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

## 13. Shared contracts and professional Swagger integration

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

## 14. Error contract and request IDs

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

## 15. Health endpoint

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

## 16. Password and email rules

Use Argon2id through a maintained Node package.

- choose explicit parameters based on current OWASP guidance and runtime performance;
- record parameters in ADR 003;
- do not rely silently on defaults;
- hash only on the server;
- never log passwords.

Password:

- minimum 7 characters;
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

## 17. Authentication architecture

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

## 18. Client auth storage and Axios

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

## 19. Auth restoration and navigation

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

## 20. Responsive client foundation

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

## 21. Localization

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

## 22. Design scope

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

## 23. Notes backend

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

## 24. Notes client

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

## 25. Client logging

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

## 26. Developer diagnostics

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

## 27. Settings

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

## 28. Deferred security hardening

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

## 29. ESLint, Prettier, CI, and README

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

## 30. TypeScript, naming, and architecture rules

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

## 31. Global `0.1.0` readiness

The release PR is ready only after all tracked `0.1.0` work items are complete.

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

## 32. Post-0.1.0 roadmap

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
