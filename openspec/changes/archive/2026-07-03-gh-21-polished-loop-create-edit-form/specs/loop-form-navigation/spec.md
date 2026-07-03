## ADDED Requirements

### Requirement: Edit navigates directly to populated form

When the user selects "Edit" on an existing loop, the app SHALL navigate directly to the populated edit form — not through a read-only detail view first.

#### Scenario: Board edit bypasses DetailView

- **WHEN** the user triggers "Edit" on a loop in the board
- **THEN** the app SHALL navigate directly to the CreateForm in edit mode, pre-populated with the loop's current values

#### Scenario: TUI edit bypasses Inspector

- **WHEN** the user triggers "Edit" on a loop in the TUI
- **THEN** the app SHALL navigate directly to the edit form, pre-populated with the loop's current values

### Requirement: Edit form is pre-populated

The edit form SHALL pre-populate all fields with the loop's current values via `createInitialValues()`.

#### Scenario: All fields pre-populated on edit

- **WHEN** the user edits an existing loop
- **THEN** all fields SHALL be pre-populated with the loop's current values (command, args, cwd, description, interval, maxRuns, taskId, etc.)
