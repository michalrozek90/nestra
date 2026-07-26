---
name: create
description: Clarify, create, and triage a Nestra GitHub issue from an explicit `/create <task-description>` command. Use when the first non-empty line is an actual `/create` invocation, when the user directly answers this workflow's pending clarification questions, or when the user replies `backlog` during that pending clarification; do not trigger for standalone, quoted, documented, or example commands.
---

# Create

## Overview

Use this skill as the thin entrypoint for Nestra issue intake. Do not duplicate the workflow here.

## Instructions

1. Read `AGENTS.md`.
2. Read `docs/workflows/issue-intake-workflow.md` and follow it as the single source of truth.
3. Keep an incomplete intake in the current thread and ask material clarification questions without
   writing to GitHub.
4. Treat sufficient clarification or a `backlog` reply during the pending intake as authorization
   for only the GitHub writes listed in the workflow. Do not ask for an additional confirmation.
5. Create a `Todo` issue when ready, or a `Backlog` issue with unresolved questions when the user
   chooses `backlog`.
6. Stop after the verified issue handoff. Do not implement the task.
