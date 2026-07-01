## Why

The task create/edit wizard (`TaskForm.tsx`) uses 4 flat steps with a bare text input for the command field — no guidance, no structure, no validation. Writing shell commands is the most complex and error-prone step in task creation. Users need a guided experience matching the polished loops wizard (`WizardForm` + `PatchEditForm`), with command builder UX, live preview, copy support, template suggestions, and chain-target selects.

## What Changes

- Replace the bare command text input with an enhanced command builder step featuring structured input, live preview, copy support, and template suggestions
- Add `inputType: "command-builder"` to `WizardForm` or add a custom rendering path for the `command` key
- Convert `onSuccess`/`onFailure` fields from bare text to `select` inputs populated from existing task names
- Implement conditional step skipping (when chain target is "None")
- Wire task edit mode through `PatchEditForm` with inline editing and pending-changes indicator
- Add i18n keys for all new prompt text, hints, labels, and validation messages
- Update `WIZARD_TASK_REQUIRED_STEPS` and `WIZARD_TASK_TOTAL_STEPS` in constants if step count changes
- Add tests for new/changed Ink components

## Capabilities

### New Capabilities
- `command-builder`: Structured command input with live preview, copy support, template suggestions, and basic validation for the task wizard command step
- `task-wizard`: Full task create/edit wizard flow using WizardForm + PatchEditForm with chain-target selects, conditional steps, and keyboard navigation

### Modified Capabilities
- `copy-command`: Extend to support copying assembled commands from the command builder step

## Impact

- `src/tui/components/WizardForm.tsx` — new inputType or custom rendering path for command builder
- `src/tui/components/TaskForm.tsx` — restructured step flow, new command step, select fields for chains
- `src/tui/components/PatchEditForm.tsx` — task edit mode integration, command re-edit UX
- `src/tui/components/CommandInput.tsx` — may be extended or replaced by command builder
- `src/config/constants.ts` — step count constants
- `src/i18n/en.json` — new i18n keys
- `src/types.ts` — no changes to TaskDefinition shape (command + commandArgs already defined)
- `src/tui/daemon.ts` — no changes needed (parseArgs, createTask, updateTask already exist)
- IPC contract (`src/types.ts`) — no changes to persisted state shape or IPC messages
