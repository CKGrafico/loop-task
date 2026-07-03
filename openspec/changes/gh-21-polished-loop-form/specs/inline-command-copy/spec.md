## ADDED Requirements

### Requirement: Command args merge and re-parse
When editing in inline mode, `commandArgs` SHALL be merged into a single editable string. On save, the string SHALL be re-parsed via `parseCommandLine()`.

#### Scenario: Editing shows merged command
- **WHEN** the user edits a loop in inline mode
- **THEN** the command input SHALL display the command and args as a single string

#### Scenario: Save re-parses command string
- **WHEN** the user saves the form in inline mode
- **THEN** the command string SHALL be re-parsed via `parseCommandLine()` into command and args

### Requirement: Copy command to clipboard
The user SHALL be able to copy the command value to clipboard from the edit form.

#### Scenario: Copy button in board form
- **WHEN** the user hovers over or clicks the command field in the board form
- **THEN** a copy button SHALL appear and SHALL copy the command value to clipboard on click

#### Scenario: Yank shortcut in TUI
- **WHEN** the user triggers the yank action on the command field in the TUI form
- **THEN** the command value SHALL be copied to clipboard

### Requirement: Copy working directory to clipboard
The user SHALL be able to copy the working directory value to clipboard similarly.

#### Scenario: Copy cwd in board form
- **WHEN** the user clicks the copy button on the cwd field
- **THEN** the cwd value SHALL be copied to clipboard

#### Scenario: Yank cwd in TUI
- **WHEN** the user triggers the yank action on the cwd field in the TUI
- **THEN** the cwd value SHALL be copied to clipboard
