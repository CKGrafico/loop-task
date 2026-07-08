# Specs: Manual-Only Loops

## Spec 1: Duration Parsing

- `parseDuration("0")` returns `0`
- `parseDuration("manual")` returns `0` (case-insensitive)
- `parseDuration("Manual")` returns `0`
- Negative values continue to be rejected
- `formatDuration(0)` returns `"manual"`

## Spec 2: Loop Options

- `buildLoopOptions("manual", ...)` → `{ interval: 0, intervalHuman: "manual", immediate: false, offset: null }`
- `buildLoopOptions("0", ...)` → `{ interval: 0, intervalHuman: "manual", immediate: false, offset: null }`
- When `now: true` is passed with manual interval, `immediate` is forced to `false`
- When `offset` is passed with manual interval, it is forced to `null`

## Spec 3: LoopController

- On `start()` with `interval === 0` and `!_forceRun`: sets status to `idle`, `nextRunAt = null`, does NOT call `run()`
- On `playLoop()` with `interval === 0`: returns `false`
- On `triggerNow()` with `interval === 0` from idle: sets `_stopAfterRun = true`, runs once, returns to `idle`
- Manual loop never enters `running → waiting → running` cycle automatically
- Status lifecycle: `idle` → (trigger) → `running` → `idle`

## Spec 4: Loop Runner

- `runLoop()` skips initial delay when `_forceRun` is true
- `_stopAfterRun` check takes priority over maxRuns check post-run
- When both `_stopAfterRun` and maxRuns are triggered, status is `idle` and `_maxRunsReached` is set

## Spec 5: Foreground Mode

- `loop-task run` rejects interval `0` with error "Manual loops (interval 0) cannot run in foreground mode"

## Spec 6: TUI

- `timingLabel()` returns "manual" for `interval === 0`
- Form wizard skips "Run immediately?" step when interval is "manual" or "0"
- Inspector shows `intervalHuman: "manual"` in the Interval field

## Spec 7: CLI

- `loop-task new 0 -- <cmd>` creates a manual-only loop
- `loop-task new manual -- <cmd>` creates a manual-only loop
- `loop-task status` shows "manual" in the interval/duration display
- `loop-task export` / `loop-task import` handle `interval: 0` / `intervalHuman: "manual"` without error
