---
name: release
description: Run the complete Nestra release workflow only after an explicit `/release` command or explicit selection of this `$release` skill. Prepare or resume the Release Please candidate, verify and merge it, validate the draft and updater assets, and publish the release. Do not trigger for quoted, documented, example, or conversational mentions of releases.
---

# Release

## Overview

Use this skill as the thin entrypoint for the owner-authorized Nestra release workflow. Do not
duplicate the workflow here.

## Instructions

1. Read `AGENTS.md`.
2. Read `docs/workflows/release-workflow.md` and follow it as the single source of truth.
3. Confirm that the current message explicitly invokes `/release` or explicitly selects this
   `$release` skill before performing any release mutation.
4. Treat that invocation as authorization for the complete scoped lifecycle: prepare or resume the
   candidate, review and merge the trusted Release Please pull request, validate the exact draft and
   updater assets, and publish that release without another confirmation.
5. Reconstruct the current release state before acting. Resume an incomplete release and return a
   successful no-op when no releasable changes exist; never create a duplicate candidate, tag, or
   release.
6. Stop before merge or publication and report the evidence when any identity, freshness, check,
   artifact, or release validation is missing, failing, ambiguous, or suspicious.
