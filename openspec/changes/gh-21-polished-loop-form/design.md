## Context

The loop create/edit form exists in two parallel implementations:
- **Board CreateForm** (`src/board/components/CreateForm.tsx`): opentui two-column grid, handles both create and edit modes, has copy buttons for command/cwd, per-field validation on change
- **TUI CreateForm** (`src/tui/components/CreateForm.tsx`): ink + WizardForm step-by-step wizard, uses `commandRaw` field, has task picker modal

Key gaps: inline `PatchEditForm` doesn't exist (i18n strings are already present), DetailView/Inspector is read-only, validation logic is split between board-specific `validateAll()` and shared `useLoopFormValidation` hook.

## Goals / Non-Goals

**Goals:**
- Add task mode toggle (inline command vs existing task) in WizardForm
- Merge `commandArgs` into single editable string, re-parse via `parseCommandLine()`
- Smart CWD default: `process.cwd()` on create, loop's stored value on edit
- Clipboard copy for command and cwd (board: copy button; TUI: yank shortcut)
- Skip read-only detail view on edit → go straight to edit form
- Per-field validation using shared `parseDuration()`, `parseMaxRuns()`, `parseCommandLine()` — errors inline on blur and submit
- Form title: "New Loop" / "Edit Loop"

**Non-Goals:**
- Building a full inline `PatchEditForm` (out of scope — the acceptance criteria specify per-field validation in the existing edit form path, not a new component)
- Redesigning the underlying LoopOptions data model
- Changes to daemon IPC protocol
- Task definition CRUD

## Decisions

1. **Shared validation path**: Both board and TUI forms will delegate to `buildLoopOptions()` / `parseDuration()` / `parseMaxRuns()` from `src/loop-config.ts` and `src/duration.ts`. Remove local `validateAll()` in board CreateForm in favor of the shared `useLoopFormValidation` hook. *Rationale: single source of truth, specs require unified validation.*

2. **Task mode as a boolean field**: Add `taskMode` field (`"inline" | "existing"`) to form values. When create is submitted, map `taskMode === "existing"` to `taskId` presence; `taskMode === "inline"` to `command`. On edit, derive `taskMode` from whether `loop.taskId` exists. *Rationale: clean separation, avoids duplicated state.*

3. **Edit navigation**: Board already navigates directly to CreateForm (via `app.tsx` — edit action pushes "create" view). No change needed for board. TUI navigation needs confirmation — check if edit command currently routes through Inspector first.

4. **Existing specs**: Specs already exist under `openspec/specs/` from the archived change. Reference them directly rather than duplicating.

## Risks / Trade-offs

- [Risk] Two parallel form implementations diverge further → Mitigation: share validation logic via the hook
- [Risk] `commandRaw` field used only by TUI CreateForm may confuse data flow → Mitigation: accept as TUI-only concern out of scope for this change
