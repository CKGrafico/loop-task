## Why

Tab navigation is reimplemented independently in 7 components with 3 different state models (numeric `focusIndex`, string `focusField`, named-panel `focusedPanel`), each with subtle bugs: missing `preventDefault` in project modals, stale `focusIndex` when fields are dynamically filtered in CreateForm, header-handoff race conditions in ProjectsPage, and arrow-key hijacking in TaskForm. A single `useTabNav` hook that manages an ordered list of nav items and centralizes Tab/Shift+Tab cycling eliminates all these issues and makes adding new forms trivial.

## What Changes

- New `useTabNav` hook (`src/board/hooks/useTabNav.ts`): accepts an array of nav item identifiers (strings or numbers) and returns `{ focusIndex, setFocusIndex, focusNext, focusPrev, focusedId, isFocused }`. Registers its own `useKeyboard` handler for Tab/Shift+Tab with `key.preventDefault()`. Does NOT handle up/down/left/right (those are list-internal or blocked).
- Refactor `TaskForm.tsx` to use `useTabNav` with its `taskFields + save + cancel` list. Remove the manual `focusIndex` + `useKeyboard` Tab handler. Keep up/down blocked, let SearchSelect handle its own arrows.
- Refactor `CreateForm.tsx` to use `useTabNav` with its dynamic `filteredFields + save + cancel` list. Remove the manual `focusIndex` + `useKeyboard` Tab/arrow handler. Keep the Enter/Space toggle handling.
- Refactor `EditProjectModal.tsx` to use `useTabNav` with `["name", "color", "save", "cancel"]`. Remove the manual `focusField` + `useKeyboard` Tab handler. Fix the missing `preventDefault`.
- Refactor `CreateProjectModal.tsx` to use `useTabNav` with the same list. Same fix.
- Refactor `ProjectsPage.tsx` to use `useTabNav` for its `list + action-buttons + header-exit` cycle. Remove the manual `focusedPanel` + `useKeyboard` Tab handler. Keep arrow handling for the project list.
- Add i18n key for any new placeholder if needed (likely none).

### Non-goals

- No refactoring the board view panel navigation (`PANEL_LEFT`/`PANEL_RIGHT` maps in `useBoardKeybindings.ts`). The board has a complex multi-panel layout with header handoff that works differently from forms. It stays as-is.
- No refactoring `useTaskKeybindings.ts` (task-list panel navigation). Same reason: multi-panel with header handoff.
- No changes to the `PanelFocus` type or `TASK_PANEL_ORDER`.
- No new dependencies.

## Capabilities

### New Capabilities
- `tab-nav`: A reusable `useTabNav` hook that provides ordered Tab/Shift+Tab navigation across a list of focusable items, with `preventDefault` on all Tab events and configurable wrap behavior.

### Modified Capabilities
<!-- None - no existing spec-level behavior changes. -->

## Impact

- **`src/board/hooks/useTabNav.ts`** (new): The hook. Props: `items: (string | number)[]`, `initialIndex?: number`. Returns: `{ focusIndex, setFocusIndex, focusedId, isFocused }`. Registers `useKeyboard` internally for Tab/Shift+Tab only.
- **`src/board/components/TaskForm.tsx`**: Replace manual `focusIndex` state + Tab handler with `useTabNav`. Remove ~15 lines of Tab/arrow handling.
- **`src/board/components/CreateForm.tsx`**: Replace manual `focusIndex` state + Tab/arrow handler with `useTabNav`. Remove ~20 lines of Tab/arrow handling. The `filteredFields` array feeds directly into `useTabNav`.
- **`src/board/components/EditProjectModal.tsx`**: Replace manual `focusField` string union + Tab handler with `useTabNav`. Remove ~7 lines. Fix missing `preventDefault`.
- **`src/board/components/CreateProjectModal.tsx`**: Same as EditProjectModal.
- **`src/board/components/ProjectsPage.tsx`**: Replace manual `focusedPanel` + Tab handler for list/actions cycling with `useTabNav`. The nav items are `["list", "action-0", "action-1"]` with `onExitHeader` called when cycling past the last item.
- **No IPC contract changes.** No persisted state changes. No cross-platform impact.
