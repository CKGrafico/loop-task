# loop-task

A cross-platform CLI that repeatedly executes a shell command at a human-readable interval.

Inspired by agent loops, but intentionally simple.

## Installation

```bash
npm install -g loop-task
```

Or use directly with npx:

```bash
npx loop-task 30m npm test
```

## Usage

```bash
loop-task [options] <interval> <command>
```

Background mode:

```bash
loop-task start [options] <interval> <command>
loop-task list
loop-task status <id>
loop-task attach <id>
loop-task pause <id>
loop-task resume <id>
loop-task delete <id>
loop-task logs <id> [--follow]
loop-task dashboard
```

When the command you want to run has its own flags, use `--` to stop `loop-task` argument parsing:

```bash
loop-task start --now 30m -- node -e "console.log('hello')"
```

### Basic examples

```bash
loop-task 30m npm test
loop-task 1h --now -- opencode run "Check the plans"
loop-task 1d node sync.js
loop-task start --now 30m npm test
loop-task list
```

### With npx

```bash
npx loop-task 30m npm test
npx loop-task 1h --now -- opencode run "Check the plans"
```

### Options

Options must come before the interval:

| Option            | Description                      |
| ----------------- | -------------------------------- |
| `--now`           | Run immediately before waiting   |
| `--max-runs <n>`  | Stop after N executions          |
| `--verbose`       | Show execution details           |
| `-h, --help`      | Display help                     |
| `-V, --version`   | Display version                  |

## Background Loops

Use background mode when you want multiple independent loops managed from one CLI session.

### Start a background loop

```bash
loop-task start --now 30m npm test
```

### List all loops

```bash
loop-task list
```

### Reattach to a loop's output

```bash
loop-task attach <id>
```

### Pause, resume, delete

```bash
loop-task pause <id>
loop-task resume <id>
loop-task delete <id>
```

### Open the TUI dashboard

```bash
loop-task dashboard
```

## Examples

### Agent workflows

```bash
npx loop-task 30m --now -- opencode run "search for missing translation text and translate them, 3 maximum" --model "opencode/big-pickle"
```

### Run tests every 30 minutes

```bash
loop-task 30m npm test
```

### Run immediately, then every hour

```bash
loop-task --now 1h npm test
```

### Run up to 5 times then stop

```bash
loop-task --max-runs 5 5m npm test
```

### Verbose mode

```bash
loop-task --verbose 30m npm test
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
- **Graceful shutdown**: finishes current execution on Ctrl+C, then exits cleanly

## Development

```bash
pnpm install
pnpm run build
pnpm run test
pnpm run lint
```

## License

MIT
