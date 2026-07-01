## 1. Validation Infrastructure

- [ ] 1.1 Add `validateField(key: string, value: string, options?: { taskMode?: string; allValues?: Record<string, string> }): string | null` utility function in `src/tui/utils/validation.ts` that wraps `parseDuration()`, `parseMaxRuns()`, `parseCommandLine()` from core, plus CWD existence check and command/description emptiness checks. Returns error message string or null.
- [ ] 1.2 Add i18n keys for validation error display: `wizard.errorPrefix`, `patch.errorPrefix` in `src/i18n/en.json`

## 2. WizardForm Inline Validation

- [ ] 2.1 Add `validationErrors: Record<string, string>` state to WizardForm. On field navigate-away (Tab/Enter moving to next field), call `validateField()` for the field being left. Display error text in red below the field if validation fails. Clear error if validation passes.
- [ ] 2.2 On Ctrl+S submit, validate all visible required fields via `validateField()`. If any errors, jump to the first error field and show its error. Do not call `onComplete`.
- [ ] 2.3 Add task mode toggle clearing logic: when taskMode changes from "Inline command" to "Existing task" (or vice versa), clear the `command` or `taskId` value respectively and clear any validation error for the cleared field.

## 3. CreateForm - Replace Local Parsers with Core

- [ ] 3.1 Remove `parseInterval()` and `parseArgs()` from `src/tui/components/CreateForm.tsx`. Import `parseDuration` from `src/duration.js` and `parseCommandLine` from `src/loop-config.js` instead.
- [ ] 3.2 Update `handleComplete` in CreateForm to use `parseDuration()` and `parseCommandLine()` instead of the removed local functions. Wrap calls in try/catch and set validation errors on failure instead of silently returning.
- [ ] 3.3 Update `handleEditSave` in CreateForm to use `parseDuration()` and `parseCommandLine()`, and validate before sending the update request.

## 4. PatchEditForm Keyboard Navigation & Validation

- [ ] 4.1 Add `focusedRowIndex: number` state to PatchEditForm. Render a focus indicator (brand-colored arrow or highlight) on the focused row when no field is being edited. Up/Down arrows navigate rows.
- [ ] 4.2 Enter on a focused row sets `activeField` to that field's key and populates `activeFieldValue` with the current display value. Escape cancels the edit (existing behavior). Enter commits (existing behavior).
- [ ] 4.3 Add per-field validation on commit: call `validateField()` when a field value is committed. Show error text next to the field row. On Save, validate all pending changes and initial values before sending.
- [ ] 4.4 Remove the "type 'change <field>' to edit" hint text and replace with navigation hints using i18n keys.

## 5. Smart CWD Default

- [ ] 5.1 In `src/tui/App.tsx` `createInitialValues()`, set `cwd` to `process.cwd()` when creating (loop is null). When editing, keep the loop's current cwd.
- [ ] 5.2 In WizardForm steps (CreateForm), the `cwd` step's `defaultValue` uses `process.cwd()` for create mode (already handled via initial values from App.tsx).

## 6. PatchEditForm Command Merge & Copy

- [ ] 6.1 In `src/tui/App.tsx` `createInitialValues()`, merge `command` + `commandArgs` into a single string using `commandLine()` helper (already exists in CreateForm). Set as the `command` initial value.
- [ ] 6.2 In PatchEditForm, add Ctrl+Y handler: when `activeField === null` and `focusedRowIndex` is on the command or cwd row, call `copyToClipboard()` with the field's display value and invoke a new `onCopy` callback prop.
- [ ] 6.3 In `src/tui/components/CreateForm.tsx`, on `handleEditSave` re-parse the command field via `parseCommandLine()` instead of `parseArgs()` to split into command + commandArgs.
- [ ] 6.4 Add `onCopy` prop to PatchEditFormProps and wire it through CreateForm to App.tsx where it triggers a toast.

## 7. i18n Updates

- [ ] 7.1 Add all new i18n strings to `src/i18n/en.json`: `wizard.validationError`, `patch.hintNavigation`, `patch.hintEditing`, `patch.hintCopy`, `patch.ctrlY`, `patch.enterEdit`, `patch.escapeCancel`, `board.toastCopied` (already exists)

## 8. Verification

- [ ] 8.1 Run `rtk npx tsc --noEmit` and fix any type errors
- [ ] 8.2 Run `rtk pnpm lint` and fix any lint errors
- [ ] 8.3 Run `rtk pnpm test` and fix any failing tests
- [ ] 8.4 Run `rtk pnpm build` and verify build succeeds
