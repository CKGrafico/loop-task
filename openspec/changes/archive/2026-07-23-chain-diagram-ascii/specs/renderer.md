# Spec: renderChainDiagram

## Input

- `rootTaskId: string` — the task ID to start from
- `tasks: TaskDefinition[]` — all available tasks for lookup
- `rootTask?: TaskDefinition` — optional pre-resolved root (for missing-task case)

## Output

- `string` — the full ASCII diagram

## Algorithm

1. Build a `Map<string, TaskDefinition>` from `tasks`
2. Recursive render starting from root:
   - Track `visited: Set<string>` for cycle detection
   - If task ID already visited → return `(cycle to {taskName})`
   - If task not in map → render box with `(missing task)`
3. Each task box:
   - Top border: `+---...+`
   - Name line: `|  {name}{silent ? " [s]" : ""}  |`
   - If `steps` exist: render each step's commands
   - Else: render `commandLine(command, commandArgs)`
   - Branch lines: `onSuccess -> {name or (none)}`, `onFailure -> {name or (none)}`
   - Bottom border: `+---...+`
4. Between boxes: vertical arrow `|` then `v`
5. Box width: max of content lines + padding

## Cycle handling

Use per-render `visited` set. When following onSuccess/onFailure and the target ID is in `visited`, emit `(cycle to {targetName})` as the branch label instead of rendering a new box.

## Example output

```
+-----------------------------------+
|  Dev 1 - To Implement             |
|  (Selection + Reservation)        |
|                                   |
|  Step 1: gh issue list            |
|          --label code:pick        |
|          -> {number, title, body} |
|                                   |
|  Step 2: gh issue edit            |
|          pick -> doing            |
|                                   |
|  onSuccess -> Dev 2               |
|  onFailure -> No Tasks (silent)   |
+-----------------------------------+
               |
               v
+-----------------------------------+
|  Dev 2 - Implementing             |
|  (AI Work)                        |
|                                   |
|  opencode run "/plan-goal ..."    |
|                                   |
|  onSuccess -> (none)              |
|  onFailure -> (cycle to Dev 1)    |
+-----------------------------------+
```
