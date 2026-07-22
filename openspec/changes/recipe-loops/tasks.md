## 1. Type System & Data Model

- [ ] 1.1 Add `isRecipe` and `recipeFile` optional fields to `LoopMeta` in `src/types.ts` <!-- agent: fullstack-engineer.build, depends_on: [], touches: [src/types.ts] -->

## 2. RecipeTaskStore

- [ ] 2.1 Create `src/daemon/recipe/task-store.ts` — in-memory `Map<taskId, TaskDefinition>` with `get()`, `list()`, `set()`, `delete()`, `clear()` methods. Never persists to `tasks.json`. <!-- agent: fullstack-engineer.build, depends_on: [], touches: [src/daemon/recipe/task-store.ts] -->

## 3. RecipeScanner

- [ ] 3.1 Create `src/daemon/recipe/scanner.ts` — RecipeScanner class that scans `{project.directory}/.loops/recipes/*.json`, parses each file (v2 format, one loop per file), generates 8-char hex task IDs, remaps cross-references (`onSuccessTaskId`, `onFailureTaskId`, `loop.taskId`), loads tasks into RecipeTaskStore, creates LoopControllers with recipe options, sets `isRecipe: true` and `recipeFile` on loop meta, and auto-starts if `interval > 0`. Includes `scanDirectory()`, `loadRecipe()`, `unloadRecipe()`, `reloadRecipe()` methods. Wraps all parsing in try/catch, skips bad files, logs warnings. <!-- agent: fullstack-engineer.build, depends_on: [2.1], touches: [src/daemon/recipe/scanner.ts] -->
- [ ] 3.2 Create `src/daemon/recipe/validator.ts` — validates recipe file schema (must have `version: 2`, `loops` array with exactly one entry, `tasks` array). Reuse patterns from `src/cli/import-validator.ts`. <!-- agent: fullstack-engineer.build, depends_on: [], touches: [src/daemon/recipe/validator.ts] -->
- [ ] 3.3 Create `src/daemon/recipe/id-remapper.ts` — takes parsed recipe data, generates 8-char hex IDs for each task, builds a remap table, and applies it to all cross-references. Returns remapped tasks and loop. <!-- agent: fullstack-engineer.build, depends_on: [], touches: [src/daemon/recipe/id-remapper.ts] -->
- [ ] 3.4 Create `src/daemon/recipe/file-writer.ts` — reads a recipe JSON file, updates specific fields (interval, intervalHuman, maxRuns, context in `loops[0]`), writes back atomically using `writeFileAtomic`, and notifies FileWatcher via `registerSelfWrite`. <!-- agent: fullstack-engineer.build, depends_on: [], touches: [src/daemon/recipe/file-writer.ts] -->

## 4. Deferred Reload

- [ ] 4.1 Create `src/daemon/recipe/deferred-reload.ts` — manages `pendingReloads: Map<recipeId, recipeFilePath>`. When a recipe file changes while its loop is running, adds to pending and subscribes to the controller's `stopped` event. On stop, removes from pending and triggers reload. Multiple file changes while pending only load the last file state. <!-- agent: fullstack-engineer.build, depends_on: [3.1], touches: [src/daemon/recipe/deferred-reload.ts] -->

## 5. Extend LoopManager

- [ ] 5.1 Add `.recipes: Map<string, StoredLoop>` to LoopManager. Modify `list()` to return entries from both `.loops` and `.recipes`. Modify `status()` to check both maps. <!-- agent: fullstack-engineer.build, depends_on: [1.1], touches: [src/daemon/managers/loop-manager.ts] -->
- [ ] 5.2 Modify `update()` — when called on a recipe loop, allow only overridable fields (interval, intervalHuman, maxRuns, context). Reject non-overridable field changes. Write overridable changes back to the recipe file via `file-writer.ts`. <!-- agent: fullstack-engineer.build, depends_on: [3.4, 5.1], touches: [src/daemon/managers/loop-manager.ts] -->
- [ ] 5.3 Modify `delete()` — throw when called on a recipe loop. <!-- agent: fullstack-engineer.build, depends_on: [5.1], touches: [src/daemon/managers/loop-manager.ts] -->
- [ ] 5.4 Modify `deleteProject()` — stop and remove recipe loops from `.recipes` map for the deleted project (do NOT reassign to default). Unload tasks from RecipeTaskStore. Keep existing user-loop reassignment behavior. <!-- agent: fullstack-engineer.build, depends_on: [2.1, 5.1], touches: [src/daemon/managers/loop-manager.ts] -->
- [ ] 5.5 Add `updateProjectDirectory()` — when a project's directory changes, delete recipe loops from old directory (stop, unload tasks, remove from `.recipes` map) and scan the new directory via RecipeScanner. Called from `ProjectManager.update()`. <!-- agent: fullstack-engineer.build, depends_on: [3.1, 5.1], touches: [src/daemon/managers/loop-manager.ts, src/daemon/managers/project-manager.ts] -->
- [ ] 5.6 Extend `buildMeta()` and `toMeta()` in `loop-serialization.ts` to include `isRecipe` and `recipeFile` from the StoredLoop/recipe context. <!-- agent: fullstack-engineer.build, depends_on: [1.1], touches: [src/daemon/managers/loop-serialization.ts] -->

## 6. Extend TaskManager

- [ ] 6.1 Modify TaskManager to accept `RecipeTaskStore` reference. Modify `list()` to return both user and recipe tasks. Modify `get()` to check user tasks first, then recipe store. Modify `update()` and `delete()` to throw for recipe tasks. Modify `reload()` to only reload user tasks. <!-- agent: fullstack-engineer.build, depends_on: [2.1], touches: [src/daemon/managers/task-manager.ts] -->

## 7. Extend FileWatcher

- [ ] 7.1 Add directory watching capability to FileWatcher. Watch `{project.directory}/.loops/recipes/` directories. On file add → call `RecipeScanner.loadRecipe()`. On file modify → trigger reload (immediate or deferred via `deferred-reload.ts`). On file delete → call `RecipeScanner.unloadRecipe()`. Use `registerSelfWrite` for self-write detection. Add mtime polling fallback for recipe directories. <!-- agent: fullstack-engineer.build, depends_on: [3.1, 4.1], touches: [src/daemon/watcher/index.ts] -->

## 8. IPC / HTTP / MCP Integration

- [ ] 8.1 Update IPC loop handlers: `handleDelete` returns error for recipe loops. `handleUpdate` rejects non-overridable field changes for recipe loops. `handleList`/`handleStatus` include recipe loops. <!-- agent: fullstack-engineer.build, depends_on: [5.1], touches: [src/daemon/server/handlers/loop-handlers.ts] -->
- [ ] 8.2 Update HTTP route-loops: `DELETE /api/loops/:id` returns 403 for recipe loops. `PATCH /api/loops/:id` rejects non-overridable fields for recipe loops with 403. <!-- agent: fullstack-engineer.build, depends_on: [5.1], touches: [src/daemon/http/route-loops.ts] -->
- [ ] 8.3 Update HTTP route-tasks: `PUT /api/tasks/:id` returns 403 for recipe tasks. `DELETE /api/tasks/:id` returns 403 for recipe tasks. <!-- agent: fullstack-engineer.build, depends_on: [6.1], touches: [src/daemon/http/route-tasks.ts] -->
- [ ] 8.4 Update MCP tools: `delete_loop` returns error for recipe loops. `update_loop` rejects non-overridable fields for recipe loops. <!-- agent: fullstack-engineer.build, depends_on: [5.1], touches: [src/daemon/mcp/tools.ts] -->

## 9. Daemon Wiring

- [ ] 9.1 Wire RecipeScanner, RecipeTaskStore, and DeferredReload into daemon `main()` in `src/daemon/index.ts`. Initialize RecipeScanner after ProjectManager init. Add recipe directory watchers to FileWatcher. Pass RecipeTaskStore to TaskManager and LoopManager. Scan all project directories for recipe files at startup. <!-- agent: fullstack-engineer.build, depends_on: [3.1, 5.1, 6.1, 7.1], touches: [src/daemon/index.ts] -->

## 10. TUI Changes

- [ ] 10.1 Add visual indicator for recipe loops in the loop list — show `R` badge or distinct coloring on the status column when `isRecipe: true`. <!-- agent: fullstack-engineer.build, depends_on: [1.1], touches: [src/widgets/left-panel/**] -->
- [ ] 10.2 Update loop edit form for recipe loops: overridable fields (interval, maxRuns, context) remain editable. Locked fields (taskId, command, commandArgs, cwd, immediate, verbose, description, offset) are grayed out with lock icon. Delete button is disabled with tooltip "Recipe loops are managed by .loops/recipes/*.json". <!-- agent: fullstack-engineer.build, depends_on: [1.1], touches: [src/widgets/loop-form/**] -->

## 11. i18n

- [ ] 11.1 Add i18n keys for recipe loop error messages and UI labels (recipe deletion rejected, recipe task immutable, recipe badge label, lock tooltip). <!-- agent: fullstack-engineer.fast, depends_on: [1.1], touches: [src/shared/i18n/en.json] -->

## 12. Tests

- [ ] 12.1 Unit tests for `RecipeTaskStore` — get, list, set, delete, clear. <!-- agent: fullstack-engineer.build, depends_on: [2.1], touches: [tests/recipe-task-store.test.ts] -->
- [ ] 12.2 Unit tests for id-remapper — verify 8-char hex generation, cross-reference remapping, no collision between recipes. <!-- agent: fullstack-engineer.build, depends_on: [3.3], touches: [tests/recipe-id-remapper.test.ts] -->
- [ ] 12.3 Unit tests for RecipeScanner — scanDirectory with valid/invalid/missing files, loadRecipe, unloadRecipe, auto-start behavior. <!-- agent: fullstack-engineer.build, depends_on: [3.1, 3.2], touches: [tests/recipe-scanner.test.ts] -->
- [ ] 12.4 Unit tests for deferred reload — pending reload when running, immediate reload when not running, multiple changes dedup. <!-- agent: fullstack-engineer.build, depends_on: [4.1], touches: [tests/recipe-deferred-reload.test.ts] -->
- [ ] 12.5 Integration tests for extended LoopManager — recipe loops in list/status, overridable field update with file write-back, delete rejection, project deletion, project directory change. <!-- agent: fullstack-engineer.build, depends_on: [5.1, 5.2, 5.3, 5.4, 5.5], touches: [tests/recipe-loop-manager.test.ts] -->
- [ ] 12.6 Integration tests for extended TaskManager — combined list/get, recipe task immutability, reload only affects user tasks. <!-- agent: fullstack-engineer.build, depends_on: [6.1], touches: [tests/recipe-task-manager.test.ts] -->
- [ ] 12.7 Integration test for FileWatcher recipe directory watching — file add/modify/delete triggers correct RecipeScanner actions. <!-- agent: fullstack-engineer.build, depends_on: [7.1], touches: [tests/recipe-file-watcher.test.ts] -->

## 13. Verification

- [ ] 13.1 Run typecheck, lint, test, and build. Fix any errors. <!-- agent: fullstack-engineer.fast, depends_on: [9.1, 10.1, 10.2, 11.1, 12.7], touches: [] -->
