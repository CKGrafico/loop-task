## Why

App.tsx is an 838-line god component holding 7 distinct responsibilities (38 state variables, 20+ command handlers, contextual actions, overlay management, keyboard shortcuts, form routing, modal rendering). This makes the component untestable, hard to extend, and a merge-conflict hotspot. Feature-Sliced Design decomposition extracts each responsibility into an isolated, testable module.

## What Changes

- Extract command handlers → `src/tui/features/commands/useCommandHandlers.ts` custom hook
- Extract keyboard shortcuts → `src/tui/features/shortcuts/useGlobalShortcuts.ts` custom hook
- Extract contextual actions → `src/tui/features/actions/useContextualActions.ts` custom hook
- Extract overlay management → `src/tui/features/overlays/useOverlayStack.ts` custom hook
- Extract form routing → `src/tui/features/forms/FormRouter.tsx` component
- Extract modal rendering → `src/tui/features/overlays/OverlayStack.tsx` component
- Reduce App.tsx to ~150-line composition root

## Capabilities

### New Capabilities
- `command-handlers`: Command handler implementations extracted from App.tsx into useCommandHandlers hook
- `global-shortcuts`: Keyboard shortcut system (Ctrl+chords, Tab, navigation, Escape) extracted into useGlobalShortcuts hook
- `contextual-actions`: Contextual copy and Ctrl+Enter action dispatch extracted into useContextualActions hook
- `overlay-stack`: Overlay dismiss priority and modal rendering extracted into useOverlayStack hook and OverlayStack component
- `form-router`: View-based form rendering extracted into FormRouter component

### Modified Capabilities

## Impact

- `src/tui/App.tsx`: Reduced from 838 to ~150 lines (composition root only)
- New directory `src/tui/features/` with 6 new files
- No changes to IPC contract (`src/types.ts`), persisted state, or cross-platform behavior
- No behavioral changes — all shortcuts, commands, and dismiss priority preserved
- `src/tui/types.ts`: May need additional context types for hook parameters
