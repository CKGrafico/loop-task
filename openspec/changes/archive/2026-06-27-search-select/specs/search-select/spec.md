## ADDED Requirements

### Requirement: SearchSelect component with inline filter

The system SHALL provide a `SearchSelect` component that renders a dropdown with a filter input at the top and a scrollable filtered option list below. The component SHALL be usable in any form field where a single value must be selected from a list of options.

#### Scenario: Filter input is visible when focused

- **WHEN** the SearchSelect is focused
- **THEN** a filter input is visible at the top showing placeholder text or the current filter text

#### Scenario: Typing filters the option list

- **WHEN** the user types characters while the SearchSelect is focused
- **THEN** the option list below is filtered to show only options whose name or value contains the typed text (case-insensitive)

#### Scenario: Clearing the filter shows all options

- **WHEN** the filter text is empty or cleared
- **THEN** all options are shown in the list

### Requirement: Keyboard navigation within SearchSelect

The system SHALL handle up/down arrow keys to navigate the filtered option list, Enter to select an option, Backspace to delete filter characters, and Escape to clear the filter. All handled keys SHALL call `key.preventDefault()` and `key.stopPropagation()` to prevent the parent form from also acting on them.

#### Scenario: Up/down navigates the filtered list

- **WHEN** the user presses up or down arrow while the SearchSelect is focused and the filtered list is non-empty
- **THEN** the selection indicator moves to the previous or next option in the filtered list (wrapping around at boundaries)

#### Scenario: Enter selects the current option

- **WHEN** the user presses Enter while an option is highlighted in the filtered list
- **THEN** that option's value is set as the SearchSelect's value and `onChange` is called

#### Scenario: Backspace deletes filter character

- **WHEN** the user presses Backspace and the filter input has text
- **THEN** the last character of the filter text is deleted and the list is re-filtered

#### Scenario: Escape clears the filter

- **WHEN** the user presses Escape and the filter input has text
- **THEN** the filter text is cleared and all options are shown

### Requirement: Tab key propagates to parent form

The system SHALL NOT handle the Tab key. Tab events SHALL propagate to the parent form's keyboard handler for field navigation. The user MUST be able to tab out of the SearchSelect to the next form field.

#### Scenario: Tab moves to next form field

- **WHEN** the user presses Tab while the SearchSelect is focused
- **THEN** the Tab event propagates to the parent form which moves focus to the next field

### Requirement: SearchSelect replaces existing select elements

The system SHALL replace the OpenTUI `<select>` intrinsic in TaskForm (onSuccessTaskId, onFailureTaskId fields) and the hand-rolled project pills in CreateForm (project field) with the new SearchSelect component. The parent form's keyboard handler SHALL no longer intercept up/down arrow keys for select fields - all select navigation is handled internally by SearchSelect.

#### Scenario: TaskForm chain task select uses SearchSelect

- **WHEN** the user opens the TaskForm create or edit view
- **THEN** the onSuccessTaskId and onFailureTaskId fields render as SearchSelect components

#### Scenario: CreateForm project field uses SearchSelect

- **WHEN** the user opens the CreateForm (create or edit loop view)
- **THEN** the project field renders as a SearchSelect component

#### Scenario: Up/down in select no longer moves form focus

- **WHEN** the user presses up or down while a SearchSelect field is focused
- **THEN** the selection moves within the filtered list and the form focus does NOT change to another field
