## Context

The board and TUI each have their own loop form implementations. `CreateForm.tsx` (board) handles both create/edit but routes edit through `DetailView` first. TUI has `WizardForm.tsx` for create and `PatchEditForm.tsx` for edit. Both need per-field validation, smart defaults, clipboard copy, and professional layout.

## Goals / Non-Goals

**Goals:**
- Unified validation logic using `parseDuration()` / `parseMaxRuns()` / `parseCommandLine()` in both UIs
- Direct-to-edit navigation (skip DetailView/Inspector)
- Smart CWD default (`process.cwd()` as editable value)
- Clipboard copy for command and cwd fields
- Task mode toggle (inline command vs existing task)
- Per-field inline validation errors on blur and submit
- Professional two-column grid with mode-specific titles

**Non-Goals:**
- Data model changes to `LoopOptions`
- Daemon IPC protocol changes
- Removing DetailView or Inspector (remain read-only)
- Task definition CRUD

## Decisions

- **Validation unification**: Both UIs delegate to `parseDuration()` (`src/duration.ts`) and `parseMaxRuns()`/`parseCommandLine()` (`src/loop-config.ts`). No local regex validators.
- **Edit navigation**: Board action key routes directly to `CreateForm` in edit mode. TUI `edit` command routes directly to `PatchEditForm`.
- **Inline command string**: `commandArgs` merged into a single string for editing; re-parsed via `parseCommandLine()` on save.
- **CWD default**: `process.cwd()` pre-filled as editable value via `createInitialValues()`. Edit mode shows stored value.
- **Clipboard**: Board uses `navigator.clipboard.writeText()` with hover/click button. TUI uses environment clipboard access with Ctrl+Y shortcut.
- **Error display**: Per-field error state in a `Record<FieldKey, string>` map, rendered as red text below/beside each field.

## Risks / Trade-offs

- **Inline command string**: Merging args into a single string may lose shell tokenization subtleties. Mitigation: `parseCommandLine()` handles quoting and escaping consistent with CLI behavior.
- **TUI clipboard**: Terminal clipboard access is platform-dependent. Fallback: display the text and inform the user to copy manually.
- **Direct edit navigation**: Changes existing UX flow — users accustomed to DetailView first may need adjustment. Non-goal preserved: DetailView remains for read-only browsing.
