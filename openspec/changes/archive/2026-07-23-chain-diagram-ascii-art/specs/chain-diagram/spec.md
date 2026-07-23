## ADDED Requirements

### Requirement: Shared ASCII chain diagram renderer
The system SHALL provide a `renderChainDiagram(rootTaskId, tasks)` function that returns a string containing the ASCII art representation of the task chain rooted at the given task.

#### Scenario: Single task with no branches
- **WHEN** `renderChainDiagram` is called with a root task that has no `onSuccessTaskId` or `onFailureTaskId`
- **THEN** the output contains a boxed representation of the task with "onSuccess -> (none)" and "onFailure -> (none)"

#### Scenario: Task with steps
- **WHEN** the root task has a `steps` array with `TaskStep` entries
- **THEN** each step is rendered as "Step N: <command>" inside the box

#### Scenario: Task with command only
- **WHEN** the root task has no steps but has a `command` field
- **THEN** the command is rendered directly inside the box

#### Scenario: Silent chain task
- **WHEN** a task has `silentChain: true`
- **THEN** the task name is followed by a `[s]` marker

#### Scenario: Cyclic chain
- **WHEN** task A chains to task B, and task B chains back to task A
- **THEN** task A appears once, and the revisiting branch shows "(cycle to <TaskName>)" instead of duplicating the box

#### Scenario: Missing task
- **WHEN** the root task ID does not exist in the task list
- **THEN** the output contains a box with the task ID and "(missing task)" annotation

### Requirement: Diagram command in TUI command palette
The system SHALL show a "diagram" command in the loops command palette when the selected loop has a non-null `taskId`.

#### Scenario: Loop with task shows diagram command
- **WHEN** the user is on the loops tab with a loop selected that has a `taskId`
- **THEN** a "diagram" command appears with `category: COMMAND_CATEGORY_LOOP` and `tier: COMMAND_TIER_ACTION`

#### Scenario: Loop without task hides diagram command
- **WHEN** the selected loop's `taskId` is null
- **THEN** no "diagram" command appears

### Requirement: Diagram modal in overlay stack
The system SHALL open a scrollable modal displaying the ASCII chain diagram when the diagram command is executed.

#### Scenario: Opening the diagram modal
- **WHEN** the user executes the "diagram" command
- **THEN** a modal opens in the overlay stack with the ASCII art diagram, scrollable via up/down arrows, closeable via Escape, and supporting copy-to-clipboard

### Requirement: CLI diagram subcommand
The system SHALL provide a `loop-task diagram <loop-id>` CLI subcommand that prints the ASCII chain diagram to stdout.

#### Scenario: Loop with task
- **WHEN** the user runs `loop-task diagram <loop-id>` for a loop with a `taskId`
- **THEN** the ASCII chain diagram is printed to stdout

#### Scenario: Loop without task
- **WHEN** the user runs `loop-task diagram <loop-id>` for a loop with no `taskId`
- **THEN** a message stating the loop has no task chain is printed, exit code 0

#### Scenario: Loop not found
- **WHEN** the user runs `loop-task diagram <loop-id>` for a non-existent loop
- **THEN** an error message is printed, exit code 1
