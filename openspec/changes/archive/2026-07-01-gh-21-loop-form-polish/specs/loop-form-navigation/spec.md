## ADDED Requirements

### Requirement: Edit navigates directly to edit form
When the user triggers the edit action on a loop (via "edit" command, Ctrl+E, or Ctrl+Enter on left panel), the app SHALL navigate directly to the PatchEditForm. The edit form SHALL be pre-populated with all current loop field values via `createInitialValues()`.

#### Scenario: Edit from loops list
- **WHEN** user selects a loop and types "edit" or presses Ctrl+E
- **THEN** the app navigates directly to the PatchEditForm with all fields pre-populated from the selected loop

#### Scenario: Edit command field pre-populated with merged command+args
- **WHEN** user edits a loop with command="npm" and commandArgs=["test"]
- **THEN** the command field in createInitialValues shows "npm test" as a single string

#### Scenario: CWD shows loop's current directory in edit
- **WHEN** user edits a loop with cwd="/home/user/project"
- **THEN** the cwd field shows "/home/user/project", not process.cwd()

### Requirement: PatchEditForm field navigation via keyboard
The PatchEditForm SHALL support Up/Down arrow keys to navigate between field rows when no field is being edited. Enter activates the focused field for editing. While editing, arrow keys function within the input. Escape cancels the edit.

#### Scenario: Navigate fields with arrow keys
- **WHEN** PatchEditForm is displayed with no active field
- **THEN** Up/Down arrows move a focus indicator between field rows

#### Scenario: Activate field for editing
- **WHEN** user presses Enter on a focused field
- **THEN** the field becomes editable with the current value in a FocusableInput

#### Scenario: Cancel field editing
- **WHEN** user presses Escape while editing a field
- **THEN** the edit is cancelled and the field returns to read-only display

### Requirement: PatchEditForm save and cancel
The PatchEditForm SHALL support Save (Enter on save button / Ctrl+S) and Cancel (Escape when no active field) actions. Save validates all pending changes before submitting. Cancel discards all pending changes and returns to the board.

#### Scenario: Save with valid changes
- **WHEN** user has pending changes and triggers save
- **THEN** all fields are validated, the update is sent, and the form closes

#### Scenario: Cancel discards changes
- **WHEN** user presses Escape with no active field and no pending changes
- **THEN** the form closes and returns to the board
