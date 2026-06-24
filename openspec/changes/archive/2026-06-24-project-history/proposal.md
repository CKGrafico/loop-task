# Project History — loop-cli (loop-task)

## What This Project Is

`loop-task` (repo: `loop-cli`) is a cross-platform CLI tool that repeatedly runs a shell command at a human-readable interval (`30s`, `5m`, `1h`, `1d`, `1w`). It serves developers needing lightweight recurring commands (test watchers, health checks, sync jobs) and AI-agent workflows (scheduling coding agents like OpenCode). The project is positioned around **loop engineering** — a paradigm where work runs on a cadence rather than being manually triggered.

- **npm package**: `loop-task`
- **Version**: `1.4.0`
- **License**: MIT
- **Author**: Quique Fdez Guerra (`quique@ckgrafico.com`)
- **Repository**: `https://github.com/CKGrafico/loop-task.git`

## Key Decisions Already Made

### Architecture
- **Client-daemon over local IPC**: short-lived CLI dispatches to a long-lived daemon via newline-delimited JSON over Unix socket (POSIX) or Windows named pipe. No network listener, no auth — OS permissions govern access.
- **Filesystem persistence (no database)**: all state lives under `~/.loop-cli/` — per-loop JSON files, project metadata, log files, daemon lifecycle files. Human-inspectable, no schema versioning.
- **Dual runtime**: Bun >= 1.2 required for the TUI board (OpenTUI FFI); Node.js >= 20 for CLI and daemon. Board auto-delegates to Bun when invoked from Node.

### Entity Model
- **Loops + Tasks** (v1.3+): Loop = schedule (interval, run policy), Task = executable unit (command, args, cwd, optional chaining). Inline loops store command directly; task-referencing loops link by ID. Pre-v1.3 loops auto-migrated on daemon init.
- **Projects** (v1.4.0): organizational scopes for loops — single-select filter, fixed color palette, cascade delete to Default, immutable Default project. Persisted as `~/.loop-cli/projects/<id>.json`.

### UI
- **OpenTUI + React 19**: TUI board built with `@opentui/core` and `@opentui/react`. Two-panel layout (Navigator + Inspector), keybinding hooks, no CSS/Tailwind.
- **Projects management**: dedicated Manage Projects page (not a modal), color-coded bullets, context-aware project pre-selection, history-stack router.

### State Management
- **LoopController state machine**: states `running` → `waiting` → `paused` → `stopped`. No overlapping executions, schedule-aware, skipped-run tracking, force-run preserves countdown.
- **Single-flight daemon**: socket bound before `manager.init()`; losing racers exit(0) cleanly.

## Known Tech Debt and Constraints

1. **Stale test assertion**: `tests/cli.test.ts` asserts version `1.1.0` while package is at `1.4.0`.
2. **Windows IPC fragility**: `tests/background-cli.test.ts` prone to timeouts on Windows (daemon IPC timing).
3. **Coverage config drift**: Vitest excludes `src/tui/**` (non-existent) instead of `src/board/**` — board components untested.
4. **No CI/CD**: No `.github/` workflows; no automated checks across platforms.
5. **No CHANGELOG.md**: release notes not maintained in-repo.
6. **No schema versioning**: LoopMeta JSON files lack `schemaVersion` — future format changes risk breaking state.
7. **Single-process daemon**: no isolation between concurrent loops.
8. **Coarse code signature**: daemon restart detection keys on mtime/size/count, not content hashes.
9. **Bun-only board**: board requires Bun; shows error under Node rather than working.
10. **DESIGN.md out of date**: references v1.2.0 and old build configuration.
11. **Unused code**: `log-parser.ts` (`splitLogByRuns`) no longer used in main server path.

## Current State (as of June 19, 2026)

- **Version**: `1.4.0` published on npm
- **Status**: active development, Projects feature complete
- **Last commit**: `2ac4988` ("add demo gif")
- **Branch**: `main` — no active OpenSpec changes; two archived feature changes complete
- **No open PRs** — unmerged branches on remote
- **Quality**: typecheck passes, lint has 8 pre-existing errors, tests 72/72 pass (excluding stale version assertion)
