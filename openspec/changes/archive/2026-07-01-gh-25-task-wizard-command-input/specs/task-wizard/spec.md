## ADDED Requirements

### Requirement: Task wizard step flow with conditional steps

The system SHALL present the task create wizard with the following steps: `command` (required), `name` (required), `onSuccess` (optional), `onFailure` (optional). Steps MAY be conditionally skipped based on current values via a `skip` callback on `WizardStepConfig`.

#### Scenario: Full step flow

- **WHEN** the user creates a new task and all optional fields are shown
- **THEN** the wizard presents 4 steps in order: command, name, onSuccess, onFailure

#### Scenario: Step skipped via skip callback

- **WHEN** a step's `skip` callback returns true for the current values
- **THEN** that step is not rendered and is skipped during Tab/Enter navigation

### Requirement: Chain target selects populated from existing tasks

The system SHALL render the `onSuccess` and `onFailure` fields as `inputType: "select"` with suggestions populated from existing task names. The suggestions list SHALL include a "None" option as the first entry.

#### Scenario: Select shows existing task names

- **WHEN** the user navigates to the onSuccess or onFailure step
- **THEN** a select dropdown displays "None" followed by the names of all existing tasks

#### Scenario: User selects a chain target

- **WHEN** the user selects a task name from the onSuccess select
- **THEN** that task name is stored as the value
- **AND** the `resolveChainId()` function resolves it to a task ID on submission

#### Scenario: User selects None

- **WHEN** the user selects "None" from the onSuccess or onFailure select
- **THEN** the chain field value is set to empty string
- **AND** the corresponding `onSuccessTaskId` or `onFailureTaskId` is set to null on submission

### Requirement: Task edit mode with PatchEditForm

The system SHALL use `PatchEditForm` for task edit mode, showing all fields as a read-only table with inline editing via `change <field>` commands. The `command` field SHALL support re-editing with the same enhanced UX (preview, copy).

#### Scenario: Edit mode displays all fields

- **WHEN** the user enters task edit mode
- **THEN** all task fields are displayed in a read-only table with pending-changes indicator

#### Scenario: Command re-edit shows enhanced UX

- **WHEN** the user activates the command field for editing
- **THEN** the current command is shown with the ability to edit it
- **AND** Ctrl+Y copies the current command value

#### Scenario: Pending changes indicator

- **WHEN** the user has modified one or more fields
- **THEN** a yellow dot and pending count are displayed, matching the loops edit pattern

### Requirement: Task wizard keyboard navigation

The system SHALL support Tab/Shift+Tab between fields, Enter to advance, Up/Down for select fields, and Escape to cancel. The command builder step SHALL support its own sub-navigation (Tab between executable/args, Up/Down for templates, Ctrl+Y for copy).

#### Scenario: Tab navigation between steps

- **WHEN** the user presses Tab in any step
- **THEN** focus moves to the next non-skipped step

#### Scenario: Escape cancels wizard

- **WHEN** the user presses Escape in any step
- **THEN** the wizard is cancelled and `onCancel` is called

### Requirement: Task wizard theme and i18n

The system SHALL use `accent.task` (purple) for task-related highlights, matching `tabAccentColor("tasks")`. All new prompt text, hints, labels, and validation messages SHALL use `t()` keys in `src/i18n/en.json`.

#### Scenario: Task accent color applied

- **WHEN** the task wizard is displayed
- **THEN** highlights and accents use the task (purple) accent color

#### Scenario: All text is i18n

- **WHEN** the task wizard renders any prompt, hint, label, or validation message
- **THEN** the text is retrieved via the `t()` function with a key from `src/i18n/en.json`

### Requirement: Toast confirmations on create and update

The system SHALL show success/error toast notifications on task create and update via `useToasts()`.

#### Scenario: Task created successfully

- **WHEN** the user completes the task create wizard and the task is saved
- **THEN** a success toast is displayed

#### Scenario: Task update succeeds

- **WHEN** the user saves changes in task edit mode
- **THEN** a success toast is displayed

#### Scenario: Task creation fails

- **WHEN** the task create call fails
- **THEN** an error toast is displayed

### Requirement: Wizard step count constants updated

The system SHALL update `WIZARD_TASK_REQUIRED_STEPS` and `WIZARD_TASK_TOTAL_STEPS` in `src/config/constants.ts` if the step count changes due to conditional steps.

#### Scenario: Constants reflect actual step range

- **WHEN** conditional steps are added
- **THEN** `WIZARD_TASK_REQUIRED_STEPS` reflects the minimum required steps
- **AND** `WIZARD_TASK_TOTAL_STEPS` reflects the maximum possible steps
