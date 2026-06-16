## 1. Runtime Audit

- [x] 1.1 Inventory every Bun-specific runtime, script, and packaging dependency across `package.json`, CLI entrypoints, daemon startup, and board bootstrap <!-- agent: development-engineer, modeltype: build -->
- [x] 1.2 Identify Node-compatible replacements for Bun-only execution assumptions and document any OpenTUI runtime constraints on Windows and POSIX <!-- agent: development-engineer, modeltype: build -->

## 2. Distribution Pipeline

- [x] 2.1 Add a build pipeline that emits Node-executable runtime artifacts for the CLI, daemon, and board entrypoints <!-- agent: development-engineer, modeltype: build -->
- [x] 2.2 Update `package.json` bin/export/publish configuration so npm global install and `npx loop-task` execute the built Node entrypoint <!-- agent: development-engineer, modeltype: build -->

## 3. Runtime Migration

- [x] 3.1 Refactor the CLI bootstrap so default board mode, `start`, and `run` execute under Node without requiring Bun at runtime <!-- agent: development-engineer, modeltype: build -->
- [x] 3.2 Replace or isolate Bun-only runtime APIs and assumptions in daemon spawn, IPC client/server startup, and file watching/log follow behavior <!-- agent: development-engineer, modeltype: build -->
- [ ] 3.3 Validate that the OpenTUI board bootstrap and action flows still work correctly under the Node runtime <!-- agent: development-engineer, modeltype: build --> BLOCKED: OpenTUI native FFI only supports Bun

## 4. Verification And Docs

- [ ] 4.1 Verify background loop lifecycle, persisted state restore, and log streaming behavior under the Node runtime on Windows and POSIX <!-- agent: development-engineer, modeltype: build -->
- [ ] 4.2 Update installation and usage docs to present npm install / `npx loop-task` as the standard path and clarify any remaining optional Bun developer tooling <!-- agent: development-engineer, modeltype: fast -->
- [x] 4.3 Run typecheck, lint, and test on the migrated runtime path and fix any regressions <!-- agent: development-engineer, modeltype: fast -->
