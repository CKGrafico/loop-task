# loop-form-navigation Specification (Delta)

## MODIFIED Requirements

### Requirement: Edit navigates directly to edit form
The board CreateForm SHALL support direct edit navigation when the user triggers the edit action on a loop. TUI SHALL navigate directly to PatchEditForm.

#### Scenario: Board edit navigates directly to CreateForm
- **WHEN** user presses Enter or activates the edit action on a loop in the board
- **THEN** the app navigates directly to `CreateForm` in edit mode, not to `DetailView`

#### Scenario: TUI edit opens PatchEditForm directly
- **WHEN** user types "edit" command or presses Ctrl+E on a loop
- **THEN** the app navigates directly to PatchEditForm
