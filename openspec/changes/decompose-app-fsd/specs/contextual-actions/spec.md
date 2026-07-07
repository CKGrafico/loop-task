## ADDED Requirements

### Requirement: Contextual actions extracted to custom hook
The system SHALL provide a `useContextualActions` hook in `src/tui/features/actions/useContextualActions.ts` that encapsulates `handleContextualCopy` and `triggerContextualAction`. The hook SHALL receive an `ActionContext` typed object with active tab, focused panel, selected entities, and command/service references.

#### Scenario: Copy on loops tab
- **WHEN** `handleContextualCopy` is called with `activeTab === "loops"` and a selected loop
- **THEN** the loop's command text is copied to clipboard and a toast is shown

#### Scenario: Contextual action on loops right panel
- **WHEN** `triggerContextualAction` is called on board view with `activeTab === "loops"` and `focusedPanel === "right"` and a selected loop with run history
- **THEN** the log modal opens for the latest run

#### Scenario: Contextual action on tasks tab
- **WHEN** `triggerContextualAction` is called on board view with `activeTab === "tasks"` and a selected task
- **THEN** the edit command handler is invoked
