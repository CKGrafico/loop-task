## Why

Loops have a dedicated wizard experience (WizardForm for create, PatchEditForm for edit) with step-by-step guided input, validation, and keyboard navigation. Projects still use simple inline modals with basic text inputs and color pickers. Users need the same guided wizard experience for creating and editing projects, especially since every project requires a color, which benefits from the richer selection UX the wizard pattern provides.

## What Changes

- Replace the Ink TUI `CreateProjectModal` and `EditProjectModal` (inline in `ProjectsPage.tsx`) with a `ProjectCreateView` using `WizardForm` and `ProjectEditView` using `PatchEditForm`, mirroring the loop create/edit pattern from `CreateForm.tsx`
- Replace the Board `CreateProjectModal` and `EditProjectModal` standalone components with wizard-mode equivalents using the same two-column form layout as the Board `CreateView` for loops
- Ensure project color selection works within the wizard flow (select-type step with color keys as options)
- Add i18n strings for project wizard prompts and hints
- Both TUI and Board views get consistent, full-page wizard experiences instead of small modal overlays

## Capabilities

### New Capabilities
- `project-wizard`: Guided wizard UI for creating and editing projects in both Ink TUI and Board interfaces, with step-by-step input for name and color, validation, and keyboard navigation

### Modified Capabilities

## Impact

- **Ink TUI**: `src/tui/components/ProjectsPage.tsx` (sub-modals removed, replaced with full-page views), new `src/tui/components/ProjectForm.tsx`
- **Board**: `src/board/components/CreateProjectModal.tsx` and `src/board/components/EditProjectModal.tsx` replaced with new `src/board/components/ProjectForm.tsx`, `src/board/components/ProjectsPage.tsx` updated to use full-page views
- **Routing**: Both `src/tui/types.ts` and `src/board/types.ts` View types need `project-create` / `project-edit` views; both `App.tsx` routers need new view branches
- **i18n**: `src/i18n/en.json` gains project wizard strings
- **No IPC contract changes**: Project data model and daemon API remain unchanged
