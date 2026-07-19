# Conditions Reference

## Verified Condition Model

Loop Task does **not** provide a first-class Condition entity. There are no `Condition` types, no conditional expressions, and no switch/case routing.

Conditions are modelled through **Task result semantics**:

1. A Task evaluates the condition.
2. **Success** (exit code 0) selects `onSuccess`.
3. **Failure** (exit code non-zero) selects `onFailure`.

This is the **only** native condition mechanism in Loop Task.

## Three Concepts to Distinguish

### 1. Domain condition

A real-world decision the system must make:

- Does eligible work exist?
- Are tests passing?
- Is the deployment healthy?
- Is the branch synchronized?
- Does approval exist?
- Has the resource been modified?

### 2. Task evaluation

The Task's executable payload evaluates the condition. The Task runs a process (a shell command, a script, an agent) that checks the external state and exits with the appropriate code.

### 3. Transition result

The Task expresses the outcome as success or failure, which selects one of the two available transitions:

- `onSuccess` — the condition was met
- `onFailure` — the condition was not met

## Condition Use Cases and Recommended Representations

### Continue only when work exists

```
selection-task:
  purpose: Find one eligible work item
  on-success: process-work
  on-failure: none (no work — iteration terminates, Loop waits for next cadence)
```

When no work exists, the chain terminates cleanly. The Loop waits for the next cadence and tries again.

### Continue only when synchronization is needed

```
check-sync:
  purpose: Compare local and remote state
  produces: { needsSync, lastSyncTimestamp }
  on-success: perform-sync
  on-failure: none (already synchronized — iteration terminates)
```

### Route to recovery when validation fails

```
validate:
  purpose: Check whether the result meets expectations
  produces: { validationErrors }
  on-success: finalize
  on-failure: recover-or-report
```

### Terminate without action when no work exists

```
find-work:
  purpose: Check whether eligible work exists
  on-success: do-work
  on-failure: none
```

This is the "empty-work" pattern. See the Loops skill for detailed guidance.

### Route different outcomes through success and failure

```
health-check:
  purpose: Evaluate service health
  on-success: none (healthy — iteration terminates)
  on-failure: attempt-recovery
```

## Limitation: Two Result Channels

A Task produces exactly one of two results: success or failure. This binary model cannot directly represent tri-state or multi-way conditions.

### Workarounds for tri-state conditions

**Approach 1: Two successive Tasks**

The first Task distinguishes between two states. The second (reached via a transition) distinguishes between the remaining states.

```
# Conceptual representation
check-health:
  purpose: Is the service healthy?
  on-success: none (healthy)
  on-failure: check-degraded

check-degraded:
  purpose: Is the service degraded (partially working) or down?
  on-success: notify-degraded (degraded but partially functional)
  on-failure: notify-down (service is down)
```

**Approach 2: Context-based routing with a gate Task**

Encode the state in the Task's stdout as context, and have a downstream "gate" Task read and act on it:

```
# Conceptual representation
health-check:
  purpose: Evaluate health and emit status
  produces: { healthStatus: "healthy" | "degraded" | "down" }
  on-success: route-on-status (always succeeds so chain continues)
  on-failure: notify-down (internal error during check)

route-on-status:
  purpose: Read healthStatus from context and act accordingly
  consumes: { healthStatus }
  on-success: none (handled internally based on status)
  on-failure: none
```

Limitation: The "route-on-status" Task must internally branch based on the context value, using shell-level `if`/`case` logic. Loop Task routing still depends on the exit code, not context values.

### When tri-state is not worth the complexity

If the distinction between "degraded" and "down" does not affect the automation flow (both route to the same notification), a single binary check is sufficient.

## What Conditions Are NOT

| Concept | Does not exist in Loop Task |
|---|---|
| First-class Condition entity | No `Condition` type exists |
| Arbitrary conditional expressions | Only success/failure of a Task |
| Switch/case routing | Only two transitions per Task |
| Deducted conditions from context values | Routing depends on exit code only, not context contents |
| Multiple outgoing transitions | At most one successor per result |
| Conditional guards on transitions | Not supported — the transition is always followed when defined |
| Predicates on context keys | Not supported — use a gate Task that reads context and exits accordingly |

## Recommended Practices

1. **Design selection Tasks explicitly for condition evaluation.** A Task whose purpose is "find work" should succeed when work is found and fail when it is not.

2. **Separate condition evaluation from action.** Use one Task to check the condition and another to act on it. This makes the flow readable and testable.

3. **Use failure-without-onFailure for "no work" states.** This is the quietest and most correct representation of "nothing to do."

4. **Avoid using success to mean "nothing to do" when a successor is defined.** If `onSuccess` points to a "process work" Task, succeeding with no work causes the successor to execute on empty data.

5. **Make condition Tasks produce structured context on success.** When a selection Task succeeds, it should emit the data the successor needs (IDs, titles, state). This avoids the successor having to re-query.

6. **Do not rely on context values for routing.** Loop Task routes by exit code, not by context. If you need context-aware routing, use a gate Task that reads the context and exits with the appropriate code.
