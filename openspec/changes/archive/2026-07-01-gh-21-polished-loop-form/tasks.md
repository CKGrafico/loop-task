## 1. Shared validation unification

- [ ] 1.1 Extract shared validation functions (`validateDuration`, `validateCommand`, `validateCwd`, `validateMaxRuns`, `validateDescription`) into a single module imported by both board and TUI forms
- [ ] 1.2 Replace TUI's local duration regex in `src/tui/utils/validation.ts` with a call to `parseDuration()` from `src/duration.ts`
- [ ] 1.3 Add validation error i18n strings to `src/i18n/en.json` for each field (duration invalid, cwd missing, command empty, description empty, maxRuns invalid)

## 2. Per-field inline validation errors

- [ ] 2.1 Refactor board `CreateForm.tsx` submit() to collect per-field errors instead of a single error string
- [ ] 2.2 Add per-field error rendering in board `CreateForm.tsx`, show red error text below each field on blur and on submit attempt
- [ ] 2.3 Add `touched` tracking per field in board form to trigger error display on blur
- [ ] 2.4 Add per-field validation error display to TUI `WizardForm.tsx`, show error text below the current step's field in red

## 3. Task mode toggle with field clear

- [ ] 3.1 Add task mode toggle (inline command / existing task) in board `CreateForm.tsx`, ensure switching clears the opposite field
- [ ] 3.2 Add task mode toggle in TUI `CreateForm.tsx` wizard, ensure switching clears the opposite field
- [ ] 3.3 Wire task picker to show/hide based on mode in both board and TUI

## 4. Inline command with merged args + copy support

- [ ] 4.1 In edit mode, merge `commandArgs` into the command input using `[command, ...commandArgs].join(" ")` so user sees the full command string
- [ ] 4.2 On save, re-parse the merged string via `parseCommandLine()` to split back into command + args (already done in both forms, verify correctness)
- [ ] 4.3 Add clipboard copy button for command field in board `CreateForm.tsx`
- [ ] 4.4 Add clipboard copy button for cwd field in board `CreateForm.tsx`
- [ ] 4.5 Add clipboard yank shortcut (Ctrl+Y) for command and cwd fields in TUI `WizardForm.tsx`

## 5. Smart CWD default

- [ ] 5.1 Ensure board `createInitialValues()` sets `cwd` to `process.cwd()` as an editable pre-filled value (already done, verify)
- [ ] 5.2 Ensure TUI `createInitialValues()` sets `cwd` to `process.cwd()` as an editable pre-filled value (already done, verify)
- [ ] 5.3 Both forms show cwd as a visible editable input, not just a placeholder

## 6. Direct edit navigation

- [ ] 6.1 Verify board edit action navigates directly to `CreateForm` without showing `DetailView` first (already done, verify)
- [ ] 6.2 Verify TUI edit command navigates directly to wizard form without showing inspector first (already done, verify)

## 7. Form title distinguishes mode

- [ ] 7.1 Board `CreateForm.tsx` title shows "New Loop" (create) or "Edit Loop" (edit)
- [ ] 7.2 TUI `WizardForm.tsx` / `CreateForm.tsx` title shows "New loop" (create) or "Edit loop" (edit)

## 8. Unify cwd fallback behavior

- [ ] 8.1 Make board's submit() fall back to `process.cwd()` when cwd is empty (matching TUI behavior), or eliminate the discrepancy
- [ ] 8.2 Ensure both forms consistently pass cwd to `buildLoopOptions()`
