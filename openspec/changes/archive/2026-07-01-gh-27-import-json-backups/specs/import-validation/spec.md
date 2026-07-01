## ADDED Requirements

### Requirement: Version field validation
The `import` command SHALL check the `version` field of the import file. If the field is missing or not equal to `2`, the command SHALL exit with a non-zero code and print a message of the form `"Unsupported export version: X. Expected: 2"` (or `"Missing export version. Expected: 2"` if absent).

#### Scenario: Valid version 2
- **WHEN** the import file contains `"version": 2`
- **THEN** the command proceeds to further validation

#### Scenario: Wrong version
- **WHEN** the import file contains `"version": 1`
- **THEN** the command exits with code 1 and prints `"Unsupported export version: 1. Expected: 2"`

#### Scenario: Missing version
- **WHEN** the import file has no `version` field
- **THEN** the command exits with code 1 and prints `"Missing export version. Expected: 2"`

### Requirement: Required top-level keys validation
The `import` command SHALL verify that the import file contains `loops`, `tasks`, and `projects` keys at the top level. If any are missing, the command SHALL exit with non-zero code and print which keys are absent.

#### Scenario: All keys present
- **WHEN** the import file has `loops`, `tasks`, and `projects` arrays
- **THEN** the command proceeds to per-item validation

#### Scenario: Missing keys
- **WHEN** the import file has `loops` but is missing `tasks` and `projects`
- **THEN** the command exits with code 1 and prints `"Missing required keys: tasks, projects"`

### Requirement: Per-item type validation
The `import` command SHALL validate each item in the `loops`, `tasks`, and `projects` arrays against their runtime types (`LoopMeta`, `TaskDefinition`, `Project`). If any item fails, the command SHALL report the array name, item index, and the failing field(s).

#### Scenario: All items valid
- **WHEN** every loop conforms to `LoopMeta`, every task to `TaskDefinition`, and every project to `Project`
- **THEN** the command proceeds to the write phase

#### Scenario: Invalid loop item
- **WHEN** `loops[3]` is missing the `id` field and `loops[5].interval` is a string instead of a number
- **THEN** the command exits with code 1 and stderr includes `"loops[3]: missing field 'id'"` and `"loops[5]: field 'interval' must be a number"`

#### Scenario: Invalid task item
- **WHEN** `tasks[0].command` is missing
- **THEN** the command exits with code 1 and stderr includes `"tasks[0]: missing field 'command'"`

#### Scenario: Invalid project item
- **WHEN** `projects[2].name` is a number instead of a string
- **THEN** the command exits with code 1 and stderr includes `"projects[2]: field 'name' must be a string"`

### Requirement: Non-array top-level values
If `loops`, `tasks`, or `projects` exists but is not an array, the command SHALL treat it as a validation error.

#### Scenario: loops is an object instead of array
- **WHEN** the import file has `"loops": {"a": 1}`
- **THEN** the command exits with code 1 and stderr includes `"field 'loops' must be an array"`
