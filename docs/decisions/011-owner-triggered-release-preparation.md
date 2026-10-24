# 011 — Owner-triggered release preparation

## Status

Accepted

## Context

ADR 007 established Release Please as the source of product version bumps, the technical
changelog, release tags, and draft GitHub Releases. Its original trigger ran Release Please after
every push to `main`. That kept a release pull request continuously updated even when the repository
owner intentionally wanted to accumulate several small changes without preparing a new version.

The owner must control when a release candidate is prepared without manually choosing a version or
reconstructing the changelog. Merging an approved candidate should still finalize the matching tag
and draft release automatically, while an ordinary merged pull request must never enter that path.

## Decision

Split the Release Please workflow into three event-specific responsibilities:

- A repository owner starts `workflow_dispatch` from the `main` workflow ref when a release
  candidate is wanted. The workflow always targets the latest `main`; it accepts no version input.
  Release Please derives the SemVer bump from Conventional Commits and is configured to prepare or
  update the release pull request without creating a GitHub Release in this mode.
- A push to `main` never runs Release Please. It only finds an already-open, trusted Release Please
  pull request and updates the `release-candidate/current-main` commit status. A candidate that no
  longer contains the latest `main` receives a failing status and must be regenerated with the
  manual preparation workflow.
- The active `main` ruleset requires `release-candidate/current-main` with strict current-branch
  enforcement. Ordinary pull requests receive that status from a lightweight guard job. The
  reserved Release Please branch receives it only from the manual preparation workflow after its
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
`skip-github-pull-request` modes respectively. This prevents a manual preparation run from
finalizing an unrelated older candidate and prevents the merge event from creating or updating a
new candidate.

The generated GitHub Release remains a draft. Publishing it is a separate explicit owner action.
The existing Release Please configuration remains responsible for version synchronization,
pre-1.0 bump behavior, tag format, and draft creation.

## Consequences

- Merging ordinary feature, fix, documentation, or maintenance pull requests does not create or
  update a release pull request.
- Several changes can accumulate on `main` until the owner deliberately chooses **Run workflow**
  for **Release Please**.
- The owner chooses release timing but not a hand-written version. Conventional Commits remain the
  version policy and Release Please remains the implementation.
- A candidate becomes stale as soon as `main` advances. Its failing freshness status is visible on
  the pull request, the `main` ruleset blocks its merge, and finalization also refuses to create a
  tag or draft from it.
- Merging the trusted, current Release Please pull request is the single approval that creates the
  tag and draft release; no second manual workflow dispatch is required.
- Publication and public installer distribution remain explicit owner decisions outside CI and
  autonomous agent authority.

## Alternatives considered

- Keep preparing a release pull request after every push to `main`: rejected because it removes the
  owner's control over when a version is proposed and creates noise for batches of small changes.
- Require the owner to enter a version during manual dispatch: rejected because it duplicates
  Conventional Commit policy and creates a new opportunity for version drift.
- Require a second manual dispatch after merging the release pull request: rejected because the
  merge itself is already an explicit approval and can safely trigger finalization after strict
  pull request identity checks.
- Replace Release Please with a custom versioning script: rejected because Release Please already
  provides the required changelog, synchronized version updates, tags, and draft releases.
