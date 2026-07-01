# projects-tui-navigator Specification

## Purpose
TBD - created by archiving change gh-22-redesign-projects-list-page. Update Purpose after archive.
## Requirements
### Requirement: Project navigator in TUI LeftPanel
The TUI LeftPanel SHALL render a scrollable project list when the active tab is "projects", replacing the current placeholder text. The list SHALL use the same Navigator pattern as loops (selectable rows with j/k navigation).

#### Scenario: Switch to projects tab
- **WHEN** the user switches to the "projects" tab
- **THEN** the LeftPanel SHALL render a scrollable list of projects with colored bullet (●), project name, and loop count
- **AND** the placeholder text "Projects tab" SHALL NOT be shown

### Requirement: j/k navigation in project list
The project navigator SHALL support `j`/`k` keys for down/up navigation, matching the loops Navigator keybindings.

#### Scenario: Press j to move down
- **WHEN** the user presses `j` in the project navigator
- **THEN** the selection SHALL move to the next project

#### Scenario: Press k to move up
- **WHEN** the user presses `k` in the project navigator
- **THEN** the selection SHALL move to the previous project

### Requirement: Project filter labels in TUI LeftPanel
The LeftPanel SHALL show active filter state labels when the projects tab is active (matching how loops shows "status: running" etc.), displaying current query, hasLoops, isSystem, and sort values.

#### Scenario: Active filter labels
- **WHEN** the projects tab is active and `hasLoops` filter is "with-loops"
- **THEN** the LeftPanel SHALL show a label "loops: with loops"

#### Scenario: Search query label
- **WHEN** the projects tab is active and `query` filter is non-empty
- **THEN** the LeftPanel SHALL show a label "search: <query>"

### Requirement: Project tab accent color
When the projects tab is active, the LeftPanel border and accent colors SHALL use `theme.accent.project` (derived from `ENTITY_COLORS.project`, `#34d399`).

#### Scenario: Projects tab border color
- **WHEN** the projects tab is active
- **THEN** the LeftPanel border color SHALL use the project accent color

### Requirement: Project commands in CommandPalette
Project-specific commands SHALL appear in the CommandsBrowserModal when the projects tab is active. The existing project commands (new-project, edit, delete, set-default) SHALL be verified to appear, and new filter/sort commands SHALL be available.

#### Scenario: Open command palette in projects tab
- **WHEN** the user opens the command palette while the projects tab is active
- **THEN** project commands SHALL be listed including new-project, edit, delete, and set-default

