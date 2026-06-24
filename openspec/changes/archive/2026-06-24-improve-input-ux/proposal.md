# Improve Input UX

## Why

The TUI board's input fields are hostile to use. Left/right arrows navigate between fields instead of moving the text cursor within a field. The board search and task-list search are fake inputs (character-append state machines) that don't support cursor movement, paste, select-all, or any standard text editing. Tab/Shift+Tab works for field navigation but left/right arrows should not duplicate that role - they should move the cursor inside the input text.

Users expect terminal inputs to behave like any web input: navigate fields with Tab/Shift+Tab, move the cursor with arrows, select text with Shift+arrows, paste with terminal bracketed paste, select-all with Ctrl+A, etc.

## What Changes

### Form inputs (CreateForm, TaskForm)

1. **Left/right arrows stop being field navigators.** When an input field is focused, left/right arrows move the text cursor inside the input (native OpenTUI behavior). Tab/Shift+Tab remains the sole field-to-field navigation method.
2. **Remove the left/right field-navigation handler** from the form-level `useKeyboard` hooks in CreateForm.tsx and TaskForm.tsx. Let left/right fall through to the native `<input>` component.
3. **Tab/Shift+Tab wraps around** (Save -> Cancel -> first field -> last field -> ...), instead of clamping at boundaries.
4. **Up/down arrows** on non-project fields are left to the native input (no-op for single-line, but not intercepted).

### Board search and task-list search

5. **Replace the fake search inputs with native `<input>` components** rendered as overlay fields. This gives full text editing: cursor movement, paste, select-all, undo/redo.
6. The search overlay is dismissed with Escape or Enter (same as today), but while active the user gets full text editing capabilities.

## Non-goals

- Adding multi-line text areas (inputs stay single-line).
- Changing the visual layout of the search bar or forms.
- Adding autocomplete or history to search.
- Modifying the OpenTUI core library itself.
