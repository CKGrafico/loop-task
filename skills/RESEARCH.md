# Research Report: Loop Task Domain Skills

## 1. Repository Scope Inspected

### Source files
- `src/types.ts` — all entity interfaces (Project, TaskDefinition, LoopOptions, LoopMeta, ExecutionResult, RunRecord, LoopStatus)
- `src/core/loop/loop-controller.ts` — LoopController state machine
- `src/core/loop/loop-runner.ts` — main loop execution (runLoop)
- `src/core/loop/run-executor.ts` — single iteration execution (executeRunImpl)
- `src/core/loop/chain-executor.ts` — chain continuation execution
- `src/core/loop/delay-utils.ts` — chunked sleep, pause/resume, trigger
- `src/core/loop/types.ts` — LoopControllerState, TaskResolver
- `src/core/context/context-parser.ts` — stdout parsing (JSON/JSONL/plaintext)
- `src/core/context/template.ts` — {{key}} interpolation with shell escaping
- `src/core/context/validate-context.ts` — initial context validation (flat only)
- `src/core/command/command-runner.ts` — subprocess execution via execa
- `src/core/command/resolve-cwd.ts` — cwd resolution (loop → project → process)
- `src/core/scheduling/index.ts` — computePhase, alignToPhase
- `src/core/logging/log-rotator.ts` — size-based log rotation
- `src/daemon/managers/loop-manager.ts` — LoopManager (CRUD, persist, reconcile)
- `src/daemon/managers/task-manager.ts` — TaskManager (CRUD, reload)
- `src/daemon/managers/project-manager.ts` — ProjectManager (CRUD, default, migration)
- `src/daemon/managers/loop-entry.ts` — createLoopEntry, metaToState
- `src/daemon/managers/loop-options.ts` — buildLoopOptions, StoredLoop
- `src/daemon/managers/loop-serialization.ts` — wireEvents, toMeta, persistLoop
- `src/loop-config.ts` — buildLoopOptions, parseCommandLine, parseMaxRuns
- `src/shared/config/constants.ts` — all magic numbers
- `src/shared/sleep.ts` — abortable chunked sleep

### Tests
- `tests/context-parser.test.ts`
- `tests/initial-context.test.ts`
- `tests/v2-core.test.ts`
- `tests/loop-controller.test.ts`
- `tests/daemon-projects.test.ts`
- `tests/template.test.ts`
- `tests/scheduling.test.ts`

---

## 2. Entity Model

```
Project
  id: string
  name: string
  color: string
  directory?: string
  githubSource?: string
  createdAt: string
  isSystem: boolean
  isDefault: boolean

Loop (LoopOptions + LoopMeta)
  id: string
  projectId: string                    → scopes to one Project
  taskId: string | null                → references one initial Task
  command: string                      → inline fallback when no taskId
  commandArgs: string[]
  commandRaw?: string
  interval: number                     → milliseconds
  intervalHuman: string
  immediate: boolean
  maxRuns: number | null
  offset: number | null
  cwd: string
  description: string
  verbose: boolean
  context?: Record<string, unknown>    → initial context seeding
  status: LoopStatus                   → running | waiting | paused | idle | stopped
  runCount: number
  maxRunsReached: boolean
  ...runtime metadata

Task (TaskDefinition)
  id: string
  name: string
  command: string
  commandArgs: string[]
  commandRaw?: string
  steps?: TaskStep[]
  onSuccessTaskId: string | null       → chains to one Task on success
  onFailureTaskId: string | null       → chains to one Task on failure
  silentChain?: boolean
  context?: Record<string, unknown>    → initial context seeding
  createdAt: string

Iteration Context
  chainContext: Record<string, unknown>
  Created fresh each iteration
  Seeded from task.context + loop.context (loop overrides task for same keys)
  Extended by stdout parsing during chain execution
  Discarded after the iteration completes
  NOT persisted
```

### Relationship diagram

```
Project ──1:N──▶ Loop
Loop ──1:1──▶ Task (initial, via taskId)
Loop ──1:1──▶ inline command (fallback, no taskId)
Task ──0:1──▶ Task (onSuccess)
Task ──0:1──▶ Task (onFailure)
Task ←──────── N:1 ──── referenced by many Loops
Task ←──────── N:1 ──── referenced as chain target by many Tasks
```

---

## 3. Verified Invariants

| Invariant | Source | Confidence |
|---|---|---|
| Every Loop belongs to exactly one Project | `LoopOptions.projectId`, defaults to `"default"` | Verified behaviour |
| A Loop references at most one initial Task | `LoopOptions.taskId: string \| null` | Verified behaviour |
| A Loop may use an inline command instead of a Task | `LoopOptions.command` used when `taskId` is null | Verified behaviour |
| Each Task has at most one success successor | `TaskDefinition.onSuccessTaskId: string \| null` | Verified behaviour |
| Each Task has at most one failure successor | `TaskDefinition.onFailureTaskId: string \| null` | Verified behaviour |
| Iterations do not overlap within one Loop | `loop-runner.ts`: next iteration starts only after current completes | Verified behaviour |
| Context is fresh per iteration | `run-executor.ts:60`: rebuilt from task.context + loop.context each time | Verified behaviour |
| Context is not persisted | Not saved to disk anywhere in the codebase | Verified behaviour |
| Project deletion reassigns Loops to default | `loop-manager.ts:137-143` | Verified behaviour |
| Tasks exist independently from Loops | `TaskManager` is separate from `LoopManager`, stored in `tasks.json` | Verified behaviour |
| Same Task may be referenced by multiple Loops | Reference by ID, not ownership | Verified behaviour |
| Same Task may be a chain target of multiple other Tasks | `onSuccessTaskId`/`onFailureTaskId` are unrestricted references | Verified behaviour |
| Tasks do not belong to a Project | No `projectId` field on `TaskDefinition` | Verified behaviour |
| Failed iterations do not stop future Loop iterations | Loop continues regardless of exit code | Verified behaviour |
| Chain Tasks count as part of the same run (not separate runs) | `runCount++` happens once in `executeRunImpl`, chain does not increment | Verified behaviour |

---

## 4. Lifecycle Findings

### Loop states

| State | Meaning | Persisted | Scheduling | Running Task |
|---|---|---|---|---|
| running | Currently executing work | Yes | N/A | Active |
| waiting | Sleeping until next cadence point | Yes | Counting down | None |
| paused | Intentionally halted; preserves remaining delay | Yes | Suspended | None (or interrupted) |
| idle | Stopped; schedule cleared; does not auto-restart | Yes | Cleared | None |
| stopped | Same as idle (used in some code paths) | Yes | Cleared | None |

**Note:** `idle` and `stopped` are semantically identical in the implementation. `stopLoop()` sets `status = "idle"`. The type `LoopStatus` includes `"stopped"` but the controller always uses `"idle"` for the stopped state.

### State transitions

```
running ──(execution completes)──▶ waiting
running ──(pause)──▶ paused
waiting ──(delay expires)──▶ running
waiting ──(pause)──▶ paused
waiting ──(trigger)──▶ running
paused ──(resume)──▶ waiting (continues remaining delay)
idle ──(playLoop)──▶ waiting (fresh schedule from now)
running ──(stopLoop)──▶ idle
waiting ──(stopLoop)──▶ idle
paused ──(stopLoop)──▶ idle
running ──(maxRunsReached)──▶ paused
```

### Iteration start sequence

1. Loop checks `maxRuns` — if reached, enters `paused` state
2. If paused, waits for resume signal
3. If first run and `nextRunAt` set (restored), waits for that time
4. If first run and `immediate = false`, computes phase delay and waits
5. If first run and `immediate = true`, starts immediately
6. Status becomes `running`, `runCount++`
7. Task resolved, context seeded, steps executed
8. Chain execution if `onSuccessTaskId`/`onFailureTaskId` present
9. Run recorded in history
10. `maxRuns` rechecked
11. Next interval delay computed from `runStartedAtMs + interval`
12. If overrun, missed intervals are counted in `skippedCount` and skipped (not queued)

### Pause semantics

- Pause preserves `remainingDelayMs`
- Resume continues from where the delay was interrupted
- Schedule continues from the original timeline (not reset)
- `pause(true)` also aborts the current running Task

### Stop vs Play semantics

- Stop (`stopLoop`): clears schedule, sets `status = "idle"`, clears `nextRunAt` + `remainingDelayMs`
- Play (`playLoop`): starts from scratch with fresh schedule from now, sets `_resetSchedule = true`

### Restoration after interruption

- Persisted state includes: status, runCount, maxRunsReached, nextRunAt, remainingDelayMs, runHistory, skippedCount
- On daemon restart: Loops with status not `stopped`/`idle` are auto-started
- Running tasks at crash time marked as `completed` in run history (best-effort)
- `nextRunAt` and `remainingDelayMs` are used to resume delay without restarting from zero

### Manual-only loops

- When `interval = 0`: Loop enters `idle` immediately on start
- Only `triggerNow()` executes work
- `playLoop()` returns false for interval=0
- `immediate` flag is ignored
- Each trigger executes once, then returns to `idle`

---

## 5. Context Findings

### Context creation

```typescript
const chainContext: Record<string, unknown> = {
  ...task?.context,    // Task initial context
  ...ctrl.options.context,  // Loop initial context (overrides task)
};
```

Loop context overrides task context for same keys. Verified in `initial-context.test.ts`.

### Stdout capture

- Captured only when: task has chain successors, OR task has multiple steps, OR step has multiple commands
- Stdout is captured via `StdoutCaptureTransform` with `MAX_CONTEXT_STDOUT_BYTES = 1 MB` cap
- If truncated, a warning is written to the log, but captured portion is still parsed
- Both stdout and stderr are streamed to the log file regardless of capture

### Parsing rules (from `context-parser.ts`, verified by `context-parser.test.ts`)

| Input | Detection | Result |
|---|---|---|
| Empty / whitespace-only | `trimmed.length === 0` | `null` (no context change) |
| Valid JSON object | `JSON.parse` succeeds, `isObject` | Keys merged into context |
| JSON string primitive | `JSON.parse` succeeds, `typeof === "string"` | `{ output: String(value) }` |
| JSON number primitive | `JSON.parse` succeeds, `typeof === "number"` | `{ output: "42" }` |
| JSON boolean primitive | `JSON.parse` succeeds, `typeof === "boolean"` | `{ output: "true" }` |
| JSON null | `JSON.parse` succeeds, `value === null` | `{ output: "null" }` |
| JSON array | `JSON.parse` succeeds, `Array.isArray` | `{ output: rawString }` |
| Multiple lines, all valid JSON | Each line parses, all are objects | Shallow merge of all objects |
| Multiple lines, one line is primitive | JSONL detection | Object keys merged, primitive → `output` key |
| Multiple lines, any line invalid JSON | JSONL detection fails | Fall through to plain text |
| Anything else | Fallback | `{ output: trimmedString }` |

### Merge semantics

- `Object.assign(chainContext, parsed)` — shallow merge
- Later keys overwrite earlier keys
- Plain text always stored under `output` key, overwriting previous `output` value
- Structured keys from JSON objects overwrite existing keys with the same name
- No deep merge of nested objects

### Interpolation (from `template.ts`, verified by `v2-core.test.ts`)

- Syntax: `{{key}}` where `key` matches `\w+` (word characters only)
- Missing or null/undefined key → empty string
- Values converted to string via `String(raw)`
- Shell escaping applied: safe characters pass through; others wrapped in single quotes
- Interpolation occurs in: `cmd.command` and each `cmd.commandArgs` entry
- Interpolation occurs before every Task execution (including chain Tasks)
- The initial Task CAN interpolate seeded context (from task.context + loop.context)
- The initial Task has no produced context yet (only seeded context)

### Context lifetime

- Created fresh each iteration (not shared between iterations)
- Not shared between different Loops
- Survives across chain Tasks within the same iteration
- Survives across failure transitions within the same iteration
- Discarded after the iteration completes
- Never persisted to disk

### Initial context validation (from `validate-context.ts`)

- Must be a flat JSON object
- Values must be primitives (string, number, boolean, null)
- Nested objects rejected
- Arrays rejected
- `undefined`/`null` input → empty context `{}`

---

## 6. Unsupported Concepts

| Concept | Finding | Evidence |
|---|---|---|
| Multiple initial Tasks | Unsupported | `LoopOptions.taskId: string \| null` — single reference only |
| Multiple successors (AND/OR) | Unsupported | `onSuccessTaskId` and `onFailureTaskId` are `string \| null` — one each |
| Parallel branches | Unsupported | Chain is a sequential linked list |
| Join nodes | Unsupported | No convergence mechanism in chain executor |
| Condition entities | Unsupported | No `Condition` type exists in `types.ts` |
| Task-level retries | Unsupported | No retry fields on `TaskDefinition` |
| Loop-level retries | Unsupported | No retry fields on `LoopOptions` |
| Exponential backoff | Unsupported | No backoff logic anywhere |
| Timeout properties | Unsupported | No timeout fields on `TaskDefinition` or `LoopOptions` |
| Nested Loops | Unsupported | No mechanism to invoke one Loop from another |
| Sub-Loops | Unsupported | Same as nested Loops |
| Project variables | Unsupported | No variable/config fields on `Project` beyond `directory`/`githubSource` |
| Project credentials | Unsupported | Not present in `Project` type |
| Project concurrency limits | Unsupported | Not present |
| Project execution settings | Unsupported | Not present |
| Task ownership by Project | Unsupported | No `projectId` on `TaskDefinition` |
| Cycle detection | Unsupported | No validation in `TaskManager` or `ChainExecutor` — cycles would infinite-loop |
| Persistent chain context | Unsupported | Context is in-memory only, per iteration |
| Context shared between Loops | Unsupported | Each Loop iteration creates its own context |
| Concurrent iterations within one Loop | Unsupported | `loop-runner.ts` enforces non-overlap |
| MaxRuns counted per chain step | Unsupported | `runCount++` happens once per iteration, chains are included |
| Loop completion state | Ambiguous | After maxRuns Loop enters `paused` (not a distinct "completed" state) |

### Internal parallelism within a step

- Commands within a `TaskStep` execute in parallel via `Promise.allSettled`
- Steps execute sequentially via `for (const step of taskSteps)`
- A step is considered failed if ANY of its commands fail
- Stdout from parallel commands within a step is concatenated with newlines
- This is internal to a single Task execution, not a Loop Task composition primitive

---

## 7. Ambiguities and Inconsistencies

### `idle` vs `stopped` states

- `LoopStatus` type includes both `"idle"` and `"stopped"`
- `stopLoop()` always sets `status = "idle"`
- The `finally` block in `runLoop()` may set `status = "stopped"` when the loop exits without an explicit stop
- These states appear interchangeable in practice
- Tests verify `stopLoop()` → `idle`, and the test `transitions running → paused → resumed → running → stopped` actually ends at `idle`

### maxRuns → paused (not "completed")

- When `maxRuns` is reached, the Loop enters `paused` state
- There is no distinct "completed" or "finished" state
- This means a maxRuns-reached Loop looks the same as a manually paused Loop
- `isMaxRunsReached` flag distinguishes them, but the status value is identical
- `playLoop()` returns false when `maxRunsReached` is true
- `clearMaxRunsReached()` resets the flag and run count, allowing playLoop again

### `silentChain` is minimally documented

- `TaskDefinition.silentChain?: boolean` — when true, chain Task output goes to a null stream
- Not mentioned in README
- Not tested extensively
- The chain counter `silentChainCount` is incremented but its purpose is unclear

### `offset` property

- `LoopOptions.offset: number | null` — overrides the computed phase
- When null, `computePhase(loopId, interval)` determines the spread
- When set, that value is used directly as the phase
- Not prominently documented

### `context` validation inconsistency

- `validate-context.ts` rejects nested objects and arrays as values
- But `run-executor.ts` uses `Object.assign` which would accept them at runtime
- The validation is applied at creation time (CLI/UI), but the runtime would not reject them
- Tests confirm validation rejects nested objects and arrays

### `steps` field on TaskDefinition

- `steps?: TaskStep[]` — multi-step Task execution
- Each `TaskStep` has `commands: TaskCommand[]` (parallel within step, sequential across steps)
- When `steps` is absent or empty, a single-step fallback is created from `command`/`commandArgs`
- This is an advanced feature not covered in most documentation
- Affects stdout capture: `shouldCaptureStdout` is true when `taskSteps.length > 1` or first step has multiple commands

---

## 8. Skill-Boundary Rationale

### Why cadence and iteration belong to Loops skill

- Cadence (interval, immediate, offset) is a Loop property, not a Task property
- The iteration lifecycle (when to start, how to count runs) is owned by the Loop
- maxRuns is a Loop constraint on its own execution
- Non-overlap is a Loop guarantee, not a Task concern

### Why output and chaining belong to Tasks skill

- onSuccess/onFailure are Task properties
- Context production (stdout → parsed keys) is a Task execution result
- Context consumption (interpolation) occurs at Task execution time
- The chain is an execution graph formed by Task references

### Why organizational grouping belongs to Projects skill

- Project only affects which Loops are grouped together
- Project does not affect execution, scheduling, or context
- Project is intentionally narrow: name, color, directory, githubSource

### Why Loops still include enough Task composition knowledge

- A user designing a Loop MUST specify an initial Task or inline command
- A user designing a Loop MUST understand the chain flow (success/failure paths) to plan the complete iteration
- The Loops skill covers "what chain behaviour to expect" without defining "how stdout is parsed"
- Cross-references point to the Tasks skill for exact output and interpolation semantics

### Why Tasks remain independently useful

- A user designing a Task chain does not need to know cadence details
- A user can reason about context flow and transitions without a Loop
- Task reuse and composition patterns make sense without a specific Loop

### Why Projects are intentionally narrow

- Source code confirms Projects have no execution-affecting properties
- Overclaiming Project capabilities would mislead users into expecting isolation or configuration that doesn't exist
- The skill explicitly documents what Projects do NOT control

---

## 9. Interface-Independence Audit

Each skill file has been checked for the following forbidden interface references. Results:

| Check | Loops SKILL.md | Tasks SKILL.md | Projects SKILL.md |
|---|---|---|---|
| CLI commands | PASS | PASS | PASS |
| CLI flags | PASS | PASS | PASS |
| Terminal/TUI references | PASS | PASS | PASS |
| HTTP/REST/API endpoints | PASS | PASS | PASS |
| MCP server/tools | PASS | PASS | PASS |
| SDK/library usage | PASS | PASS | PASS |
| IPC/transport details | PASS | PASS | PASS |
| Installation instructions | PASS | PASS | PASS |
| Deployment details | PASS | PASS | PASS |
| UI forms/buttons | PASS | PASS | PASS |

The word "command" appears only when referring to the executable payload inside a Task (the `command` field of `TaskDefinition`), which is part of the domain model. References were rephrased to "executable payload" or "work" where possible.

---

## 10. Confidence and Open Questions

### High confidence

- Entity model and relationships (directly from `types.ts`)
- State transitions (from `loop-controller.ts` + tests)
- Context lifecycle and parsing (from `context-parser.ts` + tests)
- Project semantics (from `project-manager.ts` + tests)
- Non-overlap guarantee (from `loop-runner.ts`)
- Missed-interval skipping (from `loop-runner.ts`)

### Medium confidence

- `idle` vs `stopped` distinction — they appear functionally identical but the type includes both. The skill documents `idle` as the canonical stopped state.
- `steps` (multi-step Tasks) — the feature exists but is minimally documented. The skill mentions it but does not make it central.
- Whether `context` validation (rejecting nested objects/arrays) is enforced at all entry points or only at CLI creation. Tests confirm the validation function rejects them.

### Open questions

1. **Cycle handling**: Can a Task chain reference itself? `onSuccessTaskId: self.id`? The code has no validation against it. A chain cycle would infinite-loop. The skill must warn against this.
2. **Concurrent separate Loops**: Can two Loops reference the same Task and execute it concurrently? Yes — each Loop iteration has its own context and the Task is resolved by ID each time. But side effects of the Task's executable payload are not protected.
3. **`totalRunCount`**: `LoopMeta` has `totalRunCount` (optional) in addition to `runCount`. Purpose unclear from code — may be for tracking runs across resets. Not documented enough to include as a canonical property.
4. **`silentChainCount`**: Incremented when a chain Task has `silentChain: true`. Not documented. Excluded from skills as implementation detail.
