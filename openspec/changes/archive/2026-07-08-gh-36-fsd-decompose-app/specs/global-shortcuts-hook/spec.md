## ADDED Requirements

### Requirement: useGlobalShortcuts hook extracts keyboard handling
The system SHALL provide a `useGlobalShortcuts(context)` custom hook that encapsulates all global keyboard shortcut logic currently defined in the `useInput` call in App.tsx.

#### Scenario: Ctrl+Enter shortcut works
- **WHEN** the user presses Ctrl+Enter (detected via `key.ctrl && key.return`, `\x0e`, or multi-char `\r`/`\n` sequences)
- **THEN** the hook SHALL trigger the submit action for the current context (confirm dialog, form submit, or command execution)

#### Scenario: Ctrl+chord shortcuts work
- **WHEN** the user presses Ctrl+F followed by a filter key
- **THEN** the hook SHALL activate the corresponding filter
- **WHEN** the user presses Ctrl+A followed by an action key
- **THEN** the hook SHALL execute the corresponding action

#### Scenario: Tab panel switching works
- **WHEN** the user presses Tab
- **THEN** the hook SHALL toggle panel focus between left and right panels
- **WHEN** the user presses Shift+Tab
- **THEN** the hook SHALL toggle panel focus in reverse

#### Scenario: Number key tab switching works
- **WHEN** the user presses 1, 2, or 3
- **THEN** the hook SHALL switch to the corresponding tab (loops, tasks, projects)

#### Scenario: Escape key works
- **WHEN** the user presses Escape
- **THEN** the hook SHALL delegate to the overlay stack's popLayer function

#### Scenario: Shortcut hook skips when input is focused
- **WHEN** a modal is open or the command bar has text
- **THEN** the hook SHALL skip global shortcut handling for conflicting keys

### Requirement: Shortcut hook receives context via typed parameter
The `useGlobalShortcuts` hook SHALL receive all required state and callbacks through a typed context parameter.

#### Scenario: Context provides overlay and navigation callbacks
- **WHEN** the hook is initialized
- **THEN** it SHALL have access to popLayer, view setters, tab setters, panel focus state, and input owner detection through the context parameter
