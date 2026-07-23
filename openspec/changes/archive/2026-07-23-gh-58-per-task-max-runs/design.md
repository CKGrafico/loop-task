# Per-task max runs limit

## Summary

Add `maxRuns` at the task level (`TaskDefinition`) that fails a task when it executes more than the configured number of times within a single loop session, defaulting to 5. Independent from the existing loop-level `maxRuns`.

## Motivation

A misconfigured retry chain or runaway chained task can execute indefinitely within a single loop. Per-task limits prevent this without pausing the entire loop.

## Design

1. `TaskDefinition.maxRuns: number` — required field, default 5 exported as `DEFAULT_TASK_MAX_RUNS`
2. `LoopController.taskRunCounts: Map<string, number>` — per-session counter, reset on `start()`
3. `LoopController.getTaskRunCount()` / `incrementTaskRunCount()` — accessors
4. `runLoop` checks counter before `executeRunImpl`; if exceeded, records a failed run with exit code 1
5. `executeChain` checks counter for chained tasks; if exceeded, fails and follows `onFailureTaskId`
6. `TaskManager.create()` applies default; `init()` fills missing `maxRuns` for loaded tasks
7. `TaskForm` adds a wizard step for maxRuns with `parseMaxRuns` validation
8. Existing `parseMaxRuns` reused for validation (rejects < 1)

## Independence from loop-level maxRuns

- Loop-level `maxRuns` pauses the loop when reached
- Task-level `maxRuns` fails the task but does NOT pause the loop
- Both operate independently
