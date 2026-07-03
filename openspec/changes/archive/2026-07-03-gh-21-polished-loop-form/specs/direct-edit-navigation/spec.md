## ADDED Requirements

### Requirement: Direct edit navigation
When the user selects "Edit" on an existing loop, the app SHALL navigate directly to the edit form, bypassing any read-only detail/inspector view.

#### Scenario: Board edit goes directly to CreateForm
- **WHEN** the user triggers Edit on a loop in the board
- **THEN** the app SHALL navigate directly to CreateForm in edit mode, bypassing DetailView

#### Scenario: TUI edit goes directly to edit form
- **WHEN** the user runs the `edit` command on a loop in the TUI
- **THEN** the app SHALL navigate directly to the edit form, bypassing Inspector

#### Scenario: DetailView remains accessible
- **WHEN** the user views a loop for browsing (not editing)
- **THEN** DetailView/Inspector SHALL remain available as read-only reference views

### Requirement: Pre-populated edit form
When navigating to the edit form, all current loop field values SHALL be pre-populated via `createInitialValues()`.

#### Scenario: Edit form shows existing values
- **WHEN** the edit form opens
- **THEN** all fields SHALL be pre-populated with the loop's current values
