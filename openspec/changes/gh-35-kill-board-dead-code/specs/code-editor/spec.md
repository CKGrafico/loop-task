## MODIFIED Requirements

### Requirement: CodeEditor modal opens from command field
The system SHALL provide a full-screen modal code editor that opens when the user activates the command field in loop or task creation/editing forms, in the Ink 7 (tui) layer only. The duplicate board layer implementation SHALL be deleted; shared utilities SHALL be imported from `src/shared/ui/`.

#### Scenario: Open editor from Ink wizard
- **WHEN** the user is on the command step of a WizardForm and presses Enter on the preview field
- **THEN** the CodeEditor modal opens with the current command text loaded and cursor at the end

#### Scenario: Open editor with empty command
- **WHEN** the command field is empty and the user opens the editor
- **THEN** the modal opens with a single empty line and cursor at position 0,0
