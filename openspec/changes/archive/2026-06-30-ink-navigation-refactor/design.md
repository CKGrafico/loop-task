## Context

Ink provides a built-in focus system via `useFocus()` and `useFocusManager()`. When a component calls `useFocus()`, it becomes "focusable" - Ink automatically cycles to it on Tab/Shift+Tab in render order. The hook returns `{ isFocused }` which the component uses to render visual state and gate its `useInput` handler via `{ isActive: isFocused }`.

The current codebase (v2.0.0) has a manual `panelFocus: string` state in App.tsx that tracks which panel is focused. This fights Ink's native system and causes keyboard conflicts. The `ink-select-input` package (installed but unused) demonstrates the correct pattern: receive `isFocused` as a prop, use `useInput(handler, { isActive: isFocused })`.

## Goals / Non-Goals

**Goals:**
- Build 5 reusable components using Ink's native focus system
- Every focusable element is Tab-navigable via `useFocus()`
- Only the focused component handles keyboard input via `isActive`
- Consistent visual focus indicator: border color + background
- App.tsx handles only global shortcuts, not panel focus
- All modals render as proper overlays with consistent escape handling

**Non-Goals:**
- Mouse support (Ink has none)
- New features
- Theme/color changes
- Changes to daemon or core

## Decisions

### 1. useFocus() inside each component (not passed as prop)

**Decision**: Each focusable component calls `useFocus()` internally to register itself as Tab-focusable. It also accepts an optional `isFocused` override prop for cases where the parent needs to control focus (e.g., when a modal is open, the parent disables focus on background components).

**Why not just pass isFocused as prop like ink-select-input**: That pattern requires the parent to manage focus routing. With `useFocus()`, Ink handles Tab cycling automatically. We use the hybrid: `useFocus()` for Tab registration + optional prop override for parent control.

### 2. useInput with isActive={isFocused}

**Decision**: Every `useInput` call in a component uses `{ isActive: isFocused }`. This ensures only the focused component processes keyboard input.

**Why**: Without this, all mounted `useInput` handlers fire on every keypress. This is the root cause of the "both App.tsx and Navigator fire on the same key" problem.

### 3. App.tsx global useInput (always active)

**Decision**: App.tsx has its own `useInput` that's always active for global shortcuts: Ctrl+C, Escape, and single-key shortcuts (h, e, d, c, p, s, f, r, n, t, /).

**Why**: Some actions should work regardless of which panel is focused. The global handler checks for modal states (confirm, log, help) and bails if a modal is open.

### 4. Visual focus model (ONE pattern)

**Decision**: 
- Focused element: `borderColor={theme.accent.focus}` + `backgroundColor={theme.bg.input}`
- Unfocused element: `borderColor={theme.border.default}` + `backgroundColor={theme.bg.surface}`
- Selected row in list: `backgroundColor={theme.bg.active}` + `color={theme.text.inverse}`

**Why**: The design system already defines this. We just need to actually apply it consistently.

### 5. FocusableList pattern (from ink-select-input study)

**Decision**: `FocusableList` follows the ink-select-input pattern:
- Accepts `items`, `renderItem`, `onSelect`, `onActivate`, `selectedIndex`, `isFocused`, `limit`
- Uses `useInput(handler, { isActive: isFocused })` for up/down/j/k + enter
- Selected item gets `backgroundColor={theme.bg.active}`
- Rotates overflow items (using `to-rotated` pattern) when `limit` is set

**Why**: ink-select-input is battle-tested (1.3M weekly downloads). Following its pattern guarantees correct up/down wrapping, enter selection, and visual feedback.

### 6. Modal as overlay

**Decision**: `Modal` component uses `position="absolute"` (Ink supports this) with `backgroundColor={theme.bg.elevated}`. It renders children + handles escape via `useInput`.

**Why**: Ink supports `position="absolute"` for overlay rendering. This makes modals visually float above the content.

## Risks / Trade-offs

- [useFocus order depends on render order] → Ensured by consistent component ordering in App.tsx render tree
- [Multiple useInput still fire for global + focused] → Global handler checks modal states and bails early. Component handlers use isActive. Both fire but only the relevant one acts.
- [Tab during form editing] → Forms use FocusableInput which calls useFocus() - Tab cycles between form fields naturally
