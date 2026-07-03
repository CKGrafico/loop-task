## 1. Constants and bracketed paste toggle

- [x] 1.1 Add `BRACKETED_PASTE_ENABLE = "\x1b[?2004h"`, `BRACKETED_PASTE_DISABLE = "\x1b[?2004l"`, and `PASTE_MAX_CHARS` to `src/config/constants.ts`. <!-- touches: src/config/constants.ts -->
- [x] 1.2 In `src/tui/index.tsx`, write `BRACKETED_PASTE_ENABLE` to stdout after render and `BRACKETED_PASTE_DISABLE` on the exit/cleanup path. <!-- touches: src/tui/index.tsx -->

## 2. Paste into the command bar

- [x] 2.1 Add a `sanitizePaste(raw)` helper that strips `ESC[200~`/`ESC[201~` markers and control chars, and collapses `\r\n`/`\n` to single spaces, capped at `PASTE_MAX_CHARS`. <!-- touches: src/tui/components/CommandInput.tsx -->
- [x] 2.2 In `CommandMode`, before the single-char branch, detect a paste: `input` contains bracketed markers OR `input.length > 1` and is printable (and is not the Ctrl+Enter escape sequence). Insert the sanitized text char-by-char via `INSERT_TEXT`. <!-- touches: src/tui/components/CommandInput.tsx -->
- [x] 2.3 Remove the dead `if (input === "a" && key.ctrl)` branch (unreachable after the `if (key.ctrl) return`). <!-- touches: src/tui/components/CommandInput.tsx -->

## 3. Clear line (Ctrl+U)

- [x] 3.1 In `CommandMode`, before the `if (key.ctrl) return` guard, handle `Ctrl+U` (`key.ctrl && input === "u"`, and the `\x15` control char): dispatch `MOVE_CURSOR_END` then `DELETE_BACKWARD` for the length of `inputValue`. <!-- touches: src/tui/components/CommandInput.tsx -->

## 4. Copy field (Ctrl+A C chord) — DESCOPED

Descoped during implementation: `Ctrl+A` then `C` already maps to **clone** (`actionShortcuts.c` in App.tsx), so this would collide; and copying the text you just typed into the command bar is low-value. Copy stays served by the existing bare-`c` contextual copy (selected loop/task command) plus the terminal's native drag-select copy, documented in README.

- [~] 4.1 Descoped — no `onValueChange` plumbing added.
- [~] 4.2 Descoped.
- [~] 4.3 Descoped — `Ctrl+A C` retained for clone.

## 5. Hints + i18n

- [x] 5.1 Update the command-mode hint bar to show `ctrl+u clear` and `enter edit/logs` (inline KeyHint strings; no new i18n keys needed). <!-- touches: src/tui/components/CommandInput.tsx -->
- [x] 5.2 Add a short README note: paste with your terminal's paste (Ctrl+Shift+V / right-click); copy arbitrary text via terminal drag-select + Ctrl+Shift+C. <!-- touches: README.md -->

## 6. Verification

- [x] 6.1 Unit-test `sanitizePaste` (marker stripping, newline collapse, control-char drop, cap). <!-- touches: tests/tui-components.test.tsx -->
- [x] 6.2 Component test: a multi-char paste input inserts the full text; `Ctrl+U` empties the input. <!-- touches: tests/tui-components.test.tsx -->
- [x] 6.3 Run `npx tsc --noEmit` -> `pnpm lint` -> `pnpm test`. <!-- touches: [] -->
