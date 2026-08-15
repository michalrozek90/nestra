# Nestra privacy notice

Last updated: August 15, 2026

## Scope

This notice describes how the official Nestra clients and the hosted demonstration API process
information. Nestra is an early-stage open-source project and should not be used to store highly
sensitive information.

The data controller for the official hosted demonstration instance is Michał Rożek. Privacy and
data-removal requests can be sent to [michalrozek90@gmail.com](mailto:michalrozek90@gmail.com).
Do not include passwords, authentication tokens, or private note content in an email.

Self-hosted or modified Nestra instances are operated independently. Their operators are
responsible for describing their own data processing.

## Information processed

The official hosted service processes only the information needed to provide its current
features:

- Account information: the email address submitted during registration and a one-way password
  hash. When a user chooses Google authentication, the service stores Google's immutable account
  identifier, the verified Google email snapshot, the link to the Nestra account, and audit
  timestamps. The service does not store the plaintext password.
- User content: notes and the metadata needed to organize and synchronize them.
- Authentication information: short-lived access tokens, hashed refresh-token material, session
  identifiers, and expiry or revocation metadata. During a Google authentication attempt, the
  service temporarily stores encrypted protocol values and minimal verified identity claims, then
  erases them on consumption or expiry. Google authorization codes, access tokens, refresh tokens,
  ID tokens, complete provider responses, profile names, and profile pictures are not persisted.
  Nestra access tokens are not stored in the database.
- Operational information: request identifiers, response status, operation names, and durations
  needed to diagnose service failures. Application logging is designed not to include passwords,
  tokens, credentials, note content, or drafts.
- Network metadata: infrastructure providers may process ordinary connection information such as
  IP addresses and request timestamps under their own service policies.

## Local storage

The desktop application stores authentication secrets in the operating-system credential store.
Native mobile applications use platform-protected secure storage. The prototype web client stores
authentication state in browser `localStorage`. Local preferences and unsynchronized drafts may
also remain on the device until they are cleared by the user or application.

## Why information is processed

Information is processed to:

- create and authenticate accounts;
- prove account ownership through Google when the user chooses Google sign-in or explicit linking;
- store, retrieve, and synchronize the user's notes;
- maintain authenticated sessions;
- diagnose availability and security failures; and
- check GitHub Releases for an application update when the packaged desktop application starts or
  the user requests an update check.

Nestra does not include advertising, marketing trackers, third-party analytics, or telemetry
services.

## Service providers and transfers

The official hosted demonstration instance currently uses:

- [Render](https://render.com/) to run the API in its Frankfurt region;
- [Neon](https://neon.com/) to host PostgreSQL in a compatible European region; and
- [GitHub](https://github.com/) to host source code, releases, and desktop update metadata; and
- [Google](https://policies.google.com/privacy) to provide optional account authentication. Nestra
  requests only OpenID Connect identity, email, and basic profile scopes, uses the verified account
  identifier and email for authentication, and does not request access to Google Drive, Calendar,
  contacts, or other Google product data.

Requests to these services are subject to the providers' respective privacy and security terms.
Nestra does not sell personal information.

## Retention and removal

Account, session, and note information is retained while it is needed to operate the hosted
demonstration service. The current prototype does not yet provide self-service account deletion.
To request removal of an account and its associated hosted data, email
[michalrozek90@gmail.com](mailto:michalrozek90@gmail.com) from the account's registered email
address. Additional information may be requested only when needed to verify ownership safely.

Local information remains on the user's device until it is removed through the application,
browser, operating system, or application uninstallation. Infrastructure backups and security
records may persist for a limited period according to the applicable provider's retention rules.

## Security

The hosted client communicates with the official API over HTTPS. Passwords are hashed with
Argon2id, refresh-token material is stored as a hash, and desktop authentication secrets use the
operating-system credential store. No system can guarantee absolute security; suspected security
issues should be reported privately to
[michalrozek90@gmail.com](mailto:michalrozek90@gmail.com) without including user content or
credentials.

## Changes

Material changes to this notice will be committed to the public repository. The revision date at
the top identifies the current version.
