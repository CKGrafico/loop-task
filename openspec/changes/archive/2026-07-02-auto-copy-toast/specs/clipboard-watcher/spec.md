# Clipboard Watcher

## ADDED Requirements

### Requirement: Ctrl+Shift+C shows copy toast

The app shall respond to `Ctrl+Shift+C` by showing a "Text Copied" toast. This works alongside the terminal's native copy behavior (which copies selected text to the clipboard).

#### Scenario: User presses Ctrl+Shift+C

- **WHEN** the user presses Ctrl+Shift+C
- **THEN** a toast notification shall appear with the message "Text Copied"

#### Scenario: User presses Ctrl+C (without Shift)

- **WHEN** the user presses Ctrl+C without Shift
- **THEN** the quit confirm dialog shall appear (existing behavior unchanged)

### Requirement: Clipboard polling detects external copies

The app shall poll the system clipboard every 2 seconds and show a "Text Copied" toast when the content changes, unless the change was caused by the app's own `copyToClipboard()` calls.

### Requirement: Shortcut visible in UI

The `ctrl+shift+c` shortcut shall be displayed in the CommandInput hint bar and in the Ctrl+P commands browser under Global commands.

### Requirement: Suppress toast on app-initiated copies

When the app calls `copyToClipboard()` (e.g. pressing `c` in LogModal), no toast shall appear for that clipboard change.
