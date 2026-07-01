## Context

Loop-cli has two parallel UI surfaces: an Ink-based TUI (`src/tui/`) and an OpenTUI Board (`src/board/`). Both implement the same conceptual features with different rendering engines.

**Current state for loops**: Create uses `WizardForm` (step-by-step guided input with validation and keyboard navigation); Edit uses `PatchEditForm` (inline field editing with pending changes). Both are full-page views routed via the View type.

**Current state for projects**: Create/Edit use small inline modals overlaid on the ProjectsPage. In TUI, these are `CreateProjectModal` and `EditProjectModal` defined directly inside `ProjectsPage.tsx`. In Board, these are separate components (`CreateProjectModal.tsx`, `EditProjectModal.tsx`). All are modal overlays, not full-page wizard flows.

**Key constraint**: Every project has a `color` field (selected from `PROJECT_COLORS` in `constants.ts`). The existing modal color pickers use a simple row of colored buttons (Board) or left/right arrow cycling (TUI). The wizard pattern needs to support this as a `select`-type step.

## Goals / Non-Goals

**Goals:**
- Replace project create/edit modals with full-page wizard views in both TUI and Board
- Mirror the loop wizard pattern: WizardForm for create, PatchEditForm for edit (TUI); two-column form for create, same for edit (Board)
- Support color selection as a select-type wizard step with color key labels and visual preview
- Add project-create and project-edit routing views
- Add i18n strings for project wizard prompts
- Maintain all existing project CRUD functionality (no IPC changes)

**Non-Goals:**
- Changing the Project data model or IPC contract
- Changing the ProjectManager daemon logic
- Adding new project fields beyond name and color
- Changing the delete confirmation flow
- Unifying the TUI and Board codepaths (they remain parallel implementations)

## Decisions

### 1. New `ProjectForm.tsx` component for each UI surface (not extending ProjectsPage)

**Decision**: Create `src/tui/components/ProjectForm.tsx` and `src/board/components/ProjectForm.tsx` as standalone components, following the exact pattern of `CreateForm.tsx` (which handles both create and edit for loops).

**Rationale**: The loop pattern already proves this works — `CreateForm.tsx` is a standalone component, not embedded in the loops page. The project wizard should follow the same separation. This keeps each component focused and testable.

**Alternative considered**: Extending `ProjectsPage.tsx` with wizard sub-views. Rejected because the loop pattern doesn't do this, and it would make ProjectsPage too large.

### 2. TUI: WizardForm steps for create, PatchEditForm fields for edit

**Decision**: 
- Create mode: `WizardStepConfig[]` with two steps: `name` (text input, required) and `color` (select from `PROJECT_COLOR_KEYS`)
- Edit mode: `PatchEditForm` fields for `name` and `color`, pre-populated from existing project

**Rationale**: Exactly mirrors the loop pattern. The `inputType: "select"` on WizardForm already supports SelectField rendering, which maps perfectly to color key selection.

### 3. Board: Two-column form layout with SearchSelect for color

**Decision**: Follow the Board `CreateForm.tsx` pattern — two-column `FormRow` grid with `useTabNav`, `useKeyboard`, and `useInputShortcuts`. Color field uses `SearchSelect` component (already used in the loop form for project selection).

**Rationale**: `SearchSelect` already exists and is the established pattern for selection fields in Board forms. It provides search, arrow navigation, and visual feedback — better UX than the simple color button row for users who might have many colors in the future.

### 4. Routing: Add `project-create` and `project-edit` to View types

**Decision**: Add `"project-create"` and `"project-edit"` to both `src/tui/types.ts` and `src/board/types.ts` View union types. Both App.tsx routers branch on these views to render the new ProjectForm.

**Rationale**: Same pattern as `"create"` and `"task-create"` / `"task-edit"` views. The edit view needs the project ID passed — the router state or a navigation payload can carry it (both routers already support `push(view)` and the existing pattern uses component state/props).

### 5. ProjectsPage triggers navigation instead of rendering modals

**Decision**: When user presses `n` (create) or `e` (edit) on ProjectsPage, call `router.push("project-create")` or `router.push("project-edit")` instead of setting a sub-modal state.

**Rationale**: Matches how the loops board navigates to `"create"` view. Cleaner separation, back button works, no modal state management.

## Risks / Trade-offs

- **[Loss of modal overlay]** → Projects are no longer editable in-context alongside the project list. Mitigation: the wizard provides a better, more focused UX; users can navigate back to the projects page after saving.
- **[Color selection UX regression in TUI]** → WizardForm's SelectField is a simple text list, not the visual color cycling of the old modal. Mitigation: color key names (cyan, green, etc.) are descriptive; can add ANSI color squares in the select options if needed.
- **[Two surfaces to maintain]** → Any change to project fields requires updating both TUI and Board components. Mitigation: this is already the case for loops; the parallel structure is a known design choice.
