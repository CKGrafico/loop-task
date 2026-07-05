# task-mode-toggle Specification (Delta)

## MODIFIED Requirements

### Requirement: Task mode toggle in WizardForm
The board CreateForm SHALL also include a task mode toggle that lets the user switch between "Inline command" and "Existing task" modes, matching the TUI WizardForm behavior.

#### Scenario: Board create form shows inline command by default
- **WHEN** user opens the board CreateForm for a new loop
- **THEN** the form defaults to "Inline command" mode and shows the command text input

#### Scenario: Board form switches modes
- **WHEN** user toggles from "Inline command" to "Existing task" in the board form
- **THEN** the command field is replaced with a SearchSelect task picker and vice versa
