## 1. Smart CWD Default

- [ ] 1.1 Pre-fill `process.cwd()` as editable default in board CreateForm for new loops
- [ ] 1.2 Ensure edit mode shows stored cwd value (not `process.cwd()`)

## 2. Direct Edit Navigation

- [ ] 2.1 Board: route edit action directly to CreateForm in edit mode (skip DetailView)
- [ ] 2.2 Pre-populate CreateForm with all loop field values via `createInitialValues()` on edit

## 3. Task Mode Toggle

- [ ] 3.1 Add toggle between "Inline command" and "Existing task" in board CreateForm
- [ ] 3.2 Show/hide command or taskId field based on selected mode
- [ ] 3.3 Clear the irrelevant field when switching modes

## 4. Inline Command Merging

- [ ] 4.1 Merge `commandArgs` into single string in edit mode (both board and TUI)
- [ ] 4.2 Re-parse via `parseCommandLine()` on save
- [ ] 4.3 Remove local `parseArgs()` and `parseInterval()` from board CreateForm

## 5. Clipboard Copy

- [ ] 5.1 Add hover/click copy button for command field in board CreateForm
- [ ] 5.2 Add hover/click copy button for cwd field in board CreateForm
- [ ] 5.3 Add Ctrl+Y shortcut for command/cwd copy in TUI PatchEditForm
- [ ] 5.4 Show toast confirmation on copy in TUI

## 6. Per-Field Inline Validation

- [ ] 6.1 Add validation error state map to board CreateForm
- [ ] 6.2 Validate duration via `parseDuration()` on blur/submit
- [ ] 6.3 Validate command non-empty in inline mode
- [ ] 6.4 Validate description non-empty
- [ ] 6.5 Validate cwd directory exists
- [ ] 6.6 Validate maxRuns positive integer via `parseMaxRuns()`
- [ ] 6.7 Display errors as red text below each field
- [ ] 6.8 Add per-field validation errors to TUI WizardForm
- [ ] 6.9 Add per-field validation errors to TUI PatchEditForm
- [ ] 6.10 Clear error when field is corrected

## 7. Form Layout Polish

- [ ] 7.1 Add "New Loop" / "Edit Loop" title distinction
- [ ] 7.2 Ensure consistent two-column grid, spacing, labels, focus states
