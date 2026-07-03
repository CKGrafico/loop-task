## ADDED Requirements

### Requirement: Task mode toggle

The form SHALL provide a toggle allowing the user to switch between "Inline command" mode and "Existing task" mode.

#### Scenario: Toggle visible in create and edit

- **WHEN** the user opens the create or edit form
- **THEN** a toggle or switch SHALL be visible to choose between "Inline command" and "Existing task" modes

### Requirement: Inline command mode

In "Inline command" mode, the form SHALL display a text input for typing a custom command.

#### Scenario: Command input shown in inline mode

- **WHEN** the mode is set to "Inline command"
- **THEN** the form SHALL show a text input for the command string

### Requirement: Existing task mode

In "Existing task" mode, the form SHALL display a task selector (SearchSelect / task browser) for choosing from existing task definitions.

#### Scenario: Task selector shown in task mode

- **WHEN** the mode is set to "Existing task"
- **THEN** the form SHALL show a task selector component for picking an existing task definition

### Requirement: Mode switch resets irrelevant field

Switching between modes SHALL clear or reset the irrelevant field (command or taskId) to prevent stale data.

#### Scenario: Switch to task mode clears command

- **WHEN** the user switches from "Inline command" to "Existing task"
- **THEN** the command field SHALL be cleared

#### Scenario: Switch to inline mode clears taskId

- **WHEN** the user switches from "Existing task" to "Inline command"
- **THEN** the selected taskId SHALL be cleared
