## 1. Shared logic (no UI)

- [x] 1.1 Add `joinCommandLines(text: string): string` to `src/loop-config.ts` — backslash-continuation join: lines ending `\` join without space (backslash consumed), other lines join with space, empty lines dropped
- [x] 1.2 Add unit tests for `joinCommandLines` in existing test file or new `tests/loop-config.test.ts` — cover: plain join, trailing backslash, empty lines, quoted newlines preserved, single line, empty string, only backslashes
- [x] 1.3 Add `tokenizeCommand(line: string): Token[]` to new `src/tui/utils/syntax.ts` — classify tokens as flag (`--foo`, `-f`), string (quoted), operator (`|`, `&&`, `||`, `;`, `>`, `>>`, `<`), word (default). Each token: `{ type, value }`
- [x] 1.4 Add unit tests for `tokenizeCommand` — flags, quoted strings (single/double), operators, escaped quotes, nested tokens, empty line
- [x] 1.5 Add `useUndoRedo` hook to new `src/shared/useUndoRedo.ts` — returns `{ value, setValue, undo, redo, canUndo, canRedo }`; history capped; snapshot on every setValue call
- [x] 1.6 Add unit tests for `useUndoRedo` — push, undo, redo, cap eviction, canUndo/canRedo flags
- [x] 1.7 Add constants to `src/config/constants.ts`: `CODE_EDITOR_MAX_VISIBLE` (preview lines), `CODE_EDITOR_MODAL_HEIGHT`, `CODE_EDITOR_UNDO_LIMIT` (50), `CODE_EDITOR_SYNTAX_COLORS` (map token type to theme color)
- [x] 1.8 Add i18n keys to `src/i18n/en.json` under `codeEditor.*`: `title`, `hint`, `buttonCopy`, `buttonPaste`, `buttonClear`, `buttonSave`, `previewLabel`, `previewTruncated`, `emptyPlaceholder`, `fieldHint`, `copied`, `cleared`

## 2. Ink 7 (tui) CodeEditor components

- [x] 2.1 Create `src/tui/components/CodeEditorPreview.tsx` — bordered field showing first 1-2 lines of `commandRaw`, placeholder when empty, hint "press enter to open editor" when active. Props: `{ value, hint, isActive, onActivate }`
- [x] 2.2 Create `src/tui/components/CodeEditorModal.tsx` — full-screen overlay (match `SelectModal` positioning), multiline editor with line numbers + cursor + scroll, use `useUndoRedo` for history, `tokenizeCommand` for syntax highlighting, visible Copy/Paste/Clear buttons, live preview footer using `joinCommandLines`, Esc to cancel, Ctrl+S to save
- [x] 2.3 Wire keyboard handling in `CodeEditorModal`: arrow keys (navigate), Enter (new line), Backspace/Delete, Ctrl+Z (undo), Ctrl+Shift+Z + Ctrl+Y (redo), Ctrl+S (save), Ctrl+Y (copy — note conflict with redo on some platforms: Ctrl+Y = copy when no Ctrl+Shift, Ctrl+Shift+Z = redo), Ctrl+V (paste), bracketed paste detection via `sanitizePaste`
- [x] 2.4 Add tests for `CodeEditorModal` in `tests/tui-components.test.tsx` — renders with initial value, opens/closes, typing updates value, buttons trigger callbacks, undo/redo works

## 3. OpenTUI (board) CodeEditor components

- [x] 3.1 Create `src/board/components/CodeEditorPreview.tsx` — bordered field showing first 1-2 lines of `commandRaw`, placeholder when empty, click or Enter opens modal. Props match tui variant
- [x] 3.2 Create `src/board/components/CodeEditorModal.tsx` — `position: absolute` full-screen overlay (match `LogModal` pattern, `zIndex: 100`), multiline editor with line numbers + cursor + scroll using OpenTUI primitives, `useUndoRedo` + `tokenizeCommand`, visible Copy/Paste/Clear buttons (use `useHoverState` for hover), live preview footer, Esc to cancel, Ctrl+S to save
- [x] 3.3 Wire keyboard via `useKeyboard`: arrows, Enter, Backspace/Delete, Ctrl+Z, Ctrl+Shift+Z/Ctrl+Y, Ctrl+S, Ctrl+V, Tab to focus buttons
- [x] 3.4 Add tests for board `CodeEditorModal` — renders, opens/closes, typing, buttons, undo/redo

## 4. Integrate into Ink forms

- [x] 4.1 Replace `InlineCommandEditor` usage in `src/tui/components/CreateForm.tsx` — step `command` uses `CodeEditorPreview` as `renderCustom` with `onActivate` opening `CodeEditorModal`; modal save updates `commandValue` state and calls `onChange`
- [x] 4.2 Replace `InlineCommandEditor` usage in `src/tui/components/TaskForm.tsx` — same pattern as 4.1
- [x] 4.3 Update `handleComplete` in `src/tui/components/CreateForm.tsx` — use `joinCommandLines(commandValue)` instead of inline `.split("\n").map(trim).filter(Boolean).join(" ")`
- [x] 4.4 Update `handleComplete` in `src/tui/components/TaskForm.tsx` — use `joinCommandLines(commandValue)` instead of inline join
- [x] 4.5 Delete `src/tui/components/InlineCommandEditor.tsx` — remove file and any lingering imports
- [x] 4.6 Verify WizardForm `renderCustom` + `onActivate` interaction: Enter opens modal (not field advance), Tab still advances, Esc closes modal without closing form

## 5. Integrate into board forms

- [x] 5.1 Replace single-line `<input>` for command field in `src/board/components/CreateForm.tsx` — use `CodeEditorPreview` + `CodeEditorModal`; remove the small inline copy button (move into modal)
- [x] 5.2 Replace single-line `<input>` for command field in `src/board/components/TaskForm.tsx` — use `CodeEditorPreview` + `CodeEditorModal`
- [x] 5.3 Update `submit` in `src/board/components/CreateForm.tsx` — use `joinCommandLines(values.command)` instead of `current.command.trim()` for the join step before `parseCommandLine`
- [x] 5.4 Update `submit` in `src/board/components/TaskForm.tsx` — use `joinCommandLines` for command parsing
- [x] 5.5 Update `useTabNav` items in both board forms to include the CodeEditor preview field in navigation order

## 6. Verification

- [x] 6.1 Run `rtk npx tsc --noEmit` — fix all type errors
- [x] 6.2 Run `rtk pnpm lint` — fix all lint issues
- [x] 6.3 Run `rtk pnpm test` — all tests pass, coverage ≥ 90%
- [ ] 6.4 Manual: create a loop with a multiline command using backslash continuation in both tui and board — verify `commandRaw` stored multiline, `command`+`commandArgs` parsed as single line
- [ ] 6.5 Manual: edit an existing loop/task — verify modal loads `commandRaw` verbatim, line breaks preserved
- [ ] 6.6 Manual: verify Copy/Paste/Clear buttons work in both modal variants
- [ ] 6.7 Manual: verify undo/redo works (Ctrl+Z / Ctrl+Shift+Z) in both modal variants
- [ ] 6.8 Manual: verify live preview footer shows correct joined single-line result
