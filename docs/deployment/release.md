# Desktop release candidate (0.1.0)

This document is the operator checklist for turning a verified Windows x64 installer into a
controlled `0.1.0` release candidate. Architecture decisions live in
[ADR 005](../decisions/005-desktop-and-hosted-service-architecture.md) and
[ADR 007](../decisions/007-release-automation.md). Packaging details live in
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

- Publishing a public GitHub Release or distributing installers without explicit operator approval.
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
| Desktop Cargo locked metadata | Release Please updates `apps/desktop/src-tauri/Cargo.lock`     |
| Release Please tracking       | `.release-please-manifest.json` must match root `package.json` |
| Installer file name           | `Nestra_{version}_x64-setup.exe`                               |

Run the synchronization check locally or in CI:

```bash
pnpm check:product-version
```

`pnpm verify` includes this check. Workspace package versions under `apps/` and `packages/` are
internal metadata and must not be presented as the product version.

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
- `draft: true` creates draft GitHub Releases so publication remains an explicit operator step.
- `force-tag-creation: true` creates the release tag immediately at the immutable release commit so
  subsequent Release Please runs can find the correct previous version while the release stays a
  draft.
- Do not create local tags during development or agent workflows.

On pushes to `main`, Release Please analyzes Conventional Commits and maintains one release PR that
updates `CHANGELOG.md`, the root product version, the Release Please manifest, and the desktop
Cargo package and lockfile versions. Merging that PR after explicit operator approval creates a
draft GitHub Release and the corresponding tag at the exact release commit. Creating the tag does not publish
the draft or expose its installer assets; publishing remains a later explicit operator action. Do
not merge the release PR until the checklist below is complete and the operator explicitly approves
publication preparation.

The release workflow only post-processes the pull request returned by the current Release Please
run. It confirms that the live pending pull request contains the exact `main` commit that triggered
the workflow, rejects any version that is not strictly greater than the version on that commit, and
checks complete product-version synchronization before pushing. It does not merge `main` into an
older pending release branch. The workflow also formats the generated `CHANGELOG.md` using the
repository Prettier configuration and starts CI for the resulting commit, including approval of the
trusted bot-triggered checks when GitHub requires it. Release pull requests should therefore remain
formatting-clean without a manual follow-up commit.

Do not manually add a dated `0.1.0` heading to `CHANGELOG.md` before the release PR. Release Please
owns the technical release history. In-app product notes remain curated localization content and
must not parse `CHANGELOG.md` at runtime.

User-facing issue pull requests maintain the pending in-app entry incrementally according to
`docs/workflows/agent-task-workflow.md`. Before merging a Release Please PR, confirm that the pending
entry matches the version selected by Release Please and has the intended publication date. A
separate aggregate pull request should not be needed to reconstruct product notes at release time.

## Associating the Windows installer with a release candidate

Workflow: `.github/workflows/desktop-release-assets.yml`

Triggers:

1. Automatic after Release Please creates a draft GitHub Release: the release-please workflow
   dispatches this workflow with the pending tag name and exact release commit.
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

Complete before merging a Release Please PR or publishing a draft release:

1. Parent epic `#12` and its seven desktop/delivery sub-issues (`#40`, `#20`, `#47`, `#41`,
   `#42`, `#43`, `#44`) are complete.
2. `pnpm verify` passes on the intended release commit.
3. `pnpm check:product-version` passes.
4. Signed Windows packaging has produced the installer, `.sig`, and validated `latest.json` for
   the intended version.
5. Clean-machine smoke test from [`desktop.md`](./desktop.md) passes against the hosted API,
   including an acceptable first-request cold start.
6. Hosted health, authentication, and owned Notes operations work while the developer coding
   machine can be offline from the API process.
7. Draft GitHub Release exists or will be created by merging the Release Please PR.
8. Desktop release-assets workflow has attached and validated all updater assets on that release.
9. The curated in-app notes match the target version and publication date, include both supported
   languages, and contain no secrets or private user data.
10. Important GitHub Release changelog entries use direct, satisfying product language rather than
    generic implementation phrases, while remaining accurate about user-visible behavior.
11. Operator explicitly approves merging the Release Please PR and later publishing the draft
    release.

## Rollback considerations

| Situation                                             | Response                                                                                                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
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

## Explicit publication gate

Autonomous agents and CI must not:

- merge a Release Please PR without explicit operator approval;
- publish a draft GitHub Release without explicit operator approval;
- create local release tags;
- distribute installers as a public release outside the draft/testable flow above.

A plain approval in conversation or an intentional dashboard action by the repository owner is
required before any public `0.1.0` publication.
