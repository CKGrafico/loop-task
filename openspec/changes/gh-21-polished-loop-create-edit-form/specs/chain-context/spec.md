## MODIFIED Requirements

### Requirement: Duration input formatting and validation

The loop form SHALL accept duration input in formats supported by `parseDuration()` (e.g., `30s`, `5m`, `30m`, `1h`, `1d`). Invalid duration input SHALL be rejected with a clear error message. Both board and TUI forms SHALL delegate to `parseDuration()` from `src/duration.ts` for validation.

#### Scenario: Valid duration accepted

- **WHEN** the user enters `30s`, `5m`, `30m`, `1h`, or `1d`
- **THEN** the form SHALL accept the input

#### Scenario: Invalid duration rejected

- **WHEN** the user enters an invalid format like `545445SD`
- **THEN** the form SHALL show "Invalid duration format. Use 30s, 5m, 1h, etc."

#### Scenario: Board validates via parseDuration

- **WHEN** the board form validates duration
- **THEN** it SHALL use `parseDuration()` from `src/duration.ts`

#### Scenario: TUI validates via parseDuration

- **WHEN** the TUI form validates duration
- **THEN** it SHALL use `parseDuration()` from `src/duration.ts`
