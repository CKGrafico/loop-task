## ADDED Requirements

### Requirement: Project create wizard in Ink TUI
The system SHALL present a full-page WizardForm when creating a new project in the Ink TUI, with steps for project name (text, required) and project color (select from PROJECT_COLOR_KEYS). The wizard SHALL use the same WizardForm component and keyboard bindings as the loop create wizard.

#### Scenario: User opens project create wizard from projects page
- **WHEN** user presses `n` on the Ink TUI ProjectsPage
- **THEN** the router navigates to the `project-create` view, rendering ProjectForm in create mode with WizardForm

#### Scenario: User completes the create wizard
- **WHEN** user fills in name and color steps and submits (Ctrl+S)
- **THEN** the system calls `createProject(name, color)` via IPC, navigates back to the projects page, and shows the new project in the list

#### Scenario: User cancels the create wizard
- **WHEN** user presses Escape in the create wizard
- **THEN** the system navigates back to the projects page without creating a project

#### Scenario: Name validation on create
- **WHEN** user submits with an empty name
- **THEN** the wizard SHALL display a validation error and not proceed

### Requirement: Project edit wizard in Ink TUI
The system SHALL present a full-page PatchEditForm when editing an existing project in the Ink TUI, with fields for project name and project color pre-populated from the current project values. The edit form SHALL use the same PatchEditForm component and keyboard bindings as the loop edit form.

#### Scenario: User opens project edit wizard from projects page
- **WHEN** user presses `e` on the Ink TUI ProjectsPage with a project selected
- **THEN** the router navigates to the `project-edit` view, rendering ProjectForm in edit mode with PatchEditForm pre-populated with the selected project's name and color

#### Scenario: User saves edits
- **WHEN** user modifies fields and presses Ctrl+S
- **THEN** the system calls `updateProject(id, name, color)` via IPC with only the changed fields, navigates back to the projects page, and reflects the changes

#### Scenario: User cancels edits
- **WHEN** user presses Escape in the edit form
- **THEN** the system navigates back to the projects page without saving changes

#### Scenario: System project protection
- **WHEN** user attempts to edit a system project (isSystem=true)
- **THEN** the system SHALL reject the update and display an error

### Requirement: Project create form in Board
The system SHALL present a full-page form when creating a new project in the Board, using the same two-column FormRow layout and keyboard navigation pattern as the Board loop create form. The form SHALL have fields for project name (text input) and project color (SearchSelect with PROJECT_COLOR_KEYS as options).

#### Scenario: User opens project create form from projects page
- **WHEN** user presses `n` on the Board ProjectsPage
- **THEN** the router navigates to the `project-create` view, rendering ProjectForm in create mode

#### Scenario: User completes the create form
- **WHEN** user fills in name and selects a color and presses Save
- **THEN** the system calls `createProject(name, color)` via IPC, navigates back to the projects page, and shows the new project

#### Scenario: User cancels the create form
- **WHEN** user presses Cancel or Escape
- **THEN** the system navigates back to the projects page without creating a project

#### Scenario: Name validation on create
- **WHEN** user submits with an empty name
- **THEN** the form SHALL display a validation error and not proceed

### Requirement: Project edit form in Board
The system SHALL present a full-page form when editing an existing project in the Board, using the same two-column FormRow layout and PatchEditForm-style pending changes pattern. Fields for project name and project color SHALL be pre-populated from the current project values.

#### Scenario: User opens project edit form from projects page
- **WHEN** user presses `e` on the Board ProjectsPage with a project selected
- **THEN** the router navigates to the `project-edit` view, rendering ProjectForm in edit mode pre-populated with the selected project's name and color

#### Scenario: User saves edits
- **WHEN** user modifies fields and presses Save
- **THEN** the system calls `updateProject(id, name, color)` via IPC, navigates back to the projects page, and reflects the changes

#### Scenario: User cancels edits
- **WHEN** user presses Cancel or Escape
- **THEN** the system navigates back to the projects page without saving changes

### Requirement: Project wizard i18n strings
The system SHALL include i18n strings in `src/i18n/en.json` for all project wizard prompts, hints, field labels, and validation messages.

#### Scenario: Project wizard text is localized
- **WHEN** the project wizard or form is rendered
- **THEN** all prompts, hints, labels, and error messages SHALL come from the i18n dictionary, not hardcoded strings

### Requirement: Project wizard routing
Both the Ink TUI and Board View type unions SHALL include `project-create` and `project-edit` views. Both App.tsx routers SHALL render the ProjectForm component when these views are active.

#### Scenario: Navigate to project-create view
- **WHEN** router.push("project-create") is called
- **THEN** the app renders ProjectForm in create mode

#### Scenario: Navigate to project-edit view
- **WHEN** router.push("project-edit") is called
- **THEN** the app renders ProjectForm in edit mode, with the selected project data passed as props or state

#### Scenario: Back navigation from project wizard
- **WHEN** user presses Escape or Cancel in the project wizard
- **THEN** the router navigates back to the projects page via router.pop()
