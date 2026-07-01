## Context

The task create/edit wizard (`TaskForm.tsx`) uses `WizardForm` with 4 flat steps: command (bare text input), name, onSuccess, onFailure. The command field is a single `inputType: "text"` with hint "Full command line. Quote args with spaces" — no structure, no preview, no copy, no templates, no validation beyond "not empty". The loops wizard already has conditional step logic (`taskMode`) hardcoded in `WizardForm.useInput`. `PatchEditForm` is fully functional for loops edit mode and already used for task edit mode in `TaskForm.tsx`.

## Goals / Non-Goals

**Goals:**
- Replace bare command text input with a structured command builder step (executable + args, live preview, copy, templates, validation)
- Convert onSuccess/onFailure from bare text to select inputs populated from existing task names
- Implement conditional step skipping when chain target is "None"
- Ensure task edit mode via PatchEditForm supports command re-edit with enhanced UX
- Full i18n coverage for all new text
- Tests for new/changed Ink components

**Non-Goals:**
- $PATH autocompletion for executable names
- Shell syntax highlighting in command preview
- Changes to the daemon-side `TaskManager` or `TaskDefinition` type shape
- Changes to IPC contract or persisted state format

## Decisions

### 1. Command builder as a custom rendering path in WizardForm (not new inputType)

**Decision:** Add a `renderCustom?` callback to `WizardStepConfig` that, when provided, overrides the default TextField/SelectField rendering for that step. The command builder component (`CommandBuilderField`) is a separate component rendered via this callback.

**Rationale:**
- Adding `inputType: "command-builder"` to WizardForm would bake task-specific UI into a generic form component
- A `renderCustom` callback keeps WizardForm generic — any step can have custom rendering without polluting the inputType union
- The command builder keyboard handling (sub-fields for executable/args, template navigation, copy) is too complex to fit into WizardForm's unified `useInput` handler
- Alternative considered: Making `inputType` extensible with a registry. Over-engineered for current needs.

### 2. Command builder as a self-contained component with its own useInput

**Decision:** `CommandBuilderField` uses its own `useInput` hook (scoped via `isActive` prop from WizardForm). When the command step is active, WizardForm's general `useInput` handler is bypassed.

**Rationale:**
- The command builder has sub-fields (executable, args), template suggestions, and copy — too many keys for WizardForm's flat input model
- Ink's `useInput` is additive — multiple hooks fire. WizardForm must check `activeField` and skip its handler when the command step is active
- Cleanest separation: CommandBuilderField manages its own state and key handling, reports final `command` string up to WizardForm via `onChange`

### 3. Template suggestions as a static constant list

**Decision:** Store command templates in `src/config/constants.ts` as `COMMAND_TEMPLATES: { label: string; command: string; args: string[] }[]`. When the command builder executable field is empty, show templates as pickable options.

**Rationale:**
- Templates are static and few (~10-15 entries) — no need for dynamic loading
- Keeping them in constants follows project convention
- Alternative: Fetching from a config file. Unnecessary complexity for v1.

### 4. Chain-target selects populated from `listTasks()` on mount

**Decision:** `TaskForm` already calls `listTasks()` on mount and stores results in `tasks` state. Build `suggestions` arrays from `.map(t => t.name)`, prepend "None" option, and pass to `WizardStepConfig.suggestions` for `onSuccess`/`onFailure`.

**Rationale:**
- Uses existing daemon IPC — no new API surface
- `resolveChainId()` already handles name→id resolution
- "None" as a suggestion entry (first position) followed by task names — simple and predictable

### 5. Conditional step skipping via a `skip?` callback on WizardStepConfig

**Decision:** Add `skip?: (values: Record<string, string>) => boolean` to `WizardStepConfig`. When `skip` returns true for a step, `moveField` and field rendering skip that step. For tasks: `onFailure` step skips when `onSuccess` is "None" (and vice versa if needed).

**Rationale:**
- Current taskMode conditional logic is hardcoded in WizardForm — brittle and not reusable
- A `skip` callback is generic: any step can be conditional based on current values
- Alternative: Keeping it hardcoded. Rejected — task wizard needs its own conditional logic independent of loops.
- The existing `taskMode` hardcoded logic in WizardForm should be refactored to also use `skip` callbacks, but that can be a separate cleanup.

## Risks / Trade-offs

- **Multiple useInput hooks** → Both WizardForm and CommandBuilderField register `useInput`. Mitigation: WizardForm checks `activeField` index and returns early when command step is active; CommandBuilderField checks its own `isActive` flag.
- **Command builder complexity** → The builder has 3 sub-modes (executable input, args input, template browse). Mitigation: Keep sub-modes to 3 max; use a simple state machine (`executable` → `args` → `preview`).
- **Step count changes** → Current `WIZARD_TASK_TOTAL_STEPS = 4` may change. Mitigation: The `skip` callback approach means the *visible* step count is dynamic; keep constants for max/required steps only.
