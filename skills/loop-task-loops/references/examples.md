# Loop Examples

All examples use a conceptual YAML-like notation for illustration. **This is not a real configuration format.** It exists only to show the structure of Loops, Tasks, and their relationships.

---

## Example 1: Repository Synchronization Followed by Work-Item Processing

```yaml
# Conceptual representation — not a real configuration format
project:
  name: backend-repository

loop:
  purpose: Keep the local repository in sync and process one stale work item
  cadence: Every 30 minutes
  first-iteration: immediate
  maximum-iterations: unlimited
  initial-task: sync-repository

tasks:
  sync-repository:
    purpose: Pull the latest changes from the remote
    consumes: nothing
    produces: { latestCommit, branchName }
    on-success: select-stale-item
    on-failure: none (sync failed, iteration terminates; Loop retries next cadence)

  select-stale-item:
    purpose: Find one eligible work item from the backlog
    consumes: { latestCommit }
    produces: { itemId, itemTitle, itemBody }
    on-success: process-item
    on-failure: none (no stale items, iteration terminates)

  process-item:
    purpose: Execute the work for the selected item
    consumes: { itemId, itemTitle, itemBody, branchName }
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
    purpose: Mark the item as completed
    consumes: { itemId }
    produces: nothing
    on-success: none
    on-failure: none

  recover-item:
    purpose: Release the item and report the failure
    consumes: { itemId }
    produces: nothing
    on-success: none
    on-failure: none

terminal-outcomes:
  success: Repository synced, one item processed and finalized
  failure: Sync failed (Loop retries), or item processing failed (item released, Loop retries)
```

---

## Example 2: Issue Refinement

```yaml
# Conceptual representation — not a real configuration format
project:
  name: product-delivery

loop:
  purpose: Find one issue that needs refinement and improve its quality
  cadence: Every 30 minutes
  first-iteration: immediate
  maximum-iterations: unlimited
  initial-task: find-refinement-candidate

tasks:
  find-refinement-candidate:
    purpose: Query for an issue labelled "to refine" and extract its data
    consumes: nothing
    produces: { number, title, body }
    on-success: mark-as-refining
    on-failure: none (no issues to refine, iteration terminates)

  mark-as-refining:
    purpose: Change the issue label from "to refine" to "refining"
    consumes: { number }
    produces: nothing
    on-success: refine-with-agent
    on-failure: none (label change failed, iteration terminates)

  refine-with-agent:
    purpose: Run an agent to rewrite the issue as a detailed user story
    consumes: { number, title, body }
    produces: { refinedTitle, refinedBody }
    on-success: mark-as-ready
    on-failure: none (agent failed, issue stays in "refining" label)

  mark-as-ready:
    purpose: Change the issue label from "refining" to "to implement"
    consumes: { number }
    produces: nothing
    on-success: none
    on-failure: none

terminal-outcomes:
  success: Issue refined and labelled "to implement"
  failure: No issues to refine, or refinement failed at some step
```

---

## Example 3: Issue Implementation

```yaml
# Conceptual representation — not a real configuration format
project:
  name: product-delivery

loop:
  purpose: Implement one issue from the ready backlog
  cadence: Every 1 hour
  first-iteration: delayed (wait for cadence alignment)
  maximum-iterations: 8 per day
  initial-task: find-implementable-issue

tasks:
  find-implementable-issue:
    purpose: Check for in-progress work first, then find a "to implement" issue
    consumes: nothing
    produces: { number, title, body }
    on-success: mark-as-implementing
    on-failure: none (no issues to implement, iteration terminates)

  mark-as-implementing:
    purpose: Change the issue label from "to implement" to "implementing"
    consumes: { number }
    produces: nothing
    on-success: implement-with-agent
    on-failure: none

  implement-with-agent:
    purpose: Run an agent to code the implementation
    consumes: { number, title, body }
    produces: { implementationResult }
    on-success: verify-implementation
    on-failure: recover-issue

  verify-implementation:
    purpose: Confirm the changes are merged to main and synced
    consumes: { number, implementationResult }
    produces: nothing
    on-success: close-issue
    on-failure: recover-issue

  close-issue:
    purpose: Close the issue after successful implementation
    consumes: { number }
    produces: nothing
    on-success: none
    on-failure: none

  recover-issue:
    purpose: Remove the "implementing" label and report the failure
    consumes: { number }
    produces: nothing
    on-success: none
    on-failure: none

terminal-outcomes:
  success: Issue implemented, verified, and closed
  failure: No issues to implement, or implementation failed (issue label reverted)
```

---

## Example 4: Health Monitoring with Recovery

```yaml
# Conceptual representation — not a real configuration format
project:
  name: service-operations

loop:
  purpose: Monitor a service endpoint and attempt recovery on failure
  cadence: Every 5 minutes
  first-iteration: immediate
  maximum-iterations: unlimited
  initial-task: check-health

tasks:
  check-health:
    purpose: Verify the target endpoint responds successfully
    consumes: nothing
    produces: { responseTime, statusCode }
    on-success: none (healthy — iteration terminates)
    on-failure: attempt-restart

  attempt-restart:
    purpose: Trigger a service restart
    consumes: nothing
    produces: { restartInitiated }
    on-success: verify-recovery
    on-failure: notify-oncall

  verify-recovery:
    purpose: Wait briefly and check health again after restart
    consumes: { restartInitiated }
    produces: { responseTime, statusCode }
    on-success: none (recovered)
    on-failure: notify-oncall

  notify-oncall:
    purpose: Alert the on-call team that recovery failed
    consumes: nothing
    produces: nothing
    on-success: none
    on-failure: none

terminal-outcomes:
  success: Service is healthy (no action needed), or restarted and recovered
  failure: Health check failed, restart failed, on-call notified
```

---

## Example 5: Bounded Deployment Polling

```yaml
# Conceptual representation — not a real configuration format
project:
  name: software-delivery

loop:
  purpose: Wait for a deployment to reach a healthy state
  cadence: Every 10 seconds
  first-iteration: immediate
  maximum-iterations: 60 (poll for up to 10 minutes)
  initial-task: check-deployment-status

tasks:
  check-deployment-status:
    purpose: Query the deployment's current health
    consumes: nothing
    produces: { deploymentState, version }
    on-success: none (deployment is healthy — but the Loop continues unless maxRuns is 1)
    on-failure: none (not yet healthy — Loop retries on next cadence)

terminal-outcomes:
  success: Deployment became healthy before the iteration limit
  failure: Deployment did not become healthy within 60 iterations (Loop pauses at maxRuns)

design-note: >
  For "stop on first success" semantics, use two Loops:
  (1) a manual-only Loop (interval=0) with maxRuns=1 that checks once on trigger,
  or (2) accept that the bounded Loop will continue checking even after success
  (harmless, since success means the deployment is healthy).
  The `maxRuns` limit prevents infinite polling regardless of outcome.
```

---

## Example 6: Periodic Report Generation

```yaml
# Conceptual representation — not a real configuration format
project:
  name: analytics-product

loop:
  purpose: Generate and store a summary report from recent data
  cadence: Every 1 day
  first-iteration: delayed
  maximum-iterations: unlimited
  initial-task: collect-metrics

tasks:
  collect-metrics:
    purpose: Query the data source for the reporting period
    consumes: nothing
    produces: { reportDate, metricA, metricB, metricC }
    on-success: generate-report
    on-failure: none (data source unavailable, iteration terminates)

  generate-report:
    purpose: Transform collected metrics into a structured report
    consumes: { reportDate, metricA, metricB, metricC }
    produces: { reportPath, recordCount }
    on-success: validate-report
    on-failure: none (generation failed, iteration terminates)

  validate-report:
    purpose: Verify the report contains expected data
    consumes: { reportPath, recordCount }
    produces: nothing
    on-success: deliver-report
    on-failure: none (validation failed, report is kept but not delivered)

  deliver-report:
    purpose: Send or store the validated report
    consumes: { reportPath, reportDate }
    produces: nothing
    on-success: none
    on-failure: none

terminal-outcomes:
  success: Report collected, generated, validated, and delivered
  failure: Data collection, generation, or validation failed (Loop retries next day)
```
