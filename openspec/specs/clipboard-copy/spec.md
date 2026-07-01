# clipboard-copy Specification

## Purpose
TBD - created by archiving change gh-21-loop-form-polish. Update Purpose after archive.
## Requirements
### Requirement: Copy command field to clipboard
In the PatchEditForm, when the command field is focused (not being edited), the user SHALL be able to copy the full command string (including args) to the clipboard via a keyboard shortcut (Ctrl+Y). A toast SHALL confirm the copy action.

#### Scenario: Copy command in edit form
- **WHEN** user focuses the command field row in PatchEditForm and presses Ctrl+Y
- **THEN** the command string is copied to the clipboard and a toast appears saying "Copied to clipboard"

### Requirement: Copy CWD field to clipboard
In the PatchEditForm, when the cwd field is focused (not being edited), the user SHALL be able to copy the directory path to the clipboard via Ctrl+Y.

#### Scenario: Copy CWD in edit form
- **WHEN** user focuses the cwd field row in PatchEditForm and presses Ctrl+Y
- **THEN** the cwd string is copied to the clipboard and a toast appears saying "Copied to clipboard"

### Requirement: Command field shows merged command+args
In the PatchEditForm, the command field SHALL display the merged `command` + `commandArgs` as a single string. When saving, the form SHALL re-parse the merged string via `parseCommandLine()`.

#### Scenario: Edit shows merged command
- **WHEN** user edits a loop with command="npm" and commandArgs=["test", "--watch"]
- **THEN** the command field shows "npm test --watch"

#### Scenario: Save re-parses merged command
- **WHEN** user edits the command field to "npm run build -- --watch" and saves
- **THEN** parseCommandLine splits it into command="npm" and commandArgs=["run", "build", "--", "--watch"]

