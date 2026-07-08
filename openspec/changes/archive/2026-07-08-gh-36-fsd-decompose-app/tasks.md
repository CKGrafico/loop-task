## 1. Shared Types & Directory Scaffold

- [ ] 1.1 Create `src/tui/features/` directory structure (commands/, shortcuts/, overlays/, forms/)
- [ ] 1.2 Add shared `AppContext` type to `src/tui/types.ts` — a typed object aggregating state and setters consumed by feature hooks

## 2. Extract Overlay Stack Hook

- [ ] 2.1 Create `src/tui/features/overlays/useOverlayStack.ts` — extract popLayer() logic and modal open/close state management into `useOverlayStack(context)` hook
- [ ] 2.2 Verify overlay hook compiles with `rtk npx tsc --noEmit`

## 3. Extract Command Handlers Hook

- [ ] 3.1 Create `src/tui/features/commands/useCommandHandlers.ts` — extract 20-entry `commandHandlers` record and `handleCommand` into `useCommandHandlers(context)` hook returning `{ handlers, handleCommand }`
- [ ] 3.2 Verify command handlers hook compiles with `rtk npx tsc --noEmit`

## 4. Extract Global Shortcuts Hook

- [ ] 4.1 Create `src/tui/features/shortcuts/useGlobalShortcuts.ts` — extract `useInput` block (Ctrl+Enter, Ctrl+chords, Tab/1/2/3, Escape → popLayer) into `useGlobalShortcuts(context)` hook
- [ ] 4.2 Verify shortcuts hook compiles with `rtk npx tsc --noEmit`

## 5. Extract Form Router Component

- [ ] 5.1 Create `src/tui/features/forms/FormRouter.tsx` — extract view-based form rendering (create, task-create, task-edit, project-create, project-edit) into a `<FormRouter>` component
- [ ] 5.2 Verify form router compiles with `rtk npx tsc --noEmit`

## 6. Rewrite App.tsx as Composition Root

- [ ] 6.1 Refactor `src/tui/App.tsx` to use extracted hooks and components — reduce to under 200 lines with only state declarations, hook wiring, and layout rendering
- [ ] 6.2 Verify `rtk npx tsc --noEmit` passes
- [ ] 6.3 Verify `rtk pnpm lint` passes
- [ ] 6.4 Verify `rtk pnpm test` passes
- [ ] 6.5 Verify App.tsx is under 200 lines and no extracted file exceeds 300 lines
