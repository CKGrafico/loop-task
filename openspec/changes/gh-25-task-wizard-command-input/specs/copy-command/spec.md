## MODIFIED Requirements

### Requirement: Copy command from command builder

The system SHALL allow copying the assembled command string from both (a) the TaskInspector copy button and (b) the command builder component in the task wizard. The command builder SHALL support Ctrl+Y to copy the full assembled command. The existing TaskInspector and TaskForm copy button behavior is unchanged.

#### Scenario: Copy command from task list

- **WHEN** the user clicks the copy button next to the command in TaskInspector
- **THEN** the full command string (command + args joined by space) is copied to the clipboard
- **AND** a toast notification confirms the copy

#### Scenario: Copy command from task editor

- **WHEN** the user clicks the copy button next to the command input in TaskForm
- **THEN** the current value of the command input is copied to the clipboard
- **AND** a toast notification confirms the copy

#### Scenario: Copy command from wizard command builder

- **WHEN** the command builder step is active in the task wizard and the user presses Ctrl+Y
- **THEN** the full assembled command string (executable + args) is copied to the clipboard
