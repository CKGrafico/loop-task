## Context

The board has one OpenTUI `<select>` intrinsic (TaskForm.tsx chain fields) and one hand-rolled inline pill row (CreateForm.tsx project field). The `<select>` is broken: the form's `useKeyboard` handler intercepts up/down before the select renderable can handle them, moving form focus instead of navigating options. CreateForm's pills work but are not searchable. Both patterns are ad-hoc and inconsistent.

Key files: `src/board/components/TaskForm.tsx` (select at line 262, keybindings at line 60-92), `src/board/components/CreateForm.tsx` (project pills at line 484-503, keybindings at line 114-175).

OpenTUI's `useKeyboard` runs global handlers with priority before focused renderables. `key.preventDefault()` in global handlers suppresses the renderable's own key handling. This means any component that needs to own its keyboard state must do so via its own `useKeyboard` registration and call `key.preventDefault()` + `key.stopPropagation()` to prevent the parent form from also acting.

## Goals / Non-Goals

**Goals:**
- A reusable `SearchSelect` component with inline filter, keyboard navigation, and option selection.
- Replace the broken `<select>` in TaskForm and the hand-rolled pills in CreateForm.
- Each form's `useKeyboard` only handles Tab (field navigation) and Enter on buttons; all select-internal navigation is delegated to SearchSelect.

**Non-Goals:**
- No replacing color pickers (6 options, no search needed).
- No replacing ProjectsModal (already has type-to-filter).
- No changes to the OpenTUI `<select>` intrinsic.
- No multi-select (single value only).

## Decisions

### 1. Box-based component, not OpenTUI `<select>`

**Decision**: Build SearchSelect entirely from `<box>`, `<text>`, and `<input>` primitives. Do not use the OpenTUI `<select>` intrinsic.

**Why**: The `<select>` intrinsic's key handling is broken by the `useKeyboard` priority system. A box-based component that registers its own `useKeyboard` when focused can fully control key handling. Also, the `<select>` intrinsic has no search/filter API - we'd have to wrap it anyway.

**Alternative considered**: Fix the `<select>` by not calling `key.preventDefault()` in the form when a select is focused. Rejected - `<select>` has no search/filter, so the UX problem remains even if the keybinding bug is fixed.

### 2. Internal keyboard state via `useKeyboard`

**Decision**: SearchSelect registers its own `useKeyboard` handler that is active when `focused` is true. It handles: typing (filter input), up/down (navigate filtered list), Enter (select option), Backspace (delete filter char), Escape (clear filter). It calls `key.preventDefault()` on ALL handled keys to prevent the parent form from also acting.

**Why not delegate to parent**: Each form has different field navigation logic. Making SearchSelect self-contained means it works identically in TaskForm, CreateForm, and any future form. The parent only needs to know "Tab = move to next field" (which SearchSelect does NOT handle - it lets Tab propagate to the parent).

**Critical detail**: `key.stopPropagation()` must be called in addition to `key.preventDefault()`. OpenTUI's event model means `preventDefault` stops the default renderable action but `stopPropagation` is needed to stop sibling/cascade handlers from also acting.

### 3. Layout: filter input on top, list below

**Decision**: A fixed-height box with two sections:
1. Top: a single-line filter `<input>` (height 3 with border) showing placeholder or current filter text.
2. Bottom: a scrollable list of filtered options (height = `min(options.length, SEARCH_SELECT_HEIGHT)`). Current selection highlighted with `› ` prefix and accent background.

**Why not inline expansion**: A fixed-height dropdown is simpler to render in a TUI grid, avoids layout shifts when the list grows/shrinks, and is consistent with the existing `<select>` box pattern.

### 4. Filter logic: case-insensitive substring match on name

**Decision**: The filter input filters options by case-insensitive substring match against the option's `name` field. If `value` exists and differs from `name`, it is also matched.

**Why not fuzzy match**: Substring search is simple, fast, and matches user expectations for a task list of <100 items. Fuzzy matching adds complexity for marginal benefit at this scale.

### 5. Tab propagation: SearchSelect does NOT handle Tab

**Decision**: SearchSelect does NOT call `preventDefault` on Tab. Tab events propagate to the parent form's `useKeyboard`, which handles field navigation.

**Why**: Tab is the universal "move to next field" key in this TUI. If SearchSelect captured Tab, the user would be trapped inside it. By letting Tab propagate, the parent form retains control over field navigation.

### 6. `useInputShortcuts` integration

**Decision**: The filter `<input>` inside SearchSelect should work with the existing `useInputShortcuts` hook (Ctrl+C/X/V/A). The input ref is passed to the parent form's `useInputShortcuts` callback, same as regular text inputs.

## Risks / Trade-offs

- [Dual `useKeyboard` handlers may conflict] → Mitigated: SearchSelect calls both `key.preventDefault()` and `key.stopPropagation()` on all handled keys (up/down/enter/backspace/escape/typeable chars), so the parent handler never sees them. Only Tab propagates.
- [Performance with large option lists] → Not a risk: option lists are bounded by the number of tasks/projects (typically <100). Substring filter on <100 items is trivial.
- [Layout: fixed height may waste space for small lists] → Mitigated: height is `min(options.length, SEARCH_SELECT_HEIGHT)` so small lists don't get empty rows.
- [Filter input focuses automatically when select is focused] → Desired behavior: the user can immediately type to filter when the select is focused.
