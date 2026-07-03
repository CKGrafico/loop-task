## Why

Text entry in the board has no working clipboard story. Ctrl+C is claimed by Ink (`exitOnCtrlC` defaults to true → quits the app) and by the VS Code terminal (copy the buffer); Ctrl+V and Ctrl+A are likewise intercepted by the VS Code terminal before reaching the app. As a result, a user cannot paste a command into the command bar, cannot clear a field quickly, and cannot copy the text they are typing. The command bar (`ink-combobox`) makes this worse: it drops any multi-character input (only single printable chars are inserted), so even a raw paste chunk is silently discarded.

The fix is to stop relying on the intercepted keys and instead ride the terminal's own paste, plus add line-editing that does not collide with the reserved chord prefix.

## What Changes

- **Paste (primary):** Enable bracketed paste mode (`ESC[?2004h` on board mount, `ESC[?2004l` on exit). A native paste gesture (Ctrl+Shift+V, Cmd+V, right-click) then arrives as a single chunk; strip any `ESC[200~`/`ESC[201~` markers, collapse newlines to spaces (single-line inputs), and insert the text. This works identically in native Windows CLI and the VS Code terminal because it does not depend on a keybinding the app must capture.
- **Paste (multi-char fallback):** In the command bar, treat any multi-character printable input as a paste and insert it (today it is dropped). This makes right-click/Ctrl+Shift+V paste work even without bracketed paste.
- **Clear line (select-all + delete surrogate):** `Ctrl+U` clears the command input. This is the practical "select all then retype/paste" gesture; true visual selection is a non-goal.
- **Copy field:** the existing chord `Ctrl+A` then `C` copies the current command-input text to the clipboard via the existing cross-platform `copyToClipboard`. The bare-`c` contextual copy (selected loop/task command) is unchanged.
- **Docs:** README/help note that terminal drag-select + native copy (Ctrl+Shift+C / right-click) also works, since Ink does not enable mouse reporting.

### Non-goals

- No visual highlight selection inside inputs (selection state + inverse-video rendering + Shift+Arrow) — deferred; `ink-combobox` would need forking.
- No remapping of Ctrl+C to copy (Ink owns it for quit).
- No Emacs kill-ring; `Ctrl+U` is a simple clear, not a yank buffer.
- No change to `ink-text-input` fields beyond confirming they already accept pasted text.

## Capabilities

### New Capabilities
- `input-clipboard`: Bracketed-paste + multi-char paste into the command bar, `Ctrl+U` clear-line, and `Ctrl+A C` copy-field, none of which depend on terminal-intercepted keys.

### Modified Capabilities
<!-- None - additive input handling; existing command submission and bare-c copy unchanged. -->

## Impact

- **`src/tui/index.tsx`**: Write `ESC[?2004h` after render and `ESC[?2004l` on exit/cleanup to toggle bracketed paste mode.
- **`src/tui/components/CommandInput.tsx`**: In `CommandMode`, detect paste (bracketed markers or multi-char printable input), sanitize, and insert char-by-char via `INSERT_TEXT`; add `Ctrl+U` clear (loop `MOVE_CURSOR_END` + `DELETE_BACKWARD`); report the live input value to the parent via an `onValueChange` ref callback for copy. Remove the dead `input === "a" && key.ctrl` branch.
- **`src/tui/App.tsx`**: Track the command value in a `useRef` (no re-render); extend the `Ctrl+A` chord with a `c` handler that copies the ref value.
- **`src/config/constants.ts`**: `BRACKETED_PASTE_ENABLE` / `BRACKETED_PASTE_DISABLE` escape constants; `PASTE_MAX_CHARS` cap.
- **`src/i18n/en.json`**: Hint keys for `ctrl+u clear` and paste/copy affordances.
- **IPC contract (src/types.ts)**: No change.
- **Persisted state (LoopMeta)**: No change.
- **Cross-platform**: Bracketed paste is terminal-level and works on Windows and Unix; `copyToClipboard`/`readFromClipboard` already branch per-OS (clip/pbcopy/xclip).
