## Why

Selects in the board are broken and unusable. The only real `<select>` element (in TaskForm for chain task selection) hijacks up/down arrow keys: pressing up/down to navigate options instead jumps focus to another form field. There is no way to search/filter options, so with many tasks finding the right chain target requires scrolling through a tiny box. CreateForm's hand-rolled project pills work but are also not searchable and inconsistent with the task form. A reusable, searchable select component fixes both the keybinding bug and the UX gap.

## What Changes

- New `SearchSelect` component (`src/board/components/SearchSelect.tsx`): a box-based dropdown with an inline filter input at top, a scrollable filtered list below, up/down to navigate options, Enter to select, Tab to move to next field. Manages its own keyboard state internally when focused.
- Replace the OpenTUI `<select>` intrinsic in `TaskForm.tsx` (onSuccessTaskId, onFailureTaskId fields) with `SearchSelect`.
- Replace the hand-rolled inline project pills in `CreateForm.tsx` (project field) with `SearchSelect`.
- Fix the up/down keybinding bug in `TaskForm.tsx`: when a select field is focused, up/down must navigate the select options, not move form focus. This is now handled inside `SearchSelect` itself.
- Add i18n keys for SearchSelect placeholder text.

### Non-goals

- No replacing color pickers in EditProjectModal/CreateProjectModal (only 6 options, no search needed).
- No replacing ProjectsModal (already has type-to-filter, works well as-is).
- No changes to the OpenTUI `<select>` intrinsic or its keyBindings.
- No IPC contract changes, no persisted state changes, no cross-platform impact.

## Capabilities

### New Capabilities
- `search-select`: A reusable searchable dropdown component with inline filter input, keyboard navigation, and option selection, used in form fields where the option list is large enough to warrant filtering.

### Modified Capabilities
<!-- None - no existing spec-level behavior changes. -->

## Impact

- **`src/board/components/SearchSelect.tsx`** (new): The reusable component. Props: `options`, `value`, `onChange`, `focused`, `placeholder`, `height`. Internally manages filter text, filtered list, selected index, and keyboard handling.
- **`src/board/components/TaskForm.tsx`**: Replace `<select>` with `<SearchSelect>` for onSuccessTaskId and onFailureTaskId fields. Remove the now-unnecessary select-specific height calculation. The form's `useKeyboard` handler no longer needs to intercept up/down for select fields - SearchSelect handles it internally.
- **`src/board/components/CreateForm.tsx`**: Replace the hand-rolled project pill row with `<SearchSelect>`. The form's `useKeyboard` handler's project-specific up/down cycling logic can be removed since SearchSelect handles navigation internally.
- **`src/i18n/en.json`**: New key `board.searchSelectPlaceholder` for the filter input placeholder.
- **`src/config/constants.ts`**: `SEARCH_SELECT_HEIGHT` constant for the default dropdown height.
- No IPC contract changes. No persisted state changes. No cross-platform impact.
