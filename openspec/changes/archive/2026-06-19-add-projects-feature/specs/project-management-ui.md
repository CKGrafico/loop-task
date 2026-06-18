## ADDED Requirements

### Requirement: Manage Projects page
A dedicated full-screen page for project CRUD operations, accessible from the board. Layout mirrors existing patterns: Navigator (project list) on left, Inspector (details + actions) on right.

#### Scenario: Open Manage Projects from board
- **WHEN** user clicks "Manage Projects" button (or presses keyboard shortcut)
- **THEN** board transitions to Projects Management page
- **AND** page shows list of all projects on left with Navigator styling

#### Scenario: Select project in list
- **WHEN** user navigates (↑/↓) through project list
- **THEN** selected project is highlighted
- **AND** right panel updates to show project details

#### Scenario: Return to board from Manage Projects
- **WHEN** user presses Escape or clicks back/close
- **THEN** page closes and board returns to previous state

### Requirement: Create new project
User can create a new project with name (required) and color (required, from fixed palette).

#### Scenario: Open create project form
- **WHEN** user presses "n" key or clicks "New" button
- **THEN** system shows Create Project modal with:
  - Name text input
  - Color picker (six radio buttons: white/cyan/orange/green/red/yellow)
  - Save and Cancel buttons

#### Scenario: Submit valid new project
- **WHEN** user enters name and selects color, then clicks Save
- **THEN** system creates project via RPC project-create
- **AND** updates project list immediately
- **AND** modal closes

#### Scenario: Reject empty name
- **WHEN** user tries to save with empty name
- **THEN** system shows error "Project name required"
- **AND** does not submit

#### Scenario: Default color selection
- **WHEN** Create Project modal opens
- **THEN** cyan color is pre-selected (first non-default color)

### Requirement: Edit project (rename only)
User can rename existing projects except Default.

#### Scenario: Open edit form for project
- **WHEN** user selects a project and presses "e" key or clicks Edit
- **THEN** system shows Edit Project modal with:
  - Name input pre-filled with current name
  - Save and Cancel buttons
  - (Color picker hidden for v1)

#### Scenario: Rename project successfully
- **WHEN** user changes name and clicks Save
- **THEN** system updates project via RPC project-update
- **AND** project list and details update immediately

#### Scenario: Default project edit is blocked
- **WHEN** user selects Default project
- **THEN** Edit button is hidden or grayed
- **AND** clicking it shows tooltip "Cannot edit system project"

#### Scenario: Refuse empty name on edit
- **WHEN** user clears name field and tries Save
- **THEN** system shows error "Project name required"
- **AND** does not submit

### Requirement: Delete project
User can delete projects with confirmation. Loops are moved to Default.

#### Scenario: Open delete confirmation
- **WHEN** user selects a project and presses "d" key or clicks Delete
- **THEN** system shows confirmation modal:
  - "Delete Project '<name>'?"
  - Shows loop count: "This project has X loops."
  - "Move loops to Default project?"
  - Two buttons: "Yes, move to Default" and "Cancel"

#### Scenario: Confirm delete (move loops to Default)
- **WHEN** user clicks "Yes, move to Default"
- **THEN** system deletes project via RPC project-delete
- **AND** all loops with projectId=<deleted-id> are reassigned to "default"
- **AND** project list updates immediately
- **AND** loops count in Default increases

#### Scenario: Default project delete is blocked
- **WHEN** user selects Default project
- **THEN** Delete button is hidden
- **AND** no delete modal appears

#### Scenario: Cancel delete operation
- **WHEN** user clicks "Cancel" in confirmation modal
- **THEN** modal closes, no changes made

#### Scenario: Keyboard navigation in Manage Projects
- **WHEN** user is in Projects list
- **THEN** Up/Down arrows cycle through projects
- **WHEN** user presses "e"
- **THEN** Edit modal opens for selected project
- **WHEN** user presses "d"
- **THEN** Delete confirmation opens
- **WHEN** user presses "n"
- **THEN** Create modal opens
- **WHEN** user presses Escape
- **THEN** Manage Projects page closes, return to board

### Requirement: Project details panel
Inspector-style right panel shows metadata and action buttons for selected project.

#### Scenario: Display Default project details
- **WHEN** Default project is selected
- **THEN** panel shows:
  - Project name: "Default"
  - Color badge: white bullet
  - Loop count: "Loops: X"
  - Locked indicator: "System project (cannot edit)"
  - No buttons (Edit, Delete hidden)

#### Scenario: Display custom project details
- **WHEN** custom project is selected
- **THEN** panel shows:
  - Project name
  - Color badge (colored bullet)
  - Loop count
  - Two buttons: "Edit" and "Delete"

#### Scenario: Update details on action
- **WHEN** project is created, renamed, or deleted
- **THEN** details panel updates immediately to reflect changes
- **AND** if selected project is deleted, focus moves to next project in list

### Requirement: Create/Edit Loop form includes project dropdown
When creating or editing a loop, user selects a project (required field).

#### Scenario: Project dropdown in Create Loop
- **WHEN** user creates a new loop
- **THEN** Create Loop form includes project dropdown
- **AND** dropdown shows all projects with color bullets
- **AND** defaults to current viewed project (if on board in project context)
- **AND** defaults to "Default" (if no context)

#### Scenario: Project dropdown in Edit Loop
- **WHEN** user edits a loop
- **THEN** project dropdown is pre-filled with loop's current project
- **AND** user can change project by selecting from dropdown

#### Scenario: Project assigned on loop create
- **WHEN** user creates loop with project selected
- **THEN** LoopOptions.projectId is set to selected project

#### Scenario: Project updated on loop edit
- **WHEN** user changes loop project and saves
- **THEN** LoopMeta.projectId is updated and persisted
