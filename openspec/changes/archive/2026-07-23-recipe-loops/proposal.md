## Why

Creating loops and tasks currently requires manual API calls, CLI commands, or TUI interaction. There is no way to bundle a complete loop+tasks configuration with a repository so that anyone who clones it gets the loops automatically. Recipe files solve this: a repo ships `.loops/recipes/*.json`, and when loop-task has a Project pointing at that repo's directory, the recipes are auto-discovered and loaded as immutable, file-backed loops.

## What Changes

- **New `RecipeScanner` component**: scans `{project.directory}/.loops/recipes/*.json` at daemon startup and on file changes, parses each file (v2 export format, one loop per file), generates 8-char hex task IDs, remaps cross-references, loads tasks into an in-memory store, and creates `LoopController` instances for recipe loops.
- **New `RecipeTaskStore` component**: in-memory `Map<taskId, TaskDefinition>` for recipe tasks. Never persisted to `tasks.json`. Unloaded when recipe file or project is deleted.
- **Extended `LoopMeta`**: adds `isRecipe: boolean` and `recipeFile: string` fields to the IPC contract (`src/types.ts`).
- **Extended `LoopManager`**: adds `.recipes: Map<id, StoredLoop>` alongside `.loops`. `list()`/`status()` return both. `update()` on recipe loops allows only overridable fields (interval, maxRuns, context) and writes back to the recipe JSON file. `delete()` on recipe loops throws (file-managed). `deleteProject()` deletes recipe loops from that project (not reassigned).
- **Extended `TaskManager`**: `list()`/`get()` return both user and recipe tasks. `update()`/`delete()` on recipe tasks throws (immutable).
- **Extended `FileWatcher`**: watches `{project.directory}/.loops/recipes/` directories. Recipe file added/modified/deleted triggers RecipeScanner actions. Uses `registerSelfWrite` to avoid reload loops when daemon writes overrides back to recipe files.
- **Deferred reload**: when a recipe file changes but the loop is running, reload is deferred until the loop reaches idle/waiting state. Then the file is re-read, task chain rebuilt, and loop options reconciled.
- **Hot reload**: recipe file added loads immediately; file deleted stops the loop and unloads; file modified reloads (deferred if running).
- **Project lifecycle integration**: project directory changed triggers old recipe deletion + new directory scan. Project deletion deletes recipe loops (not reassigned to default).
- **TUI/CLI/API changes**: recipe loops appear in list/status with `isRecipe: true`. Visual indicator in TUI. Edit form only allows overridable fields. Delete disabled for recipe loops.

## Capabilities

### New Capabilities
- `recipe-discovery`: scanning, parsing, loading, and unloading recipe files from project directories. Task ID generation and cross-reference remapping. Hot reload and deferred reload.
- `recipe-lifecycle`: recipe loop management within LoopManager and TaskManager. Overridable field write-back. Project deletion/directory-change behavior.

### Modified Capabilities
- `loop-management`: LoopManager now tracks recipe loops alongside user loops. Update/delete semantics differ for recipes. LoopMeta extended with isRecipe and recipeFile.
- `task-management`: TaskManager now serves recipe tasks alongside user tasks. Recipe tasks are immutable.
- `file-watching`: FileWatcher now watches recipe directories per project. Self-write detection prevents reload loops.

## Impact

- **IPC contract** (`src/types.ts`): `LoopMeta` gains `isRecipe` and `recipeFile` fields. All IPC consumers (TUI client, HTTP API, MCP tools) receive the new fields.
- **Persisted state**: Recipe loops are NOT written to `loops.json`. Recipe tasks are NOT written to `tasks.json`. Only user-created loops/tasks are persisted as before.
- **File system**: Recipe JSON files live in the project's repo directory (`.loops/recipes/`), not in `~/.loop-cli/`. The daemon writes override values back to these files atomically.
- **TUI**: Needs visual indicator for recipe loops, limited edit form, disabled delete.
- **HTTP API / MCP tools**: `PATCH /api/loops/:id` rejects non-overridable field changes for recipe loops. `DELETE /api/loops/:id` rejects recipe loops.
- **Cross-platform**: `fs.watch` on directories works on Windows named pipes/linux/macOS. Recipe file watcher uses existing mtime polling fallback.
