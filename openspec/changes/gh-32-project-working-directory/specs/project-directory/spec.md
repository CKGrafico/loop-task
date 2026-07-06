## ADDED Requirements

### Requirement: Project directory field
The system SHALL store an optional `directory` field on each Project entity. When empty, the project provides no default working directory.

#### Scenario: Project created with directory
- **WHEN** a project is created with `directory` set to `/home/user/my-project`
- **THEN** the project entity stores `directory: "/home/user/my-project"`

#### Scenario: Project created without directory
- **WHEN** a project is created without specifying `directory`
- **THEN** the project entity stores `directory: ""` (empty string)

#### Scenario: Default project has empty directory
- **WHEN** the system creates the default project
- **THEN** the default project has `directory: ""`

### Requirement: Project directory RPC support
The system SHALL accept `directory?: string` in `project-create` and `project-update` IPC payloads and include `directory` in `project-list` responses.

#### Scenario: Create project with directory via IPC
- **WHEN** a `project-create` request includes `{ name: "MyProject", color: "#ff0000", directory: "/home/user/work" }`
- **THEN** the created project has `directory: "/home/user/work"`

#### Scenario: Update project directory via IPC
- **WHEN** a `project-update` request includes `{ id: "abc", name: "MyProject", directory: "/new/path" }`
- **THEN** the project's `directory` is updated to `/new/path`

#### Scenario: Project list includes directory
- **WHEN** a `project-list` request is made
- **THEN** each project in the response includes its `directory` field

### Requirement: Project directory input in UI
The system SHALL display a directory text input in the project create and edit forms (both TUI wizard and board form). The field SHALL be optional and pre-filled with `process.cwd()` on project creation.

#### Scenario: Create project form shows directory input
- **WHEN** the user opens the create project form
- **THEN** a directory input is shown, pre-filled with `process.cwd()`

#### Scenario: Edit project form shows current directory
- **WHEN** the user opens the edit form for a project with `directory: "/home/user/work"`
- **THEN** the directory input shows `/home/user/work`

#### Scenario: Directory field is optional
- **WHEN** the user leaves the directory input empty and submits
- **THEN** the project is saved with `directory: ""`

### Requirement: Loop cwd resolution — empty inherits from project
The system SHALL resolve an empty loop `cwd` to the loop's project `directory` field. If the project directory is also empty, the system SHALL fall back to `process.cwd()`.

#### Scenario: Empty loop cwd with project directory set
- **WHEN** a loop has `cwd: ""` and its project has `directory: "/home/user/work"`
- **THEN** the effective working directory is `/home/user/work`

#### Scenario: Empty loop cwd with no project directory
- **WHEN** a loop has `cwd: ""` and its project has `directory: ""`
- **THEN** the effective working directory is `process.cwd()`

### Requirement: Loop cwd resolution — relative path concatenates to project directory
The system SHALL resolve a relative loop `cwd` by concatenating it with the project `directory` using `path.join()`. If the project directory is empty, the base is `process.cwd()`.

#### Scenario: Relative loop cwd with project directory
- **WHEN** a loop has `cwd: "subdir"` and its project has `directory: "/home/user/work"`
- **THEN** the effective working directory is `/home/user/work/subdir`

#### Scenario: Relative loop cwd with no project directory
- **WHEN** a loop has `cwd: "subdir"` and its project has `directory: ""`
- **THEN** the effective working directory is `path.join(process.cwd(), "subdir")`

#### Scenario: Relative path with dot and double-dot
- **WHEN** a loop has `cwd: "./logs"` and its project has `directory: "/home/user/work"`
- **THEN** the effective working directory is `/home/user/work/logs`

### Requirement: Loop cwd resolution — absolute path overrides project directory
The system SHALL use an absolute loop `cwd` directly, ignoring the project `directory`.

#### Scenario: Absolute loop cwd
- **WHEN** a loop has `cwd: "/home/user/other"` and its project has `directory: "/home/user/work"`
- **THEN** the effective working directory is `/home/user/other`

### Requirement: Inspector shows effective directory
The system SHALL display the resolved effective working directory in the board Inspector and TUI Inspector when viewing a loop. If the loop `cwd` is empty or relative, the effective path (resolved against project directory) SHALL be shown.

#### Scenario: Inspector with empty loop cwd and project directory
- **WHEN** viewing a loop with `cwd: ""` in a project with `directory: "/home/user/work"`
- **THEN** the Inspector shows the effective directory as `/home/user/work`

#### Scenario: Inspector with absolute loop cwd
- **WHEN** viewing a loop with `cwd: "/home/user/other"`
- **THEN** the Inspector shows the directory as `/home/user/other` (no change from current behavior)
