# project-filters Specification

## Purpose
TBD - created by archiving change gh-22-redesign-projects-list-page. Update Purpose after archive.
## Requirements
### Requirement: ProjectFilters type definition
The system SHALL define a `ProjectFilters` type in both `src/board/state.ts` and `src/tui/state.ts` with fields: `query` (string), `hasLoops` (`"all"` | `"with-loops"` | `"empty"`), `isSystem` (`"all"` | `"system"` | `"user"`), `sort` (`"name"` | `"loop-count"` | `"created-date"`).

#### Scenario: Default filter state
- **WHEN** a new `ProjectFilters` is created
- **THEN** `query` SHALL be `""`, `hasLoops` SHALL be `"all"`, `isSystem` SHALL be `"all"`, `sort` SHALL be `"name"`

### Requirement: applyProjectFilters function
The system SHALL provide an `applyProjectFilters(projects, filters)` function that filters a project list by the given `ProjectFilters` and returns the filtered result sorted by the specified sort mode.

#### Scenario: Filter by query
- **WHEN** `filters.query` is a non-empty string
- **THEN** the function SHALL return only projects whose name contains the query (case-insensitive)

#### Scenario: Filter by hasLoops
- **WHEN** `filters.hasLoops` is `"with-loops"`
- **THEN** the function SHALL return only projects with loop count > 0
- **WHEN** `filters.hasLoops` is `"empty"`
- **THEN** the function SHALL return only projects with loop count === 0

#### Scenario: Filter by isSystem
- **WHEN** `filters.isSystem` is `"system"`
- **THEN** the function SHALL return only projects where `isSystem` is true
- **WHEN** `filters.isSystem` is `"user"`
- **THEN** the function SHALL return only projects where `isSystem` is false

#### Scenario: Sort by name
- **WHEN** `filters.sort` is `"name"`
- **THEN** the function SHALL sort projects alphabetically by name (case-insensitive, ascending)

#### Scenario: Sort by loop count
- **WHEN** `filters.sort` is `"loop-count"`
- **THEN** the function SHALL sort projects by loop count (descending), then by name (ascending) as tiebreaker

#### Scenario: Sort by created date
- **WHEN** `filters.sort` is `"created-date"`
- **THEN** the function SHALL sort projects by `createdAt` (newest first), then by name (ascending) as tiebreaker

### Requirement: cycleProjectSortMode function
The system SHALL provide a `cycleProjectSortMode(mode)` function that cycles through project sort modes: `"name"` → `"loop-count"` → `"created-date"` → `"name"`.

#### Scenario: Cycle sort mode
- **WHEN** `cycleProjectSortMode("name")` is called
- **THEN** it SHALL return `"loop-count"`
- **WHEN** `cycleProjectSortMode("loop-count")` is called
- **THEN** it SHALL return `"created-date"`
- **WHEN** `cycleProjectSortMode("created-date")` is called
- **THEN** it SHALL return `"name"`

### Requirement: cycleProjectHasLoopsFilter function
The system SHALL provide a `cycleProjectHasLoopsFilter(filter)` function: `"all"` → `"with-loops"` → `"empty"` → `"all"`.

#### Scenario: Cycle hasLoops filter
- **WHEN** `cycleProjectHasLoopsFilter("all")` is called
- **THEN** it SHALL return `"with-loops"`

### Requirement: cycleProjectIsSystemFilter function
The system SHALL provide a `cycleProjectIsSystemFilter(filter)` function: `"all"` → `"system"` → `"user"` → `"all"`.

#### Scenario: Cycle isSystem filter
- **WHEN** `cycleProjectIsSystemFilter("all")` is called
- **THEN** it SHALL return `"system"`

