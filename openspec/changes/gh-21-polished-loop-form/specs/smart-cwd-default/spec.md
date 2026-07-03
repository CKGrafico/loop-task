## ADDED Requirements

### Requirement: Default cwd on create
When creating a new loop, the cwd field SHALL default to `process.cwd()` as a pre-filled editable value.

#### Scenario: New form pre-fills cwd
- **WHEN** the form is opened to create a new loop
- **THEN** the cwd field SHALL be pre-filled with `process.cwd()` as an editable value (not placeholder)

#### Scenario: User can edit default cwd
- **WHEN** the form is opened to create a new loop
- **THEN** the pre-filled cwd SHALL be editable by the user

### Requirement: Existing cwd on edit
When editing an existing loop, the cwd field SHALL show the loop's current working directory.

#### Scenario: Edit form shows existing cwd
- **WHEN** the form is opened to edit an existing loop
- **THEN** the cwd field SHALL display the loop's current working directory value

#### Scenario: User can modify cwd on edit
- **WHEN** the form is opened to edit an existing loop
- **THEN** the user SHALL be able to modify the cwd value
