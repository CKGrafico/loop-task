# loop-task

A cross-platform loop runner with a board-first terminal workflow.

`loop-task` is built around running multiple background loops and managing them from one interactive board.

## Installation

```bash
npm install -g loop-task
```

Or use directly with npx:

```bash
npx loop-task
```

## Usage

```bash
loop-task
loop-task start [options] <interval> -- <command>
loop-task run [options] <interval> -- <command>
```

## Command Model

- `loop-task`
Opens the interactive board.

- `loop-task start ...`
Creates a background loop without opening the board. This is the script-friendly entrypoint.

- `loop-task run ...`
Runs a loop in the foreground. Use this when you explicitly want the old single-loop terminal behavior.

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
- inspect loop details
- pause and resume loops
- delete loops
- attach to live output
- create new loops interactively

### Board keymap

```text
n      create loop
Enter  open detail view
a      open attach view
p      pause selected loop
r      resume selected loop
d      delete selected loop
/      search loops
f      cycle status filter
s      cycle sort mode
h      help
Esc    return to board
q      quit
```

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

```bash
pnpm install
pnpm run build
pnpm run test
pnpm run lint
```

## License

MIT
