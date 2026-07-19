---
name: loop-task-loops
description: >
  Understand and design Loop Task Loops: cadence, iteration lifecycle, state
  transitions, non-overlapping execution, maximum iterations, chain flow
  composition, and safe recurring automation patterns. Load this skill when
  creating, reviewing, or modifying a recurring Loop or reasoning about how
  its Task chain behaves across iterations.
---

# Loop Task Loops

A Loop represents a recurring objective.
A Loop decides when an iteration starts.
Its initial Task decides what work begins.
Task transitions decide what follows.
The iteration ends when no further Task transition is selected.
The Loop then waits for its next eligible iteration.

## What a Loop Is

A Loop is a scheduled recurring execution. It defines **when** something runs — not **what** runs. The "what" is defined by its initial Task or inline executable payload.

A Loop is **not** a Task. A Task is one unit of executable work. A Loop schedules Tasks to run repeatedly.

A Loop is **not** a Project. A Project is an organisational scope. A Loop belongs to one Project.

A Loop **references** an initial Task — it does not embed it permanently. The same Task can be reused by multiple Loops. A Loop may also carry an inline executable payload instead of referencing a Task.

A Loop is defined by its purpose (what recurring goal it serves), its cadence (how often it iterates), and its initial Task or payload (what starts each iteration).

## Loop Properties

| Property | Domain Meaning |
|---|---|
| purpose (description) | Human-readable statement of the recurring objective |
| cadence (interval) | How often iterations become eligible |
| initial Task (taskId) | The first Task to execute in each iteration, or null for inline payload |
| inline payload (command + commandArgs) | Executable work to run when no Task is referenced |
| Project membership (projectId) | Which Project scopes this Loop |
| immediate | Whether the first iteration runs without waiting |
| maximum iterations (maxRuns) | Optional limit on how many iterations execute |
| working directory (cwd) | Where executable payloads run |
| initial context (context) | Key-value pairs seeded into every iteration's context |
| offset | Overrides the computed phase for spread scheduling |

For exhaustive detail on every property, see [references/domain-reference.md](references/domain-reference.md).

## Cadence and Scheduling

### What cadence means

Cadence is the recurring interval at which a Loop becomes eligible to start a new iteration. It is expressed as a human-readable duration and converted to milliseconds internally.

Supported intervals: seconds, minutes, hours, days, weeks (e.g. `30s`, `5m`, `1h`, `1d`, `1w`).

### When the first iteration becomes eligible

- **immediate = true**: The first iteration starts right away. No initial delay.
- **immediate = false**: The first iteration waits for a computed phase delay before becoming eligible. This delay distributes Loops across their interval to avoid thundering herd.

### When the next iteration is scheduled

The next iteration is scheduled relative to the **start** of the current iteration, not its end.

If an iteration completes before the next cadence point, the Loop waits the remaining time. If an iteration lasts longer than the cadence, missed cadence points are **skipped** — they are counted but **not queued**. The next iteration starts at the earliest available cadence point.

### Manual-only Loops

When the cadence is set to zero (manual), the Loop never auto-schedules. Each iteration must be triggered explicitly. After each trigger, the Loop returns to an idle state. The immediate flag is ignored for manual Loops.

### Spread scheduling

Loop Task distributes the start time of each Loop across its interval using a deterministic hash of the Loop identifier. This prevents all Loops with the same cadence from starting simultaneously. The offset property overrides this computed phase if a specific alignment is needed.

### What happens after restoration

After an interruption (such as a daemon restart), a Loop is restored with its persisted schedule information. If the Loop was in a running or waiting state, it resumes from its persisted `nextRunAt` or `remainingDelayMs`. Running tasks at the time of interruption are marked as completed in the run history.

## Iteration Lifecycle

1. The Loop becomes eligible (cadence point reached, or manual trigger).
2. `runCount` increments by exactly **one**. The full chain counts as one iteration.
3. A **fresh iteration context** is created. It is seeded from the initial Task's context and the Loop's context (Loop context overrides Task context for the same keys).
4. The initial Task (or inline payload) executes.
5. If the initial Task has a successor defined (`onSuccessTaskId` or `onFailureTaskId`), chain execution begins.
6. Chain Tasks execute **sequentially**, each following the success or failure transition.
7. Context accumulates across the chain (stdout is parsed and merged at each step).
8. The chain terminates when a Task has no successor for its result, or when a referenced successor does not exist.
9. The iteration is recorded in the run history.
10. The Loop checks whether `maxRuns` has been reached.
11. The Loop calculates the next cadence point and enters a waiting state.

## State Model

| State | Meaning | Scheduling | Running Task |
|---|---|---|---|
| running | Currently executing work | Inapplicable | Active |
| waiting | Sleeping until next cadence point | Counting down | None |
| paused | Intentionally halted | Suspended (preserves remaining delay) | None |
| idle | Stopped (schedule cleared) | Cleared | None |

Key transitions:

- **running → waiting**: Execution completes, waiting for next interval
- **running → paused**: Pause requested
- **waiting → running**: Delay expires or manual trigger
- **waiting → paused**: Pause requested
- **paused → waiting**: Resume (continues from the interrupted point in the schedule)
- **idle → waiting**: Play (fresh schedule starting from now)
- **any active → idle**: Stop (clears schedule entirely)

For the full state-transition diagram and restoration semantics, see [references/lifecycle.md](references/lifecycle.md).

## Maximum Iterations

- `maxRuns` is optional. When omitted or null, the Loop runs **unlimited** iterations.
- Each full iteration (including all chain Tasks) counts as **one** run.
- Failed iterations count toward `maxRuns`.
- Manually triggered iterations count toward `maxRuns`.
- After reaching `maxRuns`, the Loop enters the **paused** state. There is no distinct "completed" state.
- A paused Loop that reached `maxRuns` cannot resume or play until the limit is explicitly cleared.
- Clearing the max-runs flag resets the run count to zero and allows the Loop to be played again.

`maxRuns` differs from retries: it limits how many iterations a Loop performs, not how many times a failing Task is retried. Loop Task does not provide native retry logic.

## Non-overlap

A Loop **will not** start another iteration while one is already executing. The next iteration waits for the current to complete and then waits the remaining interval time.

Separate Loops **can** execute concurrently — they are independent.

Tasks within the same chain execute **sequentially** — they never overlap within a single iteration.

**Non-overlap does not make side effects safe.** Two separate Loops that modify the same external resource can still interfere. An iteration that partially completes before failing may have already changed external state. Design Tasks to be idempotent or to guard against unintended repeated effects.

Missed cadence points are **skipped**, not queued. If an iteration takes longer than the cadence, the Loop skips the missed points and runs the next iteration at the earliest available cadence point.

## Loop Composition

To transform a recurring objective into a complete Loop:

1. **State the recurring objective.** What goal does this Loop serve?
2. **Define what one successful iteration accomplishes.** What is the desired end state after a single run?
3. **Choose an appropriate cadence.** How often should this objective be pursued?
4. **Decide whether the first iteration should run immediately.** Is there a reason to wait?
5. **Define a maximum iteration limit when appropriate.** Should this Loop stop after N iterations?
6. **Identify the initial Task.** What work begins each iteration?
7. **Define success transitions.** What should happen when the initial Task succeeds?
8. **Define failure transitions.** What should happen when the initial Task fails?
9. **Define the terminal success outcome.** What does a complete iteration look like?
10. **Define the terminal failure outcome.** What happens when the chain cannot recover?
11. **Identify data that must flow through the chain.** Which values must later Tasks consume from earlier ones?
12. **Make repeated execution safe.** Ensure Tasks are idempotent or guarded against unintended repetition.
13. **Assign the Loop to an appropriate Project.** Which organisational scope does this belong to?

## One Loop or Multiple Loops

**Use one Loop when:**
- All Tasks contribute to one recurring objective
- They share one cadence
- They belong to one iteration outcome
- Later work depends on earlier work in the same iteration

**Use multiple Loops when:**
- Objectives are unrelated
- Cadences differ
- Failure isolation is important
- Work can proceed independently
- One flow should not block another
- Separate lifecycle control is needed

Separate Loops **can** reference the same Task. Task reuse across Loops is supported — but context dependencies and side-effect conflicts must be managed by the designer.

## Complete-Flow Reasoning

When designing or reviewing a Loop, reason about the entire chain:

- The initial Task starts the flow.
- `onSuccess` advances it along the success path.
- `onFailure` routes it to the failure path.
- The absence of a next transition **terminates** the iteration.
- A recovery Task (reached via `onFailure`) can define its own `onSuccess` to return to productive work — but it cannot literally return to an earlier position in the chain. It simply continues forward from the recovery point.
- **Cycles are not prevented.** A Task can reference another Task that eventually references it back. This creates an infinite chain execution loop. **Avoid cycles.** Loop Task does not validate against them.
- A failed iteration does **not** stop future Loop iterations. The Loop continues to the next cadence point regardless of the exit code.
- Context remains available throughout the chain, across success and failure transitions alike.
- Context is **discarded** after the iteration completes. The next iteration starts with a fresh context.

For exact Task output parsing and interpolation semantics, load `loop-task-tasks`.

## Conditions from the Loop Perspective

Loop Task does **not** provide a first-class Condition entity.

Conditions are modelled through Task result semantics:

- A Task evaluates the condition (e.g., "does eligible work exist?", "is the deployment healthy?").
- **Success** selects `onSuccess`.
- **Failure** selects `onFailure`.

Condition use cases:

| Condition | Represented by |
|---|---|
| Eligible work exists | Task succeeds |
| No work exists | Task fails (chain terminates, Loop waits for next iteration) |
| Validation passed | Task succeeds |
| Validation failed | Task fails → recovery or termination |
| Remote state is synchronized | Task succeeds |
| Remote state is out of sync | Task fails → synchronization Task |
| Tests passed | Task succeeds |
| Tests failed | Task fails → notification or recovery |

**Recommendation:** When "no eligible work" is a normal, expected state (not an error), design the selection Task so that finding no work is the **success** outcome with no `onSuccess` transition. This lets the iteration terminate cleanly and the Loop waits for the next cadence point. If finding no work is expressed as **failure**, it triggers `onFailure`, which may produce unintended side effects if a recovery path is defined.

## Parallelism and Composition Semantics

Tasks inside one chain run **sequentially**. Each Task completes before the next begins.

Each Task has **at most one** successor on success and **at most one** on failure.

**Loop Task does not provide:**
- Native parallel branches
- AND join nodes
- OR join nodes
- Fan-out (one Task triggering multiple successors)
- Fan-in (multiple predecessors joining into one synchronisation point)

**AND and OR are not first-class Loop Task entities.** A Task may execute an external expression containing AND-like or OR-like shell operators (`&&`, `||`), but Loop Task only observes the **final success or failure result** of that Task. Shell operators are internal to the Task's executable payload; they do not create separate Loop Task composition primitives.

**Multiple Loops may run independently.** If you need concurrent work, use separate Loops with their own cadences. Each Loop runs its own iterations independently.

**Commands within a single Task Step** execute in parallel (internally via `Promise.allSettled`), but this is an implementation detail of multi-step Tasks, not a Loop Task composition primitive visible in the chain graph.

## Loop Antipatterns

- **One Loop containing unrelated objectives.** Use separate Loops for separate recurring goals.
- **Unclear iteration outcome.** Every iteration should have a well-defined terminal path for both success and failure.
- **No terminal path.** A chain that always transitions to another Task without termination creates an infinite execution within one iteration.
- **Intervals shorter than normal execution time.** This guarantees missed cadence points on every iteration. Increase the cadence or shorten the work.
- **Assuming missed intervals queue.** Missed cadence points are skipped, not accumulated.
- **Relying on overlapping execution.** Iterations within one Loop never overlap.
- **Destructive work without guards.** Repeated execution of a Task that creates resources, sends notifications, or mutates state must be idempotent.
- **Non-idempotent repeated effects.** If a Task creates a resource, it must handle the "already exists" case.
- **Using infinite iteration without observation or limits.** Unattended Loops with unlimited runs should include monitoring.
- **Assuming one failed iteration stops the Loop.** A failed iteration does not prevent future iterations.
- **Using failure for ordinary no-work states.** When finding no work is normal, represent it as success with no successor, not as failure.
- **Assuming context persists between iterations.** Context is discarded after each iteration.
- **Embedding all logic into one enormous Task.** Prefer a chain of small, focused Tasks for observability and context flow.
- **Splitting every small action into a separate Loop.** Use a Task chain within one Loop when later work depends on earlier results.
- **Creating multiple Loops when one chain is required for consistency.** If Tasks must share context within one iteration, they belong in the same Loop's chain.
- **Using one Loop for workflows with different cadences.** Each cadence needs its own Loop.
- **Hidden dependencies on mutable external state.** External state can change between iterations. Verify assumptions inside each Task.
- **Accidental cycles in Task chains.** Loop Task does not validate against cycles. A cycle causes infinite execution within one iteration.

## Cross-Skill References

- For exact Task output parsing, interpolation semantics, and chain execution details, load **`loop-task-tasks`**.
- For Project organisation and membership rules, load **`loop-task-projects`**.
- For cadence design examples and advanced patterns, see [references/patterns.md](references/patterns.md) and [references/examples.md](references/examples.md).
