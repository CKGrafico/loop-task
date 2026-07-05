# clipboard-copy Specification (Delta)

## MODIFIED Requirements

### Requirement: Copy command field to clipboard
In addition to the TUI PatchEditForm Ctrl+Y shortcut, the board CreateForm SHALL provide a hover/click copy button for the command field that copies the full command string (including args) to the clipboard.

#### Scenario: Board copy button copies command to clipboard
- **WHEN** user hovers over the command field and clicks the copy button
- **THEN** the command value SHALL be copied to the system clipboard

### Requirement: Copy CWD field to clipboard
In addition to the TUI PatchEditForm Ctrl+Y shortcut, the board CreateForm SHALL provide a hover/click copy button for the cwd field.

#### Scenario: Board copy button copies cwd to clipboard
- **WHEN** user hovers over the cwd field and clicks the copy button
- **THEN** the cwd value SHALL be copied to the system clipboard

### Requirement: Command field shows merged command+args
The board CreateForm in edit mode SHALL also display the merged `command` + `commandArgs` as a single string. On save, both board and TUI forms SHALL re-parse via `parseCommandLine()`.

#### Scenario: Board edit shows merged command
- **WHEN** user edits a loop with command="npm" and commandArgs=["test", "--watch"] in the board form
- **THEN** the command field shows "npm test --watch"
