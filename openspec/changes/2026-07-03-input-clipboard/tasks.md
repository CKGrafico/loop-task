## 1. Constants and bracketed paste toggle

- [ ] 1.1 Add `BRACKETED_PASTE_ENABLE = "\x1b[?2004h"`, `BRACKETED_PASTE_DISABLE = "\x1b[?2004l"`, and `PASTE_MAX_CHARS` to `src/config/constants.ts`. <!-- touches: src/config/constants.ts -->
- [ ] 1.2 In `src/tui/index.tsx`, write `BRACKETED_PASTE_ENABLE` to stdout after render and `BRACKETED_PASTE_DISABLE` on the exit/cleanup path. <!-- touches: src/tui/index.tsx -->

## 2. Paste into the command bar

- [ ] 2.1 Add a `sanitizePaste(raw)` helper that strips `ESC[200~`/`ESC[201~` markers and control chars, and collapses `\r\n`/`\n` to single spaces, capped at `PASTE_MAX_CHARS`. <!-- touches: src/tui/components/CommandInput.tsx -->
- [ ] 2.2 In `CommandMode`, before the single-char branch, detect a paste: `input` contains bracketed markers OR `input.length > 1` and is printable (and is not the Ctrl+Enter escape sequence). Insert the sanitized text char-by-char via `INSERT_TEXT`. <!-- touches: src/tui/components/CommandInput.tsx -->
- [ ] 2.3 Remove the dead `if (input === "a" && key.ctrl)` branch (unreachable after the `if (key.ctrl) return`). <!-- touches: src/tui/components/CommandInput.tsx -->

## 3. Clear line (Ctrl+U)

- [ ] 3.1 In `CommandMode`, before the `if (key.ctrl) return` guard, handle `Ctrl+U` (`key.ctrl && input === "u"`, and the `\x15` control char): dispatch `MOVE_CURSOR_END` then `DELETE_BACKWARD` for the length of `inputValue`. <!-- touches: src/tui/components/CommandInput.tsx -->

## 4. Copy field (Ctrl+A C chord)

- [ ] 4.1 Add an optional `onValueChange?: (value: string) => void` prop to `CommandInput`; call it from a `useEffect` on `state.inputValue`. <!-- touches: src/tui/components/CommandInput.tsx -->
- [ ] 4.2 In `App`, hold a `commandValueRef = useRef("")`, pass `onValueChange={(v) => (commandValueRef.current = v)}`. <!-- touches: src/tui/App.tsx -->
- [ ] 4.3 Extend the `ctrl+a` chord handler with `c: () => copyToClipboard(commandValueRef.current)` and a success toast. <!-- touches: src/tui/App.tsx -->

## 5. Hints + i18n

- [ ] 5.1 Add i18n keys and update the command-mode hint bar to show `ctrl+u clear` (and note paste works via the terminal's paste). <!-- touches: src/tui/components/CommandInput.tsx, src/i18n/en.json -->
- [ ] 5.2 Add a short README note: paste with your terminal's paste (Ctrl+Shift+V / right-click); copy arbitrary text via terminal drag-select + Ctrl+Shift+C. <!-- touches: README.md -->

## 6. Verification

- [ ] 6.1 Unit-test `sanitizePaste` (marker stripping, newline collapse, cap). <!-- touches: tests/tui-components.test.tsx -->
- [ ] 6.2 Component test: a multi-char paste input inserts the full text; `Ctrl+U` empties the input. <!-- touches: tests/tui-components.test.tsx -->
- [ ] 6.3 Run `npx tsc --noEmit` -> `pnpm lint` -> `pnpm test`. <!-- touches: [] -->
