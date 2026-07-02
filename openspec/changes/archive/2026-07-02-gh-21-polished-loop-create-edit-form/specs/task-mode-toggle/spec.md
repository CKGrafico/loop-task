## ADDED Requirements

### Requirement: Task mode toggle in WizardForm
The WizardForm SHALL include a `taskMode` step (select type) that lets the user choose between "Inline command" and "Existing task". When the user selects a mode, the form SHALL show the corresponding field (command text input or taskId selection) and hide the other.

#### Scenario: Create loop with inline command
- **WHEN** user selects "Inline command" in the taskMode step
- **THEN** the form shows a text input for command and hides the taskId field

#### Scenario: Create loop with existing task
- **WHEN** user selects "Existing task" in the taskMode step
- **THEN** the form shows a taskId field (with task name hint) and hides the command field

#### Scenario: Switching modes clears the other field
- **WHEN** user switches from "Inline command" to "Existing task"
- **THEN** the command value is cleared from the form values
- **WHEN** user switches from "Existing task" to "Inline command"
- **THEN** the taskId value is cleared from the form values

### Requirement: PatchEditForm shows command and taskId based on task mode
The PatchEditForm SHALL display the command field (merged command+args) when the loop uses inline mode, and the taskId field when the loop uses an existing task. Both fields SHALL be editable via the keyboard navigation.

#### Scenario: Edit loop with inline command
- **WHEN** user edits a loop that has a command (no taskId)
- **THEN** the command field shows the merged command + args string

#### Scenario: Edit loop with existing task
- **WHEN** user edits a loop that has a taskId
- **THEN** the taskId field shows the task name
