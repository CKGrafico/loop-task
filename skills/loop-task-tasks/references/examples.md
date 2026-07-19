# Task Examples

All examples use a conceptual YAML-like notation for illustration. **This is not a real configuration format.** It exists only to show the structure of Tasks, their chains, and context flow.

---

## Example 1: File Backup with Verification

```yaml
# Conceptual representation — not a real configuration format
tasks:
  check-source:
    purpose: Verify the source file exists and is readable
    consumes: nothing
    produces: { sourcePath, sourceSize }
    on-success: copy-file
    on-failure: none (source missing, nothing to back up)

  copy-file:
    purpose: Copy the source file to the backup location
    consumes: { sourcePath }
    produces: { backupPath, copiedSize }
    on-success: verify-copy
    on-failure: none (copy failed)

  verify-copy:
    purpose: Compare the backup against the source
    consumes: { sourceSize, copiedSize }
    on-success: finalize-backup
    on-failure: none (verification failed, backup is kept for investigation)

  finalize-backup:
    purpose: Record the successful backup
    consumes: { backupPath, copiedSize }
    on-success: none
    on-failure: none

terminal-outcomes:
  success: File backed up and verified
  failure: Source missing, copy failed, or verification failed
```

---

## Example 2: API Health Gate

```yaml
# Conceptual representation — not a real configuration format
tasks:
  call-api:
    purpose: Send a request to the target endpoint
    consumes: nothing
    produces: { statusCode, responseTime }
    on-success: evaluate-response
    on-failure: none (request could not be sent)

  evaluate-response:
    purpose: Interpret the API response and determine health
    consumes: { statusCode, responseTime }
    # Internally: if statusCode >= 200 and statusCode < 300 then exit 0; else exit 1
    on-success: none (healthy)
    on-failure: none (unhealthy but no recovery defined — iteration ends)
```

**Context flow**:
- `call-api` produces `{ statusCode, responseTime }` via JSON stdout.
- `evaluate-response` consumes them via `{{statusCode}}` interpolation in its payload.
- The final result depends on the evaluate-response Task's exit code.

---

## Example 3: Issue Processing with Recovery

```yaml
# Conceptual representation — not a real configuration format
tasks:
  find-issue:
    purpose: Query for a work item labelled "ready"
    consumes: nothing
    produces: { number, title, labels }
    on-success: claim-issue
    on-failure: none (no ready issues)

  claim-issue:
    purpose: Assign the issue to prevent duplicates
    consumes: { number }
    produces: nothing
    on-success: process-issue
    on-failure: none (issue already claimed by another process)

  process-issue:
    purpose: Execute the work described by the issue
    consumes: { number, title, labels }
    produces: { resultSummary }
    on-success: verify-result
    on-failure: release-issue

  verify-result:
    purpose: Confirm the work matches the issue requirements
    consumes: { number, resultSummary }
    on-success: close-issue
    on-failure: release-issue

  close-issue:
    purpose: Mark the issue as resolved
    consumes: { number }
    on-success: none
    on-failure: none

  release-issue:
    purpose: Unassign the issue and report the failure
    consumes: { number }
    on-success: none
    on-failure: none
```

**Context flow**:
1. `find-issue` produces `{ number, title, labels }`.
2. `claim-issue` consumes `{{number}}`. No new structured context.
3. `process-issue` consumes `{{number}}`, `{{title}}`, `{{labels}}`. Produces `{ resultSummary }`.
4. `verify-result` consumes `{{number}}`, `{{resultSummary}}`.
5. `close-issue` / `release-issue` consume `{{number}}`.

All context from steps 1–3 is available to steps 4–6. The `output` key is not used — all values are named JSON keys.

---

## Example 4: Multi-Step Build Pipeline

```yaml
# Conceptual representation — not a real configuration format
task:
  name: build-and-test
  steps:
    - step-1-parallel-fetch:
        commands:
          - command: "fetch-dependency-a"
          - command: "fetch-dependency-b"
          - command: "fetch-dependency-c"
        # All three run in parallel. Step fails if any fails.

    - step-2-build:
        commands:
          - command: "build-project"
        # Sequential. Receives context from step 1.

    - step-3-test:
        commands:
          - command: "run-test-suite"
        # Sequential. Receives context from steps 1 and 2.

  on-success: none
  on-failure: none
```

**Key points**:
- Step 1 fetches three dependencies concurrently.
- Steps 2 and 3 are sequential, each depending on the previous.
- If step 1 fails, steps 2 and 3 are skipped.
- If step 2 fails, step 3 is skipped.
- Stdout from each step is captured and parsed for context.

---

## Example 5: Conditional Processing via Gate Task

```yaml
# Conceptual representation — not a real configuration format
tasks:
  fetch-data:
    purpose: Retrieve data and emit its type
    consumes: nothing
    produces: { dataType, dataContent }
    on-success: route-on-type
    on-failure: none (fetch failed)

  route-on-type:
    purpose: Read dataType from context and exit accordingly
    consumes: { dataType }
    # Internally: if dataType == "urgent" then exit 0; else exit 1
    on-success: handle-urgent
    on-failure: handle-normal

  handle-urgent:
    purpose: Process the data with high priority
    consumes: { dataContent }
    on-success: none
    on-failure: none

  handle-normal:
    purpose: Process the data with standard priority
    consumes: { dataContent }
    on-success: none
    on-failure: none
```

**Context flow**:
- `fetch-data` produces `{ dataType, dataContent }`.
- `route-on-type` reads `{{dataType}}` from context and uses shell logic to exit 0 or 1.
- `handle-urgent` and `handle-normal` read `{{dataContent}}` from the same context.
- The routing decision is made by the gate Task's executable payload, not by Loop Task itself.

---

## Example 6: Shared Finalization

```yaml
# Conceptual representation — not a real configuration format
tasks:
  step-a:
    purpose: Perform the first operation
    produces: { stepAResult }
    on-success: step-b
    on-failure: cleanup

  step-b:
    purpose: Perform the second operation
    consumes: { stepAResult }
    produces: { stepBResult }
    on-success: step-c
    on-failure: cleanup

  step-c:
    purpose: Perform the final operation
    consumes: { stepBResult }
    produces: nothing
    on-success: cleanup
    on-failure: cleanup

  cleanup:
    purpose: Release resources and finalize
    consumes: whatever context is available
    on-success: none
    on-failure: none
```

**Key points**:
- `cleanup` is referenced by three different predecessors.
- It handles both success-path finalization (from step-c) and failure recovery.
- It receives whatever context has accumulated up to its invocation point.
- It must not assume that all context keys are present (e.g., when called from step-a failure, `stepBResult` does not exist).
```

---

## Example 7: Idempotent Resource Creation

```yaml
# Conceptual representation — not a real configuration format
tasks:
  check-resource:
    purpose: Determine whether the resource already exists
    produces: { resourceExists, resourceId }
    on-success: route-on-existence
    on-failure: none (check failed)

  route-on-existence:
    purpose: Read resourceExists from context and exit accordingly
    consumes: { resourceExists }
    # Internally: if resourceExists == "true" then exit 1; else exit 0
    on-success: create-resource
    on-failure: use-existing-resource

  create-resource:
    purpose: Create the resource
    produces: { resourceId }
    on-success: use-resource
    on-failure: none (creation failed)

  use-existing-resource:
    purpose: Proceed with the existing resource
    consumes: { resourceId }
    on-success: use-resource
    on-failure: none

  use-resource:
    purpose: Perform the work that needs the resource
    consumes: { resourceId }
    on-success: none
    on-failure: none
```

**Key points**:
- The Task checks first and only creates when the resource does not exist.
- This makes the Task safe to run on repeated iterations.
- The "already exists" path is not an error — it is a successful state.
- Context from the check is available to downstream Tasks regardless of which path was taken.
