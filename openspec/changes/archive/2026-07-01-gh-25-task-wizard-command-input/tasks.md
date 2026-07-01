## 1. WizardForm Extensibility

- [x] 1.1 Add `renderCustom?` callback and `skip?` callback to `WizardStepConfig` interface in `WizardForm.tsx`
- [x] 1.2 Update `WizardForm` rendering to delegate to `renderCustom` when provided, falling back to TextField/SelectField
- [x] 1.3 Update `WizardForm.useInput` handler to skip active steps that have `renderCustom`, allowing the custom component to own key handling
- [x] 1.4 Update `WizardForm.moveField` to skip steps where `skip(values)` returns true
- [x] 1.5 Write unit tests for `renderCustom` and `skip` callback behavior in `WizardForm`

## 2. Command Builder Component

- [x] 2.1 Add `COMMAND_TEMPLATES` constant array to `src/config/constants.ts` with ~10 common templates (npm run, pnpm test, dotnet build, docker compose up, shell scripts, etc.)
- [x] 2.2 Create `src/tui/components/CommandBuilderField.tsx` with sub-state machine: `executable` → `args` → `preview`
- [x] 2.3 Implement executable text input field with focus management and cursor
- [x] 2.4 Implement args text input field with Tab navigation from executable
- [x] 2.5 Implement live command preview rendering (executable + args assembled)
- [x] 2.6 Implement Ctrl+Y copy support for assembled command using `copyToClipboard` from `src/shared/clipboard.js`
- [x] 2.7 Implement template suggestions list when executable is empty (Up/Down navigation, Enter to select)
- [x] 2.8 Implement basic validation: empty executable error, unbalanced quotes warning in args
- [x] 2.9 Implement `onChange` callback that reports assembled command string to parent WizardForm
- [x] 2.10 Write unit tests for `CommandBuilderField` using ink-testing-library

## 3. Task Wizard Step Configuration

- [x] 3.1 Add i18n keys to `src/i18n/en.json` for all new command builder prompts, hints, labels, validation messages, and template labels
- [x] 3.2 Update `TaskForm.tsx` create-mode steps: command step with `renderCustom` pointing to `CommandBuilderField`, onSuccess/onFailure as `inputType: "select"` with task name suggestions + "None"
- [x] 3.3 Add `skip` callback to onSuccess/onFailure steps (skip onFailure when onSuccess is "None" and vice versa if needed)
- [x] 3.4 Update `handleComplete` in TaskForm to parse command from command builder output (executable + args) instead of raw `parseArgs(command)`
- [x] 3.5 Update chain select suggestions to be populated from `tasks` state (already loaded via `listTasks()`)
- [x] 3.6 Update `WIZARD_TASK_REQUIRED_STEPS` and `WIZARD_TASK_TOTAL_STEPS` in `src/config/constants.ts` if step range changes

## 4. Task Edit Mode Enhancement

- [x] 4.1 Update `TaskForm.tsx` edit mode to use `accent.task` color for title
- [x] 4.2 Ensure PatchEditForm command field supports Ctrl+Y copy of current value
- [x] 4.3 Verify pending-changes indicator (yellow dot + count) works for task edit fields
- [x] 4.4 Add toast confirmations for task create (success/error) and update (success/error) in TaskForm

## 5. Validation and Tests

- [x] 5.1 Add `name` and `command` validators to `src/tui/utils/validation.ts` if not already present
- [x] 5.2 Write integration test for task wizard create flow with command builder
- [x] 5.3 Write integration test for task edit flow with PatchEditForm
- [x] 5.4 Run `rtk npx tsc --noEmit` → `rtk pnpm lint` → `rtk pnpm test` and fix any issues
