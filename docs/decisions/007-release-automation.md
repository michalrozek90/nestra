# 007 — Release automation for 0.1.0

## Status

Accepted

## Context

Nestra needs a controlled path from Conventional Commits on `main` to a versioned Windows x64
desktop release candidate. The root `package.json` version is already the product-version source
for Expo, compiled contracts metadata, Tauri configuration, and the NSIS installer name. The
repository must automate changelog preparation and version bumps without publishing a public
release, tag, or installer distribution until an explicit operator approval.

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
  After a draft release is created, the release-please workflow dispatches the Windows
  release-assets workflow so the installer can be attached without requiring a personal access
  token. Operators can also re-run that workflow manually for an existing tag.
- Release Please also updates `apps/desktop/src-tauri/Cargo.toml` `package.version` so the Rust
  crate metadata stays aligned with the product version. Tauri continues to read the installer and
  application version from root `package.json` through `tauri.conf.json`.
- After Release Please creates or updates its pull request, the same workflow finds the single open
  pull request labeled `autorelease: pending`, synchronizes its branch with `main`, formats the
  generated `CHANGELOG.md` with the repository-pinned Prettier version, and pushes the correction
  when needed. It then dispatches CI explicitly for the updated branch because a normal push made
  with `GITHUB_TOKEN` does not reliably start another workflow run.
- Workspace package versions under `apps/` and `packages/` remain internal metadata and are not
  treated as the product version.

The Windows installer association is a separate workflow. When a GitHub Release is created
(including a draft) for a tag, or when an operator dispatches the workflow with an existing tag,
CI builds `Nestra_{version}_x64-setup.exe` from that tag and uploads it to the release. The
installer talks to the hosted API documented in `docs/deployment/hosted-api.md` and does not
require the developer computer to remain online.

`pnpm check:product-version` verifies that the root product version, Release Please manifest,
Tauri version reference, Cargo package version, Expo app config wiring, and contracts version
injection stay synchronized.

## Consequences

- Version preparation and technical changelog generation become automated on pushes to `main`.
- Generated release pull requests remain formatting-clean and receive CI for their final formatted
  commit without requiring a manual changelog-only correction.
- Merging a Release Please PR still creates a Git tag and a draft GitHub Release. That merge
  remains an explicit operator action and is outside autonomous agent publication authority.
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
