# Code review guidelines

## Review priorities

Review findings in this order:

1. Security vulnerabilities and private-data exposure.
2. Data loss, corrupted state, and race conditions.
3. Incorrect business behavior.
4. Authentication and authorization errors.
5. API contract and database inconsistencies.
6. Cross-platform problems.
7. Type-safety violations.
8. Module-boundary and architectural violations.
9. Missing error, loading, and recovery states.
10. Maintainability and unnecessary complexity.

Do not report purely stylistic preferences already handled by ESLint or Prettier unless they reveal a real maintainability problem.

## Finding format

For every finding include:

- severity: Critical, High, Medium, or Low;
- affected file and line;
- concise problem description;
- concrete failure scenario;
- recommended correction;
- relevant specification or repository rule.

Do not state that code is correct unless the relevant behavior was inspected or verified.

## Review behavior

- Review the actual diff and its surrounding code.
- Check whether the implementation satisfies the active specification stage.
- Look for regressions outside the changed files.
- Verify that errors are not silently swallowed.
- Verify that private data is not logged.
- Verify that user-owned resources are filtered by authenticated user ID.
- Verify that asynchronous operations cannot overwrite newer state.
- Verify that client and API contracts remain consistent.
- Verify that new dependencies are justified.
- Distinguish blocking defects from optional improvements.
- Avoid suggesting broad refactors unrelated to the reviewed change.
