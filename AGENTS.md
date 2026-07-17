# Nestra repository instructions

The authoritative specification is `docs/specifications/nestra-initial-application.md`; progress
is tracked in `docs/implementation-status.md`.

- Read the specification, this file, and the tracker before every implementation run.
- Implement exactly the first incomplete stage and stop after verifying and updating it.
- Use pnpm only. Do not use npm, npx, Yarn, or Bun.
- Keep TypeScript strict and never use `any`; safely narrow `unknown` values.
- Run every verification command for the active stage before marking it complete.
- Never log credentials, tokens, auth headers, secrets, note content, drafts, or other private
  user data.
- Do not commit, tag, push, change branches, change remotes, or open pull requests without
  explicit user approval.
- Preserve existing work and document blockers honestly.
