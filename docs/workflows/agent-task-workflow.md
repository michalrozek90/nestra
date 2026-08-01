# Autonomous agent task workflow

This document defines the mandatory lifecycle for implementing a selected GitHub Project work item. It is tool-neutral and applies to Codex, Cursor agents, and any other coding agent working in this repository.

`AGENTS.md`, the active specification, the selected GitHub issue, and `docs/code-review.md` remain authoritative for repository rules, product requirements, implementation scope, and review behavior. This workflow does not duplicate those documents.

## Invocation

This workflow runs only after an explicit autonomous workflow invocation.

The primary repository alias is:

```text
/work <issue-number-or-url>
```

Supported forms:

```text
/work #10
/work https://github.com/michalrozek90/nestra/issues/10
```

These forms are valid across Cursor Agent Chat, the Codex extension in Cursor, and the native Codex application. Treat a leading `/work <issue-number-or-url>` as an explicit invocation even when the client has no native slash-command support and the text is entered as plain text.

Entrypoints that must delegate here without copying this workflow:

- repository alias defined in `AGENTS.md`;
- repository skill at `.agents/skills/work/` for Cursor Agent Chat, the Codex extension in Cursor,
  and the native Codex application.

Before accessing GitHub issues, GitHub Projects, branches, or pull requests, inspect the first non-empty line of the user's current message literally.

Run this workflow only when:

- the first non-empty line starts with `/work ` and contains an issue number or issue URL; or
- the user directly and unambiguously states that the autonomous issue workflow must be started or resumed.

Do not run this workflow when `/work`, an issue number, or an issue URL appears only:

- inside a code block;
- inside quoted or pasted text;
- inside a specification, example, acceptance criterion, or documentation request;
- as content that the user asks to implement, document, or explain;
- later in a message whose first non-empty line is not an autonomous workflow invocation.

If the first non-empty line does not invoke this workflow, do not access the GitHub issue or GitHub Project under this workflow. Treat the request according to the direct implementation rules in `AGENTS.md`.

The workflow ends only after one of these outcomes:

- the pull request is ready for the user's manual review;
- the task is blocked and the blocker has been reported;
- the user explicitly approves the pull request for merge with `LGTM`;
- the user explicitly stops or changes the task.

## Core constraints

- Process exactly one selected GitHub Project work item at a time.
- Do not start unrelated work.
- Do not discard, overwrite, stash, commit, or otherwise alter pre-existing user changes.
- Do not merge without the user's explicit `LGTM` approval in the active conversation.
- A plain `LGTM` applies to the pull request currently being discussed. Ask for clarification only when the target is genuinely ambiguous.
- Do not delete local branches after merge.
- Keep user-facing completion summaries short and concrete.
- Resume existing work when possible instead of creating duplicate branches or pull requests.

## Workflow states

The expected GitHub Project states are:

- `Backlog` — captured work that is not yet actionable because its description is incomplete or important implementation decisions are unresolved. Place newly requested issues here until they are refined.
- `Todo`
- `In Progress`
- `Blocked`
- `Review`
- `Done`

Do not create or require a separate clarification state. When clarification is required, leave a concise issue comment describing what is missing and report it to the user.

Agent writes setting the status to `Review`, `Blocked`, or the post-merge `Done` value trigger the repository notification hook described in `docs/workflows/agent-task-notifications.md`. Use the GitHub Projects integration for these writes so the hook can observe the successful update. Do not send a duplicate manual notification.

## 1. Resolve the selected work item

1. Read `AGENTS.md`.
2. Read the active specification and relevant architecture decisions.
3. Read the selected GitHub issue and its comments through the GitHub integration.
4. Read the GitHub Project item and its current status.
5. Read `docs/code-review.md` before any review step.
6. Confirm the issue is actionable and its dependencies are complete.
7. Check whether the issue already has an existing branch or open pull request.

If existing work is found, inspect it and resume the established branch and pull request when they belong to the selected issue. Do not create duplicates.

If essential information or a dependency is missing:

1. Add a concise comment to the issue explaining the blocker or required clarification and mention the user.
2. Move the item to `Blocked` only when work cannot continue.
3. Stop without modifying code.
4. Report the blocker, evidence, and likely next action to the user.

## 2. Repository preflight

Before changing the project status or switching branches, inspect the local repository.

At minimum, verify:

```bash
git status --porcelain
git status -sb
git branch --show-current
git fetch origin --prune
```

Stop and report the exact state when any of the following exists:

- staged, modified, deleted, or untracked files;
- local commits not present on the tracked remote branch;
- an unfinished merge, rebase, cherry-pick, or revert;
- unrelated work that could be overwritten or mixed into the task;
- a local `main` branch that cannot be fast-forwarded safely.

Never automatically stash, reset, clean, discard, or commit pre-existing changes.

When the working tree is safe:

```bash
git switch main
git pull --ff-only
```

If `main` cannot be updated with a fast-forward, stop and report the problem.

After the preflight succeeds, move the selected work item to `In Progress`.

## 3. Create or resume the task branch

For new work, create and switch to a concise, descriptive branch derived from the issue number and task purpose. Prefer one of:

```text
feat/<issue-number>-<description>
fix/<issue-number>-<description>
chore/<issue-number>-<description>
docs/<issue-number>-<description>
refactor/<issue-number>-<description>
```

Example:

```bash
git switch -c feat/10-authentication
```

Use an existing task branch instead when resuming the same issue.

## 4. Implement the issue

1. Inspect the current implementation and established repository patterns.
2. Implement only the selected issue according to its acceptance criteria and repository rules.
3. Keep documentation and architecture decisions current when required.
4. Do not expand the issue scope with unrelated features or refactors.

### Maintain the in-app release notes

Before quality verification, decide whether the completed issue changes behavior that an application
user can observe. A user-facing feature, improvement, or bug fix must update the curated in-app
release notes in the same task branch and pull request. Documentation, CI, workflow, refactoring,
and other internal-only changes do not require an in-app entry.

For a required entry:

1. Read `.release-please-manifest.json`, `release-please-config.json`, and the Conventional Commits
   since the latest release tag. Include the intended commit type for the current task when
   anticipating the next Release Please version.
2. Reuse the single pending release entry in
   `apps/client/src/features/releases/release-notes.ts`. If the accumulated commits change the
   anticipated target, for example from a patch to a minor release, move the pending notes to the
   newly anticipated version instead of creating competing pending entries.
3. Add a concise, user-oriented description of the outcome. Describe what became possible or what
   was fixed, not implementation details, issue numbers, commit messages, or internal tooling.
4. Update both `apps/client/src/i18n/en/releases.ts` and
   `apps/client/src/i18n/pl/releases.ts`. Keep existing pending notes and avoid duplicate entries for
   the same behavior.
5. Use an explicitly planned publication date when one exists. Do not invent a release date merely
   to complete the task; flag the missing date in the handoff so it can be set before publication.

Write both curated notes and release-ready `feat:` / `fix:` commit subjects in direct, satisfying
language:

- Name the visible result immediately: `Nestra now...`, `You can now...`, or an equally natural
  product statement.
- Avoid generic implementation verbs such as `add`, `implement`, `introduce`, or `launch` when they
  hide the user outcome.
- Give major features appropriate emphasis while staying accurate. A short celebratory phrase or
  emoji is welcome for a genuinely substantial capability, not for every maintenance fix.
- Write idiomatic English and Polish rather than translating mechanically.

Release Please can place a `feat:` or `fix:` subject directly in the public GitHub Release
changelog, so review that subject as user-facing copy before committing. For example, prefer
`feat(desktop): Nestra now has automatic updates 🚀` over
`feat(desktop): add signed application updates`.

Do not postpone accumulated product-note content to a separate cleanup pull request. Release Please
continues to own the technical `CHANGELOG.md`; the application release notes are a smaller curated
summary and must not copy the technical changelog verbatim.

## 5. Quality verification loop

Run the repository verification command:

```bash
pnpm verify
```

A failed execution followed by code or configuration changes and another execution counts as one repair cycle.

The maximum is **four repair cycles per workflow phase**.

For each failure:

1. Inspect the complete error output and identify the likely root cause.
2. Apply a scoped correction.
3. Run `pnpm verify` again.

After four unsuccessful repair cycles:

1. Stop making changes.
2. Move the work item to `Blocked`.
3. Add a detailed issue comment mentioning the user and containing:
   - the command that failed;
   - the relevant error;
   - the attempted fixes;
   - the current repository and branch state;
   - the suspected root cause;
   - the recommended next investigation.
4. Report the same information to the user in a structured but concise response.
5. Do not commit, push, mark the PR ready, or claim completion.

A repair cycle limit applies separately to the initial implementation phase and to a later user-feedback phase.

## 6. Initial commit, push, and draft pull request

After `pnpm verify` passes:

1. Inspect the final diff and stage only files belonging to the selected issue.
2. Create a Conventional Commit with a concise message matching the change.
3. Push the branch and set upstream tracking.
4. Create a **draft pull request** targeting `main`.
5. Assign the pull request to the repository owner/user.

The pull request title must summarize the implemented change. Its description must briefly include:

- why the pull request exists;
- what it changes;
- how it was verified;
- the closing reference, for example `Closes #10`.

Do not move the work item to `Review` yet.

## 7. Agent code review and corrections

Perform code review exactly according to `docs/code-review.md` and the relevant repository instructions.

Apply the corrections that the review guidelines require. Do not redefine or duplicate review policy in this workflow.

When review causes code changes:

1. Run `pnpm verify` using the same four-cycle limit.
2. Inspect and stage only the review corrections.
3. Create an additional Conventional Commit.
4. Push it to the existing task branch and pull request.

Repeat review only as required by `docs/code-review.md` and the actual corrections. Do not create an unbounded review/refactor loop.

## 8. Hand off for manual review

When all required implementation work and agent review corrections are complete and `pnpm verify` passes:

1. Mark the draft pull request as ready for review.
2. Move the GitHub Project item to `Review`.
3. Stop autonomous implementation work.
4. Return a short handoff containing only:
   - issue and pull request;
   - branch;
   - verification result;
   - whether review produced additional commits;
   - the main manual checks the user should perform.

A separate pull request comment is not required merely to announce readiness.

## 9. User feedback loop

When the user requests changes to the pull request:

1. Confirm the active issue, branch, and pull request from the conversation and repository state.
2. Move the work item from `Review` to `In Progress`.
3. Implement only the requested corrections.
4. Reapply the in-app release-note rule from section 4 when the correction changes user-visible
   behavior or makes an existing note inaccurate.
5. Run `pnpm verify` with the four-cycle limit.
6. Commit and push the corrections using a Conventional Commit.
7. Review the corrections according to `docs/code-review.md`.
8. Apply any required review corrections.
9. Run `pnpm verify` again when review changes code.
10. Commit and push any additional corrections.
11. Mark the pull request ready for review if it became draft for any reason.
12. Move the item back to `Review`.
13. Return another short manual-review handoff.

New ideas outside the current issue scope should be created as separate GitHub Project work items when the user requests it.

## 10. Merge on LGTM

A plain `LGTM` in the active conversation authorizes merging the pull request currently under discussion. Ask one short clarification question only when more than one target is plausibly active and the intended pull request cannot be determined reliably.

Before merge:

1. Resolve the exact active pull request and issue.
2. Confirm the pull request is open, not a draft, and targets `main`.
3. Confirm required CI checks pass.
4. Confirm there are no merge conflicts or unresolved blocking review findings.
5. Confirm the pull request head has not changed since the version presented for the user's manual review. If it changed after the user's review, do not merge; explain that the new commit needs approval.

Then:

1. Merge the pull request using the repository's established merge method.
2. Confirm the linked issue closes and inspect whether automation moved the Project item to `Done`.
3. Perform exactly one `update_project_item` call through the GitHub Projects integration that sets the item status to `Done`, even when automation already set that value. Resolve the item with `item_owner`, `item_repo`, and `issue_number` so the notification can link to the issue. This idempotent write both completes a missing automation transition and triggers the client notification hook.
4. Confirm the Project item is `Done`.
5. Switch the local repository to `main`.
6. Run `git pull --ff-only`.
7. Do not delete the local task branch.
8. Return a short confirmation containing the merged PR and updated `main` state.

## 11. Recovery and idempotency

At the beginning of every invocation, reconstruct the current workflow state from Git, GitHub, and the active conversation.

Examples:

- Existing branch but no PR: resume the branch, verify it, then create the draft PR when appropriate.
- Existing draft PR: inspect its state and continue implementation or review.
- Existing ready PR in `Review`: do not repeat implementation; wait for feedback or `LGTM`.
- Existing merged PR: confirm the issue and Project state, update local `main`, and report completion.
- Closed unmerged PR: stop and ask for direction unless the user's request clearly authorizes reopening or replacing it.

Never repeat completed destructive or publishing actions merely because a session restarted.
