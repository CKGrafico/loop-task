# Chain Diagram Command: Visualize Task Chains as ASCII Art

## Summary

A chain diagram command that renders a task's success/failure branching as ASCII art, accessible from both the TUI loops page and the CLI.

## Motivation

Loop operators need to visualize task chain branching at a glance. Currently they must trace code or mentally follow onSuccess/onFailure links. An ASCII art diagram provides immediate visual comprehension of chain structure, cycle detection, and branching logic.

## Functional Scope

- **TUI diagram command** in the loops command palette (visible only when selected loop has a taskId)
- **DiagramModal** in the overlay stack (scrollable, Escape to close, copy support)
- **CLI `diagram <loop-id>` subcommand** that prints ASCII chain diagram to stdout
- **Shared `renderChainDiagram` renderer** with cycle detection, missing task handling, and silent chain markers

## Out of Scope

- Editing chains from the diagram
- Graphical/visual diagram (only ASCII)
- Exporting diagram to file
- Chain execution or simulation

## Acceptance Criteria

1. Given a loop with taskId selected on loops tab, a "diagram" command appears in the command palette
2. Given a loop without taskId, no diagram command appears
3. Executing the diagram command opens a scrollable modal showing ASCII chain diagram
4. Cyclic chains show "(cycle to X)" notation without infinite loops
5. CLI `diagram <loop-id>` with valid loop prints diagram to stdout
6. CLI `diagram <loop-id>` with no-task loop prints message and exits 0
7. CLI `diagram <loop-id>` with missing loop prints error and exits 1
8. Missing tasks show "(missing task)" annotation
9. Silent chain tasks marked with `[s]`

## Implementation Plan

Already implemented on main branch. This change documents the existing implementation.
