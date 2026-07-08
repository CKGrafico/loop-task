## ADDED Requirements

### Requirement: Daemon subdirectories created
`src/daemon/` SHALL contain subdirectories: `server/`, `http/`, `state/`, `managers/`, `watcher/`, `spawner/`. Each subdirectory SHALL contain files related to its concern.

#### Scenario: HTTP directory
- **WHEN** listing `src/daemon/http/` contents
- **THEN** route handler files exist (no single file exceeds 300 lines)

#### Scenario: Server directory
- **WHEN** listing `src/daemon/server/` contents
- **THEN** IPC server file exists

### Requirement: http-server.ts split
The `http-server.ts` file (672 lines) SHALL be split into route handler files under `src/daemon/http/`. No single file SHALL exceed 300 lines. The split SHALL group routes by domain (loops, tasks, projects, config/health).

#### Scenario: No oversized HTTP files
- **WHEN** counting lines in any file under `src/daemon/http/`
- **THEN** line count is ≤ 300

#### Scenario: Route handlers functional
- **WHEN** running existing HTTP server tests
- **THEN** all tests pass

### Requirement: State persistence in dedicated directory
State persistence logic (currently in `src/daemon/state.ts`) SHALL reside in `src/daemon/state/`.

#### Scenario: State directory
- **WHEN** listing `src/daemon/state/` contents
- **THEN** state persistence files exist

### Requirement: Managers in dedicated directory
Manager modules SHALL reside in `src/daemon/managers/`.

#### Scenario: Managers directory
- **WHEN** listing `src/daemon/managers/` contents
- **THEN** LoopManager, TaskManager, and ProjectManager files exist

### Requirement: Build and tests pass
After daemon reorganization, `tsc --noEmit`, `pnpm test`, and `pnpm build` SHALL pass with zero errors.

#### Scenario: Compilation after daemon reorg
- **WHEN** running `tsc --noEmit`
- **THEN** exit code is 0
