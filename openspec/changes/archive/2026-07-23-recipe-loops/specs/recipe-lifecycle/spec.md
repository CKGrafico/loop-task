## ADDED Requirements

### Requirement: Recipe loops tracked separately in LoopManager
LoopManager SHALL maintain a `.recipes: Map<id, StoredLoop>` alongside the existing `.loops: Map<id, StoredLoop>`. The `list()` method SHALL return loops from both maps. The `status()` method SHALL check both maps.

#### Scenario: List returns both user and recipe loops
- **WHEN** LoopManager has 2 user loops and 1 recipe loop
- **THEN** `list()` SHALL return 3 `LoopMeta` entries, with the recipe loop having `isRecipe: true`

#### Scenario: Status finds recipe loop
- **WHEN** `status(id)` is called with a recipe loop ID
- **THEN** the method SHALL return the loop's `LoopMeta` from the `.recipes` map

### Requirement: Recipe loop update allows only overridable fields
When `update()` is called on a recipe loop, the system SHALL allow changes only to `interval`, `intervalHuman`, `maxRuns`, and `context`. All other fields (taskId, command, commandArgs, cwd, immediate, verbose, description, offset, projectId) SHALL be rejected or ignored.

#### Scenario: Valid override of interval
- **WHEN** `update(recipeId, { interval: 900000, ... })` is called
- **THEN** the system SHALL update the in-memory options, write the new values back to the recipe JSON file, and register the self-write to prevent reload

#### Scenario: Invalid override of taskId rejected
- **WHEN** `update(recipeId, { taskId: "new-task", ... })` is called
- **THEN** the system SHALL reject the change and return an error

### Requirement: Recipe loop deletion rejected
The `delete()` method SHALL reject recipe loops. Recipe loops are managed by file presence and cannot be deleted via API, CLI, or TUI.

#### Scenario: Delete recipe loop rejected
- **WHEN** `delete(recipeId)` is called on a recipe loop
- **THEN** the system SHALL throw an error or return a failure response

### Requirement: LoopMeta extended with isRecipe and recipeFile
`LoopMeta` SHALL include an optional `isRecipe: boolean` field (default `false`) and an optional `recipeFile: string` field (default `undefined`). These fields identify recipe loops and their source files.

#### Scenario: Recipe loop meta includes isRecipe and recipeFile
- **WHEN** a recipe loop from `.loops/recipes/refine-issues.json` is listed
- **THEN** the `LoopMeta` SHALL have `isRecipe: true` and `recipeFile: "refine-issues.json"`

#### Scenario: User loop meta has isRecipe false
- **WHEN** a user-created loop is listed
- **THEN** the `LoopMeta` SHALL have `isRecipe: false` and `recipeFile: undefined`

### Requirement: Recipe tasks served by TaskManager but immutable
TaskManager's `list()` SHALL return both user tasks and recipe tasks. `get()` SHALL check user tasks first, then recipe tasks. `update()` and `delete()` SHALL throw for recipe tasks.

#### Scenario: List includes recipe tasks
- **WHEN** TaskManager has 3 user tasks and 2 recipe tasks
- **THEN** `list()` SHALL return 5 `TaskDefinition` entries

#### Scenario: Update recipe task rejected
- **WHEN** `update(recipeTaskId, ...)` is called on a recipe task
- **THEN** the system SHALL throw an error

#### Scenario: Delete recipe task rejected
- **WHEN** `delete(recipeTaskId)` is called on a recipe task
- **THEN** the system SHALL throw an error

### Requirement: Project deletion deletes recipe loops
When a project is deleted, recipe loops from that project's directory SHALL be deleted (stopped, tasks unloaded, removed from recipes map). User-created loops from that project SHALL be reassigned to the default project (existing behavior unchanged).

#### Scenario: Delete project with recipe loops
- **WHEN** a project with 1 recipe loop and 2 user loops is deleted
- **THEN** the recipe loop SHALL be stopped and removed, and the 2 user loops SHALL be reassigned to the default project

### Requirement: Project directory change reloads recipe loops
When a project's directory is changed, recipe loops from the old directory SHALL be deleted, and the new directory SHALL be scanned for recipe files.

#### Scenario: Change project directory
- **WHEN** a project's directory is changed from `/old/repo` to `/new/repo`
- **THEN** recipe loops from `/old/repo/.loops/recipes/` SHALL be deleted, and `/new/repo/.loops/recipes/` SHALL be scanned for new recipe files

### Requirement: Recipe loop cwd locked to project directory
Recipe loops SHALL have `cwd` set to the project's directory at load time. The user cannot override `cwd` for recipe loops.

#### Scenario: Recipe loop cwd is project directory
- **WHEN** a recipe loop is loaded for a project with `directory = /home/user/projects/orbion`
- **THEN** the loop's `cwd` SHALL be `/home/user/projects/orbion`
