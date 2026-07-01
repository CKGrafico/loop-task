## ADDED Requirements

### Requirement: Project Inspector in TUI RightPanel
The TUI RightPanel SHALL display a project Inspector when the projects tab is active, showing the selected project's details (name with color bullet, loop count, created date, system label, project ID).

#### Scenario: Select a project
- **WHEN** a project is selected in the LeftPanel during the projects tab
- **THEN** the RightPanel SHALL show the project's name with colored bullet, project ID, created date, loop count, and system status

#### Scenario: No project selected
- **WHEN** no project is selected in the projects tab
- **THEN** the RightPanel SHALL show a "Select a project" placeholder

### Requirement: Project Inspector uses theme tokens
The project Inspector SHALL use theme tokens (`theme.text.primary`, `theme.text.secondary`, `theme.accent.project`) for all text and accent rendering, matching the loops Inspector pattern.

#### Scenario: Theme token usage
- **WHEN** the project Inspector renders project details
- **THEN** primary labels SHALL use `theme.text.primary`, secondary values SHALL use `theme.text.secondary`, and accent elements SHALL use `theme.accent.project`

### Requirement: Edit and Delete actions in RightPanel
The project Inspector in the RightPanel SHALL show Edit and Delete action buttons (with keyboard shortcuts) matching the existing projects page action pattern. Delete SHALL be disabled for system projects.

#### Scenario: Edit button
- **WHEN** the user presses the Edit action or `e` key with a project selected
- **THEN** the EditProjectModal SHALL open

#### Scenario: Delete button disabled for system projects
- **WHEN** a system project is selected
- **THEN** the Delete button SHALL be disabled

### Requirement: RightPanel border uses project accent
When the projects tab is active, the RightPanel border SHALL use `theme.accent.project` (`#34d399`).

#### Scenario: RightPanel border color
- **WHEN** the projects tab is active
- **THEN** the RightPanel border color SHALL be `#34d399`
