# loop-task

A cross-platform loop runner with a board-first terminal workflow.

`loop-task` is built around running multiple background loops and managing them from one interactive board.

![tempim](https://i.imgur.com/S7D6m0J.png)

## Requirements

- [Node.js](https://nodejs.org) >= 20 — required for all commands
- [Bun](https://bun.sh) >= 1.2 — required for the interactive board (`loop-task` with no args)

Install Bun with:

```bash
npm install -g bun
```

## Installation

```bash
npm install -g loop-task
```

Or run it directly:

```bash
npx loop-task
```

## Usage

```bash
loop-task                                    # open the interactive board (requires Bun)
loop-task start [options] <interval> -- <command>   # background loop
loop-task run [options] <interval> -- <command>      # foreground loop
```

## Command Model

- `loop-task`
Opens the interactive board. Requires Bun to be installed.

- `loop-task start ...`
Creates a background loop without opening the board. Works with Node only.

- `loop-task run ...`
Runs a loop in the foreground. Works with Node only.

All ongoing management actions happen in the board itself.

## Examples

```bash
loop-task
loop-task start --now 30m -- npm test
loop-task run --now --max-runs 1 10s -- echo hello
```

When the command you want to run has its own flags, use `--` to stop `loop-task` argument parsing:

```bash
loop-task start --now 30m -- node -e "console.log('hello')"
loop-task run 1h -- opencode run "Check the plans" --model "opencode/big-pickle"
```

## Board Workflow

The board is the primary way to work with loops.

From inside the board you can:

- browse all loops
- inspect loop details and live output
- create new loops interactively
- edit existing loops (editing pauses the loop)
- pause and resume loops
- force run a loop immediately
- delete loops
- search, filter by status, and sort

### Board keymap

```text
↑/↓, j/k  move selection
Enter     toggle detail view
n         create loop
e         edit selected loop (pauses it)
p         pause selected loop
r         resume selected loop
x         force run selected loop now
d         delete selected loop
/         search loops
f         cycle status filter
s         cycle sort mode
h         toggle help
Esc       return to board
q         quit
```

Destructive or schedule-changing actions (pause, resume, force run, delete) prompt a
confirmation modal; results are shown as toasts.

### Loop fields

When creating or editing a loop you can set:

- **Interval** – how often to run (e.g. `30s`, `5m`, `1h`)
- **Command** – the full command line (quote args with spaces)
- **Description** – optional short label shown in the list; blank falls back to the command
- **Working dir** – directory the command runs in; defaults to the current directory and
  must exist at run time
- **Run immediately?** – run once now, then every interval, or wait the first interval
- **Max runs** – stop after N runs, or leave blank to run forever

## Start From The CLI Or The Board

There are two supported ways to create loops:

- use `loop-task start ...` when you are scripting, automating, or launching a loop directly from the shell
- use the board when you want to create and manage loops interactively in one place

Both creation paths use the same backend daemon and the same validation rules.

## Foreground Run Mode

Foreground mode is now explicit:

```bash
loop-task run 30m -- npm test
loop-task run --now --max-runs 5 5m -- npm test
```

### With npx

```bash
npx loop-task
npx loop-task start --now 30m -- npm test
```

### Options

These options apply to `start` and `run`:

| Option            | Description                      |
| ----------------- | -------------------------------- |
| `--now`           | Run immediately before waiting   |
| `--max-runs <n>`  | Stop after N executions          |
| `--cwd <dir>`     | Working directory for the command (defaults to the current directory) |
| `--verbose`       | Show execution details           |
| `-h, --help`      | Display help                     |
| `-V, --version`   | Display version                  |

### Agent workflows

```bash
npx loop-task start 30m --now -- opencode run "search for missing translation text and translate them, 3 maximum" --model "opencode/big-pickle"
```

### Run tests every 30 minutes

```bash
loop-task start 30m -- npm test
```

### Run immediately, then every hour

```bash
loop-task start --now 1h -- npm test
```

### Run up to 5 times then stop

```bash
loop-task run --max-runs 5 5m -- npm test
```

### Verbose mode

```bash
loop-task run --verbose 30m -- npm test
```

Shows start/end timestamps, exit code, execution duration, and next scheduled run.

### Run in a specific directory

```bash
loop-task start 30m --cwd ./packages/api -- npm test
```

The working directory is checked before every run; if it no longer exists, that run is
skipped with an error logged to the loop's output instead of executing.

## Supported intervals

| Format | Description |
| ------ | ----------- |
| `10s`  | 10 seconds  |
| `5m`   | 5 minutes   |
| `1h`   | 1 hour      |
| `1d`   | 1 day       |
| `1w`   | 1 week      |

## Behavior

- **No overlapping**: waits for the command to finish before starting the next interval
- **Resilient**: continues looping even if a command exits with a non-zero code
- **Graceful shutdown**: background loops are daemon-managed and foreground loops finish the current execution on Ctrl+C before exiting

## Development

Requires [Bun](https://bun.sh) (>= 1.2) for package management and the board, and [Node.js](https://nodejs.org) (>= 20) for the CLI and daemon.

```bash
bun install
npm run build
```

Run the CLI locally:

```bash
node dist/entry.js start --now 30m -- npm test    # background loop
node dist/entry.js run --now --max-runs 1 10s -- echo hello  # foreground loop
```

Run the board locally:

```bash
bun run dev       # board
bun run dev:watch # board with auto-reload (can be less stable for TUI input)
npm run start     # built app entrypoint
```

If you want to run the built CLI instead:

```bash
node dist/entry.js
```

Quality gates:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## License

MIT
