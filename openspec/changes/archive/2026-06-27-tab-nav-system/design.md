## Context

The board has 7 components that each implement Tab/Shift+Tab navigation independently, using 3 different state models:
1. **Numeric `focusIndex`** (TaskForm, CreateForm) - increment/decrement with wrap.
2. **String `focusField`** (EditProjectModal, CreateProjectModal) - modular wrap over a fixed order array.
3. **Named-panel `focusedPanel`** (ProjectsPage local, board-level) - dictionary-based panel transitions.

Each implementation has bugs: missing `preventDefault` (project modals), stale focus index (CreateForm when fields are filtered), arrow-key hijacking (TaskForm), header handoff race conditions (ProjectsPage). The `useTabNav` hook unifies all of these into one tested, consistent mechanism.

Key constraint: OpenTUI's `useKeyboard` runs global handlers with priority before focused renderables. `key.preventDefault()` is required to stop the default input behavior. `key.stopPropagation()` is NOT needed for Tab (no sibling handlers compete for it in forms/modals).

## Goals / Non-Goals

**Goals:**
- One `useTabNav` hook that handles Tab/Shift+Tab cycling over an ordered list of nav items.
- `key.preventDefault()` on every Tab event (fixes the project modal bug).
- Dynamic item lists (CreateForm's `filteredFields` can change at runtime).
- Configurable wrap behavior (wrap by default, but ProjectsPage needs to call `onExitHeader` at boundaries instead of wrapping).
- Replace all 5 form/modal Tab handlers (TaskForm, CreateForm, EditProjectModal, CreateProjectModal, ProjectsPage).

**Non-Goals:**
- No board panel navigation refactor (`PANEL_LEFT`/`PANEL_RIGHT` stays).
- No task-list panel navigation refactor (`nextTaskPanel` stays).
- No handling of up/down/left/right (those are list-internal or blocked by forms).
- No handling of Enter/Space (those trigger form-specific actions, not navigation).

## Decisions

### 1. Hook API: `useTabNav(items, options?)`

**Decision**: The hook takes an array of items and returns the current focus state.

```ts
interface UseTabNavOptions {
  initialIndex?: number;
  onCycleOut?: (direction: "left" | "right") => void;
}

interface UseTabNavReturn<T> {
  focusIndex: number;
  setFocusIndex: (i: number) => void;
  focusedItem: T;
  isFocused: (item: T) => boolean;
}

function useTabNav<T>(items: T[], options?: UseTabNavOptions): UseTabNavReturn<T>;
```

**Why not a render-prop or context**: The hook is per-component, not app-wide. Each form/modal registers its own `useKeyboard` via the hook. This matches the existing pattern where each component has its own `useKeyboard`.

**Why `onCycleOut`**: ProjectsPage needs to call `onEnterHeader` when Tab cycles past the last item (or Shift+Tab past the first). Other forms just wrap. `onCycleOut` is optional; when undefined, the hook wraps.

### 2. Items are generic `<T>`, not just strings

**Decision**: The hook is generic over `T`. TaskForm passes `taskFields` (string array). CreateForm passes `filteredFields` (string array). ProjectsPage passes `["list", "edit", "delete"]`. The `focusedItem` return gives the current item directly, so forms don't need to index into an array.

**Why not numeric only**: String items are more readable and self-documenting. `focusedItem === "color"` is clearer than `focusIndex === 1`.

### 3. Dynamic items: re-derive `focusIndex` when items change

**Decision**: If `items.length` changes (CreateForm toggles inline/existing mode), the hook clamps `focusIndex` to `[0, items.length - 1]`. This is done via a `useEffect` that watches `items.length`.

**Why not recompute on every render**: A `useEffect` is sufficient because item changes are infrequent (mode toggles) and the clamp only needs to happen after the render, not during.

### 4. `useKeyboard` registered internally, no external keyboard handling needed for Tab

**Decision**: The hook calls `useKeyboard` internally and handles Tab/Shift+Tab. It calls `key.preventDefault()` on all Tab events. The parent component does NOT need its own Tab handler.

**Why not let the parent handle Tab**: Centralizing Tab handling in the hook eliminates the "forgot to preventDefault" bug and the "arrow keys hijacking Tab" bug. The parent only needs to handle Enter, Space, and any non-Tab keys.

### 5. ProjectsPage special case: `onCycleOut` instead of wrap

**Decision**: When `onCycleOut` is provided, the hook calls it instead of wrapping. The parent uses this to call `onEnterHeader`. When the header returns focus (via `headerFocused` prop), the parent resets `focusIndex` to 0.

**Why not handle header inside the hook**: The header is managed by the board-level `useBoardKeybindings`, not by the form. The hook doesn't know about `onEnterHeader` semantics - it just signals "you've cycled out."

### 6. Arrow keys are NOT handled by the hook

**Decision**: The hook only handles Tab/Shift+Tab. Arrow keys (up/down/left/right) are left to the parent. Forms block them (call `preventDefault` and return), lists use them for item navigation.

**Why**: Arrow key behavior varies by context (list navigation vs. blocked in forms vs. color picker cycling). Forcing it through the hook would require complex configuration.

## Risks / Trade-offs

- [Dual `useKeyboard` handlers in ProjectsPage] → The hook registers its own `useKeyboard`, and ProjectsPage also needs `useKeyboard` for up/down (list navigation) and Enter (activate). Both fire. The hook handles Tab and calls `preventDefault`; the other handler handles up/down and ignores Tab. No conflict because they handle different keys.
- [Dynamic items and stale focus] → Mitigated by `useEffect` clamping on `items.length` change.
- [Project modals: `onCycleOut` not needed] → These modals wrap normally; `onCycleOut` is optional, so they just don't pass it.
- [Generic type complexity] → Minimal: `useTabNav<string>(["name", "color", "save", "cancel"])` is the typical usage. The generic allows flexibility but the common case is strings.
