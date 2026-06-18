## 1. Foundation & Types

- [ ] 1.1 Add Project interface to src/types.ts (id, name, color, createdAt, isSystem, isDefault)
- [ ] 1.2 Add projectId field to LoopOptions in src/types.ts (string, defaults to "default")
- [ ] 1.3 Add four new RPC message types to src/types.ts (project-list, project-create, project-update, project-delete)
- [ ] 1.4 Add project color constants to src/config/constants.ts (white, cyan, orange, green, red, yellow with hex values)
- [ ] 1.5 Add i18n keys for project UI to src/i18n/en.json (~50 keys: modal labels, errors, button text, dialogs)

## 2. Daemon Persistence & State Management

- [ ] 2.1 Create src/daemon/projects.ts with ProjectManager class
- [ ] 2.2 Implement loadProjects() — read all projects from ~/.loop-cli/projects/ into memory
- [ ] 2.3 Implement saveProject(project) — atomic write to ~/.loop-cli/projects/<id>.json
- [ ] 2.4 Implement deleteProject(id) — remove project file from disk
- [ ] 2.5 Implement cascadeLoopsToDefault(projectId) — move all loops with deleted projectId to "default"
- [ ] 2.6 Implement auto-migration: on first load, add projectId="default" to loops without one
- [ ] 2.7 Implement auto-recovery: if projects/ is corrupted, recreate Default and reassign orphaned loops
- [ ] 2.8 Add createDefaultProject() — create Default project (isSystem=true, isDefault=true, white, immutable)
- [ ] 2.9 Integrate ProjectManager into src/daemon/manager.ts (initialize on daemon startup)

## 3. Daemon IPC Handlers

- [ ] 3.1 Add project-list handler to src/daemon/server.ts — return all projects
- [ ] 3.2 Add project-create handler — validate name, create, persist, return {id, name, color, createdAt}
- [ ] 3.3 Add project-update handler — validate not Default, rename, persist, return ok
- [ ] 3.4 Add project-delete handler — call cascadeLoopsToDefault, delete project file, return ok
- [ ] 3.5 Test all four handlers with unit tests (src/daemon/projects.test.ts)

## 4. Board State & Filtering

- [ ] 4.1 Add currentProjectId state to src/board/App.tsx (initially "default")
- [ ] 4.2 Implement setCurrentProjectId(id) state setter
- [ ] 4.3 Fetch projects list on board load (call project-list RPC)
- [ ] 4.4 Cache projects in board state (for dropdown and modal display)
- [ ] 4.5 Filter loops before rendering: only show loops where loop.projectId === currentProjectId
- [ ] 4.6 Persist currentProjectId to localStorage (remember user's last selected project)

## 5. Projects Modal (Filter)

- [ ] 5.1 Create src/board/components/ProjectsModal.tsx
- [ ] 5.2 Implement modal opening on "c" key press
- [ ] 5.3 Add project list with radio buttons (single-select)
- [ ] 5.4 Implement case-insensitive prefix search in modal
- [ ] 5.5 Show loop count for each project (projectId + filter cached loops)
- [ ] 5.6 Keyboard navigation: Up/Down arrows, Enter to confirm, Escape to close
- [ ] 5.7 Render color bullet before each project name
- [ ] 5.8 On selection, close modal, update currentProjectId, re-filter board

## 6. Board Navigator & Loop Display

- [ ] 6.1 Modify src/board/components/Navigator.tsx to render color bullet before loop description
- [ ] 6.2 Get project color from cached projects list via loop.projectId
- [ ] 6.3 Render colored bullet character (●) in loop row (use color from project)
- [ ] 6.4 Ensure bullet appears before description text without disrupting alignment

## 7. Manage Projects Page

- [ ] 7.1 Create src/board/components/ProjectsPage.tsx as standalone page component
- [ ] 7.2 Implement two-column layout: Navigator (left, project list) + Inspector (right, details/actions)
- [ ] 7.3 Add navigation button to App.tsx to open Manage Projects page
- [ ] 7.4 Implement project list in Navigator with selection highlight (↑/↓ keys)
- [ ] 7.5 Implement Inspector showing selected project details (name, color, loop count)
- [ ] 7.6 Hide Edit/Delete buttons for Default project
- [ ] 7.7 Implement keyboard shortcuts: "e" = Edit, "d" = Delete, "n" = Create, Escape = Close
- [ ] 7.8 On project action (create/rename/delete), update project list and inspector immediately

## 8. Create Project Modal

- [ ] 8.1 Create src/board/components/CreateProjectModal.tsx
- [ ] 8.2 Add Name text input (required)
- [ ] 8.3 Add Color picker with six radio buttons (white/cyan/orange/green/red/yellow)
- [ ] 8.4 Pre-select cyan as default color
- [ ] 8.5 Implement Save button (validate name not empty, call project-create RPC)
- [ ] 8.6 Implement Cancel button (close modal without action)
- [ ] 8.7 Show error message if name is empty on Save attempt
- [ ] 8.8 On successful create, close modal and update project list

## 9. Edit Project Modal

- [ ] 9.1 Create src/board/components/EditProjectModal.tsx
- [ ] 9.2 Add Name text input pre-filled with current project name
- [ ] 9.3 Implement Save button (validate name not empty, call project-update RPC)
- [ ] 9.4 Implement Cancel button (close modal without action)
- [ ] 9.5 Show error if name is empty on Save
- [ ] 9.6 On successful update, close modal and update project list
- [ ] 9.7 Block/hide edit modal if Default project is selected

## 10. Delete Project Confirmation

- [ ] 10.1 Create src/board/components/DeleteProjectConfirm.tsx
- [ ] 10.2 Show confirmation message: "Delete Project '<name>'?"
- [ ] 10.3 Display loop count: "This project has X loops."
- [ ] 10.4 Implement "Yes, move to Default" button (call project-delete RPC)
- [ ] 10.5 Implement "Cancel" button (close without action)
- [ ] 10.6 On successful delete, close modal, update project list, show next project in inspector
- [ ] 10.7 Block delete confirmation if Default project is selected

## 11. Loop Creation with Project Context

- [ ] 11.1 Modify src/board/components/CreateForm.tsx to add project dropdown
- [ ] 11.2 Populate dropdown with all projects (with color bullets)
- [ ] 11.3 Pre-fill dropdown with currentProjectId (current viewed project)
- [ ] 11.4 Fallback to "default" if no context
- [ ] 11.5 On loop creation, set LoopOptions.projectId to selected project
- [ ] 11.6 Pass project list to CreateForm as prop from App.tsx

## 12. Loop Editing with Project Change

- [ ] 12.1 Modify src/board/components/EditForm.tsx to include project dropdown
- [ ] 12.2 Pre-fill dropdown with loop's current projectId
- [ ] 12.3 Allow user to change project via dropdown
- [ ] 12.4 On save, update LoopMeta.projectId if changed and persist

## 13. Board Navigation & Layout

- [ ] 13.1 Add "Manage Projects" button to main navigation bar (src/board/App.tsx)
- [ ] 13.2 Implement mode switching in App.tsx (board view vs. Manage Projects view)
- [ ] 13.3 On Escape from Manage Projects, return to board view
- [ ] 13.4 Preserve currentProjectId when switching between modes

## 14. Integration & Testing

- [ ] 14.1 Write integration test for project-list RPC in tests/daemon.test.ts
- [ ] 14.2 Write integration test for project-create RPC
- [ ] 14.3 Write integration test for project-update RPC
- [ ] 14.4 Write integration test for project-delete RPC (verify cascade)
- [ ] 14.5 Write integration test for auto-migration on first load
- [ ] 14.6 Write board unit tests for Projects modal (ProjectsModal.test.tsx)
- [ ] 14.7 Write board unit tests for Manage Projects page (ProjectsPage.test.tsx)
- [ ] 14.8 Write board unit tests for color bullet rendering in Navigator
- [ ] 14.9 Run full test suite: `bun run test` (expect ≥90% coverage)

## 15. Quality Gates

- [ ] 15.1 Run typecheck: `rtk bun run typecheck` — zero errors
- [ ] 15.2 Run lint: `rtk bun run lint` — zero warnings
- [ ] 15.3 Run tests: `rtk bun run test` — all passing, ≥90% coverage
- [ ] 15.4 Manual board test: create, view, rename, delete projects; verify loops move to Default
- [ ] 15.5 Manual board test: verify color bullets render correctly
- [ ] 15.6 Manual board test: verify project filter persists in localStorage
- [ ] 15.7 Verify Windows daemon IPC works (projects RPC over named pipe)

## 16. Documentation & Changelog

- [ ] 16.1 Update README.md with Projects feature overview (single-project scope, color system)
- [ ] 16.2 Add keyboard shortcuts to docs (c = Projects modal, Manage Projects page shortcuts)
- [ ] 16.3 Add Projects section to ARCHITECTURE.md or create design note
