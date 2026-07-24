# 001 — Contracts build strategy

## Status

Accepted

## Context

The API and Expo client share framework-independent Zod contracts. Both CommonJS and ESM
consumers must resolve the package without importing private source files or depending on a
workspace-specific TypeScript transpilation setup.

## Decision

`@nestra/contracts` is built with tsdown into CommonJS, ESM, declaration files, and source maps.
Its package exports point only to generated artifacts. Root build, type-check, migration, seed, and
standalone development scripts build contracts before starting a consumer. The combined
development command builds once and then runs the contracts watcher beside the API and client.

The root product version is injected while contracts are built, so every consumer receives the
same version without reading files outside its runtime boundary.

Contracts builds do not clean `packages/contracts/dist`, and NestJS builds do not delete
`apps/api/dist`. Development watchers and verification commands share these output directories,
so deleting either directory while another process consumes it can leave the API watcher alive
without a running API process. Successful builds overwrite their owned artifacts in place instead.
The root development command stops all watchers when any one of them exits, including an
unexpected successful exit, so it cannot leave a misleading partial development environment.
Because Nest CLI deliberately keeps its watcher alive when the spawned API process exits, the root
command also monitors the API port. It allows 30 seconds for initial startup and 15 seconds for a
normal hot reload, then exits with an error when the API remains unavailable.

## Consequences

Consumers use stable package exports and remain independent of the contracts source layout.
Commands that consume contracts have a small initial build cost. Product-version changes require
rebuilding contracts, which the supported root commands enforce.

Builds may leave an obsolete generated file after a source file is removed or renamed. Generated
output is not committed, and a fresh dependency installation or manual removal of the affected
`dist` directory restores a clean output tree. Avoid cleaning either directory while development
watchers are active.

## Alternatives considered

- Importing contracts through relative paths was rejected because it couples consumers to private
  source files and breaks package boundaries.
- Publishing TypeScript source through package exports was rejected because Metro and Node would
  need different consumer-specific transpilation behavior.
- Maintaining separate ESM and CommonJS source implementations was rejected because it would
  duplicate contract logic.
