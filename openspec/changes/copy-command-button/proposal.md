## Why

Task commands in the task list and task editor are long shell strings that users need to copy elsewhere (e.g., to run in a terminal or paste into documentation). Currently there is no way to copy a task's command - the text is displayed in a read-only view or inside an input field, and the user can't select and copy it in a TUI.

## What Changes

- Add a small copy button (with a clipboard icon `📋` or `⧉`) next to the command field in the TaskInspector component (task list view).
- Add a copy button next to the command input in TaskForm (task edit/create view).
- Clicking the button copies the full command string (command + args joined) to the system clipboard.
- A toast notification confirms the copy succeeded.

### Non-goals

- No copy button for other fields (name, chain targets) - only the command.
- No keyboard shortcut for copy (mouse/click only).
- No changes to the loop create form command field.

## Capabilities

### New Capabilities
- `copy-command`: A copy-to-clipboard button next to command fields in task views.

### Modified Capabilities
<!-- None -->

## Impact

- **`src/board/components/TaskBrowser.tsx`** (TaskInspector): Add copy button next to the command display.
- **`src/board/components/TaskForm.tsx`** (TaskFormRow): Add copy button next to the command input.
- **`src/shared/clipboard.ts`**: Already has `copyToClipboard` - reuse it.
- **`src/i18n/en.json`**: New key for copy toast and button label.
- No IPC contract changes. No persisted state changes.
