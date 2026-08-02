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

Release `0.1.0` implements the foundation, the complete **Notes** module, a remotely hosted API and
database, and an installable Windows x64 desktop application. Shopping, Reminders, and Relax exist
only as localized placeholder screens. Ambient audio, user audio uploads, reminder scheduling, and
closed-app notifications remain future work.

---

## 2. Architecture

```text
Expo client
Android / iOS / Web
        |
        +-- Expo web build --> Tauri desktop (Windows x64)
        |                            |
        +----------------------------+
                     |
                     v HTTPS
           NestJS REST API container
            Render Free, Frankfurt
                     |
                     v TLS
          Neon Free PostgreSQL, EU
```

The Expo web build is the shared client consumed by Tauri. Tauri supplies a desktop runtime
boundary and must not introduce a second feature implementation.

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
- a Tauri desktop shell and Windows x64 installer;
- a remotely hosted NestJS container and managed PostgreSQL database;
- automated release PRs, version bumps, tags, and GitHub Releases.

Excluded from `0.1.0`:

- Next.js;
- microfrontends;
- microservices;
- WebSockets;
- general offline synchronization;
- push notifications;
- reminder scheduling;
- ambient audio;
- user-provided audio uploads;
- desktop automatic updates, purchased code signing, and macOS or Linux installers;
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
- Google's maintained Node authentication library for OpenID Connect token validation;
- JWT access tokens;
- opaque rotating refresh tokens;
- Argon2id.

### Desktop

- Tauri using the latest stable mutually compatible release selected during implementation;
- the Expo web output as the only desktop feature surface;
- Windows x64 as the first packaging target, distributed as one per-user NSIS setup executable
  named `Nestra_{version}_x64-setup.exe`;
- operating-system-backed or appropriately secured Tauri storage for authentication secrets;
- minimal explicit Tauri capabilities and outbound network permissions.

### Hosted services

- Render Free Web Service in Frankfurt for the NestJS container;
- Neon Free PostgreSQL in a compatible European region;
- provider-assigned HTTPS endpoints for the initial private distribution;
- no custom domain requirement for `0.1.0`;
- Cloudflare R2 as the future object-storage target for curated ambient audio, without provisioning
  or integrating it in `0.1.0`.

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
│   ├── api/
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── desktop/
│       ├── package.json
│       └── src-tauri/
│           ├── src/
│           ├── Cargo.toml
│           └── tauri.conf.json
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
@nestra/desktop
@nestra/contracts
@nestra/tsconfig
```

Do not create `@nestra/shared` in `0.1.0`.

The root and every non-published workspace package must set `"private": true`.

---

## 7. Architecture decision records

Use lightweight ADRs in `docs/decisions/`, for example:

```text
001-contracts-build-strategy.md
002-client-ui-and-theming-strategy.md
003-authentication-token-strategy.md
007-release-automation.md
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
pnpm dev:desktop

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
pnpm build:desktop
```

Requirements:

- `pnpm dev` builds contracts once, then runs contracts watch, API watch, and Expo web.
- `pnpm dev:web` uses port `8081`.
- `pnpm dev:desktop` prepares the Expo web output and launches the Tauri development runtime.
- root build order is contracts → API/client.
- `pnpm build:desktop` is a Windows packaging command that consumes a production Expo web build and
  produces the configured per-user NSIS Windows x64 installer.
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
- Tauri configuration and Windows installer metadata.

Workspace package versions are internal metadata and must not be displayed as the product version.

Native build numbers are separate:

- Android `versionCode`: incrementing integer;
- iOS `buildNumber`: incrementing build identifier.

Their automation is deferred until native build pipelines are introduced.

### Release Please

Configure Release Please independently of desktop packaging. The `0.1.0` release must not be
published until the Windows x64 installer has been built and verified.

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
- document the bootstrap in ADR 007;
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

Use curated localized typed release notes shown as a simple bullet list (no per-item change
categories in the UI):

```ts
export type ReleaseChange = {
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
GOOGLE_OAUTH_ENABLED=false
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_CALLBACK_URI=http://localhost:3000/api/v1/auth/google/callback
GOOGLE_OAUTH_TRANSACTION_ENCRYPTION_KEY=
GOOGLE_OAUTH_WEB_RETURN_URI=http://localhost:8081/auth/google/callback
GOOGLE_OAUTH_ANDROID_RETURN_URI=com.michalrozek.nestra:/oauth/google
GOOGLE_OAUTH_IOS_RETURN_URI=com.michalrozek.nestra:/oauth/google
GOOGLE_OAUTH_DESKTOP_RETURN_URI=com.michalrozek.nestra.desktop:/oauth/google
```

Client:

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
EXPO_PUBLIC_APPLICATION_ENVIRONMENT=development
EXPO_PUBLIC_SHOW_DEVELOPER_DIAGNOSTICS=true
EXPO_PUBLIC_VERBOSE_LOGGING=true
EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=false
```

Validate all values with Zod. Parse boolean strings explicitly. No refresh JWT secret exists because refresh tokens are opaque. Google OAuth configuration fails closed when enabled but incomplete. The transaction encryption key is exactly 32 random bytes encoded as base64 and is distinct from the JWT access and Google client secrets. Production callback and mobile/web return URIs use exact HTTPS values; only documented development and Windows protocol-handler values may use another scheme.

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

### Hosted private environment

- Deploy the NestJS API as a normal container to a Render Free Web Service in Frankfurt.
- Deploy PostgreSQL to Neon Free in a compatible European region and connect with TLS using the
  provider's pooling guidance.
- Keep secrets exclusively in managed service configuration and never commit or expose them to
  the client.
- Run committed TypeORM migrations as an explicit deployment operation; never use
  `synchronize: true`.
- Configure the client with the provider-assigned HTTPS API URL and configure matching explicit
  backend CORS and Tauri network allow-lists.
- Do not require or purchase a custom domain for `0.1.0`.
- Accept a short cold start for the initial private distribution and expose the existing health endpoint for
  deployment checks.
- Keep the container, PostgreSQL schema, migrations, and public REST contract provider-neutral so
  an always-on paid service can replace the free tier without an architecture change.

The hosted environment must keep the API and database available while the developer computer is
offline. If the API host changes before a custom domain is introduced, update the configured API
base URL and distribute a new client build; feature and presentation code must not contain
provider URLs.

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
external_auth_identities
external_auth_transactions
notes
```

Use a local TypeORM naming strategy or explicit mappings. Do not add an unmaintained naming-strategy package merely to avoid small local code.

Deleting a user cascades to refresh sessions, external identities, bound external-auth transactions,
and notes even though account deletion is not yet exposed.

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
│   ├── google-auth-start.schema.ts
│   ├── google-auth-exchange.schema.ts
│   ├── google-link-start.schema.ts
│   ├── google-auth-platform.schema.ts
│   ├── external-identity.schema.ts
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
AUTH_GOOGLE_UNAVAILABLE
AUTH_GOOGLE_CANCELLED
AUTH_GOOGLE_PROVIDER_ERROR
AUTH_GOOGLE_RESPONSE_INVALID
AUTH_GOOGLE_HANDOFF_INVALID
AUTH_GOOGLE_HANDOFF_EXPIRED
AUTH_GOOGLE_HANDOFF_ALREADY_USED
AUTH_GOOGLE_EMAIL_UNVERIFIED
AUTH_GOOGLE_EMAIL_MISMATCH
AUTH_ACCOUNT_LINK_REQUIRED
AUTH_REAUTHENTICATION_FAILED
AUTH_EXTERNAL_IDENTITY_ALREADY_LINKED
AUTH_EXTERNAL_IDENTITY_CONFLICT
NOTE_NOT_FOUND
NOTE_NOT_TRASHED
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

### Google authentication

[ADR 010](../decisions/010-google-authentication-architecture.md) is the authoritative threat model
and protocol decision. The implementation must preserve the following specification.

#### Authority and provider request

Google proves external identity only. The NestJS API remains the Nestra session authority and is
the single confidential Google OpenID Connect client for Web, Android, iOS, and Windows Tauri.
Clients never contain the Google secret, exchange Google codes, validate Google tokens, or maintain
a second session model.

Use the Google authorization-code flow with:

- `response_type=code` and `response_mode=form_post`;
- transaction-specific state, PKCE S256, and OIDC nonce;
- exact scopes `openid email profile`;
- `prompt=select_account` without forcing consent again on every sign-in;
- online access only, with no Google refresh token or Google API authorization;
- Google account selection in the system browser, never an embedded WebView;
- an exact API callback registered in Google Cloud.

The callback verifies state, response issuer, and PKCE before trusting the result. The API exchanges
the code with its client secret and verifies the ID token signature, issuer, exact audience,
authorized party where applicable, expiry, issued-at time, nonce, subject, email, and
`email_verified=true`. Use Google's maintained Node authentication library and rotating keys, not
the debugging `tokeninfo` endpoint in production.

Only `(provider, sub)` identifies a returning external account. Google access tokens, refresh
tokens, ID tokens, authorization codes, full provider responses, and unused profile claims are
never persisted, returned to a client, placed in a URL, or logged. Discard provider tokens after
request-local ID-token validation. Google email is an attribute and never account-linking proof.

#### Endpoints

```text
POST /api/v1/auth/google/sign-in/start
POST /api/v1/auth/google/link/start
POST /api/v1/auth/google/callback
POST /api/v1/auth/google/sign-in/exchange
POST /api/v1/auth/google/link/exchange
```

The callback accepts only Google's form-encoded POST response. Invalid callback state never causes
a redirect. The start and exchange endpoints use strict shared Zod contracts:

```ts
type GoogleAuthPlatform = "web" | "android" | "ios" | "desktop";

type GoogleAuthStartRequest = {
  platform: GoogleAuthPlatform;
  handoffChallenge: string;
};

type GoogleLinkStartRequest = GoogleAuthStartRequest & {
  currentPassword: string;
};

type GoogleAuthStartResponse = {
  transactionId: string;
  authorizationUrl: string;
  transactionExpiresAt: string;
};

type GoogleAuthExchangeRequest = {
  handoffCode: string;
  handoffVerifier: string;
};

type ExternalIdentityResponse = {
  provider: "google";
  email: string;
  linkedAt: string;
};
```

`google/sign-in/exchange` returns the existing `AuthenticationSessionResponse` without adding
provider fields. It creates the same refresh session and access-token claims as password login.
`google/link/start` and `google/link/exchange` require a valid access token. Link start also verifies
the current password in constant time; link exchange requires that the access-token subject equals
the transaction's bound user. `google/link/exchange` returns `ExternalIdentityResponse` and does not
replace the current Nestra session.

#### One-time platform handoff

Before start, the client generates at least 32 cryptographically secure random bytes as a base64url
handoff verifier and stores it through a typed pending-auth storage adapter. It sends only:

```text
BASE64URL(SHA256(ASCII(handoffVerifier)))
```

After a valid provider callback, the API creates:

```text
<externalAuthTransactionId>.<at-least-32-random-bytes-base64url>
```

Only the SHA-256 hash of that complete handoff code is stored. The API responds with `303 See Other`
to the exact server-configured platform return URI and includes only the opaque handoff. The client
must match the transaction ID to its pending operation, remove the return URL from browser history
where applicable, and exchange the code plus verifier over HTTPS.

The exchange locks the transaction row and validates code hash, verifier challenge, intent,
platform, user binding, status, and expiry before atomically consuming it. A code without the
verifier is insufficient to create a session or link an account. The provider phase expires after
10 minutes; the handoff phase expires two minutes after the valid callback. State, provider callback,
handoff, and exchange are single-use. Replay and concurrent requests fail safely.

Cancellation with valid state is returned through the same verifier-bound handoff as
`AUTH_GOOGLE_CANCELLED`. Other valid provider errors use `AUTH_GOOGLE_PROVIDER_ERROR`. Browser
dismissal before a callback is local cancellation. Invalid state or malformed callbacks render a
static safe page with no redirect or submitted values. Callback and return responses use
`Cache-Control: no-store` and `Referrer-Policy: no-referrer`; the safe page has no third-party
resources and uses a restrictive Content Security Policy.

#### Redirect allow-list and platform adapters

The client submits a closed `platform` value, never a URL, origin, callback, or `next` parameter.
The API maps each platform to exactly one canonical return URI from validated deployment
configuration and stores it with the transaction. No wildcard, prefix, user-controlled host/path,
fragment, credentials, or unexpected query parameters are permitted.

- Web uses an exact same-origin HTTPS callback and Expo WebBrowser's web auth-session behavior.
  Pending verifier state uses `sessionStorage`, not the token `localStorage`, and the callback route
  replaces history immediately.
- Android and iOS use Expo WebBrowser and Expo Linking. Production uses verified Android App Links
  and iOS Universal Links on a stable Nestra-controlled HTTPS domain. Development builds may use a
  reverse-domain private scheme. Expo Go is not a supported OAuth verification target. Pending
  verifier state uses SecureStore and works for warm and cold starts.
- Windows Tauri uses the official opener, deep-link, and single-instance plugins. The
  single-instance plugin is registered first. The installed app has one statically configured
  reverse-domain protocol handler; initial command-line and warm-instance URLs are accepted only
  when they match the exact expected shape. Pending verifier state uses Windows Credential Manager
  behind a narrow dedicated interface, never WebView `localStorage`.

Keep these behaviors outside presentation screens behind typed `ExternalAuthBrowser`,
`ExternalAuthCallbackSource`, and `PendingExternalAuthStorage` interfaces. The existing
`AuthTokenStorage` remains unchanged and receives only Nestra sessions after exchange.

#### External identity and account states

```text
external_auth_identities
├── id: UUID
├── userId: UUID
├── provider: "google"
├── providerSubject: string (maximum 255)
├── providerEmail: normalized string (maximum 254)
├── createdAt: timestamptz
└── updatedAt: timestamptz
```

Enforce unique `(provider, provider_subject)` globally and unique `(user_id, provider)`, plus a
foreign key to `users` with cascade deletion and an index on `user_id`. `provider_email` is not
unique and is never used to select the authenticated user.

`users.password_hash` becomes nullable. Valid states are password-only, hybrid (password and
Google), and external-only (Google and no password). A user with no authentication method is
invalid. External-only user creation and identity insertion occur atomically. Unlinking Google,
removing a last auth method, setting a password on an external-only account, and account email
changes are outside this epic. Password login keeps constant-work invalid-credential behavior when
the password hash is null.

Provisioning and linking rules:

1. An existing exact `(google, sub)` identity signs in its linked user without consulting email.
2. An unlinked subject and unused normalized email creates the user, identity, refresh session, and
   response in one transaction.
3. An unlinked subject whose email already belongs to a Nestra user returns
   `AUTH_ACCOUNT_LINK_REQUIRED`; it never signs in or merges by email.
4. Explicit linking requires the authenticated user, current-password proof, Google proof, the
   client handoff verifier, and equal normalized Google and Nestra emails.
5. A subject linked to another user, a second Google identity on the same user, or a concurrent
   uniqueness conflict fails without identifying the other account.
6. Database uniqueness, transaction/user row locks, conditional state transitions, and exact
   subject re-read make provisioning and linking race-safe.

Supporting a different Google email during linking requires a future dedicated account-management
and ownership-confirmation experience. Matching email alone remains insufficient in every case.

#### Short-lived transaction persistence

`external_auth_transactions` persists active protocol state across API restarts and hosted cold
starts. It contains transaction ID, provider, intent, platform, nullable bound user ID, canonical
return URI, state hash, encrypted request secrets, handoff challenge and optional code hash,
encrypted validated minimal claims, status, safe outcome code, provider and handoff expiries,
consumed timestamp, and normal timestamps.

Store the provider PKCE verifier and nonce in an AES-256-GCM encrypted request payload with a random
96-bit IV and authenticated transaction context. After callback, erase it and store only encrypted
validated `sub`, normalized email, and verified-email state for exchange. Use a dedicated managed
32-byte key. Null encrypted material atomically on consumption. Index state hash, handoff hash, and
expiry columns. A small idempotent API maintenance service scrubs expired active rows and deletes
terminal rows after 24 hours; every operation still enforces expiry synchronously.

#### Logging and metrics

Safe auth events may contain operation, provider, intent, platform, transaction ID, request ID,
safe error code, outcome, duration in milliseconds, and user ID only after the user is authenticated
or resolved. Never log or expose authorization or callback URLs, callback bodies, deep links, query
strings, state, nonce, either PKCE value, handoff values, secrets, provider tokens/codes/responses,
decoded claim objects, email, Google subject, profile attributes, Nestra tokens, authorization
headers, or complete requests/responses.

Exclude the callback route from raw URL access logs at the API and hosting proxy layers. Required
low-cardinality metrics count starts, callbacks, cancellation, provider failure, successful and
rejected exchanges by safe reason, provisioning, linking, replay, and expiry, with duration
histograms for provider and exchange phases. Never use email, subject, user ID, transaction ID, or
request ID as metric labels.

#### Security invariants

The threat model must remain protected against forged callbacks, login CSRF and account confusion,
email-based takeover, provider or Nestra token leakage, open redirects, deep-link interception,
state/callback/handoff replay, and concurrent provisioning/linking. Verified mobile HTTPS links and
the handoff verifier reduce inter-app interception. A fully compromised device, compromised Google
account, or deliberate social-engineering approval is outside the protocol trust boundary.

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
- desktop implementation: operating-system-backed or appropriately secured Tauri storage behind
  the same abstraction.

README must warn that web localStorage is a prototype compromise and a public production web
release must evaluate `httpOnly`, `Secure`, `SameSite` cookies. The Tauri runtime must never select
the web localStorage implementation for authentication secrets.

Google authentication adds a separate typed `PendingExternalAuthStorage` for the transaction ID,
handoff verifier, platform, and expiry. Native uses SecureStore, browser Web uses `sessionStorage`,
and Tauri uses Windows Credential Manager. Pending values are cleared on success, handled
cancellation, terminal error, mismatch, or expiry. They never enter application logs or the normal
`AuthTokenStorage`; successful exchange continues through the existing session persistence path.

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
3. display an initialization screen with the shared Loader while auth is unknown;
4. without refresh token, enter unauthenticated routes immediately (no API wait);
5. with refresh token, attempt session restore with a patient per-attempt timeout sized for hosted free-tier cold starts (about 60 seconds; success proceeds as soon as the API responds);
6. auto-retry at most once more after a short pause when the failure is recoverable (no response, timeout, or HTTP 5xx);
7. enter authenticated routes only after a successful restore;
8. on non-recoverable auth failure (invalid or expired refresh token and similar), clear local tokens immediately and return to login without burning the retry budget;
9. after the restore budget is exhausted, clear local tokens and return to login through that same simple path.

Do not flash login for a valid session or create redirect loops.

Do not show a dual-action restoration-error screen (Retry next to Clear local session). Do not explain cold starts, wake-ups, or other infrastructure details in the UI. Apply the same longer auth-request timeout patience to login and equivalent auth requests so users are not immediately failed again while the API is still waking.

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
│   ├── register.tsx
│   └── google-callback.tsx
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
        ├── about.tsx
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
  compact: 320,
  medium: 768,
  expanded: 1200,
} as const;
```

`320` is the minimum supported layout width. Widths below that floor still use the compact layout, but are not a supported design target.

Behavior:

- 320–767: bottom tabs, one column;
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
├── title: string (derived)
├── document: string
├── isPinned: boolean
├── isTrashed: boolean
├── createdAt: timestamptz
└── updatedAt: timestamptz
```

Validation:

- document required on create and optional on update;
- normalize line endings to line feeds and trim leading/trailing document whitespace;
- the document must contain at least one non-whitespace logical line;
- derive `title` from the trimmed first non-empty logical line and never accept it as editable input;
- the derived title line has a maximum length of 240 characters;
- the complete document has a maximum length of 20,122 characters;
- the 20,122-character limit is the documented migration-preservation adjustment to the preferred
  20,000-character limit: an existing 120-character title, two line feeds, and an existing
  20,000-character content value must migrate without data loss;
- PATCH must contain at least one supported field;
- reject unknown fields;
- no tags, rich text, collaboration, pagination, soft delete, or `deletedAt`.

Endpoints:

```text
GET    /api/v1/notes?trashed=false
GET    /api/v1/notes?trashed=true
GET    /api/v1/notes/:noteId
POST   /api/v1/notes
PATCH  /api/v1/notes/:noteId
DELETE /api/v1/notes/:noteId
DELETE /api/v1/notes/trash
```

Server-side Trash filtering is mandatory.

Sort on the server:

1. pinned first;
2. most recently updated first within each group.

Moving a note to Trash must atomically set:

```text
isTrashed = true
isPinned = false
```

Trashed notes cannot be pinned. Restoring sets `isTrashed = false` and leaves `isPinned = false`.
Active notes cannot be permanently deleted. `DELETE /api/v1/notes/:noteId` permanently deletes only
an owned note already in Trash and otherwise returns the typed `NOTE_NOT_TRASHED` error.
`DELETE /api/v1/notes/trash` permanently deletes all and only the authenticated user's trashed
notes and returns:

```ts
type EmptyTrashResponse = {
  deletedNotesCount: number;
};
```

The count is zero when Trash is already empty. Move, restore, single permanent delete, and bulk
permanent delete operations are ownership-scoped and never accept a client-supplied user ID.

A committed migration must rename the archive persistence field to the Trash field so every
previously archived note becomes a trashed note without changing its ID, owner, title, content,
pin state, or timestamps. A later committed migration must convert each existing title and content
pair into one document, normally `title + "\n\n" + content` when content is present, while
preserving IDs, ownership, pin and Trash state, and timestamps. The title is then a derived API
projection of the stored document for list display and is never independently
editable or persisted as a second source that could drift.

Every query and mutation includes authenticated user ID. Missing and foreign-owned notes both return `NOTE_NOT_FOUND`.

---

## 24. Notes client

Support:

- active and Trash views;
- create and in-place document editing without separate read and edit modes;
- pin/unpin;
- move to Trash without confirmation;
- restore;
- permanent delete confirmation available only for trashed notes;
- confirmed Empty trash action;
- refresh;
- loading, empty, recoverable error;
- autosave status.

Use TanStack Query with centralized keys. Do not duplicate server state into a global store or fetch through `useEffect`.

The note detail is a spacious, continuous, borderless document surface with back navigation. It
has no Edit note heading and no pin, Trash, restore, or permanent-delete controls; those actions
remain on the notes list. The detail screen and document must not create competing nested scrolling
areas. The first logical line remains part of the same editable document even when title typography
is used.

Active note cards expose pin/unpin and a neutral-colored trash icon for the recoverable move
operation, but no permanent-delete action. Trashed note cards expose a non-destructive Restore
action and a red Delete permanently action. Single permanent deletion and Empty trash use modal
confirmations that state the operation cannot be undone. Empty trash is shown only when Trash
contains notes.

Reconcile active and Trash list caches after every transition. Permanently deleted note details
must be removed from the query cache, and local drafts for permanently deleted notes must be
removed so they cannot recreate or surface deleted content. Pending operations prevent duplicate
submission. Success and recoverable errors appear close to the affected control. The Trash empty
state explains that moved notes can be restored or permanently deleted.

Each note card displays only the derived title line, visually truncating it when space requires.
Cards never display subsequent document lines as a body preview.

### Autosave

Use autosave, not a Save button.

Server save:

- debounce `800 ms` after the latest valid edit;
- send only changed supported fields;
- do not send unchanged normalized values;
- serialize saves per note;
- prevent stale responses from overwriting newer input;
- keep routine autosave and local-draft persistence visually silent;
- display an accessible error only when saving fails; do not expose the implementation distinction
  between server persistence and local draft protection as `Saved` or `Saved locally`.

Local drafts:

- typed `NoteDraftStorage`;
- AsyncStorage implementation;
- draft write debounce around `150 ms`;
- never log draft content;
- clear draft after confirmed server save;
- recover a newer draft on reopening.

New note:

- starts as a local draft;
- server POST after the normalized document and its derived title line are valid;
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
- creator credit: Author: Michał Rożek / Autor: Michał Rożek;
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
- broader CSP review beyond the minimal Tauri capability and network policy;
- request body limits;
- dependency scanning;
- automated secret rotation and advanced production secret-management controls;
- cookie-based production web auth;
- account deletion and session management;
- external security review.

`0.1.0` must still include a CORS allow-list, strong JWT secret validation, managed deployment
secrets, Argon2id, rotating opaque tokens, ownership enforcement, safe errors, request IDs, safe
logging, secured desktop token storage, and minimal Tauri capabilities and network permissions.

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

The baseline quality gate builds contracts, API, and Expo web. It does not run tests that do not
yet exist, deploy services, package Tauri, run store builds or EAS, or publish an updater. Backend
deployment and Windows x64 packaging use separate dependent workflows after the baseline is
established. Pin third-party Actions to immutable reviewed SHAs.

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
18. Tauri prerequisites, secure desktop token storage, and Windows packaging;
19. hosted Render and Neon architecture, configuration, cold starts, and deployment troubleshooting;
20. limitations and roadmap;
21. license status.

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

Keep conventional names such as `id`, `email`, `content`, `isPinned`, `isTrashed`, `createdAt`.

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
- local Docker Postgres, managed Neon Postgres, and controlled migrations;
- web and Android work;
- iOS requirements accurate;
- API, auth, rotation, Notes, autosave, drafts;
- NestJS container deployed to Render and usable while the developer computer is offline;
- provider-assigned HTTPS API configuration with an accepted initial cold start;
- Tauri desktop shell with secured token storage and minimal capabilities;
- verified `Nestra_{version}_x64-setup.exe` per-user NSIS installer that launches the application
  without a development server;
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
- no ambient-audio delivery, user audio uploads, or closed-app notification implementation;
- no automatic desktop updater, purchased code signing, or macOS/Linux installers;
- no license.

---

## 32. Post-0.1.0 roadmap

Future feature work must preserve these boundaries:

- curated ambient audio is stored in Cloudflare R2 and delivered directly to the client rather
  than proxied through NestJS;
- Tauri caches downloaded audio locally for fast replay and offline use;
- the API and PostgreSQL own catalog and composition metadata, not audio blobs;
- users cannot upload recordings in the initial Relax implementation;
- notifications that work while the application is fully closed use a server-side scheduler or
  worker and a replaceable delivery-provider adapter rather than a timer in Tauri.

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

0.3.0 — Persistent reminders with server-side scheduling and closed-app delivery
0.4.0 — R2-backed ambient sound mixer, local cache, and sound-license review
0.5.0 — WebSockets and offline synchronization
0.6.0 — Desktop distribution hardening, updater, signing, and macOS/Linux evaluation

Before store distribution
- review bundle identifiers
- EAS Build
- native build-number automation
- privacy policy and store metadata

1.0.0 — first stable public release
```
