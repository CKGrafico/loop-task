## MODIFIED Requirements

### Requirement: TaskManager serves recipe tasks alongside user tasks
The `list()` method SHALL return tasks from both the user task map and `RecipeTaskStore`. The `get()` method SHALL check the user task map first, then `RecipeTaskStore`. The `update()` and `delete()` methods SHALL throw for recipe tasks. The `reload()` method SHALL only reload user tasks from `tasks.json` (recipe tasks remain in their own store).

#### Scenario: Get recipe task by ID
- **WHEN** `get(recipeTaskId)` is called
- **THEN** the system SHALL return the task from RecipeTaskStore if not found in user tasks

#### Scenario: Update recipe task throws
- **WHEN** `update(recipeTaskId, ...)` is called on a task from RecipeTaskStore
- **THEN** the system SHALL throw an error indicating recipe tasks are immutable

#### Scenario: Reload only affects user tasks
- **WHEN** `reload(newTasks)` is called
- **THEN** the system SHALL clear and reload only user tasks; recipe tasks SHALL remain unchanged
