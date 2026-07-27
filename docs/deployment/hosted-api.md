# Hosted NestJS API (Render + Neon)

This document covers the operator checklist for the free-tier demonstration environment.
Architecture decisions live in
[ADR 005](../decisions/005-desktop-and-hosted-service-architecture.md). Issue #47 splits work between
repository changes (agent) and provider-console steps (operator).

## Topology

- NestJS container on a Render Free Web Service in Frankfurt
- Neon Free PostgreSQL in a compatible European region
- Provider-assigned HTTPS URL (no custom domain in `0.1.0`)
- Free-tier spin-down after idle traffic with an accepted short cold start

## Production container

Build from the repository root:

```bash
pnpm docker:api:build
```

Equivalent Docker command:

```bash
docker build -f infrastructure/Dockerfile.api -t nestra-api:local .
```

The image:

- uses Node `24.18.0` and pnpm `11.13.1`
- builds `@nestra/contracts` and `@nestra/api`
- runs as a non-root user
- starts with `node dist/main.js`
- listens on `API_HOST` (default `0.0.0.0` in the image) and `API_PORT`, falling back to the
  platform `PORT` when `API_PORT` is unset
- exposes health at `GET /api/v1/health`

Local smoke run (requires a reachable database and valid secrets; never commit real values):

```bash
docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  -e API_HOST=0.0.0.0 \
  -e API_PORT=3000 \
  -e DATABASE_URL=postgresql://nestra:nestra_dev_password@host.docker.internal:5432/nestra \
  -e JWT_ACCESS_SECRET=<at-least-32-random-characters> \
  -e JWT_ACCESS_EXPIRES_IN=15m \
  -e REFRESH_SESSION_EXPIRES_IN=30d \
  -e CORS_ALLOWED_ORIGINS=http://localhost:8081 \
  nestra-api:local
```

On Linux, replace `host.docker.internal` with the host gateway address Docker provides for your
setup, or run against a Neon pooled URL during operator verification.

## Required environment variables

Set these only in the Render and Neon dashboards. Do not commit them, paste them into GitHub
issues, or share them in chat.

| Variable                     | Secret? | Notes                                                              |
| ---------------------------- | ------- | ------------------------------------------------------------------ |
| `NODE_ENV`                   | no      | Must be `production`                                               |
| `API_HOST`                   | no      | `0.0.0.0`                                                          |
| `API_PORT`                   | no      | Match the Render service port, or omit and rely on platform `PORT` |
| `DATABASE_URL`               | yes     | Neon **pooled** connection string with TLS (`sslmode=require`)     |
| `JWT_ACCESS_SECRET`          | yes     | At least 32 characters; never the example placeholder              |
| `JWT_ACCESS_EXPIRES_IN`      | no      | Example: `15m`                                                     |
| `REFRESH_SESSION_EXPIRES_IN` | no      | Example: `30d`                                                     |
| `CORS_ALLOWED_ORIGINS`       | no      | Comma-separated absolute origins for browser clients               |

Example Neon pooled URL shape (placeholders only):

```text
postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/neondb?sslmode=require
```

The API uses the standard `pg` driver through TypeORM and honors TLS settings from the URL. Do not
add Neon or Render SDKs into domain or application code. Production never enables TypeORM
`synchronize`.

## CORS for the next desktop task

Configure an explicit allow-list now so #41 / #42 can add Tauri origins without changing server
code. Until desktop exists, include the Expo web origin used for manual checks, for example
`http://localhost:8081`. Native mobile clients are not browser CORS clients.

## Controlled migrations

Migrations are a separate deployment step. They never run automatically on container start.

From a trusted local machine with a private `apps/api/.env` pointing at Neon (**direct** URL, not
the pooler) and the same production JWT/CORS values required by `parseApiEnvironment`:

```bash
pnpm db:migrate
```

Rules:

- Use committed TypeORM migrations only.
- Never enable schema synchronization.
- Never run `pnpm db:seed` against production (`NODE_ENV=production` refuses seed).
- Do not paste `DATABASE_URL` into issues, pull requests, or durable chat logs.

Revert only with an intentional operator decision:

```bash
pnpm db:migrate:revert
```

## Operator checklist (Part B)

Complete these after the repository production configuration is on `main` or the task branch you
deploy from:

1. Create a Neon Free project in a compatible European region (already done when following the
   operator guide).
2. Keep the Neon **pooled** TLS connection string for Render and the **direct** string for local
   migrations. Do not commit either value.
3. Generate a strong `JWT_ACCESS_SECRET` (32+ random characters).
4. In [Render](https://dashboard.render.com), create a **Free Web Service** in **Frankfurt**.
5. Connect the GitHub repository and build with Docker using Dockerfile path
   `infrastructure/Dockerfile.api`.
6. Set the environment variables from the table above in the Render dashboard.
7. Deploy and note the provider-assigned HTTPS base URL, for example
   `https://<service>.onrender.com/api/v1`.
8. Run `pnpm db:migrate` locally against Neon with the private **direct** credentials.
9. Confirm `GET https://<host>/api/v1/health` returns `200` with `database: "reachable"`.
10. Optionally idle until spin-down, then measure the first request latency as the cold start.

## Operator → agent handoff (Part C)

Return only non-secret values in chat or an issue comment:

- public API base URL
- confirmation that migrations applied
- confirmation that secrets exist only in provider dashboards
- optional cold-start seconds
- optional configured CORS origins

Never send `DATABASE_URL`, JWT secrets, provider tokens, or full environment dumps.

## Free-tier limitations

- Render Free may spin down after about 15 minutes without inbound traffic. The first request
  after idle pays a cold-start delay, often tens of seconds.
- Neon Free may suspend idle compute; the API health check surfaces database unavailability as
  `503 degraded`.
- Provider free tiers can change quotas, sleep behavior, and availability without notice.
- Free-tier data recovery options are limited. Treat the demonstration database as disposable
  unless you maintain your own logical backups outside this document’s scope.
- There is no production SLA for the family/demo phase.
- Do not use Render’s free managed Postgres for this milestone; Neon remains the database host.

Record the measured cold start in the issue handoff or a follow-up documentation update after the
first hosted verification. Until measured, treat “tens of seconds after idle” as the expected
demonstration range.

## Upgrade path to always-on

Moving to a paid always-on Render instance, Google Cloud Run, another container host, or another
managed PostgreSQL provider should require only:

- configuration and secret changes in the hosting dashboard
- the same container image and committed migrations
- an updated client API base URL if the hostname changes and no custom domain is used

No business-logic, public REST contract, or client feature-module changes are required for that
upgrade.

## Troubleshooting

| Symptom                                               | Likely cause                                    | Action                                                               |
| ----------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------- |
| Container exits at boot mentioning environment fields | Missing or invalid env vars                     | Compare Render env to the table above; logs include field names only |
| Health `503 degraded`                                 | Database unreachable, wrong URL, or Neon asleep | Verify pooled URL, TLS, and Neon project status                      |
| CORS browser errors                                   | Origin not listed                               | Add the exact browser origin to `CORS_ALLOWED_ORIGINS`               |
| Long first response                                   | Cold start after free-tier spin-down            | Expected on free tier; measure and document                          |
| Migration CLI fails env validation                    | Local `.env` incomplete                         | Provide the full API env set, not only `DATABASE_URL`                |

## Local development unchanged

Local PostgreSQL remains `pnpm db:start` with `infrastructure/docker-compose.yml`. Hosted Neon is
optional for operators and must not replace the default local workflow.
