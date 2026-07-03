## Why

The loop create/edit form lacks polish — missing inline command editing, smart directory defaults, direct edit navigation, per-field validation errors, and clipboard copy support. These gaps cause confusion and silent data-entry errors.

## What Changes

- **Professional form layout & polish** — clean two-column grid, clear create vs edit title, focused field visual distinction
- **Task mode toggle** — switch between "Inline command" and "Existing task" selection; switching clears the irrelevant field
- **Inline command editing** — pre-populate command with args in edit mode; merge/re-parse on save; clipboard copy for command and cwd
- **Smart CWD default** — pre-fill `process.cwd()` on create; show as editable value; validate directory exists on submit
- **Direct edit navigation** — bypass DetailView/Inspector when user selects Edit; go straight to populated edit form
- **Per-field real-time validation** — duration (delegate to `parseDuration`), command non-empty, description non-empty, cwd exists, maxRuns positive integer; errors on blur+submit; shared validation path via `buildLoopOptions`/`parseDuration`
- **TUI error display** — wire validation errors into TUI WizardForm and PatchEditForm (currently only board shows errors)

### Non-goals

- Redesigning the LoopOptions data model
- Changes to the daemon IPC protocol
- Inspector or DetailView removal
- Task definition CRUD

## Capabilities

### New Capabilities
- `loop-form-polish`: Professional two-column form layout with focused state, mode distinction, and consistent spacing
- `task-mode-toggle`: Inline command / existing task selection toggle with field reset
- `copy-command`: Clipboard copy for command and working directory values
- `smart-cwd-default`: Default cwd to `process.cwd()` with editable value and validation
- `loop-form-navigation`: Direct edit navigation bypassing detail view
- `inline-validation`: Per-field real-time validation on blur+submit

### Modified Capabilities
- `chain-context`: Duration validation now uses unified `parseDuration()` rather than local regex
- `clipboard-copy`: Copy-to-clipboard available from board edit form (extends existing TUI-only clipboard)

## Impact

- `src/board/components/CreateForm.tsx` — per-field validation, edit-first navigation, mode toggle, copy buttons
- `src/tui/components/WizardForm.tsx` — error display, unified validation
- `src/tui/components/CreateForm.tsx` — mode toggle, smart cwd default
- `src/tui/components/PatchEditForm.tsx` — error display, unified validation (if exists)
- `src/duration.ts` — ensure `parseDuration` covers all formats used by both UIs
- New `src/hooks/useLoopFormValidation.ts` — shared validation composable
