## Why

App.tsx is an 832-line god component holding 7 distinct responsibilities (37 state variables, 20 command handlers, global keyboard shortcuts, overlay management, form routing, modal rendering, contextual actions). This makes it hard to test features in isolation, add new command handlers without touching the monolith, or understand which state belongs to which feature. Now is the right time because the board layer was recently removed (issue #35), leaving App.tsx as the sole remaining coupling point.

## What Changes

- Extract 20-entry `commandHandlers` record and `handleCommand` into a custom hook `useCommandHandlers(context)` in `src/tui/features/commands/useCommandHandlers.ts`
- Extract global `useInput` block (Ctrl+Enter, Ctrl+chords, Tab/1/2/3, Escape) into `useGlobalShortcuts(context)` in `src/tui/features/shortcuts/useGlobalShortcuts.ts`
- Extract `popLayer()` and modal-open state into `useOverlayStack()` in `src/tui/features/overlays/useOverlayStack.ts`
- Extract form view routing (create, task-create, task-edit, project-create, project-edit) into a `FormRouter` component in `src/tui/features/forms/FormRouter.tsx`
- Reduce App.tsx to ~150-line composition root: wire hooks, render layout tree
- Introduce FSD directory scaffold (`features/`, `entities/`, `widgets/`, `shared/`, `app/`) under `src/tui/`

## Capabilities

### New Capabilities
- `command-handlers-hook`: Custom hook encapsulating command dispatch (20 handlers + handleCommand)
- `global-shortcuts-hook`: Custom hook encapsulating all keyboard shortcut logic (Ctrl+Enter, chords, navigation)
- `overlay-stack-hook`: Custom hook managing modal/overlay layer stack (open/close/pop/peek)
- `form-router`: Component that renders the correct form view based on current view state

### Modified Capabilities
- `ink-navigation`: Refactored to delegate keyboard handling to `useGlobalShortcuts` hook instead of inline `useInput` in App.tsx

## Non-goals

- Does not move existing components (LeftPanel, RightPanel, Header, CommandInput, etc.) into `widgets/` — they stay in `components/` for this change
- Does not refactor state management into Zustand/Jotai — state remains in React hooks, just composed differently
- Does not change any user-facing behavior — purely structural refactor
- Does not extract entity data hooks (loops/tasks/projects) into `entities/` — future work
- Does not affect the IPC contract (`src/types.ts`) or persisted state shape

## Impact

- `src/tui/App.tsx`: Reduced from 832 lines to ~150 lines
- New files: 4 feature modules under `src/tui/features/`
- `src/tui/types.ts`: May need a shared context type for hook communication
- No changes to IPC contract, persisted state, or cross-platform behavior
- Existing tests: any test importing App.tsx should still pass unchanged
