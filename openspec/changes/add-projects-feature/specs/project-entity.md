## ADDED Requirements

### Requirement: Project entity with name and color
A Project represents an organizational scope for loops. Each project has a unique id, a name (string), a color from a fixed palette, creation timestamp, and system flags (isSystem, isDefault).

#### Scenario: Create a new project
- **WHEN** user provides a name and selects a color
- **THEN** system creates a Project with unique id, current timestamp, isSystem=false, isDefault=false

#### Scenario: System Default project
- **WHEN** daemon first loads
- **THEN** system creates Default project with id="default", name="Default", color="#ffffff", isSystem=true, isDefault=true, immutable

#### Scenario: Persist project to disk
- **WHEN** project is created or updated
- **THEN** system writes Project to ~/.loop-cli/projects/<id>.json using atomic write

#### Scenario: Load all projects
- **WHEN** daemon initializes
- **THEN** system loads all projects from ~/.loop-cli/projects/ into memory

### Requirement: Project CRUD operations via RPC
The daemon SHALL expose four RPC messages for project operations.

#### Scenario: List projects
- **WHEN** client sends {type: "project-list"}
- **THEN** daemon responds {type: "ok", data: Project[]}

#### Scenario: Create project
- **WHEN** client sends {type: "project-create", payload: {name, color}}
- **THEN** daemon creates project, persists, responds {type: "ok", data: {id, name, color, createdAt}}

#### Scenario: Update project (rename only)
- **WHEN** client sends {type: "project-update", payload: {id, name}}
- **THEN** daemon updates project name if not Default, persists, responds {type: "ok"}

#### Scenario: Refuse rename of Default
- **WHEN** client tries to rename Default project
- **THEN** daemon rejects with error "Cannot rename system project"

#### Scenario: Delete project
- **WHEN** client sends {type: "project-delete", payload: {id}}
- **THEN** daemon reassigns all loops with projectId=<id> to "default", removes project file, responds {type: "ok"}

#### Scenario: Refuse delete of Default
- **WHEN** client tries to delete Default project
- **THEN** daemon rejects with error "Cannot delete system project"

### Requirement: Auto-migration of existing loops
On first daemon load after Projects feature is deployed, all existing loops without a projectId SHALL be assigned to Default project.

#### Scenario: Migrate loops on first load
- **WHEN** daemon initializes and finds loops without projectId
- **THEN** system adds projectId: "default" to each and persists
- **AND** logs migration completion count

#### Scenario: Create Default if missing
- **WHEN** daemon initializes and projects/ directory is empty
- **THEN** system creates Default project automatically

### Requirement: Auto-recovery of corrupted project state
If projects directory or files are corrupted or missing, system SHALL recover gracefully.

#### Scenario: Recreate Default on missing projects
- **WHEN** daemon initializes and projects/ is missing or empty
- **THEN** system creates Default project
- **AND** reassigns all orphaned loops (missing projectId) to "default"
- **AND** logs warning to daemon.log

#### Scenario: Skip corrupted project files
- **WHEN** daemon loads a corrupted project JSON file
- **THEN** system logs error, skips file, continues
- **AND** reassigns loops belonging to that project to "default"

---

## MODIFIED Requirements

### Requirement: LoopMeta includes project scope
LoopMeta SHALL include a projectId field referencing a Project. Every loop belongs to exactly one project.

#### Scenario: New loop inherits project context
- **WHEN** user creates a loop on the board viewing "Frontend" project
- **THEN** system sets LoopOptions.projectId to "frontend-id"

#### Scenario: Create loop defaults to Default
- **WHEN** user creates a loop from CLI or no project context
- **THEN** system sets LoopOptions.projectId to "default"

#### Scenario: Edit loop can change project
- **WHEN** user edits a loop and changes its project dropdown
- **THEN** system updates LoopMeta.projectId and persists

#### Scenario: Export loop includes projectId
- **WHEN** LoopMeta is serialized (saved or sent over IPC)
- **THEN** projectId field is included in JSON

### Requirement: Board filters to single project
The board SHALL display only loops belonging to the currently selected project (single-select filter).

#### Scenario: Select Default project
- **WHEN** user presses "c" key or clicks Projects filter
- **THEN** board shows Projects modal with radio buttons
- **AND** Default is pre-selected

#### Scenario: Select different project
- **WHEN** user selects "Frontend" project in modal
- **THEN** modal closes
- **AND** board displays only loops with projectId="frontend-id"

#### Scenario: Search project by name
- **WHEN** user types in Projects modal search bar (case-insensitive)
- **THEN** projects list filters by name prefix match
- **AND** unmatched projects are hidden

#### Scenario: Show loop count per project
- **WHEN** Projects modal is open
- **THEN** each project shows count of loops belonging to it (e.g. "Frontend (3)")

#### Scenario: Keyboard navigation in Projects modal
- **WHEN** user presses Up/Down arrow keys in modal
- **THEN** focus cycles through projects (radio style)
- **WHEN** user presses Enter
- **THEN** selected project is confirmed, modal closes
- **WHEN** user presses Escape
- **THEN** modal closes without changing selection

### Requirement: Project color visual representation
Loops on board show a colored bullet point before description to indicate project.

#### Scenario: Render color bullet on board
- **WHEN** board renders loop row
- **THEN** displays mini bullet character (●) colored to match project color
- **AND** bullet precedes description text

#### Scenario: Default project white bullet
- **WHEN** loop belongs to Default project
- **THEN** bullet is white (#ffffff)
