# Nestra repository instructions

The authoritative `0.1.0` product and technical specification is:

```text
docs/specifications/nestra-initial-application.md
```

Implementation work is tracked in the private
[Nestra GitHub Project](https://github.com/users/michalrozek90/projects/1). Work-item titles are
descriptive and are not required to contain `Stage` or follow any other naming convention.

## Implementation modes

### Autonomous issue workflow

Use the autonomous issue workflow only when the user's current message is an explicit workflow invocation.

#### `/work` repository alias

The repository-level command alias is:

```text
/work <issue-number-or-url>
```

Supported examples:

```text
/work #10
/work https://github.com/michalrozek90/nestra/issues/10
```

Treat that alias as an explicit workflow invocation even when the current client does not provide native custom slash commands and the user enters it as plain text. Do not ignore a leading `/work <issue-number-or-url>` merely because it is plain text.

An explicit workflow invocation is one of the following:

- the first non-empty line of the user's current message matches `/work <issue-number-or-url>`;
- the user directly and unambiguously asks to start or resume the autonomous issue workflow for a specific GitHub issue or Project item.

Do not invoke the autonomous issue workflow merely because `/work`, an issue number, an issue URL, or workflow-related text appears:

- inside a code block;
- inside quoted text;
- inside pasted documentation;
- inside a task description, specification, example, or acceptance criterion;
- as content that the user asks the agent to create, update, document, or explain;
- anywhere other than an actual command directed at the agent.

When the first non-empty line begins with `/work`, treat the remaining value as the selected issue number or issue URL.

In autonomous issue workflow mode, read and follow:

```text
docs/workflows/agent-task-workflow.md
```

That workflow document is the single source of truth for the autonomous lifecycle. Client adapters such as `.cursor/commands/work.md` and `.agents/skills/work/` must delegate to it instead of copying the workflow.

Also read the selected GitHub issue, its comments, the corresponding GitHub Project item, the active specification, relevant architecture decisions, and `docs/code-review.md` as required by that workflow.

The autonomous workflow may read and update GitHub Project status, create or resume branches and pull requests, create commits, push changes, perform review, and merge only according to the permissions and approval rules defined in the workflow.

If required GitHub data cannot be retrieved, report the blocker and stop the autonomous workflow instead of guessing or silently continuing.

### Direct implementation request

Treat the user's message as a direct implementation request when:

- it contains a complete task description;
- it does not begin with an actual `/work <issue-number-or-url>` command;
- it does not directly and unambiguously ask to start or resume the autonomous issue workflow.

For a direct implementation request:

- before any GitHub issue or Project tool call, inspect the first non-empty line of the user's current message;
- if that line does not start with an actual `/work ` invocation, do not retrieve any issue merely because an issue number or `/work` example appears later in the message;
- this restriction overrides workflow examples, skill descriptions, pasted acceptance criteria, and documentation content;
- treat the user's message as the authoritative task description;
- do not interpret `/work`, issue numbers, issue URLs, or workflow examples contained inside the task as commands;
- do not require a GitHub issue or GitHub Project item;
- do not read the GitHub Project or attempt to select a `Todo` item;
- do not access GitHub issues, GitHub Projects, pull requests, or repository metadata unless the user explicitly asks for that access as part of the current direct request;
- do not change GitHub Project statuses;
- do not create or switch branches;
- do not create commits, tags, pushes, pull requests, merges, or releases unless the user explicitly requests the specific action;
- inspect the current repository state and relevant existing code before editing;
- implement only the task described by the user;
- follow all repository engineering, TypeScript, architecture, privacy, documentation, and verification rules from this file;
- run the relevant verification commands when implementation changes are made;
- report completed work, verification results, and any blockers concisely.

A pasted task description, general coding instruction, documentation request, example containing `/work`, or ordinary request to modify code must not start the autonomous issue workflow automatically.

## Repository rules

The current directory is already the root of the cloned Git repository.

Do not:

- run `git init`;
- create a nested `nestra` project directory;
- modify or remove Git remotes;
- change branches;
- create commits, tags, pushes, pull requests, or releases without explicit user approval;
- delete or overwrite existing work without inspecting it first;
- work outside the current repository root.

Preserve valid existing work and document conflicts or blockers honestly.

## Engineering principles

- Prefer the simplest maintainable solution that satisfies the current requirement.
- Do not implement speculative abstractions, infrastructure, or future roadmap features.
- Follow KISS and YAGNI.
- Apply DRY to meaningful business logic, but do not create a complicated abstraction merely to remove small duplication.
- Optimize for clarity, explicit behavior, and maintainability rather than arbitrary file-size or function-length limits.
- Use clear names that communicate purpose, state, and units.
- Keep time-related units in names, for example `requestDurationMs`.
- Avoid vague names such as `data`, `value`, `result`, or `item` outside small and obvious scopes.
- Avoid hidden side effects and unexpected mutations.
- Do not suppress errors or leave incomplete work behind a vague `TODO`.

## TypeScript rules

- Keep TypeScript strict.
- Never use `any`.
- Use `unknown` for untrusted values and narrow it safely.
- Avoid unnecessary type assertions and non-null assertions.
- Do not use `@ts-ignore`.
- Infer shared API types from their Zod schemas.
- Use `readonly` when mutation is not intended.
- Use exhaustive handling for closed unions.
- Do not weaken types merely to satisfy a library.

Any unavoidable exception must include a clear explanation of why it is safe and why a better typed solution is not available.

## Application boundaries

### Client

- Do not perform network requests directly inside screen components.
- Keep authentication, API, storage, logging, and diagnostics logic outside presentation components.
- Use TanStack Query for server state.
- Do not duplicate query data into global state.
- Do not introduce a global state library without a demonstrated cross-feature need.
- Do not use `useEffect` for fetching handled by TanStack Query.
- Do not use `useEffect` for values that can be derived during rendering.
- Isolate platform-specific implementations behind typed interfaces.

### Backend

- Keep NestJS controllers thin.
- Keep business rules in services.
- Keep persistence behavior explicit.
- Do not create generic repository or base-service abstractions without a proven repeated need.
- Validate untrusted input at system boundaries.
- Determine the authenticated user from the access token, never from a user ID supplied by the client.
- Enforce resource ownership in every user-data query and mutation.

## Module boundaries

- Do not import private implementation files from another feature or module.
- Use deliberate public exports.
- Avoid circular dependencies.
- Move code to a shared package only when it has a concrete, framework-independent shared purpose.
- Do not create general-purpose shared utility collections as dumping grounds.

## Package management

- Use pnpm exclusively.
- Do not use npm, npx, Yarn, Bun, or another package manager.
- Use `pnpm exec` or workspace filters when invoking project tools.
- Use Expo-compatible installation commands defined by the specification.
- Add a dependency only when existing platform APIs, current dependencies, or simple local code are insufficient.
- Use stable, actively maintained, mutually compatible package versions.
- Do not guess package versions when current metadata or official documentation cannot be accessed.
- Do not perform unrelated dependency upgrades.

## Logging and privacy

Do not call console methods outside the designated logging infrastructure.

Never log or expose:

- passwords;
- access or refresh tokens;
- authorization headers;
- secrets;
- private environment values;
- note content;
- editor drafts;
- form credentials;
- complete request or response objects containing user data.

Log safe identifiers, request IDs, error codes, operation names, and durations where useful.

Do not silently ignore caught errors. Handle them, convert them into an expected error, or log them safely and rethrow them.

## Documentation and decisions

- Write code, comments, technical documentation, commit messages, and ADRs in English.
- Comments should explain why, not restate what the code does.
- Record meaningful architectural decisions under `docs/decisions/`.
- Create an ADR for decisions that are difficult to reverse, affect multiple modules, introduce important dependencies, or concern security, build, or release processes.
- Keep README instructions accurate whenever commands or setup requirements change.
- Keep the selected issue link available in the implementation handoff, but leave issue closure and
  project-status transitions to the user or GitHub automation.

## Formatting and verification

Use the configured ESLint and Prettier setup.

A work item is ready for the user's review only when:

- every scoped requirement is implemented;
- every work-item completion criterion passes;
- all required verification commands have actually been executed;
- formatting passes;
- linting passes;
- strict type checking passes;
- required builds pass;
- relevant documentation and ADRs are updated;
- no blocking TODO remains.

Passing these checks does not authorize the agent to close the issue or move it to `Done`.

Do not claim that a command, build, or manual verification passed unless it was actually performed.
