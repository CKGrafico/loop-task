## Context

The Loops list page has a mature two-panel layout with FilterBar, Navigator, Inspector, and keyboard commands, in both Board (Ink) and TUI (OpenTUI) variants. The Projects page is substantially behind: the Board variant has a simple flat list with basic Inspector and CRUD actions, while the TUI variant is a standalone page that isn't even wired into the LeftPanel/RightPanel architecture (LeftPanel renders placeholder text "Projects tab").

Both Board and TUI share the same state module pattern (`src/board/state.ts`, `src/tui/state.ts`) with loop-specific filter types (`StatusFilter`, `IntervalFilter`, `ActivityFilter`). No project-specific filter state exists.

## Goals / Non-Goals

**Goals:**
- Bring the Projects page to feature parity with the Loops page for search, filter, sort, and navigation
- Wire TUI ProjectsPage into the LeftPanel/RightPanel split architecture
- Define project-specific filter state (`ProjectFilters`) separate from loop types
- Use `ENTITY_COLORS.project` (`#34d399`) as the consistent accent color throughout

**Non-Goals:**
- New/edit wizard for projects (separate issue)
- Changing loop page functionality or refactoring it
- Board theme system refactor (hardcoded colors → theme tokens)
- Data model or API/IPC contract changes
- Adding run history to projects (projects are containers, not executable entities)

## Decisions

### D1: Separate `ProjectFilters` type rather than extending `Filters`

The existing `Filters` interface contains loop-specific fields (`status`, `intervalBucket`, `recentActivity`) that don't apply to projects. Rather than making `Filters` a union type or adding optional fields, we define a parallel `ProjectFilters` type with project-relevant fields: `query`, `hasLoops`, `isSystem`, `sort`.

**Rationale:** Keeps types focused and avoids `undefined` checks on inapplicable fields. Mirrors the existing pattern where each entity type has its own filter shape.

### D2: Reuse existing components (FilterBar, ClickableBadge) with project-specific props

The Board already has `FilterBar`, `ClickableBadge`, and `SearchBox` components. The Projects FilterBar will reuse these same components, but populate them with project-specific badge data (loop count, system/default, sort) instead of loop-specific badges (status, interval, activity).

**Rationale:** Component reuse minimizes code duplication. The FilterBar already accepts dynamic badge configurations.

### D3: Navigator-style table for Board ProjectsPage

Replace the current simple bullet-list with a `Navigator`-like multi-column table layout (color bullet, project name, loop count, created date) using `ScrollBox` and the same row rendering pattern as the loops Navigator.

**Rationale:** Consistency with loops UX; multi-column layout shows more data at a glance; ScrollBox provides virtual scrolling.

### D4: TUI ProjectsPage integration into LeftPanel/RightPanel

Rather than keeping ProjectsPage as a standalone component, extract its list rendering into LeftPanel (replacing the placeholder) and its detail/inspector rendering into RightPanel. The existing standalone component's CRUD modals remain but are triggered from the new panel-integrated UI.

**Rationale:** Consistency with how loops and tasks are rendered. LeftPanel provides filter labels + Navigator; RightPanel provides Inspector. The placeholder text must go.

### D5: Project sort modes, name, loopCount, createdDate

Three sort modes specific to projects: alphabetical by name, by loop count (descending), by created date (newest first). Default: name.

**Rationale:** These are the meaningful sort axes for projects. Loop-specific sorts (status, recent) don't apply to projects.

## Risks / Trade-offs

- **[Complexity of dual-panel refactor in TUI]** → Mitigate by keeping the existing ProjectsPage component as the source of CRUD logic and only moving the visual rendering into LeftPanel/RightPanel. The component stays as the controller; the panels are views.
- **[FilterBar reuse might need abstraction]** → If FilterBar's props are too loop-specific, we may need to generalize. Mitigate by checking FilterBar's prop interface first, it likely accepts generic badge configs.
- **[TUI RightPanel doesn't currently handle projects]** → Adding a projects branch to RightPanel increases its complexity. Mitigate by following the same conditional pattern already used for loops/tasks tabs.
