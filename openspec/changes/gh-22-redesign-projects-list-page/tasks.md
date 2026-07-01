## 1. Project Filter State

- [x] 1.1 Add `ProjectHasLoopsFilter`, `ProjectIsSystemFilter`, `ProjectSortMode`, and `ProjectFilters` types to `src/board/state.ts`
- [x] 1.2 Add `applyProjectFilters`, `cycleProjectSortMode`, `cycleProjectHasLoopsFilter`, and `cycleProjectIsSystemFilter` functions to `src/board/state.ts`
- [x] 1.3 Add the same `ProjectFilters` types and functions to `src/tui/state.ts`
- [x] 1.4 Add i18n strings for project filter badge labels to `src/i18n/en.json`

## 2. Board FilterBar Integration

- [x] 2.1 Add `projectFilters` state and setter to ProjectsPage component (`src/board/components/ProjectsPage.tsx`)
- [x] 2.2 Render `FilterBar` with SearchBox, hasLoops badge, isSystem badge, and sort badge above the project list
- [x] 2.3 Wire badge click/keypress handlers to cycle filter values via the state.ts helper functions
- [x] 2.4 Apply `projectFilters` to the project list using `applyProjectFilters` before rendering

## 3. Board Navigator-style Project List

- [x] 3.1 Replace the simple inline list with a multi-column ScrollBox table layout (color bullet, project name, loop count, created date)
- [x] 3.2 Add column header row matching Navigator.tsx pattern
- [x] 3.3 Update border colors: unfocused `#1e3a2a`, focused `#34d399`
- [x] 3.4 Add `/` keyboard shortcut to focus the SearchBox; Escape to clear search and return focus to list
- [x] 3.5 Verify Footer mode badge uses `ENTITY_COLORS.project` (`#34d399`) when view is "projects"

## 4. TUI LeftPanel Project Navigator

- [x] 4.1 Replace placeholder `"Projects tab"` text in `src/tui/components/LeftPanel.tsx` with a scrollable project list using the Navigator pattern (j/k navigation, selectable rows)
- [x] 4.2 Add filter state labels in LeftPanel for project active filters (query, hasLoops, isSystem, sort)
- [x] 4.3 Use `theme.accent.project` (`#34d399`) for LeftPanel border when projects tab is active
- [x] 4.4 Verify project commands (new-project, edit, delete, set-default) appear in CommandsBrowserModal when projects tab is active

## 5. TUI RightPanel Project Inspector

- [x] 5.1 Add projects branch to `src/tui/components/RightPanel.tsx` rendering a project Inspector (name with color bullet, project ID, created date, loop count, system label)
- [x] 5.2 Use theme tokens (`theme.text.primary`, `theme.text.secondary`, `theme.accent.project`) for all rendering
- [x] 5.3 Add Edit and Delete action buttons with keyboard shortcuts; disable Delete for system projects
- [x] 5.4 Use `theme.accent.project` for RightPanel border when projects tab is active
- [x] 5.5 Show "Select a project" placeholder when no project is selected

## 6. Verification

- [x] 6.1 Run `rtk npx tsc --noEmit` and fix any type errors
- [x] 6.2 Run `rtk pnpm lint` and fix any lint errors
- [x] 6.3 Run `rtk pnpm test` and fix any test failures
