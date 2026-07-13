# Contextual Smart Copy

## Why

Mouse selection in terminals is unreliable across environments (VS Code integrated terminal, Windows Terminal, external terminals). The app cannot detect mouse selection or access selected text. Users need a reliable way to copy useful text (commands, paths, IDs, log content) from the TUI to the clipboard.

## What Changes

1. Replace the current Shift+C / clipboard-watching approach with **contextual smart copy**: pressing `c` on any entity copies the most useful text for that entity to the clipboard via `copyToClipboard()`.
2. The `c` key becomes a context-aware copy shortcut:
   - **Loops tab**: copies the full command (`echo hello my friend`)
   - **Tasks tab**: copies the full command (`commandArgs` joined)
   - **Projects tab**: copies the project name
   - **LogModal**: already has `c` for copy (unchanged)
3. Remove the clipboard watcher polling (`useClipboardWatcher`, already deleted).
4. Remove the `Shift+C` handler and replace with `c` key contextual copy.
5. Show a "Text Copied" toast on every successful copy.
6. Remove the `copy` command from global commands (replaced by the `c` key which is context-aware).

## Non-goals

- Mouse selection detection (impossible in Ink 7).
- Clipboard polling (removed, too unreliable and causes false positives).
- Detecting which text is selected in the terminal.
