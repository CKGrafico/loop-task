# projects-board-navigator Specification

## Purpose
TBD - created by archiving change gh-22-redesign-projects-list-page. Update Purpose after archive.
## Requirements
### Requirement: Navigator-style multi-column project list
The Board ProjectsPage SHALL render projects in a multi-column scrollable table using `ScrollBox`, with columns: color bullet (●), project name, loop count, created date.

#### Scenario: Project row rendering
- **WHEN** the project list is displayed
- **THEN** each row SHALL show: a colored bullet in the project's color, the project name, the loop count, and the created date — matching the column layout pattern from the loops Navigator

### Requirement: ScrollBox with auto-scroll to selected
The project list SHALL use `ScrollBox` for virtual scrolling and auto-scroll to keep the selected project visible.

#### Scenario: Select project outside viewport
- **WHEN** the user navigates to a project that is outside the visible area
- **THEN** the ScrollBox SHALL auto-scroll so the selected project is visible

### Requirement: Unfocused and focused border colors
The ProjectsPage left panel SHALL use `#1e3a2a` as the unfocused border color and `#34d399` (`ENTITY_COLORS.project`) as the focused border color.

#### Scenario: Panel focus border
- **WHEN** the project list panel is focused
- **THEN** the border SHALL be `#34d399`
- **WHEN** the project list panel is unfocused
- **THEN** the border SHALL be `#1e3a2a`

### Requirement: Keyboard navigation in project list
The project list SHALL support arrow keys (up/down) for navigation, `n` for new project, `e` for edit, `d` for delete, `/` for search focus, and Esc for back/clear.

#### Scenario: Arrow key navigation
- **WHEN** the user presses the down arrow key
- **THEN** the selection SHALL move to the next project in the list

#### Scenario: Search focus
- **WHEN** the user presses `/`
- **THEN** the SearchBox in the FilterBar SHALL receive focus

#### Scenario: Escape clears search
- **WHEN** the SearchBox is focused and the user presses Escape
- **THEN** the search query SHALL be cleared and focus SHALL return to the project list

### Requirement: Footer mode badge uses project color
When the view is "projects", the Footer mode badge SHALL use `ENTITY_COLORS.project` (`#34d399`).

#### Scenario: Projects mode badge
- **WHEN** the current view is "projects"
- **THEN** the Footer mode badge color SHALL be `#34d399`

