## ADDED Requirements

### Requirement: Global shortcuts extracted to custom hook
The system SHALL provide a `useGlobalShortcuts` hook in `src/tui/features/shortcuts/useGlobalShortcuts.ts` that registers all keyboard input handling via Ink's `useInput`. The hook SHALL receive a `ShortcutContext` typed object with active tab, focused panel, view, handleCommand, triggerContextualAction, popLayer, and input ownership state. The hook SHALL manage `chordState` and `commandBarHasText` internally.

#### Scenario: Ctrl+Enter triggers contextual action
- **WHEN** Ctrl+Enter is pressed while on board view with no modals open
- **THEN** `triggerContextualAction` is called

#### Scenario: Ctrl+chord state machine
- **WHEN** Ctrl+F is pressed followed by "s"
- **THEN** the search command handler is invoked and chordState is cleared

#### Scenario: Tab key switches panel focus
- **WHEN** Tab is pressed on board view with no modals
- **THEN** focusedPanel toggles between "left" and "right"

#### Scenario: Number keys switch tabs
- **WHEN** "1" is pressed on board view
- **THEN** activeTab is set to "loops"

#### Scenario: Escape dismisses top layer
- **WHEN** Escape is pressed
- **THEN** popLayer is called

#### Scenario: Ctrl+C triggers quit confirm on bare board
- **WHEN** Ctrl+C is pressed with no modals open
- **THEN** confirmState is set with a quit prompt

#### Scenario: Shortcuts disabled when input owned by command bar
- **WHEN** inputOwner is "command-bar" and a shortcut key is pressed
- **THEN** no shortcut action is taken (input reaches command bar instead)
