## ADDED Requirements

### Requirement: CWD defaults to process.cwd() on create
When creating a new loop, the WizardForm SHALL pre-fill the cwd field with `process.cwd()` as the default value. The value SHALL be editable (not just a placeholder). The user can clear it, modify it, or accept the default.

#### Scenario: Create new loop shows CWD default
- **WHEN** user opens the create loop form
- **THEN** the cwd field shows the current working directory as a pre-filled editable value

#### Scenario: User can modify the CWD default
- **WHEN** user sees the pre-filled cwd value and edits it
- **THEN** the field shows the edited value

#### Scenario: Edit existing loop shows its CWD
- **WHEN** user opens the edit loop form for a loop with cwd="/some/path"
- **THEN** the cwd field shows "/some/path", not process.cwd()

### Requirement: CWD existence validation on submit
The form SHALL validate that the CWD directory exists on the filesystem when submitting. If the directory does not exist, a validation error SHALL be shown.

#### Scenario: Non-existent CWD on submit
- **WHEN** user enters "/nonexistent/path" as the cwd and submits
- **THEN** the form shows a validation error "Working directory does not exist: /nonexistent/path"

#### Scenario: Empty CWD default to process.cwd()
- **WHEN** the cwd field is empty on submit
- **THEN** the form uses process.cwd() as the cwd value (no error)
