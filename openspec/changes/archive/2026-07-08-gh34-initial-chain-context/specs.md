# Specs: Initial Context for Chained Tasks

## AC1: context field on TaskDefinition and LoopOptions

- Add `context?: Record<string, unknown>` to both types in `src/types.ts`
- Default value is `undefined` (treated as `{}` at runtime)

## AC2: Context seeded into chainContext before first task

- `src/core/loop/run-executor.ts:57` initializes with `{ ...(task?.context ?? {}), ...(ctrl.options.context ?? {}) }`
- Loop context takes precedence over task context for overlapping keys

## AC3: Context propagates through chain

- Existing `Object.assign(chainContext, parsed)` merge unchanged
- User-provided keys available in every chain step unless overwritten by stdout

## AC4: TUI input for context

- New step in TaskForm after onFailure step
- Optional, uses CodeEditorModal for JSON input
- Validates with `validateContext()` on advance and submit

## AC5: CLI argument

- `--context`/`-C` flag on `new` and `run` commands
- Accepts JSON string, validates before starting

## AC6: HTTP API support

- Context field accepted on POST/PATCH loops and tasks
- Validated server-side with `validateContext()`

## AC7: Persistence

- Context is part of `TaskDefinition`/`LoopOptions`, persisted automatically by existing state management
