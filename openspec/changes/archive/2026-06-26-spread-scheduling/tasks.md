# Tasks

## 1. Add offset field to types
- [ ] 1.1 Add `offset: number | null` to LoopOptions and LoopMeta in types.ts <!-- agent: development-engineer, depends_on: none, touches: src/types.ts -->

## 2. Implement phase computation
- [ ] 2.1 Create computePhase(loopId, intervalMs) and alignToPhase(now, intervalMs, phaseMs) in a new src/core/scheduling.ts <!-- agent: development-engineer, depends_on: none, touches: src/core/scheduling.ts -->

## 3. Wire phase into loop-controller
- [ ] 3.1 In loop-controller.ts first-run path, use alignToPhase instead of raw interval when offset is set or by default (hash jitter) <!-- agent: development-engineer, depends_on: 1.1,2.1, touches: src/core/loop-controller.ts -->

## 4. Wire offset through loop-config and CLI
- [ ] 4.1 Add offset to LoopCommandOptionsInput and buildLoopOptions in loop-config.ts <!-- agent: development-engineer, depends_on: 1.1, touches: src/loop-config.ts -->
- [ ] 4.2 Add --offset <duration> flag to `new` command in cli.ts <!-- agent: development-engineer, depends_on: 4.1, touches: src/cli.ts -->

## 5. Update manager init to pass offset
- [ ] 5.1 Pass meta.offset through to LoopOptions in manager.ts init <!-- agent: development-engineer, depends_on: 1.1, touches: src/daemon/manager.ts -->

## 6. Verify
- [ ] 6.1 Run typecheck <!-- agent: development-engineer, depends_on: 1.1,2.1,3.1,4.1,4.2,5.1, touches: -->
