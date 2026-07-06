## Context

The `Project` entity currently has no working directory concept. Each loop stores its own `cwd` (string) which defaults to `process.cwd()` at creation time. When many loops in the same project share a working directory, each must be set independently. The daemon spawns child processes via `execa` in `command-runner.ts`, passing `cwd` directly. The `LoopController.run()` method reads `this.options.cwd` and passes it through unchanged.

## Goals / Non-Goals

**Goals:**
- Add `directory?: string` to `Project` type, propagated through IPC and persistence
- Add `resolveEffectiveCwd()` that resolves loop cwd against project directory (empty inherits, relative concatenates, absolute overrides)
- Wire resolution into `LoopController.run()` and chain execution
- Add directory input to project create/edit forms (TUI + board), auto-filled with `process.cwd()`
- Update loop forms so cwd hint indicates project inheritance
- Update Inspector (TUI + board) to show effective directory

**Non-Goals:**
- No data migration — `directory` is optional, existing projects get empty value
- No change to `LoopOptions.cwd` or `LoopMeta.cwd` types — they remain `string`, empty means inherit
- No per-loop directory override UI beyond the existing `cwd` input
- No directory browsing/file-picker UI — text input only

## Decisions

1. **Resolution function lives in `src/core/resolve-cwd.ts`** — a standalone pure function, easily testable, imported by `LoopController` and `command-runner`. Keeps resolution logic centralized rather than scattered.

2. **Resolution happens at execution time in `LoopController`**, not at creation time. The effective cwd is computed when `run()` is called, using the current project directory. This means if a project's directory changes, all loops in that project pick up the new value on next run — no stale snapshots.

3. **`resolveEffectiveCwd()` signature**: `(loopCwd: string, projectDirectory: string | undefined) => string`. Returns the effective absolute path. Called by `LoopController.run()` before passing to `executeCommand()`.

4. **`LoopController` needs access to project directory** — resolved via `LoopManager.getProject()` which already exists. The controller already has `this.manager` reference through its parent loop management.

5. **IPC payloads** — `project-create` and `project-update` gain `directory?: string`. Validated same as `name`/`color` — no special validation beyond it being a string (existence check is optional, same as loop cwd).

6. **UI autofill** — Create Project form pre-fills `process.cwd()`. Edit shows current value. Empty is valid.

7. **Inspector display** — Show effective directory via `resolveEffectiveCwd()` computed client-side. If loop cwd is empty, show "Inherited: <project dir>" or "Default: process.cwd()". If relative, show "<resolved path>".

## Risks / Trade-offs

- **[Relative path with no project directory]** → If loop cwd is relative but project directory is empty, resolved path uses `process.cwd()` as base. This matches current fallback behavior. Mitigated by documenting in UI hints.
- **[Circular dependency]** → `resolveEffectiveCwd` is a pure utility with no imports from daemon/core, so no circular dependency risk.
- **[Backward compat]** → Existing loops with absolute `cwd` are unaffected — `path.isAbsolute()` returns true, project directory is ignored. Empty `cwd` loops now inherit from project instead of `process.cwd()`, which is a behavior change but desired.
