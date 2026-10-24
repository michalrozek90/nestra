# Desktop release process

This document is the operator reference for preparing, validating, and publishing a controlled
Windows x64 release. The autonomous orchestration steps live in
[`release-workflow.md`](../workflows/release-workflow.md). Architecture decisions live in
[ADR 005](../decisions/005-desktop-and-hosted-service-architecture.md) and
[ADR 007](../decisions/007-release-automation.md), with owner-triggered preparation defined by
[ADR 011](../decisions/011-owner-triggered-release-preparation.md) and the curated note lifecycle in
[ADR 012](../decisions/012-curated-release-note-lifecycle.md). Packaging details live in
[`desktop.md`](./desktop.md). Hosted API and database details live in
[`hosted-api.md`](./hosted-api.md).

## Goals and non-goals

Goals:

- Automate product-version preparation and technical changelog generation with Release Please.
- Keep product version values synchronized across the client, Tauri shell, installer, and release
  asset naming.
- Attach the signed NSIS updater package, its `.sig`, and `latest.json` to a draft GitHub Release.
- Document hosted-API dependency, cold-start expectations, rollback, and the absence of a custom
  domain for the family/demo phase.

Non-goals:

- Publishing a public GitHub Release or distributing installers without an explicit `/release` or
  `$release` invocation from the repository owner.
- Buying or configuring a custom domain.
- macOS or Linux releases, prerelease update channels, or purchased Authenticode code signing.
- Relax audio, R2 provisioning, user uploads, or notifications.

## Version source of truth

The root `package.json` `version` is the only product version.

| Consumer                      | Synchronization mechanism                                      |
| ----------------------------- | -------------------------------------------------------------- |
| Expo app / runtime version    | `apps/client/app.config.ts` imports root `package.json`        |
| API / contracts diagnostics   | `packages/contracts` injects root version at build time        |
| Tauri application / installer | `tauri.conf.json` → `../../../package.json`                    |
| Desktop Cargo crate metadata  | Release Please updates `apps/desktop/src-tauri/Cargo.toml`     |
| Desktop Cargo locked metadata | Release Please updates the annotated package in `Cargo.lock`   |
| Release Please tracking       | `.release-please-manifest.json` must match root `package.json` |
| Installer file name           | `Nestra_{version}_x64-setup.exe`                               |

Run the synchronization check locally or in CI:

```bash
pnpm check:product-version
pnpm check:release-notes
pnpm check:release-workflow
```

`pnpm verify` includes both checks. The release-workflow policy check guards owner-triggered
preparation, stale-candidate, trusted-finalization, explicit skill invocation, and duplicate-release
boundaries. Workspace package versions under `apps/` and `packages/` are internal metadata and must
not be presented as the product version.

## Release Please automation

Checked-in files:

- `release-please-config.json`
- `.release-please-manifest.json`
- `CHANGELOG.md`
- `.github/workflows/release-please.yml`

Bootstrap choices validated against current Release Please manifest documentation:

- Manifest starts at `0.0.0`, matching the current root product version.
- First Conventional Commit-driven release therefore targets `0.1.0`, not `1.0.0`.
- One repository-wide component at `.` with `release-type: node`.
- Tags use the `v` prefix and omit a component name (`v0.1.0`).
- `bump-minor-pre-major: true` prevents pre-1.0 breaking changes from forcing `1.0.0`.
- `draft: true` keeps the GitHub Release private until updater assets are validated; an explicit
  `/release` invocation authorizes the agent to publish that exact validated draft.
- `force-tag-creation: true` creates the release tag immediately at the immutable release commit so
  subsequent Release Please runs can find the correct previous version while the release stays a
  draft.
- Do not create local tags during development or agent workflows.

Release Please does not prepare a version after ordinary pushes to `main`. When the repository
owner decides that the accumulated changes should ship, invoke `/release` in Cursor Agent Chat or
select `$release` in Codex. That single invocation authorizes the complete lifecycle defined in
`docs/workflows/release-workflow.md`:

1. Reconstruct current release state and exit without changes when no version-bumping Conventional
   Commit exists since the latest published release.
2. Dispatch **Release Please** from the exact current `main`, or resume an existing trusted run,
   candidate, tag, or draft. There is no version input.
3. Review the generated changelog, synchronized version files, curated in-app notes, exact candidate
   identity, freshness, and required CI checks.
4. Merge the verified Release Please pull request automatically. If `main` advanced, refresh and
   revalidate the candidate first.
5. Wait for the exact tag, draft release, signed installer, `.sig`, and `latest.json`; validate their
   version, target commit, URLs, and signature relationship.
6. Publish the exact validated draft and verify the resulting public release.

The owner chooses when the release begins, while Release Please continues to choose the SemVer bump
and update `CHANGELOG.md`, the root product version, the Release Please manifest, and the desktop
Cargo package and lockfile versions. A repeated `/release` resumes the same release or completes as
a no-op; it must not create a duplicate candidate, tag, or release.

The Actions **Run workflow** control remains an operator recovery tool. Starting it directly only
prepares the candidate; it does not grant an agent permission to merge or publish. Use `/release`
for the normal end-to-end path.

Preparation only post-processes the pull request returned by that owner-triggered Release Please
run. It confirms the trusted bot identity and branch pair, requires the candidate to contain the
exact current `main` commit, rejects a non-increasing version, and checks complete product-version
synchronization before pushing. It promotes the current curated `Unreleased` collection to the
version selected by Release Please, uses the UTC date of the owner-authorized release attempt as the
planned publication date, clears `Unreleased` on the candidate, and preserves all released history.
Re-running preparation is idempotent: it refreshes the same candidate entry, and a changed candidate
version replaces the prior pending promotion rather than creating a duplicate. An empty
`Unreleased` collection remains a valid maintenance release and creates no empty in-app entry. The
workflow does not merge `main` into an older pending release branch. It also formats the generated
`CHANGELOG.md`, validates curated notes against the exact `main` baseline, marks the exact candidate
commit as current, and starts CI for it.

Finalization runs only for a merged pull request that positively matches the expected Release
Please bot, same-repository branch, `main` base, and `autorelease: pending` label. It additionally
requires the successful freshness status and refuses finalization if the candidate did not contain
its final base commit, either required CI job did not pass, or `main` advanced after the merge.
Arbitrary merged pull requests therefore cannot create a release through this workflow.

The repository ruleset **Require current main for release candidates** requires the
`release-candidate/current-main` status and enforces an up-to-date branch. A lightweight guard
grants that status to the exact head commit of ordinary pull requests. Same-repository pull requests
use the regular event; forks use trusted `pull_request_target` without checking out or executing
pull-request code. The reserved Release Please branch can receive the status only from the
owner-triggered preparation path after the workflow validates the bot identity and exact current
`main` commit. Release Please uses `always-update` so rerunning preparation refreshes an existing
candidate even when newly merged maintenance commits do not alter its release notes. Keep this
ruleset active; without it, the finalizer would still reject a stale merge, but GitHub would no
longer block that merge in advance.

Do not manually add a dated `0.1.0` heading to `CHANGELOG.md` before the release PR. Release Please
owns the technical release history. In-app product notes remain smaller, curated, typed, local and
offline-capable content; the application never parses `CHANGELOG.md` at runtime.

Notable user-facing issue pull requests append stable identifiers to `unreleased` in
`apps/client/src/features/releases/release-notes-data.json` and exact English and Polish copy to the
paired `release-note-changes.json` resources. Ordinary work never guesses a version or release date.
Before merging a Release Please PR, confirm that `Unreleased` is empty on the candidate, the optional
promoted entry matches the selected version and planned date, and `pnpm check:release-notes` passes.
A separate aggregate pull request is not needed to reconstruct product notes at release time.

## Associating the Windows installer with a release candidate

Workflow: `.github/workflows/desktop-release-assets.yml`

Triggers:

1. Automatic after the verified Release Please PR is merged and finalization creates a draft GitHub
   Release: the release-please workflow dispatches this workflow with the pending tag name and exact
   release commit.
2. Manual: `workflow_dispatch` with an existing draft `tag_name` such as `v0.2.0`; the commit is
   resolved from the draft when `release_sha` is omitted.

Behavior:

1. Resolve the unique non-prerelease draft by its pending tag name.
2. Verify its target is an exact commit, compare it with the SHA supplied by Release Please when
   present, and check out that immutable commit independently of tag availability.
3. Verify the pending tag name matches the root product version and revalidate the draft identity
   and target commit after checkout.
4. Build the Windows x64 NSIS updater with the release-only Tauri configuration and the signing
   secrets.
5. Upload `Nestra_{version}_x64-setup.exe`, its `.sig`, and `latest.json` through the pinned official
   `tauri-apps/tauri-action`.
6. Re-read the release by its immutable ID and validate its identity, target commit, all three
   assets, the manifest version, both Windows x64 updater entries, their exact installer asset URL,
   and a non-empty matching signature. Validation never prints the signature.

The packaging workflow in `.github/workflows/desktop-package.yml` continues to upload short-lived
workflow artifacts for `main` verification and manual `workflow_dispatch` runs. The release-assets
workflow is the path that associates a verified installer with a release candidate tag.

### Updater signing key operations

The release workflow requires these repository Actions secrets:

- `TAURI_SIGNING_PRIVATE_KEY` — the complete contents of the Tauri private key file;
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — the password selected when the key was generated.

The private key and its password must never be committed, pasted into logs, or placed in release
assets. Keep at least one tested backup of the private key outside the repository and store the
password separately. The `.pub` value is not secret and belongs in Tauri configuration.

Losing either the private key or its password blocks releases that can update existing installs.
Generating a new pair does not let the new key sign an update trusted by old applications. Planned
rotation therefore requires a bridge release signed with the old key whose application config
trusts the new public key; only later releases use the new private key. If the old key is already
lost or compromised, affected users must manually install a new bootstrap installer and should be
given explicit recovery instructions.

## Hosted API dependency for release candidates

The installed desktop application depends on the remotely hosted NestJS API and Neon PostgreSQL
database. It must not require the developer computer to host the API or remain online.

Current family/demo topology:

- NestJS container on a Render Free Web Service
- Neon Free PostgreSQL in a compatible European region
- Provider-assigned HTTPS endpoint (no custom domain in `0.1.0`)
- Accepted short cold start after free-tier idle spin-down

See [`hosted-api.md`](./hosted-api.md) for operator environment variables, migration procedure,
CORS origins, and the upgrade path to an always-on host. Never put secrets, connection strings, or
JWT values into release notes, workflow logs, issues, or chat.

When the API hostname changes without a custom domain, update:

1. `EXPO_PUBLIC_API_BASE_URL` / `apps/client/.env.desktop.example`
2. Tauri CSP `connect-src`
3. Hosted `CORS_ALLOWED_ORIGINS`
4. Rebuild and redistribute the desktop installer

## Release checklist

Apply each check at its corresponding pre-merge or pre-publication boundary:

1. The owner explicitly invoked `/release` or selected `$release` for this release attempt.
2. A version-bumping Conventional Commit exists after the latest published release, or the workflow
   is resuming the unique trusted candidate or draft for that state.
3. The candidate has the expected bot, repository, branch, base, label, freshness status, and exact
   required CI conclusions.
4. The generated pull-request diff contains only expected version, changelog, and curated release
   content.
5. `pnpm verify` and `pnpm check:product-version` pass on the intended release commit.
6. The curated in-app notes match the target version and publication date, include both supported
   languages, and contain no secrets or private user data.
7. Important GitHub Release changelog entries use direct, satisfying product language rather than
   generic implementation phrases, while remaining accurate about user-visible behavior.
8. The draft GitHub Release and immutable tag target the verified release merge commit.
9. Signed Windows packaging has produced the installer, `.sig`, and validated `latest.json` for the
   intended version.
10. The desktop release-assets workflow attached and validated all updater assets on that release.
11. The exact draft ID, tag, version, commit, installer URL, and signature relationship are verified
    immediately before publication.

If the release PR shows a failing `release-candidate/current-main` status, do not merge it. Run
preparation again through the same `/release` invocation, then repeat all checks on the updated
candidate.

The release workflow does not require a separate manual test of the generated Release Please pull
request. Manual product testing belongs to the ordinary feature and fix pull-request lifecycle and
may also be performed by the owner at any convenient time before invoking `/release`.

## Rollback considerations

| Situation                                             | Response                                                                                                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Release candidate is stale                            | Do not merge it; refresh it within `/release`, then repeat review and CI on the updated candidate                                              |
| Draft release has a bad installer                     | Rebuild from the tag with `desktop-release-assets` / `workflow_dispatch`, or leave the draft unpublished                                       |
| Draft release should not be published                 | Keep it draft; delete only with an intentional operator decision                                                                               |
| Published release must be withdrawn                   | Unpublish or mark the GitHub Release carefully; communicate that installs already performed are unaffected                                     |
| Hosted API regression                                 | Roll back the Render deploy / Neon migration using the controlled migration procedure; desktop installers keep working once the API is healthy |
| Wrong product version shipped in an unpublished draft | Do not publish; fix on a follow-up commit and prepare a new release PR rather than rewriting history casually                                  |

Deleting a Git tag after users may have referenced it is an intentional operator decision. Prefer
leaving a bad draft unpublished over rewriting published release history.

## Security audit notes for the scoped desktop release

Confirm before publication:

- Desktop auth secrets use OS credential storage, not browser `localStorage`, inside Tauri.
- Tauri capabilities remain minimal and CSP allow-lists only the configured API origins.
- Logs and diagnostics do not expose tokens, note content, drafts, credentials, or complete private
  payloads.
- Release assets and documentation do not embed provider secrets or private environment values.
- The signing key and password exist only in protected Actions secrets and controlled backups.
- The installer does not require the developer computer to remain online.
- No custom domain is required for the family/demo phase; the provider-assigned HTTPS endpoint is
  accepted application configuration.

## Explicit release authorization

Autonomous agents and CI must not merge a Release Please pull request or publish a draft merely
because release-related work exists. The repository owner's explicit `/release` command or
selection of `$release` is the authorization for the complete scoped lifecycle, including merge and
publication. No additional conversational gate is required after that invocation.

The agent must still stop before the next irreversible action when identity, freshness, required
checks, version synchronization, draft targeting, or updater assets cannot be verified exactly. CI
cannot publish independently, and agents must never create local release tags or distribute assets
outside the validated draft flow.
