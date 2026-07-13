## Context

The board (`src/board/`) and TUI (`src/tui/`) each have their own loop form. Both share the same `LoopOptions` data model but diverge in component structure and validation logic. The board uses a single `CreateForm.tsx` for create+edit; the TUI uses `WizardForm.tsx` (create) and a patch-table style edit. Currently the board has a `DetailView` intermediary before edit mode, and the TUI has no visible validation errors.

## Goals / Non-Goals

**Goals:**
- Unify validation path: both UIs delegate to `buildLoopOptions()` / `parseDuration()` / `parseMaxRuns()` from `src/loop-config.ts` and `src/duration.ts`
- Board: edit action navigates directly to `CreateForm` (pre-populated), bypassing `DetailView`
- Board: per-field validation errors displayed inline (blur + submit)
- Board: task mode toggle (inline command vs existing task) with field reset
- Board: clipboard copy for command and cwd values
- TUI: validation errors displayed in wizard edit mode
- TUI: smart cwd default (`process.cwd()`)
- Both: create shows "New Loop", edit shows "Edit Loop"
- Both: cwd pre-filled as editable value (not placeholder)

**Non-Goals:**
- Removing DetailView or Inspector (remain for read-only browsing)
- Task definition CRUD flow
- IPC protocol changes

## Decisions

1. **Validation hook (`useLoopFormValidation`)**, shared `src/hooks/` composable that wraps `buildLoopOptions()` with per-field error extraction. Board and TUI both use it, eliminating duplicate regex validators. Duration validation delegates to `parseDuration()` from `src/duration.ts`.

2. **Edit navigation**, Board list action dispatches `onEdit(loop)` which sets `editingLoop` state in the parent; `CreateForm` checks this prop and renders in edit mode with pre-populated `createInitialValues(loop)`. No `DetailView` route in the edit flow.

3. **Task mode toggle**, Board `CreateForm` gets a local `mode` state (`'inline' | 'task'`). Switching clears the other field. The same pattern applies to TUI `WizardForm`.

4. **Clipboard copy**, Board uses the existing `copyToClipboard()` from `src/shared/clipboard.ts`. Both surfaces display brief "Copied!" feedback via toast.

5. **Error display pattern**, Board: each field renders an error text below the input on blur or when `touched && errors[name]`. TUI WizardForm: each step's fields show errors inline in the form body. Both use the same error map shape `Record<string, string>`.

## Risks / Trade-offs

- **TUI clipboard integration**, Ink terminal apps have limited clipboard support; fall back to existing `copyToClipboard()` utility which handles platform differences via `clip`/`pbcopy`/`xclip`.
- **parseDuration coverage**, The TUI's local regex may accept formats `parseDuration()` rejects. Mitigation: audit `parseDuration()` and extend if needed; test edge cases.
- **Blur vs live validation**, Blur-only validation avoids jarring UX of live validation as user types.
