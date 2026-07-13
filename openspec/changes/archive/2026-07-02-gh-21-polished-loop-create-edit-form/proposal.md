## Why

The loop create/edit form across both board (React TUI) and TUI (Ink) lacks polish, no per-field validation feedback, no smart defaults, no clipboard copy, and edit mode routes through a read-only detail view first. Users need an efficient, professional form to configure and refine loops without confusion or data-entry errors.

## What Changes

1. **Professional form polish**: Two-column grid layout with consistent spacing, labels, and focus states; form title distinguishes create vs edit mode
2. **Task mode toggle**: Switch between "Inline command" and "Existing task" modes; switching clears the irrelevant field
3. **Inline command editing with copy**: Merge `command` + `commandArgs` into a single editable string; re-parse on save via `parseCommandLine()`; clipboard copy for command and cwd fields
4. **Smart CWD default**: Pre-fill `cwd` with `process.cwd()` on create; show stored value on edit; validate directory exists
5. **Direct edit navigation**: Edit action goes directly to edit form (skips DetailView/Inspector)
6. **Per-field inline validation**: Validate duration, command, description, cwd, maxRuns, errors appear on blur/submit with red inline text; both UIs use shared `parseDuration()`/`buildLoopOptions()` from core modules

## Capabilities

### New Capabilities
- (none, all capabilities already have specs from prior archived change)

### Modified Capabilities
- `loop-form-polish`: Update Purpose metadata; professional layout, form title mode distinction
- `task-mode-toggle`: Already spec'd for WizardForm and PatchEditForm; implementation needed
- `smart-cwd-default`: Already spec'd for create and edit; implementation needed
- `loop-form-navigation`: Already spec'd for direct edit navigation; implementation needed
- `inline-validation`: Already spec'd for per-field validation in both forms; replace duplicate local validators with core modules
- `clipboard-copy`: Already spec'd for command and cwd copy; implementation needed

## Impact

- Board: `src/board/components/CreateForm.tsx`, edit mode navigation, validation errors, copy support
- TUI: `src/tui/components/CreateForm.tsx`, `WizardForm.tsx`, `PatchEditForm.tsx`, validation errors, CWD default, task mode toggle, clipboard copy
- Core: `src/loop-config.ts` (`parseCommandLine`, `parseMaxRuns`, `buildLoopOptions`) and `src/duration.ts` (`parseDuration`), unified validation path
- Navigation: Board action handlers and TUI command dispatch, edit bypasses DetailView/Inspector
