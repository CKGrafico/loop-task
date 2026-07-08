## ADDED Requirements

### Requirement: useCommandHandlers hook extracts command dispatch
The system SHALL provide a `useCommandHandlers(context)` custom hook that encapsulates all 20 command handler functions and the `handleCommand` dispatch function currently defined inline in App.tsx.

#### Scenario: All command handlers are accessible
- **WHEN** `useCommandHandlers` is called with a valid AppContext
- **THEN** it SHALL return an object containing a `handlers` record mapping command names to handler functions and a `handleCommand(name: string)` dispatch function

#### Scenario: Command handler behavior is preserved
- **WHEN** `handleCommand("edit")` is called
- **THEN** the edit handler SHALL execute the same logic as the current inline handler in App.tsx (open edit form for selected item)

#### Scenario: Unknown command is handled gracefully
- **WHEN** `handleCommand("nonexistent")` is called
- **THEN** the hook SHALL not throw and SHALL silently ignore the unknown command

### Requirement: Command handlers receive context via typed parameter
The `useCommandHandlers` hook SHALL receive all required state and setters through a typed context parameter, not through React Context or global state.

#### Scenario: Context provides all needed dependencies
- **WHEN** the hook is initialized
- **THEN** it SHALL have access to view setters, selection indices, loop/task/project data, modal state, and all daemon action functions through the context parameter
