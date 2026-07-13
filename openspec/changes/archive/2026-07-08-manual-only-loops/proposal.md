# Manual-Only Loops

## Summary

Add support for loops with zero/manual interval that never execute on a schedule, they only run when explicitly triggered.

## Motivation

Currently every loop requires a positive interval and begins scheduling automatically. There is no way to create a loop that sits dormant and only fires on demand. The closest workaround is to create a loop and immediately stop it, then rely on trigger, but a stopped loop cannot be distinguished from a temporarily-paused loop.

## Scope

- `parseDuration("0")` and `parseDuration("manual")` return `0`
- `buildLoopOptions()` maps `0` → `intervalHuman: "manual"`, forces `immediate: false`, `offset: null`
- `LoopController.start()` skips scheduling for `interval === 0`, sets status to `idle`
- `LoopController.playLoop()` returns `false` for manual loops
- `LoopController.triggerNow()` runs once and returns to `idle`
- `loop-runner.ts` checks `_forceRun` to bypass initial delay for triggered manual loops; `_stopAfterRun` takes priority over maxRuns post-run
- `formatDuration(0)` returns `"manual"`
- `timingLabel()` shows `"manual"` for `interval === 0`
- TUI form wizard skips "Run immediately?" step when interval is manual/0
- CLI `loop-task run` rejects interval `0`
- Import/export, FileWatcher, `loop-task status` all handle `interval: 0` / `intervalHuman: "manual"`

## Out of Scope

- Cron-style scheduling
- Conditional triggers
- Webhook-triggered loops
