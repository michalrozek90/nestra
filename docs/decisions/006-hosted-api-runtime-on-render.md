# 006 — Hosted API container runtime on Render Free

## Status

Accepted

## Context

ADR 005 selected a Koyeb Free Web Service in Frankfurt for the NestJS container so the family or
demo API could stay online without a fixed monthly hosting cost. During issue #47 operator setup,
new Koyeb accounts no longer expose Free Web Service creation after Koyeb’s transition toward
Mistral AI paid plans. The empty control panel and removed create routes blocked the documented
zero-cost path.

The portable container, Neon Free PostgreSQL, provider-assigned HTTPS, and accepted cold start
remain valid. Only the container host must change.

## Decision

Deploy the existing NestJS production container to a **Render Free Web Service** in **Frankfurt**.

- Build from the repository Dockerfile at `infrastructure/Dockerfile.api`.
- Keep PostgreSQL on Neon Free in a compatible European region.
- Keep secrets in the Render and Neon dashboards only.
- Continue to accept free-tier spin-down and a short cold start for the private demonstration.
- Do not embed Render-specific SDKs in domain or application code.
- Prefer an always-on paid Render instance or another container host later without changing the
  public API contract; without a custom domain, changing the hostname still requires a client
  configuration update.

ADR 005 remains accepted for desktop, Neon, endpoint, authentication, ambient-audio, and
notification boundaries. This ADR supersedes only the Koyeb Free container-host choice.

## Consequences

- Issue #47 can complete on a currently available free container host.
- Operator documentation and README diagrams name Render instead of Koyeb.
- Cold starts may be longer than on the previous Koyeb Free expectation (often tens of seconds
  after idle spin-down); they remain an accepted demonstration limitation.
- Moving later to Cloud Run, paid Render, or another host stays a configuration and operations
  change.

## Alternatives considered

- Paying for Koyeb Pro was rejected for the family/demo phase because it reintroduces a fixed
  monthly cost that ADR 005 intentionally avoided.
- Fly.io was rejected for new accounts because it no longer offers a lasting free allowance.
- Railway free credit was rejected because about one dollar of monthly credit is insufficient for
  a continuously reachable demo API.
- Google Cloud Run Always Free was deferred because the Always Free regions are US-centric while
  Neon is in Frankfurt, and the operator path is heavier than Render for this milestone.
- AWS App Runner / ECS were deferred because they lack a simple always-free container path
  comparable to Render Free and add IAM and billing complexity inappropriate for the current
  demonstration scope.
