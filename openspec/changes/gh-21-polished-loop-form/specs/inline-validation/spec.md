# inline-validation Specification

## Purpose
TBD - created by archiving change gh-21-loop-form-polish. Update Purpose after archive.
## Requirements
### Requirement: Per-field validation errors in WizardForm
The WizardForm SHALL validate each field when the user navigates away from it (Tab/Enter) or on submit (Ctrl+S). Validation errors SHALL be displayed as red text below the offending field. Error state SHALL be stored in a `validationErrors` record keyed by field key.

#### Scenario: Invalid duration on navigate away
- **WHEN** user types "abc" in the interval field and presses Tab
- **THEN** a red error message appears below the interval field saying "Invalid duration: \"abc\". Use formats like 10s, 5m, 1h, 1d, 1w"

#### Scenario: Invalid duration on submit
- **WHEN** user types "545445SD" in the interval field and presses Ctrl+S
- **THEN** the form does not submit and shows the duration validation error below the interval field

#### Scenario: Empty required command in inline mode on submit
- **WHEN** user is in inline mode and the command field is empty, then presses Ctrl+S
- **THEN** the form does not submit and shows "Command cannot be empty" below the command field

#### Scenario: Empty description on submit
- **WHEN** the description field is empty and the user presses Ctrl+S
- **THEN** the form does not submit and shows "Description cannot be empty" below the description field

#### Scenario: Invalid CWD on submit
- **WHEN** user enters a non-existent directory path in the cwd field and presses Ctrl+S
- **THEN** the form does not submit and shows "Working directory does not exist: {cwd}" below the cwd field

#### Scenario: Invalid maxRuns on submit
- **WHEN** user types "abc" in the maxRuns field and presses Ctrl+S
- **THEN** the form does not submit and shows "--max-runs must be a positive integer" below the maxRuns field

#### Scenario: Valid field clears error
- **WHEN** a field has a validation error and the user corrects the value and navigates away
- **THEN** the error message for that field is removed

### Requirement: Per-field validation errors in PatchEditForm
The PatchEditForm SHALL validate the active field when the user commits a value (Enter). Validation errors SHALL be displayed as red text next to the field row. The save action SHALL validate all fields and show errors before submitting.

#### Scenario: Invalid interval committed in edit
- **WHEN** user edits the interval field to "xyz" and presses Enter
- **THEN** the value is staged but a validation error appears next to the interval row

#### Scenario: Save with validation errors
- **WHEN** user presses Save with pending changes that contain validation errors
- **THEN** the form does not submit and shows the first validation error

### Requirement: Unified validation via core modules
Both WizardForm and PatchEditForm SHALL use `parseDuration()` from `src/duration.ts`, `parseMaxRuns()` and `parseCommandLine()` from `src/loop-config.ts` for validation. The local `parseInterval()` and `parseArgs()` functions in `CreateForm.tsx` SHALL be removed or replaced.

#### Scenario: Duration validation uses parseDuration
- **WHEN** the user enters a duration value
- **THEN** the form calls `parseDuration()` which uses the `ms` package, accepting the same formats as the CLI (e.g. "1.5h", "90s", etc.)

#### Scenario: Command parsing uses parseCommandLine
- **WHEN** the user enters a command string with quoted arguments
- **THEN** the form calls `parseCommandLine()` which properly handles single/double quotes and backslash escaping, matching CLI behavior

