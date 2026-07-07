## Context

App.tsx (838 lines) holds 7 responsibilities in a single React component: state declarations, command handlers, contextual actions, overlay management, keyboard shortcuts, form routing, and modal rendering. The codebase already has structural decomposition (presentational components, utility hooks, command definitions, router), but no feature-based decomposition. This change applies Feature-Sliced Design to extract each responsibility into isolated modules under `src/tui/features/`.

## Goals / Non-Goals

**Goals:**
- Reduce App.tsx to under 200 lines (composition root only)
- Each extracted module is independently testable with narrow contracts
- No behavioral changes — all shortcuts, commands, dismiss priority preserved identically
- No file in `src/tui/` exceeds 300 lines
- Zero regressions in `tsc --noEmit` and `pnpm test`

**Non-Goals:**
- Renaming `components/` to `widgets/`
- Extracting entity state slices into `entities/`
- Refactoring CommandInput.tsx (528 lines — separate issue)
- Adding new features or changing behavior
- Writing unit tests for extracted hooks (separate issue)

## Decisions

1. **Context objects over individual props**: Each hook receives a typed context object (e.g., `CommandContext`, `ShortcutContext`) instead of 20+ individual parameters. This keeps hook signatures manageable and allows App.tsx to spread state into context objects.

2. **Custom hooks for logic, components for rendering**: Command handlers, shortcuts, contextual actions, and overlay management are custom hooks. Form routing and modal rendering are components. This separates behavior from presentation.

3. **Chord state lives in useGlobalShortcuts**: The `chordState` and `commandBarHasText` state variables are internal to the shortcuts hook — they're not shared with App.tsx. The hook needs `commandBarHasText`/`commandBarDropdownOpen` as inputs for determining input ownership.

4. **OverlayStack receives modal open/setter pairs**: Rather than centralizing all modal state in the overlay hook, `useOverlayStack` receives the open state booleans and close setters, then computes derived values (`anyModalOpen`, `inputOwner`, `popLayer`).

5. **FormRouter is a thin component**: No state — just view-based conditional rendering with passed callbacks. Board layout (LeftPanel + RightPanel + DebugPanel) stays in App.tsx as the default branch since it's the composition root's primary concern.

6. **Incremental extraction order**: Commands → Contextual Actions → Overlay Management → Shortcuts → Form Routing → Modal Rendering. This minimizes cross-dependencies since shortcuts depend on commands and overlay management, but not vice versa.

7. **Type definitions stay in `src/tui/types.ts`**: New context types (e.g., `CommandHandlerContext`) are added to the shared types file, not co-located with hooks. This maintains the existing convention where types.ts is the single source of truth for TUI type definitions.

## Risks / Trade-offs

- **Stale closures in context objects** → Mitigate by using `useMemo` with correct dependency arrays, and ensure setters (which are stable) are used instead of state values where possible.
- **Hook call order sensitivity** → React requires hooks called unconditionally at the top level. All extracted hooks must be called in App.tsx regardless of view state. Mitigate by designing hooks to be inert when not applicable (e.g., `useGlobalShortcuts` checks `isActive`).
- **Circular dependency risk** → Features importing from each other creates cycles. Mitigate by making all feature hooks receive their dependencies via context parameters, never importing from sibling features.
- **Increased indirection** → More files means more jumping around for developers. Mitigate by keeping directory structure flat within `features/` and naming files after their single responsibility.
