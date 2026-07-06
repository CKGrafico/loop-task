## ADDED Requirements

### Requirement: Loop cwd hint indicates project inheritance
The loop create/edit form (TUI wizard and board form) SHALL display a hint on the `cwd` input indicating that leaving it empty inherits the project's working directory.

#### Scenario: CWD input hint shows inheritance
- **WHEN** the user views the cwd input in the create loop form
- **THEN** the hint text indicates the field can be left empty to inherit from the project directory

## MODIFIED Requirements

### Requirement: CWD existence validation on submit
The form SHALL validate that the CWD directory exists on the filesystem when submitting. If the directory does not exist, a validation error SHALL be shown. When the CWD field is empty on submit, the form SHALL resolve the effective cwd using the project's directory (inheriting from project if set, otherwise falling back to `process.cwd()`), and the resolved path is used as the cwd value.

#### Scenario: Non-existent CWD on submit
- **WHEN** user enters "/nonexistent/path" as the cwd and submits
- **THEN** the form shows a validation error "Working directory does not exist: /nonexistent/path"

#### Scenario: Empty CWD resolves via project directory
- **WHEN** the cwd field is empty on submit and the loop's project has directory "/home/user/work"
- **THEN** the form uses "/home/user/work" as the cwd value (inherits from project)

#### Scenario: Empty CWD with no project directory defaults to process.cwd()
- **WHEN** the cwd field is empty on submit and the loop's project has no directory set
- **THEN** the form uses `process.cwd()` as the cwd value

#### Scenario: Relative CWD resolves against project directory
- **WHEN** user enters "subdir" as the cwd and the project has directory "/home/user/work"
- **THEN** the form resolves the cwd to "/home/user/work/subdir"
