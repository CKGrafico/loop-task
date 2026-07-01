## Why

The existing `loop-task import <file>` command works but is not production-ready: it skips version validation, provides no per-item type checking, uses non-atomic writes that can leave the daemon in an inconsistent state, and offers poor error diagnostics. Users who export state and re-import it (or receive exports from teammates) need a reliable round-trip that fails fast with actionable messages.

## What Changes

- Add version field validation: reject files whose `version` is missing or not `2`
- Add per-item type validation against `LoopMeta`, `TaskDefinition`, and `Project` runtime shapes
- Add per-field error reporting: item index + failing field(s), not generic parse errors
- Add atomic writes with rollback: write all three stores via `writeFileAtomic`, and on partial failure restore originals
- Add missing-key diagnostics: list which of `loops`/`tasks`/`projects` are absent
- Ensure import is documented as the inverse of `loop-task export` in `--help` text

## Capabilities

### New Capabilities
- `import-validation`: Validates import file schema (version check, required keys, per-item type validation with actionable error messages)
- `import-atomic-write`: Atomic write of all three store files with rollback on partial failure

### Modified Capabilities
<!-- No existing spec-level behavior changes -->

## Impact

- **src/cli.ts** — `import` command action rewritten with validation and atomic write logic
- **src/types.ts** — No IPC contract changes; existing types (`LoopMeta`, `TaskDefinition`, `Project`) used as validation schema
- **src/shared/fs-utils.ts** — `writeFileAtomic` already exists; may add a backup/restore helper
- **src/daemon/file-watcher.ts** — No changes; existing hot-reload path handles the new writes
- **src/i18n/en.json** — New error message strings for validation failures
- **No new dependencies** — runtime type check helpers use existing language features
