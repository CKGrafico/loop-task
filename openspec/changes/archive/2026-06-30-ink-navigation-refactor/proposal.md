## Why

The v2.0.0 TUI migration to Ink works but navigation is broken. We built a manual `panelFocus` state system instead of using Ink's built-in `useFocus()` + `useFocusManager()`. This causes:
- Tab doesn't cycle through header buttons, filter bar, panels, and action buttons naturally
- Multiple `useInput` handlers all fire at once (App.tsx + each component), causing key conflicts
- No visual focus indicator on header buttons, filter badges, or action buttons
- SearchSelect filter on backspace still has edge cases
- Modals (confirm, log, help) don't render as proper overlays
- Button sizing is inconsistent, no reusable component

## What Changes

- Build 5 reusable Ink components using Ink's native focus system:
  - `FocusableButton` - bordered button with `useFocus()` + `useInput({ isActive })`
  - `FocusableList` - selectable list with up/down/j/k nav (pattern from ink-select-input)
  - `FocusableInput` - text input with `useFocus()` + ink-text-input `focus` routing
  - `FocusableSearchSelect` - filterable dropdown using `useFocus()` + `useInput({ isActive })`
  - `Modal` - overlay container with escape handling
- Refactor all existing components to use these primitives
- Remove manual `panelFocus` state from App.tsx
- Each component calls `useFocus()` to become Tab-navigable
- Each component's `useInput` uses `{ isActive: isFocused }` so only the focused component handles keys
- App.tsx drops to global keys only (Ctrl+C, Escape, shortcuts h/e/d/c/p/s/f/r/n/t/)
- Consistent visual focus model: `borderColor=accent.focus` + `backgroundColor=bg.input` when focused

### Non-goals

- No mouse support (Ink has no mouse API - keyboard only)
- No changes to daemon, IPC, core engine, CLI parsing
- No new features - this is a navigation/UX refactor only
- No changes to theme.ts or design system colors

## Capabilities

### New Capabilities
- `ink-navigation`: Reusable Ink focus components and navigation model using Ink's native `useFocus()` + `useFocusManager()` system.

### Modified Capabilities
<!-- None -->

## Impact

- **`src/tui/components/FocusableButton.tsx`** (new): Reusable button with useFocus + useInput
- **`src/tui/components/FocusableList.tsx`** (new): Reusable selectable list (pattern from ink-select-input)
- **`src/tui/components/FocusableInput.tsx`** (new): Reusable text input with focus routing
- **`src/tui/components/FocusableSearchSelect.tsx`** (new): Replaces current SearchSelect, uses useFocus
- **`src/tui/components/Modal.tsx`** (new): Overlay container
- **`src/tui/components/Header.tsx`**: Uses FocusableButton for all 3 header buttons
- **`src/tui/components/FilterBar.tsx`**: Uses FocusableButton for badges, FocusableInput for search
- **`src/tui/components/Navigator.tsx`**: Uses FocusableList
- **`src/tui/components/RunHistory.tsx`**: Uses FocusableList
- **`src/tui/components/ActionButtons.tsx`**: Uses FocusableButton for each action
- **`src/tui/components/SearchSelect.tsx`**: Replaced by FocusableSearchSelect
- **`src/tui/components/TaskBrowser.tsx`**: Uses FocusableList + FocusableButton
- **`src/tui/components/TaskForm.tsx`**: Uses FocusableInput + FocusableSearchSelect
- **`src/tui/components/CreateForm.tsx`**: Uses FocusableInput + FocusableSearchSelect
- **`src/tui/components/ConfirmModal.tsx`**: Uses Modal + FocusableButton
- **`src/tui/components/LogModal.tsx`**: Uses Modal
- **`src/tui/components/HelpModal.tsx`**: Uses Modal
- **`src/tui/App.tsx`**: Remove panelFocus state, simplify to global keys + view routing
