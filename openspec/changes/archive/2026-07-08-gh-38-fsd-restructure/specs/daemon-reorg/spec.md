## ADDED Requirements

### Requirement: Daemon subdirectory structure
The `src/daemon/` directory SHALL contain the following subdirectories: `server/`, `http/`, `state/`, `managers/`, `watcher/`, `spawner/`. Each subdirectory SHALL contain related modules grouped by concern.

#### Scenario: Daemon directory verification
- **WHEN** listing `src/daemon/` directory
- **THEN** `server/`, `http/`, `state/`, `managers/`, `watcher/`, `spawner/` subdirectories exist

### Requirement: http-server.ts split into route handlers
`src/daemon/http-server.ts` (672 lines) SHALL be split into `src/daemon/http/server.ts` (server setup, ~150 lines) and route handler files under `src/daemon/http/routes/`. Each route handler file SHALL be under 300 lines.

#### Scenario: HTTP server split
- **WHEN** checking `src/daemon/http-server.ts`
- **THEN** the file does not exist at that path
- **AND** `src/daemon/http/server.ts` exists and is under 300 lines
- **AND** route handler files exist under `src/daemon/http/routes/`

#### Scenario: Route handler file sizes
- **WHEN** measuring any route handler file under `src/daemon/http/routes/`
- **THEN** line count is at most 300

### Requirement: Daemon state persistence in state subdirectory
State persistence files (`state.ts` which manages loops.json/tasks.json/projects.json) SHALL be in `src/daemon/state/`.

#### Scenario: State module location
- **WHEN** checking for daemon state module
- **THEN** it is located under `src/daemon/state/`

### Requirement: Daemon managers in managers subdirectory
`manager.ts` (LoopManager), `task-manager.ts`, and `projects.ts` SHALL be in `src/daemon/managers/`.

#### Scenario: Manager module location
- **WHEN** checking for daemon manager modules
- **THEN** LoopManager, TaskManager, ProjectManager are under `src/daemon/managers/`

### Requirement: File watcher in watcher subdirectory
`file-watcher.ts` SHALL be in `src/daemon/watcher/`.

#### Scenario: Watcher module location
- **WHEN** checking for daemon file watcher module
- **THEN** it is located under `src/daemon/watcher/`

### Requirement: Spawner in spawner subdirectory
`spawner.ts` SHALL be in `src/daemon/spawner/`.

#### Scenario: Spawner module location
- **WHEN** checking for daemon spawner module
- **THEN** it is located under `src/daemon/spawner/`

### Requirement: IPC server in server subdirectory
`server.ts` (IPC server) and `daemon-log.ts` SHALL be in `src/daemon/server/`.

#### Scenario: IPC server module location
- **WHEN** checking for IPC server module
- **THEN** it is located under `src/daemon/server/`
