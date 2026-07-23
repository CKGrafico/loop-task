## Why

Loop operators cannot quickly understand a task chain's branching structure. Currently the chain editor shows a visual tree, but there is no way to see a compact ASCII representation of which tasks run on success vs failure, how steps within each task are structured, and when chains cycle back to a previously visited task. An ASCII diagram accessible from both the TUI and CLI fills this gap.

## What Changes

- Add a shared `renderChainDiagram()` function that takes a root task ID and a task list, and returns an ASCII art diagram of the chain tree
- Add a "diagram" command to the loops command palette (only when the selected loop has a `taskId`)
- Add a `DiagramModal` component in the overlay stack, following the `ExportModal` pattern with scrollable text and copy support
- Add a `diagram <loop-id>` CLI subcommand that prints the ASCII chain diagram to stdout
- Handle edge cases: cycles show "(cycle to TaskName)", missing tasks show "(missing task)", loops without tasks show a message

## Capabilities

### New Capabilities
- `chain-diagram`: ASCII art chain diagram renderer producing boxed task representations with branch annotations, cycle detection, and missing-task handling

### Modified Capabilities

## Impact

- New file: `src/features/chain-editor/renderChainDiagram.ts` — shared renderer
- New file: `src/features/overlays/DiagramModal.tsx` — TUI modal
- Modified: `src/features/commands/commands.ts` — diagram command registration
- Modified: `src/features/commands/useCommandHandlers.ts` — diagram command handler
- Modified: `src/features/overlays/OverlayStack.tsx` — add DiagramModal to overlay stack
- Modified: `src/features/overlays/useOverlayStack.ts` — diagramModal state and escape handling
- Modified: `src/app/types.ts` — diagramModal in overlay props
- Modified: `src/features/state/useAppState.ts` — diagramModal state
- Modified: `src/features/commands/useGlobalShortcuts.ts` — diagramModal awareness
- Modified: `src/app/App.tsx` — pass diagramModal props
- Modified: `src/cli.ts` — new `diagram` CLI subcommand
- Modified: `src/shared/i18n/en.json` — diagram-related i18n keys
- No IPC contract changes; no persisted state shape changes
