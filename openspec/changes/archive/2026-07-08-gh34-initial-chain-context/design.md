# Design: Initial Context for Chained Tasks

## Approach

Add `context?: Record<string, unknown>` to both `TaskDefinition` and `LoopOptions`. In `run-executor.ts`, initialize `chainContext` with the provided context instead of `{}`. Validation uses the existing `validateContext()` utility.

## Data flow

1. User provides context via CLI `-C`, HTTP body, or TUI form
2. Context validated by `validateContext()` (flat object, no nested/array values)
3. Stored on `TaskDefinition` or `LoopOptions`, persisted automatically
4. At run time, `run-executor.ts` merges `{ ...(task?.context ?? {}), ...(ctrl.options.context ?? {}) }`
5. Loop context overrides task context for same keys
6. Existing `Object.assign(chainContext, parsed)` merge continues for stdout output
