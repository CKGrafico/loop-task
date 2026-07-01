# Tasks: gh-20-comprehensive-test-suites

## Task 1: Fix pre-existing test failures
- **Agent**: basic-engineer
- **Depends on**: none
- **Touches**: tests/cli.test.ts, tests/loop-controller.test.ts, tests/projects.test.ts, src/**/*.ts (minimal fixes only)
- **Description**: Fix all 11 pre-existing test failures on main. Fix version assertion and --description flag in cli.test.ts. Fix timer mock issues in loop-controller.test.ts. Fix test-dir cleanup in projects.test.ts. All existing tests must pass without skip/todo.

## Task 2: Core module tests — scheduling, log-rotator, log-parser
- **Agent**: basic-engineer
- **Depends on**: none
- **Touches**: tests/scheduling.test.ts, tests/log-rotator.test.ts, tests/log-parser.test.ts
- **Description**: Create tests/scheduling.test.ts: computePhase() / alignToPhase() — verify deterministic spread, edge cases (small/large intervals), hash distribution. Create tests/log-rotator.test.ts: rotateLogIfNeeded() — size thresholds, generation rotation (.1, .2, .3), max cap behavior, fresh file. Create tests/log-parser.test.ts: line classification — run headers, chain markers, exit codes, malformed lines.

## Task 3: Core module tests — loop-controller stabilization + new scenarios
- **Agent**: basic-engineer
- **Depends on**: Task 1
- **Touches**: tests/loop-controller.test.ts
- **Description**: Add to existing loop-controller.test.ts: state machine transitions (running→paused→running→stopped), chunked sleep abort, chain execution with context passing, trigger during sleep. Ensure all new + existing tests pass.

## Task 4: Daemon module tests — server and manager
- **Agent**: basic-engineer
- **Depends on**: none
- **Touches**: tests/daemon-server.test.ts, tests/daemon-manager.test.ts
- **Description**: Create tests/daemon-server.test.ts: IpcServer — JSON-lines request routing, malformed input → error response (no crash), subscriber push events, socket cleanup on shutdown. Create tests/daemon-manager.test.ts: LoopManager — start/pause/resume/stop/trigger/delete lifecycle, reconcile from disk, persistence to loops.json. Use LOOP_CLI_HOME for isolation. Mock IPC server.

## Task 5: Daemon module tests — state, spawner, file-watcher, task-manager, projects
- **Agent**: basic-engineer
- **Depends on**: none
- **Touches**: tests/daemon-state.test.ts, tests/daemon-spawner.test.ts, tests/daemon-file-watcher.test.ts, tests/daemon-task-manager.test.ts, tests/daemon-projects.test.ts
- **Description**: Create tests/daemon-state.test.ts: loadAllLoops(), saveLoop(), writeFileAtomic(), PID/signature files, migration. Create tests/daemon-spawner.test.ts: ensureDaemon() — spawn, code-signature verification, alive check, restart. Create tests/daemon-file-watcher.test.ts: fs.watch detection, SHA-1 hash diff, debounce, reconcile callback. Create tests/daemon-task-manager.test.ts: CRUD, persist to tasks.json, in-memory consistency. Replace tests/projects.test.ts with tests/daemon-projects.test.ts: CRUD, default project permanence, color validation. Use LOOP_CLI_HOME for isolation.

## Task 6: Client & IPC tests
- **Agent**: basic-engineer
- **Depends on**: none
- **Touches**: tests/client-ipc.test.ts, tests/client-commands.test.ts
- **Description**: Create tests/client-ipc.test.ts: sendRequest() — connect, timeout (10s), JSON framing, error handling for dead socket. Mock net.Socket/net.Server. Create tests/client-commands.test.ts: output formatters — verify structured output for each subcommand.

## Task 7: Shared utility tests
- **Agent**: basic-engineer
- **Depends on**: none
- **Touches**: tests/fs-utils.test.ts, tests/sleep.test.ts, tests/tail.test.ts
- **Description**: Create tests/fs-utils.test.ts: writeFileAtomic() — temp-then-rename atomicity, cleanup on failure. Create tests/sleep.test.ts: abortable chunked sleep, SLEEP_CHUNK_MS granularity, signal interruption. Create tests/tail.test.ts: last N lines, empty string, fewer lines than N.

## Task 8: Coverage gate verification
- **Agent**: basic-engineer
- **Depends on**: Task 1, Task 2, Task 3, Task 4, Task 5, Task 6, Task 7
- **Touches**: vitest.config.ts (possibly), tests/**/*.test.ts (adjustments only)
- **Description**: Run vitest run --coverage and verify 90% thresholds across lines/functions/branches/statements. No skip or todo. Fix any coverage gaps. Ensure typecheck → lint → test → build all pass.
