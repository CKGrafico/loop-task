## Why

The command field in loop/task forms is "horrible" on two fronts. In the Ink (`src/tui/`) layer, `InlineCommandEditor` jams a multiline editor directly into a wizard step — max 8 visible lines, hidden shortcuts (only Ctrl+Y for copy), no visible buttons, eats vertical space and disrupts field navigation. In the OpenTUI board (`src/board/`) layer, the command field is a single-line `<input>` — impossible to write or read multiline commands at all. Both layers lack a good UX for authoring the single most important field in a loop or task.

We need a unified `CodeEditor` component: a compact **preview field** (1-2 lines) that lives in the form, which on Enter opens a **full-screen modal code editor** with visible Copy/Paste/Clear buttons, syntax highlighting, line numbers, cursor, and undo/redo. The modal is the single place where command text is authored; the form just shows a preview and stores the value. Multiline is stored as-is in `commandRaw`; execution uses a backslash-continuation join that respects quoted newlines.

## What Changes

- New `CodeEditor` modal component (Ink 7 variant in `src/tui/components/CodeEditorModal.tsx`, OpenTUI variant in `src/board/components/CodeEditorModal.tsx`) with:
  - Full-screen overlay matching existing `SelectModal` / `LogModal` patterns
  - Multiline text editing with line numbers, visible cursor, vertical scroll
  - **Visible action buttons**: Copy, Paste, Clear (not just hidden shortcuts)
  - **Syntax highlighting**: colorize command tokens — flags (`--foo`), quoted strings, operators — using a lightweight tokenizer (no external dep)
  - **Undo/redo**: history stack with Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y as redo fallback on Windows)
  - **Live preview footer**: shows the joined single-line result as the user types
  - Footer hint line with active shortcuts
- New `CodeEditorPreview` field component (both layers) replacing `InlineCommandEditor` in forms:
  - Compact bordered field showing first 1-2 lines of the command
  - Hint text "press enter to open editor"
  - Bound by `renderCustom` in WizardForm (tui) and as a custom row in board forms
- Replace `InlineCommandEditor` usage in `src/tui/components/CreateForm.tsx` and `src/tui/components/TaskForm.tsx` with `CodeEditorPreview` + `CodeEditorModal`
- Replace the single-line `<input>` command field in `src/board/components/CreateForm.tsx` and `src/board/components/TaskForm.tsx` with `CodeEditorPreview` + `CodeEditorModal`
- New `joinCommandLines()` utility in `src/loop-config.ts` implementing backslash-continuation join:
  - Lines ending with `\` join to the next line with no space (backslash consumed)
  - Lines not ending with `\` join with a single space
  - Empty lines are dropped
  - Newlines inside quoted strings are preserved as literal newlines (the shell tokenizer in `parseCommandLine` already handles this)
  - **BREAKING**: changes the join semantics from naive `trim().filter(Boolean).join(" ")` to backslash-aware — existing loops/tasks with `commandRaw` containing naive newlines inside quotes will now preserve those newlines at execution time. Migration: none needed for well-formed commands; misformatted ones were already broken.
- New i18n keys in `src/i18n/en.json` for: modal title, button labels, hint lines, preview placeholder
- New constants in `src/config/constants.ts` for: max visible lines in preview, modal dimensions, undo history limit
- Delete `src/tui/components/InlineCommandEditor.tsx` (superseded by `CodeEditorModal` + `CodeEditorPreview`)

## Capabilities

### New Capabilities
- `code-editor`: A modal-based multiline code editor for the command field in loop and task forms, with a compact preview field, visible action buttons (copy/paste/clear), syntax highlighting, line numbers, cursor, undo/redo, and a live single-line preview footer. Covers both the Ink 7 and OpenTUI board variants.

### Modified Capabilities
- `copy-command`: The copy action moves from a hidden Ctrl+Y shortcut inside an inline editor to a visible button in the CodeEditor modal. The capability's requirement to "copy the full command to clipboard" stays, but the trigger surface changes.

## Non-goals

- No change to the IPC contract (`src/types.ts` shapes) — `commandRaw` already exists as a field on `LoopOptions` and `TaskDefinition`, so multiline storage is already supported at the protocol level.
- No change to persisted state shape (`LoopMeta.commandRaw` already exists; existing loops are forward-compatible).
- No change to `parseCommandLine()` tokenization — that already handles quoted strings and escaped quotes correctly. Only the line-joining step changes.
- No external syntax-highlighting library (e.g. Shiki, Prism) — a lightweight inline tokenizer keeps the bundle small and avoids new deps.
- No multi-cursor or find/replace — those are out of scope for v1 of the editor.
- No change to the daemon, spawner, or execution layer — they already consume `command` + `commandArgs` and don't care how `commandRaw` was authored.

## Impact

- **Affected code**:
  - `src/tui/components/InlineCommandEditor.tsx` — deleted
  - `src/tui/components/CreateForm.tsx`, `src/tui/components/TaskForm.tsx` — replace inline editor with preview + modal
  - `src/board/components/CreateForm.tsx`, `src/board/components/TaskForm.tsx` — replace `<input>` with preview + modal
  - `src/loop-config.ts` — new `joinCommandLines()` function, used by both form layers
  - `src/i18n/en.json` — new keys under `codeEditor.*` namespace
  - `src/config/constants.ts` — new editor constants
  - `src/tui/components/WizardForm.tsx` — minor: `renderCustom` already supports the preview pattern (no change needed, but verify Enter doesn't conflict with field advance)
- **No IPC contract changes** — `commandRaw` field already exists on `LoopOptions`, `TaskDefinition`, and `LoopMeta`
- **No persisted state migration** — existing loops store `commandRaw` (or omit it); new join logic only affects newly-authored commands
- **Dependencies**: no new npm dependencies
- **Cross-platform**: undo/redo uses Ctrl+Z / Ctrl+Shift+Z universally; Ctrl+Y as redo fallback on Windows where Ctrl+Shift may not register in some terminals. No Windows named pipe or platform-specific behavior changes.
- **Test coverage**: both CodeEditor variants need tests (Vitest); `joinCommandLines()` needs unit tests for backslash continuation, quoted newlines, and edge cases
