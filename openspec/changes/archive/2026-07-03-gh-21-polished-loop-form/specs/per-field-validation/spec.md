## ADDED Requirements

### Requirement: Duration field validation
The duration/interval field SHALL validate against `parseDuration()` from `src/duration.ts`, accepting formats like `30s`, `5m`, `30m`, `1h`, `1d`.

#### Scenario: Valid duration passes
- **WHEN** the user enters a valid duration like `30s` or `5m`
- **THEN** no error SHALL be shown for the duration field

#### Scenario: Invalid duration shows error
- **WHEN** the user enters an invalid duration like `545445SD`
- **THEN** an inline error SHALL be displayed, e.g., "Invalid duration format. Use 30s, 5m, 1h, etc."

### Requirement: Command field validation (inline mode)
The command field SHALL be validated as non-empty when in inline mode.

#### Scenario: Empty command shows error
- **WHEN** the user leaves the command field empty in inline mode and blurs or submits
- **THEN** an inline error SHALL be displayed stating the command must not be empty

### Requirement: Description field validation
The description field SHALL be validated as non-empty.

#### Scenario: Empty description shows error
- **WHEN** the user leaves the description empty and blurs or submits
- **THEN** an inline error SHALL be displayed stating the description must not be empty

### Requirement: CWD field validation
The cwd field SHALL validate that the directory exists on the filesystem.

#### Scenario: Non-existent directory shows error
- **WHEN** the user enters a non-existent directory path and blurs or submits
- **THEN** an inline error SHALL be displayed stating the directory does not exist

### Requirement: maxRuns field validation
The maxRuns field SHALL validate as a positive integer via `parseMaxRuns()`.

#### Scenario: Non-positive integer shows error
- **WHEN** the user enters a non-positive value like `0` or `-1`
- **THEN** an inline error SHALL be displayed stating maxRuns must be a positive integer

### Requirement: Inline error display
Errors SHALL appear immediately on blur or on submit attempt, displayed in red next to or below the offending field.

#### Scenario: Error on blur
- **WHEN** the user blurs a field with invalid input
- **THEN** an error SHALL appear inline next to that field

#### Scenario: Error on submit
- **WHEN** the user submits the form with invalid fields
- **THEN** errors SHALL appear inline next to all offending fields

### Requirement: Unified validation path
Both board and TUI SHALL delegate validation to shared utility functions: `buildLoopOptions()`, `parseDuration()`, `parseCommandLine()` from `src/loop-config.ts` and `src/duration.ts`.

#### Scenario: Board uses shared validation
- **WHEN** the board form validates input
- **THEN** it SHALL use `parseDuration()` and `buildLoopOptions()` from shared utilities

#### Scenario: TUI uses shared validation
- **WHEN** the TUI form validates input
- **THEN** it SHALL use `parseDuration()` and `buildLoopOptions()` from shared utilities (not local regex)
