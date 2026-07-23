# recipe-discovery Specification

## Purpose
TBD - created by archiving change recipe-loops. Update Purpose after archive.
## Requirements
### Requirement: Recipe scanner discovers recipe files in project directories
The system SHALL scan `{project.directory}/.loops/recipes/*.json` for recipe files when a project has a `directory` set. Scanning SHALL occur at daemon startup and when recipe files are added, modified, or deleted.

#### Scenario: Project with directory and recipe files
- **WHEN** a project has `directory = /home/user/projects/orbion` and `.loops/recipes/refine.json` exists in that directory
- **THEN** the system SHALL parse `refine.json`, generate 8-char hex task IDs, remap cross-references, load tasks into RecipeTaskStore, create a LoopController, set `isRecipe: true` and `recipeFile: "refine.json"` on the loop meta, and auto-start if `interval > 0`

#### Scenario: Project with directory but no .loops/recipes/ directory
- **WHEN** a project has a `directory` set but `.loops/recipes/` does not exist
- **THEN** the system SHALL skip scanning with no error

#### Scenario: Project without directory
- **WHEN** a project has no `directory` set
- **THEN** the system SHALL not scan for recipe files

### Requirement: Recipe file uses v2 export format
Each recipe JSON file SHALL use the v2 export format with `version: 2`, a `loops` array (exactly one loop), a `tasks` array, and a `projects` array (ignored, always empty in recipe files). The loop's `taskId` field references a logical task ID within the file.

#### Scenario: Valid recipe file parsed correctly
- **WHEN** a recipe file contains `{ version: 2, loops: [{ taskId: "select", ... }], tasks: [{ id: "select", ... }, { id: "refine", ... }] }`
- **THEN** the system SHALL parse both loops and tasks, generate hex IDs for each task, remap `taskId` and all `onSuccessTaskId`/`onFailureTaskId` references

#### Scenario: Malformed recipe file skipped
- **WHEN** a recipe file contains invalid JSON or fails schema validation
- **THEN** the system SHALL log a warning and skip that file without crashing the daemon

### Requirement: Task IDs generated as 8-char hex at load time
The system SHALL generate a unique 8-char hex ID for each task in a recipe file at load time. The original IDs in the file are logical references used only for cross-linking within the file. A remap table SHALL translate all `onSuccessTaskId`, `onFailureTaskId`, and loop `taskId` references to the generated IDs.

#### Scenario: Cross-reference remapping
- **WHEN** a recipe file has tasks with logical IDs `"select"`, `"refine"`, `"noop"` and `onSuccessTaskId: "refine"` on the `"select"` task
- **THEN** the system SHALL generate hex IDs (e.g. `"a3f2b1c4"`, `"d8e9f0a1"`, `"b2c3d4e5"`), remap `onSuccessTaskId: "refine"` to `"d8e9f0a1"`, and set `loop.taskId` to the hex ID for `"select"`

#### Scenario: No collision between recipes with same logical IDs
- **WHEN** two recipe files both use logical ID `"select"`
- **THEN** each SHALL generate different hex IDs, causing no collision

### Requirement: Hot reload on recipe file changes
The system SHALL detect changes to recipe files in `.loops/recipes/` directories and reload them. If the recipe loop is running, the reload SHALL be deferred until the loop status becomes `idle` or `waiting`. If not running, reload immediately.

#### Scenario: Recipe file modified while loop not running
- **WHEN** a recipe file is modified on disk and the loop is `idle` or `waiting`
- **THEN** the system SHALL re-read the file, rebuild the task chain, reconcile loop options, and restart if auto-starting

#### Scenario: Recipe file modified while loop running
- **WHEN** a recipe file is modified on disk and the loop is `running`
- **THEN** the system SHALL defer the reload, subscribing to the controller's `stopped` event. When the loop stops, the system SHALL reload the recipe

#### Scenario: Recipe file deleted
- **WHEN** a recipe file is deleted from `.loops/recipes/`
- **THEN** the system SHALL stop the loop (waiting for current iteration to finish if running), remove its tasks from RecipeTaskStore, and remove the loop from LoopManager

#### Scenario: Recipe file added
- **WHEN** a new file appears in `.loops/recipes/`
- **THEN** the system SHALL load it immediately via RecipeScanner and auto-start if `interval > 0`

### Requirement: Self-write detection prevents reload loops
When the daemon writes overridable field values back to a recipe file, the FileWatcher SHALL detect it as a self-write and NOT trigger a reload.

#### Scenario: Override written to recipe file does not cause reload
- **WHEN** the daemon writes `interval: 900000` back to a recipe JSON file and registers the write via `registerSelfWrite`
- **THEN** the FileWatcher SHALL skip the change event and NOT trigger a recipe reload

