## ADDED Requirements

### Requirement: CLI runs without Bun installed
The system SHALL allow users to execute the CLI from a standard Node/npm environment without requiring Bun to be installed on the target machine.

#### Scenario: Global npm install
- **WHEN** a user installs the package globally with npm
- **THEN** the `loop-task` executable starts successfully under Node without invoking Bun

#### Scenario: NPX execution
- **WHEN** a user runs `npx loop-task`
- **THEN** the CLI starts successfully under Node without requiring Bun on the machine

### Requirement: Existing loop runtime behavior is preserved
The system SHALL preserve existing CLI modes (`board`, `start`, `run`), daemon IPC behavior, and persisted loop metadata when running under Node.

#### Scenario: Start daemon-backed loop under Node
- **WHEN** a user starts a background loop from the Node runtime
- **THEN** the loop is created, persisted, and managed with the same IPC and state behavior as before the migration

#### Scenario: Resume persisted loops under Node
- **WHEN** the daemon starts under Node with existing loop state on disk
- **THEN** previously persisted non-stopped loops are restored without requiring data migration

### Requirement: OpenTUI board remains functional under Node
The system SHALL preserve the existing OpenTUI board flow under the Node runtime.

#### Scenario: Launch board from default command
- **WHEN** a user runs `loop-task` with no subcommand under Node
- **THEN** the OpenTUI dashboard renders and supports loop listing, selection, and actions

#### Scenario: Board actions still work
- **WHEN** a user pauses, resumes, triggers, edits, or deletes a loop from the board under Node
- **THEN** the action succeeds and the board updates consistently with pre-migration behavior
