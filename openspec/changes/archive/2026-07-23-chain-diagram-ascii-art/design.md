## Context

The codebase has chain tree construction logic in `buildChains()` / `flattenTree()` (`src/features/chain-editor/ChainEditor.tsx`). The TUI has an overlay stack with modals like `ExportModal`. The CLI uses Commander subcommands that talk to the daemon via `sendRequest`. This feature wires those pieces together with a shared ASCII art renderer.

## Goals / Non-Goals

**Goals:**
- Provide a shared `renderChainDiagram()` function that produces ASCII art from a task chain
- Enable the "diagram" command in the TUI loops command palette when the selected loop has a task
- Open a scrollable modal in the overlay stack when the command is executed
- Add a `diagram <loop-id>` CLI subcommand that prints the diagram to stdout
- Handle cycles, missing tasks, and loops without tasks gracefully

**Non-Goals:**
- Visual/graphical chain editor changes
- Exporting diagrams as files (only copy-to-clipboard)
- Modifying the daemon IPC contract

## Decisions

1. **Extract renderer as standalone function in chain-editor feature**: `renderChainDiagram()` placed in `src/features/chain-editor/renderChainDiagram.ts` — co-located with existing chain logic, importable by both TUI handler and CLI subcommand.
2. **Follow ExportModal pattern for DiagramModal**: Scrollable text modal with up/down navigation, copy-to-clipboard on `c`, close on Escape. Minimal new code, consistent UX.
3. **diagramModal state as `string | null`**: Simpler than ExportModal's object state — the diagram is a single string. Stored in `useAppState` alongside `exportModal`.
4. **CLI uses dynamic import for renderChainDiagram**: Same pattern as other CLI subcommands — avoids loading the entire TUI code path at CLI startup.
5. **Cycle detection via visited set**: Same approach as `buildChains()` — traverse depth-first, track visited task IDs, show "(cycle to TaskName)" when a revisit would occur.

## Risks / Trade-offs

- Very wide task names or long command strings may exceed terminal width — but ASCII boxes wrap naturally and the TUI modal uses `wrap="truncate"`. Terminal scrollback handles width overflow in CLI mode.
- The visited set is shared across the entire rendering call, so a task appearing in both success and failure paths of different parents will only be rendered once (subsequent references show cycle notation) — this matches the issue's acceptance criteria.
