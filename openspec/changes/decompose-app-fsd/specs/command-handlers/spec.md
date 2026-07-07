## ADDED Requirements

### Requirement: Command handlers extracted to custom hook
The system SHALL provide a `useCommandHandlers` hook in `src/tui/features/commands/useCommandHandlers.ts` that encapsulates all command handler implementations. The hook SHALL receive a `CommandHandlerContext` typed object containing all required state, setters, and service references. The hook SHALL return `{ handlers, handleCommand }` where `handlers` is a `Record<string, () => void>` and `handleCommand` dispatches by key.

#### Scenario: Edit command on loops tab
- **WHEN** `handleCommand("edit")` is called with `activeTab === "loops"` and a selected loop
- **THEN** the hook sets `cloneMode` to false, sets `editTarget` to the selected loop, resolves pending task selection if the loop has a taskId, and pushes the "create" view

#### Scenario: Delete command on loops tab
- **WHEN** `handleCommand("delete")` is called with `activeTab === "loops"` and a selected loop
- **THEN** the hook sets `confirmState` with a delete prompt and a confirmation callback that calls `loopService.delete`

#### Scenario: Unknown command
- **WHEN** `handleCommand("unknown-cmd")` is called with a value not in the handlers record
- **THEN** the hook pushes an error toast with "Unknown command: unknown-cmd"

#### Scenario: All 20+ handlers preserved
- **WHEN** the handlers record is inspected
- **THEN** it SHALL contain keys for: edit, clone, delete, pause, play, stop, trigger, new-loop, new-task, new-project, project-filter-loops, project-filter-type, project-sort, all-commands, help, search, filter-status, sort, filter-project, debug, logs, select, api, status, export, import
