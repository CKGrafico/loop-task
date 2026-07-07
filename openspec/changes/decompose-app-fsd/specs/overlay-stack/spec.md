## ADDED Requirements

### Requirement: Overlay management extracted to custom hook
The system SHALL provide a `useOverlayStack` hook in `src/tui/features/overlays/useOverlayStack.ts` that computes `popLayer`, `anyModalOpen`, `commandInputDisabled`, and `inputOwner` from modal open states. The hook SHALL receive an `OverlayContext` typed object with all modal open states, their close setters, confirm state, search state, view, and router pop function.

#### Scenario: popLayer dismisses in priority order
- **WHEN** `popLayer` is called and confirmState is active
- **THEN** confirmState is cleared and the function returns true

#### Scenario: popLayer skips to next when top layer is clear
- **WHEN** `popLayer` is called with no confirmState but searchState is active
- **THEN** searchState is cleared and searchValue is reset

#### Scenario: popLayer on bare board triggers quit confirm
- **WHEN** `popLayer` is called with no modals open and view is "board"
- **THEN** confirmState is set with a quit prompt

#### Scenario: anyModalOpen derived correctly
- **WHEN** logModalRun, commandsBrowserOpen, or exportModal is truthy
- **THEN** `anyModalOpen` is true

#### Scenario: inputOwner resolves correctly
- **WHEN** a modal is open and commandBarHasText is true
- **THEN** `inputOwner` is "modal" (modal takes precedence)
