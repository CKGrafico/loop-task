## ADDED Requirements

### Requirement: Command builder structured input

The system SHALL provide a structured command input component (`CommandBuilderField`) that separates command entry into an executable field and an arguments field, assembling them into the final `command` string and `commandArgs` array that `TaskDefinition` stores.

#### Scenario: User enters executable name

- **WHEN** the command builder is active and the user types an executable name (e.g., `npm`)
- **THEN** the executable field displays the typed value
- **AND** the live preview shows the executable alone

#### Scenario: User enters arguments

- **WHEN** the user presses Tab or Enter after entering the executable
- **THEN** focus moves to the arguments field
- **AND** the user can type arguments (e.g., `run build`)

#### Scenario: Arguments are parsed into commandArgs

- **WHEN** the user completes command entry
- **THEN** the executable becomes the `command` field value
- **AND** the arguments string is tokenized (respecting quoted strings) into `commandArgs`
- **AND** the tokenization matches the existing `parseArgs()` behavior in `src/tui/daemon.ts`

### Requirement: Live command preview

The system SHALL display a live preview of the fully assembled command string as the user types in the command builder. The preview SHALL update on every keystroke.

#### Scenario: Preview updates as user types

- **WHEN** the user types `npm` in the executable field
- **THEN** the preview shows `npm`
- **WHEN** the user then types `run build` in the args field
- **THEN** the preview shows `npm run build`

#### Scenario: Preview shows quoted args correctly

- **WHEN** the user enters args containing spaces (e.g., `"my script"`)
- **THEN** the preview preserves the quotes in the assembled command string

### Requirement: Copy command from command builder

The system SHALL allow the user to copy the assembled command string from the command builder step. When the command builder is active, pressing Ctrl+Y SHALL copy the full assembled command to the system clipboard.

#### Scenario: Copy command via keyboard

- **WHEN** the command builder is active and the user presses Ctrl+Y
- **THEN** the full assembled command string (executable + args) is copied to the clipboard

### Requirement: Template suggestions

The system SHALL offer common command templates as suggestions when the executable field is empty. Templates SHALL be displayed as a selectable list. Selecting a template SHALL populate the executable and args fields with the template values.

#### Scenario: Templates displayed when executable is empty

- **WHEN** the command builder is active and the executable field is empty
- **THEN** a list of template suggestions is displayed (e.g., `npm run`, `pnpm test`, `dotnet build`, `docker compose up`)

#### Scenario: User selects a template

- **WHEN** the user navigates to a template and presses Enter
- **THEN** the executable field is populated with the template's executable
- **AND** the args field is populated with the template's args
- **AND** the live preview updates accordingly

### Requirement: Basic command validation

The system SHALL provide validation feedback in the command builder step. An empty executable SHALL display a validation error. Unbalanced quotes in arguments SHALL display a warning.

#### Scenario: Empty executable validation

- **WHEN** the user attempts to advance past the command step with an empty executable
- **THEN** a validation error message is displayed

#### Scenario: Unbalanced quotes warning

- **WHEN** the user enters arguments with unbalanced quotes (e.g., `"unclosed`)
- **THEN** a validation warning is displayed

### Requirement: Command builder as custom WizardForm rendering

The system SHALL integrate the command builder into WizardForm via a `renderCustom` callback on `WizardStepConfig`. When `renderCustom` is provided, WizardForm SHALL delegate rendering and input handling for that step to the custom component.

#### Scenario: Custom rendering overrides default

- **WHEN** a WizardStepConfig has a `renderCustom` callback
- **THEN** WizardForm renders the custom component instead of TextField or SelectField
- **AND** WizardForm's `useInput` handler skips key processing for that step when it is active

#### Scenario: Custom component reports value changes

- **WHEN** the custom component's value changes
- **THEN** it SHALL call the `onChange` callback to update the WizardForm's values state
