## Context

The loop create/edit form has separate implementations for board (`src/board/components/CreateForm.tsx`) and TUI (`src/tui/components/CreateForm.tsx` + `WizardForm.tsx` / `PatchEditForm.tsx`). Both lack per-field validation errors, clipboard copy, smart CWD defaults, and direct edit navigation. The board form handles both create and edit but routes through a read-only `DetailView` first. The TUI has two separate components with no shared validation display logic.

## Goals / Non-Goals

**Goals:**
- Unified validation path: both UIs delegate to `parseDuration()`, `buildLoopOptions()`, `parseCommandLine()` from shared utilities
- Per-field inline error display on blur and on submit
- Direct edit navigation: edit action goes straight to `CreateForm` (board) or edit mode (TUI), bypassing read-only views
- Smart CWD default: `process.cwd()` pre-filled on create, current value on edit
- Clipboard copy for command and cwd fields
- Task mode toggle (inline command vs existing task) with field reset on switch
- Consistent two-column layout with clear labels, focus states, and form title distinguishing create vs edit

**Non-Goals:**
- Redesigning the `LoopOptions` data model or IPC contract
- Changes to daemon layer or persistence schema
- Removing `DetailView` or `Inspector` (remain for read-only contexts)
- Task definition CRUD

## Decisions

1. **Shared validation via existing utilities**: Rather than creating a new validation layer, extend `buildLoopOptions()` (which already validates on save) to support a `partial` mode that returns per-field errors without throwing. This avoids duplicating validation logic. Board already delegates to `parseDuration()`, TUI's local regex will be replaced by the same utility.

2. **Per-field error state in form components**: Both board and TUI forms will maintain a `fieldErrors` record (keyed by field name) in local state. Errors are set on blur (via field-level `onBlur` handlers) and cleared on change. On submit, all fields are validated and errors are shown.

3. **Direct edit via callback/state**: The board's action handler will pass `editingLoopId` directly to `CreateForm` mode instead of routing through `DetailView`. TUI's `PatchEditForm` will be merged into a unified edit flow, the TUI create form will support an edit mode flag.

4. **Copy-to-clipboard via `navigator.clipboard.writeText`** (board, runs in browser/Bun) and **`child_process.exec('clip')`** (TUI, Windows) or a cross-platform clipboard utility. The TUI side will use a simple `yank`-style binding.

5. **Pre-filled CWD**: On mount, both forms call `process.cwd()` for the default; edit mode reads the loop's `cwd` from existing state. The value is shown in the input (not placeholder) so users can edit it.

6. **Task mode toggle as radio/segmented control**: A simple two-option toggle with `onChange` handler that clears the non-selected field's value.

## Risks / Trade-offs

- Risk: TUI clipboard support varies by platform (Windows `clip`, macOS `pbcopy`, Linux `xclip`/`wl-copy`) → Mitigation: use a cross-platform approach with `node:child_process` spawn or a small helper that detects the platform and runs the appropriate command; fall back to no-op with user feedback if unavailable.
- Risk: Muting `commandArgs` into a single string and re-parsing could break for commands with complex quoting → Mitigation: `parseCommandLine()` already exists in `src/loop-config.ts` and handles quoting; test with edge cases (spaces, quotes, variables).
- Risk: Adding per-field validation to TUI forms increases complexity in `WizardForm.tsx` which is already fairly involved → Mitigation: keep validation logic in a shared hook or utility, not inline in the wizard step components.
- Trade-off: Not using a form library (React Hook Form, Formik) to keep dependencies minimal; validation state is managed manually in component state.
