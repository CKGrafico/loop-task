# Task Design Patterns

## 1. Select-Then-Process

**Problem**: Find eligible work and process it, handling the case where no work exists.

**Structure**:

```yaml
# Conceptual representation — not a real configuration format
select-work:
  purpose: Find one eligible work item
  on-success: process-work
  on-failure: none (no work found, clean exit)

process-work:
  purpose: Execute the work
  consumes: { itemId, itemData }
  on-success: finalize-work
  on-failure: recover-work
```

**Key points**:
- Selection and processing are separate Tasks.
- "No work" is failure with no `onFailure` — the chain terminates.
- The selection Task produces context (e.g., item IDs) that the processing Task consumes.
- This is the most fundamental condition pattern in Loop Task.

---

## 2. Inspect-Change-Verify

**Problem**: Modify external state safely by checking first and validating afterward.

**Structure**:

```yaml
# Conceptual representation — not a real configuration format
inspect:
  purpose: Read current state and determine whether a change is needed
  produces: { currentState, needsChange }
  on-success: perform-change
  on-failure: none (no change needed, clean exit)

perform-change:
  purpose: Apply the change
  consumes: { currentState }
  produces: { changeId }
  on-success: verify-change
  on-failure: report-failure

verify-change:
  purpose: Read the state again and confirm the change took effect
  consumes: { changeId, currentState }
  on-success: finalize
  on-failure: report-failure

report-failure:
  purpose: Notify that the change failed
  on-success: none
  on-failure: none
```

**Key points**:
- Inspect **before** changing to avoid unnecessary mutations.
- Verify **after** changing to confirm the result.
- Both the "no change needed" and "change verified" paths terminate cleanly.
- The report-failure Task is shared by both change and verification failures.

---

## 3. Reserve-Process-Finalize

**Problem**: Claim exclusive ownership of a work item before processing it, preventing duplicate work.

**Structure**:

```yaml
# Conceptual representation — not a real configuration format
select-item:
  purpose: Find one eligible work item
  produces: { itemId }
  on-success: reserve-item
  on-failure: none (no eligible items)

reserve-item:
  purpose: Mark the item as "in progress" to prevent duplicate handling
  consumes: { itemId }
  on-success: process-item
  on-failure: none (item already reserved by another process)

process-item:
  purpose: Perform the actual work
  consumes: { itemId }
  produces: { resultSummary }
  on-success: finalize-item
  on-failure: release-item

finalize-item:
  purpose: Mark the item as completed
  consumes: { itemId }
  on-success: none
  on-failure: none

release-item:
  purpose: Remove the "in progress" mark and report the failure
  consumes: { itemId }
  on-success: none
  on-failure: none
```

**Key points**:
- Reservation prevents the same item from being processed by concurrent Loops or manual triggers.
- If reservation fails (item already reserved), the chain terminates — no duplicate work.
- Release on failure ensures the item is not stuck in "in progress" permanently.
- The `release-item` Task must be idempotent: if the item was never reserved, releasing it should succeed.

---

## 4. Try-Recover

**Problem**: Attempt an operation and recover on failure, with the option to continue the chain after recovery.

**Structure**:

```yaml
# Conceptual representation — not a real configuration format
attempt-operation:
  purpose: Try the primary operation
  produces: { operationId }
  on-success: continue-chain
  on-failure: recover-operation

recover-operation:
  purpose: Undo partial effects and restore a clean state
  consumes: { operationId }
  produces: nothing
  on-success: none (recovered, iteration terminates)
  on-failure: escalate-failure

escalate-failure:
  purpose: Notify that recovery also failed
  on-success: none
  on-failure: none
```

**Key points**:
- Recovery is a separate Task, triggered by failure.
- Recovery can itself succeed or fail, with separate handling for each.
- After successful recovery, the chain terminates — it does **not** retry the original operation.
- Retry logic would require a cycle (recover → attempt), which is dangerous. Use the Loop's next iteration instead.

---

## 5. Gate Task (Context-Aware Routing)

**Problem**: Route based on a value that already exists in the iteration context (produced by an earlier Task).

**Structure**:

```yaml
# Conceptual representation — not a real configuration format
collect-data:
  purpose: Query an external system and emit structured info
  produces: { severity, itemCount, lastModified }
  on-success: route-on-severity (always succeeds to keep chain going)
  on-failure: none (query failed, iteration terminates)

route-on-severity:
  purpose: Read severity from context and exit accordingly
  consumes: { severity }
  # Internally: if severity == "critical" then exit 0; else exit 1
  on-success: handle-critical
  on-failure: handle-non-critical
```

**Key points**:
- The gate Task reads context and exits with a code that reflects the desired routing.
- This is the **only** way to route based on context values in Loop Task.
- The gate Task must embed its routing logic in its executable payload (e.g., shell `if`/`case`).
- Loop Task routing depends on exit code, not context values.

---

## 6. Shared Notification Task

**Problem**: Multiple paths in a chain need to send the same type of notification.

**Structure**:

```yaml
# Conceptual representation — not a real configuration format
step-a:
  on-success: step-b
  on-failure: notify-failure

step-b:
  on-success: step-c
  on-failure: notify-failure

step-c:
  on-success: none
  on-failure: notify-failure

notify-failure:
  purpose: Send a failure notification
  consumes: whatever context is available
  on-success: none
  on-failure: none
```

**Key points**:
- A single notification Task is referenced by multiple predecessors.
- The notification Task receives context accumulated up to the point of failure.
- The notification Task must be robust: it should not assume specific context keys unless all predecessors produce them.
- Consider adding a `failureSource` context key at each predecessor so the notification can identify where the failure occurred.

---

## 7. Multi-Step Task

**Problem**: Execute multiple commands within a single Task, where later steps depend on earlier ones and commands within a step can run in parallel.

**Structure**:

```yaml
# Conceptual representation — not a real configuration format
task:
  steps:
    - step-1:
        commands:
          - command: "fetch-data-source-a"
          - command: "fetch-data-source-b"
        # Both commands run in parallel. Step fails if either fails.

    - step-2:
        commands:
          - command: "merge-and-transform"
          # Receives stdout from step-1 in context. Single command, sequential.

    - step-3:
        commands:
          - command: "validate-output"
          # Checks the result. Single command.
```

**Key points**:
- Steps run sequentially. Commands within a step run in parallel.
- If any command in a step fails, the step fails and subsequent steps are skipped.
- Stdout from each step's commands is concatenated and parsed for context.
- This is useful when multiple independent fetches must complete before a transform runs.
- For simple linear chains, prefer separate Tasks with `onSuccess` chains — they are more observable and each step has its own log entry.

---

## 8. Silent Chain Task

**Problem**: A Task that performs bookkeeping or cleanup that should not clutter the logs.

**Structure**:

```yaml
# Conceptual representation — not a real configuration format
cleanup:
  purpose: Release resources or reset state
  silentChain: true
  on-success: none
  on-failure: none
```

**Key points**:
- `silentChain: true` redirects output to a null stream.
- Use for Tasks whose output is not interesting for debugging (e.g., updating a timestamp, releasing a lock).
- Do **not** use for Tasks whose output might be needed for debugging failures.
- The Task still produces a success/failure result and can chain to successors.

---

## 9. Context-Forwarding Chain

**Problem**: Each Task in a chain produces a piece of data that the final Task needs.

**Structure**:

```yaml
# Conceptual representation — not a real configuration format
collect-repo-info:
  purpose: Gather repository metadata
  produces: { repoName, branchName, latestCommit }
  on-success: collect-issue-info
  on-failure: none

collect-issue-info:
  purpose: Gather issue metadata
  produces: { issueNumber, issueTitle }
  on-success: synthesize
  on-failure: none

synthesize:
  purpose: Combine all collected information into a report
  consumes: { repoName, branchName, latestCommit, issueNumber, issueTitle }
  produces: { reportPath }
  on-success: none
  on-failure: none
```

**Key points**:
- Context accumulates across the chain. The final Task sees all previously produced keys.
- Use **named JSON keys** (not `output`) for values that must survive across steps.
- Plain-text output overwrites `output` each time — only the last plain-text value survives.
- The order of Tasks matters: context flows forward, never backward.

---

## 10. Conditional Finalization

**Problem**: Finalize work only if the result meets expectations, and recover otherwise.

**Structure**:

```yaml
# Conceptual representation — not a real configuration format
perform-work:
  purpose: Execute the primary operation
  produces: { resultData, resultChecksum }
  on-success: verify-result
  on-failure: recover

verify-result:
  purpose: Check whether the result matches expectations
  consumes: { resultData, resultChecksum }
  # Internally: if checksum matches expected value, exit 0; else exit 1
  on-success: finalize
  on-failure: recover

finalize:
  purpose: Mark the work as completed and clean up
  consumes: { resultData }
  on-success: none
  on-failure: none

recover:
  purpose: Undo the work and report the failure
  consumes: { resultData }
  on-success: none
  on-failure: none
```

**Key points**:
- Verification is a separate Task, not just trusting the exit code of the work Task.
- If verification fails, the chain routes to recovery.
- Finalization only happens after independent verification.
- The recover Task handles both "work failed" and "work succeeded but verification failed" cases.
