# Auto Copy Toast

## Why

When users mouse-select text in the terminal (paths, commands, IDs, log lines) and copy it, they get no feedback from the app. A toast notification confirming "Text Copied" gives them confidence the copy succeeded.

## What Changes

1. `Ctrl+Shift+C` is the copy shortcut (not Ctrl+C which quits). When pressed, the app shows a "Text Copied" toast. The terminal emulator already copies the selected text to the clipboard on Ctrl+Shift+C; the app confirms with a toast.
2. A `useClipboardWatcher` hook polls the system clipboard every 2s. When the clipboard changes externally (e.g. user copies via right-click or Ctrl+Shift+C), it shows the toast automatically. App-initiated copies (e.g. `c` key in LogModal) are suppressed via a flag.
3. The `ctrl+shift+c` shortcut is shown in the CommandInput hint bar and the Ctrl+P commands browser.
4. Ctrl+C (without Shift) still triggers the quit confirm.

## Non-goals

- Detecting mouse selection events (Ink 7 doesn't support mouse events).
- Disabling the terminal's native copy behavior.
