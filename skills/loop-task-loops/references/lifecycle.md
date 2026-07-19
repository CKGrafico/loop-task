# Loop Lifecycle Reference

## State-Transition Diagram

```
                    ┌──────────────────────────────┐
                    │                              │
                    ▼                              │
              ┌──────────┐    execution completes   │
              │ running   │─────────────────────────┤
              └──────────┘                          │
               │  │  │                              │
        pause  │  │  │ stop                         │
               │  │  │                              ▼
               │  │  └───────────────────────▶ ┌────────┐
               │  │                            │  idle   │
               │  │                            └────────┘
               │  │                               │  ▲
               │  │                    play        │  │
               │  │                 (fresh sched)  │  │
               │  ▼                               │  │
               │  ┌──────────┐                    │  │
               │  │  paused   │──────── stop ──────┘  │
               │  └──────────┘                        │
               │     │                                │
               │     │ resume                         │
               │     │ (continues remaining delay)    │
               │     ▼                                │
               │  ┌──────────┐                        │
               └─▶│ waiting  │──────── stop ──────────┘
                  └──────────┘
                   │       ▲
          delay    │       │
          expires  │       │ trigger / cadence cycle
                   ▼       │
                  ┌──────────┐
                  │ running   │ (new iteration)
                  └──────────┘

        maxRuns reached (from running):
          running ──▶ paused (with maxRunsReached=true)
```

## Iteration Lifecycle — Step by Step

### 1. Eligibility check

Before starting an iteration, the Loop checks whether `maxRuns` has been reached. If `runCount >= maxRuns`, the Loop sets `maxRunsReached = true` and enters the **paused** state. No further iterations start until the flag is explicitly cleared.

### 2. Delay and scheduling

- **First iteration, immediate = true**: Starts immediately. No delay.
- **First iteration, immediate = false**: Computes a phase delay using `computePhase(loopId, interval)` and waits. The delay distributes Loops across their cadence interval.
- **First iteration, restored nextRunAt**: If the Loop was restored with a `nextRunAt` value, it waits until that time.
- **Subsequent iterations**: The next iteration is scheduled at `runStartedAtMs + interval`. If the current iteration overran the cadence, missed points are counted in `skippedCount` and skipped.

### 3. Context creation

A fresh iteration context is created:

```
chainContext = { ...task.context, ...loop.context }
```

- Task context is applied first.
- Loop context is applied second — it **overrides** any overlapping keys from the Task context.
- When neither provides a context, the iteration context starts empty.
- This context is **not** shared with other Loops or other iterations.

### 4. Initial Task execution

The initial Task (or inline payload) executes within the working directory resolved from the Loop's `cwd` and the Project's `directory`.

### 5. Chain execution

If the initial Task defines a successor (`onSuccessTaskId` or `onFailureTaskId`), the chain continues. See the `loop-task-tasks` skill for chain execution details.

### 6. Iteration recording

The iteration is recorded in the run history with: run number, start time, exit code, duration, and log size. Chain steps within the same iteration are grouped by a `chainGroupId`.

### 7. maxRuns recheck

After recording, the Loop checks again whether `maxRuns` has been reached. If so, it enters the **paused** state.

### 8. Next scheduling cycle

The Loop calculates the next cadence point and enters the **waiting** state. The chunked sleep mechanism (200ms granularity) allows responsive pause, trigger, and stop operations during the wait.

## Pause Semantics

- **Pause preserves `remainingDelayMs`.** When a Loop is paused during its waiting period, the remaining milliseconds are saved. On resume, the delay continues from that point.
- **Schedule continues from the original timeline.** Resuming does not reset the schedule — it continues from where the pause interrupted it.
- **Pause does not affect `nextRunAt`** — it is preserved.
- **`pause(true)` also interrupts a running Task** by aborting its subprocess. `pause(false)` lets the current iteration complete before pausing.
- **Pause during running**: If the Loop is actively executing a Task when paused, the status changes to `paused` but the running Task may continue (unless explicitly interrupted). The pause takes effect after the Task completes.

## Stop Semantics

- **Stop clears the schedule.** `nextRunAt` and `remainingDelayMs` are set to null. `sessionStartedAt` is cleared.
- **Stop sets status to `idle`.** The Loop will not auto-restart.
- **Stop interrupts the running Task** (subprocess is killed).
- **Stop cancels the loop promise.** The execution loop terminates.

## Play Semantics (from idle)

- **Play creates a fresh schedule from the current time.** `sessionStartedAt` is set to now. A new phase delay is computed.
- **Play respects `maxRuns`.** If `maxRunsReached` is true, `playLoop` returns false.
- **Play resets the schedule** with `_resetSchedule = true`, causing the delay to restart from the full interval.
- **This differs from resume**, which continues from the interrupted point in the original schedule.

## Trigger Semantics

- **Trigger forces an immediate iteration**, regardless of the current delay.
- If the Loop is idle or stopped, trigger starts a one-shot iteration and returns to idle afterward.
- If the Loop is waiting, trigger interrupts the delay and starts the iteration immediately.
- If the Loop is running, trigger returns false (cannot start a second concurrent iteration).
- The remaining delay is saved in `_savedRemainingMs`. After the triggered iteration completes, the Loop waits for the **remaining** original delay (minus the iteration duration).
- Triggered iterations count toward `maxRuns`.

## Restoration After Interruption

When the system restarts after an interruption:

### What persists
- Loop properties (cadence, Task reference, Project, immediate, maxRuns, etc.)
- Runtime state (status, runCount, maxRunsReached, nextRunAt, remainingDelayMs, runHistory, skippedCount)

### What is lost
- The iteration context (always in-memory, never persisted)
- Any running Task's live output stream
- The running Task itself — interrupted Tasks are marked as `completed` in the run history

### Restoration behaviour
- Loops with a status of `running` or `waiting` are auto-started on restoration.
- Loops that were `paused` or `idle` are restored in that state.
- If the Loop was waiting, the preserved `nextRunAt` and `remainingDelayMs` are used to resume the delay.
- If the Loop was running, it restarts fresh (the interrupted Task cannot be resumed mid-execution).

## Manual-Only Loops (interval = 0)

- **Start**: The Loop immediately enters `idle`. No auto-scheduling occurs.
- **Trigger**: Each trigger executes one iteration. After completion, the Loop returns to `idle`.
- **Play**: Returns `false`. Manual Loops cannot be "played" — only triggered.
- **Immediate flag**: Ignored. Manual Loops never auto-execute.
- **Use case**: Tasks that should only run on explicit demand.
