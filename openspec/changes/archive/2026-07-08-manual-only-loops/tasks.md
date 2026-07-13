# Tasks: Manual-Only Loops

- [x] T1: Update `parseDuration()` to accept "0" and "manual" (case-insensitive), reject only negative values
- [x] T2: Update `formatDuration()` to return "manual" for value 0
- [x] T3: Update `buildLoopOptions()` to normalize interval 0 → intervalHuman "manual", force immediate=false and offset=null
- [x] T4: Update `LoopController.start()` to skip scheduling for interval 0, set status to idle
- [x] T5: Update `LoopController.playLoop()` to return false for manual loops
- [x] T6: Update `LoopController.triggerNow()` to directly launch run for manual/idle loops
- [x] T7: Update `loop-runner.ts`, check `_forceRun` to bypass initial delay; `_stopAfterRun` before maxRuns post-run
- [x] T8: Update `loop-runner.ts` RunAccess interface to include `_forceRun`
- [x] T9: Update foreground `runLoop()` to reject interval 0
- [x] T10: Update `timingLabel()` in `shared/ui/format.ts` to show "manual" for interval === 0
- [x] T11: Add i18n keys: `format.timingManual`, `errors.manualNoForeground`, `cli.startedStatusManual`, update hints
- [x] T12: Update `useLoopFormValidation.ts` to accept interval 0 and "manual"
- [x] T13: Update `useCreateSteps.tsx` to skip "Run immediately?" step for manual/0
- [x] T14: Update `useHandleComplete.ts` to handle manual interval, force immediate=false
- [x] T15: Update `commands.ts` CLI status to show "manual" for interval 0
- [x] T16: Update duration and loop-config and loop-controller tests
