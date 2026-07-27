# Hosted NestJS API (Koyeb + Neon)

This document covers the operator checklist for the free-tier demonstration environment.
Architecture decisions live in
[ADR 005](../decisions/005-desktop-and-hosted-service-architecture.md). Issue #47 splits work
between repository changes (agent) and provider-console steps (operator).

## Topology

- NestJS container on a Koyeb Free Web Service in Frankfurt
- Neon Free PostgreSQL in a compatible European region
- Provider-assigned HTTPS URL (no custom domain in `0.1.0`)
- Scale-to-zero with an accepted short first-request cold start

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

Set these only in the Koyeb (and Neon) dashboards. Do not commit them, paste them into GitHub
issues, or share them in chat.

| Variable                     | Secret? | Notes                                                             |
| ---------------------------- | ------- | ----------------------------------------------------------------- |
| `NODE_ENV`                   | no      | Must be `production`                                              |
| `API_HOST`                   | no      | `0.0.0.0`                                                         |
| `API_PORT`                   | no      | Match the Koyeb exposed port, or omit and rely on platform `PORT` |
| `DATABASE_URL`               | yes     | Neon **pooled** connection string with TLS (`sslmode=require`)    |
| `JWT_ACCESS_SECRET`          | yes     | At least 32 characters; never the example placeholder             |
| `JWT_ACCESS_EXPIRES_IN`      | no      | Example: `15m`                                                    |
| `REFRESH_SESSION_EXPIRES_IN` | no      | Example: `30d`                                                    |
| `CORS_ALLOWED_ORIGINS`       | no      | Comma-separated absolute origins for browser clients              |

Example Neon pooled URL shape (placeholders only):

```text
postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/neondb?sslmode=require
```

The API uses the standard `pg` driver through TypeORM and honors TLS settings from the URL. Do not
add Neon or Koyeb SDKs to application code. Production never enables TypeORM `synchronize`.

## CORS for the next desktop task

Configure an explicit allow-list now so #41 / #42 can add Tauri origins without changing server
code. Until desktop exists, include the Expo web origin used for manual checks, for example
`http://localhost:8081`. Native mobile clients are not browser CORS clients.

## Controlled migrations

Migrations are a separate deployment step. They never run automatically on container start.

From a trusted local machine with a private `apps/api/.env` pointing at Neon (pooled URL) and the
same production JWT/CORS values required by `parseApiEnvironment`:

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

1. Create a Neon Free project in a compatible European region.
2. Copy the Neon pooled TLS connection string into a private local note or password manager.
3. Generate a strong `JWT_ACCESS_SECRET` (32+ random characters).
4. In Koyeb, create a Free Web Service in Frankfurt.
5. Build from GitHub using the Dockerfile builder and path `infrastructure/Dockerfile.api`.
6. Expose HTTP on the listen port (commonly `3000`) and set health checks to `/api/v1/health`.
7. Set the environment variables from the table above in the Koyeb dashboard.
8. Deploy and note the provider-assigned HTTPS base URL, for example
   `https://<service>-<id>.koyeb.app/api/v1`.
9. Run `pnpm db:migrate` locally against Neon with private credentials.
10. Confirm `GET https://<host>/api/v1/health` returns `200` with `database: "reachable"`.
11. Optionally idle until scale-to-zero, then measure the first request latency as the cold start.

## Operator → agent handoff (Part C)

Return only non-secret values in chat or an issue comment:

- public API base URL
- confirmation that migrations applied
- confirmation that secrets exist only in provider dashboards
- optional cold-start seconds
- optional configured CORS origins

Never send `DATABASE_URL`, JWT secrets, provider tokens, or full environment dumps.

## Free-tier limitations

- Koyeb Free may scale to zero. The first request after idle pays a cold-start delay.
- Neon Free may suspend idle compute; the API health check surfaces database unavailability as
  `503 degraded`.
- Provider free tiers can change quotas, sleep behavior, and availability without notice.
- Free-tier data recovery options are limited. Treat the demonstration database as disposable
  unless you maintain your own logical backups outside this document’s scope.
- There is no production SLA for the family/demo phase.

Record the measured cold start in the issue handoff or a follow-up documentation update after the
first hosted verification. Until measured, treat “a few seconds to tens of seconds” as the expected
demonstration range.

## Upgrade path to always-on

Moving to a paid always-on Koyeb instance, another container host, or another managed PostgreSQL
provider should require only:

- configuration and secret changes in the hosting dashboard
- the same container image and committed migrations
- an updated client API base URL if the hostname changes and no custom domain is used

No business-logic, public REST contract, or client feature-module changes are required for that
upgrade.

## Troubleshooting

| Symptom                                               | Likely cause                                    | Action                                                              |
| ----------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| Container exits at boot mentioning environment fields | Missing or invalid env vars                     | Compare Koyeb env to the table above; logs include field names only |
| Health `503 degraded`                                 | Database unreachable, wrong URL, or Neon asleep | Verify pooled URL, TLS, and Neon project status                     |
| CORS browser errors                                   | Origin not listed                               | Add the exact browser origin to `CORS_ALLOWED_ORIGINS`              |
| Long first response                                   | Cold start after scale-to-zero                  | Expected on free tier; measure and document                         |
| Migration CLI fails env validation                    | Local `.env` incomplete                         | Provide the full API env set, not only `DATABASE_URL`               |

## Local development unchanged

Local PostgreSQL remains `pnpm db:start` with `infrastructure/docker-compose.yml`. Hosted Neon is
optional for operators and must not replace the default local workflow.
