## ADDED Requirements

### Requirement: Reusable focus components using Ink's native focus system

The system SHALL provide 5 reusable components that use Ink's `useFocus()` hook for Tab/Shift+Tab navigation and `useInput(handler, { isActive: isFocused })` for keyboard input isolation. Every focusable element in the TUI SHALL use one of these components.

#### Scenario: Tab cycles through all focusable elements

- **WHEN** the user presses Tab
- **THEN** Ink's useFocusManager cycles focus to the next focusable component in render order
- **AND** the newly focused component receives isFocused=true
- **AND** all other components' useInput handlers become inactive

#### Scenario: Shift+Tab cycles backward

- **WHEN** the user presses Shift+Tab
- **THEN** Ink's useFocusManager cycles focus to the previous focusable component
- **AND** the newly focused component receives isFocused=true

#### Scenario: Only focused component handles keyboard

- **WHEN** a component is not focused
- **THEN** its useInput handler does not fire (isActive=false)
- **AND** no keyboard conflicts occur between App.tsx and child components

### Requirement: FocusableButton component

The system SHALL provide a reusable button component that registers itself as Tab-focusable via `useFocus()`, handles Enter to trigger its action, and shows a visual focus indicator (accent border + active background).

#### Scenario: Focused button shows visual indicator

- **WHEN** a FocusableButton is focused (via Tab)
- **THEN** its border color becomes accent.focus
- **AND** its background becomes bg.active
- **AND** its text becomes text.inverse color

#### Scenario: Enter on focused button triggers action

- **WHEN** the user presses Enter while a FocusableButton is focused
- **THEN** the button's onPress callback is called

### Requirement: FocusableList component

The system SHALL provide a reusable selectable list that handles up/down/j/k navigation with wrapping, Enter to select, and visual selection indicator. The pattern follows ink-select-input.

#### Scenario: Up/down navigates list with wrapping

- **WHEN** the user presses up or 'k' at the first item
- **THEN** selection wraps to the last item
- **WHEN** the user presses down or 'j' at the last item
- **THEN** selection wraps to the first item

#### Scenario: Enter selects current item

- **WHEN** the user presses Enter while a FocusableList is focused
- **THEN** the onSelect callback is called with the currently selected item

### Requirement: FocusableInput component

The system SHALL provide a reusable text input that uses useFocus() for Tab registration and feeds the isFocused state to ink-text-input's focus prop, enabling cursor navigation with arrow keys.

#### Scenario: Typing only works when focused

- **WHEN** a FocusableInput is not focused
- **THEN** typing characters does not modify its value
- **WHEN** a FocusableInput is focused
- **THEN** typing characters updates its value via onChange

### Requirement: FocusableSearchSelect component

The system SHALL provide a reusable filterable dropdown that uses useFocus() for Tab registration, handles typing to filter, up/down to navigate filtered results, Enter to select, and Escape to clear filter.

#### Scenario: Filter on type, select on Enter

- **WHEN** the user types characters while FocusableSearchSelect is focused
- **THEN** the options list filters to matching items
- **WHEN** the user presses up/down
- **THEN** the selection indicator moves within the filtered list
- **WHEN** the user presses Enter
- **THEN** the selected option's value is sent via onChange

### Requirement: Modal overlay component

The system SHALL provide a reusable overlay container that renders above content using position="absolute", has a border and elevated background, and handles Escape to close.

#### Scenario: Escape closes modal

- **WHEN** a Modal is open and the user presses Escape
- **THEN** the modal's onClose callback is called

#### Scenario: Modal renders above content

- **WHEN** a Modal is rendered
- **THEN** it appears visually on top of the underlying content
- **AND** it has borderStyle="round" with borderColor=accent.focus and backgroundColor=bg.elevated
