## 1. Foundation & Types

- [x] 1.1 Add Project interface to src/types.ts (id, name, color, createdAt, isSystem, isDefault) <!-- agent: development-engineer, modeltype: build -->
- [x] 1.2 Add projectId field to LoopOptions in src/types.ts (string, defaults to "default") <!-- agent: development-engineer, modeltype: build -->
- [x] 1.3 Add four new RPC message types to src/types.ts (project-list, project-create, project-update, project-delete) <!-- agent: development-engineer, modeltype: build -->
- [x] 1.4 Add project color constants to src/config/constants.ts (white, cyan, orange, green, red, yellow with hex values) <!-- agent: basic-engineer, modeltype: fast -->
- [x] 1.5 Add i18n keys for project UI to src/i18n/en.json (~50 keys: modal labels, errors, button text, dialogs) <!-- agent: basic-engineer, modeltype: fast -->

## 2. Daemon Persistence & State Management

- [x] 2.1 Create src/daemon/projects.ts with ProjectManager class <!-- agent: development-engineer, modeltype: build -->
- [x] 2.2 Implement loadProjects() — read all projects from ~/.loop-cli/projects/ into memory <!-- agent: development-engineer, modeltype: build -->
- [x] 2.3 Implement saveProject(project) — atomic write to ~/.loop-cli/projects/<id>.json <!-- agent: development-engineer, modeltype: build -->
- [x] 2.4 Implement deleteProject(id) — remove project file from disk <!-- agent: development-engineer, modeltype: build -->
- [x] 2.5 Implement cascadeLoopsToDefault(projectId) — move all loops with deleted projectId to "default" <!-- agent: development-engineer, modeltype: build -->
- [x] 2.6 Implement auto-migration: on first load, add projectId="default" to loops without one <!-- agent: development-engineer, modeltype: build -->
- [x] 2.7 Implement auto-recovery: if projects/ is corrupted, recreate Default and reassign orphaned loops <!-- agent: development-engineer, modeltype: build -->
- [x] 2.8 Add createDefaultProject() — create Default project (isSystem=true, isDefault=true, white, immutable) <!-- agent: development-engineer, modeltype: build -->
- [x] 2.9 Integrate ProjectManager into src/daemon/manager.ts (initialize on daemon startup) <!-- agent: development-engineer, modeltype: build -->

## 3. Daemon IPC Handlers

- [x] 3.1 Add project-list handler to src/daemon/server.ts — return all projects <!-- agent: development-engineer, modeltype: build -->
- [x] 3.2 Add project-create handler — validate name, create, persist, return {id, name, color, createdAt} <!-- agent: development-engineer, modeltype: build -->
- [x] 3.3 Add project-update handler — validate not Default, rename, persist, return ok <!-- agent: development-engineer, modeltype: build -->
- [x] 3.4 Add project-delete handler — call cascadeLoopsToDefault, delete project file, return ok <!-- agent: development-engineer, modeltype: build -->
- [ ] 3.5 Test all four handlers with unit tests (src/daemon/projects.test.ts) <!-- agent: development-engineer, modeltype: build -->

## 4. Board State & Filtering

- [x] 4.1 Add currentProjectId state to src/board/App.tsx (initially "default") <!-- agent: development-engineer, modeltype: build -->
- [x] 4.2 Implement setCurrentProjectId(id) state setter <!-- agent: development-engineer, modeltype: build -->
- [x] 4.3 Fetch projects list on board load (call project-list RPC) <!-- agent: development-engineer, modeltype: build -->
- [x] 4.4 Cache projects in board state (for dropdown and modal display) <!-- agent: development-engineer, modeltype: build -->
- [x] 4.5 Filter loops before rendering: only show loops where loop.projectId === currentProjectId <!-- agent: development-engineer, modeltype: build -->
- [x] 4.6 Persist currentProjectId to localStorage (remember user's last selected project) <!-- agent: development-engineer, modeltype: build -->

## 5. Projects Modal (Filter)

- [x] 5.1 Create src/board/components/ProjectsModal.tsx <!-- agent: development-engineer, modeltype: build -->
- [x] 5.2 Implement modal opening on "c" key press <!-- agent: development-engineer, modeltype: build -->
- [x] 5.3 Add project list with radio buttons (single-select) <!-- agent: development-engineer, modeltype: build -->
- [x] 5.4 Implement case-insensitive prefix search in modal <!-- agent: development-engineer, modeltype: build -->
- [x] 5.5 Show loop count for each project (projectId + filter cached loops) <!-- agent: development-engineer, modeltype: build -->
- [x] 5.6 Keyboard navigation: Up/Down arrows, Enter to confirm, Escape to close <!-- agent: development-engineer, modeltype: build -->
- [x] 5.7 Render color bullet before each project name <!-- agent: development-engineer, modeltype: build -->
- [x] 5.8 On selection, close modal, update currentProjectId, re-filter board <!-- agent: development-engineer, modeltype: build -->

## 6. Board Navigator & Loop Display

- [x] 6.1 Modify src/board/components/Navigator.tsx to render color bullet before loop description <!-- agent: development-engineer, modeltype: build -->
- [x] 6.2 Get project color from cached projects list via loop.projectId <!-- agent: development-engineer, modeltype: build -->
- [x] 6.3 Render colored bullet character (●) in loop row (use color from project) <!-- agent: development-engineer, modeltype: build -->
- [x] 6.4 Ensure bullet appears before description text without disrupting alignment <!-- agent: development-engineer, modeltype: build -->

## 7. Manage Projects Page

- [x] 7.1 Create src/board/components/ProjectsPage.tsx as standalone page component <!-- agent: development-engineer, modeltype: build -->
- [x] 7.2 Implement two-column layout: Navigator (left, project list) + Inspector (right, details/actions) <!-- agent: development-engineer, modeltype: build -->
- [x] 7.3 Add navigation button to App.tsx to open Manage Projects page <!-- agent: development-engineer, modeltype: build -->
- [x] 7.4 Implement project list in Navigator with selection highlight (↑/↓ keys) <!-- agent: development-engineer, modeltype: build -->
- [x] 7.5 Implement Inspector showing selected project details (name, color, loop count) <!-- agent: development-engineer, modeltype: build -->
- [x] 7.6 Hide Edit/Delete buttons for Default project <!-- agent: development-engineer, modeltype: build -->
- [x] 7.7 Implement keyboard shortcuts: "e" = Edit, "d" = Delete, "n" = Create, Escape = Close <!-- agent: development-engineer, modeltype: build -->
- [x] 7.8 On project action (create/rename/delete), update project list and inspector immediately <!-- agent: development-engineer, modeltype: build -->

## 8. Create Project Modal

- [x] 8.1 Create src/board/components/CreateProjectModal.tsx <!-- agent: development-engineer, modeltype: build -->
- [x] 8.2 Add Name text input (required) <!-- agent: development-engineer, modeltype: build -->
- [x] 8.3 Add Color picker with six radio buttons (white/cyan/orange/green/red/yellow) <!-- agent: development-engineer, modeltype: build -->
- [x] 8.4 Pre-select cyan as default color <!-- agent: development-engineer, modeltype: fast -->
- [x] 8.5 Implement Save button (validate name not empty, call project-create RPC) <!-- agent: development-engineer, modeltype: build -->
- [x] 8.6 Implement Cancel button (close modal without action) <!-- agent: development-engineer, modeltype: fast -->
- [x] 8.7 Show error message if name is empty on Save attempt <!-- agent: development-engineer, modeltype: fast -->
- [x] 8.8 On successful create, close modal and update project list <!-- agent: development-engineer, modeltype: build -->

## 9. Edit Project Modal

- [x] 9.1 Create src/board/components/EditProjectModal.tsx <!-- agent: development-engineer, modeltype: build -->
- [x] 9.2 Add Name text input pre-filled with current project name <!-- agent: development-engineer, modeltype: build -->
- [x] 9.3 Implement Save button (validate name not empty, call project-update RPC) <!-- agent: development-engineer, modeltype: build -->
- [x] 9.4 Implement Cancel button (close modal without action) <!-- agent: development-engineer, modeltype: fast -->
- [x] 9.5 Show error if name is empty on Save <!-- agent: development-engineer, modeltype: fast -->
- [x] 9.6 On successful update, close modal and update project list <!-- agent: development-engineer, modeltype: build -->
- [x] 9.7 Block/hide edit modal if Default project is selected <!-- agent: development-engineer, modeltype: fast -->

## 10. Delete Project Confirmation

- [x] 10.1 Create src/board/components/DeleteProjectConfirm.tsx <!-- agent: development-engineer, modeltype: build -->
- [x] 10.2 Show confirmation message: "Delete Project '<name>'?" <!-- agent: development-engineer, modeltype: fast -->
- [x] 10.3 Display loop count: "This project has X loops." <!-- agent: development-engineer, modeltype: fast -->
- [x] 10.4 Implement "Yes, move to Default" button (call project-delete RPC) <!-- agent: development-engineer, modeltype: build -->
- [x] 10.5 Implement "Cancel" button (close without action) <!-- agent: development-engineer, modeltype: fast -->
- [x] 10.6 On successful delete, close modal, update project list, show next project in inspector <!-- agent: development-engineer, modeltype: build -->
- [x] 10.7 Block delete confirmation if Default project is selected <!-- agent: development-engineer, modeltype: fast -->

## 11. Loop Creation with Project Context

- [ ] 11.1 Modify src/board/components/CreateForm.tsx to add project dropdown <!-- agent: development-engineer, modeltype: build -->
- [ ] 11.2 Populate dropdown with all projects (with color bullets) <!-- agent: development-engineer, modeltype: build -->
- [ ] 11.3 Pre-fill dropdown with currentProjectId (current viewed project) <!-- agent: development-engineer, modeltype: build -->
- [ ] 11.4 Fallback to "default" if no context <!-- agent: development-engineer, modeltype: fast -->
- [x] 11.5 On loop creation, set LoopOptions.projectId to selected project <!-- agent: development-engineer, modeltype: build -->
- [ ] 11.6 Pass project list to CreateForm as prop from App.tsx <!-- agent: development-engineer, modeltype: build -->

## 12. Loop Editing with Project Change

- [ ] 12.1 Modify src/board/components/EditForm.tsx to include project dropdown <!-- agent: development-engineer, modeltype: build -->
- [ ] 12.2 Pre-fill dropdown with loop's current projectId <!-- agent: development-engineer, modeltype: build -->
- [ ] 12.3 Allow user to change project via dropdown <!-- agent: development-engineer, modeltype: build -->
- [ ] 12.4 On save, update LoopMeta.projectId if changed and persist <!-- agent: development-engineer, modeltype: build -->

## 13. Board Navigation & Layout

- [x] 13.1 Add "Manage Projects" button to main navigation bar (src/board/App.tsx) <!-- agent: development-engineer, modeltype: build -->
- [x] 13.2 Implement mode switching in App.tsx (board view vs. Manage Projects view) <!-- agent: development-engineer, modeltype: build -->
- [x] 13.3 On Escape from Manage Projects, return to board view <!-- agent: development-engineer, modeltype: build -->
- [x] 13.4 Preserve currentProjectId when switching between modes <!-- agent: development-engineer, modeltype: build -->

## 14. Integration & Testing

- [ ] 14.1 Write integration test for project-list RPC in tests/daemon.test.ts <!-- agent: development-engineer, modeltype: build -->
- [ ] 14.2 Write integration test for project-create RPC <!-- agent: development-engineer, modeltype: build -->
- [ ] 14.3 Write integration test for project-update RPC <!-- agent: development-engineer, modeltype: build -->
- [ ] 14.4 Write integration test for project-delete RPC (verify cascade) <!-- agent: development-engineer, modeltype: build -->
- [ ] 14.5 Write integration test for auto-migration on first load <!-- agent: development-engineer, modeltype: build -->
- [ ] 14.6 Write board unit tests for Projects modal (ProjectsModal.test.tsx) <!-- agent: development-engineer, modeltype: build -->
- [ ] 14.7 Write board unit tests for Manage Projects page (ProjectsPage.test.tsx) <!-- agent: development-engineer, modeltype: build -->
- [ ] 14.8 Write board unit tests for color bullet rendering in Navigator <!-- agent: development-engineer, modeltype: build -->
- [ ] 14.9 Run full test suite: `bun run test` (expect ≥90% coverage) <!-- agent: development-engineer, modeltype: build -->

## 15. Quality Gates

- [x] 15.1 Run typecheck: `rtk bun run typecheck` — zero errors <!-- agent: development-engineer, modeltype: fast -->
- [ ] 15.2 Run lint: `rtk bun run lint` — zero warnings <!-- agent: development-engineer, modeltype: fast -->
- [ ] 15.3 Run tests: `rtk bun run test` — all passing, ≥90% coverage <!-- agent: development-engineer, modeltype: build -->

## 16. Documentation & Changelog

- [ ] 16.1 Update README.md with Projects feature overview (single-project scope, color system) <!-- agent: basic-engineer, modeltype: fast -->
- [ ] 16.2 Add keyboard shortcuts to docs (c = Projects modal, Manage Projects page shortcuts) <!-- agent: basic-engineer, modeltype: fast -->
- [ ] 16.3 Add Projects section to ARCHITECTURE.md or create design note <!-- agent: basic-engineer, modeltype: fast -->
