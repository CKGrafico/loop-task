# Tasks: chain-diagram-ascii-art

## 1.1 ASCII chain diagram renderer
<!-- agent: frontend-engineer.build -->
<!-- depends_on: none -->
<!-- touches: src/features/chain-editor/renderChainDiagram.ts -->
- [x] Implement `renderChainDiagram(rootTaskId, tasks)` with cycle detection, missing task handling, silent markers
- [x] Export from chain-editor module
- [x] Unit tests (9 scenarios: single task, steps, command, silent, on-success, cycles, missing, box borders, arrows)

## 1.2 DiagramModal component
<!-- agent: frontend-engineer.build -->
<!-- depends_on: 1.1 -->
<!-- touches: src/features/overlays/DiagramModal.tsx -->
- [x] Scrollable modal following ExportModal pattern (up/down scroll, c to copy, Esc to close)
- [x] VISIBLE_LINES = 20 with scroll offset
- [x] i18n keys for title, hints

## 1.3 TUI command and overlay wiring
<!-- agent: frontend-engineer.build -->
<!-- depends_on: 1.2 -->
<!-- touches: src/features/commands/commands.ts, src/features/commands/useCommandHandlers.ts, src/features/overlays/OverlayStack.tsx, src/app/types.ts -->
- [x] "diagram" command in buildCommands when selectedLoop.taskId is non-null
- [x] diagram handler in useCommandHandlers calling renderChainDiagram + setDiagramModal
- [x] diagramModal/onDiagramModalClose in OverlayStackProps, OverlayContext, CommandHandlerContext, ShortcutContext
- [x] OverlayStack renders DiagramModal when diagramModal is set

## 1.4 CLI diagram subcommand
<!-- agent: frontend-engineer.build -->
<!-- depends_on: 1.1 -->
<!-- touches: src/cli.ts -->
- [x] `loop-task diagram <id>` subcommand
- [x] Resolves loop and tasks via sendRequest
- [x] No-task case: message + exit 0
- [x] Loop-not-found case: error + exit 1
- [x] Missing task: shares renderChainDiagram's (missing task) output

## 1.5 i18n keys
<!-- agent: frontend-engineer.fast -->
<!-- depends_on: none -->
<!-- touches: src/shared/i18n/en.json -->
- [x] cmd.diagram, diagram.modalTitle, diagram.hint, diagram.noTaskChain, diagram.loopNotFound, diagram.noTaskLinked
