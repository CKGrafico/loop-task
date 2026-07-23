# Chain Diagram Command: Visualize Task Chains as ASCII Art

## Change ID
chain-diagram-ascii-art

## Summary
A chain diagram command that renders a task's success/failure branching as ASCII art, accessible from both the TUI loops page and the CLI.

## Motivation
Loop operators need a quick way to visualize the task chain rooted at a loop's task, understanding which tasks run on success vs. failure, how steps are structured, and when chains cycle back. The codebase has chain tree construction logic and scrollable modal patterns already — this feature wires them together with a shared ASCII art renderer.

## Acceptance Criteria
1. "diagram" command appears in loops command palette when a loop with a task is selected
2. "diagram" command is absent when the selected loop has no task
3. Running the diagram command in TUI opens a scrollable modal showing the ASCII chain diagram
4. Diagram renders each task as a box: name, steps/command, branch annotations, [s] for silent
5. Diagram handles cyclic chains with "(cycle)" notation, no infinite loops
6. CLI `loop-task diagram <loop-id>` prints ASCII diagram to stdout
7. CLI handles loop with no task (message + exit 0)
8. CLI handles loop not found (error + exit 1)
9. Missing task shows "(missing task)" annotation
10. TUI modal supports vertical scrolling and copy

## Affected Files
- `src/features/chain-editor/renderChainDiagram.ts` — ASCII art renderer
- `src/features/overlays/DiagramModal.tsx` — scrollable diagram modal
- `src/features/commands/commands.ts` — diagram command registration
- `src/features/commands/useCommandHandlers.ts` — diagram handler
- `src/features/overlays/OverlayStack.tsx` — modal integration
- `src/app/types.ts` — diagramModal state types
- `src/cli.ts` — CLI diagram subcommand
- `src/shared/i18n/en.json` — i18n keys
