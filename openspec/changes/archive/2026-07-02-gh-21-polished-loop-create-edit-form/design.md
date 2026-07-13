## Context

The loop create/edit experience is split between the board (React 19 / OpenTUI) and TUI (Ink 7) surfaces. Both have a working two-column form layout but lack inline validation feedback, smart defaults, clipboard copy, and direct edit navigation. The board uses `CreateForm.tsx` for both create and edit; TUI uses `WizardForm.tsx` for create and `PatchEditForm.tsx` for edit. Validation logic is duplicated (board delegates to core `parseDuration()`; TUI has a local regex). Edit mode on the board routes through `DetailView` first.

## Goals / Non-Goals

**Goals:**
- Unified validation path: both UIs use `parseDuration()` from `src/duration.ts`, `parseMaxRuns()`/`parseCommandLine()` from `src/loop-config.ts`
- Per-field inline validation errors on blur and submit
- Smart CWD default: `process.cwd()` pre-filled on create, stored value on edit
- Task mode toggle (inline command vs existing task) with mutual exclusion
- Clipboard copy for command and cwd fields (board hover/click; TUI Ctrl+Y)
- Direct edit navigation: board edit action skips DetailView; TUI edit command opens PatchEditForm
- Form title distinguishes "New Loop" vs "Edit Loop"
- Merged command+args display in edit mode with `parseCommandLine()` re-parse on save

**Non-Goals:**
- Redesign of the underlying `LoopOptions` data model
- Changes to daemon IPC protocol
- Inspector or DetailView removal (remain for read-only contexts)
- Task definition CRUD from the loop form

## Decisions

1. **Shared validation via core modules**: Remove local validators and route all validation through `parseDuration()`, `parseCommandLine()`, `parseMaxRuns()`, and `buildLoopOptions()`. This ensures CLI and form validation stay in sync.
2. **Inline errors via state keyed by field name**: Both forms maintain a `validationErrors` record (or equivalent state map). Blur handlers validate the field and set/clear errors; submit validates all fields before proceeding.
3. **Edit navigation bypasses DetailView**: Board edit action directly renders `CreateForm` in edit mode with `createInitialValues(loop)`. TUI `edit` command directly opens `PatchEditForm`.
4. **Task mode as a toggle state**: Store `taskMode: 'inline' | 'task'` in form state. Switching clears the opposite field. PatchEditForm displays only the relevant field based on whether the loop has a command or taskId.
5. **Clipboard via `navigator.clipboard.writeText()`**: Board uses a hover/click copy button; TUI uses Ctrl+Y keyboard shortcut on focused field rows, with toast confirmation.
6. **CWD default as pre-filled editable value**: Pre-fill input with `process.cwd()` on create, stored value on edit. Not a placeholder, user sees and can edit it.

## Risks / Trade-offs

- [Risk] `navigator.clipboard` requires secure context (HTTPS or localhost). The TUI runs in a terminal context via Ink on Node, so `clipboardy` or `npx clipboard-cli` may be a safer cross-platform fallback. → Verify clipboard support in Ink/OpenTUI environment; fall back to `npx clipboard-cli` via `execa` if needed.
- [Risk] Merging command+args and re-parsing could introduce edge cases with quoted strings. → Unit test `parseCommandLine()` round-trip with various quoting patterns.
- [Risk] Direct edit navigation bypassing DetailView removes a discovery surface. → Keep DetailView accessible via a separate "view" action or info panel.
