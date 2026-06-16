# Contributing to loop-task

Thanks for your interest in contributing!

## Requirements

`loop-task` runs on [Node.js](https://nodejs.org) (>= 20) for CLI and daemon operations.
The interactive board requires [Bun](https://bun.sh) (>= 1.2) for OpenTUI native FFI.
Install it with `npm install -g bun`.
Install both Node and Bun before working on the project.

## Getting started

```bash
git clone https://github.com/your-username/loop-task.git
cd loop-task
bun install
npm run build
```

Bun is used as the package manager and script runner for development (`bun install`, `bun run dev`).
Node is the runtime for the CLI and daemon. The board requires Bun's native FFI.

## Development

```bash
bun run dev           # Run the board
bun run dev:watch     # Run the board with auto-reload (can be less stable for TUI input)
npm run start         # Run the built app entrypoint
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

- `src/cli.ts` — Commander entry point (Node shebang, dynamic import for board)
- `src/entry.js` — Node entry wrapper (registers ESM loader, imports `cli.js`)
- `src/esm-loader.js` — Custom Node ESM loader (fixes upstream extensionless imports)
- `src/daemon/` — background daemon, IPC server, loop manager, state persistence
- `src/client/` — IPC client used by the CLI and the board
- `src/board/` — OpenTUI + React board (`index.tsx`, `App.tsx`, `state.ts`, `daemon.ts`, `format.ts`, `toast.tsx`)
- `src/loop.ts`, `src/loop-config.ts`, `src/duration.ts`, `src/logger.ts` — core loop logic

The daemon IPC server supports `start`, `update`, `list`, `status`, `pause`, `resume`,
`trigger` (force run), `delete`, `attach`, `logs`, and `shutdown`. The board drives these
operations; the CLI only exposes `start` and `run`.

Bun runs the TypeScript/TSX sources directly for development. The build step compiles to `dist/` for npm distribution.

## Running the CLI locally

```bash
bun run dev                                            # open the board with auto-reload
node dist/entry.js start --now 30m -- npm test        # background loop (Node)
node dist/entry.js run --now --max-runs 1 30s -- echo hello   # foreground
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
npm run release:dry   # Dry run
npm run release       # Publish to npm
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
4. Ensure `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass
5. Open a PR
