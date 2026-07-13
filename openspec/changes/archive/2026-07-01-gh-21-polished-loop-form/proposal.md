## Why

The loop create/edit forms in both the board and TUI lack polish, missing validation feedback, no inline command editing, no smart defaults, and an unnecessary detail-page detour when editing. These gaps cause confusion, lost time, and data-entry errors when configuring loops.

## What Changes

- Add real-time per-field validation (duration, command, description, cwd, maxRuns) using existing `parseDuration()` / `buildLoopOptions()` parsers
- Add task mode toggle (inline command vs existing task) with field reset on switch
- Merge `commandArgs` into a single editable string; re-parse on save via `parseCommandLine()`
- Pre-fill `cwd` with `process.cwd()` on create; show as editable value
- Navigate directly to edit form from list (skip `DetailView` / read-only flow)
- Add clipboard copy for command and cwd fields
- Unify validation path: both UIs delegate to shared parsers in `src/loop-config.ts` and `src/duration.ts`
- Show per-field inline error indicators in both board and TUI forms

## Capabilities

### New Capabilities
- `loop-form-polish`: Professional form layout, direct edit navigation, smart defaults, copy support, and per-field validation for board and TUI loop forms.

### Modified Capabilities
- *(none, no existing spec requires behavioral changes)*

## Impact

- **Board**: `src/board/components/CreateForm.tsx`, edit navigation, per-field validation, copy buttons
- **TUI**: `src/tui/components/CreateForm.tsx`, `WizardForm.tsx`, `PatchEditForm.tsx`, per-field error display, validation unification
- **Validation**: Both UIs use shared `parseDuration()` (`src/duration.ts`) and `buildLoopOptions()` (`src/loop-config.ts`), no redundant regex validators
- **Non-goals**: Redesigning `LoopOptions` data model, changing IPC protocol, removing Inspector/DetailView, task definition CRUD
