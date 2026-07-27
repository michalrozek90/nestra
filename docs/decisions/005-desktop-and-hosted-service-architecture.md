# 005 — Desktop and hosted-service architecture

## Status

Accepted

## Context

Nestra must become an installable desktop application without duplicating the existing Expo
client. The hosted API and database must remain available when the developer computer is offline.
The initial private distribution targets a limited audience, so the deployment should have no
fixed monthly cost and may accept a short cold start.

Later product milestones need curated ambient audio, saved sound compositions, and notifications
that can be delivered while the desktop application is fully closed. Those future features need
clear storage and execution boundaries now, but implementing them as part of the desktop
foundation would add speculative infrastructure.

## Decision

### Desktop runtime and release target

The Expo application remains the shared client for Android, iOS, Web, and desktop. Tauri consumes
the Expo web build and supplies the desktop runtime boundary; it does not introduce a separate
desktop user interface or duplicate feature logic.

The first desktop release target is Windows x64. The `0.1.0` release artifact is one per-user NSIS
setup executable named `Nestra_{version}_x64-setup.exe`. It installs without requiring
administrator access, launches without an Expo development server, and connects to the hosted API
over HTTPS. An MSI variant, macOS and Linux packages, automatic updates, and purchased code signing
are not part of this release target.

The root product version remains the single source for Expo, API diagnostics, Tauri configuration,
installer metadata, and release assets.

### Hosted API and database

The NestJS application runs as a normal container on a Render Free Web Service in Frankfurt.
Render receives secrets and environment-specific configuration at deployment time. The service
exposes its health endpoint and listens on the platform-provided port without embedding
Render-specific APIs in business logic.

PostgreSQL runs on Neon Free in a compatible European region. The API connects using the
provider's TLS and pooling guidance, and schema changes continue to use committed TypeORM
migrations that run as a controlled deployment step. Production never enables TypeORM schema
synchronization.

This topology keeps the API and database available independently of the developer computer. A
short first-request cold start is accepted for the initial private distribution.

### Endpoint and configuration boundary

The initial desktop build uses the provider-assigned HTTPS API endpoint. A custom domain is not
required because the endpoint is application configuration rather than user-facing navigation.
The API base URL remains owned by typed client runtime configuration and must not be duplicated in
screens or feature modules.

Moving to an always-on paid Render instance, another container host, or another managed PostgreSQL
service does not change the public API or application architecture. Without a custom domain,
changing the API host requires changing the configured base URL and distributing an updated
client build. A stable custom domain may be introduced before a broader public release if avoiding
that client configuration change becomes valuable.

Backend CORS and Tauri network permissions use explicit allow-lists derived from deployed
configuration. Their concrete values belong to deployment and runtime-hardening work rather than
presentation code.

### Authentication boundary

The existing access-token and rotating refresh-token protocol remains unchanged. Tauri stores
desktop authentication secrets through an operating-system-backed or appropriately secured
Tauri storage implementation behind the existing typed authentication-storage boundary. The
desktop runtime must not reuse the Web localStorage implementation for secrets.

### Future ambient-audio boundary

Cloudflare R2 is the selected future object store for curated ambient recordings. The client will
download audio directly from object storage or its CDN endpoint and Tauri will cache downloaded
files locally for fast replay and offline use. The NestJS API will own catalog and composition
metadata, while PostgreSQL stores small composition records such as selected sound identifiers,
volumes, and other playback settings.

The API must not proxy ordinary audio bytes. Provider-specific object-storage behavior belongs
behind a narrow storage interface. Users cannot upload their own recordings in the initial Relax
scope. R2 provisioning, audio licensing, playback, caching, and composition implementation remain
future work.

### Future notification boundary

Notifications that must work while Tauri is fully closed cannot depend on a timer inside the
desktop process. A future reminder milestone will use a server-side scheduler or worker and a
replaceable delivery-provider adapter. Scheduling, worker hosting, provider selection, and
notification implementation are outside the desktop `0.1.0` scope.

## Consequences

- Nestra gains one shared client implementation and a narrow platform-specific desktop boundary.
- The hosted environment can operate without a developer machine or a fixed monthly hosting
  cost.
- Cold starts and free-tier availability limits are accepted until usage justifies an always-on
  paid service.
- Provider migration remains a configuration and operations change rather than a business-logic
  rewrite, although changing the endpoint without a custom domain requires a client update.
- Desktop token storage, Tauri capabilities, installer packaging, deployment, and release
  automation remain separate implementation tasks with explicit dependencies.
- Ambient audio and closed-app notifications have deliberate future boundaries without adding
  unused infrastructure to `0.1.0`.

## Alternatives considered

- Running the API on the developer computer was rejected because the application must work while
  that computer is offline.
- Building a separate desktop client was rejected because it would duplicate the Expo feature
  surface and increase maintenance cost.
- Producing both NSIS and MSI installers was rejected because one familiar per-user setup
  executable is sufficient for the initial private distribution and avoids maintaining two
  release artifacts.
- Buying a custom domain immediately was rejected because provider-assigned HTTPS is sufficient
  for the initial private distribution and the endpoint is not directly navigated by users.
- Proxying ambient audio through NestJS was rejected because it would add latency, bandwidth cost,
  and unnecessary backend load.
- Storing audio files in PostgreSQL was rejected because object storage and local caching are
  better suited to large immutable media assets.
- Running notification schedules only inside Tauri was rejected because notifications would stop
  when the application is fully closed.
