# Fix Navigation Everywhere

## Why

Keyboard navigation across the TUI is broken and inconsistent. Up/down arrows don't navigate lists when an input is focused. Left/right arrows corrupt board state when used inside forms. Navigation convention splits three ways (Tab in forms, left/right on board, both in task-list). Copy/paste doesn't work in inputs because no handler checks `key.ctrl` and `useKeyboard` return values are silently discarded by OpenTUI (the only way to stop propagation is `key.preventDefault()`).

## What Changes

### Unified navigation convention (all views)

- **Tab / Shift+Tab** = move between fields/buttons (wraps around). Used in forms AND on board/task-list for panel navigation.
- **Up / Down** = move between list items (loops, tasks, runs, actions). In forms, move between fields vertically.
- **Left / Right** = move text cursor inside `<input>` (NEVER field/panel navigation). Falls through to native OpenTUI input behavior.
- **Enter** = activate / submit / focus next field.
- **Escape** = cancel / go back.

### Fix state corruption

- Guard the `useBoardKeybindings` left/right block behind `view === "board"` so it never mutates `focusedPanel` when a form or other view is open.

### Fix up/down in forms

- CreateForm: add up/down to navigate between fields (not just the project dropdown).
- TaskForm: add up/down to navigate between fields.

### Fix copy/paste in inputs

- Add `key.preventDefault()` calls in all `useKeyboard` handlers for keys they handle, so the native input doesn't double-act.
- Do NOT intercept Ctrl+C / Ctrl+V / Ctrl+X / Ctrl+A anywhere, let them fall through to the native `<input>` which handles them natively.

### Board navigation: add Tab support

- Add Tab/Shift+Tab as an alternative to left/right for panel navigation on the board view (consistent with forms and task-list).

## Non-goals

- Changing the visual layout of any view.
- Adding new keyboard shortcuts beyond the convention.
- Modifying the OpenTUI core library.
