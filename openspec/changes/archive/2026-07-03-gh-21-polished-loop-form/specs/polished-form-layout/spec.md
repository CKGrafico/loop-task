## ADDED Requirements

### Requirement: Two-column grid layout
The form SHALL display in a clean two-column grid layout with consistent spacing, borders, and label alignment across board and TUI implementations.

#### Scenario: Layout renders with proper grid
- **WHEN** the form is rendered
- **THEN** fields are arranged in a two-column grid with even spacing and aligned labels

#### Scenario: Focused field is visually distinct
- **WHEN** a field receives focus
- **THEN** that field SHALL have a visible focus indicator (e.g., border color change or highlight)

### Requirement: Consistent labels, placeholders, and help text
All form fields SHALL have clear labels, appropriate placeholders, and help text where applicable, consistent across board and TUI.

#### Scenario: Fields display labels and placeholders
- **WHEN** the form is rendered
- **THEN** each field SHALL display its label above or beside the input, and a placeholder inside the input

### Requirement: Create vs edit form title
The form title SHALL distinguish between create mode ("New Loop") and edit mode ("Edit Loop").

#### Scenario: Create mode shows New Loop
- **WHEN** the form is opened to create a new loop
- **THEN** the title SHALL read "New Loop"

#### Scenario: Edit mode shows Edit Loop
- **WHEN** the form is opened to edit an existing loop
- **THEN** the title SHALL read "Edit Loop"
