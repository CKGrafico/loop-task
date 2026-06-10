# loop-cli

A cross-platform CLI that repeatedly executes a shell command at a human-readable interval.

Inspired by agent loops, but intentionally simple.

## Installation

```bash
npm install -g loop-cli
```

Or use directly with npx:

```bash
npx loop-cli 30m npm test
```

## Usage

```bash
loop [options] <interval> <command>
```

### Basic examples

```bash
loop 30m npm test
loop 1h opencode --prompt '/ob-init'
loop 1d node sync.js
```

### With npx

```bash
npx loop-cli 30m npm test
npx loop-cli 1h opencode --prompt '/ob-init'
```

### Options

Options must come before the interval:

| Option            | Description                      |
| ----------------- | -------------------------------- |
| `--immediate`     | Run immediately before waiting   |
| `--max-runs <n>`  | Stop after N executions          |
| `--verbose`       | Show execution details           |
| `-h, --help`      | Display help                     |
| `-V, --version`   | Display version                  |

## Examples

### Agent workflows

```bash
npx loop-cli 30m opencode --prompt "search for missing translation text and translate them, 3 maximum" --model "opencode/big-pickle"
```

### Run tests every 30 minutes

```bash
loop 30m npm test
```

### Run immediately, then every hour

```bash
loop --immediate 1h npm test
```

### Run up to 5 times then stop

```bash
loop --max-runs 5 5m npm test
```

### Verbose mode

```bash
loop --verbose 30m npm test
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
