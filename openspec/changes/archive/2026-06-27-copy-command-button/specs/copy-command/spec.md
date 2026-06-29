## ADDED Requirements

### Requirement: Copy button next to task command

The system SHALL display a copy button next to the command field in both the TaskInspector (task list view) and the TaskForm (task edit/create view). Clicking the button SHALL copy the full command string to the system clipboard and show a toast notification.

#### Scenario: Copy command from task list

- **WHEN** the user clicks the copy button next to the command in TaskInspector
- **THEN** the full command string (command + args joined by space) is copied to the clipboard
- **AND** a toast notification confirms the copy

#### Scenario: Copy command from task editor

- **WHEN** the user clicks the copy button next to the command input in TaskForm
- **THEN** the current value of the command input is copied to the clipboard
- **AND** a toast notification confirms the copy
