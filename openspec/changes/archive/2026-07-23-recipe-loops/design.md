## Context

loop-task runs shell commands on a cadence via a background daemon. Loops and tasks are created through the TUI, CLI, or HTTP API and persisted in `loops.json`/`tasks.json` under `~/.loop-cli/`. The daemon uses a `FileWatcher` to hot-reload external changes to these files and a `LoopManager`/`TaskManager` pair to manage runtime state. `LoopController` resolves tasks via a `TaskResolver` function. Projects have an optional `directory` field pointing at a git repo.

Recipe loops add a new data source: `.loops/recipes/*.json` files inside a project's directory. These are loaded into memory (never persisted to `loops.json`/`tasks.json`) and managed by file presence rather than API calls.

## Goals / Non-Goals

**Goals:**
- Auto-discover recipe files when a project has a `directory` set
- Load recipe loops and tasks into memory with generated 8-char hex task IDs
- Support overridable fields (interval, maxRuns, context) with write-back to the recipe file
- Support hot reload (deferred when loop running) and file add/delete
- Integrate with project lifecycle (deletion, directory change)
- Expose recipe loops through all existing interfaces (IPC, HTTP, MCP, TUI) with `isRecipe` flag

**Non-Goals:**
- Skills documentation updates (separate concern per issue)
- Porting the import validator to a standalone package
- Deduplication of recipe loops across projects pointing at the same directory
- Schema versioning for recipe files beyond v2 export format compatibility
- Persisting recipe state across daemon restarts (recipe loops are re-scanned from files on startup)

## Decisions

### 1. RecipeScanner as a standalone module (not embedded in FileWatcher)

**Decision**: Create `src/daemon/recipe/scanner.ts` as a standalone class, called by the daemon `main()` and by the extended `FileWatcher`.

**Rationale**: FileWatcher's responsibility is detecting file changes and delegating. Embedding scan logic in it violates single-responsibility. RecipeScanner owns the full lifecycle: parse, validate, generate IDs, create controllers, and wire them into LoopManager.

**Alternatives considered**: Making FileWatcher call back into LoopManager directly for recipe changes — rejected because LoopManager doesn't know about recipe file locations. RecipeScanner is the mediator.

### 2. RecipeTaskStore as a separate in-memory store

**Decision**: Create `src/daemon/recipe/task-store.ts` — a `Map<taskId, TaskDefinition>` never written to `tasks.json`.

**Rationale**: Recipe tasks have a different lifecycle (tied to file presence) and different mutability rules (immutable). Mixing them into TaskManager's map would require constant `isRecipe` checks throughout TaskManager. Keeping them separate simplifies mutability enforcement.

**Alternatives considered**: Adding `isRecipe` flag to `TaskDefinition` and storing in the same map — rejected because `TaskDefinition` is a core type shared across client and daemon; adding recipe metadata to it leaks daemon implementation details.

### 3. Combined TaskResolver for recipe loops

**Decision**: The existing `taskResolver` closure in `LoopManager` already delegates to `TaskManager.get()`. Extend it to check `RecipeTaskStore` as a fallback.

**Rationale**: `LoopController` takes a `TaskResolver` function, not a `TaskManager` reference. No change to `LoopController` needed — just change the resolver provided at construction time for recipe loops.

### 4. Deferred reload via controller event subscription

**Decision**: When a recipe file changes while the loop is running, add the recipe ID to a `pendingReloads: Set<string>` and subscribe to the `LoopController`'s `"stopped"` event. On the event, reload from disk.

**Rationale**: The `LoopController` already emits `"stopped"` when a loop finishes. No polling, no timers. The existing EventEmitter pattern is reused.

**Alternatives considered**: Polling loop status at intervals — rejected as wasteful when events already exist.

### 5. Overridable fields written back to recipe file atomically

**Decision**: When `LoopManager.update()` is called with overridable field changes for a recipe loop, read the recipe JSON, update the specific fields, and write back using `writeFileAtomic`. Register the write via `registerSelfWrite` to prevent reload loops.

**Rationale**: `writeFileAtomic` (temp-then-rename) already handles crash safety and Windows EPERM retries. `registerSelfWrite` already prevents the FileWatcher from triggering on the daemon's own writes.

### 6. LoopMeta extension (isRecipe, recipeFile)

**Decision**: Add `isRecipe?: boolean` and `recipeFile?: string` to `LoopMeta` in `src/types.ts`. These are optional fields so existing serialized loops in `loops.json` remain valid.

**Rationale**: IPC contract stability. Optional fields don't break existing clients. The TUI and API can check `isRecipe` to alter behavior.

### 7. Recipe directory watching via fs.watch on each project directory

**Decision**: Extend `FileWatcher` to watch `{project.directory}/.loops/recipes/` as a directory (not individual files). Set up watchers when `RecipeScanner` initializes per project.

**Rationale**: The current `FileWatcher` only watches specific files. Recipe directories require watching for new/deleted/modified files. `fs.watch` on a directory reports `rename` and `change` events with the filename. This works cross-platform and complements the existing mtime polling fallback.

## Risks / Trade-offs

- **Risk**: Two projects pointing at same directory create duplicate recipe loops → **Mitigation**: Accept duplicates — each project gets independent loops. Rare edge case not worth deduplication complexity.
- **Risk**: `fs.watch` directory events may be unreliable on some platforms → **Mitigation**: Add mtime polling fallback for recipe directories (same pattern as existing file watching).
- **Risk**: Writing overrides to recipe files may cause git merge conflicts → **Mitigation**: The file is the source of truth (per design). `git pull` overwrites local overrides. This is documented behavior, same as any config file under version control.
- **Risk**: Malformed recipe file crashes daemon → **Mitigation**: `RecipeScanner` wraps all parsing in try/catch, skips bad files, logs warnings. Same pattern as `loadAllLoops`/`loadAllTasks`.
- **Trade-off**: Recipe loop state (run count, last exit code) is lost on daemon restart since recipe loops are not persisted in `loops.json`. Acceptable because the recipe file will be re-scanned and the loop auto-started.

## Migration Plan

No migration needed. Recipe loops are a new feature. Existing loops, tasks, and projects are unaffected. The new `LoopMeta` fields are optional and backward-compatible.
