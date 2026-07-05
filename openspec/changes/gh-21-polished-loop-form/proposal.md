## Why

The loop create/edit form lacks polish — missing smart defaults, per-field validation feedback, direct edit navigation, copy support, and a task mode toggle. Users hit silent validation failures and unnecessary navigation steps when configuring loops.

## What Changes

- Task mode toggle (inline command vs existing task) with mode switching that clears the irrelevant field
- Inline command editing with merged `commandArgs` into a single editable string, re-parsed via `parseCommandLine()`
- Smart CWD default: `process.cwd()` pre-filled on create, loop's stored value on edit
- Clipboard copy for command and cwd fields (board: hover/click copy button; TUI: yank shortcut)
- Direct edit navigation: skip read-only DetailView/Inspector, go straight to edit form
- Per-field validation using shared `parseDuration()`, `parseMaxRuns()`, `parseCommandLine()` — errors appear inline on blur and on submit
- Form title distinguishes "New Loop" vs "Edit Loop"

## Capabilities

### New Capabilities
- `loop-form-polish`: Professional form layout, task mode toggle, inline command with merged args, smart CWD, clipboard copy, per-field validation, form title mode distinction
- `task-mode-toggle`: WizardForm task mode step and PatchEditForm command/taskId field display
- `inline-validation`: Per-field validation errors in WizardForm and PatchEditForm using shared core modules
- `smart-cwd-default`: CWD defaults to `process.cwd()` on create, loop's stored value on edit, with existence validation
- `loop-form-navigation`: Direct edit-to-form navigation, PatchEditForm keyboard navigation, save/cancel flow
- `copy-command`: Clipboard copy for command and cwd values with feedback

### Modified Capabilities
- *None* — all capabilities listed are new or being implemented from archived specs

## Impact

- `src/board/components/CreateForm.tsx` — add validation errors per-field, edit-first navigation, copy buttons, form title
- `src/tui/components/WizardForm.tsx` — add task mode toggle, per-field validation, smart CWD default
- `src/tui/components/PatchEditForm.tsx` — add inline validation, keyboard save/cancel
- `src/board/components/DetailView.tsx` — edit action bypasses this view (remains for read-only)
- `src/loop-config.ts` / `src/duration.ts` — validation shared from core modules, remove local regex validators
- IPC contract (`src/types.ts`) — no changes expected
- i18n (`src/i18n/en.json`) — new validation error strings
