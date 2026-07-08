## ADDED Requirements

### Requirement: Shared format module for CLI and TUI
The system SHALL provide a `src/shared/format.ts` module containing pure formatting functions (`describeLoop`, `statusLabel`, `commandLine`, `formatCmd`, `truncate`, `quoteArg`, `unescapeCommand`) that are importable by both the CLI (`cli.ts`) and the TUI layer without depending on any UI framework.

#### Scenario: CLI imports format from shared
- **WHEN** `cli.ts` needs `describeLoop` or `statusLabel`
- **THEN** it SHALL import from `src/shared/format.ts` instead of `src/board/format.ts`

#### Scenario: TUI imports format from shared
- **WHEN** TUI components need format functions
- **THEN** they SHALL import from `src/shared/format.ts` instead of local `./format`

### Requirement: Shared UI utilities layer
The system SHALL provide a `src/shared/ui/` directory containing UI utilities previously duplicated across `tui/` and `board/`: `state.ts`, `router.ts`, `useBreakpoint.ts`, `useHoverState.ts`, `useLogStream.ts`, `useLoopPolling.ts`.

#### Scenario: TUI imports shared hook
- **WHEN** a TUI component needs `useLoopPolling`
- **THEN** it SHALL import from `src/shared/ui/hooks/useLoopPolling.ts` instead of `./hooks/useLoopPolling`

#### Scenario: TUI imports shared state
- **WHEN** a TUI component needs loop state utilities
- **THEN** it SHALL import from `src/shared/ui/state.ts` instead of `./state`

### Requirement: Board directory eliminated
The `src/board/` directory SHALL NOT exist in the codebase. No file SHALL import from `src/board/`.

#### Scenario: Board directory absent
- **WHEN** the build or type-check runs
- **THEN** `src/board/` SHALL NOT be present on the filesystem

#### Scenario: No board imports remain
- **WHEN** searching all source files for imports from `board/`
- **THEN** zero matches SHALL be found

## MODIFIED Requirements

### Requirement: CodeEditor modal opens from command field
The system SHALL provide a full-screen modal code editor that opens when the user activates the command field in loop or task creation/editing forms, in the Ink 7 (tui) layer. The board layer duplicate SHALL be removed.

#### Scenario: Open editor from Ink wizard
- **WHEN** the user is on the command step of a WizardForm and presses Enter on the preview field
- **THEN** the CodeEditor modal opens with the current command text loaded and cursor at the end

#### Scenario: Open editor with empty command
- **WHEN** the command field is empty and the user opens the editor
- **THEN** the modal opens with a single empty line and cursor at position 0,0
