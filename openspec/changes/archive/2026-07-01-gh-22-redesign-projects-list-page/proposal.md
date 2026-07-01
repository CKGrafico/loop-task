## Why

The Projects list page lacks the search, filter, sort, and interactive features that the Loops page already has — creating an inconsistent user experience. The TUI variant is a minimal placeholder ("Projects tab" text) while the Board variant has no FilterBar, no multi-column Navigator, and no sort controls. Users managing projects deserve the same polished, feature-rich experience they get with loops.

## What Changes

- Add `ProjectFilters` type to board and TUI state modules (query, hasLoops, isSystem, sort) — distinct from loop-specific `StatusFilter`/`IntervalFilter`/`ActivityFilter`
- Add `FilterBar` to Board ProjectsPage with search box, loop count badge ("with loops"/"empty"), system/default badge, and sort badge (by name, loop count, created date)
- Replace Board ProjectsPage's simple inline list with a Navigator-style multi-column scrollable table (color bullet, project name, loop count, created date)
- Wire TUI `ProjectsPage` into `LeftPanel.tsx` replacing the placeholder text with a proper scrollable project Navigator (j/k navigation, selectable rows)
- Add Projects section to TUI `RightPanel.tsx` showing a project Inspector matching loops' Inspector pattern
- Add project filter state labels in TUI LeftPanel (matching loops' "status: running" pattern)
- Use `ENTITY_COLORS.project` (`#34d399`) as the project accent throughout — unfocused border `#1e3a2a`, focused border `#34d399`, footer badge, tab accent
- Add keyboard commands: `/` (search focus), sort cycling, matching existing loops keybindings where applicable
- Verify project commands appear in TUI `CommandsBrowserModal` when projects tab is active

## Capabilities

### New Capabilities

- `project-filters`: Project-specific filter state and filter application logic (search, hasLoops, isSystem, sort) for both Board and TUI
- `projects-board-filterbar`: FilterBar integration on the Board ProjectsPage with search, filter badges, and sort badge
- `projects-board-navigator`: Navigator-style multi-column scrollable project list on the Board ProjectsPage
- `projects-tui-navigator`: Scrollable project list in TUI LeftPanel replacing the placeholder, with j/k navigation and filter labels
- `projects-tui-inspector`: Project detail view in TUI RightPanel matching loops' Inspector pattern

### Modified Capabilities

## Impact

- `src/board/state.ts` — New `ProjectFilters` type and `applyProjectFilters` function
- `src/tui/state.ts` — New `ProjectFilters` type and `applyProjectFilters` function
- `src/board/components/ProjectsPage.tsx` — Major restructure: add FilterBar, Navigator-style list, keyboard commands
- `src/tui/components/ProjectsPage.tsx` — Refactor from standalone page to LeftPanel/RightPanel integration
- `src/tui/components/LeftPanel.tsx` — Replace placeholder with project Navigator
- `src/tui/components/RightPanel.tsx` — Add projects Inspector section
- `src/board/components/Footer.tsx` — Ensure project mode badge uses `ENTITY_COLORS.project`
- `src/tui/commands.ts` — Verify/add project filter commands
- No IPC contract changes (`src/types.ts` unaffected)
- No persisted state shape changes (`LoopMeta` unaffected)
- No cross-platform behavior changes

## Non-goals

- New/edit wizard for projects (separate issue)
- Changing loop page functionality
- Board theme system refactor (hardcoded colors → theme tokens)
- Data model or API changes
- Adding run history to projects (projects are containers, not runnable entities)
