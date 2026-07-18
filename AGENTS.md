# Nestra repository instructions

The authoritative implementation specification is:

```text
docs/specifications/nestra-initial-application.md
```

Implementation progress is tracked in:

```text
docs/implementation-status.md
```

## Required workflow

Before every implementation run:

1. Read this file.
2. Read the authoritative specification.
3. Read the implementation tracker.
4. Inspect the current repository state and existing work.
5. Identify the first incomplete implementation stage.

Implement **exactly one stage per run**.

Do not begin any work belonging to a later stage, even if the current stage finishes early. After completing the active stage:

1. Run every verification command required by that stage.
2. Fix all relevant failures.
3. Update `docs/implementation-status.md`.
4. Mark the stage complete only when all of its completion criteria pass.
5. Report completed work, verification results, blockers, and remaining stages.
6. Stop.

Do not mark blocked, unverified, or partially implemented work as complete.

## Repository rules

The current directory is already the root of the cloned Git repository.

Do not:

* run `git init`;
* create a nested `nestra` project directory;
* modify or remove Git remotes;
* change branches;
* create commits, tags, pushes, pull requests, or releases without explicit user approval;
* delete or overwrite existing work without inspecting it first;
* work outside the current repository root.

Preserve valid existing work and document conflicts or blockers honestly.

## Engineering principles

* Prefer the simplest maintainable solution that satisfies the current requirement.
* Do not implement speculative abstractions, infrastructure, or future roadmap features.
* Follow KISS and YAGNI.
* Apply DRY to meaningful business logic, but do not create a complicated abstraction merely to remove small duplication.
* Optimize for clarity, explicit behavior, and maintainability rather than arbitrary file-size or function-length limits.
* Use clear names that communicate purpose, state, and units.
* Keep time-related units in names, for example `requestDurationMs`.
* Avoid vague names such as `data`, `value`, `result`, or `item` outside small and obvious scopes.
* Avoid hidden side effects and unexpected mutations.
* Do not suppress errors or leave incomplete work behind a vague `TODO`.

## TypeScript rules

* Keep TypeScript strict.
* Never use `any`.
* Use `unknown` for untrusted values and narrow it safely.
* Avoid unnecessary type assertions and non-null assertions.
* Do not use `@ts-ignore`.
* Infer shared API types from their Zod schemas.
* Use `readonly` when mutation is not intended.
* Use exhaustive handling for closed unions.
* Do not weaken types merely to satisfy a library.

Any unavoidable exception must include a clear explanation of why it is safe and why a better typed solution is not available.

## Application boundaries

### Client

* Do not perform network requests directly inside screen components.
* Keep authentication, API, storage, logging, and diagnostics logic outside presentation components.
* Use TanStack Query for server state.
* Do not duplicate query data into global state.
* Do not introduce a global state library without a demonstrated cross-feature need.
* Do not use `useEffect` for fetching handled by TanStack Query.
* Do not use `useEffect` for values that can be derived during rendering.
* Isolate platform-specific implementations behind typed interfaces.

### Backend

* Keep NestJS controllers thin.
* Keep business rules in services.
* Keep persistence behavior explicit.
* Do not create generic repository or base-service abstractions without a proven repeated need.
* Validate untrusted input at system boundaries.
* Determine the authenticated user from the access token, never from a user ID supplied by the client.
* Enforce resource ownership in every user-data query and mutation.

## Module boundaries

* Do not import private implementation files from another feature or module.
* Use deliberate public exports.
* Avoid circular dependencies.
* Move code to a shared package only when it has a concrete, framework-independent shared purpose.
* Do not create general-purpose shared utility collections as dumping grounds.

## Package management

* Use pnpm exclusively.
* Do not use npm, npx, Yarn, Bun, or another package manager.
* Use `pnpm exec` or workspace filters when invoking project tools.
* Use Expo-compatible installation commands defined by the specification.
* Add a dependency only when existing platform APIs, current dependencies, or simple local code are insufficient.
* Use stable, actively maintained, mutually compatible package versions.
* Do not guess package versions when current metadata or official documentation cannot be accessed.
* Do not perform unrelated dependency upgrades.

## Logging and privacy

Do not call console methods outside the designated logging infrastructure.

Never log or expose:

* passwords;
* access or refresh tokens;
* authorization headers;
* secrets;
* private environment values;
* note content;
* editor drafts;
* form credentials;
* complete request or response objects containing user data.

Log safe identifiers, request IDs, error codes, operation names, and durations where useful.

Do not silently ignore caught errors. Handle them, convert them into an expected error, or log them safely and rethrow them.

## Documentation and decisions

* Write code, comments, technical documentation, commit messages, and ADRs in English.
* Comments should explain why, not restate what the code does.
* Record meaningful architectural decisions under `docs/decisions/`.
* Create an ADR for decisions that are difficult to reverse, affect multiple modules, introduce important dependencies, or concern security, build, or release processes.
* Keep README instructions accurate whenever commands or setup requirements change.
* Update the implementation tracker during every stage.

## Formatting and verification

Use the configured ESLint and Prettier setup.

A stage is complete only when:

* every scoped requirement is implemented;
* every stage-specific completion criterion passes;
* all required verification commands have actually been executed;
* formatting passes;
* linting passes;
* strict type checking passes;
* required builds pass;
* relevant documentation and ADRs are updated;
* no blocking TODO remains;
* the implementation tracker is updated truthfully.

Do not claim that a command, build, or manual verification passed unless it was actually performed.
