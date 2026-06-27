## Context

Chain tasks in loop-task execute sequentially within a single loop iteration. The `LoopController.run()` method resolves the primary task, runs it via `executeCommand`, then follows `onSuccessTaskId`/`onFailureTaskId` links in a `while` loop. Currently, `executeCommand` streams stdout/stderr to a log file via `fs.WriteStream` but does **not** buffer stdout in memory. No data passes between tasks; each chain task must re-query external systems for the same data.

Key files: `src/core/command-runner.ts` (executeCommand), `src/core/loop-controller.ts` (run + chain loop), `src/types.ts` (ExecutionResult, TaskDefinition).

## Goals / Non-Goals

**Goals:**
- Zero-config stdout capture for all tasks in a chain (primary + chain tasks).
- Merge-based context object that accumulates keys across the chain.
- `{{key}}` Mustache-style interpolation in `command` and `commandArgs` before spawning chain tasks.
- Clear user documentation: README section + in-board help modal.
- Minimal surface change: no TaskDefinition schema changes, no IPC contract changes, no persisted state changes.

**Non-Goals:**
- No context persistence across loop iterations (ephemeral, in-memory only).
- No explicit capture flag (always on for chain tasks).
- No stderr capture (only stdout enters context).
- No nested path interpolation (`{{a.b.c}}`) - top-level keys only.
- No type system for context values - JSON parsing yields native types, everything else is string.

## Decisions

### 1. Tee-based stdout capture in `executeCommand`

**Decision**: Add a `captureStdout: boolean` parameter to `executeCommand`. When true, pipe stdout to both the log stream AND a string buffer. Return the captured string in `ExecutionResult.stdout`.

**Why not a separate wrapper**: The capture must happen at the stream level (before `executeCommand` returns), so wrapping would duplicate the stream-wiring logic or require a callback interface. A parameter is simpler and co-located with the existing stream setup.

**Why a boolean instead of always capturing**: For standalone loops (no chain), capturing stdout wastes memory for no benefit. The LoopController knows whether a task is in a chain and passes `captureStdout: true` only when chain context is active.

**Alternative considered**: A separate `captureCommand` function. Rejected - it would duplicate the execa spawning, signal handling, and log header/footer logic.

### 2. Parse algorithm: JSON first, JSONL second, plain text fallback

**Decision**: A `parseStdout(raw: string)` function with this precedence:
1. Trim the raw string. If empty, return `null` (no context update).
2. Try `JSON.parse(whole)` - if it yields an object, return its entries. If it yields a primitive (string/number), wrap as `{ output: String(value) }`.
3. Try line-by-line JSON parsing (JSONL): split by newlines, `JSON.parse` each non-empty line, merge all objects. If all lines parse, return merged entries.
4. If none of the above: return `{ output: raw }`.

**Why JSONL support**: Tools like `gh` and `jq` can output multiple JSON objects per line (`--jq '.[]'`). Supporting JSONL lets users emit structured data without awkwardly wrapping arrays.

**Alternative considered**: Only parse whole-output JSON. Rejected - too restrictive for common piped workflows.

### 3. Merge strategy: `Object.assign` with last-writer-wins

**Decision**: Context is a `Record<string, unknown>`. After each task, call `parseStdout()` and `Object.assign(chainContext, parsedEntries)`. Duplicate keys are overwritten by the later task.

**Why merge over replace**: Task 1 sets `{ number: 123 }`, task 2 sets `{ refined: "..." }`. Task 3 needs `number` - it survives because of merge. Replace would lose it.

**Why `output` clobbers**: Plain text tasks store under `output`. If task 1 emits plain text and task 2 emits plain text, task 1's `output` is gone. This is by design: the user should emit JSON with named keys when data needs to survive. We document this prominently.

### 4. Template interpolation: simple `{{key}}` regex replacement

**Decision**: Before spawning a chain task, scan `command` and each entry in `commandArgs` for `{{keyName}}` patterns. Replace with `String(chainContext[keyName] ?? "")`. No Mustache library - a single regex handles it.

**Why no Mustache/Handlebars library**: We only need `{{key}}` substitution, not conditionals, loops, or partials. A `/{{(\w+)}}/g` regex is 5 lines and adds zero dependencies.

**Missing key behavior**: Missing keys resolve to empty string (matches Mustache default). `gh issue edit {{number}}` with no `number` in context becomes `gh issue edit ` (trailing space) - the shell will fail, which is correct feedback.

**No escaping**: `{{` in commands that need to be literal will be mangled. This is an accepted trade-off documented in the help modal. The niche case (commands containing literal `{{key}}` patterns) doesn't justify an escape mechanism.

### 5. Context lifecycle: per loop iteration, in-memory only

**Decision**: `chainContext` is a local variable inside `LoopController.run()`, initialized to `{}` at the top of each iteration. It is never serialized, never written to disk, never exposed via IPC or LoopMeta.

**Why not expose via LoopMeta**: Context is ephemeral debug data. Exposing it via IPC creates a contract obligation and increases payload size. Users who need to see context can check the log file (we write a context summary line after each task).

**Why not persist across iterations**: Loop iterations are independent by design. Carrying context forward could cause stale data to leak into the next iteration, especially if the external state changed between runs.

### 6. MAX_CONTEXT_STDOUT_BYTES cap (1MB)

**Decision**: Buffer is capped at `MAX_CONTEXT_STDOUT_BYTES` (defined in `constants.ts`). If stdout exceeds the cap, only the first 1MB is captured and a warning line is written to the log.

**Why 1MB**: Generous enough for any JSON output from `gh`, `jq`, `opencode run`, etc. Small enough to not cause memory pressure even with deep chains.

### 7. Help modal: `ContextHelpModal.tsx`

**Decision**: A new board component accessible from the TaskForm and TaskBrowser via a `?` key or a dedicated help button. Shows the context contract (JSON merge rules, `{{key}}` syntax, plain text fallback, the `output` clobbering caveat).

**Why a modal**: The contract has enough nuance (JSON vs JSONL vs plain text, merge semantics, clobbering) that a one-liner tooltip won't cover it. A modal is consistent with the existing `HelpModal` pattern.

## Risks / Trade-offs

- [Memory: unbounded stdout in long-running chains] -> Mitigated by `MAX_CONTEXT_STDOUT_BYTES` cap at 1MB.
- [`{{key}}` collision with commands that use literal `{{`] -> Documented as a known limitation; niche enough to not justify escaping.
- [Plain text `output` clobbering surprises users] -> Mitigated by prominent documentation in README + help modal + the `jq` tip (`--jq '{key: .field}'`).
- [No cycle detection in chain walking] -> Pre-existing risk, not introduced by this change. Context makes cycles marginally more dangerous (stale `output` could loop), but the root cause is the missing cycle guard which is out of scope.
- [Log file size grows with captured stdout] -> No - stdout is teed to the log stream unchanged. The capture buffer is separate and in-memory only.
