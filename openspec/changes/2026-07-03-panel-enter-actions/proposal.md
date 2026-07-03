## Why

The board's contextual "edit / view logs" action is bound only to **Ctrl+Enter**. Many terminals (VS Code integrated terminal, Windows Terminal, conhost) do not deliver a distinct sequence for Ctrl+Enter — they send it as plain Enter — so in those environments the action is silently unreachable. A user who can navigate the list (arrows/j-k work) still cannot open a loop's log or edit a task without falling back to the command palette or chords. Plain **Enter** on a focused panel is the obvious, universal gesture and is currently unused when the command bar is empty.

## What Changes

- When a board panel is focused and the bottom command input is **empty** (no typed command, dropdown closed), pressing **Enter** performs the same contextual action as Ctrl+Enter:
  - **Loops tab, left panel** → edit the selected loop.
  - **Loops tab, right panel** → open the latest run's log (or edit the loop if it has no runs).
  - **Tasks tab** → edit the selected task.
  - **Projects tab** → edit the selected project.
- Ctrl+Enter continues to work unchanged where the terminal delivers it.
- Command submission is unaffected: when the user has typed a command or the autocomplete dropdown is open, Enter still submits/selects as today. The panel action only fires when the input is empty.

### Non-goals

- No change to Ctrl+Enter detection or the chord shortcuts.
- No new binding for tasks/projects beyond reusing the existing `edit` action.
- No visual selection or multi-select in panels.
- No change to what "edit" or "logs" do — only a new key that triggers the existing handlers.

## Capabilities

### New Capabilities
- `panel-enter-actions`: Plain Enter on a focused panel (with an empty command bar) triggers the contextual edit/log action, giving terminals that cannot send Ctrl+Enter a working path.

### Modified Capabilities
<!-- None - reuses existing edit/logs command handlers. -->

## Impact

- **`src/tui/App.tsx`**: Extract the existing Ctrl+Enter handler body into a `triggerContextualAction()` function; call it from both the Ctrl+Enter branch and a new `onPanelAction` prop passed to `CommandInput`.
- **`src/tui/components/CommandInput.tsx`**: In `CommandMode`, when Enter is pressed with an empty `inputValue` and no actionable dropdown, invoke `onPanelAction?.()` instead of no-op.
- **`src/i18n/en.json`**: Update the hint bar to advertise `enter edit/logs`.
- **IPC contract (src/types.ts)**: No change.
- **Persisted state (LoopMeta)**: No change.
- **Cross-platform**: This is the fix for terminals (notably VS Code on Windows) that collapse Ctrl+Enter to Enter. No platform-specific code paths.
