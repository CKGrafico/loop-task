## ADDED Requirements

### Requirement: FSD layer directories exist
The project SHALL contain the following FSD layer directories under `src/`: `app/`, `widgets/`, `features/`, `entities/`, `shared/`.

#### Scenario: Verify FSD layers present
- **WHEN** listing `src/` directory contents
- **THEN** directories `app/`, `widgets/`, `features/`, `entities/`, `shared/` exist

### Requirement: One-way dependency flow between FSD layers
A module in a higher FSD layer SHALL only import from layers below it. The dependency order is: `app` → `widgets` → `features` → `entities` → `shared`. A layer SHALL NOT import from a layer above it.

#### Scenario: Widget imports from features
- **WHEN** a file in `src/widgets/` imports a module
- **THEN** that module resides in `src/features/`, `src/entities/`, or `src/shared/`

#### Scenario: Widget does not import from app
- **WHEN** a file in `src/widgets/` contains an import statement
- **THEN** no import path starts with `src/app/`

### Requirement: src/tui/ directory removed
The `src/tui/` directory SHALL NOT exist after migration. All files that were in `src/tui/` SHALL be located in their FSD layer directories.

#### Scenario: Verify tui directory gone
- **WHEN** listing `src/` directory contents
- **THEN** `tui/` directory does not exist

### Requirement: File size limit in FSD layers
No file in `src/widgets/`, `src/features/`, or `src/entities/` SHALL exceed 300 lines, except pattern/style declaration files that are inherently repetitive.

#### Scenario: Check widget file size
- **WHEN** counting lines in any `.ts` or `.tsx` file under `src/widgets/`
- **THEN** line count is ≤ 300

### Requirement: Shared infrastructure consolidated
`src/shared/` SHALL contain subdirectories: `container/`, `services/`, `ui/`, `hooks/`, `utils/`, `config/`, `i18n/`. Utilities previously in `src/tui/utils/`, `src/hooks/`, and scattered locations SHALL be moved to the appropriate `src/shared/` subdirectory.

#### Scenario: Orphaned hooks directory removed
- **WHEN** listing `src/` directory contents
- **THEN** `hooks/` directory does not exist (its contents moved to `src/shared/hooks/`)

#### Scenario: TUI utils moved to shared
- **WHEN** checking for `src/tui/utils/`
- **THEN** directory does not exist (contents moved to `src/shared/utils/`)

### Requirement: Entity layers created
Entity layers SHALL be created for each business domain: `src/entities/loops/`, `src/entities/tasks/`, `src/entities/projects/`. Each entity layer SHALL contain its types, filters, and sort functions.

#### Scenario: Loops entity layer
- **WHEN** listing `src/entities/loops/` contents
- **THEN** files for LoopMeta types, loop filters, and loop sort functions exist

### Requirement: Widget layers created
TUI components SHALL be organized into widget directories under `src/widgets/`. Each widget directory SHALL contain related component files grouped by UI concern.

#### Scenario: Header widget
- **WHEN** listing `src/widgets/header/` contents
- **THEN** Header component file exists

#### Scenario: Command input widget
- **WHEN** listing `src/widgets/command-input/` contents
- **THEN** CommandInput component file exists

### Requirement: Feature layers created
Feature layers SHALL be created for user interactions: `src/features/commands/`, `src/features/overlays/`, `src/features/forms/`, `src/features/code-editor/`.

#### Scenario: Commands feature
- **WHEN** listing `src/features/commands/` contents
- **THEN** command handlers and shortcut definitions exist

### Requirement: App layer created
`src/app/` SHALL contain the composition root, providers, and router. `src/tui/index.tsx` and App composition SHALL move to `src/app/`.

#### Scenario: App composition root
- **WHEN** listing `src/app/` contents
- **THEN** `index.tsx` and `providers/` directory exist

### Requirement: Build and tests pass
After migration, `tsc --noEmit`, `pnpm test`, and `pnpm build` SHALL pass with zero errors.

#### Scenario: TypeScript compilation
- **WHEN** running `tsc --noEmit`
- **THEN** exit code is 0 with no errors

#### Scenario: Test suite
- **WHEN** running `pnpm test`
- **THEN** exit code is 0

#### Scenario: Production build
- **WHEN** running `pnpm build`
- **THEN** exit code is 0
