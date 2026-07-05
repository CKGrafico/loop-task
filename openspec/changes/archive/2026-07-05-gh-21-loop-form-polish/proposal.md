## Why

The loop create/edit form across both board (`src/board/`) and TUI (`src/tui/`) lacks polish compared to v1. Key gaps: no smart CWD defaults, no inline command editing support, edit mode routes through a read-only detail view instead of directly to the form, per-field validation is inconsistent or missing in TUI, and there's no clipboard copy for command/cwd fields. This hurts UX for daily loop configuration.

## What Changes

- Professional two-column form layout with clear create/edit mode distinction
- Task mode toggle (inline command vs existing task) with field reset on switch
- Inline command editing: merge command+args into a single string, pre-populate on edit, re-parse via `parseCommandLine()` on save
- Clipboard copy buttons for command and cwd fields (board: click; TUI: yank shortcut)
- Smart CWD default: pre-fill `process.cwd()` as editable value on create; show current value on edit
- Direct edit navigation: skip DetailView/Inspector read-only step, go straight to edit form
- Per-field real-time validation: duration (via `parseDuration()`), command non-empty, description non-empty, cwd exists, maxRuns positive integer — errors on blur/submit, inline red display
- Unify validation: both board and TUI delegate to `buildLoopOptions()` / `parseDuration()` / `parseMaxRuns()` from shared modules

## Capabilities

### New Capabilities
- `task-mode-toggle`: Switch between inline command and existing task selection modes
- `inline-validation`: Real-time per-field validation with inline error display
- `smart-cwd-default`: Pre-fill `process.cwd()` as editable value on create

### Modified Capabilities
- `loop-form-polish`: Visual polish — two-column grid, consistent labels/placeholders, focus states, create vs edit title
- `clipboard-copy`: Add command and cwd copy buttons to loop edit form
- `loop-form-navigation`: Direct edit navigation — skip DetailView read-only step

## Impact

- Board `CreateForm.tsx` — enhanced with per-field validation errors, copy buttons, cwd default, edit-first navigation
- TUI `CreateForm.tsx` / `WizardForm.tsx` / `PatchEditForm.tsx` — add validation error display, copy support, cwd default
- TUI `PatchEditForm.tsx` — inline command string merge/split via `parseCommandLine()`
- Board `DetailView.tsx` — no longer the edit entry point (remains read-only reference)
- `src/loop-config.ts` — `parseCommandLine()` used for inline command parsing
- `src/duration.ts` — `parseDuration()` used by both UIs
- IPC contract and persisted state shape unchanged (out of scope)

## Non-goals

- Redesigning the `LoopOptions` data model
- Changes to daemon IPC protocol (`createLoop`/`updateLoop`)
- Inspector or DetailView removal (remain for read-only contexts)
- Task definition CRUD
