# Architecture decision records

Nestra uses lightweight architecture decision records (ADRs) for decisions whose context and
trade-offs should survive beyond an implementation stage.

## Naming

Use a zero-padded sequence and a concise kebab-case title, for example:

```text
001-monorepo-and-package-boundaries.md
002-contracts-build-strategy.md
003-authentication-token-strategy.md
004-release-automation.md
```

An ADR is immutable after acceptance except for corrections and status changes. A later decision
supersedes an earlier one instead of silently rewriting its reasoning.

## Template

```md
# NNN — Decision title

## Status

Proposed | Accepted | Superseded by ADR NNN

## Context

What forces and constraints require a decision?

## Decision

What will the project do?

## Consequences

What becomes easier or harder?

## Alternatives considered

What viable alternatives were rejected, and why?
```
