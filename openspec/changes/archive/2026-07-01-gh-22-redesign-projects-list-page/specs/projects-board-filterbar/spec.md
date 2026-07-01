## ADDED Requirements

### Requirement: FilterBar on Projects Board page
The Board ProjectsPage SHALL render a `FilterBar` component above the project list, containing a `SearchBox` and clickable filter badges for loop count, system/default, and sort mode.

#### Scenario: FilterBar renders with all badges
- **WHEN** the Projects page is displayed
- **THEN** the FilterBar SHALL show a SearchBox, a hasLoops badge, an isSystem badge, and a sort badge, all in a horizontal row

### Requirement: SearchBox filters projects by name
The SearchBox in the Projects FilterBar SHALL filter the project list by name as the user types.

#### Scenario: Type in search box
- **WHEN** the user types "my" in the SearchBox
- **THEN** the project list SHALL show only projects whose name contains "my" (case-insensitive)

### Requirement: HasLoops badge toggles loop count filter
The hasLoops badge SHALL cycle through "all" → "with-loops" → "empty" when clicked or pressed.

#### Scenario: Click hasLoops badge
- **WHEN** the user clicks the hasLoops badge showing "all"
- **THEN** the badge text SHALL change to "with loops" and the project list SHALL show only projects with loop count > 0

### Requirement: IsSystem badge toggles system filter
The isSystem badge SHALL cycle through "all" → "system" → "user" when clicked or pressed.

#### Scenario: Click isSystem badge
- **WHEN** the user clicks the isSystem badge showing "all"
- **THEN** the badge text SHALL change to "system" and the project list SHALL show only system projects

### Requirement: Sort badge cycles sort mode
The sort badge SHALL cycle through sort modes: "name" → "loop count" → "created date" when clicked or pressed.

#### Scenario: Click sort badge
- **WHEN** the user clicks the sort badge showing "name"
- **THEN** the badge text SHALL change to "loop count" and the project list SHALL be sorted by loop count descending

### Requirement: FilterBar badge colors use project accent
All filter badges on the Projects FilterBar SHALL use `ENTITY_COLORS.project` (`#34d399`) as the accent color for focused/active states.

#### Scenario: Badge focus color
- **WHEN** a filter badge is focused
- **THEN** the badge border color SHALL be `#34d399`
