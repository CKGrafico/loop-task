# loop-form-polish Specification (Delta)

## MODIFIED Requirements

### Requirement: Direct edit navigation
Moved to `loop-form-navigation` spec. See that spec for the current edit navigation behavior.

### Requirement: Task mode toggle
Moved to `task-mode-toggle` spec. See that spec for the current task mode behavior.

### Requirement: Inline command with merged args
Moved to `clipboard-copy` spec (merged command display) and `task-mode-toggle` spec.

### Requirement: Smart CWD default
Moved to `smart-cwd-default` spec. See that spec for the current CWD behavior.

### Requirement: Clipboard copy
Moved to `clipboard-copy` spec. See that spec for the current clipboard behavior.

### Requirement: Per-field validation with inline errors
Moved to `inline-validation` spec. See that spec for the current validation behavior.

## ADDED Requirements

### Requirement: Form title distinguishes mode
The form SHALL display "New Loop" when in create mode and "Edit Loop" when in edit mode.

#### Scenario: Create form shows "New Loop"
- **WHEN** user opens the form to create a new loop
- **THEN** the form title SHALL read "New Loop"

#### Scenario: Edit form shows "Edit Loop"
- **WHEN** user opens the form to edit an existing loop
- **THEN** the form title SHALL read "Edit Loop"
