# 008 — Signed desktop application updates

## Status

Accepted

## Context

Nestra needs a user-controlled update path for its Windows x64 desktop application. Updates must
remain compatible with the draft-first Release Please process, protect unsaved notes, avoid a
second distribution service, and not make ordinary local desktop builds depend on release secrets.
Tauri updater signatures are mandatory and establish a long-lived trust relationship with each
installed application.

## Decision

Use the official Tauri v2 updater and process plugins with these boundaries:

- Published, non-prerelease GitHub Releases are the single stable update channel. The application
  reads `latest.json` from the repository's `/releases/latest/download/` endpoint.
- Support Windows x64 NSIS only. Check once per packaged production launch after client
  initialization and allow a manual check under Settings > About. Never poll, auto-download, or
  auto-install.
- Grant only updater check/download/install and process restart capabilities. Do not grant the
  combined download-and-install permission, because local draft persistence must run between
  download and installation.
- Commit the updater public key and keep the private key and password only in GitHub Actions
  secrets and controlled backups.
- Keep updater artifact generation disabled in the base Tauri configuration. A release-only
  overlay enables it for the pinned official Tauri Action, which uploads the installer, signature,
  and manifest to an existing non-prerelease draft release.
- Require all active note editors to persist their current drafts locally before install/restart.
  Attempt pending valid API saves, but do not block on API failure when the local draft is safe.
- Treat key rotation as a bridge-release operation: an old-key-signed release introduces the new
  public key before later releases switch to the new private key.

## Consequences

- Users on an updater-capable build can choose when to download and install stable updates.
- Installs predating updater support need one manual bootstrap installation.
- Losing the private key or password prevents updating existing installs through this channel;
  generating a replacement key alone does not restore that trust.
- Ordinary `pnpm build:desktop` remains unsigned and usable without release credentials.
- Public release publication remains an explicit operator action; building and validating assets
  does not publish the draft.

## Alternatives considered

- Downloading unsigned installers in application code: rejected because it removes authenticity
  verification and duplicates Tauri's maintained updater lifecycle.
- Automatically downloading or installing after every check: rejected because users must control
  interruption and draft persistence must be visible and retryable.
- A custom update server: rejected because GitHub Releases already provides the required stable
  artifact channel for the current scale.
- Reusing the same key only until it is lost, then silently replacing it: rejected because existing
  applications cannot trust a replacement key without an old-key-signed bridge release.
