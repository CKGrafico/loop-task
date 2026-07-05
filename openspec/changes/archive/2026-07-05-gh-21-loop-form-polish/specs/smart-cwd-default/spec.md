# smart-cwd-default Specification (Delta)

## MODIFIED Requirements

### Requirement: CWD defaults to process.cwd() on create
Applies to both WizardForm (TUI) and CreateForm (board). When creating a new loop, both forms SHALL pre-fill the cwd field with `process.cwd()` as an editable default value.

#### Scenario: Board create pre-fills cwd
- **WHEN** user opens the board CreateForm for a new loop
- **THEN** the cwd field is pre-filled with `process.cwd()` as an editable value

### Requirement: CWD existence validation on submit
Both forms SHALL validate the CWD directory exists on the filesystem on submit.

#### Scenario: Board validates CWD on submit
- **WHEN** user enters a non-existent path in the board CreateForm and submits
- **THEN** an inline validation error appears
