---
name: loop-task-tasks
description: >
  Understand and design Loop Task Tasks: executable work units, success and
  failure semantics, Task chaining via onSuccess and onFailure, context
  production and consumption, stdout parsing, parameter interpolation,
  condition modelling, reuse, and idempotency. Load this skill when creating,
  reviewing, or modifying Tasks or reasoning about how a Task chain flows
  context between steps.
---

# Loop Task Tasks

A Task is one reusable unit of executable work.
A Task receives the current iteration context.
It performs work.
Its result is success or failure.
Its output may extend the context.
Its result selects onSuccess or onFailure.

## What a Task Is

A Task is a unit of executable work that produces a binary result: success or failure. Tasks exist independently from Loops. They are first-class entities with their own identity, lifecycle, and persistence.

A Task is **not** a Loop. A Loop schedules recurring execution. A Task defines what happens during an iteration.

A Task is **not** a Project. Projects organise Loops. Tasks are not scoped to Projects.

A Task is **not** a condition, a branch, or a join. It is one executable step that routes to at most one successor on success and one on failure.

Tasks exist independently from the Loops that reference them. The same Task can be the initial Task of multiple Loops. The same Task can be the chain successor of multiple other Tasks. This makes Tasks highly reusable — and requires careful attention to context dependencies and side effects.

An inline payload (defined directly on a Loop) is equivalent to an anonymous Task with no successors. It cannot chain. When chaining is needed, define a named Task.

## Task Properties

| Property | Domain Meaning |
|---|---|
| name | Human-readable label for the Task |
| executable payload (command + commandArgs) | The work the Task performs |
| onSuccess | Reference to the next Task to execute on success, or null |
| onFailure | Reference to the next Task to execute on failure, or null |
| context | Initial key-value pairs seeded into the iteration context before this Task runs |
| silentChain | Whether the Task's chain output is suppressed from logs |
| steps | Multi-step execution: steps run sequentially; commands within a step run in parallel |

For exhaustive detail on every property, see [references/domain-reference.md](references/domain-reference.md).

## Execution Contract

A Task executes within the working directory resolved from the Loop's `cwd` and the Project's `directory`. It inherits the process environment of the runtime.

### What starts a Task

- A Loop starts its initial Task at the beginning of each iteration.
- The chain executor starts a successor Task when a predecessor's result selects it.

### What input a Task receives

The Task receives the **iteration context** — a key-value map that has been built up by previous Tasks in the chain (or seeded from the Task's own `context` property and the Loop's `context` property).

The initial Task in a chain receives context seeded from `task.context` and `loop.context`. Loop context overrides Task context for the same keys.

### What determines success and failure

- **Process exit code 0** = success.
- **Process exit code non-zero** = failure.
- A process that cannot start (e.g., executable not found) = failure.
- A process that is killed or aborted = failure.

**stderr does not affect success or failure.** Only the exit code matters.

### What output a Task produces

- **stdout** is captured and parsed into context when the Task has chain successors, multiple steps, or multi-command steps.
- **stderr** is written to the log file but is **not** captured for context.
- When stdout is captured, it is capped at 1 MB. If the output exceeds this, it is truncated and a warning is written to the log.
- When stdout is not captured (no successors, single command, single step), output goes directly to the log without context parsing.

For the complete context lifecycle including parsing rules, see [references/context.md](references/context.md).

## Success and Failure

### Process success vs domain success

Loop Task uses the process exit code to determine success and failure. This means the Task's **domain outcome** must be translated into the process exit code.

- **Process success** (exit code 0): The Task completed its work without errors.
- **Process failure** (exit code non-zero): The Task encountered an error or the condition it evaluated was not met.

**A Task MUST translate its domain outcome into the exit code semantics Loop Task understands.** For example, if "no eligible item exists" should terminate the chain normally, the Task must exit with code 0 (success) — or, more commonly, exit with a non-zero code and the Loop relies on the absence of an `onFailure` transition for clean termination.

### When to use success vs failure for "no work"

| Desired behaviour | Recommended representation |
|---|---|
| No work found + chain terminates quietly | Failure with no `onFailure` transition |
| No work found + send notification | Failure with `onFailure` pointing to a notification Task |
| No work found + continue as if work succeeded | Success with no `onSuccess` transition (means "nothing to do, we're done") |

See the `loop-task-loops` skill's "Empty-work iteration" pattern for detailed guidance.

## onSuccess and onFailure

Each Task may define at most **one** successor on success (`onSuccessTaskId`) and **one** on failure (`onFailureTaskId`).

| Task result | onSuccess defined? | onFailure defined? | Outcome |
|---|---|---|---|
| Success | Yes | Any | Execute the onSuccess Task |
| Success | No | Any | Chain terminates — iteration ends |
| Failure | Any | Yes | Execute the onFailure Task |
| Failure | Any | No | Chain terminates — iteration ends |

### Key behaviours

- Both are optional. A Task with neither successor always terminates the chain.
- When only one transition is defined, the other result (if it occurs) terminates the chain.
- A failure recovery Task can define its own `onSuccess`, continuing the chain from the recovery point forward. It **cannot** return to an earlier Task in the chain — the chain only moves forward.
- A success Task can route to a failure path via its `onSuccess` pointing to a Task that later fails. The chain follows the live result at each step.
- The selected successor Task immediately receives the current iteration context (including all context accumulated so far).

### Chain termination conditions

The chain terminates when:
1. A Task's result has no matching successor (e.g., success with no `onSuccess`).
2. A referenced successor Task does not exist (the ID is invalid or the Task was deleted).
3. The process is aborted externally.

For the complete chaining model, see [references/chaining.md](references/chaining.md).

## Chaining Model

The chain is a **linked list with two possible transitions** at each node. It is **not** a DAG, a tree, or a general graph — because cycles are possible (though dangerous).

Each Task has at most two outgoing edges: one for success and one for failure. The chain follows exactly one edge per step.

### Chain properties

- **Sequential progression**: Tasks in a chain execute one at a time.
- **No branching**: Each Task routes to exactly one successor based on its result.
- **No convergence**: There is no synchronisation mechanism where multiple paths rejoin.
- **Shared successors**: Multiple Tasks can reference the same successor. This is valid and useful for shared finalisation or recovery Tasks.
- **No maximum depth**: There is no enforced limit on chain length. Extremely deep chains risk long-running iterations.
- **Cycle risk**: A chain can form a cycle (Task A → Task B → Task A). This creates an infinite execution loop within one iteration. Loop Task does **not** validate against cycles. **Avoid cycles.**

For truth tables, cycle analysis, and termination rules, see [references/chaining.md](references/chaining.md).

## Context Lifecycle

### When context is created

A fresh iteration context is created at the start of each iteration, before the first Task executes.

### Initial seeding

```
chainContext = { ...task.context, ...loop.context }
```

- The initial Task's `context` property is applied first.
- The Loop's `context` property is applied second, overriding overlapping keys.
- If neither provides context, the iteration context starts empty.

### How stdout extends context

After each Task executes (that has chain successors or multi-step/parallel commands), its stdout is parsed and merged into the iteration context via `Object.assign`. Later keys overwrite earlier keys.

For the complete parsing rules and merge semantics, see [references/context.md](references/context.md).

### Interpolation

Before a Task executes, any `{{key}}` placeholders in its command and arguments are replaced with the current value of `key` from the iteration context.

- Syntax: `{{key}}` where `key` is one or more word characters (`[A-Za-z0-9_]`).
- Missing key → empty string (not an error).
- Values are converted to strings via `String(value)`.
- Values are shell-escaped before substitution to prevent injection.
- The initial Task **can** interpolate seeded context (from `task.context` + `loop.context`). It has no produced context yet, only seeded values.
- Interpolation occurs **before every Task** in the chain, not just the initial one.

### When context is discarded

Context is discarded after the iteration completes. It is **not** persisted. The next iteration starts with a fresh context.

Context is **not** shared between different Loops. Each Loop iteration has its own context.

Context **survives** across success and failure transitions within the same iteration. A recovery Task can access context produced by earlier Tasks in the chain.

### What context does NOT contain

Context does **not** include:
- Loop metadata (id, cadence, run count)
- Project metadata (name, color)
- Task metadata (name, id)
- Previous iteration's context
- Other Loops' contexts

## Conditions

Loop Task does **not** provide a first-class Condition entity.

Conditions are modelled through Task result semantics:

1. **Domain condition**: A real-world decision (e.g., "does work exist?", "are tests passing?", "is the deployment healthy?")
2. **Task evaluation**: The Task's executable work evaluates the condition.
3. **Transition result**: The Task expresses the outcome as success (exit code 0) or failure (non-zero), selecting `onSuccess` or `onFailure`.

### Condition use cases

| Condition | How to model |
|---|---|
| Eligible work exists | Selection Task succeeds (produces context about the work) |
| No work exists | Selection Task fails (with no onFailure, chain terminates) |
| Validation passed | Validation Task succeeds → proceed |
| Validation failed | Validation Task fails → recover or report |
| Remote state is synchronized | Sync-check Task succeeds → continue |
| Tests passed | Test Task succeeds → proceed |
| Tests failed | Test Task fails → recover or report |

### Limitation of two result channels

A Task produces exactly one of two results: success or failure. This means a single Task cannot directly model tri-state conditions (e.g., "healthy / degraded / down"). To model tri-state logic:

- Use **two successive Tasks**: the first distinguishes between healthy and not-healthy; the second (reached via `onFailure`) distinguishes between degraded and down.
- Or encode the tri-state in the Task's stdout as context (e.g., `{ status: "degraded" }`), and have a downstream Task read and act on it — but note that the routing still depends on exit code, not context values.

For recommended condition patterns, see [references/conditions.md](references/conditions.md).

## AND, OR, and Parallel Execution

### What Loop Task supports

- Each Task has **one** successor on success and **one** on failure.
- Tasks within a chain execute **sequentially**.
- Multiple Loops may run **independently** (concurrent at the Loop level).

### What Loop Task does NOT support

- **Native parallel branches**: A Task cannot fork into multiple concurrent successors.
- **AND joins**: There is no mechanism to wait for multiple branches to complete.
- **OR joins**: There is no mechanism to proceed when any one branch completes.
- **Fan-out**: A Task cannot trigger multiple successors simultaneously.
- **Fan-in**: Multiple predecessors cannot synchronise into a single join point.

### Shell operators within a Task

A Task's executable payload may contain shell operators such as `&&` (AND) and `||` (OR). These affect the **internal execution** of that Task's subprocess. Loop Task observes only the **final exit code** of the subprocess.

For example, a Task with the payload `test -f file && process-file || echo "skipped"` is still **one Task** from Loop Task's perspective. The `&&` and `||` are internal to the shell. Loop Task sees only the final success or failure.

### Achieving parallelism

If concurrent execution is needed, use **separate Loops** with their own cadences. Each Loop runs independently. However, separate Loops do **not** share context. Data must be exchanged through external mechanisms (files, environment, external state).

### Commands within a Task Step

A Task Step can define multiple commands that execute in **parallel** (internally via `Promise.allSettled`). If any command in a step fails, the step is considered failed and subsequent steps are skipped. This is an internal implementation detail for multi-command Tasks, not a Loop Task composition primitive.

## Task Reuse

The same Task can be referenced by:
- Multiple Loops as their initial Task
- Multiple other Tasks as their `onSuccess` or `onFailure` successor

### Benefits of reuse

- Single source of truth for common work (e.g., a shared finalisation or notification Task)
- Consistent behaviour across multiple chains
- Easier maintenance — change the Task once, all consumers are updated

### Dangers of reuse

- **Context dependencies**: The reused Task may assume certain context keys exist. If a predecessor does not produce them, interpolation produces empty strings.
- **Working directory dependencies**: The Task inherits the working directory of the Loop, not the predecessor. Different Loops may have different `cwd` values.
- **Side-effect dependencies**: If the Task mutates external state, concurrent execution from separate Loops may cause conflicts.
- **Naming conventions**: Descriptive Task names help avoid accidental reuse of Tasks with hidden assumptions.

### When to duplicate instead of reuse

Duplicate a Task when:
- The reused Task has context assumptions that cannot be guaranteed by all consumers
- The Task's side effects need to differ per consumer
- The copy will diverge in purpose over time
- The shared reference creates an unclear dependency graph

Task updates propagate **by reference**. Changing a reused Task's executable payload or successors affects all consumers immediately.

## Idempotency and Safe Repetition

Because Loops repeat, Tasks must be safe to execute multiple times. Design Tasks that remain correct when:

- The Loop repeats on its next cadence
- A previous iteration partially completed before failing
- A failure path executed and then a recovery Task ran
- External state changed between iterations
- A human also modified the same resource

### Idempotency patterns

| Pattern | Description |
|---|---|
| Inspect before changing | Read the current state and check whether the change is needed before applying it |
| Reserve before processing | Claim exclusive ownership of a work item before starting work |
| Verify before finalizing | Independently confirm a result before marking it as complete |
| Compare expected state | Check that the target is in the expected state before mutating |
| Use stable identifiers | Reference items by immutable IDs, not by mutable names or positions |
| Separate selection from mutation | Find work in one Task, modify it in another |
| Release reservations on failure | If processing fails, release any claim or lock |
| Make finalization conditional | Only mark work as complete if the result matches expectations |
| Avoid duplicate creation | Check whether a resource already exists before creating it |
| Handle "already done" gracefully | If the work was already completed (e.g., by a human), succeed without action |

### Context safety

- Do not treat interpolation values as trusted input. They come from stdout parsing, which may contain unexpected data.
- Validate identifiers (e.g., issue numbers, file paths) before using them in destructive operations.
- Shell escaping is applied automatically during interpolation, but complex values (multiline, special characters) may still cause issues.

## Task Antipatterns

- **Enormous Tasks containing an entire workflow.** Prefer a chain of small, focused Tasks for observability and context flow.
- **Tasks with unclear success criteria.** A Task's purpose must map clearly to an exit code.
- **Relying on stderr to indicate failure without exit-code alignment.** stderr is logged but does not affect the success/failure result.
- **Producing noisy stdout when structured output is expected.** Logging mixed with JSON output confuses the context parser.
- **Using plain text when named values are needed later.** Plain text overwrites the `output` key each time. Use named JSON keys for values that must survive across chain steps.
- **Overwriting context keys unintentionally.** `Object.assign` merges shallowly; later keys replace earlier keys with the same name.
- **Hidden dependency on a specific predecessor.** A reused Task may assume context that only one predecessor produces.
- **Reused Tasks that assume unavailable context.** Check that the expected context keys exist, or handle missing values gracefully.
- **Destructive mutation before reservation.** Always claim exclusive ownership before modifying shared state.
- **Finalizing without independent verification.** Trusting a Task's exit code is not sufficient if external state may differ.
- **Swallowing failures.** A Task that always exits with code 0 even on partial failure hides problems.
- **Returning success after incomplete work.** A Task that succeeds but leaves work unfinished creates false confidence.
- **Using failure for all non-action outcomes.** "No work found" and "processing failed" are different states requiring different handling.
- **Accidental cycles.** A → B → A produces infinite execution within an iteration.
- **Self-referencing Tasks.** A Task whose `onSuccess` or `onFailure` points to itself.
- **Relying on context from a previous iteration.** Context is discarded after each iteration.
- **Treating interpolation values as trusted input.** Values from stdout may contain unexpected data.
- **Confusing internal command AND or OR with Task graph composition.** Shell `&&`/`||` are internal to a Task; they do not create separate composition primitives.
- **Assuming multiple successors run in parallel.** Each Task has exactly one successor per result.

## Cross-Skill References

- For cadence, iteration scheduling, and maximum-run behaviour, load **`loop-task-loops`**.
- For Project organisation and membership rules, load **`loop-task-projects`**.
- For advanced chaining models and truth tables, see [references/chaining.md](references/chaining.md).
- For the complete context lifecycle including parsing rules, see [references/context.md](references/context.md).
- For condition modelling patterns, see [references/conditions.md](references/conditions.md).
