## ADDED Requirements

### Requirement: Duration validation via parseDuration

The system SHALL validate duration/interval input using `parseDuration()` from `src/duration.ts`. Invalid input SHALL show an inline error on blur or submit.

#### Scenario: Invalid duration shows inline error

- **WHEN** the user enters an invalid duration like "545445SD"
- **THEN** an inline error SHALL appear: "Invalid duration format. Use 30s, 5m, 1h, etc."

### Requirement: Inline command non-empty

The command field SHALL be required (non-empty) when in inline command mode.

#### Scenario: Empty command shows error on submit

- **WHEN** the user submits with an empty command field in inline mode
- **THEN** an inline error SHALL be displayed: "Command is required"

### Requirement: Description non-empty

The description field SHALL be required (non-empty) on submit.

#### Scenario: Empty description shows error

- **WHEN** the user submits with an empty description
- **THEN** an inline error SHALL be displayed: "Description is required"

### Requirement: maxRuns positive integer validation

The system SHALL validate the maxRuns field as a positive integer via `parseMaxRuns()`.

#### Scenario: Invalid maxRuns shows error

- **WHEN** the user enters a non-positive integer or non-numeric value for maxRuns
- **THEN** an inline error SHALL be displayed

### Requirement: Errors on blur and submit

Validation errors SHALL appear immediately on field blur, or on submit attempt for all fields.

#### Scenario: Error appears on blur

- **WHEN** the user enters invalid data and tabs away from the field
- **THEN** an inline error SHALL appear below the field immediately

#### Scenario: All errors shown on submit

- **WHEN** the user submits with multiple invalid fields
- **THEN** all field errors SHALL be displayed simultaneously

### Requirement: Unified validation path

Both board and TUI SHALL delegate validation to `buildLoopOptions()` / `parseDuration()` / `parseMaxRuns()` from `src/loop-config.ts` and `src/duration.ts`.

#### Scenario: Board uses parseDuration

- **WHEN** the board form validates a duration
- **THEN** it SHALL call `parseDuration()` from `src/duration.ts`

#### Scenario: TUI uses parseDuration

- **WHEN** the TUI form validates a duration
- **THEN** it SHALL call `parseDuration()` from `src/duration.ts`

### Requirement: TUI shows validation errors

The TUI WizardForm SHALL display validation errors inline, matching board behavior.

#### Scenario: TUI WizardForm shows errors

- **WHEN** the TUI wizard has validation errors
- **THEN** errors SHALL be displayed inline next to the relevant fields
