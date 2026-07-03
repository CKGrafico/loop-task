## Why

The ttyd walkthrough of the new loop create/edit form (gh-21 work) found three fidelity gaps between what the form shows and what the loop actually is:

1. **Task binding invisible on edit**: editing a loop bound to a task (e.g. `sds` → task `aea4edd7`) shows an empty "Pick a previously defined task" placeholder. The user cannot see the current binding and cannot tell whether saving preserves or drops it.
2. **Static selects look dead**: "Existing task", "Wait for the first interval", and "Which project? Default" render as plain text among bordered inputs — nothing signals they are interactive, nor how to change them.
3. **Paste is dropped in form fields**: a multi-character paste chunk into a form text field inserts only the first character (observed live). The command bar already sanitizes and inserts paste chunks (`sanitizePaste` in CommandInput); form inputs never got that path — and command strings are exactly what users paste into this form.

## What Changes

- **Prefill current values on edit**: the task selector shows the bound task's name (`say by (aea4edd7)`); saving without touching it preserves the binding. All fields open pre-populated with the loop's current values.
- **Select affordance**: enumerated fields render with a visible affordance (`‹ Existing task ›` chevrons, focused state matching bordered inputs) plus a hint (`←/→ change`), so they read as controls, not labels.
- **Paste in form inputs**: multi-character printable input (and bracketed-paste chunks) is sanitized (markers stripped, newlines collapsed, control chars dropped, capped) and inserted whole in every form text field, matching command-bar behavior.

### Non-goals

- No changes to wizard step flow, validation rules, or the shared `useLoopFormValidation` hook (owned by the in-flight gh-21 change — this proposal builds on top and must rebase on its outcome).
- No visual redesign of the two-column layout.
- No multi-line command editing.

## Capabilities

### New Capabilities
- `form-paste`: sanitized whole-chunk paste in board form text inputs.

### Modified Capabilities
- Loop edit form: prefilled task binding and explicit select affordances.

## Impact

- **`src/tui/components/CreateForm.tsx` / `WizardForm.tsx` / `TaskPickerModal.tsx`**: prefill selected task name from `loop.taskId` on edit; select-style rendering for enumerated steps.
- **`src/tui/components/FocusableInput.tsx` (or the form's text-input wrapper)**: multi-char input path calling the shared paste sanitizer; export `sanitizePaste` from a shared module (`src/tui/utils/paste.ts`) instead of CommandInput so both consume it. <!-- keeps CommandInput's public surface unchanged -->
- **`src/i18n/en.json`**: select hint strings.
- **Coordination**: this change touches files the active gh-21 change also edits — schedule after gh-21 archives, or implement as its follow-up tasks.
- **IPC contract**: no change. **Persisted state**: no change (prefill prevents accidental change to `taskId`). **Cross-platform**: none beyond existing paste handling.
