# Code review guidelines

Review the change as both a defect finder and a maintainability gate. Prioritize correctness,
clear ownership, and actionable findings over summaries, praise, personal style preferences, or
speculative improvements.

Read `AGENTS.md`, the active specification, and relevant repository instructions before reviewing.

Passing formatting, linting, type checking, builds, or tests does not complete a review. Automated
verification proves only the properties covered by those tools; it does not prove that the changed
code has clear responsibilities, suitable boundaries, understandable names, or maintainable React
lifecycle behavior.

## Required review passes

Perform both passes for every change:

1. **Correctness and safety:** trace runtime behavior, data flow, failure paths, concurrency,
   privacy, contracts, and platform differences.
2. **Design and maintainability:** inspect the resulting code, not only the isolated diff, for
   ownership, cohesion, placement, naming, effects, component and hook boundaries, duplication,
   and unnecessary complexity.

Do not skip the second pass merely because the change works or has no blocking runtime defect. A
review may require a maintainability correction when the changed code has unclear ownership, mixes
independent responsibilities, hides lifecycle behavior, or makes the next related change
materially harder or riskier.

## Review priorities

Review findings in this order:

1. Security vulnerabilities and private-data exposure.
2. Data loss, corrupted state, race conditions, and stale-state overwrites.
3. Incorrect business behavior.
4. Authentication and authorization errors.
5. API contract, persistence, and database inconsistencies.
6. Cross-platform and environment-specific problems.
7. Type-safety violations.
8. Module-boundary and architectural violations.
9. Missing error, loading, cancellation, and recovery handling.
10. Unclear ownership, misplaced logic, incohesive components or hooks, and hidden lifecycle
    behavior.
11. Misleading naming, misplaced or duplicated types and constants, and inconsistent file
    responsibilities.
12. Unnecessary complexity, duplication, and other maintainability regressions.

Do not report formatting or stylistic preferences already enforced by automated tooling unless they
cause a concrete correctness or maintainability problem.

## Code structure and ownership

Review where each changed behavior lives, not only whether its implementation works.

- A screen or presentation component should primarily compose UI and orchestrate feature behavior.
  Report business rules, API calls, storage access, complex synchronization, or independent
  lifecycle state added directly to presentation code when an existing service, query, mutation,
  feature hook, or a focused new hook is the clearer owner.
- A component or hook may be long without being defective. Do not enforce arbitrary line-count,
  function-count, or file-count limits. Instead, identify distinct reasons to change, unrelated
  state machines, excessive change coupling, or behavior that cannot be understood without
  repeatedly jumping between unrelated sections.
- Recommend extraction when a block has a cohesive responsibility, meaningful state or lifecycle,
  and a smaller explicit interface. Do not extract code only to reduce line count or create
  one-line wrappers and pass-through abstractions.
- Keep feature-specific behavior inside its feature. Move code to shared infrastructure only when
  it has a concrete framework-independent or cross-feature purpose.
- Check that new helpers and abstractions reduce cognitive load. Report abstractions that hide
  control flow, accept boolean-heavy configuration, duplicate an established path, or require
  callers to understand their internals.
- Check whether the change leaves the main component, hook, service, or module with a coherent
  primary responsibility after the new behavior is added.

## React Native, Expo, and frontend review

Nestra uses React as the component and hooks runtime, but its application architecture is Expo and
React Native. Review shared UI as React Native code targeting Android, iOS, and Web rather than as a
DOM-first React application.

- Treat `useEffect` as synchronization with an external system, subscription, timer, imperative
  platform API, or lifecycle boundary. Report effects used for data fetching owned by TanStack
  Query, values derivable during render, user actions that belong in event handlers, or state that
  can be initialized directly.
- For every effect, verify its external system, dependency list, cleanup, idempotency, cancellation,
  Strict Mode behavior, and response to unmounting or rapid dependency changes. Effects that form
  one state machine should have a clear shared owner instead of being scattered through a screen.
- Do not demand removal of a justified effect solely because effects should be used sparingly.
  Prefer moving cohesive effect-driven behavior into a focused custom hook when that makes
  ownership and lifecycle constraints explicit.
- Check for duplicated server state, copied query data, derived state stored unnecessarily,
  stale closures, unstable callback identities where they cause behavior, and refs that outlive or
  bypass the state they are expected to represent.
- Trace focus, keyboard, selection, dialogs, navigation, backgrounding, and accessibility behavior
  on Web and native targets when the change touches interactive UI.
- Check that loading, empty, error, retry, disabled, and optimistic states remain coherent and that
  rapid repeated actions cannot create duplicate requests or stale UI.
- Keep network requests outside route and screen components. Server state belongs to TanStack Query
  query and mutation hooks, API calls belong to the configured Axios infrastructure or a focused
  feature API module, and query data must not be copied into global or local state without a
  concrete editing requirement.
- Review Expo Router changes as navigation lifecycle changes. Trace route parameters, stack
  replacement, back behavior, deep links, screen mounting and unmounting, retained navigator state,
  and whether navigation can interrupt pending editor, draft, authentication, or mutation work.
- Prefer React Native and React Native Paper primitives for shared UI. Report DOM elements, browser
  event assumptions, CSS-only behavior, or direct `window`, `document`, and Web Storage access in
  shared files unless they are isolated behind a typed platform-specific implementation.
- Platform differences should use the established `.web.ts`, `.web.tsx`, native implementation, or
  another typed boundary. Do not accept scattered `Platform.OS` branches when a focused platform
  module would give the behavior a clearer owner.
- Review `TextInput`, keyboard, focus, selection, `AppState`, `ScrollView`, safe-area, touch target,
  and accessibility behavior using React Native semantics. Verify keyboard navigation and focus
  indicators on Web as an additional platform requirement, not as the default implementation model.
- Use the application-owned React Native Paper themes, semantic tokens, `StyleSheet`, and
  responsive breakpoints. Report hardcoded colors, duplicated breakpoint logic, inaccessible
  contrast, browser-only layout assumptions, or a second component or styling framework.
- Check Expo-managed native dependencies for SDK compatibility and require Expo-compatible
  installation commands. A Web-only fix must not weaken Android or iOS behavior, and a native fix
  must preserve the Expo Web build.
- Keep sensitive authentication tokens behind the established SecureStore and web token-storage
  abstractions. Keep preferences and note drafts behind their typed storage interfaces; route and
  presentation components must not call storage implementations directly.
- Require proportionate platform verification. Shared interactive changes should identify what was
  actually checked on Web, Android, and iOS and must state any platform gap instead of inferring
  native behavior from a successful Web build.

## Types, constants, naming, and files

- Place a type at the narrowest deliberate ownership boundary. Keep component-only types local;
  keep feature types with the feature behavior they describe; expose shared contract types from
  their schema-owned public module. Report duplicated or prematurely shared types that can diverge.
- Place constants near the behavior that owns them. Keep immutable configuration outside render
  functions, include units in time and size names, and avoid unrelated catch-all constants or
  utility modules.
- Verify that variable, function, hook, component, type, and file names describe purpose and domain
  meaning rather than implementation mechanics. Report vague names such as `data`, `value`,
  `result`, `item`, `handler`, or `utils` when their broader scope makes behavior unclear.
- Boolean names should read naturally with `is`, `has`, `can`, `should`, or `show`. Time and size
  values should include units such as `Ms`, `Seconds`, `Bytes`, or `Px` where ambiguity is possible.
- File names should match their primary export or responsibility. Report files that become dumping
  grounds for unrelated types, constants, hooks, components, and business logic.
- Check that closed unions are handled exhaustively and that types are not weakened, asserted, or
  made nullable merely to satisfy an implementation.

## Repository reuse and consistency

Before proposing new code, abstractions, utilities, schemas, services, or dependencies:

- Search the repository for equivalent behavior or an established implementation.
- Check neighboring modules and public exports for the existing project pattern.
- Report duplicated business logic or parallel implementations that may diverge.
- Prefer reuse only when semantics and ownership match. Do not recommend a shared abstraction solely
  because code looks similar.
- Cite the existing implementation when reporting duplication or inconsistency.

Check whether the change leaves behind obsolete code, unused exports, dead branches, redundant
dependencies, or competing ways to perform the same operation.

## Evidence requirements

Report a finding only when the reviewed change introduces or worsens a concrete defect or a
significant maintainability regression. A runtime failure is not required for a maintainability
finding, but the cost must be specific and evidenced rather than a matter of taste.

Before reporting it:

- Trace the relevant execution path and inspect callers, consumers, and surrounding code.
- Verify assumptions against types, schemas, configuration, migrations, and framework behavior.
- Describe the input, state, environment, or sequence of events that triggers the problem.
- For maintainability findings, describe the conflicting responsibilities, unclear ownership,
  likely divergence, hidden lifecycle, misleading name, or concrete future-change scenario that
  makes the current structure costly or error-prone.
- Do not infer a defect from naming, file length, use of a hook, use of an effect, or another code
  pattern alone.
- Do not claim that a command or behavior was verified unless it was actually executed.
- If evidence is incomplete, omit the finding or clearly label it as an unverified risk.

## Review behavior

- Review every changed line and enough surrounding code to understand its behavior.
- Review the resulting full component, hook, service, or module when the diff adds another
  responsibility to an existing file.
- Check whether the implementation satisfies the selected work item and active specification without
  adding unrelated functionality.
- For a user-facing feature, improvement, or bug fix, verify that the same change updates the
  curated in-app release notes in English and Polish under the anticipated Release Please version.
  Report a missing, duplicated, misleading, or incorrectly versioned entry. Internal-only changes
  do not require an in-app note.
- Look for regressions in affected callers and consumers outside the changed files.
- Check boundary conditions, invalid input, nullable values, partial failures, retries, and
  concurrent operations.
- Verify that errors are handled explicitly and are not silently swallowed.
- Verify that untrusted input is validated at system boundaries.
- Verify that secrets and private user data are neither logged nor exposed.
- Verify that user-owned resources are filtered by authenticated user ID.
- Verify that asynchronous operations cannot overwrite newer state.
- Verify that client, API, validation, and persistence contracts remain consistent.
- Verify that new dependencies and abstractions are necessary.
- Verify that changed names, file placement, exported types, constants, and module boundaries make
  the behavior easier to locate and understand.
- Inspect changed tests for meaningful assertions and false positives. Do not create tests unless
  explicitly requested.
- Avoid unrelated refactors and speculative future-proofing.

## Severity

- **Critical:** readily exploitable security issue, irreversible data loss, or system-wide failure.
- **High:** serious security, authorization, data-integrity, or core-business defect.
- **Medium:** reproducible functional defect with limited impact or a significant maintainability
  regression.
- **Low:** minor but concrete defect with a clear correction.

Do not assign severity based only on code quality or personal preference.

## Finding format

For every finding include:

- severity;
- affected file and line;
- concise problem description;
- concrete failure scenario;
- evidence from the reviewed code;
- recommended correction;
- relevant specification or repository rule.

For a maintainability finding, replace the runtime failure scenario with the concrete maintenance
or future-change scenario. State which responsibilities or concepts are coupled and why the
recommended boundary or name reduces that risk.

Distinguish blocking defects from optional improvements. Do not state that code is correct unless the
relevant behavior was inspected or verified.

If no actionable findings are found, state that clearly and mention any verification gaps or
residual risks.
