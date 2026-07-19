# Context Lifecycle Reference

## Overview

The iteration context is a key-value map (`Record<string, unknown>`) that carries data between Tasks within a single iteration. It is created fresh for each iteration, extended by Task stdout, and discarded when the iteration completes.

## 1. Context Creation

A new, empty context is created at the start of each iteration, before the first Task executes.

## 2. Initial Seeding

The context is seeded from two sources, applied in this order:

```
chainContext = { ...task.context, ...loop.context }
```

- **Task context** (`task.context`): Key-value pairs defined on the initial Task.
- **Loop context** (`loop.context`): Key-value pairs defined on the Loop.

**Loop context overrides Task context for the same key.** This is a shallow merge via JavaScript's spread operator.

When neither provides a context, the iteration context starts empty (`{}`).

### Validation of initial context

Initial context values must be primitives: strings, numbers, booleans, or null. Nested objects and arrays are rejected by the validation function. This validation is applied at creation time. At runtime, the system would accept them (via `Object.assign`), but they should not be used.

## 3. Stdout Capture

Stdout is captured only when at least one of these conditions is true:
- The Task has chain successors (`onSuccessTaskId` or `onFailureTaskId` is defined)
- The Task has multiple steps
- The first step has multiple commands

When stdout is **not** captured, it is streamed directly to the log file. No context parsing occurs.

### Capture mechanism

- Stdout is captured via a transform stream that accumulates bytes.
- Captured output is capped at **1 MB** (`MAX_CONTEXT_STDOUT_BYTES = 1048576`).
- If the output exceeds the cap, it is truncated. A warning is written to the log, but the captured portion is still parsed.
- Stderr is **never** captured for context. It is written to the log file only.

## 4. Parsing Rules

After a Task executes and stdout is captured, the output is parsed to extract key-value pairs.

### Step 1: Trim

The output is trimmed of leading/trailing whitespace.

### Step 2: Empty check

If the trimmed output is empty, no context change occurs. The parser returns `null`.

### Step 3: Whole-output JSON parse attempt

The trimmed output is passed to `JSON.parse`. If it succeeds:

| Parsed result | Context update |
|---|---|
| JSON object | Keys are merged directly into the context |
| JSON string primitive | `{ output: String(value) }` |
| JSON number primitive | `{ output: "42" }` (converted to string) |
| JSON boolean primitive | `{ output: "true" }` (converted to string) |
| JSON null | `{ output: "null" }` |
| JSON array | `{ output: originalString }` (stored as raw string) |

### Step 4: JSONL parse attempt (when whole-output parse fails)

The output is split into lines. Each non-empty line is parsed as JSON:

- If ALL non-empty lines parse successfully as JSON:
  - Each object line's keys are merged into the context.
  - Each primitive line is stored under the `output` key.
  - Example: `{"a":1}\n{"b":2}` → `{ a: 1, b: 2 }`
  - Example: `{"a":1}\n"hello"` → `{ a: 1, output: "hello" }`

- If ANY line fails to parse as JSON: JSONL detection fails. Fall through to plain text.

### Step 5: Plain text fallback

Any output that is not valid JSON or JSONL is stored under the `output` key:

- `{ output: trimmedString }`
- Multi-line plain text preserves internal newlines: `line1\nline2` → `{ output: "line1\nline2" }`

## 5. Merge Semantics

Parsed output is merged into the iteration context via `Object.assign(chainContext, parsed)`.

| Merge rule | Behaviour |
|---|---|
| New key | Added to the context |
| Existing key | Overwritten by the new value (shallow replacement) |
| The `output` key | Overwritten every time a Task produces plain-text output |
| Structured keys (from JSON) | Each key is added or overwritten individually |
| No deep merge | Nested objects are not deep-merged; `Object.assign` replaces at the top level |

### Key clobbering scenarios

A Task producing plain text **always** overwrites the `output` key. If a previous Task produced a structured value under `output`, it is lost. To avoid this:

- Use **named JSON keys** for values that must survive across chain steps.
- Use the `output` key only for values that are consumed immediately and do not need to persist through later Tasks.

### JSONL merge order

In JSONL output, lines are processed in order. Later lines overwrite earlier lines for the same key:

```
{"a": 1, "b": 2}
{"b": 99, "c": 3}
```

Result: `{ a: 1, b: 99, c: 3 }` (b was overwritten by the second line)

## 6. Interpolation

Before a Task executes, any `{{key}}` placeholders in its command and arguments are replaced with the current iteration context values.

### Syntax

`{{key}}` where `key` matches `\w+` (one or more word characters: letters, digits, underscore).

### Behaviour

| Context state | Interpolation result |
|---|---|
| Key exists with a string value | Value is shell-escaped and inserted |
| Key exists with a number value | `String(value)` is shell-escaped and inserted |
| Key exists with a boolean value | `"true"` or `"false"` is inserted |
| Key exists with null | Empty string is inserted |
| Key does not exist | Empty string is inserted (no error) |

### Shell escaping

Values are shell-escaped before substitution:
- Purely "safe" characters (letters, digits, `_-=:./,@`) pass through unmodified.
- Everything else is wrapped in single quotes with internal single quotes escaped.
- This prevents shell injection from context values.

### When interpolation occurs

Interpolation occurs **before every Task execution**, including:
- The initial Task in the iteration
- Every chain successor Task

The initial Task interpolates seeded context (from `task.context` + `loop.context`). It has no produced context yet.

### What interpolation does NOT do

- It does not modify the context. The original values remain unchanged.
- It does not support nested `{{outer.{inner}}}` syntax.
- It does not support default values (e.g., `{{key:default}}`).
- It does not support conditional expressions.

## 7. Context Lifetime

| Boundary | Behaviour |
|---|---|
| Between Tasks in the same chain | Context persists and accumulates |
| Across success/failure transitions | Context persists (failure routing does not reset it) |
| Between iterations | Context is **discarded** — a fresh context is created |
| Between Loops | Context is **not shared** — each Loop iteration has its own context |
| On persistence | Context is **never persisted** to disk |

## 8. Edge Cases

| Edge case | Behaviour |
|---|---|
| Task produces no output | No context change. `parseStdout("")` returns `null`. |
| Task produces only whitespace | No context change. Whitespace is trimmed, result is empty. |
| Task produces invalid JSON that looks like JSONL | JSONL detection fails if any line is invalid. Entire output falls back to plain text under `output`. |
| Two Tasks produce the same named key | Later value overwrites earlier value via `Object.assign`. |
| Task produces a JSON array | Stored as raw string under `output`. Arrays are not spread into context. |
| Task produces a JSON primitive (string, number, boolean, null) | Converted to string and stored under `output`. |
| Context value contains special characters | Shell-escaped during interpolation. Safe for use in subprocess arguments. |
| Context value contains newlines | Newlines are preserved in the context; during interpolation, the value is shell-escaped (wrapped in single quotes). |
| Context key contains non-word characters | Not matchable by `{{key}}`. Only `\w+` keys are interpolatable. |
| A Task with no successors produces stdout | Stdout is not captured (no need for context). Output goes to the log only. |
| Multi-step Task: step produces JSON, next step produces plain text | JSON keys are merged, then `output` is overwritten by the plain text. |
