# Tasks

- [x] T1: Create shared `renderChainDiagram` ASCII renderer
  - File: `src/features/chain-editor/renderChainDiagram.ts`
  - Handles: cycle detection, missing tasks, silent chains, box rendering, connector arrows

- [x] T2: Create `DiagramModal` overlay component
  - File: `src/features/overlays/DiagramModal.tsx`
  - Pattern: follows `ExportModal` (scrollable, Escape close, copy)

- [x] T3: Add `diagram` command to TUI command palette
  - File: `src/features/commands/commands.ts`
  - Only visible when `loop.taskId` is non-null

- [x] T4: Add diagram command handler
  - File: `src/features/commands/useCommandHandlers.ts`
  - Calls `renderChainDiagram` and opens `DiagramModal`

- [x] T5: Wire DiagramModal into OverlayStack
  - Files: `src/features/overlays/OverlayStack.tsx`, `src/app/types.ts`
  - Added `diagramModal` state to `OverlayStackProps`, `OverlayContext`, `ShortcutContext`

- [x] T6: Add CLI `diagram` subcommand
  - File: `src/cli.ts`
  - Error handling: missing loop (exit 1), no task (exit 0), catch-all (exit 1)

- [x] T7: Add i18n keys
  - File: `src/shared/i18n/en.json`
  - Keys: `cmd.diagram`, `diagram.modalTitle`, `diagram.hint`, `diagram.noTaskChain`, `diagram.loopNotFound`, `diagram.noTaskLinked`

- [x] T8: Add unit tests for renderChainDiagram
  - File: `tests/renderChainDiagram.test.ts`
  - 9 tests covering: single task, steps, command, silent marker, chains, cycles, missing tasks, box borders, connectors
