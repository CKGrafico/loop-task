# Proposal: Per-task max runs limit

**Issue:** #58  
**Branch:** feat/issue-58-per-task-max-runs

## Problem

A misconfigured retry chain or runaway chained task can execute indefinitely within a single loop session. The loop already has `maxRuns` at the loop level that pauses the loop, but there is no per-task limit that fails an individual task without stopping the loop.

## Solution

Add `maxRuns: number` to `TaskDefinition` (default 5). When a task's per-session run count exceeds its `maxRuns`, the task fails with exit code 1. The failure propagates through the existing `onFailureTaskId` chain mechanism. The loop itself is not paused.

## Affected files

- `src/types.ts` — Added `DEFAULT_TASK_MAX_RUNS=5` and `maxRuns: number` to `TaskDefinition`
- `src/daemon/managers/task-manager.ts` — Default on create, fill on load
- `src/core/loop/loop-controller.ts` — Added `taskRunCounts` map, `getTaskRunCount()`, `incrementTaskRunCount()`
- `src/core/loop/loop-runner.ts` — Pre-execution maxRuns check, counter increment
- `src/core/loop/chain-executor.ts` — Chained task maxRuns check and counter increment
- `src/widgets/task-form/TaskForm.tsx` — New wizard step for maxRuns with validation
- `src/shared/i18n/en.json` — New i18n keys for maxRuns prompt/hint
