## ADDED Requirements

### Requirement: Task mode toggle
The form SHALL provide a toggle/switch to choose between "Inline command" mode and "Existing task" mode.

#### Scenario: Toggle shows two options
- **WHEN** the form is rendered
- **THEN** a toggle control SHALL display with options "Inline command" and "Existing task"

### Requirement: Inline command input
When "Inline command" mode is selected, the form SHALL show a text input for typing a custom command.

#### Scenario: Inline mode shows command input
- **WHEN** "Inline command" mode is selected
- **THEN** a text input SHALL be visible for typing a command

### Requirement: Existing task selection
When "Existing task" mode is selected, the form SHALL show a task selector (SearchSelect / task browser) to choose from existing task definitions.

#### Scenario: Task mode shows task selector
- **WHEN** "Existing task" mode is selected
- **THEN** a task selector SHALL be visible instead of the command input

### Requirement: Field reset on mode switch
Switching between modes SHALL clear the irrelevant field's value (command or taskId).

#### Scenario: Switching to task mode clears command
- **WHEN** the user switches from "Inline command" to "Existing task"
- **THEN** the command field value SHALL be cleared

#### Scenario: Switching to inline mode clears taskId
- **WHEN** the user switches from "Existing task" to "Inline command"
- **THEN** the taskId field value SHALL be cleared
