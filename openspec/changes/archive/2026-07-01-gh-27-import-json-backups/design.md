## Context

The CLI already has `loop-task import <file>` (src/cli.ts:260-281) that reads a JSON file and overwrites the three store files (`loops.json`, `tasks.json`, `projects.json`). The daemon's `FileWatcher` detects changes via `fs.watch` + mtime polling (debounced 300ms, SHA-1 dedup) and triggers `LoopManager.reconcile()`, `TaskManager.reload()`, and `ProjectManager.reload()`.
Current import is fragile: no version check, no per-item type validation, non-atomic writes, and vague error messages.

## Goals / Non-Goals

**Goals:**
- Validate import file against the `version: 2` export format before writing anything
- Per-item type validation with actionable error messages (item index + failing fields)
- Atomic writes with rollback on partial failure
- Replace raw `writeFile` calls with `writeFileAtomic` (already exists in `src/shared/fs-utils.ts`)
- All error strings externalized to `src/i18n/en.json`

**Non-Goals:**
- Merge/rebase with existing data, import replaces, matching current behavior
- Migration from `version: 1` export format
- Interactive confirmation or dry-run mode
- New external dependencies (no zod, ajv, etc.)

## Decisions

### D1: Runtime type validator as a standalone module

Create `src/cli/import-validator.ts` with pure functions that validate each type using simple `typeof` / `in` checks. No external validation library. Exports `validateExportFile()` which returns a structured result with per-item errors.

**Alternative considered:** Use JSON Schema + ajv, rejected because it adds a dependency and the types are simple enough for runtime checks.

### D2: Backup-and-restore for atomic writes

Before writing, copy the three existing store files to `<name>.bak`. Write each file via `writeFileAtomic`. On any write failure, restore the `.bak` files. On success, delete the `.bak` files.

**Alternative considered:** Two-phase commit with temp directory, rejected because `writeFileAtomic` already handles per-file atomicity; backup-restore is simpler and sufficient for three files.

### D3: Extend the existing import command in-place

Rewrite the `import` command action in `src/cli.ts` to call the validator and atomic-write logic rather than creating a new command.

### D4: Error output format

Validation errors print to stderr with a structured format:
- Version errors: single line `"Unsupported export version: X. Expected: 2"`
- Missing keys: `"Missing required keys: tasks, projects"`
- Per-item errors: `"loops[3]: missing field 'id'; tasks[0]: 'interval' must be a number"`
Exit code is non-zero (1) for any validation failure.

### D5: Use writeJsonArray-style formatting

Write stores with `JSON.stringify(data, null, 2)`, same formatting as `writeJsonArray` in `state.ts`. Do not call the private `writeJsonArray` directly; use `writeFileAtomic` from `fs-utils.ts`, which is the same primitive.

## Risks / Trade-offs

- [Risk: File race with daemon] → Mitigation: `writeFileAtomic` uses `writeFileSync` + `renameSync`, which is atomic on the same filesystem. The daemon's file watcher debounces at 300ms, so three rapid writes trigger at most one reload cycle per file after settling.
- [Risk: Backup files left behind on crash] → Mitigation: `.bak` files are harmless (daemon ignores them). A stale `.bak` is overwritten on next import. Document that cleanup is best-effort.
- [Risk: Type schema drift] → Mitigation: The validator references the same `LoopMeta`/`TaskDefinition`/`Project` types from `src/types.ts`. If those types change, the validator must be updated in the same PR.
