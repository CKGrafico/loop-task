## MODIFIED Requirements

### Requirement: Global keyboard input is handled by useGlobalShortcuts
The system SHALL delegate all global keyboard shortcut handling to the `useGlobalShortcuts` custom hook instead of inline `useInput` in App.tsx. The behavior of all keyboard shortcuts SHALL remain identical to the pre-refactor implementation.

#### Scenario: All keyboard shortcuts still function
- **WHEN** the refactored App.tsx uses `useGlobalShortcuts` instead of inline `useInput`
- **THEN** all keyboard shortcuts (Ctrl+Enter, Ctrl+chords, Tab, Shift+Tab, 1/2/3, Escape, Ctrl+Left/Right) SHALL produce identical behavior to the original implementation

#### Scenario: App.tsx no longer contains useInput
- **WHEN** App.tsx is examined after refactoring
- **THEN** it SHALL NOT contain any direct `useInput` calls; all keyboard handling SHALL be delegated to `useGlobalShortcuts`
