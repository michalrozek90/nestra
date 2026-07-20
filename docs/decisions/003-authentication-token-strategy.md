# 003 — Authentication token strategy

## Status

Accepted

## Context

Release `0.1.0` requires server-side authentication with Argon2id password hashing, short-lived
JWT access tokens, and opaque rotating refresh tokens. The API must validate issuer and audience
claims, store only hashed refresh tokens, rotate refresh material atomically, and keep refresh
session expiry fixed from session creation.

## Decision

Nestra uses the following authentication strategy for release `0.1.0`:

### Password hashing

- Algorithm: Argon2id through the maintained `argon2` Node package.
- Memory cost: `19,456` KiB (19 MiB).
- Time cost: `2`.
- Parallelism: `1`.

These values follow current OWASP password-storage guidance while remaining practical for local
development and the initial API deployment profile. Passwords are hashed only on the server and
never logged.

### Access tokens

- Format: signed JWT.
- Lifetime: configured through `JWT_ACCESS_EXPIRES_IN` (default `15m`).
- Secret: `JWT_ACCESS_SECRET` with a minimum length of 32 characters.
- Issuer: `nestra-api`.
- Audience: `nestra-client`.
- Payload claims: `sub` (user ID), `sessionId` (refresh session ID), `iat`, `exp`, `iss`, `aud`.
- Access tokens are not stored in the database.

### Refresh tokens

- Format: opaque `{refreshSessionId}.{randomSecret}`.
- Random secret: at least 32 cryptographically secure bytes encoded as base64url.
- Storage: SHA-256 hash of the complete refresh token in `refresh_sessions.token_hash`.
- Comparison: constant-time hash comparison.
- Rotation: every successful refresh atomically replaces the stored hash; the previous token
  fails immediately afterward.
- Expiry: fixed from session creation using `REFRESH_SESSION_EXPIRES_IN` (default `30d`); rotation
  does not extend expiry.
- Revocation: logout sets `revoked_at` when the submitted token matches an active session.

Malformed, mismatched, expired, revoked, and already-rotated refresh tokens are rejected safely.
A valid session is not revoked merely because an arbitrary mismatched token is submitted.

## Consequences

- The API can authenticate users without storing plaintext credentials or refresh tokens.
- Refresh rotation protects against token replay after a successful refresh.
- Fixed refresh expiry limits long-lived session extension through rotation.
- Argon2id hashing adds CPU and memory cost to registration and login, which is acceptable for the
  expected `0.1.0` scale.
- Advanced replay-family detection, cookie-based production web auth, and device/session
  management remain deferred to later security-hardening work.

## Alternatives considered

- bcrypt was rejected because the specification requires Argon2id.
- Storing refresh tokens in JWT form was rejected because opaque server-side sessions provide
  simpler revocation and rotation semantics for `0.1.0`.
- Extending refresh-session expiry on rotation was rejected because fixed expiry is required by the
  specification and limits indefinite session renewal through refresh alone.
