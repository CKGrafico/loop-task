## 1. Professional Form Layout & Polish

- [ ] 1.1 Align two-column grid spacing, borders, and labels in board `CreateForm.tsx`
- [ ] 1.2 Set form title to "New Loop" in create mode and "Edit Loop" in edit mode
- [ ] 1.3 Ensure active/focused field is visually distinct in both board and TUI forms
- [ ] 1.4 Sync and align field labels, placeholders, and help text across board and TUI

## 2. Task Mode Toggle & Inline Command Mode

- [ ] 2.1 Add `taskMode: 'inline' | 'task'` state to TUI `WizardForm.tsx` with toggle step
- [ ] 2.2 Wire board `CreateForm.tsx` to show command vs taskId field based on taskMode
- [ ] 2.3 Clear irrelevant field when switching modes in both forms
- [ ] 2.4 Add `taskMode` awareness to `PatchEditForm.tsx` display logic

## 3. Inline Command Editing & Merge/Re-parse

- [ ] 3.1 Merge `command` + `commandArgs` into single string for edit display
- [ ] 3.2 Re-parse merged string via `parseCommandLine()` on save in board `CreateForm.tsx`
- [ ] 3.3 Re-parse merged string via `parseCommandLine()` on save in TUI `PatchEditForm.tsx`

## 4. Smart CWD Default

- [ ] 4.1 Pre-fill `cwd` with `process.cwd()` as editable value in board `CreateForm.tsx` create mode
- [ ] 4.2 Pre-fill `cwd` with `process.cwd()` as editable value in TUI `WizardForm.tsx` create mode
- [ ] 4.3 Show stored `cwd` value on edit in both board and TUI edit forms
- [ ] 4.4 Add CWD existence validation on submit

## 5. Direct Edit Navigation

- [ ] 5.1 Board edit action renders `CreateForm` in edit mode directly (skip `DetailView`)
- [ ] 5.2 TUI `edit` command opens `PatchEditForm` directly
- [ ] 5.3 Pre-populate edit form with all current loop field values via `createInitialValues()`

## 6. Per-Field Inline Validation

- [ ] 6.1 Add `validationErrors` state map keyed by field name to board `CreateForm.tsx`
- [ ] 6.2 Add `validationErrors` state map keyed by field name to TUI `WizardForm.tsx`
- [ ] 6.3 Unify validation: replace local `parseInterval()` / `parseArgs()` with `parseDuration()` from `src/duration.ts` and `parseCommandLine()` / `parseMaxRuns()` from `src/loop-config.ts`
- [ ] 6.4 Validate duration, command (inline mode), description, cwd, and maxRuns on blur
- [ ] 6.5 Validate all fields on submit and block submission if errors exist
- [ ] 6.6 Display inline error messages in red below offending field in both board and TUI
- [ ] 6.7 Clear errors for a field when user corrects the value

## 7. Clipboard Copy

- [ ] 7.1 Add clipboard copy button (hover/click) for command and cwd fields in board `CreateForm.tsx`
- [ ] 7.2 Add Ctrl+Y keyboard shortcut for copying command/cwd in TUI `PatchEditForm.tsx`
- [ ] 7.3 Show toast confirmation on copy in both board and TUI
