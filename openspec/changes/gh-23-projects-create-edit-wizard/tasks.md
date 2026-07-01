## 1. Foundation

- [x] 1.1 Add project wizard i18n strings to `src/i18n/en.json` (prompts, hints, labels, validation messages for project name and color fields)
- [x] 1.2 Add `"project-create"` and `"project-edit"` to View type union in `src/tui/types.ts` and `src/board/types.ts`

## 2. Ink TUI Project Wizard

- [x] 2.1 Create `src/tui/components/ProjectForm.tsx` with `ProjectFormView` component supporting `mode: "create" | "edit"`, using `WizardForm` for create mode and `PatchEditForm` for edit mode, following the exact pattern of `CreateForm.tsx`
- [x] 2.2 Add `project-create` and `project-edit` view branches to `src/tui/App.tsx` router, rendering `ProjectFormView` with appropriate props
- [x] 2.3 Update `src/tui/components/ProjectsPage.tsx` to navigate via `router.push("project-create")` / `router.push("project-edit")` instead of setting sub-modal state, removing CreateProjectModal and EditProjectModal inline components

## 3. Board Project Wizard

- [x] 3.1 Create `src/board/components/ProjectForm.tsx` with `ProjectFormView` component supporting `mode: "create" | "edit"`, using two-column FormRow layout with SearchSelect for color, following the pattern of Board `CreateForm.tsx`
- [x] 3.2 Add `project-create` and `project-edit` view branches to `src/board/App.tsx` router, rendering `ProjectFormView` with appropriate props
- [x] 3.3 Update `src/board/components/ProjectsPage.tsx` to navigate via `router.push("project-create")` / `router.push("project-edit")` instead of rendering modal overlays
- [x] 3.4 Remove `src/board/components/CreateProjectModal.tsx` and `src/board/components/EditProjectModal.tsx` (no longer used)

## 4. Verification

- [x] 4.1 Run `rtk npx tsc --noEmit` to verify type safety
- [x] 4.2 Run `rtk pnpm lint` to verify code quality
- [x] 4.3 Run `rtk pnpm test` to verify all tests pass
