# Loop Design Patterns

## 1. Periodic Health Check

**Problem**: Verify that a service or endpoint remains healthy at regular intervals.

**Structure**:

```
Loop:
  cadence: every 5 minutes
  immediate: true
  initial-task: check-health

Tasks:
  check-health:
    purpose: Evaluate health of the target service
    produces: nothing (or structured health data for context)
    on-success: none (iteration terminates; healthy)
    on-failure: alert

  alert:
    purpose: Notify operators of the failure
    consumes: nothing (or health data from check-health)
    produces: nothing
    on-success: none
    on-failure: none
```

**Key points**:
- A single Task evaluates the condition. Success means healthy; failure means unhealthy.
- The alert Task only executes on failure.
- The Loop continues to the next iteration regardless of outcome.
- No `maxRuns` — this is an ongoing monitoring objective.

---

## 2. Periodic Synchronization

**Problem**: Keep a local or remote resource in sync with an upstream source.

**Structure**:

```
Loop:
  cadence: every 1 hour
  initial-task: detect-changes

Tasks:
  detect-changes:
    purpose: Check whether synchronization is needed
    produces: { hasChanges, lastSyncTimestamp }
    on-success: perform-sync
    on-failure: none (no changes, iteration terminates cleanly)

  perform-sync:
    purpose: Execute the synchronization
    consumes: { lastSyncTimestamp }
    produces: { syncId, syncedCount }
    on-success: verify-sync
    on-failure: report-sync-failure

  verify-sync:
    purpose: Confirm the synchronization succeeded
    consumes: { syncId }
    produces: nothing
    on-success: finalize-sync
    on-failure: report-sync-failure

  report-sync-failure:
    purpose: Notify that synchronization failed
    consumes: { syncId, syncedCount }
    produces: nothing
    on-success: none
    on-failure: none
```

**Key points**:
- The detection Task determines whether work is needed.
- "No changes needed" is success with no `onSuccess` — a clean exit.
- The verify step independently confirms the result before finalizing.
- Failure at any point routes to a notification Task.

---

## 3. Process One Backlog Item Per Iteration

**Problem**: Progress through a backlog by processing one eligible item per iteration.

**Structure**:

```
Loop:
  cadence: every 30 minutes
  immediate: true
  initial-task: select-item

Tasks:
  select-item:
    purpose: Find one eligible work item
    produces: { itemId, itemTitle, itemBody }
    on-success: reserve-item
    on-failure: none (no eligible items, clean exit)

  reserve-item:
    purpose: Mark the item as in-progress to prevent duplicate processing
    consumes: { itemId }
    produces: nothing
    on-success: process-item
    on-failure: none (item taken by another process)

  process-item:
    purpose: Execute the actual work
    consumes: { itemId, itemTitle, itemBody }
    produces: { resultSummary }
    on-success: verify-result
    on-failure: recover-item

  verify-result:
    purpose: Independently confirm the work was completed
    consumes: { itemId, resultSummary }
    produces: nothing
    on-success: finalize-item
    on-failure: recover-item

  finalize-item:
    purpose: Mark the item as completed and clean up
    consumes: { itemId }
    produces: nothing
    on-success: none
    on-failure: none

  recover-item:
    purpose: Release the reservation and report the failure
    consumes: { itemId }
    produces: nothing
    on-success: none
    on-failure: none
```

**Key points**:
- Selection and reservation are separate: first find work, then claim it.
- "No eligible items" is success with no successor — the Loop waits for the next cadence.
- The verify step is independent confirmation, not just trusting the processing Task.
- Recovery releases the reservation on failure.

---

## 4. Bounded Polling

**Problem**: Wait for a condition to become true, checking periodically, with a maximum number of attempts.

**Structure**:

```
Loop:
  cadence: every 10 seconds
  maxRuns: 30
  initial-task: check-condition

Tasks:
  check-condition:
    purpose: Evaluate whether the target condition is satisfied
    produces: { currentState }
    on-success: none (condition met — iteration terminates, Loop reaches maxRuns and pauses)
    on-failure: none (condition not yet met — Loop continues to next iteration)
```

**Key points**:
- `maxRuns` bounds the polling. After 30 attempts, the Loop pauses.
- Success means the condition is satisfied — the iteration terminates and no further action is needed. The Loop will continue iterating unless `maxRuns` is reached.
- Failure means the condition is not yet met — the Loop waits and tries again.
- **Important**: When the condition succeeds, the Loop still continues to the next iteration unless the Task has an `onSuccess` path that changes the state, or `maxRuns` is set to 1. For "stop on first success," set `maxRuns: 1` — the Loop will pause after one successful iteration.

---

## 5. Safe Maintenance

**Problem**: Perform a maintenance operation safely by inspecting first and validating afterward.

**Structure**:

```
Loop:
  cadence: every 1 day
  initial-task: inspect-state

Tasks:
  inspect-state:
    purpose: Examine the current state and determine whether maintenance is needed
    produces: { needsMaintenance, currentState }
    on-success: perform-maintenance (if needsMaintenance)
    on-failure: none (no maintenance needed)

  perform-maintenance:
    purpose: Execute the maintenance change
    consumes: { currentState }
    produces: { changeId }
    on-success: validate-maintenance
    on-failure: report-failure

  validate-maintenance:
    purpose: Verify the maintenance achieved the expected result
    consumes: { changeId }
    produces: nothing
    on-success: none
    on-failure: report-failure

  report-failure:
    purpose: Notify that maintenance failed validation
    consumes: { changeId }
    produces: nothing
    on-success: none
    on-failure: none
```

**Key points**:
- Inspect before changing. Only proceed when needed.
- Validate after changing. Confirm the result independently.
- The inspection Task must encode "maintenance needed" as success and "no maintenance needed" as a terminal state (success with no successor, or failure).

---

## 6. Agent Execution Loop

**Problem**: Have an AI agent process work on a cadence, with structured context passing.

**Structure**:

```
Loop:
  cadence: every 30 minutes
  immediate: true
  initial-task: collect-context

Tasks:
  collect-context:
    purpose: Gather structured information about the work to perform
    produces: { workId, workTitle, workBody, repositoryState }
    on-success: prepare-prompt
    on-failure: none (no work available)

  prepare-prompt:
    purpose: Construct the agent's input from collected context
    consumes: { workId, workTitle, workBody, repositoryState }
    produces: { agentPrompt }
    on-success: execute-agent
    on-failure: none

  execute-agent:
    purpose: Run the agent with the constructed prompt
    consumes: { agentPrompt, workId }
    produces: { agentResult }
    on-success: verify-completion
    on-failure: recover-work

  verify-completion:
    purpose: Independently verify the agent produced the expected result
    consumes: { workId, agentResult }
    produces: nothing
    on-success: finalize-work
    on-failure: recover-work

  finalize-work:
    purpose: Mark the work as completed
    consumes: { workId }
    produces: nothing
    on-success: none
    on-failure: none

  recover-work:
    purpose: Release the work item and report the failure
    consumes: { workId }
    produces: nothing
    on-success: none
    on-failure: none
```

**Key points**:
- Context is collected before the agent runs. The agent receives structured data, not ad-hoc information.
- Verification is independent — verify the agent's output, not just trust the exit code.
- The agent's stdout may produce context for downstream Tasks, but the agent Task itself must produce a success/failure result.

---

## 7. Empty-Work Iteration

**Problem**: Handle the common case where a Loop's selection Task finds no work to process.

**Structure**:

```
Loop:
  cadence: every 1 hour
  initial-task: find-work

Tasks:
  find-work:
    purpose: Check whether eligible work exists
    produces: nothing (no context needed when there is no work)
    on-success: process-work (work found)
    on-failure: none (no work found — iteration terminates, Loop waits for next cadence)
```

**Key points**:
- When "no work" is a normal, expected state, it should be represented as **failure with no `onFailure`**. The iteration terminates cleanly and the Loop waits for the next cadence.
- **Do not use success for "no work."** If "no work" is success, the chain continues to `onSuccess`, which expects work to process. This leads to either a confusing downstream Task or an unnecessary Task that checks "was there actually work?"
- **Do not use failure for "no work" with a recovery path.** If `onFailure` is defined (e.g., a notification), "no work" triggers the recovery path on every idle iteration, creating noise.
- The recommended pattern: "no work" = failure with no `onFailure` transition. The iteration ends, the Loop waits. This is the quietest and most correct representation.
