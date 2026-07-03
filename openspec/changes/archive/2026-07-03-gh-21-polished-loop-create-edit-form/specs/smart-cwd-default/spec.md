## ADDED Requirements

### Requirement: CWD defaults to process.cwd()

When creating a new loop, the cwd field SHALL default to the current working directory (`process.cwd()`).

#### Scenario: Create form shows process.cwd() as default

- **WHEN** the user creates a new loop
- **THEN** the cwd field SHALL be pre-filled with `process.cwd()` as an editable value

### Requirement: CWD is editable

The default cwd value SHALL appear as editable text in the input, not as a placeholder.

#### Scenario: Default CWD is editable

- **WHEN** the user creates a new loop
- **THEN** the cwd field SHALL contain the default value as editable text

### Requirement: Edit mode shows current loop CWD

When editing an existing loop, the cwd field SHALL display the loop's current working directory.

#### Scenario: Edit shows stored CWD

- **WHEN** the user edits an existing loop
- **THEN** the cwd field SHALL be pre-filled with the loop's stored cwd value

### Requirement: CWD existence validation

The form SHALL validate that the cwd directory exists on the filesystem when the user submits or blurs the field.

#### Scenario: Invalid CWD shows error on submit

- **WHEN** the user submits with a non-existent cwd
- **THEN** an inline error SHALL be displayed indicating the directory does not exist
