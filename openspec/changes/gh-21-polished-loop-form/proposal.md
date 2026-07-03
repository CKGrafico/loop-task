## Why

The loop create/edit form across board and TUI lacks polish, missing key behaviors from v1 — no smart directory defaults, no clipboard copy, no per-field validation errors, and edit mode goes through a read-only detail view first. This makes loop configuration slower and more error-prone than it should be.

## What Changes

- Professional form layout with consistent spacing, labels, and focus indicators (board + TUI)
- Task mode toggle (inline command vs existing task selection) with field reset on switch
- Inline command editing with copy-to-clipboard for command and cwd fields; `commandArgs` merged into single editable string, re-parsed via `parseCommandLine()` on save
- Smart CWD default: pre-fills `process.cwd()` on create, shows current value on edit
- Direct edit navigation: edit action goes straight to the edit form, bypassing read-only DetailView/Inspector
- Real-time per-field validation: duration via `parseDuration()`, command non-empty, description non-empty, cwd exists, maxRuns positive integer — errors on blur or submit, inline next to field
- Unified validation path: both UIs delegate to `buildLoopOptions()` / `parseDuration()` from `src/loop-config.ts` and `src/duration.ts`

## Capabilities

### New Capabilities
- `polished-form-layout`: Consistent two-column grid layout with clear labels, placeholders, help text, and focus states across board and TUI
- `task-mode-toggle`: Switch between inline command and existing task selection; clears irrelevant field on switch
- `inline-command-copy`: Merge commandArgs into a single editable string with copy-to-clipboard for command and cwd
- `smart-cwd-default`: Pre-fill cwd with `process.cwd()` on create, current value on edit
- `direct-edit-navigation`: Edit action navigates directly to edit form, bypassing read-only views
- `per-field-validation`: Real-time validation on blur/submit for all fields, inline error display, unified validation via shared utility functions

### Modified Capabilities
- (none — no existing specs to modify)

## Impact

- `src/board/components/CreateForm.tsx` — enhance layout, add per-field errors, edit-first navigation
- `src/tui/components/CreateForm.tsx` + `WizardForm.tsx` — add per-field validation and error display
- `src/tui/components/PatchEditForm.tsx` — enhance with validation
- `src/board/components/DetailView.tsx` — edit flow bypasses this view
- `src/loop-config.ts` / `src/duration.ts` — shared validation entry points (already exist)
- No changes to IPC contract (`src/types.ts`), daemon layer, or persistence schema
