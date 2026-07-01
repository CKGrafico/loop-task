## Why

The loop create/edit forms in both the board (src/board/) and TUI (src/tui/) lack polish and critical v1 behaviors: no inline command mode toggle, no smart CWD default, edit flows through a read-only detail view first, and validation feedback is inconsistent (board shows footer errors, TUI shows none). Users encounter confusion around missing defaults, silent validation failures, and a clunky edit navigation path.

## What Changes

- Add task mode toggle (inline command vs existing task) to both board and TUI forms
- Pre-fill CWD with `process.cwd()` as editable value on create (matching v1)
- Navigate directly to edit form on edit action (bypass DetailView/Inspector)
- Add per-field validation with inline error display (duration, command, description, cwd, maxRuns)
- Unify validation to use `parseDuration()`, `parseMaxRuns()`, `buildLoopOptions()` from core modules
- Add copy-to-clipboard support for command and cwd fields
- Merge commandArgs into single editable string, re-parse on save via `parseCommandLine()`
- Update i18n strings for new labels, placeholders, help text, and error messages

## Capabilities

### New Capabilities
- `task-mode-toggle`: Switch between inline command and existing task selection in create/edit forms
- `inline-validation`: Per-field real-time validation with inline error indicators across board and TUI
- `smart-cwd-default`: Pre-fill working directory with process.cwd() on create, show current on edit
- `clipboard-copy`: Copy command and cwd values to clipboard from edit form

### Modified Capabilities
- `loop-form-navigation`: Edit action navigates directly to edit form instead of read-only detail view

## Impact

- **src/tui/components/**: WizardForm, PatchEditForm, CreateForm - add task toggle, validation errors, CWD default, copy support
- **src/board/components/**: CreateForm, DetailView - add task toggle, validation errors, CWD default, edit-first navigation
- **src/loop-config.ts**: parseCommandLine already exists; ensure it merges commandArgs correctly
- **src/duration.ts**: parseDuration already used by board; TUI must switch from local regex
- **src/i18n/en.json**: New strings for toggle labels, validation errors, placeholders
- **src/types.ts**: No structural changes to LoopOptions/LoopMeta IPC contract
- **No IPC protocol changes**: buildLoopOptions() already validates on create/update
- **No persisted state shape changes**: Same LoopMeta fields, same JSON format

## Non-goals

- Redesigning the LoopOptions data model
- Changes to the daemon IPC protocol (createLoop/updateLoop)
- Removing DetailView or Inspector (they remain for read-only contexts)
- Task definition CRUD from the loop form (selecting existing tasks is in scope; creating new definitions is not)
- Board (src/board/) changes - board code is excluded from compilation and not actively used
