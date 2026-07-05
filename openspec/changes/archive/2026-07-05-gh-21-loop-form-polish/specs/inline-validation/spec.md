# inline-validation Specification (Delta)

## MODIFIED Requirements

### Requirement: Per-field validation errors in WizardForm
WizardForm SHALL validate fields on blur (tab away / enter) and on submit. Validation uses `parseDuration()`, `parseMaxRuns()`, `parseCommandLine()` and directory existence check. No local regex validators.

#### Scenario: Valid field clears error on correction
- **WHEN** a field has a validation error and the user corrects the value and navigates away
- **THEN** the error message for that field is removed

### Requirement: Per-field validation errors in PatchEditForm
PatchEditForm SHALL validate the active field when the user commits a value (Enter). Validation errors SHALL be displayed as red text next to the field row.

#### Scenario: PatchEditForm inline validation on commit
- **WHEN** user edits a field value and presses Enter to commit
- **THEN** the value is validated and an inline error appears if invalid

### Requirement: Unified validation via core modules
Both forms SHALL use `parseDuration()` from `src/duration.ts`, `parseMaxRuns()` and `parseCommandLine()` from `src/loop-config.ts`. Local `parseInterval()` and `parseArgs()` in `CreateForm.tsx` SHALL be removed.
