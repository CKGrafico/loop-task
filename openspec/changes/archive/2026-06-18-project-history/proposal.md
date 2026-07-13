# Project History, loop-task

## What this project is

**loop-task** (repo: `loop-cli`) is a cross-platform CLI that runs shell commands on repeat at human-readable intervals (`30s`, `5m`, `1h`, `1d`, `1w`). It targets developers and AI-agent workflows that need lightweight persistent recurring command execution without a full scheduler like cron.

Published on npm as `loop-task`. MIT license. Maintainer: Quique Fdez Guerra.

## Key decisions already made

### Architecture: client–daemon over local IPC
- A short-lived **CLI client** (`src/cli.ts`) parses args and either opens the board, spawns the daemon, or runs a foreground loop.
- A long-lived **background daemon** (`src/daemon/`) owns all loops via `LoopManager` + `IpcServer`; persists state atomically to `~/.loop-cli/`.
- Transport: newline-delimited JSON over a Unix domain socket (POSIX) or named pipe (Windows). No network, no auth.
- Single-flight daemon guard: the daemon binds the socket before `manager.init()`; losing racers exit(0).

### Runtime: Bun + Node dual-mode
- **Bun >= 1.2** required for the interactive TUI board (runs `.ts/.tsx` directly via `@opentui/react`).
- **Node.js >= 20** required for all other commands (`start`, `new`, `run`). Ships compiled to `dist/`.
- The board auto-delegates to Bun when the user opens it from Node.

### Loop + Task model (v1.3+)
- A **loop** is a schedule, interval, run policy, max runs, description.
- A **task** is an executable unit, command, args, cwd, optional success/failure chain.
- Inline loops store `command`/`commandArgs`/`cwd` directly on `LoopOptions` (`taskId: null`).
- Existing-task loops reference a `TaskDefinition` by ID (`taskId: string`).
- Pre-v1.3 loops are migrated on daemon init by creating an inline task entity.

### State machine: LoopController
- Statuses: `running` → `waiting` → `paused` → `idle` (stopped).
- `playLoop()` and `triggerNow()` are the two "start" entry points.
- Force-run (`triggerNow`) is blocked when status is `"running"`, no concurrent execution.
- Max-runs reached → loop **pauses** (not stops); user must edit maxRuns to unblock.
- Schedule-aware timing: after each run, the scheduler tracks `runStartedAt + interval` and counts missed slots as `skippedCount` if execution overruns.
- Force-run preserves the original countdown: `_savedRemainingMs` is saved before the forced run and restored after.

### Persistence: filesystem, no database
- State stored under `~/.loop-cli/` (override with `LOOP_CLI_HOME`).
- Loop state: `loops/<id>.json` (atomic writes via `writeFileAtomic`).
- Logs: `logs/<id>.log` (rotated at 1 MB, max 3 backups).
- Run history: stored inside loop state, max 50 entries, with `logOffset` for byte-precise log reading.

### Terminal UI: OpenTUI + React 19
- Board built with `@opentui/core` + `@opentui/react`. JSX via `jsxImportSource: @opentui/react`.
- No CSS/Tailwind, all styling via component props (`fg`, `bg`, `border`, etc.).
- Keybinding hook pattern (`useBoardKeybindings`, `useTaskKeybindings`), no inline key handlers in JSX (causes Bun native FFI segfault).
- Two-panel layout: Navigator (55%) + Inspector+Actions (45%). Task browser mirrors the same layout.
- All user-facing strings in `src/i18n/en.json`; typed key union enforced at compile time.

### Coding conventions
- All magic numbers in `src/config/constants.ts`.
- All user-facing strings in `src/i18n/en.json` via `t(key, params)`.
- IPC contract in `src/types.ts` as single source of truth.
- Dictionary/strategy pattern over nested if/else for dispatch logic.
- Shell commands prefixed with `rtk` per RTK guardrail.
- Quality gate: `typecheck` → `lint` → `test` (in that order).

## Known tech debt / constraints

- `tests/cli.test.ts` version assertion lags `package.json`; must be updated manually on each version bump.
- `tests/background-cli.test.ts` can time out on Windows (daemon IPC timing).
- DESIGN.md not yet generated (TUI uses no CSS/Tailwind; design tokens are implicit in component props).
- The `log-parser.ts` (`splitLogByRuns`) is no longer used in the main server path, kept for potential future use.
- Old `interruptedForForceRun` interrupt-while-running path removed; `pause(true)` is the only remaining way to abort a running command.

## Current state of the project

Version 1.3.1. Active development. Key recent features:
- Loop/task entity separation (v1.3)
- Task browser UI
- Task chaining (onSuccess/onFailure)
- Stop/Play lifecycle
- Force-run with schedule preservation
- Skipped-run tracking (SKP column in Navigator)
- Byte-offset-based log reading (eliminates log mixing on force-run)
- Context-sensitive action buttons
