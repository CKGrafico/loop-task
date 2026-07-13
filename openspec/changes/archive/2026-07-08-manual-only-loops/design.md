# Design: Manual-Only Loops

## Key Decisions

1. **`interval: 0` is the canonical representation**, no new type field needed. `intervalHuman: "manual"` is the display string.
2. **No new `LoopStatus`**, `idle` suffices for a manual-only loop at rest. It transitions to `running` during a trigger, then back to `idle`.
3. **`triggerNow()` reuses existing one-shot pattern**, `_stopAfterRun` flag causes the loop to return to `idle` after one execution.
4. **`playLoop()` is disabled for manual loops**, there is no schedule to start.
5. **`immediate` and `--now` are silently ignored** for manual loops (set to `false`/`null` regardless of input).

## Affected Files

| File | Change |
|------|--------|
| `src/duration.ts` | Accept `0` and `manual` in `parseDuration()`; `formatDuration(0)` → `"manual"` |
| `src/loop-config.ts` | `buildLoopOptions()` normalizes interval 0 to intervalHuman "manual", forces immediate=false, offset=null |
| `src/core/loop/loop-controller.ts` | `start()` short-circuits for interval 0; `playLoop()` returns false; `triggerNow()` directly launches run for manual loops |
| `src/core/loop/loop-runner.ts` | Checks `_forceRun` to bypass initial delay; `_stopAfterRun` before maxRuns post-run |
| `src/core/foreground/index.ts` | Rejects interval 0 |
| `src/shared/ui/format.ts` | `timingLabel()` shows "manual" for interval === 0 |
| `src/shared/i18n/en.json` | New keys: `format.timingManual`, `errors.manualNoForeground`, `cli.startedStatusManual` |
| `src/shared/hooks/useLoopFormValidation.ts` | Accepts interval 0 and "manual" |
| `src/widgets/loop-form/useCreateSteps.tsx` | Skips "Run immediately?" step for manual/0 |
| `src/widgets/loop-form/useHandleComplete.ts` | Handles manual interval, forces immediate=false |
| `src/client/commands.ts` | CLI status shows "manual" for interval 0 |
