# Consolidate State to Single JSON Files

## Why

Currently each loop and each task is stored as a separate JSON file (`loops/{id}.json`, `tasks/{id}.json`). This makes it hard for external CLIs, agents, or humans to read the full state at once. Consolidating all loops into a single `loops.json` and all tasks into a single `tasks.json` makes the state trivially readable, enables simple "duplicate all loops" workflows, and allows external tools to create/modify loops without the dashboard.

## What Changes

1. **`saveLoop`, `loadAllLoops`, `loadLoop`, `deleteLoop`** in `state.ts` now read/write a single `~/.loop-cli/loops.json` array instead of individual files.
2. **`saveTask`, `loadAllTasks`, `loadTask`, `deleteTask`** in `state.ts` now read/write a single `~/.loop-cli/tasks.json` array instead of individual files.
3. **Migration on init**: When the daemon starts, if `loops.json` does not exist but `loops/` directory with `.json` files does, consolidate them into `loops.json`. Same for `tasks.json` from `tasks/` directory. Old individual files are NOT deleted (safe migration).
4. **`paths.ts`**: Add `loopsJson()` and `tasksJson()` path functions. Keep `loopFile`/`taskFile` for migration reference.
5. **`ProjectManager`**: Already uses individual files per project — consolidate to `projects.json` as well for consistency, with the same migration path.

## Non-goals

- Changing the in-memory cache model (managers still load into Maps).
- Changing the RPC protocol.
- Changing log file storage (logs stay per-loop).
- Deleting old individual files after migration.
