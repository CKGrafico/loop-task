## Context

The loop-cli TUI has two parallel UI layers:

1. **Ink 7 layer** (`src/tui/`), older, wizard-based forms using `WizardForm` + `renderCustom` slots. The command field uses `InlineCommandEditor`, a multiline text editor embedded directly in the wizard step. It supports line numbers, cursor navigation, bracketed paste, and a hidden Ctrl+Y copy shortcut. Max 8 visible lines. No buttons, no undo, no paste button.

2. **OpenTUI board layer** (`src/board/`), newer, form-based using native `<input>` elements with mouse support. The command field is a single-line `<input>` with a small copy button. Cannot author multiline commands at all.

Both layers store the raw multiline text in `commandRaw` (already a field on `LoopOptions`, `TaskDefinition`, and `LoopMeta`). At submission, both convert multiline to single-line via a naive `trim().filter(Boolean).join(" ")` and then call `parseCommandLine()` to split into `command` + `commandArgs`.

**Existing modal patterns:**
- `SelectModal` (Ink), full-screen overlay, bordered box, search input, list, footer hint
- `TaskPickerModal` (Ink), similar overlay pattern
- `LogModal` (OpenTUI), `position: absolute`, full width/height, `zIndex: 100`, scrollable content

**Existing clipboard utility:** `src/shared/clipboard.ts` provides `copyToClipboard(text)`.

**Existing paste utility:** `src/tui/utils/paste.ts` provides `sanitizePaste(input)` for handling bracketed paste sequences.

## Goals / Non-Goals

**Goals:**
- Replace the inline command editor with a modal-based `CodeEditor` that provides a superior authoring experience across both UI layers
- Compact preview field in forms that shows the command without consuming vertical space
- Visible action buttons (Copy, Paste, Clear) so shortcuts aren't hidden
- Syntax highlighting for command tokens (flags, quotes, operators) with no external dependencies
- Undo/redo history stack
- Live preview of the single-line joined result so users see what will execute
- Backslash-continuation line joining that respects quoted newlines
- Consistent behavior between Ink and OpenTUI variants, same features, platform-appropriate rendering

**Non-Goals:**
- Multi-cursor editing
- Find/replace
- External syntax highlighting libraries (Shiki, Prism, etc.)
- Changing the IPC contract or persisted state shape
- Changing `parseCommandLine()` tokenization logic
- Full shell emulation or validation of command correctness

## Decisions

### Decision 1: Two variant components, shared logic

**Choice:** Create `CodeEditorModal` in both `src/tui/components/` (Ink 7) and `src/board/components/` (OpenTUI), plus `CodeEditorPreview` in each. Share the non-UI logic (`joinCommandLines`, syntax tokenizer, undo/redo hook) across both layers.

**Why:** The two UI layers use different rendering primitives (Ink `<Box>`/`<Text>`/`useInput` vs OpenTUI `<box>`/`<text>`/`useKeyboard`). A single component can't serve both. But the editing logic, line joining, tokenization, undo stack, is pure TypeScript with no rendering dependency.

**Alternatives considered:**
- *Single shared component with abstraction layer*, would require a new rendering abstraction, adding complexity for no reuse benefit. The two layers differ in event handling (`useInput` vs `useKeyboard`), focus management, and mouse support.
- *Only fix one layer*, rejected per user direction (both layers should get the modal).

### Decision 2: Backslash-continuation line joining

**Choice:** New `joinCommandLines(text: string): string` function in `src/loop-config.ts`:

```
Lines ending with `\`  →  backslash removed, joins to next line with no space
Lines not ending with `\`  →  joins to next line with single space
Empty lines  →  dropped entirely
Newlines inside quoted strings  →  preserved as literal \n (parseCommandLine handles them)
```

**Why:** The current naive join (`trim().filter(Boolean).join(" ")`) silently breaks commands that have intentional line breaks inside quoted strings. Backslash continuation is the standard shell convention (`\` at EOL = line continuation), so it's familiar to the target audience (developers writing shell commands). It's predictable, explicit, and doesn't require a full shell parser.

**Example:**
```
Input (commandRaw):
  opencode run \
    "search missing translations" \
    --model "opencode/big-pickle"

Output (joined):
  opencode run "search missing translations" --model "opencode/big-pickle"
```

**Alternatives considered:**
- *Naive join (current)*, breaks quoted-string newlines. Rejected.
- *Shell-parse aware (full tokenizer)*, most correct, but `parseCommandLine` already handles quoted strings once joined. Adding a multiline-aware tokenizer doubles the complexity. The backslash convention is simpler and sufficient.

### Decision 3: Lightweight inline syntax tokenizer (no external dep)

**Choice:** Implement a small tokenizer function `tokenizeCommand(line: string): Token[]` that splits a single line into tokens and classifies them: `flag` (`--foo`, `-f`), `string` (quoted), `operator` (`|`, `&&`, `||`, `;`, `>`), `word` (default). Each token type maps to a theme color. Applied per-line during render.

**Why:** Adding a syntax highlighting library (Shiki, Prism, highlight.js) would significantly increase bundle size for a feature that only needs to colorize ~5 token types. The tokenizer is ~50 lines of code.

**Alternatives considered:**
- *No syntax highlighting*, makes the editor less readable for long commands. User explicitly requested it.
- *External library*, bundle bloat, overkill for this scope.

### Decision 4: Undo/redo via history hook

**Choice:** A custom `useUndoRedo` hook (in `src/tui/hooks/` for Ink, `src/board/hooks/` for OpenTUI, or a shared `src/shared/` location) managing a history stack of string snapshots:

- Every meaningful change (typing, paste, clear, backspace) pushes a snapshot
- Ctrl+Z pops back; Ctrl+Shift+Z (or Ctrl+Y on Windows) pops forward
- History capped at a configurable limit (e.g., 50 entries) in `src/config/constants.ts`
- The hook returns `{ value, setValue, undo, redo, canUndo, canRedo }`

**Why:** Undo/redo is essential for a code editor. A history-stack approach is simple, framework-agnostic, and works with both Ink and OpenTUI. It avoids the complexity of operational transforms or CRDTs for a single-document editor.

**Alternatives considered:**
- *No undo/redo*, poor UX for an editor. User explicitly requested it.
- *Library (e.g., use-undo)*, adds a dependency for trivially implementable logic.

### Decision 5: Preview field as a read-only display

**Choice:** `CodeEditorPreview` is a non-interactive display field (no text editing). It shows the first 1-2 lines of `commandRaw` with a hint "press enter to open editor". In the wizard, `onActivate` opens the modal. In the board form, clicking or pressing Enter opens the modal.

**Why:** This matches the established `SelectValueField` pattern used for other modal-driven fields (task picker, select modal). It's consistent, compact, and leaves the actual editing to the modal where the user has space and tools.

**Alternatives considered:**
- *Preview with inline single-line editing*, reintroduces the complexity of inline editing and the wizard advance key conflict.

### Decision 6: Live preview footer in modal

**Choice:** The modal's footer shows the joined single-line result (truncated to fit width) with a label like "Will execute: ...". Updates as the user types.

**Why:** The user's core concern is "be sure it will work correctly in one line but stored in multiple." The live preview footer directly addresses this, users see exactly what will execute before they save.

## Risks / Trade-offs

- **[Risk: Enter key conflict in wizard]** → In `WizardForm`, Enter on a `renderCustom` field with `onActivate` opens the modal. Without `onActivate`, the `renderCustom` component owns Enter. The preview field uses `onActivate` to open the modal, so Enter is unambiguous. Tab still advances fields. Documented in `WizardForm.tsx:206-216`.

- **[Risk: Backslash continuation BREAKING existing commands]** → Existing loops/tasks with `commandRaw` containing newlines inside quoted strings (without backslashes) will now join with spaces, same as before. The only behavioral change: if a line ended with `\` previously (rare), it was treated as a literal character; now it's a continuation. Mitigation: this is an extremely rare case in practice, and the new behavior matches shell convention. No migration needed, existing stored `command`/`commandArgs` are unaffected (only `commandRaw` re-join changes, and that only happens on re-edit + save).

- **[Risk: Undo history grows unbounded]** → Capped at `CODE_EDITOR_UNDO_LIMIT` (e.g., 50) in constants. Oldest entries dropped.

- **[Risk: Syntax tokenizer edge cases]** → The tokenizer is intentionally simple. It won't handle nested quotes, escape sequences inside quotes perfectly, or shell variable expansion. This is acceptable, the goal is visual aid, not a correct shell parser. `parseCommandLine` already handles quoting correctly for execution; the tokenizer is purely cosmetic.

- **[Trade-off: Two component variants]** → More code to maintain than a single shared component. Justified by the rendering primitive differences. Shared logic (hook, tokenizer, join function) keeps duplication to UI rendering only.

- **[Risk: OpenTUI modal rendering]** → OpenTUI modals use `position: absolute` with `zIndex`. Need to verify the CodeEditorModal renders above the form correctly, matching `LogModal`'s pattern. Mitigation: follow the same `position: absolute` + `zIndex: 100` structure.

## Open Questions

- Should the modal support a "format" action that auto-indents long commands? (Out of scope for v1, but worth considering if users struggle with readability.)
- Should the preview field show a truncated single-line or wrap to 2 lines? Proposal says 1-2 lines, to be confirmed during implementation based on terminal width.
