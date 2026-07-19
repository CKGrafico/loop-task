# Chaining Model Reference

## Chain as a Linked List

A Loop Task chain is a **linked list with two possible transitions** at each node. Each Task has at most two outgoing edges: one for success (`onSuccessTaskId`) and one for failure (`onFailureTaskId`).

The chain is **not** a DAG (directed acyclic graph), a tree, or a general graph — because:
- Cycles are not prevented, making it a potentially cyclic directed graph.
- There is no validation against cycles.

The chain is **not** a workflow engine. There are no conditional branches beyond success/failure, no joins, no parallel splits, no timers, and no event gates.

## Truth Table: Successor Selection

| Task result | onSuccess | onFailure | Outcome |
|---|---|---|---|
| Success | Present | Any | Execute onSuccess Task |
| Success | Absent | Any | Chain terminates — iteration ends |
| Failure | Any | Present | Execute onFailure Task |
| Failure | Any | Absent | Chain terminates — iteration ends |

When both onSuccess and onFailure are absent, the chain **always** terminates after the Task, regardless of its result.

## Chain Execution Sequence

1. A Task executes and produces a result (exit code).
2. If stdout is captured, it is parsed and merged into the iteration context via `Object.assign`.
3. Based on the result, the appropriate successor is determined.
4. If a successor exists, its command and arguments are interpolated with the current context.
5. The successor Task executes. Return to step 1.
6. If no successor exists (or the referenced successor does not exist), the chain terminates.
7. The iteration's final exit code is the exit code of the last Task that executed.

## Context Accumulation

Context accumulates **across the entire chain** within one iteration:

- Each Task's parsed stdout is merged into the same context object.
- Later values overwrite earlier values for the same key.
- The `output` key is overwritten every time a Task produces plain-text output.
- Structured keys (from JSON objects) are added or overwritten individually.
- A downstream Task can access all context produced by any upstream Task.

Context survives across **success and failure transitions** alike. A recovery Task can read context produced by the Task that failed.

## Failure Propagation

A Task failure does **not** automatically propagate as an iteration failure. When a Task fails and `onFailure` is defined, the chain continues with the recovery Task. The iteration is only "failed" in its final result if the last Task in the chain exits with a non-zero code.

The iteration's final exit code is determined by the **last** Task that executed:

| Chain flow | Final exit code | Iteration result |
|---|---|---|
| Task A fails → no onFailure | Task A's exit code | Failure |
| Task A fails → recovery succeeds → no onSuccess | Recovery's exit code (0) | Success |
| Task A fails → recovery fails → no onFailure | Recovery's exit code | Failure |
| Task A succeeds → Task B fails → recovery succeeds | Recovery's exit code (0) | Success |

## Shared Successors

Multiple predecessor Tasks can reference the same successor Task. This is valid and useful for:

- **Shared finalisation Task**: Multiple work Tasks point to the same "finalize" Task on success.
- **Shared recovery Task**: Multiple Tasks point to the same "notify-failure" Task on failure.
- **Shared notification Task**: Any failure path routes to a single alert mechanism.

Shared successors receive the context accumulated up to the point of transition. They do not know which predecessor invoked them (unless context identifies the source).

## Cycles

### What a cycle looks like

```
Task A --onSuccess--> Task B --onSuccess--> Task C --onSuccess--> Task A
```

Or a self-reference:

```
Task A --onSuccess--> Task A
```

### What happens

Loop Task does **not** validate against cycles. A cycle causes the chain to execute the same Tasks in an infinite loop within one iteration. The iteration never terminates.

### How to avoid cycles

- **Never** set a Task's `onSuccess` or `onFailure` to point to itself.
- **Never** create a circular chain of references.
- When designing chains, draw the graph and verify it is acyclic.
- Use shared successors (fan-in) instead of cycles. If Task C needs to redo Task A's work, create a separate Task D that performs the redo, rather than routing back to A.

### Cycle detection responsibility

Cycle prevention is the **designer's** responsibility. Loop Task does not enforce it at creation time or during execution.

## Maximum Chain Length

There is no enforced maximum chain length. However:

- Each chain step executes a subprocess, consuming time and resources.
- Context grows with each step (though `Object.assign` does not remove old keys).
- Stdout capture is capped at 1 MB per Task.
- The run history records each chain step.

Practical recommendation: keep chains under 10 Tasks per iteration for maintainability and observability.

## Termination Summary

A chain terminates when:

1. **No matching successor**: The Task's result (success or failure) has no corresponding transition defined.
2. **Missing successor reference**: The referenced successor Task ID does not exist (deleted or never created). The chain terminates silently.
3. **External abort**: The iteration is stopped, paused, or the runtime shuts down.

A chain does **not** terminate on:
- A Task failure (if `onFailure` is defined)
- A Task success (if `onSuccess` is defined)
- Context key collisions (values are silently overwritten)
