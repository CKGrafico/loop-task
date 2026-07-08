## ADDED Requirements

### Requirement: FSD layer directories exist
The project SHALL have the following directory structure under `src/`: `app/`, `widgets/`, `features/`, `entities/`, `shared/`. Each layer directory SHALL contain slice subdirectories.

#### Scenario: Directory structure verification
- **WHEN** listing `src/` directory
- **THEN** `app/`, `widgets/`, `features/`, `entities/`, `shared/` directories exist

### Requirement: Strict one-way dependency between FSD layers
Imports SHALL follow the dependency direction: `app -> widgets -> features -> entities -> shared`. A layer SHALL only import from layers below it in this order. `shared/` SHALL NOT import from any other FSD layer.

#### Scenario: Widget imports from feature layer
- **WHEN** a file in `src/widgets/<name>/` imports a module
- **THEN** the imported module is from `src/features/`, `src/entities/`, or `src/shared/`

#### Scenario: Shared layer has no upward imports
- **WHEN** a file in `src/shared/` imports a module
- **THEN** the imported module is NOT from `src/app/`, `src/widgets/`, `src/features/`, or `src/entities/`

### Requirement: Public API via index.ts per slice
Each widget, feature, and entity slice SHALL export its public API through an `index.ts` file. Other slices SHALL NOT import internal files directly.

#### Scenario: Widget re-exports via index.ts
- **WHEN** a file outside `src/widgets/header/` imports from that widget
- **THEN** the import path uses `src/widgets/header/index.ts` (or its re-exports), not an internal file

### Requirement: No file exceeds 300 lines
No source file in `src/` SHALL exceed 300 lines, except `src/types.ts` and `src/i18n/en.json`.

#### Scenario: Large file split
- **WHEN** a source file in `src/` is measured
- **THEN** line count is at most 300 (excluding types.ts and en.json)

### Requirement: TUI files migrated to FSD structure
All files previously in `src/tui/` SHALL be relocated to appropriate FSD layers. The `src/tui/` directory SHALL NOT exist after migration.

#### Scenario: Old tui directory removed
- **WHEN** listing `src/` directory after migration
- **THEN** `src/tui/` does not exist

### Requirement: Shared utilities consolidated
`src/hooks/useLoopFormValidation.ts`, `src/tui/utils/*`, `src/tui/format.ts`, `src/tui/theme.ts`, `src/tui/hooks/*` SHALL be relocated to appropriate subdirectories under `src/shared/`.

#### Scenario: Orphaned hook relocated
- **WHEN** checking for `src/hooks/useLoopFormValidation.ts` after migration
- **THEN** the file does not exist at that path; it has been moved to `src/shared/`

#### Scenario: TUI utils relocated
- **WHEN** checking for `src/tui/utils/` after migration
- **THEN** the directory does not exist; files have been moved to `src/shared/utils/`

### Requirement: TypeCheck passes after migration
`rtk pnpm run typecheck` (tsc --noEmit) SHALL pass with zero errors after all file moves and import updates.

#### Scenario: TypeScript compilation
- **WHEN** running `pnpm run typecheck`
- **THEN** exit code is 0 with no errors

### Requirement: Tests pass after migration
`rtk pnpm run test` (vitest run) SHALL pass with the same or better coverage after all file moves and import updates.

#### Scenario: Test suite execution
- **WHEN** running `pnpm run test`
- **THEN** all tests pass and coverage gates are met

### Requirement: Build passes after migration
`rtk pnpm run build` SHALL succeed after all file moves and import updates.

#### Scenario: Production build
- **WHEN** running `pnpm run build`
- **THEN** exit code is 0 and `dist/` contains expected outputs
