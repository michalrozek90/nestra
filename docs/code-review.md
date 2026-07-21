# Code review guidelines

Review the change as a defect finder. Prioritize correctness and actionable findings over summaries,
praise, style preferences, or speculative improvements.

Read `AGENTS.md`, the active specification, and relevant repository instructions before reviewing.

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
10. Unnecessary complexity, duplication, and maintainability regressions.

Do not report formatting or stylistic preferences already enforced by automated tooling unless they
cause a concrete correctness or maintainability problem.

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

Report a finding only when the reviewed change introduces or worsens a concrete defect.

Before reporting it:

- Trace the relevant execution path and inspect callers, consumers, and surrounding code.
- Verify assumptions against types, schemas, configuration, migrations, and framework behavior.
- Describe the input, state, environment, or sequence of events that triggers the problem.
- Do not infer a defect from naming or a code pattern alone.
- Do not claim that a command or behavior was verified unless it was actually executed.
- If evidence is incomplete, omit the finding or clearly label it as an unverified risk.

## Review behavior

- Review every changed line and enough surrounding code to understand its behavior.
- Check whether the implementation satisfies the selected work item and active specification without
  adding unrelated functionality.
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

Distinguish blocking defects from optional improvements. Do not state that code is correct unless the
relevant behavior was inspected or verified.

If no actionable findings are found, state that clearly and mention any verification gaps or
residual risks.
