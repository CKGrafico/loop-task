# Change: chain-diagram-ascii

## Summary

A chain diagram command that renders a task's success/failure branching as ASCII art, accessible from both the TUI loops page and the CLI.

## Motivation

Loop operators need to understand task chain structures at a glance. Current chain visualization requires opening the chain editor and reading a tree view. A dedicated "diagram" command provides a focused, copy-pasteable ASCII art rendering of the entire chain rooted at a loop's task.

## Design

### Shared ASCII renderer

Extract chain tree construction logic from `ChainEditor.tsx` into a standalone renderer module (`src/features/chain-editor/renderChainDiagram.ts`). The renderer:

- Takes a root `TaskDefinition` and a `TaskDefinition[]` lookup
- Builds a chain tree (reusing the `visited`-set cycle detection pattern)
- Renders each task as an ASCII box with:
  - Task name (and silent `[s]` marker)
  - Command or steps
  - `onSuccess` and `onFailure` branch annotations
- Handles cycles by showing `(cycle to TaskName)` instead of re-rendering
- Handles missing tasks by showing `(missing task)`
- Returns a string (suitable for both CLI stdout and TUI modal)

### TUI command

- Add `diagram` command to `buildCommands()` in loops tab, conditional on `selectedLoop.taskId !== null`
- Category: `COMMAND_CATEGORY_LOOP`, tier: `COMMAND_TIER_ACTION`
- Handler opens a new `DiagramModal` in the `OverlayStack`

### TUI modal

- `DiagramModal` follows `ExportModal` pattern: scrollable text, Escape to close
- Receives diagram text as a prop
- Supports up/down scrolling, copy to clipboard

### CLI subcommand

- `loop-task diagram <loop-id>` resolves loop via `sendRequest({ type: "status" })`
- Fetches task list via `sendRequest({ type: "task-list" })`
- Prints ASCII chain diagram to stdout
- Handles: loop not found (exit 1), no task (message + exit 0), missing task (shows in diagram)

## Acceptance Criteria

1. "diagram" command appears in loops command palette when selected loop has a taskId
2. "diagram" command absent when selected loop has no taskId
3. Running diagram command in TUI opens modal showing ASCII chain diagram
4. Diagram renders task boxes with name, command/steps, branch labels, silent [s] marker
5. Cyclic chains show "(cycle to TaskName)" notation
6. CLI `diagram <loop-id>` prints ASCII chain to stdout
7. CLI handles loop not found (exit 1) and no-task (exit 0 with message)
8. Missing task shows "(missing task)" annotation in root box

## Risks

- Deep chains may produce wide/long output — mitigated by scrollable modal (TUI) and terminal scrollback (CLI)
- `buildChains` logic uses shared `visited` set across multiple trees — for single-root diagram, need independent visited tracking
