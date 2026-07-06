## Why

Every loop must have its own `cwd` configured independently — there is no project-level default that loops can inherit from. When many loops in the same project share the same working directory, this leads to repetitive manual entry and no centralized control over where loops run.

## What Changes

- Add an optional `directory` field to the `Project` entity (`src/types.ts`). This is the project-level default working directory.
- Update `project-create` and `project-update` IPC payloads to accept `directory?: string`.
- Add a `resolveEffectiveCwd(loopCwd, projectDirectory)` function that determines the actual working directory for loop execution: empty loop cwd inherits from project, relative paths concatenate, absolute paths override.
- Replace direct `cwd` passthrough in `LoopController.run()` and command runner with resolution via `resolveEffectiveCwd()`.
- Update Create Project form (TUI and board) to include a directory input, auto-filled with `process.cwd()`.
- Update loop create/edit forms so `cwd` hint indicates it can be left empty to inherit from the project directory.
- Update board Inspector to show the resolved effective directory for loops with empty or relative `cwd`.
- Update TUI Inspector similarly.

## Capabilities

### New Capabilities

- `project-directory`: Project-level working directory with loop cwd inheritance (empty inherits, relative concatenates, absolute overrides) and UI for setting/viewing it.

### Modified Capabilities

- `smart-cwd-default`: Loop cwd hint updated to indicate inheritance from project directory; empty cwd now resolves via project instead of just `process.cwd()`.

## Impact

- **IPC contract** (`src/types.ts`): `Project` gains `directory?: string`; `project-create` / `project-update` payloads gain `directory?: string`.
- **Persisted state**: Existing `Project` records gain an empty `directory` on next load. No migration needed — the field is optional.
- **LoopMeta / LoopOptions**: `cwd` field remains `string` (empty `""` means inherit from project). No type breaking change.
- **LoopController**: `run()` and chain execution resolve `cwd` via `resolveEffectiveCwd()` instead of direct passthrough.
- **command-runner**: `executeCommand()` and `executeCommandForeground()` receive the already-resolved effective cwd — no signature change needed.
- **UI**: ProjectForm (TUI), board project create/edit, loop create/edit forms (TUI + board), Inspector (TUI + board).
- **Cross-platform**: `path.isAbsolute()` and `path.join()` handle Windows paths correctly — no extra work needed.
