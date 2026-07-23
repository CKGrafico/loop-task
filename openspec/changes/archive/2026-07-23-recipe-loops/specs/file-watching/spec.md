## ADDED Requirements

### Requirement: FileWatcher watches recipe directories per project
The FileWatcher SHALL watch `{project.directory}/.loops/recipes/` directories for each project that has a directory set. Recipe file additions, modifications, and deletions SHALL trigger the corresponding RecipeScanner actions.

#### Scenario: New recipe file added in watched directory
- **WHEN** a new `.json` file appears in a watched `.loops/recipes/` directory
- **THEN** the FileWatcher SHALL trigger `RecipeScanner.loadRecipe()` for that file

#### Scenario: Recipe file modified in watched directory
- **WHEN** an existing `.json` file is modified in a watched `.loops/recipes/` directory
- **THEN** the FileWatcher SHALL trigger a reload (immediate or deferred based on loop status)

#### Scenario: Recipe file deleted from watched directory
- **WHEN** a `.json` file is deleted from a watched `.loops/recipes/` directory
- **THEN** the FileWatcher SHALL trigger `RecipeScanner.unloadRecipe()` for that file

### Requirement: FileWatcher uses self-write detection for recipe files
When the daemon writes override values back to a recipe JSON file, the FileWatcher SHALL detect it as a self-write via `registerSelfWrite` and NOT trigger a reload.

#### Scenario: Daemon writes override to recipe file
- **WHEN** the daemon writes updated `interval` to a recipe file and calls `registerSelfWrite`
- **THEN** the subsequent file change event SHALL be ignored
