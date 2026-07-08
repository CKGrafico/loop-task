## ADDED Requirements

### Requirement: Core subdirectory structure
The `src/core/` directory SHALL contain the following subdirectories: `loop/`, `command/`, `scheduling/`, `logging/`, `context/`, `foreground/`. Each subdirectory SHALL contain related modules grouped by concern.

#### Scenario: Core directory verification
- **WHEN** listing `src/core/` directory
- **THEN** `loop/`, `command/`, `scheduling/`, `logging/`, `context/`, `foreground/` subdirectories exist

### Requirement: loop-controller.ts split into focused modules
`src/core/loop-controller.ts` (599 lines) SHALL be split into `src/core/loop/controller.ts` (main LoopController class, under 300 lines), `src/core/loop/chain-executor.ts` (chain execution logic), and `src/core/loop/state-manager.ts` (lifecycle state transitions). The public API (exports) SHALL remain identical.

#### Scenario: Loop controller split
- **WHEN** checking `src/core/loop-controller.ts`
- **THEN** the file does not exist at that path
- **AND** `src/core/loop/controller.ts` exists and is under 300 lines
- **AND** `src/core/loop/chain-executor.ts` and `src/core/loop/state-manager.ts` exist

#### Scenario: Public API preserved
- **WHEN** importing `LoopController` from `src/core/loop/`
- **THEN** the same class with the same public methods is available
- **AND** all existing tests pass without logic changes

### Requirement: Command runner in command subdirectory
`command-runner.ts` and `resolve-cwd.ts` SHALL be in `src/core/command/`.

#### Scenario: Command module location
- **WHEN** checking for command runner module
- **THEN** it is located under `src/core/command/`

### Requirement: Scheduling in scheduling subdirectory
`scheduling.ts` SHALL be in `src/core/scheduling/`.

#### Scenario: Scheduling module location
- **WHEN** checking for scheduling module
- **THEN** it is located under `src/core/scheduling/`

### Requirement: Logging in logging subdirectory
`log-rotator.ts` and `log-parser.ts` SHALL be in `src/core/logging/`.

#### Scenario: Logging module location
- **WHEN** checking for logging modules
- **THEN** they are located under `src/core/logging/`

### Requirement: Context parser and template in context subdirectory
`context-parser.ts` and `template.ts` SHALL be in `src/core/context/`.

#### Scenario: Context module location
- **WHEN** checking for context parser and template modules
- **THEN** they are located under `src/core/context/`

### Requirement: Foreground loop in foreground subdirectory
`foreground-loop.ts` SHALL be in `src/core/foreground/`.

#### Scenario: Foreground module location
- **WHEN** checking for foreground loop module
- **THEN** it is located under `src/core/foreground/`
