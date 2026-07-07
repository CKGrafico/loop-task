## 1. Type Definitions

- [ ] 1.1 Add CommandHandlerContext type to src/tui/types.ts — object with all state, setters, services, and callbacks needed by useCommandHandlers
- [ ] 1.2 Add ShortcutContext type to src/tui/types.ts — object with activeTab, focusedPanel, view, handleCommand, triggerContextualAction, popLayer, confirmState, searchState, logModalRun, commandsBrowserOpen, exportModal, anyModalOpen, inputOwner, debugMode, debugEntries, and commandBar state
- [ ] 1.3 Add ActionContext type to src/tui/types.ts — object with activeTab, focusedPanel, selected entities, push, tasks, setCloneMode, setEditTarget, setPendingTaskSelection, handleCommand, handleOpenRunLog, isBoardView checker
- [ ] 1.4 Add OverlayContext type to src/tui/types.ts — object with all modal open states, close setters, confirmState, searchState, view, pop, onQuit, exit, setConfirmState, setSearchValue
- [ ] 1.5 Add FormRouterProps type to src/tui/types.ts
- [ ] 1.6 Add OverlayStackProps type to src/tui/types.ts

## 2. Extract Command Handlers

- [ ] 2.1 Create src/tui/features/commands/ directory
- [ ] 2.2 Create useCommandHandlers.ts with useCommandHandlers(context: CommandHandlerContext) returning { handlers, handleCommand }

## 3. Extract Contextual Actions

- [ ] 3.1 Create src/tui/features/actions/ directory
- [ ] 3.2 Create useContextualActions.ts with useContextualActions(context: ActionContext) returning { handleContextualCopy, triggerContextualAction }

## 4. Extract Overlay Management

- [ ] 4.1 Create src/tui/features/overlays/ directory
- [ ] 4.2 Create useOverlayStack.ts with useOverlayStack(context: OverlayContext) returning { popLayer, anyModalOpen, commandInputDisabled, inputOwner }
- [ ] 4.3 Create OverlayStack.tsx component rendering all modals and ToastStack

## 5. Extract Global Shortcuts

- [ ] 5.1 Create src/tui/features/shortcuts/ directory
- [ ] 5.2 Create useGlobalShortcuts.ts with useGlobalShortcuts(context: ShortcutContext) — self-registers useInput, manages chordState internally

## 6. Extract Form Routing

- [ ] 6.1 Create src/tui/features/forms/ directory
- [ ] 6.2 Create FormRouter.tsx component with view-based conditional rendering

## 7. Rewrite App.tsx as Composition Root

- [ ] 7.1 Replace App.tsx with composition root that calls extracted hooks and renders FormRouter/OverlayStack/Layout
- [ ] 7.2 Move createInitialValues helper into features/forms/ or keep as module-level utility in App.tsx

## 8. Verify

- [ ] 8.1 rtk npx tsc --noEmit passes with zero errors
- [ ] 8.2 pnpm test passes with no regressions
- [ ] 8.3 No file in src/tui/ exceeds 300 lines
- [ ] 8.4 App.tsx is under 200 lines
