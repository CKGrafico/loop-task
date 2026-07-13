## Context

The loop form is implemented in two separate UI layers: the board (`src/board/components/CreateForm.tsx`) using OpenTUI React components, and the TUI (`src/tui/components/CreateForm.tsx` / `WizardForm.tsx` / `PatchEditForm.tsx`). The board form handles both create and edit modes but currently routes edit through a `DetailView` read-only screen first. The TUI uses separate components for create (wizard) and edit (patch). Validation logic is duplicated between the two layers, the board uses `parseDuration()` from `src/duration.ts` while the TUI uses a local regex.

## Goals / Non-Goals

**Goals:**
- Direct edit navigation (skip DetailView) in both board and TUI
- Task mode toggle (inline command vs existing task) with field clear on switch
- Merge `commandArgs` into single editable string; re-parse via `parseCommandLine()` on save
- Pre-fill `cwd` with `process.cwd()` as an editable default on create
- Clipboard copy buttons for command and cwd fields
- Per-field inline validation errors in both board and TUI, delegating to `src/duration.ts` and `src/loop-config.ts`
- Create vs edit mode distinction in form title

**Non-Goals:**
- Redesigning `LoopOptions` data model
- Changes to daemon IPC protocol
- Removing Inspector or DetailView (remain for read-only contexts)
- Task definition CRUD

## Decisions

1. **Error state per-field**, each field tracks `{value, error, touched}` state. Errors populate on blur and submit. Fields without error show no indicator.

2. **Parse-on-save for command+args**, `commandArgs` joins to `command` on load into a single input; `parseCommandLine()` splits on save. This keeps the UX simple while matching v1 behavior.

3. **Mode-switch clears opposite field**, toggling from "inline command" to "existing task" clears the command input and vice versa, preventing stale data from being submitted.

4. **Clipboard via `navigator.clipboard.writeText()`**, available in both Bun (board) and Node 20+ (TUI). Falls back silently if unavailable.

5. **Shared validation helpers**, board and TUI both call `parseDuration()` and `buildLoopOptions()`/`parseMaxRuns()` from shared modules. No per-UI regex validation.

## Risks / Trade-offs

- [Risk] `navigator.clipboard` requires secure context (HTTPS or localhost). Board runs on localhost so this is fine; TUI runs in terminal so clipboard access may need a polyfill. Mitigation: wrap in try/catch, show fallback message.
- [Risk] Merging `commandArgs` into the command string changes the edit UX, users editing a loop with complex args see them as one string. Acceptable trade-off for simplicity.
