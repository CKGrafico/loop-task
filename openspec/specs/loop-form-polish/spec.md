# loop-form-polish Specification

## Purpose
TBD - created by archiving change gh-21-polished-loop-form. Update Purpose after archive.
## Requirements
### Requirement: Direct edit navigation
When the user triggers "Edit" on an existing loop, the application SHALL navigate directly to the edit form without showing a read-only detail/inspector view first. The edit form SHALL be pre-populated with all current loop field values.

#### Scenario: Board edit action navigates directly to form
- **WHEN** user presses Enter or activates the edit action on a loop in the board
- **THEN** the app navigates directly to `CreateForm` in edit mode, not to `DetailView`

#### Scenario: TUI edit command opens edit form directly
- **WHEN** user runs the `edit` command on a loop in the TUI
- **THEN** the app navigates directly to the edit form, not to a read-only view

### Requirement: Task mode toggle
The form SHALL provide a toggle allowing the user to switch between "Inline command" and "Existing task" modes.

#### Scenario: Switch from inline to task mode clears command
- **WHEN** user switches from "Inline command" mode to "Existing task" mode
- **THEN** the command text input SHALL be cleared and a task search/select control SHALL be shown instead

#### Scenario: Switch from task to inline mode clears task selection
- **WHEN** user switches from "Existing task" mode to "Inline command" mode
- **THEN** the task selection SHALL be cleared and a command text input SHALL be shown instead

### Requirement: Inline command with merged args
The form SHALL merge `commandArgs` into a single editable string when editing in inline mode. On save, it SHALL re-parse the string into `command` and `commandArgs` via `parseCommandLine()`.

#### Scenario: Edit shows merged command in single input
- **WHEN** user edits a loop that has command "npm test" and commandArgs ["--watch", "--coverage"]
- **THEN** the command input SHALL display "npm test --watch --coverage"

#### Scenario: Save re-parses command string
- **WHEN** user edits the merged command string and submits the form
- **THEN** the system SHALL call `parseCommandLine()` to split into command and args before saving

### Requirement: Smart CWD default
The form SHALL pre-fill the `cwd` (working directory) field with `process.cwd()` when creating a new loop. On edit, it SHALL display the loop's current `cwd` value. The field SHALL be editable in both cases.

#### Scenario: Create form pre-fills cwd
- **WHEN** user opens the create loop form
- **THEN** the `cwd` input SHALL contain the value of `process.cwd()` as an editable value

#### Scenario: Edit form shows current cwd
- **WHEN** user opens the edit form for an existing loop
- **THEN** the `cwd` input SHALL contain the loop's stored `cwd` value

### Requirement: Clipboard copy
The form SHALL provide clipboard copy functionality for the command and cwd fields. The board SHALL use a hover/click copy button. The TUI SHALL use a `yank`-style shortcut.

#### Scenario: Board copy button copies command to clipboard
- **WHEN** user hovers over the command field and clicks the copy button
- **THEN** the command value SHALL be copied to the system clipboard

#### Scenario: Board copy button copies cwd to clipboard
- **WHEN** user hovers over the cwd field and clicks the copy button
- **THEN** the cwd value SHALL be copied to the system clipboard

### Requirement: Per-field validation with inline errors
The form SHALL validate each field on blur and on submit. Errors SHALL appear inline next to or below the offending field in red. Both board and TUI SHALL use shared validation logic from `parseDuration()` and `buildLoopOptions()` / `parseMaxRuns()`.

#### Scenario: Invalid duration shows inline error
- **WHEN** user enters "545445SD" in the duration field and tabs away
- **THEN** an inline error SHALL appear reading "Invalid duration format. Use 30s, 5m, 1h, etc."

#### Scenario: Empty command in inline mode shows error
- **WHEN** user is in inline command mode and leaves the command field empty
- **THEN** an inline error SHALL appear reading "Command is required"

#### Scenario: Empty description shows error
- **WHEN** user leaves the description field empty
- **THEN** an inline error SHALL appear reading "Description is required"

#### Scenario: Non-existent cwd shows error
- **WHEN** user enters a non-existent directory path in the cwd field
- **THEN** an inline error SHALL appear reading "Directory does not exist"

#### Scenario: Invalid maxRuns shows error
- **WHEN** user enters "0" or "-1" in the maxRuns field
- **THEN** an inline error SHALL appear reading "Must be a positive number"

### Requirement: Form title distinguishes mode
The form SHALL display "New Loop" when in create mode and "Edit Loop" when in edit mode.

#### Scenario: Create form shows "New Loop"
- **WHEN** user opens the form to create a new loop
- **THEN** the form title SHALL read "New Loop"

#### Scenario: Edit form shows "Edit Loop"
- **WHEN** user opens the form to edit an existing loop
- **THEN** the form title SHALL read "Edit Loop"

