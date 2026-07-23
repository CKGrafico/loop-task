# Spec: ASCII Chain Diagram Renderer

## Core rendering function
`renderChainDiagram(rootTaskId: string, tasks: TaskDefinition[]): string`

- Builds task map from flat list
- Walks chain from root via onSuccessTaskId/onFailureTaskId
- Tracks visited set to prevent infinite loops on cycles
- Each task rendered as bordered box with:
  - Name + `[s]` if silentChain
  - Steps (numbered) or inline command
  - `onSuccess -> <target>` and `onFailure -> <target>` labels
  - Targets resolved: present task shows name, cycle shows `(cycle)`, missing shows `(missing task)`
- Boxes connected with `|` and `v` arrows
- Missing root task renders single box with ID + "(missing task)"

## TUI integration
- DiagramModal follows ExportModal pattern: scroll (up/down), copy (c), close (Esc)
- VISIBLE_LINES = 20 with scroll offset tracking
- diagramModal state as `string | null` in OverlayContext/CommandHandlerContext

## CLI integration
- `loop-task diagram <id>` subcommand
- Resolves loop via sendRequest({ type: "status" })
- Resolves tasks via sendRequest({ type: "task-list" })
- Prints diagram to stdout
- No task: prints message, exit 0
- Loop not found: error, exit 1
