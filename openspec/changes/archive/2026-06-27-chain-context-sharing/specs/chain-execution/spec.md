## ADDED Requirements

### Requirement: Chain execution with context-aware tasks

The chain execution loop SHALL maintain a chain context object that is written to by each task's captured stdout and read from during template interpolation of subsequent chain task commands. The primary task SHALL write to the context first, then each chain task SHALL read from (interpolation) and write to (stdout capture) the context in sequence.

#### Scenario: Primary task output feeds first chain task

- **WHEN** the primary task outputs `{"issue_number": 42}` and the first chain task's command arg contains `{{issue_number}}`
- **THEN** the chain task's argument is replaced with `"42"` before execution

#### Scenario: Chain task output feeds next chain task

- **WHEN** the first chain task outputs `{"refined": "user story"}` and the second chain task's command contains `{{refined}}`
- **THEN** the second chain task's command is interpolated with `"user story"` for the `{{refined}}` key

#### Scenario: Context accumulates across the full chain

- **WHEN** task 1 outputs `{"a": 1}`, task 2 outputs `{"b": 2}`, and task 3's command contains both `{{a}}` and `{{b}}`
- **THEN** task 3's command is interpolated with `"1"` for `{{a}}` and `"2"` for `{{b}}`

#### Scenario: Interpolation only applies to chain tasks

- **WHEN** the primary task's command contains `{{key}}` patterns
- **THEN** those patterns are NOT interpolated (the primary task runs with its literal command, since context is empty at that point)

### Requirement: Branch decision unchanged by context

The chain branching logic (exit code 0 follows `onSuccessTaskId`, non-zero follows `onFailureTaskId`) SHALL NOT be affected by the context object. The context is a data-passing mechanism only and does not influence control flow.

#### Scenario: Context does not affect branching

- **WHEN** a chain task outputs `{"next": "task-xyz"}` but its `onSuccessTaskId` is `"task-abc"`
- **THEN** the chain follows `onSuccessTaskId` (`"task-abc"`), not the context value
