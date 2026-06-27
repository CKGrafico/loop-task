## Why

Chain tasks currently run in isolation: each task re-queries the same data from scratch because there's no mechanism to pass values between chained tasks. In a 3-task chain that finds a GitHub issue, refines it with an AI agent, then relabels it, tasks 1 and 3 both run `gh issue list` to get the same issue number. This wastes API calls, adds latency, and makes chains fragile. The fix: auto-capture each task's stdout, parse it into a context object, and let downstream chain tasks interpolate values via `{{key}}` templates in their command and arguments.

## What Changes

- Auto-capture stdout for every task in a chain (primary + chain tasks). Output is teed to the log stream AND buffered for context parsing.
- Parse stdout into a chain context object using a merge strategy: JSON objects merge their keys, JSONL lines merge sequentially, plain text goes under an `output` key, empty stdout leaves context unchanged.
- Interpolate `{{key}}` Mustache-style templates in `command` and each `commandArgs` entry before spawning chain tasks. Missing keys resolve to empty string.
- Context is per loop iteration: fresh at the start of each iteration, discarded after the chain completes.
- Zero config: capture is automatic for all tasks in a chain. No flags, no TaskDefinition schema changes.
- User documentation: README section explaining context sharing, and a help modal in the task list / edit page showing the context contract.

### Non-goals

- No context sharing to the **next loop iteration** (context resets each iteration).
- No context sharing for standalone loops (loops without chain tasks).
- No explicit capture flag or opt-in mechanism.
- No structured type system for context values (values are `string | number | boolean | null | object` from JSON, or `string` from plain text).
- No `jq`-like query syntax beyond top-level `{{key}}` interpolation (no `{{nested.path}}`).
- No capture of stderr (only stdout enters context).

## Capabilities

### New Capabilities
- `chain-context`: Auto-capture stdout, parse into a mutable context object, and interpolate `{{key}}` templates in chain task commands before execution.

### Modified Capabilities
<!-- None - no existing spec-level behavior changes. chain-execution is new too. -->

## Impact

- **`src/core/command-runner.ts`**: `executeCommand` gains a `captureStdout` boolean parameter; when true, stdout is teed to both the log stream and a string buffer; the captured string is returned alongside `ExecutionResult`.
- **`src/core/loop-controller.ts`**: `run()` maintains a `chainContext: Record<string, unknown>` per iteration; before each chain task, interpolates `{{key}}` in command + args; after each task (including primary), parses captured stdout and merges into context.
- **`src/types.ts`**: `ExecutionResult` gains optional `stdout?: string` field. No changes to `TaskDefinition`, `LoopMeta`, or `LoopOptions`. **No IPC contract changes.**
- **`src/config/constants.ts`**: `MAX_CONTEXT_STDOUT_BYTES` (1MB cap on captured stdout to prevent memory exhaustion).
- **`src/i18n/en.json`**: New keys for context help modal text.
- **`README.md`**: New section documenting the context sharing contract with examples.
- **`src/board/components/TaskForm.tsx`** or new `ContextHelpModal.tsx`: Help modal showing context rules when editing/creating tasks.
- **Persisted state**: No shape changes. Context is ephemeral (in-memory only, never written to disk).
- **Cross-platform**: No impact. Stdout capture uses Node streams, works identically on Windows and Unix.
