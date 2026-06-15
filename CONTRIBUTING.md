# Contributing to loop-task

Thanks for your interest in contributing!

## Requirements

`loop-task` runs on [Bun](https://bun.sh). The board UI is built with
[OpenTUI](https://github.com/sst/opentui) + React, which require Bun's runtime.
Install Bun (>= 1.2) before working on the project.

## Getting started

```bash
git clone https://github.com/your-username/loop-task.git
cd loop-task
bun install
```

## Development

```bash
bun run dev           # Run the board with auto-reload
bun run test:watch    # Watch mode tests
bun run lint          # Lint source and tests
bun run typecheck     # Type check without emitting
```

## Product direction

`loop-task` is board-first:

- `loop-task` opens the OpenTUI board
- `loop-task start ...` creates background loops for scripts and shell workflows
- `loop-task run ...` is the explicit foreground mode

Loop management actions should prefer the board over adding more top-level CLI commands.

## Architecture

- `src/cli.ts` — Commander entry point (Bun shebang)
- `src/daemon/` — background daemon, IPC server, loop manager, state persistence
- `src/client/` — IPC client used by the CLI and the board
- `src/board/` — OpenTUI + React board (`index.tsx`, `App.tsx`, `state.ts`, `daemon.ts`, `format.ts`, `toast.tsx`)
- `src/loop.ts`, `src/loop-config.ts`, `src/duration.ts`, `src/logger.ts` — core loop logic

The daemon IPC server supports `start`, `update`, `list`, `status`, `pause`, `resume`,
`trigger` (force run), `delete`, `attach`, `logs`, and `shutdown`. The board drives these
operations; the CLI only exposes `start` and `run`.

Bun runs the TypeScript/TSX sources directly; there is no build step.

## Running the CLI locally

```bash
bun run src/cli.ts                                   # open the board
bun run src/cli.ts start --now 30m -- npm test       # background loop
bun run src/cli.ts run --now --max-runs 1 30s -- echo hello   # foreground
```

Set `LOOP_CLI_HOME` to an alternate directory to isolate daemon state
(used by the test suite).

## Testing

```bash
bun run test              # Run tests
bun run test:coverage     # Run tests with coverage
```

## Publishing (maintainers)

```bash
bun run release:dry   # Dry run
bun run release       # Publish to npm (runs on Bun)
```

## Code style

- TypeScript strict mode
- ESM only
- No comments unless necessary
- Follow existing conventions
- Prefer the board-first command model when changing product behavior

## Pull requests

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Ensure `bun run lint`, `bun run typecheck`, and `bun run test` pass
5. Open a PR
