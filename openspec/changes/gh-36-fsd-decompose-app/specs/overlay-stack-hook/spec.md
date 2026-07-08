## ADDED Requirements

### Requirement: useOverlayStack hook manages modal/open state
The system SHALL provide a `useOverlayStack(context)` custom hook that encapsulates all modal open/close state and the `popLayer()` escape-key priority logic currently inline in App.tsx.

#### Scenario: popLayer closes topmost overlay
- **WHEN** a confirm dialog is active and popLayer is called
- **THEN** the confirm dialog SHALL be dismissed
- **WHEN** search is active and popLayer is called (no confirm)
- **THEN** search SHALL be closed
- **WHEN** log modal is open and popLayer is called (no confirm, no search)
- **THEN** the log modal SHALL be closed
- **WHEN** commands browser is open and popLayer is called
- **THEN** the commands browser SHALL be closed
- **WHEN** export modal is open and popLayer is called
- **THEN** the export modal SHALL be closed
- **WHEN** context help is open and popLayer is called
- **THEN** context help SHALL be closed
- **WHEN** a form view is active and popLayer is called
- **THEN** the view SHALL navigate back to board
- **WHEN** nothing is open and popLayer is called
- **THEN** the app SHALL exit

#### Scenario: Overlay state is accessible
- **WHEN** `useOverlayStack` is called with a valid context
- **THEN** it SHALL return the current modal states (logModalRun, commandsBrowserOpen, contextHelpOpen, exportModal) and their setters, plus the `popLayer` function

### Requirement: Overlay hook receives context via typed parameter
The `useOverlayStack` hook SHALL receive all required state and setters through a typed context parameter.

#### Scenario: Context provides all modal state
- **WHEN** the hook is initialized
- **THEN** it SHALL have access to confirm state, search state, modal open flags, view state, and the app exit function through the context parameter
