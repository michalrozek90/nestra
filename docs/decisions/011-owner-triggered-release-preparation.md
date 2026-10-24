# 011 — Owner-triggered release preparation

## Status

Accepted

## Context

ADR 007 established Release Please as the source of product version bumps, the technical
changelog, release tags, and draft GitHub Releases. Its original trigger ran Release Please after
every push to `main`. That kept a release pull request continuously updated even when the repository
owner intentionally wanted to accumulate several small changes without preparing a new version.

The owner must control when a release begins without manually choosing a version or reconstructing
the changelog. The release should then proceed as one resumable, agent-orchestrated operation rather
than requiring separate dashboard, merge, and publication approvals. An ordinary merged pull
request must never enter that path.

## Decision

Split the Release Please workflow into three event-specific responsibilities and expose one explicit
owner command that orchestrates them:

- A repository owner invokes `/release` or explicitly selects the repository `release` skill when a
  release is wanted. That single invocation authorizes the agent to prepare or resume the candidate,
  verify and merge it, validate the resulting draft and updater assets, and publish the exact release
  without another approval. The agent dispatches `workflow_dispatch` from the `main` workflow ref;
  the workflow accepts no version input. Release Please derives the SemVer bump from Conventional
  Commits and prepares or updates the release pull request without creating a GitHub Release in this
  mode.
- A push to `main` never runs Release Please. It only finds an already-open, trusted Release Please
  pull request and updates the `release-candidate/current-main` commit status. A candidate that no
  longer contains the latest `main` receives a failing status and must be regenerated with the
  owner-triggered preparation workflow.
- The active `main` ruleset requires `release-candidate/current-main` with strict current-branch
  enforcement. Ordinary pull requests receive that status from a lightweight guard job. The
  reserved Release Please branch receives it only from the owner-triggered preparation workflow after its
  identity and exact base commit are verified. GitHub therefore blocks a stale release candidate
  before merge rather than relying only on finalization-time detection.
- Closing a pull request runs finalization only when the pull request was merged and positively
  matches the Release Please identity: the expected same-repository branch and base, the
  `github-actions[bot]` author, and the `autorelease: pending` label. The workflow also requires the
  successful freshness status and both required CI jobs, and verifies that the candidate contained
  its final base commit. Release Please then runs with pull-request creation disabled, creates the
  tag and draft GitHub Release, and dispatches the Windows release-assets workflow with the exact
  tag and commit.

Preparation and finalization deliberately use Release Please's `skip-github-release` and
`skip-github-pull-request` modes respectively. This prevents an owner-triggered preparation run from
finalizing an unrelated older candidate and prevents the merge event from creating or updating a
new candidate.

The generated GitHub Release remains a draft until the release-assets workflow finishes. The agent
publishes only that exact draft after validating its immutable identity, target commit, version,
installer, signature, and updater manifest. The initial `/release` invocation is the explicit owner
action authorizing publication; no later conversational gate is required. The existing Release
Please configuration remains responsible for version synchronization, pre-1.0 bump behavior, tag
format, and draft creation.

Before any mutation, the agent reconstructs release state. If no version-bumping Conventional
Commit exists since the latest published release, it exits without creating a candidate. If a
trusted candidate, workflow run, tag, or draft already represents the pending release, it resumes
that release instead of creating a duplicate. Ambiguous identity, failed checks, stale state, or
invalid artifacts stop the workflow before the next irreversible step.

## Consequences

- Merging ordinary feature, fix, documentation, or maintenance pull requests does not create or
  update a release pull request.
- Several changes can accumulate on `main` until the owner deliberately invokes `/release`.
- The owner chooses release timing but not a hand-written version. Conventional Commits remain the
  version policy and Release Please remains the implementation.
- A candidate becomes stale as soon as `main` advances. Its failing freshness status is visible on
  the pull request, the `main` ruleset blocks its merge, and finalization also refuses to create a
  tag or draft from it.
- The single `/release` invocation is the approval for candidate preparation, trusted release-PR
  merge, tag and draft finalization, artifact validation, and publication.
- A repeated invocation safely resumes the same release or finishes as a no-op when nothing new is
  releasable.
- Manual application testing of the generated release pull request is not a release gate. Product
  behavior is reviewed during the ordinary feature and fix pull requests; the release workflow
  verifies generated release content, CI, identity, and updater artifacts.

## Alternatives considered

- Keep preparing a release pull request after every push to `main`: rejected because it removes the
  owner's control over when a version is proposed and creates noise for batches of small changes.
- Require the owner to enter a version during manual dispatch: rejected because it duplicates
  Conventional Commit policy and creates a new opportunity for version drift.
- Require a second manual dispatch after merging the release pull request: rejected because the
  initial `/release` invocation already authorizes finalization after strict pull-request identity
  checks.
- Require separate owner approvals for candidate merge and draft publication: rejected because the
  explicit `/release` invocation already scopes the intended release, while deterministic identity,
  freshness, CI, and artifact checks provide safer gates than repeated conversational prompts.
- Replace Release Please with a custom versioning script: rejected because Release Please already
  provides the required changelog, synchronized version updates, tags, and draft releases.
