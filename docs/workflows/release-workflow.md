# Autonomous release workflow

This document is the single source of truth for the owner-authorized Nestra release lifecycle. It
is tool-neutral and applies to Codex, Cursor agents, and any other coding agent working in this
repository.

`AGENTS.md`, `docs/deployment/release.md`, the active specification, ADR 007, ADR 011, and the
checked-in GitHub Actions workflows remain authoritative for repository rules, release policy, and
technical implementation. This workflow orchestrates those controls instead of replacing them.

## Invocation and authorization

Run this workflow only when:

- the first non-empty line of the current user message is exactly `/release`; or
- the user explicitly selects or attaches the repository `$release` skill for the current message.

The explicit invocation authorizes the agent to complete the entire release lifecycle described
here without another confirmation: dispatch the Release Please preparation workflow, review and
merge the exact trusted release pull request, allow automation to create its tag and draft release,
validate the exact updater artifacts, and publish that draft release.

Do not run this workflow merely because `/release`, `$release`, or release-related text appears in
a code block, quotation, pasted documentation, task description, example, acceptance criterion, or
ordinary conversation. Do not infer authorization from a request to create, update, document, or
explain this workflow.

Use the configured GitHub integration for GitHub Actions, pull requests, checks, tags, releases, and
assets. Fall back to GitHub CLI only when the integration cannot perform a required operation. Do
not create local release tags.

## Non-negotiable safety rules

- Operate only on the Nestra repository and the `main` release line.
- Never prepare more than one Release Please candidate concurrently.
- Never merge a pull request whose identity, head, base, author, label, freshness, or required
  checks differ from the expected release candidate.
- Never publish a draft selected only by recency or title. Bind every action to the exact version,
  tag, release ID, and release commit derived from the verified candidate.
- Never publish without the complete validated Windows updater asset set.
- Never force, move, recreate, or delete an existing release tag as part of this workflow.
- Never publish or modify an unrelated pre-existing draft.
- Stop before the next irreversible action when state is missing, failing, ambiguous, or
  suspicious. Report the exact blocker and preserve the resumable state.

## 1. Reconstruct the release state

Read current GitHub state before dispatching, merging, tagging, or publishing anything:

1. Resolve the current `main` SHA.
2. Resolve the latest published Nestra release and its tag, version, and target commit.
3. Inspect open and recently merged pull requests on the reserved branch
   `release-please--branches--main--components--nestra`.
4. Inspect active and recent runs of `.github/workflows/release-please.yml` and
   `.github/workflows/desktop-release-assets.yml`.
5. Inspect draft releases and tags that could belong to an in-progress release.
6. Determine whether Conventional Commits since the latest published release contain a releasable
   `feat`, `fix`, or breaking change. Non-bumping commits alone are not a reason to release.

Choose exactly one state:

- **Nothing to release:** no trusted candidate or matching draft is in progress and no releasable
  commit exists after the latest published release. Finish successfully without dispatching a
  workflow, creating a pull request, tag, draft, or release.
- **Preparation in progress:** a trusted workflow run or open candidate exists. Resume it; do not
  dispatch a duplicate run.
- **Finalization in progress:** the trusted candidate was merged and its finalizer, tag creation,
  draft creation, or asset workflow is pending or running. Resume observation of that exact merge;
  do not dispatch preparation or create another candidate.
- **Draft in progress:** the trusted candidate was merged and its matching tag or draft exists.
  Resume artifact validation and publication; do not prepare another candidate.
- **Already published:** the release for the current releasable state is already published. Finish
  successfully without changing GitHub state.
- **New release required:** releasable commits exist and no release operation is in progress.
  Continue with preparation.
- **Ambiguous or conflicting:** multiple candidates, drafts, tags, or runs could represent the same
  release, or their identities conflict. Stop and report the evidence.

This classification is the duplicate-release guard. A second `/release` invocation must resume the
same release or return a no-op; it must never create another release for the same state.

## 2. Prepare or resume the Release Please candidate

When a new release is required, dispatch the **Release Please** workflow from the exact current
`main` ref with no version input. Record the workflow run ID and the `main` SHA used for dispatch.

Wait for the run to finish and inspect its complete result. While waiting, provide concise progress
updates at least once per minute. A cancelled, timed-out, or failed run is a blocker. If Release
Please reports that no release pull request is required, re-check the Conventional Commit history
and finish as a no-op only when it contains no releasable change.

Resolve the resulting candidate by its reserved branch and validate all of the following:

- exactly one open pull request exists for that branch;
- its repository owner and head repository are `michalrozek90/nestra`;
- its base branch is `main`;
- its head branch is `release-please--branches--main--components--nestra`;
- its author is `github-actions[bot]`;
- it has the `autorelease: pending` label;
- its candidate history contains the exact recorded current `main` SHA;
- `release-candidate/current-main` succeeds on the exact candidate head;
- the candidate version is greater than the latest published version; and
- all product version consumers agree with the candidate version.

The preparation workflow promotes the exact current `main` `Unreleased` collection after Release
Please selects the candidate version. It uses the preparation run's UTC date as the planned
publication date, clears `Unreleased` on the candidate, preserves released history against the
recorded `main` SHA, and creates no in-app entry when no curated notes are pending. A repeated run
must update the same pending promotion idempotently rather than append another version entry.

If `main` advances before merge, do not merge the stale candidate. Re-run preparation once, then
repeat all identity, content, freshness, and check validation against the updated candidate.

## 3. Review the candidate

Review the complete pull-request diff and generated release content before merging. Confirm that:

- changes are limited to the files Release Please is configured to update and the expected curated
  in-app release-note data;
- `CHANGELOG.md` describes the accumulated release accurately and contains no secrets or private
  user data;
- the version bump agrees with Conventional Commit policy;
- root package, manifest, Tauri, Cargo package, and Cargo lock versions are synchronized;
- curated in-app notes follow the active release-note model, contain concise English and Polish
  copy, preserve older entries, leave no unpromoted copy, and target the selected version and the
  publication date planned by the release-preparation run;
- no unexpected dependency, workflow, application-code, binary, deletion, history rewrite, or
  unrelated file change is present; and
- repository release-policy checks and all required CI checks pass on the exact candidate head.

The required checks include `Quality gate`, `API persistence`, and
`release-candidate/current-main`. Inspect check conclusions rather than assuming success from a
green pull-request summary.

Do not require a separate manual application test of the release pull request. Product behavior is
tested during its ordinary feature and fix pull requests; this gate reviews the generated release
delta, CI, identity, and release integrity.

If anything is suspicious or incomplete, stop without merging and report the file, check, commit,
or identity that failed review.

## 4. Merge and bind the release identity

Immediately before merge, re-read the pull request and its exact head SHA. Reconfirm that it is
open, not a draft, mergeable, current with `main`, and still satisfies every check in sections 2
and 3. Merge it using the repository's established merge method.

Record the merged pull-request number, merge commit SHA, selected version, and expected `v`-prefixed
tag. These values define the only release this invocation may publish.

Wait for the release finalizer. Verify that it creates the expected immutable tag and a unique,
non-prerelease draft GitHub Release whose target commit is the recorded merge commit. Stop if the
tag, target commit, release ID, version, or draft state differs.

## 5. Validate updater assets

Wait for the desktop release-assets workflow associated with the recorded tag and commit. A failed,
cancelled, timed-out, or missing run is a blocker. Do not substitute artifacts from another run or
release.

Read the exact draft again by its recorded release ID and require all three assets:

- `Nestra_{version}_x64-setup.exe`;
- `Nestra_{version}_x64-setup.exe.sig`;
- `latest.json`.

Validate that `latest.json`:

- contains the recorded version;
- contains both supported Windows x64 updater entries;
- points both entries to the exact installer asset URL on the recorded release; and
- contains a non-empty signature matching the uploaded `.sig` file without printing the signature.

Also confirm that the draft is still non-prerelease, still targets the recorded merge commit, and
contains no unexpected replacement assets. Stop before publication on any mismatch.

## 6. Publish and verify

Publish the exact validated draft release by its immutable release ID. Do not ask for another
confirmation: the explicit `/release` invocation already authorized this step.

After publication, read the release again and verify that:

- it is published and is not a draft or prerelease;
- its tag, version, target commit, and release ID match the recorded values;
- all three validated assets remain attached; and
- no duplicate open Release Please candidate or duplicate release exists for that version.

Return a concise report with the published version and release link, merged release pull request,
verified commit and tag, artifact-validation result, and whether this invocation created, resumed,
or safely skipped the release.

## Failure recovery

Every step is resumable. On the next explicit `/release` invocation, reconstruct state again and
continue after the last verified boundary. Do not repeat a completed dispatch, merge, tag creation,
asset upload, or publication.

If preparation or checks fail, leave the candidate open. If finalization or packaging fails, leave
the matching draft unpublished. If publication status cannot be confirmed after a mutation, query
the exact release ID before retrying. Never convert uncertainty into a second release.
