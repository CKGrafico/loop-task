## ADDED Requirements

### Requirement: FormRouter component renders correct form view
The system SHALL provide a `<FormRouter>` component that renders the appropriate form component based on the current `view` state.

#### Scenario: Create loop view
- **WHEN** view is "create"
- **THEN** FormRouter SHALL render the CreateView component with appropriate props

#### Scenario: Task form views
- **WHEN** view is "task-create"
- **THEN** FormRouter SHALL render TaskForm in create mode
- **WHEN** view is "task-edit"
- **THEN** FormRouter SHALL render TaskForm in edit mode with the selected task data

#### Scenario: Project form views
- **WHEN** view is "project-create"
- **THEN** FormRouter SHALL render ProjectFormView in create mode
- **WHEN** view is "project-edit"
- **THEN** FormRouter SHALL render ProjectFormView in edit mode with the selected project data

#### Scenario: Board view
- **WHEN** view is "board" or any non-form view
- **THEN** FormRouter SHALL not render any form (returns null or the board layout)

### Requirement: FormRouter receives props explicitly
The FormRouter component SHALL receive view state, edit targets, and all required callbacks as explicit props.

#### Scenario: Props include all form dependencies
- **WHEN** FormRouter is rendered
- **THEN** it SHALL have access to view, all form submission callbacks, cancel handlers, edit target data, and initial values through its props
