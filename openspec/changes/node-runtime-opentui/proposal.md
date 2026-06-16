## Why

The project currently requires Bun at runtime, which blocks standard npm and `npx` usage even though the OpenTUI board itself can run in a Node/npm ecosystem. Migrating the runtime to Node-compatible entrypoints unlocks normal npm distribution while preserving the existing TUI, daemon, and loop behavior.

## What Changes

- Replace the Bun-only runtime path with a Node/npm-compatible CLI entrypoint and script layout
- Keep the OpenTUI board behavior and UX intact under the new runtime
- Audit and replace Bun-specific APIs, startup assumptions, and packaging details with Node-compatible equivalents
- Update package distribution so `npm i -g loop-task` and `npx loop-task` are supported without requiring Bun at runtime
- **BREAKING**: local development and release workflow may change from Bun-first commands to Node/npm-compatible commands where necessary

## Capabilities

### New Capabilities
- `node-runtime-compat`: Run the CLI, daemon, and OpenTUI board from a Node/npm runtime without requiring Bun to be installed
- `npm-distribution`: Support standard npm global install and `npx loop-task` execution with correct runtime packaging

### Modified Capabilities

## Impact

- CLI entrypoint and packaging (`src/cli.ts`, `package.json`, bin/runtime config)
- Daemon startup and IPC compatibility under Node on Windows and POSIX
- Board/OpenTUI startup path and crash behavior under Node runtime
- Tooling and verification commands for local development and publishing
- No required changes to persisted loop state shape or IPC request/response contract if runtime migration is done compatibly
