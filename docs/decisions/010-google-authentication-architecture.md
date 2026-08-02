# 010 — Google authentication architecture

## Status

Accepted

## Context

Nestra needs Sign in with Google on Expo Web, Android, iOS, and the packaged Windows Tauri
application. Password authentication must remain available. Google proves the user's external
identity, while Nestra remains responsible for application sessions through the access JWT and
rotating opaque refresh-token strategy established by [ADR 003](./003-authentication-token-strategy.md).

The shared client cannot safely contain a Google client secret. Provider authorization must use the
system browser rather than an embedded WebView, and the hosted API must receive the provider
callback. Returning from that browser to four different runtimes introduces a second security
boundary: a value carried by a deep link can be observed or intercepted and therefore must not be a
Nestra session or be sufficient on its own to create one.

The design follows Google's OpenID Connect authorization-code flow, OAuth 2.0 Security Best Current
Practice (RFC 9700), OAuth 2.0 for Native Apps (RFC 8252), and the existing client storage and Tauri
runtime decisions in [ADR 005](./005-desktop-and-hosted-service-architecture.md) and
[ADR 006](./006-desktop-auth-storage-and-runtime-hardening.md).

## Decision

### Authority and protocol

The NestJS API is one confidential Google OpenID Connect client. Expo and Tauri are Nestra clients,
not separate Google OAuth clients. The API owns the Google client ID and secret, builds the
authorization request, receives the callback, exchanges the provider code, validates the ID token,
and discards every provider token after that request.

Every Google authorization request uses:

- authorization code response type;
- `response_mode=form_post`, so Google authorization codes and state are submitted in the HTTPS
  request body instead of appearing in a callback URL;
- PKCE with a transaction-specific verifier and `S256` challenge, in addition to confidential
  client authentication;
- transaction-specific, cryptographically random state and OIDC nonce values;
- exactly `openid email profile` scopes;
- `prompt=select_account` without forced repeated consent;
- online access only, without a Google refresh token, incremental scopes, or additional Google API
  permissions;
- the system browser and Google account selection UI, never an embedded WebView.

The API validates the callback issuer parameter before the token exchange. It then validates the ID
token signature through Google's rotating keys, issuer, exact audience and authorized party where
applicable, expiry, issued-at time, nonce, subject, email, and `email_verified=true`. Production does
not use Google's debugging `tokeninfo` endpoint. Google `sub`, together with the provider name, is
the only external account key. Email is an attribute and is never accepted as proof that two
accounts are the same.

The Google access token, ID token, authorization code, and any refresh token unexpectedly returned
by Google exist only in request-local memory. They are never persisted, returned to a Nestra
client, placed in a URL, or logged. The validated name and picture claims are not persisted because
the current product model does not use them.

### Two protected protocol legs

The flow has two separately protected legs:

1. Google to the API is protected by exact Google callback registration, state, server-side PKCE,
   nonce, issuer checks, and confidential client authentication.
2. The API to the initiating Nestra client is protected by a short-lived, single-use opaque
   handoff code and a separate client-generated handoff verifier. The code alone cannot create a
   session or link an identity.

Before starting, the client generates at least 32 cryptographically secure random bytes and stores
the base64url handoff verifier in platform-appropriate pending-auth storage. It sends only
`BASE64URL(SHA256(ASCII(verifier)))` as the handoff challenge. The API returns a non-secret
transaction ID and the Google authorization URL. The client must persist the verifier before
opening the browser.

After a valid Google callback, the API creates an opaque handoff code:

```text
<externalAuthTransactionId>.<randomSecret>
```

The random secret contains at least 32 cryptographically secure bytes encoded as base64url. Only a
SHA-256 hash of the complete handoff code is stored. The API redirects to a configured platform
return URI with that handoff code and no provider response fields. The client rejects a transaction
ID that does not match its pending flow, removes the handoff value from browser history where
applicable, and submits the code together with the verifier over HTTPS.

The exchange locks the transaction row, verifies the code hash and verifier challenge in constant
time, and validates intent, platform, user binding, state, and expiry. Consuming the handoff,
provisioning or linking, and creating a refresh session where applicable are one database
transaction. A persistence failure rolls back consumption so the client can retry before expiry; a
concurrent or repeated successful exchange cannot create a second result.

### Endpoints and contracts

Google authentication extends the existing `/api/v1/auth` controller with these endpoints:

```text
POST /api/v1/auth/google/sign-in/start
POST /api/v1/auth/google/link/start
POST /api/v1/auth/google/callback
POST /api/v1/auth/google/sign-in/exchange
POST /api/v1/auth/google/link/exchange
```

`google/callback` accepts only Google's form-encoded authorization response. The other endpoints
accept and return strict shared Zod contracts.

```ts
type GoogleAuthPlatform = 'web' | 'android' | 'ios' | 'desktop';

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
  provider: 'google';
  email: string;
  linkedAt: string;
};
```

The link start and exchange endpoints require a valid Nestra access token. Link start additionally
requires the current password and performs a constant-time password verification before a
transaction is created. The link exchange access-token subject must equal the user bound to the
transaction. Accounts without a password cannot start this Google-link operation; adding another
step-up method is deferred until another real linking use case exists.

`google/sign-in/exchange` returns the unchanged `AuthenticationSessionResponse`. It creates the
same refresh-session entity, JWT claims, expiry, and rotation behavior as password login. The
client passes that response to the existing `completeAuthentication` path and persists only the
Nestra access and refresh tokens through `AuthTokenStorage`.

`google/link/exchange` returns `ExternalIdentityResponse` and does not create or rotate a Nestra
session. A successful link leaves the user's canonical Nestra email and password unchanged.

The shared error code union adds:

```text
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
```

Externally visible messages remain safe. In particular, identity conflicts do not identify the
other Nestra user. Invalid, forged, and unknown state values return a generic callback page and are
never redirected to a client-controlled location.

### Browser and platform sequences

#### New or returning sign-in

1. The unauthenticated client generates and securely stores the pending verifier.
2. It calls `google/sign-in/start` with the platform and challenge.
3. The API creates a pending transaction and returns its ID, expiry, and authorization URL.
4. The platform adapter opens the URL in the system browser.
5. Google submits the authorization response to `google/callback` using HTTPS form POST.
6. The API atomically claims the state, exchanges the provider code using its encrypted PKCE
   verifier and client secret, validates the ID token and nonce, discards provider tokens, and
   stores only encrypted minimal validated claims for the exchange phase.
7. The API creates a handoff code and responds `303 See Other` to the transaction's exact configured
   platform return URI.
8. The client receives the return in the existing app or at cold start and exchanges the code plus
   verifier.
9. The API atomically resolves the account and creates the normal Nestra session. The client stores
   that session through the existing auth abstraction and clears pending-auth state.

If `(google, sub)` already exists, its user is signed in without consulting the Google email. If it
does not exist and no Nestra user has the normalized email, the API creates an external-only user,
its Google identity, and its refresh session in one database transaction. If the email already
belongs to a Nestra user, the exchange returns `AUTH_ACCOUNT_LINK_REQUIRED`; it never silently
merges or signs into that account. A returning identity may update its `provider_email` snapshot to
the latest normalized verified claim, but it never changes the user's canonical Nestra email.

#### Explicit linking

1. A password-capable authenticated user chooses to link Google and confirms the current password.
2. The client creates the pending verifier and calls `google/link/start` with its access token,
   password, platform, and challenge.
3. The API verifies the access token and password, binds the transaction to that user, and starts
   the same browser and provider flow.
4. The callback validates Google but does not change either account.
5. The authenticated client calls `google/link/exchange` with its access token, handoff code, and
   verifier.
6. Inside one locked database transaction, the API verifies that the Google subject is unlinked,
   the user has no Google identity, and the normalized verified Google email equals the user's
   canonical email. It then creates the identity.

Linking a different Google email is deliberately rejected for the first implementation. Supporting
that case requires a dedicated account-management UX that makes the resulting sign-in identity
clear. Matching email alone is never sufficient: current-password confirmation, Google
authentication, handoff proof, and the authenticated user binding are all required.

#### Cancellation and failures

A Google `access_denied` response with valid state becomes a verifier-bound handoff outcome that
the client consumes as `AUTH_GOOGLE_CANCELLED`. Other valid provider errors become
`AUTH_GOOGLE_PROVIDER_ERROR`. A browser dismissed before a callback is handled locally as
cancellation and the pending verifier is cleared. Provider validation failures produce a generic
recoverable error outcome only after state was validated.

An invalid or missing state, invalid callback method or content type, malformed provider response,
or already claimed callback never redirects. The API renders a static localized-independent safe
page with no third-party resources or submitted values. Callback and redirect responses use
`Cache-Control: no-store` and `Referrer-Policy: no-referrer`; the static error page uses a restrictive
Content Security Policy.

The API does not hold a database transaction open during Google's network token exchange. It first
claims a pending provider transaction with a short processing lease. After exchange, it uses a
conditional transition to publish the verifier-bound outcome. A process failure or expired lease
never permits two outcomes: the user restarts the flow, and any later callback is either rejected or
can claim the lease only if Google still accepts the single-use provider code. Provider codes are
not persisted to make callback recovery transparent.

### Redirect ownership and platform adapters

The client never submits an arbitrary callback, `next`, or redirect URL. `platform` is a closed
contract value and the API maps it to exactly one configured return URI per deployed environment.
It stores that canonical URI on the transaction. Redirect construction never concatenates
untrusted host, path, or query input.

Google Cloud registers only the API callback URI. Production uses an exact HTTPS URI. Development
may use an exact loopback HTTP callback accepted by Google. Wildcards, prefix matching, provider
callback URIs that point directly to an installed app, and user-supplied return URLs are forbidden.

Platform behavior is isolated behind typed infrastructure boundaries rather than auth screens:

```ts
interface ExternalAuthBrowser {
  openAuthorization(authorizationUrl: string, returnUri: string): Promise<'returned' | 'cancelled'>;
}

interface ExternalAuthCallbackSource {
  getInitialHandoff(): Promise<string | null>;
  subscribe(listener: (handoffCode: string) => void): () => void;
}

interface PendingExternalAuthStorage {
  read(): Promise<PendingExternalAuth | null>;
  write(pendingAuth: PendingExternalAuth): Promise<void>;
  clear(): Promise<void>;
}
```

- Web uses Expo WebBrowser's web auth-session behavior and an exact same-origin HTTPS return page.
  The pending verifier is kept in `sessionStorage`, not the long-lived token `localStorage` area.
  The callback route immediately replaces browser history before exchange. The web host must redact
  that route's query string from access logs and apply a restrictive production Content Security
  Policy.
- Android and iOS use Expo WebBrowser and Expo Linking. Production uses verified Android App Links
  and iOS Universal Links on a stable Nestra-controlled HTTPS domain. Development builds may use a
  reverse-domain private scheme such as `com.michalrozek.nestra:/oauth/google`; Expo Go is not a
  supported OAuth verification target. Pending material uses SecureStore and covers both warm and
  cold-start callbacks.
- Windows Tauri uses the official opener, deep-link, and single-instance plugins. The system browser
  is opened through a narrow opener permission. A statically configured reverse-domain desktop
  scheme returns to the installed app; the single-instance plugin is registered first, and both
  initial command-line URLs and warm-instance events are parsed against one exact expected shape.
  Pending material uses Windows Credential Manager behind a dedicated narrow storage interface,
  never WebView `localStorage`. No deep-link URL is logged.

Verified HTTPS links reduce interception on mobile. Private schemes and Windows protocol handlers
can still be invoked or registered by another local application; the handoff verifier prevents an
intercepted handoff code from being exchanged. A fully compromised device and phishing in which a
user knowingly authenticates inside an attacker-initiated flow remain outside the trust boundary.

### Persistence and account states

`external_auth_identities` is provider-neutral persistence, while the Google protocol service and
contracts remain Google-specific until a second provider proves a shared abstraction is useful.

```text
external_auth_identities
├── id: uuid primary key
├── user_id: uuid foreign key -> users.id on delete cascade
├── provider: varchar
├── provider_subject: varchar(255)
├── provider_email: varchar(254)
├── created_at: timestamptz
└── updated_at: timestamptz
```

Required constraints and indexes:

- unique `(provider, provider_subject)` globally;
- unique `(user_id, provider)` for one identity from a provider per user;
- index `user_id` for account reads;
- `provider` initially constrained by application contracts to `google`;
- `provider_email` is not unique and is never used to select the authenticated user.

`users.password_hash` becomes nullable. Supported account states are:

- password-only: password hash, no external identity;
- hybrid: password hash and a Google identity;
- external-only: no password hash and exactly one Google identity.

A user with neither authentication method is invalid. Creation of an external-only user and its
identity is atomic. Removing the last authentication method, unlinking Google, adding a password to
an external-only account, and account email changes are not part of this epic. Password login keeps
its constant-work invalid-credential behavior for a null password hash.

`external_auth_transactions` stores short-lived protocol state needed across API restarts and
hosted cold starts:

```text
external_auth_transactions
├── id: uuid primary key
├── provider: varchar
├── intent: varchar
├── platform: varchar
├── user_id: uuid nullable foreign key -> users.id on delete cascade
├── return_uri: varchar
├── state_hash: char(64) unique
├── request_secrets_ciphertext: text nullable
├── handoff_challenge: char(43)
├── handoff_code_hash: char(64) nullable unique
├── validated_claims_ciphertext: text nullable
├── status: varchar
├── processing_lease_expires_at: timestamptz nullable
├── outcome_error_code: varchar nullable
├── provider_expires_at: timestamptz
├── handoff_expires_at: timestamptz nullable
├── consumed_at: timestamptz nullable
├── created_at: timestamptz
└── updated_at: timestamptz
```

The encrypted request payload contains only the provider PKCE verifier and nonce. After callback,
it is erased and replaced by encrypted minimal validated claims (`sub`, normalized email, and the
verified-email flag). AES-256-GCM uses a random 96-bit IV and authenticated context containing the
transaction ID, provider, and intent. The encryption key is separate from the JWT and Google client
secrets. Claims and secrets are nulled atomically on consumption. Correctness never depends on
eventual deletion: every read checks status and expiry. A small idempotent API maintenance service
scrubs expired active rows and deletes terminal rows after 24 hours; expiry columns are indexed.

Provider authorization has a maximum age of 10 minutes. A handoff has two minutes from a successful
callback. A short `processing_lease_expires_at` protects the callback's provider-network phase
without keeping a database transaction open. State, provider code, handoff code, and exchange are
each single-use. Starting a new client flow replaces that client's pending verifier but does not
make an older server transaction valid; it expires normally. Callback and exchange state
transitions use conditional updates or row locks.

### Configuration and secret ownership

The API validates these values at startup and fails closed when Google authentication is enabled
but incomplete:

```text
GOOGLE_OAUTH_ENABLED
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_CALLBACK_URI
GOOGLE_OAUTH_TRANSACTION_ENCRYPTION_KEY
GOOGLE_OAUTH_WEB_RETURN_URI
GOOGLE_OAUTH_ANDROID_RETURN_URI
GOOGLE_OAUTH_IOS_RETURN_URI
GOOGLE_OAUTH_DESKTOP_RETURN_URI
```

The encryption key is exactly 32 random bytes encoded as base64. Callback and all production return
URIs use HTTPS except the statically registered Windows protocol handler and explicitly documented
development private schemes or loopback addresses. Canonical URI validation rejects fragments,
credentials, unexpected query parameters, and non-exact origins or paths.

Changing the transaction encryption key or Google client credentials intentionally invalidates
in-flight flows. Operators rotate them by first allowing the 10-minute provider window to drain or
accepting a safe retry; old and new long-lived key support is unnecessary because no authentication
transaction may outlive that window.

The client has only `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED`, used to hide the action when the matching API
deployment is not ready. It receives no Google client secret, transaction encryption key, or
provider token. Google credentials and the encryption key live in local ignored API environment
files or managed deployment secrets. The Google Cloud configuration and production return-domain
associations are operator-owned deployment configuration, not committed secrets.

### Logs, metrics, and redaction

Safe structured authentication events may contain:

- operation name;
- provider (`google`), intent, and platform;
- transaction ID, request ID, safe error code, outcome, and duration in milliseconds;
- user ID only after it is already authenticated or resolved.

Logs, errors, diagnostics, traces, metrics labels, and analytics must never contain:

- Google authorization URLs or callback form bodies;
- callback or deep-link URLs, query strings, state, nonce, PKCE values, handoff values, or client
  secrets;
- Google codes, access tokens, refresh tokens, ID tokens, token responses, or decoded full claims;
- email, Google subject, profile name or picture, Nestra access/refresh tokens, authorization
  headers, or complete request/response objects.

Required low-cardinality metrics are counters for start, valid callback, cancellation, provider
failure, exchange success, exchange rejection by safe reason, provisioning, linking, replay, and
expiry, plus duration histograms for provider and exchange phases. Provider subject, email, user
ID, transaction ID, and request ID are never metric labels.

The Google API callback and the Web handoff return route must be excluded from raw URL/query access
logs at the NestJS, static-host, and hosting-proxy layers. Form bodies are never logged. Client
logging records only operation, platform, safe outcome, and duration.

### Threat model

| Threat                                               | Required control                                                                                                                                                                     | Residual risk                                                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Forged or injected provider callback                 | Exact callback registration, form POST, random hashed state, conditional single-use state transition, PKCE S256, nonce, issuer and ID-token validation                               | A compromised Google account is a valid Google identity                                                     |
| Login CSRF or account confusion                      | State and nonce, client-bound handoff verifier, explicit account selection, transaction intent and platform binding                                                                  | A user can still approve a deliberately attacker-initiated phishing flow                                    |
| Silent email-based account takeover                  | Authenticate only by `(provider, sub)`; email collision returns link-required; linking requires access token, password, Google proof, same normalized email, and user-bound exchange | Alternate-email linking is unavailable until a stronger account-management flow exists                      |
| Provider token leakage                               | `form_post`, server-only token exchange, no provider persistence, immediate discard, no URL/body/token logging, no UserInfo call                                                     | Request-local process memory contains tokens briefly                                                        |
| Nestra token leakage through callback or deep link   | Callback creates no session; return carries only a verifier-bound opaque handoff; session is returned only by HTTPS POST exchange                                                    | A fully compromised client can access its own resulting session                                             |
| Open redirect                                        | Closed platform enum, server-owned exact URI mapping, canonical URI validation, no `next` parameter, no redirect after invalid state                                                 | Deployment misconfiguration can break returns but must fail closed                                          |
| Deep-link interception or manual invocation          | Verified mobile HTTPS links in production, reverse-domain schemes in development/Windows, Tauri exact parsing, client transaction match, handoff verifier, short expiry and one use  | Private schemes can be intercepted for denial of service; local device compromise is out of scope           |
| Replay of state, callback, handoff, or exchange      | Conditional status transitions, row lock, hash comparisons, provider 10-minute and handoff 2-minute TTLs, atomic consumption, replay metrics                                         | An attacker can cause harmless failed requests or denial of service                                         |
| Concurrent provisioning or linking                   | Database uniqueness, user/transaction row locks, atomic user + identity + session transaction, conflict re-read only by exact provider subject                                       | Contention can return a recoverable conflict but cannot merge users                                         |
| Transaction-database disclosure                      | Hash state and handoff, encrypt PKCE/nonce and validated claims with separate managed AES-GCM key, short TTL, scrub and cleanup                                                      | Simultaneous database and encryption-key compromise exposes active transactions                             |
| XSS in browser client                                | Same-origin auth return, restrictive production-web CSP, immediate history replacement, short handoff TTL and verifier binding                                                       | Existing web `localStorage` session-token compromise remains as documented in ADR 003 and the specification |
| Provider cancellation, outage, or malformed response | Typed recoverable outcomes after valid state, generic safe page otherwise, no partial user/link changes                                                                              | The user must retry after provider or network recovery                                                      |

The trust boundary assumes TLS validation, uncompromised Google infrastructure, cryptographically
secure randomness, and an operating system that enforces its secure-storage boundary. Malware with
full user-account access, a compromised browser profile, a fully compromised device, and social
engineering outside the app are not solved by this protocol.

## Consequences

- Every platform shares one Google and Nestra session implementation while keeping browser and
  callback mechanics behind typed adapters.
- Google authentication produces the existing session response and does not add a second client
  auth state or token lifecycle.
- PKCE is used twice for different threats: once between Google and the API, and once between the
  platform return and handoff exchange.
- The API needs two short-lived persistence concepts, managed secret configuration, strict callback
  redaction, and transaction cleanup in addition to the durable external identity table.
- Google-created users require a nullable password hash. Existing password behavior stays intact,
  but password-setting and identity unlinking require later explicit product flows.
- Production mobile auth requires a stable controlled HTTPS domain for verified App/Universal
  Links. Development schemes and Windows protocol handlers remain verifier-bound fallbacks.
- A callback can complete while the initiating application is closed; SecureStore or Windows
  Credential Manager retains only the pending verifier long enough for cold-start exchange.

## Alternatives considered

- Client-side Google SDKs exchanging ID tokens directly with the API were rejected because they
  require platform-specific Google clients, duplicate protocol handling, and do not provide one
  consistent hosted callback and handoff model.
- Implicit and token response flows were rejected because they place provider tokens in browser
  URLs and conflict with current OAuth security guidance.
- Query-mode authorization responses were rejected because Google supports `form_post`, which
  keeps the authorization code and state out of callback URLs and common access logs.
- Passing a Nestra access token, refresh token, provider token, or authorization code through a
  deep link was rejected because URL handlers and browser history are not secret channels.
- A handoff code without a client verifier was rejected because another application could intercept
  and redeem it.
- Silent linking by matching normalized email was rejected because Google email is mutable and, for
  some non-Gmail accounts, Google is not authoritative for current mailbox ownership.
- Allowing arbitrary Google-email linking after only an authenticated session was rejected because
  it creates confusing duplicate account ownership. The initial flow requires current-password
  confirmation and equal normalized emails.
- Storing active Google refresh or access tokens was rejected because Nestra needs Google only for
  identity proof and calls no Google APIs on the user's behalf.
- In-memory transaction state was rejected because hosted cold starts, restarts, and multiple API
  instances would invalidate active flows.
- A broad provider framework was rejected until a second provider demonstrates concrete shared
  behavior. Durable identities are provider-neutral; protocol code remains explicit.

## References

- [Google OpenID Connect API reference](https://developers.google.com/identity/openid-connect/reference)
- [Verify the Google ID token on the server](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)
- [OAuth 2.0 Security Best Current Practice (RFC 9700)](https://www.rfc-editor.org/rfc/rfc9700.html)
- [OAuth 2.0 for Native Apps (RFC 8252)](https://www.rfc-editor.org/rfc/rfc8252.html)
- [Expo authentication guide](https://docs.expo.dev/guides/authentication/)
- [Expo linking overview](https://docs.expo.dev/linking/overview/)
- [Tauri deep-link plugin](https://v2.tauri.app/plugin/deep-linking/)
- [Tauri single-instance plugin](https://v2.tauri.app/plugin/single-instance/)
