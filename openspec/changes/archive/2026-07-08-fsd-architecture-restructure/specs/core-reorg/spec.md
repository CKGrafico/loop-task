## ADDED Requirements

### Requirement: Core subdirectories created
`src/core/` SHALL contain subdirectories: `loop/`, `command/`, `scheduling/`, `logging/`, `context/`, `foreground/`. Each subdirectory SHALL contain files related to its concern.

#### Scenario: Loop directory
- **WHEN** listing `src/core/loop/` contents
- **THEN** loop controller modules exist (no single file exceeds 300 lines)

#### Scenario: Command directory
- **WHEN** listing `src/core/command/` contents
- **THEN** command-runner file exists

### Requirement: loop-controller.ts split
The `loop-controller.ts` file (599 lines) SHALL be split into modules under `src/core/loop/`. No single module SHALL exceed 300 lines. The split SHALL separate orchestration, chain execution, and state management.

#### Scenario: No oversized loop files
- **WHEN** counting lines in any file under `src/core/loop/`
- **THEN** line count is ≤ 300

#### Scenario: Loop controller functional
- **WHEN** running existing loop-related tests
- **THEN** all tests pass

### Requirement: Command runner in dedicated directory
`command-runner.ts` SHALL reside in `src/core/command/`.

#### Scenario: Command directory
- **WHEN** listing `src/core/command/` contents
- **THEN** command-runner file exists

### Requirement: Context and template in dedicated directory
`context-parser.ts` and `template.ts` SHALL reside in `src/core/context/`.

#### Scenario: Context directory
- **WHEN** listing `src/core/context/` contents
- **THEN** context-parser and template files exist

### Requirement: Scheduling in dedicated directory
`scheduling.ts` SHALL reside in `src/core/scheduling/`.

#### Scenario: Scheduling directory
- **WHEN** listing `src/core/scheduling/` contents
- **THEN** scheduling file exists

### Requirement: Logging in dedicated directory
`log-rotator.ts` and `log-parser.ts` SHALL reside in `src/core/logging/`.

#### Scenario: Logging directory
- **WHEN** listing `src/core/logging/` contents
- **THEN** log-rotator and log-parser files exist

### Requirement: Foreground loop in dedicated directory
`foreground-loop.ts` SHALL reside in `src/core/foreground/`.

#### Scenario: Foreground directory
- **WHEN** listing `src/core/foreground/` contents
- **THEN** foreground-loop file exists

### Requirement: Build and tests pass
After core reorganization, `tsc --noEmit`, `pnpm test`, and `pnpm build` SHALL pass with zero errors.

#### Scenario: Compilation after core reorg
- **WHEN** running `tsc --noEmit`
- **THEN** exit code is 0
