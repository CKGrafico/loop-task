# Restart and Kill Tasks

## Why

Sometimes a running task freezes or the daemon gets into a bad state. Need `loop-task restart` to kill the daemon and all loops, then restart fresh. Also need `loop-task stop <id>` to kill a frozen running task (SIGKILL the child process).

## What Changes

1. `loop-task restart` CLI command — kills the daemon process (SIGTERM, then SIGKILL after timeout), clears PID/sig files, spawns a fresh daemon. Existing `stopDaemon` logic in spawner.ts can be reused.
2. `loop-task stop <id>` CLI command — sends a `stop-loop` RPC that interrupts the currently running child process (not just pauses the schedule).
3. New RPC `stop-all` — stops all loops and kills running child processes.
4. `stopLoop` in manager already calls `controller.stopLoop()` which takes `interruptCurrentRun`. Wire it to actually interrupt.

## Non-goals

- Changing the board UI for stop/restart.
- Adding a `--force` flag on restart (it always force-kills).
