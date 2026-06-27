## ADDED Requirements

### Requirement: useTabNav hook provides ordered Tab/Shift+Tab cycling

The system SHALL provide a `useTabNav<T>` hook that accepts an ordered array of nav items and manages focus cycling via Tab (forward) and Shift+Tab (backward). The hook SHALL call `key.preventDefault()` on all Tab events. The hook SHALL return the current `focusIndex`, a `setFocusIndex` setter, the current `focusedItem`, and an `isFocused` predicate.

#### Scenario: Tab cycles forward through items

- **WHEN** the user presses Tab while the hook is active with items `["a", "b", "c"]` and `focusIndex` is 0
- **THEN** `focusIndex` becomes 1 and `focusedItem` becomes `"b"`

#### Scenario: Shift+Tab cycles backward through items

- **WHEN** the user presses Shift+Tab while the hook is active with items `["a", "b", "c"]` and `focusIndex` is 1
- **THEN** `focusIndex` becomes 0 and `focusedItem` becomes `"a"`

#### Scenario: Tab wraps from last to first when no onCycleOut

- **WHEN** the user presses Tab while `focusIndex` is at the last item and `onCycleOut` is not provided
- **THEN** `focusIndex` wraps to 0

#### Scenario: Tab calls onCycleOut when provided

- **WHEN** the user presses Tab while `focusIndex` is at the last item and `onCycleOut` is provided
- **THEN** `onCycleOut("right")` is called and `focusIndex` does NOT change

#### Scenario: Shift+Tab calls onCycleOut when at first item

- **WHEN** the user presses Shift+Tab while `focusIndex` is 0 and `onCycleOut` is provided
- **THEN** `onCycleOut("left")` is called and `focusIndex` does NOT change

### Requirement: useTabNav handles dynamic item lists

The system SHALL clamp `focusIndex` to the valid range `[0, items.length - 1]` when the items array changes length. This ensures that removing items from the list (e.g., toggling form mode) does not leave `focusIndex` pointing past the end.

#### Scenario: Focus clamped when items shrink

- **WHEN** `focusIndex` is 5 and the items array changes from 6 items to 3 items
- **THEN** `focusIndex` is clamped to 2

#### Scenario: Focus unchanged when items stay same length

- **WHEN** the items array is replaced with a new array of the same length
- **THEN** `focusIndex` is not modified

### Requirement: useTabNav calls preventDefault on Tab

The system SHALL call `key.preventDefault()` on every Tab key event it handles, preventing the default input behavior from interfering with focus cycling.

#### Scenario: Tab event is prevented

- **WHEN** the user presses Tab while the hook is active
- **THEN** `key.preventDefault()` is called before any state update

### Requirement: All forms and modals use useTabNav for Tab navigation

The system SHALL replace the manual Tab/Shift+Tab handling in TaskForm, CreateForm, EditProjectModal, CreateProjectModal, and ProjectsPage with the `useTabNav` hook. Each component SHALL pass its ordered nav items to the hook and use the returned `focusedItem` / `isFocused` to drive UI focus. No component SHALL register its own `useKeyboard` handler for Tab after refactoring.

#### Scenario: TaskForm uses useTabNav

- **WHEN** the TaskForm is rendered
- **THEN** Tab/Shift+Tab cycling is handled by `useTabNav` with items `["name", "command", "onSuccessTaskId", "onFailureTaskId", "save", "cancel"]`

#### Scenario: EditProjectModal uses useTabNav and preventDefault is called

- **WHEN** the user presses Tab while the EditProjectModal color field is focused
- **THEN** `key.preventDefault()` is called (fixing the previous bug where it was omitted)

#### Scenario: ProjectsPage uses useTabNav with onCycleOut

- **WHEN** the user presses Tab while on the last action button in ProjectsPage
- **THEN** `onCycleOut("right")` is called, which triggers `onEnterHeader("right")` to hand focus to the header
