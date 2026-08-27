# 007 — Release automation for 0.1.0

## Status

Accepted

## Context

Nestra needs a controlled path from Conventional Commits on `main` to a versioned Windows x64
desktop release candidate. The root `package.json` version is already the product-version source
for Expo, compiled contracts metadata, Tauri configuration, and the NSIS installer name. The
repository must automate changelog preparation and version bumps without publishing a public
release or distributing an installer until an explicit operator approval.

ADR numbering note: earlier planning documents referred to this decision as
`004-release-automation.md`, but ADR `004` already records the unified note document model. This
decision therefore uses the next available number.

## Decision

Use Google Release Please with a single repository-wide `node` package at the repository root:

- `release-please-config.json` and `.release-please-manifest.json` are the checked-in configuration
  and version tracking files.
- The current product version in the manifest starts at `0.0.0`, matching root `package.json`, so
  the first Conventional Commit-driven release PR targets `0.1.0` rather than `1.0.0`.
- Tags use the `v` prefix and do not include a component name (`v0.1.0`).
- `fix` commits bump patch and `feat` commits bump minor.
- `bump-minor-pre-major` is enabled so pre-1.0 breaking changes bump the minor version instead of
  forcing `1.0.0`.
- GitHub Releases created by Release Please are drafts until an operator explicitly publishes them.
  Release Please forces creation of the corresponding Git tag at the exact release commit so later
  runs can identify the previous release without reconstructing an incorrect changelog. The tag
  anchors version history but does not publish the draft or expose its installer assets. After a
  draft release is created, the release-please workflow dispatches the Windows release-assets
  workflow with both the tag name and exact release commit so the installer can be attached without
  requiring a personal access token. Operators can also re-run that workflow manually for an
  existing draft.
- Release Please also updates the `nestra-desktop` package version in both
  `apps/desktop/src-tauri/Cargo.toml` and `Cargo.lock` so the Rust crate metadata stays aligned with
  the product version. `Cargo.toml` uses the TOML updater, while the generated lockfile uses a
  scoped generic updater annotation because Release Please does not resolve the package-array
  JSONPath reliably. Tauri continues to read the installer and application version from root
  `package.json` through `tauri.conf.json`.
- After Release Please creates or updates its pull request, the same workflow operates only on the
  pull request returned by that specific action run. It verifies the live pull request identity,
  requires its branch to contain the exact triggering `main` commit, and rejects versions that are
  not strictly greater than the version on that commit. The workflow never merges `main` into an
  arbitrary pending release branch. It formats the generated `CHANGELOG.md`, verifies complete
  product-version synchronization, and only then pushes a formatting correction when needed. It
  then approves the checks GitHub creates in an `action_required` state for that trusted bot update.
  If approval is unavailable, it dispatches CI explicitly for the updated branch because a normal
  push made with `GITHUB_TOKEN` does not reliably start another workflow run.
- Workspace package versions under `apps/` and `packages/` remain internal metadata and are not
  treated as the product version.

The Windows installer association is a separate workflow. It resolves the draft through the GitHub
Releases API, verifies that the exact commit supplied by Release Please matches the draft's target
commit, checks out that immutable commit independently of tag availability, and uploads
`Nestra_{version}_x64-setup.exe` to the draft. Manual runs resolve the same exact commit from the
draft. Manifest validation compares its Windows download URL with the immutable API URL of the
installer asset returned by GitHub, matching the contract of the pinned Tauri action without
accepting an unrelated asset. The installer talks to the hosted API documented in
`docs/deployment/hosted-api.md` and does not require the developer computer to remain online.

`pnpm check:product-version` verifies that the root product version, Release Please manifest,
Tauri version reference, Cargo manifest and lockfile package versions, Expo app config wiring, and
contracts version injection stay synchronized. Desktop builds pass `--locked` to Cargo so a stale
lockfile fails instead of being modified during packaging.

## Consequences

- Version preparation and technical changelog generation become automated on pushes to `main`.
- Generated release pull requests remain formatting-clean and receive CI for their final formatted
  commit without requiring a manual changelog-only correction.
- A stale `autorelease: pending` pull request cannot be revived by an unrelated workflow run, and a
  release candidate cannot lower or desynchronize the product version.
- Merging an explicitly approved Release Please PR creates a draft GitHub Release and its Git tag at
  the exact release commit. Publishing the draft remains a separate explicit operator action
  outside autonomous agent publication authority.
- Draft releases allow installer attachment and smoke testing without a public release
  publication.
- Operators must still follow the release checklist for hosted-API readiness, cold-start
  expectations, rollback, and security review before publishing.
- Moving to `1.0.0` remains a deliberate decision rather than an automatic consequence of a
  breaking Conventional Commit before 1.0.

## Alternatives considered

- Manual version bumps and changelog edits: rejected because they drift quickly across Expo,
  Tauri, installer metadata, and release assets.
- Publishing non-draft GitHub Releases automatically: rejected because the family/demo phase
  requires an explicit publication gate.
- Treating Release Please as the packaging workflow: rejected because Windows NSIS packaging
  remains a separate Windows runner concern; Release Please only prepares version and changelog
  state.
