## ADDED Requirements

### Requirement: Form routing extracted to component
The system SHALL provide a `FormRouter` component in `src/tui/features/forms/FormRouter.tsx` that renders the appropriate form view based on the current view. The component SHALL receive `FormRouterProps` with view, edit targets, callbacks, and data. The component is stateless — all state and callbacks are passed from App.tsx.

#### Scenario: Create view rendering
- **WHEN** view is "create"
- **THEN** CreateView is rendered with appropriate mode and initial values

#### Scenario: Task form rendering
- **WHEN** view is "task-create" or "task-edit"
- **THEN** TaskForm is rendered with appropriate mode and editTask

#### Scenario: Project form rendering
- **WHEN** view is "project-create" or "project-edit"
- **THEN** ProjectFormView is rendered with appropriate mode and editProject

#### Scenario: Board view not rendered by FormRouter
- **WHEN** view is "board"
- **THEN** FormRouter returns null (board layout stays in App.tsx)

### Requirement: Modal rendering extracted to component
The system SHALL provide an `OverlayStack` component in `src/tui/features/overlays/OverlayStack.tsx` that renders all modal overlays. The component SHALL receive `OverlayStackProps` with modal open states, data, and callbacks.

#### Scenario: LogModal rendered when open
- **WHEN** logModalRun is truthy
- **THEN** LogModal is rendered with the run data and close callback

#### Scenario: CommandsBrowserModal rendered when open
- **WHEN** commandsBrowserOpen is true
- **THEN** CommandsBrowserModal is rendered with context and close/select callbacks

#### Scenario: ToastStack always rendered
- **WHEN** OverlayStack is mounted
- **THEN** ToastStack is rendered with toasts
