# Code signing policy

## Status

Nestra is preparing an application to the SignPath Foundation open-source program. The project
has not yet been accepted, and current Windows binaries must not be represented as Authenticode
signed.

After acceptance, signed release documentation will include the required attribution:

> Free code signing provided by [SignPath.io](https://signpath.io/), certificate by
> [SignPath Foundation](https://signpath.org/).

The Tauri updater signature already used by Nestra verifies update-package integrity. It is
separate from Windows Authenticode publisher signing and does not replace it.

## Source and build origin

- Canonical source repository: <https://github.com/michalrozek90/nestra>
- Release source: an exact commit on the public repository associated with the corresponding
  version and GitHub Release.
- Build environment: repository-owned GitHub Actions workflows on hosted Windows runners.
- Dependencies: pnpm uses a frozen lockfile, Rust uses the committed Cargo lockfile, and reusable
  GitHub Actions are pinned to full commit SHAs.
- Signed artifacts may only be produced from the repository's reviewed source and build scripts.
  Locally supplied or manually modified binaries are not eligible for signing.

Third-party open-source libraries may remain unsigned inside the application package and retain
their own licenses. Nestra's signing identity must not be used to sign unrelated or upstream
projects.

## Team roles

- Committer and reviewer: [Michał Rożek (`michalrozek90`)](https://github.com/michalrozek90)
- Signing approver: [Michał Rożek (`michalrozek90`)](https://github.com/michalrozek90)

Repository and signing-service access requires multi-factor authentication. Changes proposed by
people without commit access require review by a trusted project member before merge. Every
SignPath signing request requires a separate manual approval by the signing approver.

## Release controls

Before a signing request can be approved:

1. The release must be built from the exact public release commit.
2. Repository formatting, linting, strict type checking, version synchronization, and required
   builds must pass.
3. The Windows packaging workflow must validate the release version, source commit, updater
   signature, and published asset metadata.
4. The approver must verify that the request belongs to Nestra and contains only expected build
   outputs.

The signing integration must fail closed: a failed or missing Authenticode signature cannot be
silently treated as a signed public release.

## Privacy and security

Nestra's data handling is described in the [privacy notice](../../PRIVACY.md). Security or signing
concerns should be sent privately to
[michalrozek90@gmail.com](mailto:michalrozek90@gmail.com). Do not include passwords, tokens,
private keys, note content, or other personal data in reports.

If a signing credential or release workflow is suspected of compromise, signing and publication
must stop until the incident is investigated. Affected certificates or releases must be revoked
or withdrawn when required.
