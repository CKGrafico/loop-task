# Per-task max runs: GH-58

## Tasks

- [x] Add `maxRuns: number` field to `TaskDefinition` in `src/types.ts` with `DEFAULT_TASK_MAX_RUNS = 5`
- [x] Apply default on create in `TaskManager.create()` and on load in `TaskManager.init()`
- [x] Add per-task run counter (`taskRunCounts` map) in `LoopController` with accessors
- [x] Add per-task maxRuns check in `runLoop` before `executeRunImpl`
- [x] Add per-task maxRuns check in `executeChain` for chained tasks
- [x] Add maxRuns wizard step to `TaskForm` with `parseMaxRuns` validation
- [x] Add i18n keys for maxRuns prompt/hint
- [x] Update all test files with `maxRuns: 5` in TaskDefinition literals
- [x] Update MCP tools schema and HTTP OpenAPI schema with maxRuns field
- [x] Add dedicated test file `tests/per-task-max-runs.test.ts`
