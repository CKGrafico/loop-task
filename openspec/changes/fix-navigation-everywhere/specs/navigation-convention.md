# Navigation Convention Spec

## ADDED Requirements

### Unified key bindings

- **Req**: Tab/Shift+Tab moves focus between fields, buttons, and panels in every view (forms, board, task-list, projects). Wraps around at both ends.
- **Req**: Up/Down moves selection between list items (loops, tasks, runs, actions) and between fields in forms.
- **Req**: Left/Right moves the text cursor inside `<input>` fields. NEVER used for field or panel navigation.
- **Req**: Enter activates the focused element (submit, toggle, open, next field).
- **Req**: Escape cancels the current view or action.

### State isolation

- **Req**: `useBoardKeybindings` must NOT mutate `focusedPanel` or `selectedAction` when `view !== "board"`.
- **Req**: Form-level `useKeyboard` handlers must call `key.preventDefault()` for keys they handle, so the native input does not double-act.

### Copy/paste

- **Req**: Ctrl+C, Ctrl+V, Ctrl+X, and Ctrl+A must NOT be intercepted by any handler. They fall through to the native `<input>` which handles copy/paste/select-all natively.
