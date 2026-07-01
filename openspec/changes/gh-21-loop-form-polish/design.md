## Context

The TUI (Ink 7 + React 19) has two loop form paths: WizardForm for create, PatchEditForm for edit. The WizardForm shows all fields in a two-column layout with basic required/empty validation. The PatchEditForm shows a read-only table with change commands, but field activation is broken (no command input wired in edit view). Validation is split: the CLI/board path uses `parseDuration()` and `buildLoopOptions()` from core, while the TUI uses a local `parseInterval()` regex and `parseArgs()` with weaker error handling. CWD does not pre-fill with `process.cwd()` on create. Edit navigation already goes directly to the edit form (no DetailView detour). No per-field validation errors are shown.

## Goals / Non-Goals

**Goals:**
- Unify TUI form validation to use core `parseDuration()`, `parseMaxRuns()`, `parseCommandLine()` instead of local regex/parseArgs
- Add per-field inline validation with visible error messages (on blur/submit)
- Pre-fill CWD with `process.cwd()` as editable default on create
- Make PatchEditForm field editing work from within the form (keyboard-driven, not relying on external command input)
- Pre-populate command field with merged command+args in edit mode (inline)
- Add copy-to-clipboard support for command and cwd fields in edit mode
- Add new i18n strings for validation errors and form labels
- Ensure WizardForm task mode toggle clears the irrelevant field when switching

**Non-Goals:**
- Board (src/board/) changes - excluded from compilation
- Changes to the IPC protocol or data model
- Task definition CRUD from the loop form
- Removing Inspector or DetailView

## Decisions

### D1: Validation via core modules, not local regex
**Choice**: Replace `parseInterval()` and `parseArgs()` in `CreateForm.tsx` with `parseDuration()`, `parseMaxRuns()`, and `parseCommandLine()` from `src/duration.ts` and `src/loop-config.ts`.
**Rationale**: These already handle edge cases (unbalanced quotes, negative durations, NaN maxRuns) and throw with i18n-localized error messages. Duplication causes drift and inconsistent UX.
**Alternative**: Keep local parsers and add error messages there - rejected because it duplicates validation logic.

### D2: Per-field validation with error record
**Choice**: Add a `validationErrors: Record<string, string>` state to both WizardForm and PatchEditForm. On blur (field navigation away) or Ctrl+S/submit, validate the field using core parsers. Display a red `<Text>` below the field with the error message. Clear error on successful re-validation.
**Rationale**: Immediate feedback without being noisy. Error messages are already i18n-localized in core modules.
**Alternative**: Validate only on submit - rejected as it doesn't meet the "real-time" AC.

### D3: PatchEditForm gets internal field activation
**Choice**: Add Up/Down arrow key handling to PatchEditForm to navigate between fields and Enter to activate the focused field for editing. When a field is active, it shows FocusableInput. Escape cancels edit. This replaces the broken "type 'change <field>'" approach.
**Rationale**: The current design requires the CommandInput which is hidden in form views. Keyboard-driven field navigation is natural for TUI.
**Alternative**: Wire command input into edit view - rejected as it would require significant App.tsx plumbing and breaks the established form view pattern.

### D4: CWD default via step defaultValue
**Choice**: Set the `defaultValue` of the cwd WizardStepConfig to `process.cwd()` when creating (not editing). The value shows as pre-filled text the user can edit.
**Rationale**: Simple, matches v1 behavior. The existing TextField already shows defaultValue as editable text.
**Alternative**: Use placeholder only - rejected per AC which says "pre-filled value, not just a placeholder".

### D5: Command merge for edit mode
**Choice**: In `createInitialValues()` (App.tsx), merge `command` + `commandArgs` into a single string with `commandLine()`. In PatchEditForm, the command field shows this merged string. On save, re-parse via `parseCommandLine()`.
**Rationale**: Matches the board CreateForm pattern and the CLI UX. Single string is easier to edit than separate command+args.

### D6: Copy support via Ctrl+Y shortcut
**Choice**: In PatchEditForm, when a field is focused (not being edited), Ctrl+Y copies the displayed value to clipboard via `copyToClipboard()`. A toast confirms the copy.
**Rationale**: Y for yank follows vim conventions common in TUI apps. Does not require a separate UI element.
**Alternative**: Add a copy button next to each field - rejected as it adds visual complexity in a text-only TUI.

## Risks / Trade-offs

- [PatchEditForm field navigation conflicts with existing useInput] → Only activate when `activeField === null`; while editing, arrow keys don't navigate
- [parseCommandLine throws on unbalanced quotes, blocking save] → Catch and display as validation error on the command field
- [Ctrl+Y may conflict with future shortcuts] → Low risk; no current Ctrl+Y binding exists
- [CWD pre-fill shows full path which may be long] → Acceptable; user can clear or edit
