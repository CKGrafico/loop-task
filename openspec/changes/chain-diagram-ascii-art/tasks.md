## 1. Shared ASCII Renderer

- [x] 1.1 Create `renderChainDiagram()` in `src/features/chain-editor/renderChainDiagram.ts` with cycle detection, missing-task handling, silent chain markers, step/command rendering, and ASCII box borders <!-- agent: frontend-engineer.build, depends_on: [], touches: [src/features/chain-editor/renderChainDiagram.ts] -->
- [x] 1.2 Add unit tests in `tests/renderChainDiagram.test.ts` covering single task, steps, command, cycles, missing tasks, silent marker, box borders, and connectors <!-- agent: frontend-engineer.build, depends_on: [1.1], touches: [tests/renderChainDiagram.test.ts] -->

## 2. TUI Command and Modal

- [x] 2.1 Add `diagramModal: string | null` state to `useAppState` and `AppTypes`, wire into `useOverlayStack` escape handling and modal-open guards <!-- agent: frontend-engineer.build, depends_on: [], touches: [src/features/state/useAppState.ts, src/app/types.ts, src/features/overlays/useOverlayStack.ts] -->
- [x] 2.2 Add "diagram" command to `buildCommands` in loops tab with `taskId` guard <!-- agent: frontend-engineer.build, depends_on: [], touches: [src/features/commands/commands.ts] -->
- [x] 2.3 Add diagram handler in `useCommandHandlers` that calls `renderChainDiagram` and opens the modal <!-- agent: frontend-engineer.build, depends_on: [1.1, 2.1], touches: [src/features/commands/useCommandHandlers.ts] -->
- [x] 2.4 Create `DiagramModal` component with scroll, copy, and escape, following ExportModal pattern <!-- agent: frontend-engineer.build, depends_on: [2.1], touches: [src/features/overlays/DiagramModal.tsx] -->
- [x] 2.5 Wire DiagramModal into OverlayStack and App props <!-- agent: frontend-engineer.build, depends_on: [2.1, 2.4], touches: [src/features/overlays/OverlayStack.tsx, src/app/App.tsx] -->

## 3. CLI Subcommand

- [x] 3.1 Add `diagram <loop-id>` CLI subcommand with loop lookup, no-task message, and stdout printing <!-- agent: frontend-engineer.build, depends_on: [1.1], touches: [src/cli.ts] -->

## 4. i18n and Verification

- [x] 4.1 Add diagram-related i18n keys to `src/shared/i18n/en.json` <!-- agent: frontend-engineer.fast, depends_on: [], touches: [src/shared/i18n/en.json] -->
- [x] 4.2 Add diagramModal awareness to `useGlobalShortcuts` <!-- agent: frontend-engineer.fast, depends_on: [2.1], touches: [src/features/commands/useGlobalShortcuts.ts] -->
- [x] 4.3 Run typecheck, lint, and tests to verify all changes <!-- agent: frontend-engineer.fast, depends_on: [1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 4.1, 4.2], touches: [] -->
