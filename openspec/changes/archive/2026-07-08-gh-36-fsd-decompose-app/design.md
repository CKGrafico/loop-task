## Context

App.tsx (832 lines) is the sole composition point for the TUI layer. It holds 37 state variables, 20 command handlers, global keyboard input handling, overlay/modal management, form view routing, modal rendering, and contextual action dispatch. This god component makes isolated testing impossible and forces every new feature to touch the same file.

Current file structure is flat: all components in `src/tui/components/`, hooks in `src/tui/hooks/`, utils in `src/tui/utils/`. There is no feature-level grouping.

## Goals / Non-Goals

**Goals:**
- Reduce App.tsx to under 200 lines as a pure composition root
- Extract each major responsibility into its own hook or component
- Introduce FSD feature directory scaffold under `src/tui/features/`
- Maintain exact keyboard/command behavior, zero user-facing regression
- Keep all extracted files under 300 lines

**Non-Goals:**
- Moving existing components into `widgets/` or `entities/` layers
- Replacing React state with external state management (Zustand, Jotai)
- Refactoring individual components (LeftPanel, RightPanel, etc.)
- Changing IPC contract or persisted data shapes
- Adding new tests beyond ensuring existing tests still pass

## Decisions

### D1: Hook-based extraction (not Context/Provider)

Each extracted responsibility becomes a custom hook that receives its dependencies as a typed context object, not via React Context. Rationale: avoids provider nesting, keeps props explicit, and lets App.tsx remain a thin wiring layer. If Context is needed in the future, it can be added without changing hook signatures.

### D2: Shared AppContext type

All extracted hooks receive a common `AppContext` type (defined in `src/tui/types.ts`) that contains the state and setters they need. This avoids each hook depending on individual props and keeps the contract explicit. The context is a plain object, not a React Context, so it's just a type-level grouping.

### D3: Feature directory structure

```
src/tui/features/
├── commands/
│   └── useCommandHandlers.ts    ← ~120 lines
├── shortcuts/
│   └── useGlobalShortcuts.ts    ← ~160 lines
├── overlays/
│   └── useOverlayStack.ts       ← ~80 lines
└── forms/
    └── FormRouter.tsx           ← ~90 lines
```

No `entities/`, `widgets/`, `shared/`, or `app/` scaffolding yet, those remain in existing `components/`, `hooks/`, `utils/` locations. The issue's full FSD tree is a future target; this change only carves out `features/`.

### D4: Overlay stack as a simple object

The overlay stack uses a `popLayer()` function with ordered if/elif checks (matching current behavior), not a generic stack data structure. The current escape-key behavior is inherently priority-based (confirm → search → log modal → commands → export → context help → view → quit), and modeling it as a priority list is simpler and more readable than a stack with push/pop.

### D5: FormRouter as a component, not a hook

Form routing maps a `view` string to a React component tree. This is inherently a render concern, so it becomes a `<FormRouter>` component rather than a hook. It receives view state and callbacks as props.

### D6: Command handlers return both handlers map and handleCommand

`useCommandHandlers` returns `{ handlers, handleCommand }` so that `CommandInput` can iterate `handlers` for the command palette UI, and `handleCommand` can dispatch by name. This matches the current `commandHandlers` + `handleCommand(name)` pattern exactly.

## Risks / Trade-offs

- **[Stale closures]**: Hooks receiving context objects must use refs or stable references to avoid stale closure bugs. Mitigation: pass the context object through a ref that's updated each render, or use `useMemo` on setter callbacks (React guarantees `setState` is stable).
- **[Type coupling]**: A shared `AppContext` type creates coupling between all feature hooks. Mitigation: make the context type narrow, only include what each hook actually needs. Use separate parameter types if needed.
- **[No behavior change]**: Any subtle difference in keyboard handling would be hard to catch. Mitigation: existing tests must pass unchanged; manual verification of Ctrl+Enter, Ctrl+chords, Tab, Escape.
