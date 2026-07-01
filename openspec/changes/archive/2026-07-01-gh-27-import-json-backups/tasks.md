## 1. Validation Module

- [x] 1.1 Create `src/cli/import-validator.ts` with `validateExportFile()` that checks version field (must be `2`), required top-level keys (`loops`, `tasks`, `projects` must be arrays), and returns a structured result with errors
- [x] 1.2 Add per-item validators for `LoopMeta` (all required fields with correct types), `TaskDefinition`, and `Project` — each returns item index + field-level error list
- [x] 1.3 Add i18n strings to `src/i18n/en.json` for all import validation error messages (unsupported version, missing keys, per-item field errors, non-array fields)

## 2. Atomic Write with Rollback

- [x] 2.1 Create `src/cli/import-writer.ts` with `atomicImportWrite()` that backs up existing store files to `.bak`, writes all three stores via `writeFileAtomic`, and on failure restores backups and cleans up
- [x] 2.2 Handle edge case: store file doesn't exist before import (no backup; on rollback, delete the written file)

## 3. CLI Command Rewrite

- [x] 3.1 Rewrite the `import` command action in `src/cli.ts` to call `validateExportFile()` then `atomicImportWrite()`, exit non-zero on any validation error, and use i18n strings for output
- [x] 3.2 Update the `import` command `.description()` to state it restores a previously exported state file (inverse of `loop-task export`)

## 4. Tests

- [x] 4.1 Add unit tests for `validateExportFile()`: valid file, missing version, wrong version, missing keys, non-array keys, per-item type errors
- [x] 4.2 Add unit tests for `atomicImportWrite()`: successful write, partial failure with rollback, missing pre-existing store files
- [ ] 4.3 Add CLI integration test: `loop-task import <file>` end-to-end with valid and invalid inputs
