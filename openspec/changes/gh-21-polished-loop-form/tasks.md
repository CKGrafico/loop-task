## 1. Smart CWD Default

- [ ] 1.1 Add `process.cwd()` as pre-filled editable value in board CreateForm create mode
- [ ] 1.2 Add `process.cwd()` as pre-filled editable value in TUI WizardForm create mode
- [ ] 1.3 Ensure edit mode shows loop's stored cwd (not process.cwd()) in both forms
- [ ] 1.4 Validate CWD existence on submit in both forms using shared path from design

## 2. Task Mode Toggle

- [ ] 2.1 Add task mode toggle (inline command / existing task) to WizardForm with mode switching that clears the irrelevant field
- [ ] 2.2 Add task mode toggle to board CreateForm with mode switching that clears the irrelevant field

## 3. Inline Command with Merged Args

- [ ] 3.1 Merge `commandArgs` into single editable string when editing in inline mode (both forms)
- [ ] 3.2 Re-parse command string via `parseCommandLine()` on save in both forms

## 4. Clipboard Copy Support

- [ ] 4.1 Add hover/click copy button for command field in board CreateForm edit mode
- [ ] 4.2 Add hover/click copy button for cwd field in board CreateForm edit mode
- [ ] 4.3 Add yank-style copy shortcut for command and cwd in TUI CreateForm edit mode
- [ ] 4.4 Show brief "Copied!" feedback after copy action

## 5. Direct Edit Navigation (Skip Detail View)

- [ ] 5.1 Ensure board edit action navigates directly to CreateForm (not DetailView/Inspector first)
- [ ] 5.2 Ensure TUI edit command navigates directly to edit form (not read-only view first)
- [ ] 5.3 Pre-populate edit form with all current loop field values via `createInitialValues()`

## 6. Per-Field Validation with Inline Errors

- [ ] 6.1 Unify validation: both board and TUI forms delegate to `parseDuration()` / `parseMaxRuns()` / `buildLoopOptions()` — remove local validators
- [ ] 6.2 Add per-field inline error display on blur in board CreateForm
- [ ] 6.3 Add per-field inline error display on blur in TUI WizardForm
- [ ] 6.4 Validate all fields on submit with inline error display in both forms
- [ ] 6.5 Add validation error strings to `src/i18n/en.json` for any missing messages

## 7. Form Title Distinction

- [ ] 7.1 Show "New Loop" title in create mode, "Edit Loop" in edit mode for board CreateForm
- [ ] 7.2 Show "New Loop" title in create mode, "Edit Loop" in edit mode for TUI CreateForm

## 8. Verification

- [ ] 8.1 Run `rtk npx tsc --noEmit` — no type errors
- [ ] 8.2 Run `rtk pnpm lint` — no lint errors
- [ ] 8.3 Run `rtk pnpm test` — all tests pass
