# Issue intake workflow

This workflow turns an explicit `/create` command into a triaged GitHub issue for Nestra.

## Fixed destination and authorization

- Repository: `michalrozek90/nestra`
- GitHub Project: `michalrozek90`, project number `1`
- Ready work status: `Todo`
- Insufficiently refined work status: `Backlog`

An actual `/create` invocation starts an intake and authorizes these external GitHub writes once
the task is ready for `Todo` or the user chooses `backlog` during clarification:

1. create one issue in the fixed repository;
2. add that issue to the fixed project;
3. set its `Status` field to `Todo` or `Backlog`;
4. for a `Backlog` issue only, add one comment containing the material clarification questions.

Do not request another confirmation before those actions. If the task needs clarification, perform
no GitHub writes until the user either supplies enough information or replies `backlog`. The command
does not authorize any other external write, code implementation, branch operation, commit, pull
request, or project-status transition.

## Parse the request

Use the text following `/create` on the first non-empty line plus all subsequent lines as the task
description. If that description is empty, ask the user for the task description and perform no
GitHub writes.

Treat the user's description as authoritative. Use the active specification or repository source
only when a project-specific term needs read-only clarification. Do not expand the requested
product scope.

Write the issue title, body, and comments in English. Communicate with the user in Polish.

## Continue clarification across turns

Keep one pending intake in the current thread until it is created, replaced by a new `/create`
command, or the thread context is no longer available.

When the initial description is not ready for `Todo`:

1. Ask the smallest complete set of concise, material product questions needed to determine
   readiness. There is no fixed question limit.
2. Group related questions and order them from the most consequential to the least consequential.
3. If the number or breadth of questions indicates multiple independent work items, recommend
   splitting the task before issue creation.
4. Perform no GitHub reads or writes required only for issue creation.
5. Tell the user they may answer the questions or reply `backlog` to save the unresolved task.

When the user answers, combine the original description, all prior clarification answers, and the
new answer. Reassess readiness:

- if all material ambiguity is resolved, continue to create a `Todo` issue without another
  confirmation;
- if the answers reveal or leave material ambiguity, ask another round containing only the
  remaining necessary questions and perform no GitHub writes.

Treat the user's entire trimmed reply `backlog`, case-insensitively, as a command only when an
intake is awaiting clarification in the same thread. It authorizes creating the pending task as
`Backlog`, commenting with the still-unresolved questions, and mentioning the authenticated GitHub
user. A standalone `backlog` without a pending intake must not create or mutate anything.

If the user sends a new `/create` command while another intake is pending, replace the uncreated
pending intake with the new one. Do not interpret an unrelated message as a clarification answer.

## Check the destination and duplicates

Only after the task is ready for `Todo` or the user chooses `backlog`, and before creating an issue:

1. Confirm the authenticated GitHub account and repository access.
2. List the project fields and resolve the exact `Status` field and its `Todo` and `Backlog`
   options. Never invent field or option IDs.
3. Search open repository issues and project items for semantic or title-level duplicates.
4. Paginate all project-list results when the connector reports another page.

If there is a high-confidence open duplicate, do not create another issue or mutate the existing
one. Return its link and current project status. Treat an issue as a high-confidence duplicate only
when it describes the same user-visible outcome and scope, not merely the same feature area.

If required GitHub data cannot be retrieved, report the blocker and stop instead of guessing.

## Classify readiness

The task is ready for `Todo` only when all of the following are true:

- the desired outcome or observable behavior is clear;
- the affected product area or entity is clear enough to locate;
- no unresolved product decision would materially change the implementation or acceptance
  criteria;
- useful acceptance criteria can be derived without inventing requirements.

When any condition is not met, ask clarification questions instead of creating an issue. Create it
as `Backlog` only if the user then replies `backlog`. Typical incomplete inputs name only a broad
problem, leave the target or behavior ambiguous, or allow materially different product
interpretations.

Do not send work to `Backlog` merely because file paths, technical implementation details, test
names, or exact visual tokens are absent. Those details can be determined during implementation
when the product behavior is otherwise clear.

Examples:

- "Give pinned note cards a subtle, theme-consistent border while keeping the Pinned indicator" is
  ready for immediate creation as `Todo`.
- "Improve the notes UI" requires questions about the problem, affected screen, and desired
  outcome. It is not created unless the answers make it ready or the user replies `backlog`.

## Draft the issue

Create a concise, descriptive title. Do not prefix it with `Stage`, `Todo`, `Backlog`, or another
workflow label.

For a `Todo` issue, use this body structure:

```markdown
## Goal

<desired outcome>

## Requirements

- <scoped requirement>

## Acceptance criteria

- <observable completion criterion>
```

For a `Backlog` issue, record only the known scope:

```markdown
## Problem

<known problem or desired direction>

## Known scope

- <fact stated or safely implied by the user>
```

Omit empty sections. Preserve important constraints from the request. Do not invent product
decisions, unsupported edge cases, labels, assignees, milestones, or issue types.

For a `Backlog` issue, add one comment after the project status is set. Mention the authenticated
GitHub user who invoked the workflow:

```markdown
@<authenticated-login>, this issue still needs clarification.

## Questions to refine

- <material product question>
```

Include the unanswered questions from the clarification exchange, updated to remove anything the
user already resolved. Do not add questions about implementation details the agent can discover.

## Execute and verify

Before the first write, state the exact repository, proposed issue title, project, selected status,
and whether a clarification comment will be added. This is an execution update, not a confirmation
request.

Perform writes in this order:

1. Create the issue.
2. Add the created issue to Project #1.
3. Set the exact `Status` field to the selected option.
4. If the selected status is `Backlog`, add the clarification comment.
5. Read the issue and project item back to verify the issue binding and final status.

If a later step fails, do not create a replacement issue. Report the existing issue link and the
exact incomplete step so a retry can resume that item without duplication.

## Handoff

Return:

- the issue link;
- the final `Todo` or `Backlog` status;
- one short reason for the final classification;
- for `Backlog`, the clarification questions added as a comment;
- any partial failure or blocker.

Do not implement the issue after creating it.
