## ADDED Requirements

### Requirement: LoopManager list returns combined user and recipe loops
The `list()` method SHALL return `LoopMeta` entries from both the `.loops` map (user-created) and the `.recipes` map (recipe-loaded), with recipe entries marked `isRecipe: true`.

#### Scenario: Combined list
- **WHEN** `list()` is called
- **THEN** the result SHALL contain all user loops and all recipe loops

### Requirement: LoopManager update respects recipe restrictions
When `update()` is called on a recipe loop, only overridable fields (`interval`, `intervalHuman`, `maxRuns`, `context`) SHALL be applied. Non-overridable fields SHALL be rejected. Overridable field changes SHALL be written back to the recipe JSON file.

#### Scenario: Update recipe loop cadence
- **WHEN** `update(recipeId, { interval: 900000, intervalHuman: "15m" })` is called
- **THEN** the system SHALL update in-memory options AND write the new interval to the recipe JSON file

### Requirement: LoopManager delete rejects recipe loops
When `delete()` is called on a recipe loop, the system SHALL throw an error indicating that recipe loops are managed by file presence.

#### Scenario: Attempt to delete recipe loop
- **WHEN** `delete(recipeId)` is called where `recipeId` belongs to a recipe loop
- **THEN** the system SHALL throw an error

### Requirement: LoopManager deleteProject handles recipe loops
When `deleteProject()` is called, recipe loops belonging to that project SHALL be stopped and removed from the `.recipes` map. Their tasks SHALL be unloaded from `RecipeTaskStore`. User loops SHALL be reassigned to the default project as before.

#### Scenario: Delete project with recipe and user loops
- **WHEN** `deleteProject(projectId)` is called
- **THEN** recipe loops from that project SHALL be deleted, user loops reassigned to default
