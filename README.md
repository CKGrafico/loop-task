<div align="center">

# loop-task

**Run commands on repeat. Manage them from a terminal board.**

`loop-task` is a cross-platform CLI that runs shell commands at human-readable intervals. Create loops in the background, manage them from an interactive TUI board, or run them in the foreground.

[![npm version](https://img.shields.io/npm/v/loop-task?style=flat-square&color=black)](https://www.npmjs.com/package/loop-task)
[![npm downloads](https://img.shields.io/npm/dm/loop-task?style=flat-square&color=black)](https://www.npmjs.com/package/loop-task)
[![license](https://img.shields.io/npm/l/loop-task?style=flat-square&color=black)](./LICENSE)
[![node](https://img.shields.io/node/v/loop-task?style=flat-square&color=black)](https://nodejs.org)

</div>

## Quick start

```bash
npm install -g loop-task
loop-task                          # open the board (requires Bun)
loop-task start                    # start the daemon, restore persisted loops
loop-task new 30m -- npm test      # create a background loop
loop-task run --now 10s -- echo hi # run a loop in the foreground
```

Or run it directly:

```bash
npx loop-task
npx loop-task new 30m -- npm test
```

## Requirements

- **Node.js >= 20** — required for all commands
- **Bun >= 1.2** — required for the interactive board only

Install Bun:

```bash
npm install -g bun
```

`start`, `new`, and `run` work with Node alone. The board auto-delegates to Bun when needed.

## Concepts

### Loops

A **loop** is a schedule — it defines *when* something runs. Loops trigger **tasks**.

| Field | Description |
| ----- | ----------- |
| **Interval** | How often to run (`30s`, `5m`, `1h`, `1d`, `1w`) |
| **Task** | Inline command or a reference to a previously defined task |
| **Description** | Optional label shown in the list; defaults to the task name |
| **Run immediately?** | Run once now, then every interval, or wait the first interval |
| **Max runs** | Stop after N runs, or leave blank to run forever |

### Tasks

A **task** is an executable unit — it defines *what* runs. Tasks can chain to other tasks on success or failure.

| Field | Description |
| ----- | ----------- |
| **Name** | A short label for the task |
| **Command** | The full command line |
| **On success** | Optional task to run when this one exits with code 0 |
| **On failure** | Optional task to run when this one exits with a non-zero code |

Tasks are reusable — the same task can be referenced by multiple loops or by other tasks' success/failure chains.

## Commands

| Command | Description |
| ------- | ----------- |
| `loop-task` | Open the interactive board (requires Bun) |
| `loop-task start` | Start the background daemon, restore persisted loops |
| `loop-task new <interval> -- <command>` | Create a background loop (creates an inline task) |
| `loop-task run <interval> -- <command>` | Run a loop in the foreground |

### Options (for `new` and `run`)

| Option | Description |
| ------ | ----------- |
| `--now` | Run immediately before waiting |
| `--max-runs <n>` | Stop after N executions |
| `--cwd <dir>` | Working directory for the command |
| `--verbose` | Show execution details |
| `-h, --help` | Display help |
| `-V, --version` | Display version |

## Examples

```bash
# Run tests every 30 minutes
loop-task new 30m -- npm test

# Run immediately, then every hour
loop-task new --now 1h -- npm test

# Run up to 5 times, then stop
loop-task run --max-runs 5 5m -- npm test

# Agent workflow — schedule an AI task every 30 minutes
loop-task new 30m --now -- opencode run "search missing translations and translate them, 3 maximum" --model "opencode/big-pickle"
# Run in a specific directory
loop-task new 30m --cwd ./packages/api -- npm test

# Verbose mode
loop-task run --verbose 30m -- npm test
```

When the command has its own flags, use `--` to stop argument parsing:

```bash
loop-task new 30m -- node -e "console.log('hello')"
```

## The board

The board is the primary way to manage loops and tasks. It shows all loops, their status, run history, and logs in a single terminal interface.

### Board controls

```
↑/↓, j/k    move selection
Enter       edit selected loop
e           edit loop
d/del       delete loop
p           pause (when waiting) / play (when idle/paused)
s           stop loop (resets schedule)
n           create a new loop
t           create a new task
o           cycle sort mode (order by)
←/→         switch between panels
/           search loops
h           toggle help
esc         quit
```

Destructive actions (pause, force run, delete) prompt a confirmation before executing.

### Pause vs Stop

- **Pause** (`p`) — temporarily halts the loop. Resuming continues the original schedule (e.g., a loop that runs every 6h at :00 paused at 12:00 and resumed at 14:00 will still fire at 16:00).
- **Stop** (`s`) — halts the loop and clears the schedule. Playing starts a fresh interval from now (e.g., the same loop stopped at 12:00 and played at 14:00 will fire at 20:00).

## How it works

```
loop-task (board) ──IPC──► daemon ──► loop 1 ──► task (command)
                           ├──► loop 2 ──► task ──► on-success task
                           └──► loop 3 ──► task ──► on-failure task
```

- The **daemon** is a background process that manages all loops and tasks. It starts automatically when you run `loop-task start` or any command that needs it.
- The **board** is a terminal UI that connects to the daemon via IPC.
- **Loops** define schedules and reference tasks. **Tasks** define commands and optional success/failure chains.
- Loops and tasks **persist to disk** — they survive daemon restarts and system reboots. When the daemon starts, it restores all loops and accounts for elapsed time.

### Lifecycle

1. `loop-task start` or `loop-task new ...` spawns the daemon if not running
2. The daemon creates a loop and a task, and persists their state to disk
3. `loop-task` opens the board for interactive management
4. Closing the board or terminal does **not** stop loops — the daemon keeps running
5. After a reboot, `loop-task start` restores all persisted loops with correct timing

## Supported intervals

| Format | Description |
| ------ | ----------- |
| `10s`  | 10 seconds  |
| `5m`   | 5 minutes   |
| `1h`   | 1 hour      |
| `1d`   | 1 day       |
| `1w`   | 1 week      |

## Behavior

- **No overlapping** — waits for the command to finish before starting the next interval
- **Resilient** — continues looping even if a command exits with a non-zero code
- **Persistent** — loop and task state is saved after every run; survives restarts
- **Graceful shutdown** — background loops are daemon-managed; foreground loops finish the current execution on Ctrl+C

## Development

Requires [Bun](https://bun.sh) >= 1.2 for package management and the board, and [Node.js](https://nodejs.org) >= 20 for the CLI and daemon.

```bash
bun install
npm run build
```

Run locally:

```bash
bun run dev                                    # board
node dist/entry.js new --now 30m -- npm test   # background loop
node dist/entry.js run --now --max-runs 1 10s -- echo hello  # foreground
```

Quality gates:

```bash
bun run typecheck
bun run lint
bun run test
npm run build
```

## License

MIT
