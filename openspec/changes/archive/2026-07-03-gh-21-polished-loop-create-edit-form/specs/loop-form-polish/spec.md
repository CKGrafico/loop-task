## ADDED Requirements

### Requirement: Professional two-column layout

The loop create/edit form SHALL use a clean two-column grid layout with consistent spacing, borders, and aligned labels.

#### Scenario: Form renders in two-column grid

- **WHEN** the user opens the create or edit form
- **THEN** the form SHALL display fields in a two-column grid with labels aligned, consistent spacing between rows, and a visible border separating sections

### Requirement: Create vs edit mode distinction

The form title SHALL display "New Loop" when creating and "Edit Loop" when editing.

#### Scenario: Create mode shows "New Loop"

- **WHEN** the user creates a new loop
- **THEN** the form title SHALL read "New Loop"

#### Scenario: Edit mode shows "Edit Loop"

- **WHEN** the user edits an existing loop
- **THEN** the form title SHALL read "Edit Loop"

### Requirement: Focused field visual distinction

The active/focused field SHALL be visually distinct from inactive fields with a clear focus indicator.

#### Scenario: Focused field has visible indicator

- **WHEN** the user tabs or clicks into a form field
- **THEN** that field SHALL display a visible focus indicator (e.g., border highlight or background change)

### Requirement: Inactive fields remain readable

Inactive fields SHALL remain clearly readable while the focused field has visual distinction.

#### Scenario: Inactive fields readable

- **WHEN** one field is focused
- **THEN** all other fields SHALL remain clearly legible with normal text and background colors
