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

## Consequences

Consumers use stable package exports and remain independent of the contracts source layout.
Commands that consume contracts have a small initial build cost. Product-version changes require
rebuilding contracts, which the supported root commands enforce.

## Alternatives considered

- Importing contracts through relative paths was rejected because it couples consumers to private
  source files and breaks package boundaries.
- Publishing TypeScript source through package exports was rejected because Metro and Node would
  need different consumer-specific transpilation behavior.
- Maintaining separate ESM and CommonJS source implementations was rejected because it would
  duplicate contract logic.
